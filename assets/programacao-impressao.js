/* ============================================================
   PROGRAMAÇÃO SGQ - IMPRESSÃO FIEL À TELA
   ============================================================
   Usa a própria grade já renderizada na tela para que a impressão saia
   exatamente com os dois blocos visuais atuais.

   Regras:
   - mostra logo + título + turno/data dos dois blocos;
   - repete esses cabeçalhos em TODAS as páginas via THEAD;
   - mantém os cabeçalhos das colunas em todas as páginas;
   - mostra o resumo no topo da primeira página;
   - garante espaço para a palavra URGENTE inteira;
   - não altera dados, backend ou regras de ordenação.
   ============================================================ */

(function () {
  const STYLE_ID = 'programacaoImpressaoFielStyle';

  function garantirEstilo_() {
    let style = document.getElementById(STYLE_ID);
    if (style) style.remove();

    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Prioridade também precisa caber inteira na própria tela. */
      #programacaoSgqScreen .programacao-status-input {
        font-size: 11px !important;
        padding-left: 2px !important;
        padding-right: 2px !important;
        letter-spacing: -0.15px !important;
        text-overflow: clip !important;
      }

      #programacaoSgqScreen .programacao-bloco-principal .programacao-table th:nth-child(7),
      #programacaoSgqScreen .programacao-bloco-principal .programacao-table td:nth-child(7) {
        width: 12.5% !important;
      }

      #programacaoSgqScreen .programacao-bloco-principal .programacao-table th:nth-child(5),
      #programacaoSgqScreen .programacao-bloco-principal .programacao-table td:nth-child(5) {
        width: 20.5% !important;
      }

      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-table th:nth-child(6),
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-table td:nth-child(6) {
        width: 14% !important;
      }

      @media print {
        @page {
          size: A4 landscape;
          margin: 4mm;
        }

        html,
        body {
          width: 100% !important;
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

        /* Resumo exatamente como na tela, porém sem a mensagem de salvamento. */
        #programacaoSgqScreen .programacao-subinfo {
          display: flex !important;
          min-height: 5mm !important;
          margin: 0 0 1.5mm !important;
          padding: 0 !important;
          font-size: 7.5pt !important;
          color: #334155 !important;
        }

        #programacaoSgqScreen .programacao-dual-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          gap: 2.5mm !important;
          width: 100% !important;
          align-items: start !important;
        }

        #programacaoSgqScreen .programacao-bloco,
        #programacaoSgqScreen .programacao-bloco-principal,
        #programacaoSgqScreen .programacao-bloco-uma-caixa {
          display: block !important;
          min-width: 0 !important;
          padding-top: 0 !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        #programacaoSgqScreen .programacao-bloco + .programacao-bloco {
          border-left: 1px solid #cbd5e1 !important;
          border-top: 0 !important;
          padding-left: 2.5mm !important;
        }

        #programacaoSgqScreen .programacao-table {
          display: table !important;
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }

        /*
         * O cabeçalho visual está DENTRO do THEAD no layout atual.
         * Repetir o THEAD é o que garante logo/título/turno/data e colunas
         * novamente na página 2, 3, 4...
         */
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

        /* Esta regra corrige o CSS antigo que escondia exatamente estes títulos. */
        #programacaoSgqScreen .programacao-bloco-cabecalho {
          display: grid !important;
          grid-template-columns: 19mm 1fr 19mm !important;
          align-items: center !important;
          min-height: 11mm !important;
          margin: 0 !important;
          padding: 0 0 .7mm !important;
          border: 0 !important;
          background: #fff !important;
        }

        #programacaoSgqScreen .programacao-bloco-logo {
          display: block !important;
          max-width: 18mm !important;
          max-height: 8mm !important;
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
          font-size: 10.8pt !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          white-space: nowrap !important;
          color: #111827 !important;
        }

        #programacaoSgqScreen .programacao-bloco-subtitulo {
          display: block !important;
          margin-top: .8mm !important;
          font-size: 7.5pt !important;
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
          font-size: 6.8pt !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          padding: 1mm .3mm !important;
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
          font-size: 8.2pt !important;
          line-height: 1.02 !important;
          font-weight: 700 !important;
          padding: 1mm .35mm !important;
          height: 6.3mm !important;
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

        /* Larguras equivalentes ao layout mostrado na tela. */
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(1),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(1) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(2),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(2) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(3),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(3) { width: 8% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(4),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(4) { width: 9% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(5),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(5) { width: 20% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(6),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(6) { width: 8% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(7),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(7) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(8),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(8) { width: 9% !important; }
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(9),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(9) { width: 10% !important; }

        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(1),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(1) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(2),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(2) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(3),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(3) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(4),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(4) { width: 27% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(5),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(5) { width: 11% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(6),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(6) { width: 16% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(7),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(7) { width: 7% !important; }

        #programacaoSgqScreen .programacao-status-input {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          height: 5.2mm !important;
          min-height: 5.2mm !important;
          padding: 0 .5mm !important;
          border: 1px solid #b7c0c8 !important;
          border-radius: .5mm !important;
          background: #fff !important;
          color: #111827 !important;
          font-size: 7.2pt !important;
          font-weight: 700 !important;
          line-height: 5mm !important;
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
          box-sizing: border-box !important;
        }

        #programacaoSgqScreen tr.programacao-urgente .programacao-status-input {
          color: #b91c1c !important;
          font-size: 7pt !important;
          font-weight: 900 !important;
          letter-spacing: -.1pt !important;
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

  window.imprimirProgramacaoSgq = function () {
    if (!(window.programacaoSgqRows || []).length) {
      alert('Não existem OPs na programação para imprimir.');
      return;
    }

    /* Atualiza a própria tela e imprime exatamente essa estrutura. */
    if (typeof atualizarDataProgramacaoSgq === 'function') {
      atualizarDataProgramacaoSgq();
    }

    if (typeof atualizarTituloTurnoProgramacaoSgq === 'function') {
      atualizarTituloTurnoProgramacaoSgq();
    }

    if (typeof renderProgramacaoSgq === 'function') {
      renderProgramacaoSgq();
    }

    garantirEstilo_();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  garantirEstilo_();
})();
