# SGQ Fixpar — GitHub Pages + Apps Script API

A interface roda no GitHub Pages, no mesmo padrão do projeto `canhoto-digital`.

## Arquitetura

GitHub Pages → HTML/CSS/JS → fetch() → Apps Script Web App → Sheets / Drive / PDF

## Passo 1 — Apps Script atual

No MESMO projeto Apps Script que já está funcionando:

1. Crie um arquivo de script chamado `API`.
2. Copie TODO o conteúdo de `backend/API.gs`.
3. Não apague o `Code.gs` atual.
4. Salve.
5. Implantar → Gerenciar implantações → Editar → Nova versão.
6. Executar como: **Eu**.
7. Quem pode acessar: **Qualquer pessoa**.
8. Implante.
9. Copie a URL que termina em `/exec`.

## Passo 2 — informar a URL no GitHub

Abra `assets/config.js` e troque:

```js
const API_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT_EXEC';
```

pela URL `/exec` copiada.

## Passo 3 — ativar GitHub Pages

Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.

O endereço será:

`https://galvanicadanuta1-ai.github.io/Log-Fix-Macro/`

## Logo

O menu principal usa o mesmo logo do projeto `canhoto-digital` no topo central.

## Funcionalidades mantidas pelo backend

- Recebimento Fixpar
- Entregas Fixpar
- Histórico Entrada
- Histórico Saída
- logs de edição
- Conciliação OP
- autocomplete de cores
- PDF
- salvamento automático no Drive

## Macrosul / Programação

Os botões permanecem visíveis e serão implementados nas próximas etapas.
