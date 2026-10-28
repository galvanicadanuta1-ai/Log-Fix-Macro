# Danuta SGQ API — Fase 1 (D1 espelho)

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

1. Crie o D1 `danuta-sgq`.
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


## Deploy automático pelo GitHub

O workflow `.github/workflows/deploy-sgq-d1.yml` está pronto.

Cadastre em **GitHub > Settings > Secrets and variables > Actions**:

- `CLOUDFLARE_API_TOKEN`

Depois execute manualmente **Deploy Danuta SGQ D1 API** em Actions ou faça um push em `cloudflare/sgq-api/**`.

O segredo de sincronização `SHEETS_SYNC_TOKEN` deve ser configurado no Worker e repetido na propriedade `D1_SYNC_TOKEN` do Apps Script. Ele nunca deve ficar no JavaScript público do site.


## IDs Cloudflare da Danuta configurados

- Account ID: f18eaea1c83abc8958146975896817c7
- D1 Database ID: f86a88f8-bfd3-41ab-842f-831ae68449a3

Esses identificadores não são segredos. O único Secret obrigatório no GitHub Actions para o deploy é `CLOUDFLARE_API_TOKEN`.
