/**
 * ============================================================
 * INSTALAÇÃO / MIGRAÇÃO
 * ============================================================
 * Execute prepararPlanilhas() apenas quando instalar ou alterar
 * a estrutura das abas. Não é executado a cada abertura.
 */

function prepararPlanilhas() {
  prepararPlanilhas_();

  // Importante para bases de teste ou dados já existentes:
  // espelha imediatamente TUDO que já existe nas abas operacionais.
  sincronizarTodosHistoricos_();
  sincronizarConciliacao_();

  return 'Planilhas, históricos, logs e conciliação preparados e sincronizados com sucesso.';
}


function prepararPlanilhas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(CONFIG).forEach(key => {
    prepararAbaOperacional_(ss, key);
    prepararAbaHistorico_(ss, key);
    prepararAbaLog_(ss, key);
  });

  prepararAbaCores_(ss);
  prepararAbaConciliacao_(ss);

  // Migra registros antigos que já estavam marcados como GERADO.
  Object.keys(CONFIG).forEach(key => migrarGeradosParaHistorico_(key));

  sincronizarConciliacao_();
}


function prepararAbaOperacional_(ss, pageKey) {
  const cfg = getConfig_(pageKey);
  let sheet = ss.getSheetByName(cfg.sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(cfg.sheetName);
  }

  let lastColumn = Math.max(sheet.getLastColumn(), 1);
  let existingHeaders = sheet
    .getRange(2, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(value => String(value || '').trim());

  if (
    existingHeaders.length &&
    existingHeaders[0].toUpperCase() === 'OP'
  ) {
    sheet.insertColumnBefore(1);
  }

  // Migração segura quando novos campos são adicionados.
  // O STATUS interno nunca pode virar uma coluna de dados.
  lastColumn = Math.max(sheet.getLastColumn(), 1);
  existingHeaders = sheet
    .getRange(2, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(value => String(value || '').trim());

  const statusIndexAtual = existingHeaders.indexOf(STATUS_HEADER);

  if (
    statusIndexAtual >= 0 &&
    statusIndexAtual + 1 <= cfg.headers.length
  ) {
    const colStatusAtual = statusIndexAtual + 1;
    const colStatusDesejada = cfg.headers.length + 1;
    const qtdNovasColunas = colStatusDesejada - colStatusAtual;

    for (let i = 0; i < qtdNovasColunas; i++) {
      sheet.insertColumnBefore(colStatusAtual);
    }
  }

  sheet
    .getRange(2, 1, 1, cfg.headers.length)
    .setValues([cfg.headers])
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  const statusCol = cfg.headers.length + 1;
  sheet.getRange(2, statusCol).setValue(STATUS_HEADER);

  try {
    sheet.hideColumns(statusCol);
  } catch (e) {}

  const quantidadeLinhas = Math.max(sheet.getMaxRows() - 2, 1);

  sheet
    .getRange(3, 1, quantidadeLinhas, 1)
    .setNumberFormat('dd/MM/yyyy');

  sheet.setFrozenRows(2);
}


function prepararAbaHistorico_(ss, pageKey) {
  const cfg = getConfig_(pageKey);
  let sheet = ss.getSheetByName(cfg.historySheetName);

  if (!sheet) {
    sheet = ss.insertSheet(cfg.historySheetName);
  }

  // Migração segura: preserva as colunas internas do histórico
  // quando um novo campo visível é adicionado.
  let lastColumn = Math.max(sheet.getLastColumn(), 1);
  let existingHeaders = sheet
    .getRange(2, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(value => String(value || '').trim());

  const sourceIndexAtual = existingHeaders.indexOf(HIST_SOURCE_HEADER);

  if (
    sourceIndexAtual >= 0 &&
    sourceIndexAtual + 1 <= cfg.headers.length
  ) {
    const colSourceAtual = sourceIndexAtual + 1;
    const colSourceDesejada = cfg.headers.length + 1;
    const qtdNovasColunas = colSourceDesejada - colSourceAtual;

    for (let i = 0; i < qtdNovasColunas; i++) {
      sheet.insertColumnBefore(colSourceAtual);
    }
  }

  const totalCols = cfg.headers.length + 2;

  try {
    sheet.getRange(1, 1, 1, totalCols).breakApart();
  } catch (e) {}

  sheet.getRange(1, 1, 1, totalCols).merge();
  sheet
    .getRange(1, 1)
    .setValue(cfg.historyTitle)
    .setFontWeight('bold')
    .setFontSize(14)
    .setHorizontalAlignment('center');

  const headers = cfg.headers.concat([
    HIST_SOURCE_HEADER,
    HIST_UPDATED_HEADER
  ]);

  sheet
    .getRange(2, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  const sourceCol = cfg.headers.length + 1;

  try {
    sheet.hideColumns(sourceCol, 2);
  } catch (e) {}

  const quantidadeLinhas = Math.max(sheet.getMaxRows() - 2, 1);

  sheet
    .getRange(3, 1, quantidadeLinhas, 1)
    .setNumberFormat('dd/MM/yyyy');

  sheet.setFrozenRows(2);
}


function prepararAbaLog_(ss, pageKey) {
  const cfg = getConfig_(pageKey);
  let sheet = ss.getSheetByName(cfg.logSheetName);

  if (!sheet) {
    sheet = ss.insertSheet(cfg.logSheetName);
  }

  const headers = [
    'Data/Hora da Alteração',
    'Usuário',
    'Linha do Histórico',
    'OP',
    'Campo',
    'Como estava',
    'Como ficou'
  ];

  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#E4E9ED')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 160);
  sheet.setColumnWidth(6, 220);
  sheet.setColumnWidth(7, 220);
}


function prepararAbaCores_(ss) {
  const nomeAba = 'Cadastro Cores';
  let sheet = ss.getSheetByName(nomeAba);

  if (!sheet) {
    sheet = ss.insertSheet(nomeAba);
  }

  sheet
    .getRange(1, 1)
    .setValue('Cor')
    .setFontWeight('bold');

  // Aproveita cores já existentes no Recebimento.
  const cfg = CONFIG.RECEBIMENTO;
  const recebimento = ss.getSheetByName(cfg.sheetName);
  const corIndex = cfg.headers.indexOf('Cor');

  if (recebimento && corIndex >= 0 && recebimento.getLastRow() >= 3) {
    const valores = recebimento
      .getRange(3, corIndex + 1, recebimento.getLastRow() - 2, 1)
      .getDisplayValues()
      .flat()
      .map(v => String(v || '').trim())
      .filter(Boolean);

    valores.forEach(cor => registrarCor_(cor));
  }

  try {
    sheet.hideSheet();
  } catch (e) {}
}


function prepararAbaConciliacao_(ss) {
  let sheet = ss.getSheetByName('Conciliação OP');

  if (!sheet) {
    sheet = ss.insertSheet('Conciliação OP');
  }

  try {
    sheet.getRange('A1:D1').breakApart();
    sheet.getRange('E1:H1').breakApart();
  } catch (e) {}

  sheet.getRange('A1:D1').merge();
  sheet.getRange('E1:H1').merge();

  sheet
    .getRange('A1')
    .setValue('Recebimento SGQ - Fixpar')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#DDE5EC');

  sheet
    .getRange('E1')
    .setValue('Saída SGQ - Fixpar')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#E7EEF4');

  const headers = [
    'Data (Entrada)',
    'OP',
    'Nota Fiscal',
    'Nota Fiscal de Caixa',
    'OP',
    'Nota Fiscal',
    'Nota Fiscal de Caixa',
    'Data (Saída)'
  ];

  sheet
    .getRange(2, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#F2F5F7');

  sheet.setFrozenRows(2);

  [95, 100, 120, 150, 100, 120, 150, 95].forEach((width, i) => {
    sheet.setColumnWidth(i + 1, width);
  });
}
