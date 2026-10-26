# TechDall SGQ API — Fase 1 (D1 espelho)

Esta pasta prepara a migração do SGQ Fixpar para Cloudflare Workers + D1 sem interromper o sistema atual.

## Regra desta fase

- O sistema atual continua usando Apps Script + Google Sheets.
- O D1 recebe uma cópia dos dados.
- Edições manuais no Google Sheets podem ser enviadas imediatamente ao D1 por gatilho instalável.
- Um reconciliador periódico reenvia os dados para cobrir alterações feitas por scripts.
- O front-end ainda NÃO grava no D1 nesta fase.

## Arquivos

- `src/index.js`: API Worker.
- `schema.sql`: tabelas e índices do D1.
- `wrangler.jsonc`: configuração do Worker; exige substituir o database_id.
- `backend/D1Sync.gs` (na raiz do projeto): sincronizador Apps Script -> D1.

## Implantação Cloudflare

1. Crie o D1 `techdall-sgq`.
2. Copie o `database_id` para `wrangler.jsonc`.
3. Aplique `schema.sql`.
4. Configure o segredo `SHEETS_SYNC_TOKEN` no Worker.
5. Publique o Worker.
6. No Apps Script, configure as propriedades:
   - `D1_SYNC_URL`: URL do Worker, sem barra final.
   - `D1_SYNC_TOKEN`: mesmo valor de `SHEETS_SYNC_TOKEN`.
7. Adicione o arquivo `backend/D1Sync.gs` ao projeto Apps Script.
8. Execute `d1SyncInstalarTriggers()` uma vez.
9. Execute `d1SyncBootstrapFixpar()` uma vez para carga inicial.

## Segurança

O endpoint de sincronização exige Bearer token. Não coloque esse token no front-end público.
