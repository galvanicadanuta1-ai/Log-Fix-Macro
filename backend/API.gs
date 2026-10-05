/**
 * ============================================================
 * API PARA GITHUB PAGES -> GOOGLE APPS SCRIPT
 * ============================================================
 *
 * Adicione este arquivo ao MESMO projeto Apps Script onde já
 * estão os demais arquivos .gs do SGQ Fixpar.
 *
 * A Programação SGQ usa como fonte de verdade:
 * - Recebimento Fixpar
 * - Entregas Fixpar
 *
 * Isso evita duplicidade provocada pelo Histórico/Conciliação.
 * ============================================================
 */

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
      error: error && error.message
        ? error.message
        : String(error)
    });
  }
}

function executarMetodoApi_(method, args) {
  switch (method) {
    case 'carregarDados':
      return carregarDados.apply(null, args);

    case 'salvarLinha':
      return salvarLinha.apply(null, args);

    case 'salvarLinhasEmLote':
      return salvarLinhasEmLote.apply(null, args);

    case 'limparLinha':
      return limparLinha.apply(null, args);

    case 'carregarCores':
      return carregarCores.apply(null, args);

    case 'consultarHistorico':
      return consultarHistorico.apply(null, args);

    case 'consultarHistoricoPaginado':
      return apiConsultarHistoricoPaginado_.apply(null, args);

    case 'buscarSugestoesHistorico':
      return buscarSugestoesHistorico.apply(null, args);

    case 'editarHistorico':
      return editarHistorico.apply(null, args);

    case 'gerarRelatorio':
      return gerarRelatorio.apply(null, args);

    case 'gerarRelatorioHistorico':
      return gerarRelatorioHistorico.apply(null, args);

    case 'finalizarRelatorioRapido':
      return finalizarRelatorioRapido.apply(null, args);

    case 'salvarPdfRapidoDrive':
      return salvarPdfRapidoDrive.apply(null, args);

    case 'carregarProgramacaoSgq':
      return carregarProgramacaoSgq.apply(null, args);

    case 'salvarProgramacaoSgq':
      return salvarProgramacaoSgq.apply(null, args);

    default:
      throw new Error('Método da API não permitido: ' + method);
  }
}

function apiConsultarHistoricoPaginado_(
  pageKey,
  dataInicialIso,
  dataFinalIso,
  busca,
  offset,
  limit
) {
  if (typeof consultarHistoricoPaginado === 'function') {
    return consultarHistoricoPaginado(
      pageKey,
      dataInicialIso,
      dataFinalIso,
      busca,
      offset,
      limit
    );
  }

  const resultado = consultarHistorico(
    pageKey,
    dataInicialIso,
    dataFinalIso,
    busca
  );

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


/**
 * ============================================================
 * PDF RÁPIDO
 * ============================================================
 */

function salvarPdfRapidoDrive(nomeArquivo, pdfBase64) {
  const file = apiCriarPdfBase64NoDrive_(nomeArquivo, pdfBase64);

  return {
    ok: true,
    fileName: file.getName(),
    fileId: file.getId(),
    url: file.getUrl()
  };
}

function finalizarRelatorioRapido(
  pageKey,
  isoDate,
  linhasTela,
  nomeArquivo,
  pdfBase64
) {
  const cfg = getConfig_(pageKey);
  const registros = normalizarRegistrosRecebidos_(linhasTela);

  if (!registros.length) {
    throw new Error('Não existem dados preenchidos para finalizar o relatório.');
  }

  const pdfFile = apiCriarPdfBase64NoDrive_(nomeArquivo, pdfBase64);

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(cfg.sheetName);

    if (!sheet) {
      throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
    }

    const statusCol = cfg.headers.length + 1;
    const opIndex = acharHeader_(cfg.headers, 'OP');
    const opsAfetadas = [];
    const persistidas = [];

    registros.forEach(registro => {
      const normalized = normalizarLinhaParaPlanilha_(
        pageKey,
        isoDate,
        registro.values
      );

      let targetRow = Number(registro.sheetRow || 0);

      if (targetRow >= 3) {
        sheet
          .getRange(targetRow, 1, 1, cfg.headers.length)
          .setValues([normalized]);
      } else {
        targetRow = Math.max(sheet.getLastRow() + 1, 3);

        sheet
          .getRange(targetRow, 1, 1, cfg.headers.length)
          .setValues([normalized]);
      }

      sheet.getRange(targetRow, 1).setNumberFormat('dd/MM/yyyy');
      sheet.getRange(targetRow, statusCol).setValue(STATUS_GERADO);

      upsertHistorico_(pageKey, targetRow, normalized);

      if (opIndex >= 0) {
        opsAfetadas.push(normalized[opIndex]);
      }

      persistidas.push({
        sheetRow: targetRow,
        values: normalized
      });
    });

    SpreadsheetApp.flush();
    sincronizarConciliacaoOps_(opsAfetadas);

    return {
      ok: true,
      fileName: pdfFile.getName(),
      fileId: pdfFile.getId(),
      url: pdfFile.getUrl(),
      registros: persistidas.length
    };

  } finally {
    lock.releaseLock();
  }
}

function apiCriarPdfBase64NoDrive_(nomeArquivo, pdfBase64) {
  let base64 = String(pdfBase64 || '').trim();

  if (!base64) {
    throw new Error('O PDF não foi recebido pelo servidor.');
  }

  const marker = 'base64,';
  const markerIndex = base64.indexOf(marker);
  if (markerIndex >= 0) {
    base64 = base64.slice(markerIndex + marker.length);
  }

  const nome = /\.pdf$/i.test(String(nomeArquivo || ''))
    ? String(nomeArquivo)
    : String(nomeArquivo || 'Relatorio') + '.pdf';

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, MimeType.PDF, nome);
  const folder = DriveApp.getFolderById(PASTA_RELATORIOS_ID);
  const file = folder.createFile(blob);

  if (!file || !file.getId()) {
    throw new Error('O PDF não pôde ser salvo na pasta do Drive.');
  }

  return file;
}


/**
 * ============================================================
 * PROGRAMAÇÃO SGQ - FIXPAR
 * ============================================================
 *
 * REGRA CENTRAL:
 * A fonte de verdade é a própria operação, NÃO o Histórico.
 *
 * - Entrada: aba Recebimento Fixpar
 * - Saída:   aba Entregas Fixpar
 *
 * Se a OP existe na entrada e ainda não existe na saída, aparece.
 * Quantidades são somadas somente das linhas reais da entrada.
 * ============================================================
 */

function carregarProgramacaoSgq() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfgEntrada = getConfig_('RECEBIMENTO');
  const cfgSaida = getConfig_('SAIDA');

  const entrada = ss.getSheetByName(cfgEntrada.sheetName);
  const saida = ss.getSheetByName(cfgSaida.sheetName);

  if (!entrada) {
    throw new Error('A aba "' + cfgEntrada.sheetName + '" não foi encontrada.');
  }

  if (!saida) {
    throw new Error('A aba "' + cfgSaida.sheetName + '" não foi encontrada.');
  }

  const opsComSaida = new Set();

  if (saida.getLastRow() >= 3) {
    const qtdLinhasSaida = saida.getLastRow() - 2;
    const displaySaida = saida
      .getRange(3, 1, qtdLinhasSaida, cfgSaida.headers.length)
      .getDisplayValues();

    displaySaida.forEach(row => {
      const op = apiProgTexto_(row[1]);
      const chave = apiProgChaveOp_(op);
      if (chave) opsComSaida.add(chave);
    });
  }

  const agrupado = {};

  if (entrada.getLastRow() >= 3) {
    const qtdLinhasEntrada = entrada.getLastRow() - 2;
    const raw = entrada
      .getRange(3, 1, qtdLinhasEntrada, cfgEntrada.headers.length)
      .getValues();
    const display = entrada
      .getRange(3, 1, qtdLinhasEntrada, cfgEntrada.headers.length)
      .getDisplayValues();

    raw.forEach((row, index) => {
      const shown = display[index] || [];
      const op = apiProgTexto_(shown[1]);
      const chave = apiProgChaveOp_(op);

      if (!chave || opsComSaida.has(chave)) return;

      const dataTime = apiProgDataTime_(row[0]);
      const dataTexto = apiProgTexto_(shown[0]);

      if (!agrupado[chave]) {
        agrupado[chave] = {
          op: op,
          qtdCaixas: 0,
          qtdConteiner: 0,
          pesoDanuta: 0,
          temQtdCaixas: false,
          temQtdConteiner: false,
          temPesoDanuta: false,
          cores: {},
          primeiraData: dataTime || Number.MAX_SAFE_INTEGER,
          primeiraDataTexto: dataTexto
        };
      }

      const item = agrupado[chave];

      if (apiProgTexto_(shown[2]) !== '') {
        item.temQtdCaixas = true;
        item.qtdCaixas += apiProgNumero_(row[2]);
      }

      if (apiProgTexto_(shown[3]) !== '') {
        item.temQtdConteiner = true;
        item.qtdConteiner += apiProgNumero_(row[3]);
      }

      if (apiProgTexto_(shown[5]) !== '') {
        item.temPesoDanuta = true;
        item.pesoDanuta += apiProgNumero_(row[5]);
      }

      const cor = apiProgTexto_(shown[8]);
      if (cor) item.cores[cor.toLocaleLowerCase('pt-BR')] = cor;

      if (dataTime && dataTime < item.primeiraData) {
        item.primeiraData = dataTime;
        item.primeiraDataTexto = dataTexto;
      }
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

  const chaves = new Set([
    ...Object.keys(agrupado),
    ...Object.keys(manualPorChave)
  ]);

  const rows = [];

  chaves.forEach(chave => {
    const automatico = agrupado[chave] || null;
    const manual = manualPorChave[chave] || null;
    const estado = estados[chave] || {};

    if (automatico) {
      const coresAuto = Object.keys(automatico.cores)
        .map(key => automatico.cores[key])
        .join(' / ');

      rows.push({
        dataEntrada: automatico.primeiraDataTexto || (manual ? manual.dataEntrada : ''),
        op: automatico.op || (manual ? manual.op : ''),
        qtdCaixas: automatico.temQtdCaixas
          ? apiProgFormatarNumero_(automatico.qtdCaixas)
          : (manual ? manual.qtdCaixas : ''),
        qtdConteiner: automatico.temQtdConteiner
          ? apiProgFormatarNumero_(automatico.qtdConteiner)
          : (manual ? manual.qtdConteiner : ''),
        cor: coresAuto || (manual ? manual.cor : ''),
        pesoDanuta: automatico.temPesoDanuta
          ? apiProgFormatarNumero_(automatico.pesoDanuta)
          : (manual ? manual.pesoDanuta : ''),
        status: estado.status || (manual ? manual.status : ''),
        ok: Boolean(estado.ok),
        encaminhado: Boolean(estado.encaminhado),
        manual: false,
        primeiraData: automatico.primeiraData || apiProgDataTime_(manual ? manual.dataEntrada : '')
      });
      return;
    }

    if (manual) {
      rows.push({
        dataEntrada: manual.dataEntrada || '',
        op: manual.op || '',
        qtdCaixas: manual.qtdCaixas || '',
        qtdConteiner: manual.qtdConteiner || '',
        cor: manual.cor || '',
        pesoDanuta: manual.pesoDanuta || '',
        status: estado.status || manual.status || '',
        ok: Boolean(estado.ok),
        encaminhado: Boolean(estado.encaminhado),
        manual: true,
        primeiraData: apiProgDataTime_(manual.dataEntrada)
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

    return String(a.op).localeCompare(
      String(b.op),
      'pt-BR',
      { numeric: true, sensitivity: 'base' }
    );
  });

  rows.forEach(item => delete item.primeiraData);

  return {
    rows: rows,
    source: 'ABAS_OPERACIONAIS'
  };
}


/**
 * ============================================================
 * ESTADO / OS MANUAL DA PROGRAMAÇÃO
 * ============================================================
 */

function salvarProgramacaoSgq(op, status, ok, encaminhado, manualData) {
  const chave = apiProgChaveOp_(op);
  if (!chave) {
    throw new Error('OP inválida para salvar a programação.');
  }

  const sheet = apiProgObterAbaEstados_();
  const lastRow = sheet.getLastRow();
  let targetRow = 0;

  if (lastRow >= 2) {
    const match = sheet
      .getRange(2, 1, lastRow - 1, 1)
      .createTextFinder(String(op))
      .matchCase(false)
      .matchEntireCell(true)
      .findNext();

    if (match) targetRow = match.getRow();
  }

  if (!targetRow) {
    targetRow = Math.max(sheet.getLastRow() + 1, 2);
  }

  sheet
    .getRange(targetRow, 1, 1, 5)
    .setValues([[
      String(op),
      String(status || ''),
      Boolean(ok),
      Boolean(encaminhado),
      new Date()
    ]]);

  sheet.getRange(targetRow, 5).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  if (manualData && manualData.manual === true) {
    apiProgSalvarManual_(op, status, manualData);
  }

  return { ok: true };
}

function apiProgObterAbaEstados_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Programação SGQ Fixpar');

  if (!sheet) {
    sheet = ss.insertSheet('Programação SGQ Fixpar');
    sheet
      .getRange(1, 1, 1, 5)
      .setValues([[
        'OP',
        'Status',
        'OK',
        'Encaminhado',
        'Atualizado em'
      ]])
      .setFontWeight('bold');

    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 5, 150);
    sheet.setColumnWidth(2, 280);
  }

  return sheet;
}

function apiProgLerEstados_() {
  const sheet = apiProgObterAbaEstados_();
  const estados = {};

  if (sheet.getLastRow() < 2) return estados;

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 4)
    .getValues();

  values.forEach(row => {
    const op = apiProgTexto_(row[0]);
    const chave = apiProgChaveOp_(op);
    if (!chave) return;

    estados[chave] = {
      status: apiProgTexto_(row[1]),
      ok: row[2] === true,
      encaminhado: row[3] === true
    };
  });

  return estados;
}

function apiProgObterAbaManual_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Programação Manual SGQ');

  if (!sheet) {
    sheet = ss.insertSheet('Programação Manual SGQ');
    sheet
      .getRange(1, 1, 1, 10)
      .setValues([[
        'OP',
        'Data',
        'Qtd. Caixas',
        'Qtd. Caçamba',
        'Cor',
        'Peso Danuta',
        'Status inicial',
        'Ativo',
        'Criado em',
        'Atualizado em'
      ]])
      .setFontWeight('bold');

    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 100);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 110);
    sheet.setColumnWidth(5, 220);
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 120);
  }

  return sheet;
}

function apiProgSalvarManual_(op, status, manualData) {
  const sheet = apiProgObterAbaManual_();
  const lastRow = sheet.getLastRow();
  let targetRow = 0;

  if (lastRow >= 2) {
    const match = sheet
      .getRange(2, 1, lastRow - 1, 1)
      .createTextFinder(String(op))
      .matchCase(false)
      .matchEntireCell(true)
      .findNext();

    if (match) targetRow = match.getRow();
  }

  const agora = new Date();
  let criadoEm = agora;

  if (targetRow) {
    const existente = sheet.getRange(targetRow, 9).getValue();
    if (existente instanceof Date && !isNaN(existente.getTime())) {
      criadoEm = existente;
    }
  } else {
    targetRow = Math.max(lastRow + 1, 2);
  }

  const data = apiProgDataPlanilha_(manualData.dataEntrada) || agora;

  sheet
    .getRange(targetRow, 1, 1, 10)
    .setValues([[
      String(op),
      data,
      apiProgTexto_(manualData.qtdCaixas),
      apiProgTexto_(manualData.qtdConteiner),
      apiProgTexto_(manualData.cor),
      apiProgTexto_(manualData.pesoDanuta),
      apiProgTexto_(status),
      true,
      criadoEm,
      agora
    ]]);

  sheet.getRange(targetRow, 2).setNumberFormat('dd/MM/yyyy');
  sheet.getRange(targetRow, 9, 1, 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function apiProgLerManuais_() {
  const sheet = apiProgObterAbaManual_();

  if (sheet.getLastRow() < 2) return [];

  const quantidade = sheet.getLastRow() - 1;
  const raw = sheet.getRange(2, 1, quantidade, 10).getValues();
  const display = sheet.getRange(2, 1, quantidade, 10).getDisplayValues();
  const result = [];

  raw.forEach((row, index) => {
    const shown = display[index] || [];
    const op = apiProgTexto_(shown[0]);
    if (!op) return;

    const ativo = row[7];
    if (ativo === false) return;

    result.push({
      op: op,
      dataEntrada: apiProgTexto_(shown[1]),
      qtdCaixas: apiProgTexto_(shown[2]),
      qtdConteiner: apiProgTexto_(shown[3]),
      cor: apiProgTexto_(shown[4]),
      pesoDanuta: apiProgTexto_(shown[5]),
      status: apiProgTexto_(shown[6]),
      manual: true
    });
  });

  return result;
}


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function apiProgChaveOp_(value) {
  return apiProgTexto_(value)
    .replace(/\s+/g, '')
    .toUpperCase();
}

function apiProgTexto_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function apiProgNumero_(value) {
  if (typeof value === 'number' && isFinite(value)) return value;

  let text = apiProgTexto_(value);
  if (!text) return 0;

  text = text.replace(/\s/g, '');

  if (text.indexOf(',') >= 0 && text.indexOf('.') >= 0) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (text.indexOf(',') >= 0) {
    text = text.replace(',', '.');
  }

  const number = Number(text.replace('%', ''));
  return isFinite(number) ? number : 0;
}

function apiProgFormatarNumero_(value) {
  const number = Number(value || 0);

  if (Math.abs(number - Math.round(number)) < 0.0000001) {
    return String(Math.round(number));
  }

  return number
    .toFixed(3)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
    .replace('.', ',');
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

function apiProgDataTime_(value) {
  const date = apiProgDataPlanilha_(value);
  return date ? date.getTime() : 0;
}

function respostaJsonApi_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
