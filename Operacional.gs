/**
 * ============================================================
 * OPERAÇÃO - RECEBIMENTO / SAÍDA
 * ============================================================
 */

function carregarDados(pageKey, isoDate) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.sheetName);

  if (!sheet) {
    throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
  }

  const targetDate = isoParaData_(isoDate);
  const lastRow = sheet.getLastRow();

  if (lastRow < 3) {
    return {
      rows: [],
      headers: cfg.headers,
      title: cfg.title
    };
  }

  const totalCols = cfg.headers.length + 1;
  const statusIndex = cfg.headers.length;

  const values = sheet
    .getRange(3, 1, lastRow - 2, totalCols)
    .getValues();

  const rows = [];

  values.forEach((row, index) => {
    const dateValue = row[0];
    const status = String(row[statusIndex] || '').trim().toUpperCase();

    if (!dateValue) return;
    if (status === STATUS_GERADO) return;

    if (mesmaData_(dateValue, targetDate)) {
      rows.push({
        sheetRow: index + 3,
        values: linhaParaCliente_(pageKey, row.slice(0, cfg.headers.length), isoDate)
      });
    }
  });

  return {
    rows,
    headers: cfg.headers,
    title: cfg.title
  };
}


function salvarLinha(pageKey, isoDate, values, sheetRow) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const cfg = getConfig_(pageKey);
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(cfg.sheetName);

    if (!sheet) {
      throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
    }

    const normalized = normalizarLinhaParaPlanilha_(pageKey, isoDate, values);
    const opIndex = acharHeader_(cfg.headers, 'OP');

    let targetRow = Number(sheetRow || 0);
    let opAnterior = '';

    if (targetRow >= 3 && opIndex >= 0) {
      opAnterior = sheet
        .getRange(targetRow, opIndex + 1)
        .getDisplayValue();
    }

    if (targetRow >= 3) {
      sheet
        .getRange(targetRow, 1, 1, cfg.headers.length)
        .setValues([normalized]);
    } else {
      targetRow = Math.max(sheet.getLastRow() + 1, 3);

      sheet
        .getRange(targetRow, 1, 1, cfg.headers.length)
        .setValues([normalized]);

      sheet
        .getRange(targetRow, cfg.headers.length + 1)
        .clearContent();
    }

    sheet.getRange(targetRow, 1).setNumberFormat('dd/MM/yyyy');

    if (pageKey === 'RECEBIMENTO') {
      const corIndex = cfg.headers.indexOf('Cor');
      if (corIndex >= 0) {
        registrarCor_(normalized[corIndex]);
      }
    }

    upsertHistorico_(pageKey, targetRow, normalized);
    SpreadsheetApp.flush();

    sincronizarConciliacaoOps_([
      opAnterior,
      opIndex >= 0 ? normalized[opIndex] : ''
    ]);

    return {
      ok: true,
      sheetRow: targetRow,
      values: linhaParaCliente_(pageKey, normalized, isoDate)
    };

  } finally {
    lock.releaseLock();
  }
}


function salvarLinhasEmLote(pageKey, isoDate, registros) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(60000);

  try {
    const cfg = getConfig_(pageKey);
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(cfg.sheetName);

    if (!sheet) {
      throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
    }

    const itens = Array.isArray(registros) ? registros : [];
    const resultados = [];
    const opsAfetadas = [];
    const opIndex = acharHeader_(cfg.headers, 'OP');

    itens.forEach(item => {
      const values = item && Array.isArray(item.values)
        ? item.values
        : [];

      const temDados = values
        .slice(1)
        .some(v => String(v ?? '').trim() !== '');

      if (!temDados) return;

      const normalized = normalizarLinhaParaPlanilha_(
        pageKey,
        isoDate,
        values
      );

      let targetRow = Number(item.sheetRow || 0);

      if (targetRow >= 3 && opIndex >= 0) {
        opsAfetadas.push(
          sheet.getRange(targetRow, opIndex + 1).getDisplayValue()
        );
      }

      if (targetRow >= 3) {
        sheet
          .getRange(targetRow, 1, 1, cfg.headers.length)
          .setValues([normalized]);
      } else {
        targetRow = Math.max(sheet.getLastRow() + 1, 3);

        sheet
          .getRange(targetRow, 1, 1, cfg.headers.length)
          .setValues([normalized]);

        sheet
          .getRange(targetRow, cfg.headers.length + 1)
          .clearContent();
      }

      sheet.getRange(targetRow, 1).setNumberFormat('dd/MM/yyyy');

      if (pageKey === 'RECEBIMENTO') {
        const corIndex = cfg.headers.indexOf('Cor');
        if (corIndex >= 0) {
          registrarCor_(normalized[corIndex]);
        }
      }

      upsertHistorico_(pageKey, targetRow, normalized);

      if (opIndex >= 0) {
        opsAfetadas.push(normalized[opIndex]);
      }

      resultados.push({
        clientId: item.clientId || '',
        sheetRow: targetRow,
        values: linhaParaCliente_(pageKey, normalized, isoDate)
      });
    });

    SpreadsheetApp.flush();
    sincronizarConciliacaoOps_(opsAfetadas);

    return {
      ok: true,
      rows: resultados
    };

  } finally {
    lock.releaseLock();
  }
}


function limparLinha(pageKey, sheetRow) {
  const cfg = getConfig_(pageKey);
  const row = Number(sheetRow || 0);

  if (row < 3) {
    return { ok: true };
  }

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.sheetName);

  if (!sheet) {
    throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
  }

  const opIndex = acharHeader_(cfg.headers, 'OP');
  const opAnterior = opIndex >= 0
    ? sheet.getRange(row, opIndex + 1).getDisplayValue()
    : '';

  sheet
    .getRange(row, 1, 1, cfg.headers.length + 1)
    .clearContent();

  removerHistoricoPorSourceRow_(pageKey, row);
  SpreadsheetApp.flush();
  sincronizarConciliacaoOps_([opAnterior]);

  return { ok: true };
}
