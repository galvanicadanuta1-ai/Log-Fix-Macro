/* ============================================================
   PROGRAMAÇÃO SGQ - LAYOUT RETRATO
   ============================================================
   Mantém toda a lógica existente e altera somente a apresentação:
   - Programação principal em largura total;
   - OPs de 1 caixa logo abaixo;
   - tela centralizada com proporção mais próxima de A4 retrato;
   - impressão em A4 retrato;
   - títulos/cabeçalhos continuam dentro do THEAD e repetem nas novas páginas;
   - Prioridade preserva o tratamento já existente para vazio/Urgente.
   ============================================================ */

(function () {
  const STYLE_ID = 'programacaoRetratoStyle';

  function aplicarEstiloRetrato_() {
    const antigo = document.getElementById(STYLE_ID);
    if (antigo) antigo.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* ======================== TELA ======================== */
      #programacaoSgqScreen .programacao-page {
        max-width: 1080px !important;
      }

      #programacaoSgqScreen .programacao-dual-grid {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 22px !important;
        width: 100% !important;
        align-items: start !important;
      }

      #programacaoSgqScreen .programacao-bloco,
      #programacaoSgqScreen .programacao-bloco-principal,
      #programacaoSgqScreen .programacao-bloco-uma-caixa {
        width: 100% !important;
        min-width: 0 !important;
      }

      #programacaoSgqScreen .programacao-bloco + .programacao-bloco {
        border-left: 0 !important;
        padding-left: 0 !important;
        border-top: 1px solid #cbd5e1 !important;
        padding-top: 16px !important;
      }

      #programacaoSgqScreen .programacao-table {
        width: 100% !important;
        min-width: 0 !important;
        table-layout: fixed !important;
      }

      #programacaoSgqScreen .programacao-bloco-cabecalho {
        min-height: 58px !important;
        grid-template-columns: 88px 1fr 88px !important;
      }

      #programacaoSgqScreen .programacao-bloco-logo {
        max-width: 82px !important;
        max-height: 42px !important;
      }

      #programacaoSgqScreen .programacao-bloco-titulo {
        font-size: 19px !important;
      }

      #programacaoSgqScreen .programacao-bloco-subtitulo {
        font-size: 11px !important;
      }

      #programacaoSgqScreen .programacao-table th {
        font-size: 11px !important;
        padding: 6px 3px !important;
      }

      #programacaoSgqScreen .programacao-table td {
        font-size: 14px !important;
        padding: 6px 4px !important;
      }

      /* Programação principal: Data | OP | Caixas | Caçamba | Cor | Kgs | Prioridade | OK | Enc. */
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(1),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(1) { width: 11% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(2),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(2) { width: 11% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(3),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(3) { width: 9% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(4),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(4) { width: 10% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(5),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(5) { width: 23% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(6),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(6) { width: 9% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(7),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(7) { width: 13% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(8),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(8) { width: 7% !important; }
      #programacaoSgqScreen .programacao-bloco-principal th:nth-child(9),
      #programacaoSgqScreen .programacao-bloco-principal td:nth-child(9) { width: 7% !important; }

      /* OPs de 1 caixa: Data | OP | Caixas | Cor | Kgs | Prioridade | OK */
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

      #programacaoSgqScreen .programacao-status-input {
        font-size: 12px !important;
        letter-spacing: 0 !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
      }

      /* ====================== IMPRESSÃO ====================== */
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
        }

        #programacaoSgqScreen,
        #programacaoSgqScreen .programacao-page,
        #programacaoSgqScreen .programacao-sheet,
        #programacaoSgqScreen .programacao-table-wrap {
          width: 100% !important;
          max-width: none !important;
        }

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

        #programacaoSgqScreen .programacao-bloco-uma-caixa {
          border-top: 1px solid #cbd5e1 !important;
          margin-top: 5mm !important;
          padding-top: 4mm !important;
        }

        #programacaoSgqScreen .programacao-table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }

        /* Mantém título + turno/data + cabeçalhos repetidos a cada página. */
        #programacaoSgqScreen .programacao-table thead {
          display: table-header-group !important;
        }

        #programacaoSgqScreen .programacao-repeat-panel {
          display: table-row !important;
        }

        #programacaoSgqScreen .programacao-bloco-cabecalho {
          display: grid !important;
          grid-template-columns: 24mm 1fr 24mm !important;
          min-height: 13mm !important;
          padding: 0 0 1mm !important;
        }

        #programacaoSgqScreen .programacao-bloco-logo {
          max-width: 22mm !important;
          max-height: 10mm !important;
        }

        #programacaoSgqScreen .programacao-bloco-titulo {
          font-size: 12pt !important;
        }

        #programacaoSgqScreen .programacao-bloco-subtitulo {
          font-size: 8pt !important;
        }

        #programacaoSgqScreen .programacao-column-head th,
        #programacaoSgqScreen .programacao-table thead tr:last-child th {
          font-size: 7.2pt !important;
          padding: 1.15mm .45mm !important;
        }

        #programacaoSgqScreen .programacao-table tbody td {
          font-size: 9pt !important;
          padding: 1.15mm .55mm !important;
          height: 7mm !important;
        }

        /* Espaço confortável para URGENTE sem cortar. */
        #programacaoSgqScreen .programacao-bloco-principal th:nth-child(7),
        #programacaoSgqScreen .programacao-bloco-principal td:nth-child(7) { width: 14% !important; }
        #programacaoSgqScreen .programacao-bloco-uma-caixa th:nth-child(6),
        #programacaoSgqScreen .programacao-bloco-uma-caixa td:nth-child(6) { width: 15% !important; }

        #programacaoSgqScreen .programacao-prioridade-print-text {
          font-size: 8.5pt !important;
          white-space: nowrap !important;
        }
      }

      @media (max-width: 800px) {
        #programacaoSgqScreen .programacao-page {
          max-width: none !important;
        }

        #programacaoSgqScreen .programacao-table {
          min-width: 760px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  aplicarEstiloRetrato_();
})();
