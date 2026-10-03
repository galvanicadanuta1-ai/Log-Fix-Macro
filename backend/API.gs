/**
 * ============================================================
 * API PARA GITHUB PAGES -> GOOGLE APPS SCRIPT
 * ============================================================
 *
 * Adicione este arquivo ao MESMO projeto Apps Script onde já
 * está o Code.gs atual do SGQ Fixpar.
 *
 * NÃO apague o Code.gs atual.
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
  const tamanho = Math.min(
    Math.max(Number(limit || 50), 1),
    100
  );
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
 * PROGRAMAÇÃO SGQ - FIXPAR
 * ============================================================
 *
 * Fonte das pendências:
 *   Conciliação OP -> OP de Entrada preenchida e OP de Saída vazia.
 *
 * Detalhes exibidos:
 *   Histórico Entrada -> Data de Entrada, caixas, contêiner, cor e Peso Danuta.
 *
 * Ordem:
 *   sempre da Data de Entrada mais antiga para a mais nova.
 *
 * Estado manual:
 *   aba "Programação SGQ Fixpar" -> Status / OK / Encaminhado.
 * ============================================================
 */

function carregarProgramacaoSgq() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conciliacao = ss.getSheetByName('Conciliação OP');
  const historico = ss.getSheetByName('Histórico Entrada');

  if (!conciliacao) {
    throw new Error('A aba "Conciliação OP" não foi encontrada.');
  }

  if (!historico) {
    throw new Error('A aba "Histórico Entrada" não foi encontrada.');
  }

  const opsPendentes = new Set();

  if (conciliacao.getLastRow() >= 3) {
    const dadosConciliacao = conciliacao
      .getRange(3, 2, conciliacao.getLastRow() - 2, 4)
      .getDisplayValues();

    dadosConciliacao.forEach(row => {
      const opEntrada = apiProgTexto_(row[0]);
      const opSaida = apiProgTexto_(row[3]);

      if (opEntrada && !opSaida) {
        opsPendentes.add(apiProgChaveOp_(opEntrada));
      }
    });
  }

  if (!opsPendentes.size) {
    return { rows: [] };
  }

  const lastRow = historico.getLastRow();
  if (lastRow < 3) {
    return { rows: [] };
  }

  const largura = Math.min(Math.max(historico.getLastColumn(), 12), 14);
  const raw = historico.getRange(3, 1, lastRow - 2, largura).getValues();
  const display = historico.getRange(3, 1, lastRow - 2, largura).getDisplayValues();

  const agrupado = {};

  raw.forEach((row, index) => {
    const shown = display[index] || [];
    const op = apiProgTexto_(shown[1]);
    const chave = apiProgChaveOp_(op);

    if (!chave || !opsPendentes.has(chave)) return;

    const dataTime = apiProgDataTime_(row[0]);
    const dataTexto = apiProgTexto_(shown[0]);

    if (!agrupado[chave]) {
      agrupado[chave] = {
        op: op,
        qtdCaixas: 0,
        qtdConteiner: 0,
        pesoDanuta: 0,
        cores: {},
        primeiraData: dataTime,
        primeiraDataTexto: dataTexto
      };
    }

    const item = agrupado[chave];

    item.qtdCaixas += apiProgNumero_(row[2]);
    item.qtdConteiner += apiProgNumero_(row[3]);
    item.pesoDanuta += apiProgNumero_(row[5]);

    const cor = apiProgTexto_(shown[8]);
    if (cor) item.cores[cor.toLowerCase()] = cor;

    if (dataTime && (!item.primeiraData || dataTime < item.primeiraData)) {
      item.primeiraData = dataTime;
      item.primeiraDataTexto = dataTexto;
    }
  });

  const estados = apiProgLerEstados_();

  const rows = Object.keys(agrupado)
    .map(chave => {
      const item = agrupado[chave];
      const estado = estados[chave] || {};

      return {
        dataEntrada: item.primeiraDataTexto || '',
        op: item.op,
        qtdCaixas: apiProgFormatarNumero_(item.qtdCaixas),
        qtdConteiner: apiProgFormatarNumero_(item.qtdConteiner),
        cor: Object.keys(item.cores)
          .map(key => item.cores[key])
          .join(' / '),
        pesoDanuta: apiProgFormatarNumero_(item.pesoDanuta),
        status: estado.status || '',
        ok: Boolean(estado.ok),
        encaminhado: Boolean(estado.encaminhado),
        primeiraData: item.primeiraData || 0
      };
    })
    .sort((a, b) => {
      const dataA = Number(a.primeiraData || 0) || Number.MAX_SAFE_INTEGER;
      const dataB = Number(b.primeiraData || 0) || Number.MAX_SAFE_INTEGER;

      if (dataA !== dataB) return dataA - dataB;

      return String(a.op).localeCompare(
        String(b.op),
        'pt-BR',
        { numeric: true, sensitivity: 'base' }
      );
    })
    .map(item => {
      delete item.primeiraData;
      return item;
    });

  return { rows: rows };
}

function salvarProgramacaoSgq(op, status, ok, encaminhado) {
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

function apiProgDataTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.getTime();
  }

  const text = apiProgTexto_(value);
  if (!text) return 0;

  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const date = new Date(
      Number(br[3]),
      Number(br[2]) - 1,
      Number(br[1])
    );
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function respostaJsonApi_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
