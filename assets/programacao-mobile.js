/* ============================================================
   PROGRAMAÇÃO SGQ - EXPERIÊNCIA MOBILE
   ============================================================
   - reorganiza o cabeçalho no celular;
   - cria uma barra própria de controles para toque;
   - mantém as funções já existentes (voltar, PDF, Excel, imprimir, +OP);
   - adiciona compartilhamento nativo com PDF (WhatsApp, e-mail etc.);
   - mantém as tabelas completas com rolagem horizontal somente dentro
     de cada bloco, sem estourar a largura da página.
   ============================================================ */

(function () {
  const LOGO_URL =
    'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';

  function svg_(name) {
    const icons = {
      back:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/><path d="M9 12h11"/></svg>',
      pdf:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 14h6M9 17h5"/></svg>',
      excel:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
      print:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5"/><path d="M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/></svg>',
      share:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="M8 11l8-5M8 13l8 5"/></svg>',
      plus:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
    };
    return icons[name] || '';
  }

  function criarBotao_(classe, titulo, icon, handler) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'programacao-mobile-action ' + classe;
    btn.title = titulo;
    btn.setAttribute('aria-label', titulo);
    btn.innerHTML = svg_(icon) + '<span class="programacao-mobile-action-label">' + titulo + '</span>';
    btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    }, { passive: false });
    return btn;
  }

  function garantirToolbarMobile_() {
    const screen = document.getElementById('programacaoSgqScreen');
    if (!screen || screen.querySelector('.programacao-mobile-toolbar')) return;

    const header = screen.querySelector('.programacao-header');
    if (!header || !header.parentNode) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'programacao-mobile-toolbar no-print';

    const searchRow = document.createElement('div');
    searchRow.className = 'programacao-mobile-search-row';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'programacao-mobile-search-wrap';

    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'programacaoSgqSearchMobile';
    search.placeholder = 'Buscar OP';
    search.autocomplete = 'off';
    search.inputMode = 'numeric';
    search.setAttribute('aria-label', 'Buscar OP');

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'programacao-mobile-search-clear';
    clear.textContent = '×';
    clear.title = 'Limpar busca';
    clear.setAttribute('aria-label', 'Limpar busca');

    const atualizarBusca = value => {
      window.programacaoSgqBusca = value || '';
      const desktop = document.getElementById('programacaoSgqSearch');
      if (desktop && desktop.value !== value) desktop.value = value;
      if (typeof window.renderProgramacaoSgq === 'function') {
        window.renderProgramacaoSgq();
      }
    };

    search.addEventListener('input', () => atualizarBusca(search.value));
    clear.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      search.value = '';
      atualizarBusca('');
      search.focus();
    });

    searchWrap.appendChild(search);
    searchWrap.appendChild(clear);
    searchRow.appendChild(searchWrap);

    const buttons = document.createElement('div');
    buttons.className = 'programacao-mobile-buttons';

    buttons.appendChild(criarBotao_(
      'is-back', 'Voltar', 'back',
      () => {
        if (typeof window.voltarMenuLogistica === 'function') window.voltarMenuLogistica();
        else if (typeof window.voltarMenuProgramacao === 'function') window.voltarMenuProgramacao();
      }
    ));

    buttons.appendChild(criarBotao_(
      'is-pdf', 'PDF', 'pdf',
      () => {
        if (typeof window.gerarRelatorioProgramacaoSgq === 'function') {
          window.gerarRelatorioProgramacaoSgq();
        }
      }
    ));

    buttons.appendChild(criarBotao_(
      'is-excel', 'Excel', 'excel',
      () => {
        if (typeof window.exportarProgramacaoSgqExcel === 'function') {
          window.exportarProgramacaoSgqExcel();
        }
      }
    ));

    buttons.appendChild(criarBotao_(
      'is-print', 'Imprimir', 'print',
      () => {
        if (typeof window.imprimirProgramacaoSgq === 'function') window.imprimirProgramacaoSgq();
        else window.print();
      }
    ));

    buttons.appendChild(criarBotao_(
      'is-share', 'Compartilhar', 'share',
      () => window.compartilharProgramacaoSgq()
    ));

    buttons.appendChild(criarBotao_(
      'is-add', 'Adicionar OP', 'plus',
      () => {
        if (typeof window.abrirModalOsManual === 'function') {
          window.abrirModalOsManual();
          return;
        }
        const original = screen.querySelector('.programacao-add-os-button');
        if (original) original.click();
      }
    ));

    toolbar.appendChild(searchRow);
    toolbar.appendChild(buttons);
    header.parentNode.insertBefore(toolbar, header.nextSibling);
  }

  function subtituloAtual_() {
    const turno = typeof window.obterTurnoProgramacaoSgq === 'function'
      ? window.obterTurnoProgramacaoSgq()
      : (document.getElementById('programacaoSgqTurno')?.value || 'Turno Dia');
    return turno + ' • ' + new Date().toLocaleDateString('pt-BR');
  }

  function garantirCabecalhosMobile_() {
    const screen = document.getElementById('programacaoSgqScreen');
    if (!screen) return;

    const configs = [
      ['.programacao-bloco-principal', 'Programação SGQ - Fixpar'],
      ['.programacao-bloco-uma-caixa', 'OPs de 1 caixa']
    ];

    configs.forEach(([selector, titulo]) => {
      const bloco = screen.querySelector(selector);
      if (!bloco) return;

      let head = bloco.querySelector(':scope > .programacao-mobile-section-head');
      if (!head) {
        head = document.createElement('div');
        head.className = 'programacao-mobile-section-head';
        head.innerHTML =
          '<img src="' + LOGO_URL + '" alt="Galvânica Danuta">' +
          '<div class="programacao-mobile-section-text">' +
            '<div class="programacao-mobile-section-title"></div>' +
            '<div class="programacao-mobile-section-subtitle"></div>' +
          '</div>';
        bloco.insertBefore(head, bloco.firstChild);
      }

      const titleEl = head.querySelector('.programacao-mobile-section-title');
      const subEl = head.querySelector('.programacao-mobile-section-subtitle');
      if (titleEl) titleEl.textContent = titulo;
      if (subEl) subEl.textContent = subtituloAtual_();
    });
  }

  function dadosCompartilhamento_() {
    if (typeof window.dadosProgramacaoParaExportar_ === 'function') {
      return window.dadosProgramacaoParaExportar_();
    }
    return null;
  }

  function criarPdfCompartilhamento_() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('Biblioteca de PDF não carregada.');
    }

    const dados = dadosCompartilhamento_();
    if (!dados) throw new Error('Não foi possível preparar os dados da programação.');

    const principal = Array.isArray(dados.principal) ? dados.principal : [];
    const umaCaixa = Array.isArray(dados.umaCaixa) ? dados.umaCaixa : [];
    if (!principal.length && !umaCaixa.length) {
      throw new Error('Não existem OPs na programação para compartilhar.');
    }

    const headersPrincipal =
      dados.headersPrincipal || dados.headersEsquerda || dados.headers || [];
    const headersUmaCaixa =
      dados.headersUmaCaixa || dados.headersDireita || [];

    const JsPdf = window.jspdf.jsPDF;
    const doc = new JsPdf({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const turno = typeof window.obterTurnoProgramacaoSgq === 'function'
      ? window.obterTurnoProgramacaoSgq()
      : 'Turno Dia';
    const subtitulo = turno + ' • ' + dataHoje;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margem = 6;

    const tituloSecao = (titulo, y) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(13);
      doc.text(titulo, pageWidth / 2, y, { align: 'center' });
      doc.setFontSize(8);
      doc.text(subtitulo, pageWidth / 2, y + 4, { align: 'center' });
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(.35);
      doc.line(margem, y + 7, pageWidth - margem, y + 7);
    };

    const tabela = (headers, rows, startY) => {
      doc.autoTable({
        startY,
        head: [headers],
        body: rows,
        theme: 'grid',
        showHead: 'everyPage',
        margin: { left: margem, right: margem, bottom: 8 },
        styles: {
          font: 'helvetica',
          fontSize: 7.2,
          cellPadding: 1.25,
          valign: 'middle',
          halign: 'center',
          overflow: 'linebreak',
          lineWidth: .12
        },
        headStyles: {
          fillColor: [232, 238, 243],
          textColor: [17, 24, 39],
          fontStyle: 'bold',
          fontSize: 6.4
        }
      });
      return doc.lastAutoTable ? doc.lastAutoTable.finalY : startY;
    };

    tituloSecao('Programação SGQ - Fixpar', 10);
    let finalY = tabela(headersPrincipal, principal, 20);

    if (umaCaixa.length) {
      let y = finalY + 14;
      if (y > pageHeight - 38) {
        doc.addPage('a4', 'portrait');
        y = 10;
      }
      tituloSecao('OPs de 1 caixa', y);
      tabela(headersUmaCaixa, umaCaixa, y + 10);
    }

    return doc.output('blob');
  }

  function baixarBlob_(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  window.compartilharProgramacaoSgq = function () {
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const turno = typeof window.obterTurnoProgramacaoSgq === 'function'
        ? window.obterTurnoProgramacaoSgq()
        : 'Turno Dia';
      const nome = 'Programacao-SGQ-Fixpar-' +
        turno.replace(/\s+/g, '-') + '-' + dataHoje + '.pdf';

      /* Geração local e síncrona para manter o gesto do toque válido no Web Share API. */
      const blob = criarPdfCompartilhamento_();
      const file = new File([blob], nome, { type: 'application/pdf' });
      const payload = {
        title: 'Programação SGQ - Fixpar',
        text: 'Programação SGQ - Fixpar • ' + turno + ' • ' +
          new Date().toLocaleDateString('pt-BR'),
        files: [file]
      };

      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        navigator.share(payload).catch(error => {
          if (error && error.name === 'AbortError') return;
          console.error('Falha no compartilhamento:', error);
          baixarBlob_(blob, nome);
          alert('Não foi possível abrir o compartilhamento. O PDF foi baixado no aparelho.');
        });
        return;
      }

      baixarBlob_(blob, nome);

      if (navigator.share) {
        navigator.share({
          title: payload.title,
          text: payload.text
        }).catch(() => {});
      } else {
        alert('O PDF foi baixado. Abra o WhatsApp e anexe o arquivo para enviar.');
      }
    } catch (error) {
      alert(error && error.message
        ? error.message
        : 'Não foi possível compartilhar a programação.');
    }
  };

  function instalarEstilos_() {
    if (document.getElementById('programacaoMobileStyle')) return;

    const style = document.createElement('style');
    style.id = 'programacaoMobileStyle';
    style.textContent = `
      .programacao-mobile-toolbar,
      .programacao-mobile-section-head {
        display: none;
      }

      @media (max-width: 700px) {
        #programacaoSgqScreen {
          overflow-x: hidden !important;
        }

        #programacaoSgqScreen .programacao-page {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 8px !important;
          box-sizing: border-box !important;
        }

        #programacaoSgqScreen .programacao-sheet {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 12px !important;
          border: 1px solid #d7e0e8 !important;
          border-radius: 22px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }

        #programacaoSgqScreen .programacao-header {
          display: block !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 0 10px !important;
          border-bottom: 0 !important;
        }

        #programacaoSgqScreen .programacao-logo-wrap,
        #programacaoSgqScreen .programacao-actions {
          display: none !important;
        }

        #programacaoSgqScreen .programacao-title {
          width: 100% !important;
          text-align: center !important;
        }

        #programacaoSgqScreen .programacao-title-screen {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 9px !important;
          font-size: 20px !important;
          line-height: 1.15 !important;
          font-weight: 600 !important;
          text-align: center !important;
        }

        #programacaoSgqScreen .programacao-title-screen select {
          width: min(190px, 64vw) !important;
          height: 46px !important;
          border-radius: 14px !important;
          padding: 0 38px 0 15px !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          touch-action: manipulation !important;
        }

        #programacaoSgqScreen .programacao-date-actions {
          width: 100% !important;
          margin: 9px 0 0 !important;
          align-items: center !important;
        }

        #programacaoSgqScreen .programacao-date-actions .programacao-add-os-button {
          display: none !important;
        }

        #programacaoSgqScreen .programacao-date {
          justify-self: auto !important;
          align-self: center !important;
          margin: 8px auto 0 !important;
          padding: 6px 11px !important;
          font-size: 11px !important;
          border-radius: 10px !important;
        }

        #programacaoSgqScreen .programacao-mobile-toolbar {
          position: relative !important;
          z-index: 100 !important;
          display: block !important;
          width: 100% !important;
          margin: 0 0 12px !important;
          padding: 10px !important;
          border: 1px solid #dbe4ec !important;
          border-radius: 18px !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          box-shadow: 0 6px 18px rgba(15,23,42,.06) !important;
          pointer-events: auto !important;
          touch-action: manipulation !important;
        }

        #programacaoSgqScreen .programacao-mobile-search-row {
          display: block !important;
          width: 100% !important;
          margin-bottom: 9px !important;
        }

        #programacaoSgqScreen .programacao-mobile-search-wrap {
          position: relative !important;
          width: 100% !important;
        }

        #programacaoSgqScreen #programacaoSgqSearchMobile {
          width: 100% !important;
          height: 44px !important;
          padding: 0 44px 0 14px !important;
          border: 1px solid #c6d1dc !important;
          border-radius: 13px !important;
          background: #fff !important;
          color: #111827 !important;
          font-size: 15px !important;
          box-sizing: border-box !important;
          -webkit-appearance: none !important;
        }

        #programacaoSgqScreen .programacao-mobile-search-clear {
          position: absolute !important;
          right: 4px !important;
          top: 4px !important;
          width: 36px !important;
          height: 36px !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 10px !important;
          background: transparent !important;
          color: #475569 !important;
          font-size: 26px !important;
          line-height: 1 !important;
          pointer-events: auto !important;
          touch-action: manipulation !important;
        }

        #programacaoSgqScreen .programacao-mobile-buttons {
          display: grid !important;
          grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
          gap: 7px !important;
          width: 100% !important;
        }

        #programacaoSgqScreen .programacao-mobile-action {
          position: relative !important;
          z-index: 101 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2px !important;
          width: 100% !important;
          min-width: 0 !important;
          height: 54px !important;
          padding: 5px 2px !important;
          border: 0 !important;
          border-radius: 13px !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(15,23,42,.10) !important;
          pointer-events: auto !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        #programacaoSgqScreen .programacao-mobile-action:active {
          transform: scale(.96) !important;
        }

        #programacaoSgqScreen .programacao-mobile-action svg {
          width: 23px !important;
          height: 23px !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 1.8 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
          pointer-events: none !important;
        }

        #programacaoSgqScreen .programacao-mobile-action-label {
          display: none !important;
        }

        #programacaoSgqScreen .programacao-mobile-action.is-back { background: #526b82 !important; }
        #programacaoSgqScreen .programacao-mobile-action.is-pdf { background: #1f9d62 !important; }
        #programacaoSgqScreen .programacao-mobile-action.is-excel { background: #e58a13 !important; }
        #programacaoSgqScreen .programacao-mobile-action.is-print { background: #7652c8 !important; }
        #programacaoSgqScreen .programacao-mobile-action.is-share { background: #168ca6 !important; }
        #programacaoSgqScreen .programacao-mobile-action.is-add { background: #24679a !important; }

        #programacaoSgqScreen .programacao-subinfo {
          display: block !important;
          width: 100% !important;
          min-height: 0 !important;
          margin: 0 0 14px !important;
          padding: 0 2px !important;
          box-sizing: border-box !important;
          font-size: 13px !important;
          line-height: 1.35 !important;
        }

        #programacaoSgqScreen .programacao-status-message {
          margin-top: 7px !important;
          text-align: left !important;
          font-size: 12px !important;
        }

        #programacaoSgqScreen .programacao-table-wrap,
        #programacaoSgqScreen .programacao-dual-grid,
        #programacaoSgqScreen .programacao-bloco {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }

        #programacaoSgqScreen .programacao-dual-grid {
          display: block !important;
        }

        #programacaoSgqScreen .programacao-bloco {
          position: relative !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior-x: contain !important;
          touch-action: pan-x pan-y !important;
          border: 1px solid #dbe4ec !important;
          border-radius: 16px !important;
          background: #fff !important;
          padding: 0 !important;
          margin: 0 0 16px !important;
        }

        #programacaoSgqScreen .programacao-bloco + .programacao-bloco {
          border-left: 1px solid #dbe4ec !important;
          border-top: 1px solid #dbe4ec !important;
          padding-left: 0 !important;
          padding-top: 0 !important;
        }

        #programacaoSgqScreen .programacao-mobile-section-head {
          position: sticky !important;
          left: 0 !important;
          z-index: 6 !important;
          display: grid !important;
          grid-template-columns: 82px minmax(0,1fr) 20px !important;
          align-items: center !important;
          width: calc(100vw - 42px) !important;
          min-width: calc(100vw - 42px) !important;
          padding: 9px 8px !important;
          background: #fff !important;
          border-bottom: 1px solid #334155 !important;
          box-sizing: border-box !important;
        }

        #programacaoSgqScreen .programacao-mobile-section-head img {
          max-width: 78px !important;
          max-height: 32px !important;
          object-fit: contain !important;
          justify-self: start !important;
        }

        #programacaoSgqScreen .programacao-mobile-section-text {
          text-align: center !important;
          min-width: 0 !important;
        }

        #programacaoSgqScreen .programacao-mobile-section-title {
          font-size: 16px !important;
          line-height: 1.1 !important;
          font-weight: 500 !important;
          color: #111827 !important;
          white-space: normal !important;
        }

        #programacaoSgqScreen .programacao-mobile-section-subtitle {
          margin-top: 3px !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
          font-weight: 500 !important;
          color: #334155 !important;
        }

        #programacaoSgqScreen .programacao-repeat-panel {
          display: none !important;
        }

        #programacaoSgqScreen .programacao-table {
          width: 860px !important;
          min-width: 860px !important;
          table-layout: fixed !important;
          margin: 0 !important;
        }

        #programacaoSgqScreen .programacao-table-uma-caixa,
        #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-table {
          width: 700px !important;
          min-width: 700px !important;
        }

        #programacaoSgqScreen .programacao-table th {
          position: sticky !important;
          top: 0 !important;
          z-index: 4 !important;
          background: #e8eef3 !important;
          font-size: 11px !important;
          padding: 9px 5px !important;
          white-space: normal !important;
        }

        #programacaoSgqScreen .programacao-table td {
          font-size: 13px !important;
          padding: 9px 5px !important;
          height: auto !important;
        }

        #programacaoSgqScreen .programacao-status-input {
          min-height: 38px !important;
          font-size: 13px !important;
        }

        #programacaoSgqScreen .programacao-check {
          width: 21px !important;
          height: 21px !important;
        }

        #programacaoSgqScreen .programacao-modal-overlay {
          padding: 10px !important;
        }

        #programacaoSgqScreen .programacao-modal {
          width: 100% !important;
          max-height: calc(100dvh - 20px) !important;
          padding: 16px !important;
          border-radius: 18px !important;
        }

        #programacaoSgqScreen .programacao-modal-grid {
          grid-template-columns: 1fr !important;
        }

        #programacaoSgqScreen .programacao-modal-field.full {
          grid-column: auto !important;
        }

        #programacaoSgqScreen .programacao-modal-field input,
        #programacaoSgqScreen .programacao-modal-field select {
          height: 46px !important;
          font-size: 16px !important;
        }

        #programacaoSgqScreen .programacao-modal-actions button {
          min-height: 46px !important;
          font-size: 13px !important;
        }
      }

      @media (max-width: 390px) {
        #programacaoSgqScreen .programacao-mobile-buttons {
          gap: 5px !important;
        }

        #programacaoSgqScreen .programacao-mobile-action {
          height: 50px !important;
          border-radius: 12px !important;
        }

        #programacaoSgqScreen .programacao-mobile-action svg {
          width: 21px !important;
          height: 21px !important;
        }
      }

      @media print {
        .programacao-mobile-toolbar,
        .programacao-mobile-section-head {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function sincronizar_() {
    garantirToolbarMobile_();
    garantirCabecalhosMobile_();

    const mobileSearch = document.getElementById('programacaoSgqSearchMobile');
    if (mobileSearch && mobileSearch.value !== String(window.programacaoSgqBusca || '')) {
      mobileSearch.value = String(window.programacaoSgqBusca || '');
    }
  }

  instalarEstilos_();
  sincronizar_();

  const renderOriginal = window.renderProgramacaoSgq;
  if (typeof renderOriginal === 'function') {
    window.renderProgramacaoSgq = function () {
      const result = renderOriginal.apply(this, arguments);
      sincronizar_();
      return result;
    };
  }

  const turno = document.getElementById('programacaoSgqTurno');
  if (turno) {
    turno.addEventListener('change', () => {
      setTimeout(garantirCabecalhosMobile_, 0);
    });
  }

  window.addEventListener('resize', sincronizar_, { passive: true });
})();
