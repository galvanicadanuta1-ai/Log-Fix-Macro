/**
 * ============================================================
 * DANUTA SGQ - SINCRONIZAÇÃO GOOGLE SHEETS -> CLOUDFLARE D1
 * ============================================================
 * Fase 1:
 * - NÃO substitui o backend atual;
 * - edição manual na planilha envia a linha ao D1;
 * - edição manual é enviada imediatamente via gatilho onEdit;
 * - reconciliação periódica cobre alterações feitas por scripts;
 * - carga inicial pode ser executada manualmente.
 *
 * Script Properties necessárias:
 * D1_SYNC_URL   = https://SEU-WORKER.workers.dev
 * D1_SYNC_TOKEN = mesmo segredo configurado no Worker
 * ============================================================
 */

const D1_SYNC_CLIENT_KEY = 'FIXPAR';
const D1_SYNC_URL_PROP = 'D1_SYNC_URL';
const D1_SYNC_TOKEN_PROP = 'D1_SYNC_TOKEN';

function d1SyncInstalarTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const handlers = new Set(
    ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction())
  );

  if (!handlers.has('d1SyncOnEdit')) {
    ScriptApp.newTrigger('d1SyncOnEdit')
      .forSpreadsheet(ss)
      .onEdit()
      .create();
  }

  if (!handlers.has('d1SyncOnChange')) {
    ScriptApp.newTrigger('d1SyncOnChange')
      .forSpreadsheet(ss)
      .onChange()
      .create();
  }

  if (!handlers.has('d1SyncReconciliarFixpar')) {
    ScriptApp.newTrigger('d1SyncReconciliarFixpar')
      .timeBased()
      .everyMinutes(15)
      .create();
  }

  return { ok: true };
}

function d1SyncOnEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const name = sheet.getName();
  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();

  if (name === 'Recebimento Fixpar') {
    d1SyncEnviarOperacional_(sheet, 'RECEBIMENTO', startRow, numRows);
    d1SyncReconciliarDataset_(sheet, 'RECEBIMENTO');
    return;
  }

  if (name === 'Entregas Fixpar') {
    d1SyncEnviarOperacional_(sheet, 'SAIDA', startRow, numRows);
    d1SyncReconciliarDataset_(sheet, 'SAIDA');
    return;
  }

  if (name === 'Programação SGQ Fixpar') {
    d1SyncEnviarProgramacao_(sheet, startRow, numRows);
  }
}

function d1SyncOnChange(e) {
  if (!e) return;

  const tiposEstruturais = new Set([
    'REMOVE_ROW',
    'INSERT_ROW',
    'REMOVE_COLUMN',
    'INSERT_COLUMN',
    'OTHER'
  ]);

  if (!tiposEstruturais.has(String(e.changeType || ''))) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entrada = ss.getSheetByName('Recebimento Fixpar');
  const saida = ss.getSheetByName('Entregas Fixpar');

  if (entrada) d1SyncReconciliarDataset_(entrada, 'RECEBIMENTO');
  if (saida) d1SyncReconciliarDataset_(saida, 'SAIDA');
}

function d1SyncReconciliarFixpar() {
  d1SyncBootstrapFixpar();
}

function d1SyncReconciliarExclusoesFixpar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entrada = ss.getSheetByName('Recebimento Fixpar');
  const saida = ss.getSheetByName('Entregas Fixpar');

  if (entrada) d1SyncReconciliarDataset_(entrada, 'RECEBIMENTO');
  if (saida) d1SyncReconciliarDataset_(saida, 'SAIDA');

  return { ok: true };
}

function d1SyncBootstrapFixpar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const entrada = ss.getSheetByName('Recebimento Fixpar');
  if (entrada && entrada.getLastRow() >= 3) {
    d1SyncEnviarOperacional_(entrada, 'RECEBIMENTO', 3, entrada.getLastRow() - 2);
  }
  if (entrada) d1SyncReconciliarDataset_(entrada, 'RECEBIMENTO');

  const saida = ss.getSheetByName('Entregas Fixpar');
  if (saida && saida.getLastRow() >= 3) {
    d1SyncEnviarOperacional_(saida, 'SAIDA', 3, saida.getLastRow() - 2);
  }
  if (saida) d1SyncReconciliarDataset_(saida, 'SAIDA');

  const prog = ss.getSheetByName('Programação SGQ Fixpar');
  if (prog && prog.getLastRow() >= 2) {
    d1SyncEnviarProgramacao_(prog, 2, prog.getLastRow() - 1);
  }

  return { ok: true };
}

function d1SyncEnviarOperacional_(sheet, dataset, startRow, numRows) {
  const cfg = getConfig_(dataset);
  const firstDataRow = 3;
  const from = Math.max(Number(startRow || firstDataRow), firstDataRow);
  const to = Math.min(
    from + Math.max(Number(numRows || 1), 1) - 1,
    sheet.getLastRow()
  );
  if (to < from) return;

  const statusCol = cfg.headers.length + 1;
  const uidCol = cfg.headers.length + 2;
  const width = Math.max(cfg.headers.length, uidCol);
  const qtd = to - from + 1;
  const raw = sheet.getRange(from, 1, qtd, width).getValues();
  const display = sheet.getRange(from, 1, qtd, width).getDisplayValues();

  const rows = [];

  for (let i = 0; i < qtd; i++) {
    const sheetRow = from + i;
    const r = raw[i] || [];
    const d = display[i] || [];

    let uid = String(d[uidCol - 1] || '').trim();
    const temDados = d.slice(0, cfg.headers.length)
      .some(v => String(v || '').trim() !== '');

    if (!temDados && !uid) continue;

    if (!uid) {
      uid = Utilities.getUuid();
      sheet.getRange(sheetRow, uidCol).setValue(uid);
    }

    const record = dataset === 'RECEBIMENTO'
      ? d1SyncMapRecebimento_(sheetRow, uid, r, d)
      : d1SyncMapSaida_(sheetRow, uid, r, d);

    record.generated =
      String(d[statusCol - 1] || '').trim().toUpperCase() === 'GERADO';

    rows.push(record);
  }

  d1SyncEnviarEmLotes_(dataset, rows, 150);
}

function d1SyncMapRecebimento_(sheetRow, uid, raw, display) {
  return {
    recordId: uid,
    sheetRow: sheetRow,
    businessDate: d1SyncDataIso_(raw[0], display[0]),
    op: d1SyncTexto_(display[1]),
    qtdCaixas: d1SyncNumero_(raw[2], display[2]),
    qtdConteiner: d1SyncNumero_(raw[3], display[3]),
    pesoNf: d1SyncNumero_(raw[4], display[4]),
    peso: d1SyncNumero_(raw[5], display[5]),
    diferenca: d1SyncNumero_(raw[6], display[6]),
    diferencaPct: d1SyncNumero_(raw[7], display[7]),
    cor: d1SyncTexto_(display[8]),
    notaFiscal: d1SyncTexto_(display[9]),
    notaFiscalCaixa: d1SyncTexto_(display[10]),
    processo: d1SyncTexto_(display[11]),
    updatedAt: new Date().toISOString(),
    deleted: !display.slice(0, 12).some(v => d1SyncTexto_(v) !== '')
  };
}

function d1SyncMapSaida_(sheetRow, uid, raw, display) {
  return {
    recordId: uid,
    sheetRow: sheetRow,
    businessDate: d1SyncDataIso_(raw[0], display[0]),
    op: d1SyncTexto_(display[1]),
    qtdCaixas: d1SyncNumero_(raw[2], display[2]),
    qtdConteiner: d1SyncNumero_(raw[3], display[3]),
    peso: d1SyncNumero_(raw[4], display[4]),
    notaFiscal: d1SyncTexto_(display[5]),
    notaFiscalCaixa: d1SyncTexto_(display[6]),
    anotacao: d1SyncTexto_(display[7]),
    updatedAt: new Date().toISOString(),
    deleted: !display.slice(0, 8).some(v => d1SyncTexto_(v) !== '')
  };
}

function d1SyncReconciliarDataset_(sheet, dataset) {
  const cfg = getConfig_(dataset);
  const firstDataRow = 3;
  const lastRow = sheet.getLastRow();
  const uidCol = cfg.headers.length + 2;

  if (lastRow < firstDataRow) {
    d1SyncPost_('/sync/sheets/reconcile', {
      clientKey: D1_SYNC_CLIENT_KEY,
      dataset: dataset,
      activeRecordIds: []
    });
    return;
  }

  const width = uidCol;
  const qtd = lastRow - firstDataRow + 1;
  const display = sheet
    .getRange(firstDataRow, 1, qtd, width)
    .getDisplayValues();

  const activeRecordIds = [];

  for (let i = 0; i < display.length; i++) {
    const row = display[i] || [];
    const temDados = row
      .slice(0, cfg.headers.length)
      .some(v => d1SyncTexto_(v) !== '');

    if (!temDados) continue;

    let uid = d1SyncTexto_(row[uidCol - 1]);
    if (!uid) {
      uid = Utilities.getUuid();
      sheet.getRange(firstDataRow + i, uidCol).setValue(uid);
    }

    activeRecordIds.push(uid);
  }

  d1SyncPost_('/sync/sheets/reconcile', {
    clientKey: D1_SYNC_CLIENT_KEY,
    dataset: dataset,
    activeRecordIds: activeRecordIds
  });
}

function d1SyncEnviarProgramacao_(sheet, startRow, numRows) {
  const firstDataRow = 2;
  const from = Math.max(Number(startRow || firstDataRow), firstDataRow);
  const to = Math.min(
    from + Math.max(Number(numRows || 1), 1) - 1,
    sheet.getLastRow()
  );
  if (to < from) return;

  const qtd = to - from + 1;
  const values = sheet.getRange(from, 1, qtd, 5).getValues();
  const display = sheet.getRange(from, 1, qtd, 5).getDisplayValues();

  const rows = [];
  for (let i = 0; i < qtd; i++) {
    const op = d1SyncTexto_(display[i][0]);
    if (!op) continue;

    rows.push({
      op: op,
      status: d1SyncTexto_(display[i][1]),
      ok: values[i][2] === true,
      encaminhado: values[i][3] === true,
      updatedAt: d1SyncDataHoraIso_(values[i][4]) || new Date().toISOString()
    });
  }

  d1SyncEnviarEmLotes_('PROGRAMACAO', rows, 150);
}

function d1SyncEnviarEmLotes_(dataset, rows, size) {
  const lista = Array.isArray(rows) ? rows : [];
  if (!lista.length) return;

  const lote = Math.max(Number(size || 150), 1);
  for (let i = 0; i < lista.length; i += lote) {
    d1SyncPost_('/sync/sheets/batch', {
      clientKey: D1_SYNC_CLIENT_KEY,
      dataset: dataset,
      rows: lista.slice(i, i + lote)
    });
  }
}

function d1SyncPost_(path, body) {
  const props = PropertiesService.getScriptProperties();
  const baseUrl = String(props.getProperty(D1_SYNC_URL_PROP) || '')
    .trim()
    .replace(/\/+$/, '');
  const token = String(props.getProperty(D1_SYNC_TOKEN_PROP) || '').trim();

  if (!baseUrl || !token) {
    throw new Error(
      'Configure D1_SYNC_URL e D1_SYNC_TOKEN nas Propriedades do script.'
    );
  }

  const response = UrlFetchApp.fetch(baseUrl + path, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token
    },
    muteHttpExceptions: true,
    payload: JSON.stringify(body)
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('Falha D1 HTTP ' + code + ': ' + text.slice(0, 500));
  }

  const payload = JSON.parse(text || '{}');
  if (!payload || payload.ok !== true) {
    throw new Error(payload && payload.error
      ? payload.error
      : 'Resposta inválida do Worker D1.');
  }

  return payload;
}

function d1SyncTexto_(v) {
  return String(v == null ? '' : v).trim();
}

function d1SyncNumero_(raw, display) {
  if (typeof raw === 'number' && isFinite(raw)) return raw;
  let s = d1SyncTexto_(display);
  if (!s) return null;
  s = s.replace(/\s/g, '');
  if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.indexOf(',') >= 0) {
    s = s.replace(',', '.');
  }
  const n = Number(s.replace('%', ''));
  return isFinite(n) ? n : null;
}

function d1SyncDataIso_(raw, display) {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return Utilities.formatDate(raw, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const s = d1SyncTexto_(display);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' +
      String(m[1]).padStart(2, '0');
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' +
      String(m[3]).padStart(2, '0');
  }

  return '';
}

function d1SyncDataHoraIso_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return '';
}
