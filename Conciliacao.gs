/**
 * ============================================================
 * CONCILIAÇÃO DE OP
 * ============================================================
 */

function sincronizarConciliacao_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Conciliação OP');

  if (!sheet) return;

  const entradas = lerHistoricoCompleto_('RECEBIMENTO');
  const saidas = lerHistoricoCompleto_('SAIDA');

  const saidasPorOp = {};

  saidas.forEach(item => {
    const op = normalizarChaveOp_(item.op);
    if (!op) return;

    if (!saidasPorOp[op]) {
      saidasPorOp[op] = [];
    }

    saidasPorOp[op].push(item);
  });

  Object.keys(saidasPorOp).forEach(op => {
    saidasPorOp[op].sort((a, b) => a.dataTime - b.dataTime);
  });

  const dados = entradas
    .sort((a, b) => a.dataTime - b.dataTime || a.sheetRow - b.sheetRow)
    .map(entrada => {
      const opKey = normalizarChaveOp_(entrada.op);
      const candidatas = saidasPorOp[opKey] || [];

      let saida = null;

      if (candidatas.length) {
        saida =
          candidatas.find(item => item.dataTime >= entrada.dataTime) ||
          candidatas[0];
      }

      return [
        entrada.dataBR,
        entrada.op,
        entrada.nf,
        entrada.nfCaixa,
        saida ? saida.op : '',
        saida ? saida.nf : '',
        saida ? saida.nfCaixa : '',
        saida ? saida.dataBR : ''
      ];
    });

  const lastRow = sheet.getLastRow();

  if (lastRow >= 3) {
    sheet
      .getRange(3, 1, lastRow - 2, 8)
      .clearContent();
  }

  if (dados.length) {
    sheet
      .getRange(3, 1, dados.length, 8)
      .setValues(dados)
      .setBorder(true, true, true, true, true, true);
  }
}


/**
 * Atualiza somente as OPs afetadas.
 * Para lotes muito grandes usa a reconstrução completa, que é mais eficiente.
 */
function sincronizarConciliacaoOps_(ops) {
  const chaves = Array.from(
    new Set(
      (ops || [])
        .map(normalizarChaveOp_)
        .filter(Boolean)
    )
  );

  if (!chaves.length) return;

  if (chaves.length > 25) {
    sincronizarConciliacao_();
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Conciliação OP');

  if (!sheet) return;

  chaves.forEach(opKey => {
    const entradas = lerHistoricoPorOp_('RECEBIMENTO', opKey);
    const saidas = lerHistoricoPorOp_('SAIDA', opKey)
      .sort((a, b) => a.dataTime - b.dataTime);

    const novasLinhas = entradas
      .sort((a, b) => a.dataTime - b.dataTime || a.sheetRow - b.sheetRow)
      .map(entrada => {
        const saida =
          saidas.find(item => item.dataTime >= entrada.dataTime) ||
          saidas[0] ||
          null;

        return montarLinhaConciliacao_(entrada, saida);
      });

    const lastRow = sheet.getLastRow();
    let linhasExistentes = [];

    if (lastRow >= 3) {
      linhasExistentes = sheet
        .getRange(3, 2, lastRow - 2, 1)
        .createTextFinder(opKey)
        .matchCase(false)
        .matchEntireCell(true)
        .findAll()
        .map(range => range.getRow())
        .sort((a, b) => a - b);
    }

    const comuns = Math.min(
      linhasExistentes.length,
      novasLinhas.length
    );

    for (let i = 0; i < comuns; i++) {
      sheet
        .getRange(linhasExistentes[i], 1, 1, 8)
        .setValues([novasLinhas[i]])
        .setBorder(true, true, true, true, true, true);
    }

    for (let i = comuns; i < novasLinhas.length; i++) {
      const novaRow = Math.max(sheet.getLastRow() + 1, 3);

      sheet
        .getRange(novaRow, 1, 1, 8)
        .setValues([novasLinhas[i]])
        .setBorder(true, true, true, true, true, true);
    }

    for (let i = comuns; i < linhasExistentes.length; i++) {
      sheet
        .getRange(linhasExistentes[i], 1, 1, 8)
        .clearContent()
        .setBorder(false, false, false, false, false, false);
    }
  });
}


function lerHistoricoPorOp_(pageKey, opKey) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.historySheetName);

  if (!sheet || sheet.getLastRow() < 3) {
    return [];
  }

  const opIndex = acharHeader_(cfg.headers, 'op');
  const nfIndex = acharHeader_(cfg.headers, 'nota fiscal');
  const nfCaixaIndex = acharHeader_(cfg.headers, 'nota fiscal de caixa');

  if (opIndex < 0) return [];

  const matches = sheet
    .getRange(
      3,
      opIndex + 1,
      sheet.getLastRow() - 2,
      1
    )
    .createTextFinder(String(opKey))
    .matchCase(false)
    .matchEntireCell(true)
    .findAll();

  return matches
    .map(match => {
      const rowNumber = match.getRow();
      const row = sheet
        .getRange(rowNumber, 1, 1, cfg.headers.length)
        .getValues()[0];

      const date = converterParaDate_(row[0]);
      if (!date) return null;

      return {
        sheetRow: rowNumber,
        dataTime: date.getTime(),
        dataBR: Utilities.formatDate(
          date,
          Session.getScriptTimeZone(),
          'dd/MM/yyyy'
        ),
        op: normalizarSaida_(row[opIndex]),
        nf: nfIndex >= 0 ? normalizarSaida_(row[nfIndex]) : '',
        nfCaixa: nfCaixaIndex >= 0 ? normalizarSaida_(row[nfCaixaIndex]) : ''
      };
    })
    .filter(Boolean);
}


function montarLinhaConciliacao_(entrada, saida) {
  return [
    entrada.dataBR,
    entrada.op,
    entrada.nf,
    entrada.nfCaixa,
    saida ? saida.op : '',
    saida ? saida.nf : '',
    saida ? saida.nfCaixa : '',
    saida ? saida.dataBR : ''
  ];
}


function lerHistoricoCompleto_(pageKey) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.historySheetName);

  if (!sheet || sheet.getLastRow() < 3) {
    return [];
  }

  const values = sheet
    .getRange(3, 1, sheet.getLastRow() - 2, cfg.headers.length)
    .getValues();

  const opIndex = acharHeader_(cfg.headers, 'op');
  const nfIndex = acharHeader_(cfg.headers, 'nota fiscal');
  const nfCaixaIndex = acharHeader_(cfg.headers, 'nota fiscal de caixa');

  return values
    .map((row, index) => {
      const date = converterParaDate_(row[0]);
      if (!date) return null;

      return {
        sheetRow: index + 3,
        dataTime: date.getTime(),
        dataBR: Utilities.formatDate(
          date,
          Session.getScriptTimeZone(),
          'dd/MM/yyyy'
        ),
        op: opIndex >= 0 ? normalizarSaida_(row[opIndex]) : '',
        nf: nfIndex >= 0 ? normalizarSaida_(row[nfIndex]) : '',
        nfCaixa: nfCaixaIndex >= 0 ? normalizarSaida_(row[nfCaixaIndex]) : ''
      };
    })
    .filter(Boolean);
}
