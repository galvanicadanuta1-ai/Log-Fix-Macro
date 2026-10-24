/* ============================================================
   PROGRAMAÇÃO SGQ - IMPRESSÃO FIEL À TELA / RETRATO
   ============================================================
   Regras:
   - botão da impressora usa a mesma impressão nativa do Ctrl+P;
   - A4 retrato;
   - Programação SGQ em largura total;
   - OPs de 1 caixa abaixo, também em largura total;
   - títulos + turno/data + cabeçalhos repetem pelo THEAD;
   - Prioridade vazia imprime vazia;
   - URGENTE vira texto estático para não cortar.
   ============================================================ */

(function () {
  const STYLE_ID = 'programacaoImpressaoFielStyle';
  const PRINT_TEXT_CLASS = 'programacao-prioridade-print-text';

  function garantirEstilo_() {
    let style = document.getElementById(STYLE_ID);
    if (style) style.remove();

    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #programacaoSgqScreen .programacao-status-input {
        font-size: 11px !important;
        padding-left: 4px !important;
        padding-right: 4px !important;
        letter-spacing: 0 !important;
        text-overflow: clip !important;
      }

      #programacaoSgqScreen .${PRINT_TEXT_CLASS} {
        display: none;
      }

      @media print {
        @page {
          size: A4 portrait !important;
          margin: 6mm !important;
        }

        html,
        body {
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }

        body > * {
          display: none !important;
        }

        #programacaoSgqScreen {
          display: block !important;
          visibility: visible !important;
          position: static !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #programacaoSgqScreen * {
          visibility: visible !important;
        }

        #programacaoSgqScreen .no-print,
        #programacaoSgqScreen > .programacao-page > .programacao-sheet > .programacao-header,
        #programacaoSgqScreen .programacao-loading,
        #programacaoSgqScreen .programacao-empty,
        #programacaoSgqScreen .programacao-status-message {
          display: none !important;
        }

        #programacaoSgqScreen .programacao-page,
        #programacaoSgqScreen .programacao-sheet,
        #programacaoSgqScreen .programacao-table-wrap {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          box-shadow: none !important;
          overflow: visible !important;
        }

        #programacaoSgqScreen .programacao-subinfo {
          display: flex !important;
          min-height: 5mm !important;
          margin: 0 0 2mm !important;
          padding: 0 !important;
          font-size: 7.5pt !important;
          color: #334155 !important;
        }

        /* IMPORTANTE: um bloco embaixo do outro */
        #programacaoSgqScreen .programacao-dual-grid {
          display: block !important;
          width: 100% !important;
        }

        #programacaoSgqScreen .programacao-bloco,
        #programacaoSgqScreen .programacao-bloco-principal,
        #programacaoSgqScreen .programacao-bloco-uma-caixa {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          border-left: 0 !important;
          padding-left: 0 !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        #programacaoSgqScreen .programacao-bloco-principal {
          margin: 0 !important;
          padding: 0 !important;
        }

        #programacaoSgqScreen .programacao-bloco-uma-caixa,
        #programacaoSgqScreen .programacao-bloco + .programacao-bloco {
          border-left: 0 !important;
          border-top: 1px solid #cbd5e1 !important;
          margin-top: 5mm !important;
          padding-left: 0 !important;
          padding-top: 4mm !important;
        }

        #programacaoSgqScreen .programacao-table {
          display: table !important;
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }

        #programacaoSgqScreen .programacao-table thead {
          display: table-header-group !important;
        }

        #programacaoSgqScreen .programacao-repeat-panel {
          display: table-row !important;
        }

        #programacaoSgqScreen .programacao-repeat-panel > th {
          display: table-cell !important;
          padding: 0 0 1mm !important;
          background: #fff !important;
          border-top: 0 !important;
          border-left: 0 !important;
          border-right: 0 !important;
          border-bottom: 1px solid #334155 !important;
        }

        #programacaoSgqScreen .programacao-bloco-cabecalho {
          display: grid !important;
          grid-template-columns: 24mm 1fr 24mm !important;
          align-items: center !important;
          min-height: 13mm !important;
          margin: 0 !important;
          padding: 0 0 1mm !important;
          border: 0 !important;
          background: #fff !important;
        }

        #programacaoSgqScreen .programacao-bloco-logo {
          display: block !important;
          max-width: 22mm !important;
          max-height: 10mm !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          justify-self: start !important;
        }

        #programacaoSgqScreen .programacao-bloco-titulos {
          grid-column: 2 !important;
          text-align: center !important;
          min-width: 0 !important;
        }

        #programacaoSgqScreen .programacao-bloco-titulo {
          display: block !important;
          font-size: 12pt !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          white-space: nowrap !important;
          color: #111827 !important;
        }

        #programacaoSgqScreen .programacao-bloco-subtitulo {
          display: block !important;
          margin-top: .8mm !important;
          font-size: 8pt !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          white-space: nowrap !important;
          color: #991b1b !important;
        }

        #programacaoSgqScreen .programacao-column-head {
          display: table-row !important;
        }

        #programacaoSgqScreen .programacao-column-head th,
        #programacaoSgqScreen .programacao-table thead tr:last-child th {
          display: table-cell !important;
          background: #e9eef2 !important;
          color: #111827 !important;
          font-size: 7.2pt !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          padding: 1.15mm .45mm !important;
          border: 1px solid #4b5563 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        #programacaoSgqScreen .programacao-table tbody {
          display: table-row-group !important;
        }

        #programacaoSgqScreen .programacao-table tbody tr {
          display: table-row !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        #programacaoSgqScreen .programacao-table tbody td {
          display: table-cell !important;
          font-size: 9pt !important;
          line-height: 1.02 !important;
          font-weight: 700 !important;
          padding: 1.15mm .55mm !important;
          height: 7mm !important;
          vertical-align: middle !important;
          border: 1px solid #4b5563 !important;
          color: #111827 !important;
          background: #fff !important;
        }

        #programacaoSgqScreen .programacao-table tr.programacao-urgente td {
          background: #fff4f4 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Principal: Data | OP | Caixas | Caçamba | Cor | Kgs | Prioridade | OK | Enc. */
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(1),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(1) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(2),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(2) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(3),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(3) { width: 9% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(4),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(4) { width: 10% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(5),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(5) { width: 22% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(6),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(6) { width: 9% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(7),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(7) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(8),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(8) { width: 7% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(9),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(9) { width: 7% !important; }

        /* 1 caixa: Data | OP | Caixas | Cor | Kgs | Prioridade | OK */
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(1),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(1) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(2),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(2) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(3),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(3) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(4),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(4) { width: 30% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(5),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(5) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(6),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(6) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(7),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(7) { width: 6% !important; }

        /* Na impressão usa texto real, nunca o placeholder do input. */
        #programacaoSgqScreen .programacao-status-input {
          display: none !important;
        }

        #programacaoSgqScreen .${PRINT_TEXT_CLASS} {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
          white-space: nowrap !important;
          overflow: visible !important;
          font-size: 8.5pt !important;
          font-weight: 700 !important;
          line-height: 1.1 !important;
          color: #111827 !important;
        }

        #programacaoSgqScreen tr.programacao-urgente .${PRINT_TEXT_CLASS} {
          color: #b91c1c !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
        }

        #programacaoSgqScreen .programacao-check {
          width: 3.5mm !important;
          height: 3.5mm !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function prepararPrioridadesParaImpressao_() {
    document
      .querySelectorAll('#programacaoSgqScreen .programacao-status-input')
      .forEach(input => {
        const td = input.closest('td');
        if (!td) return;

        let texto = td.querySelector('.' + PRINT_TEXT_CLASS);
        if (!texto) {
          texto = document.createElement('span');
          texto.className = PRINT_TEXT_CLASS;
          td.appendChild(texto);
        }

        texto.textContent = String(input.value || '').trim();
      });
  }

  function temDadosProgramacao_() {
    try {
      if (typeof programacaoSgqRows !== 'undefined' && Array.isArray(programacaoSgqRows)) {
        return programacaoSgqRows.length > 0;
      }
    } catch (e) {}

    return document.querySelectorAll(
      '#programacaoSgqBody tr, #programacaoSgqBodyUmaCaixa tr'
    ).length > 0;
  }

  window.imprimirProgramacaoSgq = function () {
    if (typeof atualizarDataProgramacaoSgq === 'function') {
      atualizarDataProgramacaoSgq();
    }

    if (typeof atualizarTituloTurnoProgramacaoSgq === 'function') {
      atualizarTituloTurnoProgramacaoSgq();
    }

    if (typeof renderProgramacaoSgq === 'function') {
      renderProgramacaoSgq();
    }

    if (!temDadosProgramacao_()) {
      alert('Não existem OPs na programação para imprimir.');
      return;
    }

    garantirEstilo_();
    prepararPrioridadesParaImpressao_();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  /* Também vale para Ctrl+P nativo. */
  window.addEventListener('beforeprint', () => {
    garantirEstilo_();
    prepararPrioridadesParaImpressao_();
  });

  garantirEstilo_();
})();
