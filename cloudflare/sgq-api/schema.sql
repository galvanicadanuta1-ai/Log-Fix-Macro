-- Danuta SGQ - Cloudflare D1
-- Fase 1: espelho seguro das planilhas atuais.
-- D1 ainda NAO substitui o Apps Script nesta fase.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS operational_records (
  record_id TEXT PRIMARY KEY,
  client_key TEXT NOT NULL,
  dataset TEXT NOT NULL CHECK (dataset IN ('RECEBIMENTO','SAIDA')),
  sheet_row INTEGER,
  business_date TEXT,
  op TEXT,
  qtd_caixas REAL,
  qtd_conteiner REAL,
  peso_nf REAL,
  peso REAL,
  diferenca REAL,
  diferenca_pct REAL,
  cor TEXT,
  nota_fiscal TEXT,
  nota_fiscal_caixa TEXT,
  processo TEXT,
  anotacao TEXT,
  source TEXT NOT NULL DEFAULT 'GOOGLE_SHEETS',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  generated INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT
);

DROP INDEX IF EXISTS ux_operational_sheet_row;

CREATE INDEX IF NOT EXISTS ix_operational_sheet_row
  ON operational_records(client_key, dataset, sheet_row);

CREATE INDEX IF NOT EXISTS ix_operational_client_dataset_op
  ON operational_records(client_key, dataset, op);

CREATE INDEX IF NOT EXISTS ix_operational_client_dataset_op_norm
  ON operational_records(
    client_key,
    dataset,
    REPLACE(UPPER(TRIM(op)), ' ', '')
  );

CREATE INDEX IF NOT EXISTS ix_operational_client_dataset_nf
  ON operational_records(client_key, dataset, nota_fiscal);

CREATE INDEX IF NOT EXISTS ix_operational_client_dataset_date
  ON operational_records(client_key, dataset, business_date);

CREATE INDEX IF NOT EXISTS ix_operational_updated_at
  ON operational_records(updated_at);

CREATE TABLE IF NOT EXISTS program_states (
  client_key TEXT NOT NULL,
  op TEXT NOT NULL,
  status TEXT,
  ok INTEGER NOT NULL DEFAULT 0,
  encaminhado INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'GOOGLE_SHEETS',
  version INTEGER NOT NULL DEFAULT 1,
  raw_json TEXT,
  PRIMARY KEY (client_key, op)
);

CREATE INDEX IF NOT EXISTS ix_program_states_updated_at
  ON program_states(updated_at);

CREATE INDEX IF NOT EXISTS ix_program_states_op_norm
  ON program_states(
    client_key,
    REPLACE(UPPER(TRIM(op)), ' ', '')
  );

CREATE TABLE IF NOT EXISTS sync_events (
  event_id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('SHEETS_TO_D1','D1_TO_SHEETS')),
  entity_type TEXT NOT NULL,
  record_id TEXT,
  client_key TEXT NOT NULL,
  payload_json TEXT,
  status TEXT NOT NULL DEFAULT 'DONE',
  attempts INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS ix_sync_events_status_created
  ON sync_events(status, created_at);
