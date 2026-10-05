/**
 * ============================================================
 * SGQ FIXPAR - API ESTÁVEL V3
 * ============================================================
 * Objetivos desta versão:
 * - escrita idempotente: a mesma linha não é criada duas vezes;
 * - relatório idempotente por reportId: retry não duplica PDF/linhas;
 * - gravação em lote para reduzir latência;
 * - Histórico atualizado por __SOURCE_ROW sem TextFinder por linha;
 * - Conciliação reconstruída pela operação, sem depender de
 *   sincronizarConciliacaoOps_ existente em outro arquivo;
 * - compatibilidade com o restante do projeto Apps Script atual.
 * ============================================================
 */

const API_V3_UID_HEADER = '__ROW_UID';
const API_V3_REPORT_PROP_PREFIX = 'SGQ_REPORT_V3_';

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    const method = String(body.method || '').trim();
    const args = Array.isArray(body.args) ? body.args : [];
    const result = executarMetodoApi_(method, args);

    return respostaJsonApi_({
      ok: true,
      result: result === undefined ? null : result
    });
  } catch (error) {
    return respostaJsonApi_({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function executarMetodoApi_(method, args) {
  switch (method) {
    case 'healthCheck':
      return apiV3HealthCheck_();
    case 'carregarDados':
      return carregarDados.apply(null, args);
    case 'salvarLinha':
      return apiV3SalvarLinha_.apply(null, args);
    case 'salvarLinhasEmLote':
      return apiV3SalvarLinhasEmLote_.apply(null, args);
    case 'limparLinha':
      return apiV3LimparLinha_.apply(null, args);
    case 'carregarCores':
      return carregarCores.apply(null, args);
    case 'consultarHistorico':
      return consultarHistorico.apply(null, args);
    case 'consultarHistoricoPaginado':
      return apiConsultarHistoricoPaginado_.apply(null, args);
    case 'buscarSugestoesHistorico':
      return buscarSugestoesHistorico.apply(null, args);
    case 'editarHistorico':
      return apiV3EditarHistorico_.apply(null, args);
    case 'gerarRelatorio':
      return gerarRelatorio.apply(null, args);
    case 'gerarRelatorioHistorico':
      return gerarRelatorioHistorico.apply(null, args);
    case 'finalizarRelatorioRapido':
      return apiV3FinalizarRelatorio_.apply(null, args);
    case 'salvarPdfRapidoDrive':
      return apiV3SalvarPdfRapidoDrive_.apply(null, args);
    case 'carregarProgramacaoSgq':
      return carregarProgramacaoSgq.apply(null, args);
    case 'salvarProgramacaoSgq':
      return salvarProgramacaoSgq.apply(null, args);
    default:
      throw new Error('Método da API não permitido: ' + method);
  }
}

function apiV3HealthCheck_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfgEntrada = getConfig_('RECEBIMENTO');
  const cfgSaida = getConfig_('SAIDA');
  return {
    ok: true,
    api: 'SGQ_FIXPAR_V3',
    time: new Date().toISOString(),
    recebimento: Boolean(ss.getSheetByName(cfgEntrada.sheetName)),
    saida: Boolean(ss.getSheetByName(cfgSaida.sheetName)),
    historicoEntrada: Boolean(ss.getSheetByName(cfgEntrada.historySheetName)),
    historicoSaida: Boolean(ss.getSheetByName(cfgSaida.historySheetName)),
    conciliacao: Boolean(ss.getSheetByName('Conciliação OP'))
  };
}

function apiConsultarHistoricoPaginado_(pageKey, dataInicialIso, dataFinalIso, busca, offset, limit) {
  if (typeof consultarHistoricoPaginado === 'function') {
    return consultarHistoricoPaginado(pageKey, dataInicialIso, dataFinalIso, busca, offset, limit);
  }
  const resultado = consultarHistorico(pageKey, dataInicialIso, dataFinalIso, busca);
  const inicio = Math.max(Number(offset || 0), 0);
  const tamanho = Math.min(Math.max(Number(limit || 50), 1), 100);
  const fim = inicio + tamanho;
  return {
    rows: resultado.rows.slice(inicio, fim),
    headers: resultado.headers,
    title: resultado.title,
    total: resultado.total,
    offset: inicio,
    nextOffset: fim < resultado.total ? fim : null,
    hasMore: fim < resultado.total
  };
}

function apiV3SalvarLinha_(pageKey, isoDate, values, sheetRow, clientId) {
  const result = apiV3SalvarLinhasEmLote_(pageKey, isoDate, [{
    clientId: clientId || '',
    sheetRow: sheetRow || null,
    values: Array.isArray(values) ? values : []
  }]);
  const item = result.rows && result.rows[0];
  if (!item) return { ok: true, sheetRow: Number(sheetRow || 0) || null, values: values || [] };
  return {
    ok: true,
    sheetRow: item.sheetRow,
    values: item.values,
    clientId: item.clientId || clientId || ''
  };
}

function apiV3SalvarLinhasEmLote_(pageKey, isoDate, registros) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    return apiV3PersistirLoteSobLock_(pageKey, isoDate, registros, {
      atualizarHistorico: true,
      registrarCores: true
    });
  } finally {
    lock.releaseLock();
  }
}

function apiV3PersistirLoteSobLock_(pageKey, isoDate, registros, options) {
  const cfg = getConfig_(pageKey);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(cfg.sheetName);
  if (!sheet) throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');

  const opts = options || {};
  const itens = (Array.isArray(registros) ? registros : []).filter(item => {
    const values = item && Array.isArray(item.values) ? item.values : [];
    return values.slice(1).some(v => String(v == null ? '' : v).trim() !== '');
  });
  if (!itens.length) return { ok: true, rows: [] };

  const statusCol = cfg.headers.length + 1;
  const uidCol = cfg.headers.length + 2;
  apiV3PrepararColunasInternas_(sheet, cfg, statusCol, uidCol);

  const lastRowOriginal = Math.max(sheet.getLastRow(), 2);
  const uidMap = {};
  if (lastRowOriginal >= 3) {
    const uids = sheet.getRange(3, uidCol, lastRowOriginal - 2, 1).getDisplayValues();
    uids.forEach((row, index) => {
      const uid = String(row[0] || '').trim();
      if (uid && !uidMap[uid]) uidMap[uid] = index + 3;
    });
  }

  let nextRow = Math.max(lastRowOriginal + 1, 3);
  const writes = [];
  const cores = [];

  itens.forEach(item => {
    const normalized = normalizarLinhaParaPlanilha_(pageKey, isoDate, item.values || []);
    const clientId = apiV3UidTexto_(item.clientId);
    let targetRow = Number(item.sheetRow || 0);

    if (!(targetRow >= 3)) {
      targetRow = clientId && uidMap[clientId] ? uidMap[clientId] : nextRow++;
    }

    apiV3GarantirLinhas_(sheet, targetRow);
    const uid = clientId || apiV3UidExistenteOuNovo_(sheet, targetRow, uidCol);
    if (uid) uidMap[uid] = targetRow;

    writes.push({ row: targetRow, uid: uid, clientId: clientId, normalized: normalized });

    if (pageKey === 'RECEBIMENTO') {
      const corIndex = cfg.headers.indexOf('Cor');
      if (corIndex >= 0) {
        const cor = String(normalized[corIndex] == null ? '' : normalized[corIndex]).trim();
        if (cor) cores.push(cor);
      }
    }
  });

  apiV3EscreverBlocos_(sheet, writes.map(item => ({ row: item.row, values: item.normalized })), 1, cfg.headers.length);
  apiV3EscreverBlocos_(sheet, writes.map(item => ({ row: item.row, values: [item.uid] })), uidCol, 1);
  apiV3FormatarDatasLinhas_(sheet, writes.map(item => item.row));

  if (opts.atualizarHistorico !== false) apiV3UpsertHistoricoLote_(pageKey, writes);
  if (opts.registrarCores !== false && cores.length) apiV3RegistrarCoresLote_(cores);

  return {
    ok: true,
    rows: writes.map(item => ({
      clientId: item.clientId,
      sheetRow: item.row,
      values: linhaParaCliente_(pageKey, item.normalized, isoDate)
    }))
  };
}

function apiV3PrepararColunasInternas_(sheet, cfg, statusCol, uidCol) {
  if (String(sheet.getRange(2, statusCol).getDisplayValue() || '').trim() !== STATUS_HEADER) {
    sheet.getRange(2, statusCol).setValue(STATUS_HEADER);
  }
  if (String(sheet.getRange(2, uidCol).getDisplayValue() || '').trim() !== API_V3_UID_HEADER) {
    sheet.getRange(2, uidCol).setValue(API_V3_UID_HEADER);
  }
  try { sheet.hideColumns(statusCol, 2); } catch (e) {}
}

function apiV3GarantirLinhas_(sheet, row) {
  const maxRows = sheet.getMaxRows();
  if (row > maxRows) sheet.insertRowsAfter(maxRows, row - maxRows);
}

function apiV3UidTexto_(value) {
  return String(value == null ? '' : value).trim().slice(0, 120);
}

function apiV3UidExistenteOuNovo_(sheet, row, uidCol) {
  const existente = apiV3UidTexto_(sheet.getRange(row, uidCol).getDisplayValue());
  return existente || Utilities.getUuid();
}

function apiV3EscreverBlocos_(sheet, writes, startCol, width) {
  if (!writes.length) return;
  const ordenadas = writes.slice().sort((a, b) => a.row - b.row);
  let grupo = [];
  function flushGrupo_() {
    if (!grupo.length) return;
    const startRow = grupo[0].row;
    apiV3GarantirLinhas_(sheet, grupo[grupo.length - 1].row);
    const values = grupo.map(item => item.values.slice(0, width));
    sheet.getRange(startRow, startCol, values.length, width).setValues(values);
    grupo = [];
  }
  ordenadas.forEach(item => {
    if (!grupo.length) {
      grupo.push(item);
      return;
    }
    const anterior = grupo[grupo.length - 1];
    if (item.row === anterior.row + 1) grupo.push(item);
    else {
      flushGrupo_();
      grupo.push(item);
    }
  });
  flushGrupo_();
}

function apiV3FormatarDatasLinhas_(sheet, rowsList) {
  const rowsUnicas = Array.from(new Set(rowsList.map(Number).filter(r => r >= 3)));
  if (!rowsUnicas.length) return;
  const a1 = rowsUnicas.map(r => 'A' + r);
  try { sheet.getRangeList(a1).setNumberFormat('dd/MM/yyyy'); }
  catch (e) { rowsUnicas.forEach(r => sheet.getRange(r, 1).setNumberFormat('dd/MM/yyyy')); }
}

function apiV3UpsertHistoricoLote_(pageKey, writes) {
  if (!writes.length) return;
  const cfg = getConfig_(pageKey);
  const hist = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.historySheetName);
  if (!hist) throw new Error('A aba "' + cfg.historySheetName + '" não foi encontrada.');

  const sourceCol = cfg.headers.length + 1;
  const updatedCol = cfg.headers.length + 2;
  const totalCols = cfg.headers.length + 2;
  const lastRow = Math.max(hist.getLastRow(), 2);
  const sourceMap = {};
  const duplicadas = [];

  if (lastRow >= 3) {
    hist.getRange(3, sourceCol, lastRow - 2, 1).getDisplayValues().forEach((row, index) => {
      const source = String(row[0] || '').trim();
      if (!source) return;
      const histRow = index + 3;
      if (!sourceMap[source]) sourceMap[source] = histRow;
      else duplicadas.push(histRow);
    });
  }

  let nextRow = Math.max(lastRow + 1, 3);
  const agora = new Date();
  const histWrites = [];
  writes.forEach(item => {
    const source = String(item.row);
    let targetRow = sourceMap[source];
    if (!targetRow) {
      targetRow = nextRow++;
      sourceMap[source] = targetRow;
    }
    apiV3GarantirLinhas_(hist, targetRow);
    histWrites.push({ row: targetRow, values: item.normalized.concat([item.row, agora]) });
  });

  apiV3EscreverBlocos_(hist, histWrites, 1, totalCols);
  apiV3FormatarDatasLinhas_(hist, histWrites.map(item => item.row));

  if (duplicadas.length) {
    const ranges = duplicadas.map(r => 'A' + r + ':' + apiV3ColunaA1_(totalCols) + r);
    try { hist.getRangeList(ranges).clearContent(); }
    catch (e) { duplicadas.forEach(r => hist.getRange(r, 1, 1, totalCols).clearContent()); }
  }

  try {
    hist.getRange(2, sourceCol).setValue(HIST_SOURCE_HEADER);
    hist.getRange(2, updatedCol).setValue(HIST_UPDATED_HEADER);
    hist.hideColumns(sourceCol, 2);
  } catch (e) {}
}

function apiV3ColunaA1_(numero) {
  let n = Number(numero || 1);
  let result = '';
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result || 'A';
}

function apiV3RegistrarCoresLote_(cores) {
  const novas = Array.from(new Set((cores || []).map(v => String(v || '').trim()).filter(Boolean)));
  if (!novas.length) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Cadastro Cores');
  if (!sheet) {
    sheet = ss.insertSheet('Cadastro Cores');
    sheet.getRange(1, 1).setValue('Cor').setFontWeight('bold');
    try { sheet.hideSheet(); } catch (e) {}
  }
  const existentes = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat().map(v => String(v || '').trim().toLocaleLowerCase('pt-BR'))
    : [];
  const set = new Set(existentes);
  const adicionar = novas.filter(v => !set.has(v.toLocaleLowerCase('pt-BR')));
  if (adicionar.length) {
    sheet.getRange(Math.max(sheet.getLastRow() + 1, 2), 1, adicionar.length, 1).setValues(adicionar.map(v => [v]));
  }
  try { CacheService.getScriptCache().remove('CORES_FIXPAR'); } catch (e) {}
}

function apiV3LimparLinha_(pageKey, sheetRow) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const cfg = getConfig_(pageKey);
    const row = Number(sheetRow || 0);
    if (row < 3) return { ok: true };
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.sheetName);
    if (!sheet) throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
    sheet.getRange(row, 1, 1, cfg.headers.length + 2).clearContent();
    apiV3RemoverHistoricoPorSourceRow_(pageKey, row);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function apiV3RemoverHistoricoPorSourceRow_(pageKey, sourceRow) {
  const cfg = getConfig_(pageKey);
  const hist = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.historySheetName);
  if (!hist || hist.getLastRow() < 3) return;
  const sourceCol = cfg.headers.length + 1;
  const totalCols = cfg.headers.length + 2;
  const alvo = String(sourceRow);
  hist.getRange(3, sourceCol, hist.getLastRow() - 2, 1).getDisplayValues().forEach((row, index) => {
    if (String(row[0] || '').trim() === alvo) hist.getRange(index + 3, 1, 1, totalCols).clearContent();
  });
}

function apiV3EditarHistorico_(pageKey, historyRow, novosValores) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const cfg = getConfig_(pageKey);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hist = ss.getSheetByName(cfg.historySheetName);
    const log = ss.getSheetByName(cfg.logSheetName);
    const operacional = ss.getSheetByName(cfg.sheetName);
    if (!hist || !log || !operacional) throw new Error('Não foi possível localizar todas as abas necessárias.');

    const row = Number(historyRow || 0);
    if (row < 3) throw new Error('Linha de histórico inválida.');
    const antigo = hist.getRange(row, 1, 1, cfg.headers.length).getValues()[0];
    const sourceRow = Number(hist.getRange(row, cfg.headers.length + 1).getValue() || 0) || null;
    const dataIso = valorDataParaIso_(novosValores && novosValores[0]);
    if (!dataIso) throw new Error('Informe uma data válida no formato DD/MM/AAAA.');
    const novo = normalizarLinhaParaPlanilha_(pageKey, dataIso, novosValores);
    const opIndex = acharHeader_(cfg.headers, 'OP');
    const op = opIndex >= 0 ? novo[opIndex] : '';
    const usuario = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
    const logs = [];

    for (let i = 0; i < cfg.headers.length; i++) {
      if (!valoresIguais_(antigo[i], novo[i])) {
        logs.push([new Date(), usuario, row, op, cfg.headers[i], valorParaLog_(antigo[i]), valorParaLog_(novo[i])]);
      }
    }

    hist.getRange(row, 1, 1, cfg.headers.length).setValues([novo]);
    hist.getRange(row, cfg.headers.length + 2).setValue(new Date());
    hist.getRange(row, 1).setNumberFormat('dd/MM/yyyy');
    if (sourceRow && sourceRow >= 3) {
      operacional.getRange(sourceRow, 1, 1, cfg.headers.length).setValues([novo]);
      operacional.getRange(sourceRow, 1).setNumberFormat('dd/MM/yyyy');
    }
    if (logs.length) {
      const start = log.getLastRow() + 1;
      log.getRange(start, 1, logs.length, logs[0].length).setValues(logs);
      log.getRange(start, 1, logs.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    }
    if (pageKey === 'RECEBIMENTO') {
      const corIndex = cfg.headers.indexOf('Cor');
      if (corIndex >= 0 && novo[corIndex]) apiV3RegistrarCoresLote_([novo[corIndex]]);
    }
    apiV3SincronizarConciliacaoCompleta_();
    return { ok: true, historyRow: row, values: linhaHistoricoParaCliente_(pageKey, novo), alteracoes: logs.length };
  } finally {
    lock.releaseLock();
  }
}

function apiV3SalvarPdfRapidoDrive_(nomeArquivo, pdfBase64) {
  const file = apiV3CriarPdf_(nomeArquivo, pdfBase64);
  return { ok: true, fileName: file.getName(), fileId: file.getId(), url: file.getUrl() };
}

function apiV3FinalizarRelatorio_(pageKey, isoDate, linhasTela, nomeArquivo, pdfBase64, reportId) {
  const id = apiV3UidTexto_(reportId) || Utilities.getUuid();
  const propKey = API_V3_REPORT_PROP_PREFIX + id;
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getDocumentLock();
  lock.waitLock(60000);

  try {
    const salvo = apiV3LerEstadoRelatorio_(props, propKey);
    if (salvo && salvo.state === 'done' && salvo.result) return salvo.result;

    const registros = apiV3NormalizarRegistrosRelatorio_(linhasTela);
    if (!registros.length) throw new Error('Não existem dados preenchidos para finalizar o relatório.');

    const persistencia = apiV3PersistirLoteSobLock_(pageKey, isoDate, registros, {
      atualizarHistorico: true,
      registrarCores: true
    });

    apiV3SincronizarConciliacaoCompleta_();

    let pdfState = salvo && salvo.state === 'pdf' ? salvo : null;
    if (!pdfState || !pdfState.fileId) {
      const pdfFile = apiV3CriarPdf_(nomeArquivo, pdfBase64);
      pdfState = {
        state: 'pdf',
        fileId: pdfFile.getId(),
        fileName: pdfFile.getName(),
        url: pdfFile.getUrl(),
        createdAt: Date.now()
      };
      props.setProperty(propKey, JSON.stringify(pdfState));
    }

    const cfg = getConfig_(pageKey);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.sheetName);
    if (!sheet) throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
    const statusCol = cfg.headers.length + 1;
    apiV3EscreverBlocos_(sheet, persistencia.rows.map(item => ({ row: item.sheetRow, values: [STATUS_GERADO] })), statusCol, 1);
    SpreadsheetApp.flush();

    const result = {
      ok: true,
      reportId: id,
      fileName: pdfState.fileName,
      fileId: pdfState.fileId,
      url: pdfState.url,
      registros: persistencia.rows.length,
      api: 'SGQ_FIXPAR_V3'
    };

    props.setProperty(propKey, JSON.stringify({ state: 'done', result: result, createdAt: pdfState.createdAt || Date.now() }));
    apiV3LimparEstadosRelatoriosAntigos_(props);
    return result;
  } finally {
    lock.releaseLock();
  }
}

function apiV3NormalizarRegistrosRelatorio_(linhasTela) {
  return (Array.isArray(linhasTela) ? linhasTela : []).filter(item => {
    const values = Array.isArray(item) ? item : (item && Array.isArray(item.values) ? item.values : []);
    return values.slice(1).some(v => String(v == null ? '' : v).trim() !== '');
  }).map(item => {
    if (Array.isArray(item)) return { clientId: '', sheetRow: null, values: item };
    return {
      clientId: apiV3UidTexto_(item.clientId),
      sheetRow: Number(item.sheetRow || 0) || null,
      values: item.values || []
    };
  });
}

function apiV3LerEstadoRelatorio_(props, key) {
  const raw = props.getProperty(key);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch (e) { props.deleteProperty(key); return null; }
}

function apiV3LimparEstadosRelatoriosAntigos_(props) {
  try {
    const todos = props.getProperties();
    const limite = Date.now() - (7 * 24 * 60 * 60 * 1000);
    Object.keys(todos).forEach(key => {
      if (!key.startsWith(API_V3_REPORT_PROP_PREFIX)) return;
      try {
        const value = JSON.parse(todos[key]);
        const createdAt = Number(value.createdAt || 0);
        if (createdAt && createdAt < limite) props.deleteProperty(key);
      } catch (e) {}
    });
  } catch (e) {}
}

function apiV3CriarPdf_(nomeArquivo, pdfBase64) {
  let base64 = String(pdfBase64 || '').trim();
  if (!base64) throw new Error('O PDF não foi recebido pelo servidor.');
  const marker = 'base64,';
  const index = base64.indexOf(marker);
  if (index >= 0) base64 = base64.slice(index + marker.length);
  const nome = /\.pdf$/i.test(String(nomeArquivo || '')) ? String(nomeArquivo) : String(nomeArquivo || 'Relatorio') + '.pdf';
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, MimeType.PDF, nome);
  const folder = DriveApp.getFolderById(PASTA_RELATORIOS_ID);
  const file = folder.createFile(blob);
  if (!file || !file.getId()) throw new Error('O PDF não pôde ser salvo na pasta do Drive.');
  return file;
}

function apiV3SincronizarConciliacaoCompleta_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Conciliação OP');
  if (!sheet) return;
  const entradas = apiV3LerOperacaoConciliacao_('RECEBIMENTO');
  const saidas = apiV3LerOperacaoConciliacao_('SAIDA');
  const saidasPorOp = {};
  saidas.forEach(item => {
    const key = apiV3OpKey_(item.op);
    if (!key) return;
    if (!saidasPorOp[key]) saidasPorOp[key] = [];
    saidasPorOp[key].push(item);
  });
  Object.keys(saidasPorOp).forEach(key => {
    saidasPorOp[key].sort((a, b) => a.dataTime - b.dataTime || a.sheetRow - b.sheetRow);
  });
  const dados = entradas.sort((a, b) => a.dataTime - b.dataTime || a.sheetRow - b.sheetRow).map(entrada => {
    const candidatas = saidasPorOp[apiV3OpKey_(entrada.op)] || [];
    const saida = candidatas.find(item => item.dataTime >= entrada.dataTime) || candidatas[0] || null;
    return [entrada.dataBR, entrada.op, entrada.nf, entrada.nfCaixa, saida ? saida.op : '', saida ? saida.nf : '', saida ? saida.nfCaixa : '', saida ? saida.dataBR : ''];
  });
  const lastRow = sheet.getLastRow();
  if (lastRow >= 3) sheet.getRange(3, 1, lastRow - 2, 8).clearContent();
  if (dados.length) sheet.getRange(3, 1, dados.length, 8).setValues(dados);
}

function apiV3LerOperacaoConciliacao_(pageKey) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.sheetName);
  if (!sheet || sheet.getLastRow() < 3) return [];
  const opIndex = acharHeader_(cfg.headers, 'OP');
  const nfIndex = acharHeader_(cfg.headers, 'Nota Fiscal');
  const nfCaixaIndex = acharHeader_(cfg.headers, 'Nota Fiscal de Caixa');
  if (opIndex < 0) return [];
  const values = sheet.getRange(3, 1, sheet.getLastRow() - 2, cfg.headers.length).getValues();
  return values.map((row, index) => {
    const op = normalizarSaida_(row[opIndex]);
    const date = converterParaDate_(row[0]);
    if (!op || !date) return null;
    return {
      sheetRow: index + 3,
      dataTime: date.getTime(),
      dataBR: Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      op: op,
      nf: nfIndex >= 0 ? normalizarSaida_(row[nfIndex]) : '',
      nfCaixa: nfCaixaIndex >= 0 ? normalizarSaida_(row[nfCaixaIndex]) : ''
    };
  }).filter(Boolean);
}

function apiV3OpKey_(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, '').toUpperCase();
}

function carregarProgramacaoSgq() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfgEntrada = getConfig_('RECEBIMENTO');
  const cfgSaida = getConfig_('SAIDA');
  const entrada = ss.getSheetByName(cfgEntrada.sheetName);
  const saida = ss.getSheetByName(cfgSaida.sheetName);
  if (!entrada) throw new Error('A aba "' + cfgEntrada.sheetName + '" não foi encontrada.');
  if (!saida) throw new Error('A aba "' + cfgSaida.sheetName + '" não foi encontrada.');

  const opsComSaida = new Set();
  if (saida.getLastRow() >= 3) {
    saida.getRange(3, 1, saida.getLastRow() - 2, cfgSaida.headers.length).getDisplayValues().forEach(row => {
      const chave = apiProgChaveOp_(row[1]);
      if (chave) opsComSaida.add(chave);
    });
  }

  const agrupado = {};
  if (entrada.getLastRow() >= 3) {
    const qtd = entrada.getLastRow() - 2;
    const raw = entrada.getRange(3, 1, qtd, cfgEntrada.headers.length).getValues();
    const display = entrada.getRange(3, 1, qtd, cfgEntrada.headers.length).getDisplayValues();
    raw.forEach((row, index) => {
      const shown = display[index] || [];
      const op = apiProgTexto_(shown[1]);
      const chave = apiProgChaveOp_(op);
      if (!chave || opsComSaida.has(chave)) return;
      const dataTime = apiProgDataTime_(row[0]);
      const dataTexto = apiProgTexto_(shown[0]);
      if (!agrupado[chave]) {
        agrupado[chave] = { op: op, qtdCaixas: 0, qtdConteiner: 0, pesoDanuta: 0, temQtdCaixas: false, temQtdConteiner: false, temPesoDanuta: false, cores: {}, primeiraData: dataTime || Number.MAX_SAFE_INTEGER, primeiraDataTexto: dataTexto };
      }
      const item = agrupado[chave];
      if (apiProgTexto_(shown[2]) !== '') { item.temQtdCaixas = true; item.qtdCaixas += apiProgNumero_(row[2]); }
      if (apiProgTexto_(shown[3]) !== '') { item.temQtdConteiner = true; item.qtdConteiner += apiProgNumero_(row[3]); }
      if (apiProgTexto_(shown[5]) !== '') { item.temPesoDanuta = true; item.pesoDanuta += apiProgNumero_(row[5]); }
      const cor = apiProgTexto_(shown[8]);
      if (cor) item.cores[cor.toLocaleLowerCase('pt-BR')] = cor;
      if (dataTime && dataTime < item.primeiraData) { item.primeiraData = dataTime; item.primeiraDataTexto = dataTexto; }
    });
  }

  const estados = apiProgLerEstados_();
  const manuais = apiProgLerManuais_();
  const manualPorChave = {};
  manuais.forEach(item => {
    const chave = apiProgChaveOp_(item.op);
    if (!chave || opsComSaida.has(chave)) return;
    manualPorChave[chave] = item;
  });

  const chaves = new Set(Object.keys(agrupado).concat(Object.keys(manualPorChave)));
  const rows = [];
  chaves.forEach(chave => {
    const automatico = agrupado[chave] || null;
    const manual = manualPorChave[chave] || null;
    const estado = estados[chave] || {};
    if (automatico) {
      const coresAuto = Object.keys(automatico.cores).map(key => automatico.cores[key]).join(' / ');
      rows.push({
        dataEntrada: automatico.primeiraDataTexto || (manual ? manual.dataEntrada : ''),
        op: automatico.op || (manual ? manual.op : ''),
        qtdCaixas: automatico.temQtdCaixas ? apiProgFormatarNumero_(automatico.qtdCaixas) : (manual ? manual.qtdCaixas : ''),
        qtdConteiner: automatico.temQtdConteiner ? apiProgFormatarNumero_(automatico.qtdConteiner) : (manual ? manual.qtdConteiner : ''),
        cor: coresAuto || (manual ? manual.cor : ''),
        pesoDanuta: automatico.temPesoDanuta ? apiProgFormatarNumero_(automatico.pesoDanuta) : (manual ? manual.pesoDanuta : ''),
        status: estado.status || (manual ? manual.status : ''),
        ok: Boolean(estado.ok), encaminhado: Boolean(estado.encaminhado), manual: false,
        primeiraData: automatico.primeiraData || apiProgDataTime_(manual ? manual.dataEntrada : '')
      });
    } else if (manual) {
      rows.push({
        dataEntrada: manual.dataEntrada || '', op: manual.op || '', qtdCaixas: manual.qtdCaixas || '', qtdConteiner: manual.qtdConteiner || '', cor: manual.cor || '', pesoDanuta: manual.pesoDanuta || '', status: estado.status || manual.status || '', ok: Boolean(estado.ok), encaminhado: Boolean(estado.encaminhado), manual: true, primeiraData: apiProgDataTime_(manual.dataEntrada)
      });
    }
  });

  rows.sort((a, b) => {
    const urgenteA = apiProgTexto_(a.status).toLocaleLowerCase('pt-BR') === 'urgente';
    const urgenteB = apiProgTexto_(b.status).toLocaleLowerCase('pt-BR') === 'urgente';
    if (urgenteA !== urgenteB) return urgenteA ? -1 : 1;
    const dataA = Number(a.primeiraData || 0) || Number.MAX_SAFE_INTEGER;
    const dataB = Number(b.primeiraData || 0) || Number.MAX_SAFE_INTEGER;
    if (dataA !== dataB) return dataA - dataB;
    return String(a.op).localeCompare(String(b.op), 'pt-BR', { numeric: true, sensitivity: 'base' });
  });
  rows.forEach(item => delete item.primeiraData);
  return { rows: rows, source: 'ABAS_OPERACIONAIS_V3' };
}

function salvarProgramacaoSgq(op, status, ok, encaminhado, manualData) {
  const chave = apiProgChaveOp_(op);
  if (!chave) throw new Error('OP inválida para salvar a programação.');
  const sheet = apiProgObterAbaEstados_();
  const lastRow = sheet.getLastRow();
  let targetRow = 0;
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < values.length; i++) {
      if (apiProgChaveOp_(values[i][0]) === chave) { targetRow = i + 2; break; }
    }
  }
  if (!targetRow) targetRow = Math.max(lastRow + 1, 2);
  sheet.getRange(targetRow, 1, 1, 5).setValues([[String(op), String(status || ''), Boolean(ok), Boolean(encaminhado), new Date()]]);
  sheet.getRange(targetRow, 5).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  if (manualData && manualData.manual === true) apiProgSalvarManual_(op, status, manualData);
  return { ok: true };
}

function apiProgObterAbaEstados_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Programação SGQ Fixpar');
  if (!sheet) {
    sheet = ss.insertSheet('Programação SGQ Fixpar');
    sheet.getRange(1, 1, 1, 5).setValues([['OP', 'Status', 'OK', 'Encaminhado', 'Atualizado em']]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function apiProgLerEstados_() {
  const sheet = apiProgObterAbaEstados_();
  const estados = {};
  if (sheet.getLastRow() < 2) return estados;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues().forEach(row => {
    const chave = apiProgChaveOp_(row[0]);
    if (!chave) return;
    estados[chave] = { status: apiProgTexto_(row[1]), ok: row[2] === true, encaminhado: row[3] === true };
  });
  return estados;
}

function apiProgObterAbaManual_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Programação Manual SGQ');
  if (!sheet) {
    sheet = ss.insertSheet('Programação Manual SGQ');
    sheet.getRange(1, 1, 1, 10).setValues([['OP', 'Data', 'Qtd. Caixas', 'Qtd. Caçamba', 'Cor', 'Peso Danuta', 'Status inicial', 'Ativo', 'Criado em', 'Atualizado em']]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function apiProgSalvarManual_(op, status, manualData) {
  const sheet = apiProgObterAbaManual_();
  const lastRow = sheet.getLastRow();
  const chave = apiProgChaveOp_(op);
  let targetRow = 0;
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < values.length; i++) {
      if (apiProgChaveOp_(values[i][0]) === chave) { targetRow = i + 2; break; }
    }
  }
  const agora = new Date();
  let criadoEm = agora;
  if (targetRow) {
    const existente = sheet.getRange(targetRow, 9).getValue();
    if (existente instanceof Date && !isNaN(existente.getTime())) criadoEm = existente;
  } else targetRow = Math.max(lastRow + 1, 2);
  const data = apiProgDataPlanilha_(manualData.dataEntrada) || agora;
  sheet.getRange(targetRow, 1, 1, 10).setValues([[String(op), data, apiProgTexto_(manualData.qtdCaixas), apiProgTexto_(manualData.qtdConteiner), apiProgTexto_(manualData.cor), apiProgTexto_(manualData.pesoDanuta), apiProgTexto_(status), true, criadoEm, agora]]);
  sheet.getRange(targetRow, 2).setNumberFormat('dd/MM/yyyy');
  sheet.getRange(targetRow, 9, 1, 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function apiProgLerManuais_() {
  const sheet = apiProgObterAbaManual_();
  if (sheet.getLastRow() < 2) return [];
  const qtd = sheet.getLastRow() - 1;
  const raw = sheet.getRange(2, 1, qtd, 10).getValues();
  const display = sheet.getRange(2, 1, qtd, 10).getDisplayValues();
  const result = [];
  raw.forEach((row, index) => {
    const shown = display[index] || [];
    const op = apiProgTexto_(shown[0]);
    if (!op || row[7] === false) return;
    result.push({ op: op, dataEntrada: apiProgTexto_(shown[1]), qtdCaixas: apiProgTexto_(shown[2]), qtdConteiner: apiProgTexto_(shown[3]), cor: apiProgTexto_(shown[4]), pesoDanuta: apiProgTexto_(shown[5]), status: apiProgTexto_(shown[6]), manual: true });
  });
  return result;
}

function apiProgChaveOp_(value) { return apiProgTexto_(value).replace(/\s+/g, '').toUpperCase(); }
function apiProgTexto_(value) { return String(value === null || value === undefined ? '' : value).trim(); }
function apiProgNumero_(value) {
  if (typeof value === 'number' && isFinite(value)) return value;
  let text = apiProgTexto_(value);
  if (!text) return 0;
  text = text.replace(/\s/g, '');
  if (text.indexOf(',') >= 0 && text.indexOf('.') >= 0) text = text.replace(/\./g, '').replace(',', '.');
  else if (text.indexOf(',') >= 0) text = text.replace(',', '.');
  const number = Number(text.replace('%', ''));
  return isFinite(number) ? number : 0;
}
function apiProgFormatarNumero_(value) {
  const number = Number(value || 0);
  if (Math.abs(number - Math.round(number)) < 0.0000001) return String(Math.round(number));
  return number.toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}
function apiProgDataPlanilha_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const text = apiProgTexto_(value);
  if (!text) return null;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isNaN(date.getTime()) ? null : date;
  }
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}
function apiProgDataTime_(value) { const date = apiProgDataPlanilha_(value); return date ? date.getTime() : 0; }
function respostaJsonApi_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
