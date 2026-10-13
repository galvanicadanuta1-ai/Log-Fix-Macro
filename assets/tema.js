/* ============================================================
   TEMA CLARO / ESCURO - SGQ FIXPAR
   ============================================================
   - Botão discreto somente na página principal;
   - Lua no tema claro -> "Tema escuro";
   - Sol no tema escuro -> "Tema claro";
   - preferência salva no navegador;
   - tema aplicado a todas as telas, sem alterar lógica/back-end;
   - impressão permanece clara.
   ============================================================ */

(function () {
  const STORAGE_KEY = 'sgq-fixpar-theme';
  const STYLE_ID = 'sgqThemeStyle';
  const BUTTON_ID = 'sgqThemeToggle';

  const ICON_MOON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.4 15.2A8.4 8.4 0 0 1 8.8 3.6 8.7 8.7 0 1 0 20.4 15.2Z"></path>
    </svg>`;

  const ICON_SUN = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
    </svg>`;

  function temaSalvo_() {
    try {
      const valor = localStorage.getItem(STORAGE_KEY);
      return valor === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function salvarTema_(tema) {
    try { localStorage.setItem(STORAGE_KEY, tema); } catch (e) {}
  }

  function atualizarMetaTema_(tema) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'dark' ? '#0b1118' : '#f3f5f7');
  }

  function atualizarBotao_(tema) {
    const botao = document.getElementById(BUTTON_ID);
    if (!botao) return;

    const vaiParaEscuro = tema === 'light';
    const texto = vaiParaEscuro ? 'Tema escuro' : 'Tema claro';

    botao.innerHTML = vaiParaEscuro ? ICON_MOON : ICON_SUN;
    botao.setAttribute('aria-label', texto);
    botao.setAttribute('title', texto);
    botao.dataset.tooltip = texto;
  }

  function aplicarTema_(tema, persistir) {
    const valor = tema === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-sgq-theme', valor);
    atualizarMetaTema_(valor);
    atualizarBotao_(valor);
    if (persistir !== false) salvarTema_(valor);
  }

  function alternarTema_() {
    const atual = document.documentElement.getAttribute('data-sgq-theme') || 'light';
    aplicarTema_(atual === 'dark' ? 'light' : 'dark', true);
  }

  function garantirEstilo_() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[data-sgq-theme="light"] {
        --bg: #f3f5f7;
        --panel: #ffffff;
        --border: #aeb9c4;
        --border-strong: #8f9dab;
        --header: #e4e9ed;
        --text: #05070a;
        --muted: #334155;
        --peso-danuta: #edf6fd;
      }

      html[data-sgq-theme="dark"] {
        --bg: #0b1118;
        --panel: #111923;
        --border: #3d4b5b;
        --border-strong: #526173;
        --header: #1c2835;
        --text: #ffffff;
        --muted: #d7dee7;
        --peso-danuta: #162b3a;
      }

      html,
      body,
      .screen,
      .menu-screen,
      .app,
      .programacao-sheet,
      table,
      th,
      td,
      input,
      select,
      button {
        transition: background-color .16s ease, color .16s ease, border-color .16s ease;
      }

      #mainMenu {
        position: relative;
      }

      #${BUTTON_ID} {
        position: absolute;
        top: 12px;
        right: 14px;
        z-index: 120;
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1px solid rgba(100, 116, 139, .55);
        border-radius: 9px;
        background: rgba(255, 255, 255, .72);
        color: #17212b;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(15, 23, 42, .06);
        backdrop-filter: blur(8px);
      }

      #${BUTTON_ID} svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      #${BUTTON_ID}:hover {
        transform: translateY(-1px);
        border-color: currentColor;
      }

      #${BUTTON_ID}::after {
        content: attr(data-tooltip);
        position: absolute;
        top: calc(100% + 7px);
        right: 0;
        padding: 5px 8px;
        border-radius: 5px;
        background: #111827;
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(-3px);
        transition: opacity .14s ease, transform .14s ease, visibility .14s ease;
      }

      #${BUTTON_ID}:hover::after,
      #${BUTTON_ID}:focus-visible::after {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      html[data-sgq-theme="dark"] #${BUTTON_ID} {
        background: rgba(17, 25, 35, .88);
        border-color: #526173;
        color: #ffffff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, .28);
      }

      html[data-sgq-theme="dark"] #${BUTTON_ID}::after {
        background: #f8fafc;
        color: #070b10;
      }

      /* ---------------- TEMA CLARO: texto preto forte ---------------- */
      html[data-sgq-theme="light"] body,
      html[data-sgq-theme="light"] .menu-title,
      html[data-sgq-theme="light"] .page-title,
      html[data-sgq-theme="light"] .programacao-title,
      html[data-sgq-theme="light"] .programacao-bloco-titulo,
      html[data-sgq-theme="light"] .programacao-bloco-subtitulo,
      html[data-sgq-theme="light"] .programacao-table th,
      html[data-sgq-theme="light"] .programacao-table td,
      html[data-sgq-theme="light"] label,
      html[data-sgq-theme="light"] thead th,
      html[data-sgq-theme="light"] tbody td,
      html[data-sgq-theme="light"] .cell-input {
        color: #05070a !important;
      }

      html[data-sgq-theme="light"] #mainMenu,
      html[data-sgq-theme="light"] #mainMenu .main-menu-wrapper {
        background: #ffffff !important;
      }

      /* ---------------- TEMA ESCURO ---------------- */
      html[data-sgq-theme="dark"],
      html[data-sgq-theme="dark"] body,
      html[data-sgq-theme="dark"] #mainMenu,
      html[data-sgq-theme="dark"] #mainMenu .main-menu-wrapper {
        background: #0b1118 !important;
        color: #ffffff !important;
      }

      html[data-sgq-theme="dark"] .menu-screen,
      html[data-sgq-theme="dark"] .app,
      html[data-sgq-theme="dark"] .system-header,
      html[data-sgq-theme="dark"] .toolbar,
      html[data-sgq-theme="dark"] .history-toolbar,
      html[data-sgq-theme="dark"] .programacao-sheet,
      html[data-sgq-theme="dark"] .programacao-bloco,
      html[data-sgq-theme="dark"] .history-card,
      html[data-sgq-theme="dark"] .history-card-body,
      html[data-sgq-theme="dark"] .history-suggestions,
      html[data-sgq-theme="dark"] .history-suggestion,
      html[data-sgq-theme="dark"] table,
      html[data-sgq-theme="dark"] tbody td {
        background: #111923 !important;
        color: #ffffff !important;
        border-color: #3d4b5b !important;
      }

      html[data-sgq-theme="dark"] .menu-title,
      html[data-sgq-theme="dark"] .page-title,
      html[data-sgq-theme="dark"] .programacao-title,
      html[data-sgq-theme="dark"] .programacao-title-screen,
      html[data-sgq-theme="dark"] .programacao-bloco-titulo,
      html[data-sgq-theme="dark"] .programacao-table th,
      html[data-sgq-theme="dark"] .programacao-table td,
      html[data-sgq-theme="dark"] .history-card-title,
      html[data-sgq-theme="dark"] label,
      html[data-sgq-theme="dark"] thead th,
      html[data-sgq-theme="dark"] tbody td,
      html[data-sgq-theme="dark"] .cell-input {
        color: #ffffff !important;
      }

      html[data-sgq-theme="dark"] .programacao-bloco-subtitulo {
        color: #ff8b8b !important;
      }

      html[data-sgq-theme="dark"] thead th,
      html[data-sgq-theme="dark"] .programacao-column-head th,
      html[data-sgq-theme="dark"] .history-card-title {
        background: #1c2835 !important;
        border-color: #526173 !important;
      }

      html[data-sgq-theme="dark"] tbody tr:hover td {
        background: #172331 !important;
      }

      html[data-sgq-theme="dark"] tbody tr.blank-row td,
      html[data-sgq-theme="dark"] .date-cell {
        background: #121c27 !important;
      }

      html[data-sgq-theme="dark"] .peso-danuta-cell {
        background: #162b3a !important;
      }

      html[data-sgq-theme="dark"] input:not([type="checkbox"]):not([type="radio"]),
      html[data-sgq-theme="dark"] select,
      html[data-sgq-theme="dark"] .history-edit-input,
      html[data-sgq-theme="dark"] .programacao-status-input,
      html[data-sgq-theme="dark"] .programacao-search-input {
        background: #0f1720 !important;
        color: #ffffff !important;
        border-color: #526173 !important;
      }

      html[data-sgq-theme="dark"] input::placeholder,
      html[data-sgq-theme="dark"] .history-search::placeholder,
      html[data-sgq-theme="dark"] .programacao-search-input::placeholder {
        color: #aeb9c6 !important;
        opacity: 1;
      }

      html[data-sgq-theme="dark"] .menu-button.secondary,
      html[data-sgq-theme="dark"] .history-button,
      html[data-sgq-theme="dark"] .back-button,
      html[data-sgq-theme="dark"] .menu-back button,
      html[data-sgq-theme="dark"] .export-excel-button,
      html[data-sgq-theme="dark"] .icon-action-button,
      html[data-sgq-theme="dark"] .programacao-actions button:not(.programacao-report-button),
      html[data-sgq-theme="dark"] .history-load-more {
        background: #17212c !important;
        color: #ffffff !important;
        border-color: #526173 !important;
      }

      html[data-sgq-theme="dark"] .menu-button.secondary:hover,
      html[data-sgq-theme="dark"] .history-button:hover,
      html[data-sgq-theme="dark"] .back-button:hover,
      html[data-sgq-theme="dark"] .export-excel-button:hover,
      html[data-sgq-theme="dark"] .icon-action-button:hover,
      html[data-sgq-theme="dark"] .programacao-actions button:not(.programacao-report-button):hover {
        background: #223142 !important;
      }

      html[data-sgq-theme="dark"] .history-suggestion:hover,
      html[data-sgq-theme="dark"] .history-search-clear:hover {
        background: #223142 !important;
        color: #ffffff !important;
      }

      html[data-sgq-theme="dark"] .statusbar,
      html[data-sgq-theme="dark"] .history-info,
      html[data-sgq-theme="dark"] .history-filter-item label,
      html[data-sgq-theme="dark"] .programacao-subinfo,
      html[data-sgq-theme="dark"] .loading,
      html[data-sgq-theme="dark"] .history-empty {
        color: #d7dee7 !important;
      }

      html[data-sgq-theme="dark"] .programacao-status-message.saved,
      html[data-sgq-theme="dark"] .statusbar.saved {
        color: #7cf0a7 !important;
      }

      html[data-sgq-theme="dark"] .programacao-status-message.saving,
      html[data-sgq-theme="dark"] .statusbar.saving {
        color: #ffd36a !important;
      }

      html[data-sgq-theme="dark"] .programacao-status-message.error,
      html[data-sgq-theme="dark"] .statusbar.error {
        color: #ff8c8c !important;
      }

      @media (max-width: 800px) {
        #${BUTTON_ID} {
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
        }
      }

      /* Impressão nunca herda o fundo escuro. */
      @media print {
        #${BUTTON_ID} { display: none !important; }

        html[data-sgq-theme="dark"],
        html[data-sgq-theme="dark"] body,
        html[data-sgq-theme="dark"] #programacaoSgqScreen,
        html[data-sgq-theme="dark"] #programacaoSgqScreen .programacao-sheet,
        html[data-sgq-theme="dark"] #programacaoSgqScreen .programacao-bloco,
        html[data-sgq-theme="dark"] #programacaoSgqScreen table,
        html[data-sgq-theme="dark"] #programacaoSgqScreen th,
        html[data-sgq-theme="dark"] #programacaoSgqScreen td {
          background: #ffffff !important;
          color: #111827 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function garantirBotao_() {
    const main = document.getElementById('mainMenu');
    if (!main || document.getElementById(BUTTON_ID)) return;

    const botao = document.createElement('button');
    botao.id = BUTTON_ID;
    botao.type = 'button';
    botao.addEventListener('click', alternarTema_);
    main.appendChild(botao);

    atualizarBotao_(document.documentElement.getAttribute('data-sgq-theme') || 'light');
  }

  garantirEstilo_();
  aplicarTema_(temaSalvo_(), false);
  garantirBotao_();
})();
