// deploy-check: d1-read-v2
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return cors(new Response(null, { status: 204 }), request, env);
      }

      if (url.pathname === "/health" && request.method === "GET") {
        const db = await env.DB.prepare("SELECT 1 AS ok").first();
        return json({ ok: true, service: "danuta-sgq-api", d1: db?.ok === 1 });
      }

      if (url.pathname === "/sync/sheets/batch" && request.method === "POST") {
        requireSyncAuth(request, env);
        const body = await readJson(request);
        const result = await syncSheetsBatch(env, body);
        return json(result);
      }

      if (url.pathname === "/api/records" && request.method === "GET") {
        const result = await listRecords(env, url);
        return cors(json(result), request, env);
      }

      if (url.pathname === "/api/programacao" && request.method === "GET") {
        const result = await getProgramacao(env, url);
        return cors(json(result), request, env);
      }

      if (url.pathname === "/api/history" && request.method === "GET") {
        const result = await getHistory(env, url);
        return cors(json(result), request, env);
      }

      if (url.pathname === "/api/suggestions" && request.method === "GET") {
        const result = await getSuggestions(env, url);
        return cors(json(result), request, env);
      }

      return cors(json({ ok: false, error: "Rota não encontrada." }, 404), request, env);
    } catch (error) {
      const status = Number(error?.status || 500);
      return cors(json({
        ok: false,
        error: error?.message || String(error)
      }, status), request, env);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function cors(response, request, env) {
  const origin = request?.headers?.get("Origin") || "";
  const allowed = String(env.APP_ORIGIN || "https://galvanicadanuta1-ai.github.io")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  const headers = new Headers(response.headers);
  if (origin && allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw httpError(400, "JSON inválido.");
  }
}

function requireSyncAuth(request, env) {
  const expected = String(env.SHEETS_SYNC_TOKEN || "");
  if (!expected) throw httpError(503, "SHEETS_SYNC_TOKEN não configurado.");

  const auth = String(request.headers.get("Authorization") || "");
  if (auth !== "Bearer " + expected) throw httpError(401, "Não autorizado.");
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function text(v) {
  return String(v ?? "").trim();
}

function opKey(v) {
  return text(v).toUpperCase().replace(/\s+/g, "");
}

function numberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  let s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s.replace("%", ""));
  return Number.isFinite(n) ? n : null;
}

function bool01(v) {
  return v === true || v === 1 || String(v).toLowerCase() === "true" ? 1 : 0;
}

function isoNow() {
  return new Date().toISOString();
}

async function syncSheetsBatch(env, body) {
  const clientKey = text(body?.clientKey || "FIXPAR").toUpperCase();
  const dataset = text(body?.dataset).toUpperCase();
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (!clientKey) throw httpError(400, "clientKey obrigatório.");
  if (!["RECEBIMENTO", "SAIDA", "PROGRAMACAO"].includes(dataset)) {
    throw httpError(400, "dataset inválido.");
  }
  if (!rows.length) return { ok: true, received: 0, dataset };

  const now = isoNow();

  if (dataset === "PROGRAMACAO") {
    const base = env.DB.prepare(`
      INSERT INTO program_states (
        client_key, op, status, ok, encaminhado,
        updated_at, source, version, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, 'GOOGLE_SHEETS', 1, ?)
      ON CONFLICT(client_key, op) DO UPDATE SET
        status = excluded.status,
        ok = excluded.ok,
        encaminhado = excluded.encaminhado,
        updated_at = excluded.updated_at,
        source = excluded.source,
        version = program_states.version + 1,
        raw_json = excluded.raw_json
      WHERE program_states.raw_json <> excluded.raw_json
         OR program_states.raw_json IS NULL
    `);

    const stmts = rows
      .filter(row => text(row?.op))
      .map(row => base.bind(
        clientKey,
        text(row.op),
        text(row.status),
        bool01(row.ok),
        bool01(row.encaminhado),
        text(row.updatedAt) || now,
        JSON.stringify({ ...row, updatedAt: undefined })
      ));

    if (stmts.length) await env.DB.batch(stmts);
    return { ok: true, received: stmts.length, dataset };
  }

  const base = env.DB.prepare(`
    INSERT INTO operational_records (
      record_id, client_key, dataset, sheet_row, business_date, op,
      qtd_caixas, qtd_conteiner, peso_nf, peso, diferenca, diferenca_pct,
      cor, nota_fiscal, nota_fiscal_caixa, processo, anotacao,
      source, version, updated_at, generated, deleted, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              'GOOGLE_SHEETS', 1, ?, ?, ?, ?)
    ON CONFLICT(record_id) DO UPDATE SET
      sheet_row = excluded.sheet_row,
      business_date = excluded.business_date,
      op = excluded.op,
      qtd_caixas = excluded.qtd_caixas,
      qtd_conteiner = excluded.qtd_conteiner,
      peso_nf = excluded.peso_nf,
      peso = excluded.peso,
      diferenca = excluded.diferenca,
      diferenca_pct = excluded.diferenca_pct,
      cor = excluded.cor,
      nota_fiscal = excluded.nota_fiscal,
      nota_fiscal_caixa = excluded.nota_fiscal_caixa,
      processo = excluded.processo,
      anotacao = excluded.anotacao,
      source = excluded.source,
      version = operational_records.version + 1,
      updated_at = excluded.updated_at,
      generated = excluded.generated,
      deleted = excluded.deleted,
      raw_json = excluded.raw_json
    WHERE operational_records.raw_json <> excluded.raw_json
       OR operational_records.raw_json IS NULL
  `);

  const stmts = rows
    .filter(row => text(row?.recordId))
    .map(row => base.bind(
      text(row.recordId),
      clientKey,
      dataset,
      Number(row.sheetRow || 0) || null,
      text(row.businessDate) || null,
      text(row.op),
      numberOrNull(row.qtdCaixas),
      numberOrNull(row.qtdConteiner),
      numberOrNull(row.pesoNf),
      numberOrNull(row.peso),
      numberOrNull(row.diferenca),
      numberOrNull(row.diferencaPct),
      text(row.cor),
      text(row.notaFiscal),
      text(row.notaFiscalCaixa),
      text(row.processo),
      text(row.anotacao),
      text(row.updatedAt) || now,
      row.generated ? 1 : 0,
      row.deleted ? 1 : 0,
      JSON.stringify({ ...row, updatedAt: undefined })
    ));

  if (stmts.length) await env.DB.batch(stmts);
  return { ok: true, received: stmts.length, dataset };
}

async function listRecords(env, url) {
  const clientKey = text(url.searchParams.get("client") || "FIXPAR").toUpperCase();
  const dataset = text(url.searchParams.get("dataset")).toUpperCase();
  const op = text(url.searchParams.get("op"));
  const date = text(url.searchParams.get("date"));
  const startDate = text(url.searchParams.get("start"));
  const endDate = text(url.searchParams.get("end"));
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 1000);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  if (!["RECEBIMENTO", "SAIDA"].includes(dataset)) {
    throw httpError(400, "dataset deve ser RECEBIMENTO ou SAIDA.");
  }

  const params = [clientKey, dataset];
  let where = "client_key = ? AND dataset = ? AND deleted = 0 AND generated = 0";

  if (op) {
    where += " AND REPLACE(UPPER(TRIM(op)), ' ', '') = ?";
    params.push(opKey(op));
  }

  if (date) {
    where += " AND business_date = ?";
    params.push(date);
  } else {
    if (startDate) {
      where += " AND business_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      where += " AND business_date <= ?";
      params.push(endDate);
    }
  }

  params.push(limit, offset);

  const result = await env.DB.prepare(`
    SELECT *
    FROM operational_records
    WHERE ${where}
    ORDER BY business_date ASC, sheet_row ASC
    LIMIT ? OFFSET ?
  `).bind(...params).all();

  return { ok: true, rows: result.results || [], limit, offset };
}

function dateBr(iso) {
  const value = text(iso);
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

function valueText(v) {
  return v === null || v === undefined ? "" : String(v);
}

function recordValues(row, dataset) {
  if (dataset === "RECEBIMENTO") {
    return [
      dateBr(row.business_date),
      valueText(row.op),
      row.qtd_caixas ?? "",
      row.qtd_conteiner ?? "",
      row.peso_nf ?? "",
      row.peso ?? "",
      row.diferenca ?? "",
      row.diferenca_pct === null || row.diferenca_pct === undefined ? "" : valueText(row.diferenca_pct) + "%",
      valueText(row.cor),
      valueText(row.nota_fiscal),
      valueText(row.nota_fiscal_caixa),
      valueText(row.processo)
    ];
  }

  return [
    dateBr(row.business_date),
    valueText(row.op),
    row.qtd_caixas ?? "",
    row.qtd_conteiner ?? "",
    row.peso ?? "",
    valueText(row.nota_fiscal),
    valueText(row.nota_fiscal_caixa),
    valueText(row.anotacao)
  ];
}

function historyHeaders(dataset) {
  return dataset === "RECEBIMENTO"
    ? ["Data","OP","Qtd. Caixas","Qtd. Contêiner","Peso NF. Fixpar","Peso Danuta","Diferença","Diferença em %","Cor","Nota Fiscal","Nota Fiscal de Caixa","Processo"]
    : ["Data","OP","Caixas","Contêiner","Peso","Nota fiscal","Nota fiscal de caixa","Anotação Fixpar"];
}

async function getHistory(env, url) {
  const clientKey = text(url.searchParams.get("client") || "FIXPAR").toUpperCase();
  const dataset = text(url.searchParams.get("dataset")).toUpperCase();
  const startDate = text(url.searchParams.get("start"));
  const endDate = text(url.searchParams.get("end"));
  const q = text(url.searchParams.get("q"));
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 60), 1), 5000);

  if (!["RECEBIMENTO", "SAIDA"].includes(dataset)) {
    throw httpError(400, "dataset inválido.");
  }

  const params = [clientKey, dataset];
  let where = "client_key = ? AND dataset = ? AND deleted = 0";

  if (startDate) {
    where += " AND business_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    where += " AND business_date <= ?";
    params.push(endDate);
  }

  if (q) {
    const like = "%" + q.toUpperCase() + "%";
    where += ` AND (
      UPPER(COALESCE(op,'')) LIKE ? OR
      UPPER(COALESCE(cor,'')) LIKE ? OR
      UPPER(COALESCE(nota_fiscal,'')) LIKE ? OR
      UPPER(COALESCE(nota_fiscal_caixa,'')) LIKE ? OR
      UPPER(COALESCE(processo,'')) LIKE ? OR
      UPPER(COALESCE(anotacao,'')) LIKE ?
    )`;
    params.push(like, like, like, like, like, like);
  }

  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM operational_records
    WHERE ${where}
  `).bind(...params).first();

  const result = await env.DB.prepare(`
    SELECT *
    FROM operational_records
    WHERE ${where}
    ORDER BY business_date ASC, sheet_row ASC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  const total = Number(count?.total || 0);
  const nextOffset = offset + limit < total ? offset + limit : null;

  return {
    ok: true,
    rows: (result.results || []).map(row => ({
      historyRow: Number(row.sheet_row || 0),
      sourceRow: Number(row.sheet_row || 0),
      recordId: row.record_id,
      values: recordValues(row, dataset)
    })),
    headers: historyHeaders(dataset),
    title: dataset === "RECEBIMENTO" ? "Histórico Recebimento" : "Histórico Saída",
    total,
    offset,
    nextOffset,
    hasMore: nextOffset !== null,
    source: "CLOUDFLARE_D1"
  };
}

async function getSuggestions(env, url) {
  const clientKey = text(url.searchParams.get("client") || "FIXPAR").toUpperCase();
  const dataset = text(url.searchParams.get("dataset")).toUpperCase();
  const startDate = text(url.searchParams.get("start"));
  const endDate = text(url.searchParams.get("end"));
  const q = text(url.searchParams.get("q"));

  if (!["RECEBIMENTO", "SAIDA"].includes(dataset) || q.length < 2) {
    return { ok: true, rows: [] };
  }

  const like = "%" + q.toUpperCase() + "%";
  const params = [clientKey, dataset];
  let dateWhere = "";
  if (startDate) {
    dateWhere += " AND business_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    dateWhere += " AND business_date <= ?";
    params.push(endDate);
  }

  const baseParams = params.slice();
  const result = await env.DB.prepare(`
    SELECT type, value
    FROM (
      SELECT 'OP' AS type, op AS value, 1 AS ord
      FROM operational_records
      WHERE client_key = ? AND dataset = ? AND deleted = 0 ${dateWhere}
        AND UPPER(COALESCE(op,'')) LIKE ?
      UNION
      SELECT 'NF' AS type, nota_fiscal AS value, 2 AS ord
      FROM operational_records
      WHERE client_key = ? AND dataset = ? AND deleted = 0 ${dateWhere}
        AND UPPER(COALESCE(nota_fiscal,'')) LIKE ?
      UNION
      SELECT 'Cor' AS type, cor AS value, 3 AS ord
      FROM operational_records
      WHERE client_key = ? AND dataset = ? AND deleted = 0 ${dateWhere}
        AND UPPER(COALESCE(cor,'')) LIKE ?
    )
    WHERE TRIM(COALESCE(value,'')) <> ''
    GROUP BY type, value
    ORDER BY ord, value
    LIMIT 12
  `).bind(
    ...baseParams, like,
    ...baseParams, like,
    ...baseParams, like
  ).all();

  return { ok: true, rows: result.results || [] };
}

async function getProgramacao(env, url) {
  const clientKey = text(url.searchParams.get("client") || "FIXPAR").toUpperCase();

  const result = await env.DB.prepare(`
    WITH entrada AS (
      SELECT
        op,
        MIN(business_date) AS data_entrada,
        SUM(COALESCE(qtd_caixas, 0)) AS qtd_caixas,
        SUM(COALESCE(qtd_conteiner, 0)) AS qtd_conteiner,
        SUM(COALESCE(peso, 0)) AS peso,
        GROUP_CONCAT(DISTINCT NULLIF(cor, '')) AS cor
      FROM operational_records
      WHERE client_key = ?
        AND dataset = 'RECEBIMENTO'
        AND deleted = 0
        AND TRIM(COALESCE(op, '')) <> ''
      GROUP BY REPLACE(UPPER(TRIM(op)), ' ', '')
    ),
    saida AS (
      SELECT DISTINCT
        REPLACE(UPPER(TRIM(op)), ' ', '') AS op_key
      FROM operational_records
      WHERE client_key = ?
        AND dataset = 'SAIDA'
        AND deleted = 0
        AND TRIM(COALESCE(op, '')) <> ''
    )
    SELECT
      e.data_entrada AS dataEntrada,
      e.op,
      e.qtd_caixas AS qtdCaixas,
      e.qtd_conteiner AS qtdConteiner,
      e.cor,
      e.peso AS pesoDanuta,
      COALESCE(p.status, '') AS status,
      COALESCE(p.ok, 0) AS ok,
      COALESCE(p.encaminhado, 0) AS encaminhado
    FROM entrada e
    LEFT JOIN saida s
      ON s.op_key = REPLACE(UPPER(TRIM(e.op)), ' ', '')
    LEFT JOIN program_states p
      ON p.client_key = ?
     AND REPLACE(UPPER(TRIM(p.op)), ' ', '') =
         REPLACE(UPPER(TRIM(e.op)), ' ', '')
    WHERE s.op_key IS NULL
    ORDER BY
      CASE WHEN LOWER(COALESCE(p.status, '')) = 'urgente' THEN 0 ELSE 1 END,
      e.data_entrada ASC,
      CAST(e.op AS INTEGER) ASC,
      e.op ASC
  `).bind(clientKey, clientKey, clientKey).all();

  return {
    ok: true,
    rows: (result.results || []).map(row => ({
      ...row,
      ok: Boolean(row.ok),
      encaminhado: Boolean(row.encaminhado)
    })),
    source: "CLOUDFLARE_D1_MIRROR"
  };
}
