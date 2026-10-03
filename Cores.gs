/**
 * ============================================================
 * CORES - AUTOCOMPLETE
 * ============================================================
 */

function carregarCores() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('CORES_FIXPAR');

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Cadastro Cores');

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const lista = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .flat()
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(
      b,
      'pt-BR',
      { sensitivity: 'base' }
    ));

  try {
    cache.put(
      'CORES_FIXPAR',
      JSON.stringify(lista),
      300
    );
  } catch (e) {}

  return lista;
}


function registrarCor_(cor) {
  const valor = String(cor ?? '').trim();
  if (!valor) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Cadastro Cores');

  if (!sheet) {
    sheet = ss.insertSheet('Cadastro Cores');
    sheet.getRange(1, 1).setValue('Cor').setFontWeight('bold');

    try {
      sheet.hideSheet();
    } catch (e) {}
  }

  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const match = sheet
      .getRange(2, 1, lastRow - 1, 1)
      .createTextFinder(valor)
      .matchCase(false)
      .matchEntireCell(true)
      .findNext();

    if (match) return;
  }

  sheet
    .getRange(Math.max(sheet.getLastRow() + 1, 2), 1)
    .setValue(valor);

  try {
    CacheService.getScriptCache().remove('CORES_FIXPAR');
  } catch (e) {}
}
