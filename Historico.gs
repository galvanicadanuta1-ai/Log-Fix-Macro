/**
 * ============================================================
 * HISTÓRICOS
 * ============================================================
 */

function consultarHistorico(pageKey, dataInicialIso, dataFinalIso, busca) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.historySheetName);

  if (!sheet) {
    throw new Error('A aba "' + cfg.historySheetName + '" não foi encontrada.');
  }

  const dataInicial = isoParaData_(dataInicialIso);
  const dataFinal = isoParaData_(dataFinalIso);

  if (dataInicial.getTime() > dataFinal.getTime()) {
    throw new Error('A data inicial não pode ser maior que a data final.');
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 3) {
    return {
      rows: [],
      headers: cfg.headers,
      title: cfg.historyTitle,
      total: 0
    };
  }

  const totalCols = cfg.headers.length + 2;

  const values = sheet
    .getRange(3, 1, lastRow - 2, totalCols)
    .getValues();

  const buscaNormalizada = normalizarTextoBusca_(busca);
  const indicesBusca = obterIndicesBusca_(cfg);
  const rows = [];

  const inicioDia = inicioDoDia_(dataInicial);
  const fimDia = fimDoDia_(dataFinal);

  values.forEach((row, index) => {
    const dataValue = row[0];
    if (!dataValue) return;

    const dataLinha = converterParaDate_(dataValue);
    if (!dataLinha) return;

    if (
      dataLinha.getTime() < inicioDia.getTime() ||
      dataLinha.getTime() > fimDia.getTime()
    ) {
      return;
    }

    if (buscaNormalizada) {
      const encontrou = indicesBusca.some(colIndex => {
        const valor = normalizarTextoBusca_(row[colIndex]);
        return valor.includes(buscaNormalizada);
      });

      if (!encontrou) return;
    }

    rows.push({
      historyRow: index + 3,
      sourceRow: Number(row[cfg.headers.length] || 0) || null,
      values: linhaHistoricoParaCliente_(pageKey, row.slice(0, cfg.headers.length))
    });
  });

  rows.sort((a, b) => {
    const da = parseDataBR_(a.values[0]);
    const db = parseDataBR_(b.values[0]);
    return da - db || a.historyRow - b.historyRow;
  });

  return {
    rows,
    headers: cfg.headers,
    title: cfg.historyTitle,
    total: rows.length
  };
}


/**
 * Retorna somente uma página para reduzir DOM, tráfego e memória no celular.
 * O relatório continua usando consultarHistorico() completo.
 */
function consultarHistoricoPaginado(
  pageKey,
  dataInicialIso,
  dataFinalIso,
  busca,
  offset,
  limit
) {
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
  const rows = resultado.rows.slice(inicio, fim);

  return {
    rows: rows,
    headers: resultado.headers,
    title: resultado.title,
    total: resultado.total,
    offset: inicio,
    nextOffset: fim < resultado.total ? fim : null,
    hasMore: fim < resultado.total
  };
}


function buscarSugestoesHistorico(
  pageKey,
  dataInicialIso,
  dataFinalIso,
  termo
) {
  const cfg = getConfig_(pageKey);
  const busca = normalizarTextoBusca_(termo);

  if (!busca) {
    return [];
  }

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.historySheetName);

  if (!sheet || sheet.getLastRow() < 3) {
    return [];
  }

  const dataInicial = isoParaData_(dataInicialIso);
  const dataFinal = isoParaData_(dataFinalIso);

  if (dataInicial.getTime() > dataFinal.getTime()) {
    return [];
  }

  const inicioDia = inicioDoDia_(dataInicial);
  const fimDia = fimDoDia_(dataFinal);

  const opIndex = acharHeader_(cfg.headers, 'OP');
  const nfIndex = acharHeader_(cfg.headers, 'Nota Fiscal');
  const nfCaixaIndex = acharHeader_(cfg.headers, 'Nota Fiscal de Caixa');

  const campos = [
    { index: opIndex, tipo: 'OP' },
    { index: nfIndex, tipo: 'Nota Fiscal' },
    { index: nfCaixaIndex, tipo: 'Nota Fiscal de Caixa' }
  ].filter(item => item.index >= 0);

  const values = sheet
    .getRange(
      3,
      1,
      sheet.getLastRow() - 2,
      cfg.headers.length
    )
    .getDisplayValues();

  const encontrados = [];
  const chaves = {};

  values.forEach(row => {
    const dataLinha = converterParaDate_(row[0]);

    if (!dataLinha) return;

    if (
      dataLinha.getTime() < inicioDia.getTime() ||
      dataLinha.getTime() > fimDia.getTime()
    ) {
      return;
    }

    campos.forEach(campo => {
      const valorOriginal = String(row[campo.index] || '').trim();
      if (!valorOriginal) return;

      const valorNormalizado = normalizarTextoBusca_(valorOriginal);

      if (!valorNormalizado.includes(busca)) {
        return;
      }

      const chave = campo.tipo + '|' + valorNormalizado;

      if (chaves[chave]) return;

      chaves[chave] = true;

      encontrados.push({
        value: valorOriginal,
        type: campo.tipo,
        startsWith: valorNormalizado.startsWith(busca)
      });
    });
  });

  encontrados.sort((a, b) => {
    if (a.startsWith !== b.startsWith) {
      return a.startsWith ? -1 : 1;
    }

    const tipoOrder = {
      'OP': 0,
      'Nota Fiscal': 1,
      'Nota Fiscal de Caixa': 2
    };

    const tipoA = tipoOrder[a.type] ?? 9;
    const tipoB = tipoOrder[b.type] ?? 9;

    if (tipoA !== tipoB) {
      return tipoA - tipoB;
    }

    return String(a.value).localeCompare(
      String(b.value),
      'pt-BR',
      {
        numeric: true,
        sensitivity: 'base'
      }
    );
  });

  return encontrados
    .slice(0, 12)
    .map(item => ({
      value: item.value,
      type: item.type,
      label: item.type + ' • ' + item.value
    }));
}


function editarHistorico(pageKey, historyRow, novosValores) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(60000);

  try {
    const cfg = getConfig_(pageKey);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hist = ss.getSheetByName(cfg.historySheetName);
    const log = ss.getSheetByName(cfg.logSheetName);
    const operacional = ss.getSheetByName(cfg.sheetName);

    if (!hist || !log || !operacional) {
      throw new Error('Não foi possível localizar todas as abas necessárias.');
    }

    const row = Number(historyRow || 0);

    if (row < 3) {
      throw new Error('Linha de histórico inválida.');
    }

    const antigo = hist
      .getRange(row, 1, 1, cfg.headers.length)
      .getValues()[0];

    const sourceRow = Number(
      hist.getRange(row, cfg.headers.length + 1).getValue() || 0
    ) || null;

    const dataIso = valorDataParaIso_(novosValores && novosValores[0]);

    if (!dataIso) {
      throw new Error('Informe uma data válida no formato DD/MM/AAAA.');
    }

    const novo = normalizarLinhaParaPlanilha_(
      pageKey,
      dataIso,
      novosValores
    );

    if (pageKey === 'RECEBIMENTO') {
      const corIndex = cfg.headers.indexOf('Cor');
      if (corIndex >= 0) {
        registrarCor_(novo[corIndex]);
      }
    }

    const opIndex = cfg.headers.findIndex(h => normalizarTextoBusca_(h) === 'op');
    const op = opIndex >= 0 ? novo[opIndex] : '';

    const usuario =
      Session.getActiveUser().getEmail() ||
      Session.getEffectiveUser().getEmail() ||
      '';

    const logs = [];

    for (let i = 0; i < cfg.headers.length; i++) {
      if (!valoresIguais_(antigo[i], novo[i])) {
        logs.push([
          new Date(),
          usuario,
          row,
          op,
          cfg.headers[i],
          valorParaLog_(antigo[i]),
          valorParaLog_(novo[i])
        ]);
      }
    }

    hist
      .getRange(row, 1, 1, cfg.headers.length)
      .setValues([novo]);

    hist
      .getRange(row, cfg.headers.length + 2)
      .setValue(new Date());

    hist.getRange(row, 1).setNumberFormat('dd/MM/yyyy');

    if (sourceRow && sourceRow >= 3) {
      operacional
        .getRange(sourceRow, 1, 1, cfg.headers.length)
        .setValues([novo]);

      operacional.getRange(sourceRow, 1).setNumberFormat('dd/MM/yyyy');
    }

    if (logs.length) {
      log
        .getRange(log.getLastRow() + 1, 1, logs.length, logs[0].length)
        .setValues(logs);

      log
        .getRange(log.getLastRow() - logs.length + 1, 1, logs.length, 1)
        .setNumberFormat('dd/MM/yyyy HH:mm:ss');
    }

    SpreadsheetApp.flush();

    const opAnterior =
      opIndex >= 0 ? antigo[opIndex] : '';

    sincronizarConciliacaoOps_([
      opAnterior,
      op
    ]);

    return {
      ok: true,
      historyRow: row,
      values: linhaHistoricoParaCliente_(pageKey, novo),
      alteracoes: logs.length
    };

  } finally {
    lock.releaseLock();
  }
}


function sincronizarTodosHistoricos_() {
  Object.keys(CONFIG).forEach(pageKey => {
    const cfg = getConfig_(pageKey);
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(cfg.sheetName);

    if (!sheet || sheet.getLastRow() < 3) return;

    const values = sheet
      .getRange(
        3,
        1,
        sheet.getLastRow() - 2,
        cfg.headers.length
      )
      .getValues();

    values.forEach((row, index) => {
      const temDados = row
        .slice(1)
        .some(value => String(value ?? '').trim() !== '');

      if (!temDados) return;

      const normalized = normalizarLinhaExistente_(pageKey, row);

      upsertHistorico_(
        pageKey,
        index + 3,
        normalized
      );

      if (pageKey === 'RECEBIMENTO') {
        const corIndex = cfg.headers.indexOf('Cor');

        if (corIndex >= 0) {
          registrarCor_(normalized[corIndex]);
        }
      }
    });
  });

  SpreadsheetApp.flush();
}


function removerHistoricoPorSourceRow_(pageKey, sourceRow) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.historySheetName);

  if (!sheet || sheet.getLastRow() < 3) return;

  const sourceCol = cfg.headers.length + 1;
  const range = sheet.getRange(
    3,
    sourceCol,
    sheet.getLastRow() - 2,
    1
  );

  const encontrados = range
    .createTextFinder(String(sourceRow))
    .matchEntireCell(true)
    .findAll();

  encontrados
    .map(r => r.getRow())
    .sort((a, b) => b - a)
    .forEach(row => sheet.deleteRow(row));
}


function upsertHistorico_(pageKey, sourceRow, values) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.historySheetName);

  if (!sheet) {
    throw new Error('A aba "' + cfg.historySheetName + '" não foi encontrada.');
  }

  const sourceCol = cfg.headers.length + 1;
  const updatedCol = cfg.headers.length + 2;

  let targetRow = 0;
  const lastRow = sheet.getLastRow();

  if (lastRow >= 3) {
    const match = sheet
      .getRange(3, sourceCol, lastRow - 2, 1)
      .createTextFinder(String(sourceRow))
      .matchEntireCell(true)
      .findNext();

    if (match) {
      targetRow = match.getRow();
    }
  }

  if (!targetRow) {
    targetRow = Math.max(sheet.getLastRow() + 1, 3);
  }

  sheet
    .getRange(targetRow, 1, 1, cfg.headers.length)
    .setValues([values]);

  sheet
    .getRange(targetRow, sourceCol)
    .setValue(sourceRow);

  sheet
    .getRange(targetRow, updatedCol)
    .setValue(new Date());

  sheet.getRange(targetRow, 1).setNumberFormat('dd/MM/yyyy');
}


function migrarGeradosParaHistorico_(pageKey) {
  const cfg = getConfig_(pageKey);
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(cfg.sheetName);

  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  const statusCol = cfg.headers.length + 1;

  const values = sheet
    .getRange(3, 1, lastRow - 2, statusCol)
    .getValues();

  values.forEach((row, index) => {
    const status = String(row[statusCol - 1] || '').trim().toUpperCase();

    if (status !== STATUS_GERADO) return;
    if (!row[0]) return;

    upsertHistorico_(
      pageKey,
      index + 3,
      normalizarLinhaExistente_(pageKey, row.slice(0, cfg.headers.length))
    );
  });
}
