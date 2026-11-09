/* Correção final da Programação: executa APÓS os overrides antigos.
   Preserva prioridade, pesquisa, seleção, gravação e os dados em memória. */
(function () {
  'use strict';
  const VERSAO = 'processo-larguras-final-20261109';
  const screen = document.getElementById('programacaoSgqScreen');
  if (!screen) return;

  function incluirCabecalhos_() {
    screen.querySelectorAll('.programacao-bloco .programacao-table').forEach(table => {
      const cab = table.querySelector('thead .programacao-column-head') ||
                  table.querySelector('thead tr:last-child');
      if (!cab || cab.querySelector('.col-processo')) return;
      const peso = Array.from(cab.querySelectorAll('th')).find(th =>
        /^(kgs|peso|peso danuta)$/i.test((th.textContent || '').trim()));
      if (!peso) return;
      const novo = document.createElement('th');
      novo.className = 'col-processo';
      novo.textContent = 'Processo';
      peso.after(novo);
      const topo = table.querySelector('thead .programacao-repeat-panel th[colspan]');
      if (topo) topo.colSpan = cab.querySelectorAll('th').length;
    });
  }

  function adicionarProcessoNaLinha_(tr, item) {
    if (!tr || tr.querySelector('.col-processo')) return tr;
    const peso = tr.querySelector('.col-peso');
    if (!peso) return tr;
    const td = document.createElement('td');
    td.className = 'col-processo';
    td.textContent = item && item.processo != null ? String(item.processo) : '';
    td.title = td.textContent;
    peso.after(td);
    return tr;
  }

  const layoutAnterior = window.garantirLayoutProgramacaoDividida_;
  if (typeof layoutAnterior === 'function') {
    window.garantirLayoutProgramacaoDividida_ = function () {
      const resultado = layoutAnterior.apply(this, arguments);
      incluirCabecalhos_();
      return resultado;
    };
  }

  const linhaAnterior = window.criarLinhaProgramacaoSgq_;
  if (typeof linhaAnterior === 'function') {
    window.criarLinhaProgramacaoSgq_ = function (item) {
      const tr = linhaAnterior.apply(this, arguments);
      return adicionarProcessoNaLinha_(tr, item);
    };
  }

  const renderAnterior = window.renderProgramacaoSgq;
  if (typeof renderAnterior === 'function') {
    window.renderProgramacaoSgq = function () {
      const resultado = renderAnterior.apply(this, arguments);
      incluirCabecalhos_();
      return resultado;
    };
  }

  const css = document.createElement('style');
  css.id = 'programacao-processo-larguras-final';
  css.dataset.version = VERSAO;
  css.textContent = `
    @media screen {
      #programacaoSgqScreen .programacao-page,
      #programacaoSgqScreen .programacao-sheet {
        max-width: 1400px !important;
        width: 100% !important;
      }
      #programacaoSgqScreen .programacao-dual-grid {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 14px !important;
      }
      #programacaoSgqScreen .programacao-bloco + .programacao-bloco {
        border-left: 0 !important;
        border-top: 1px dashed #94a3b8 !important;
        padding-left: 0 !important;
        padding-top: 10px !important;
      }
      #programacaoSgqScreen .programacao-table-wrap,
      #programacaoSgqScreen .programacao-bloco {
        min-width: 0 !important;
        overflow-x: auto !important;
      }
      #programacaoSgqScreen .programacao-table {
        width: 100% !important;
        min-width: 940px !important;
        table-layout: fixed !important;
      }
      #programacaoSgqScreen .programacao-table .programacao-column-head th,
      #programacaoSgqScreen .programacao-table tbody td {
        box-sizing: border-box !important;
        overflow: visible !important;
        text-overflow: clip !important;
        padding: 3px 2px !important;
      }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(1),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(1) { width: 8% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(2),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(2) { width: 7% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(3),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(3) { width: 7% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(4),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(4) { width: 7% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(5),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(5) { width: 32% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(6),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(6) { width: 7% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(7),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(7) { width: 14% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(8),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(8) { width: 14% !important; }
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(9),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(9),
      #programacaoSgqScreen .programacao-bloco-principal .programacao-column-head th:nth-child(10),
      #programacaoSgqScreen .programacao-bloco-principal tbody td:nth-child(10) { width: 2% !important; }

      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(1),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(1) { width: 8% !important; }
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(2),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(2) { width: 8% !important; }
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(3),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(3) { width: 7% !important; }
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(4),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(4) { width: 36% !important; }
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(5),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(5) { width: 8% !important; }
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(6),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(6) { width: 15% !important; }
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(7),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(7) { width: 14% !important; }
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(8),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(8),
      #programacaoSgqScreen .programacao-bloco-uma-caixa .programacao-column-head th:nth-child(9),
      #programacaoSgqScreen .programacao-bloco-uma-caixa tbody td:nth-child(9) { width: 2% !important; }

      #programacaoSgqScreen .programacao-table tbody td:not(.col-cor) {
        white-space: nowrap !important;
        font-size: 10px !important;
      }
      #programacaoSgqScreen .programacao-table tbody td.col-cor {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
        font-size: 11px !important;
        line-height: 1.15 !important;
        text-align: left !important;
        padding: 3px 5px !important;
      }
      #programacaoSgqScreen .programacao-table .col-processo {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        font-size: 10px !important;
        text-align: center !important;
      }
      #programacaoSgqScreen .programacao-table tbody td.col-ok,
      #programacaoSgqScreen .programacao-table tbody td.col-enc {
        padding: 1px 0 !important;
      }
      #programacaoSgqScreen .programacao-table .programacao-check {
        width: 12px !important;
        height: 12px !important;
        margin: 0 !important;
      }
      #programacaoSgqScreen .programacao-table .programacao-status-input {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        font-size: 10px !important;
        padding: 2px 1px !important;
      }
    }
    @media print {
      #programacaoSgqScreen .programacao-table .col-processo {
        white-space: normal !important;
        font-size: 7pt !important;
      }
      #programacaoSgqScreen .programacao-table .col-cor {
        white-space: normal !important;
        overflow: visible !important;
        overflow-wrap: anywhere !important;
        text-overflow: clip !important;
      }
    }
  `;
  document.head.appendChild(css);
  incluirCabecalhos_();
})();
