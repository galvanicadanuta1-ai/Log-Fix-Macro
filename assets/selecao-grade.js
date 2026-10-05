/* ============================================================
   SELEÇÃO ESTILO EXCEL - GRADES OPERACIONAIS
   ============================================================
   - arrastar para selecionar um intervalo;
   - clicar no cabeçalho para selecionar uma coluna;
   - clicar na célula Data (primeira coluna) para selecionar a linha;
   - Ctrl+A dentro da grade seleciona todos os dados;
   - Delete apaga o intervalo selecionado;
   - se já estiver salvo, a exclusão também é persistida na planilha,
     Histórico e Conciliação pelas rotinas existentes.
   ============================================================ */

(function () {
  let selecao = null;
  let ancora = null;
  let arrastando = false;
  let moveuDuranteArrasto = false;

  function gridAtiva_() {
    const screen = document.getElementById('systemScreen');
    return Boolean(screen && screen.classList.contains('active'));
  }

  function grid_() {
    return document.getElementById('grid');
  }

  function totalColunas_() {
    try {
      return getPageConfig().headers.length;
    } catch (e) {
      return 0;
    }
  }

  function totalLinhas_() {
    return Array.isArray(rows) ? rows.length : 0;
  }

  function coordenadaCelula_(target) {
    const grid = grid_();
    if (!grid || !target) return null;

    const td = target.closest ? target.closest('#grid tbody td') : null;
    if (!td || !grid.contains(td)) return null;

    const tr = td.closest('tr[data-row-id]');
    if (!tr) return null;

    const r = rows.findIndex(item => String(item.id) === String(tr.dataset.rowId));
    if (r < 0) return null;

    return {
      r,
      c: td.cellIndex,
      td,
      tr,
      rowId: tr.dataset.rowId
    };
  }

  function normalizarSelecao_(a, b, modo) {
    if (!a || !b) return null;

    const maxR = Math.max(totalLinhas_() - 1, 0);
    const maxC = Math.max(totalColunas_() - 1, 0);

    let r1 = Math.max(0, Math.min(a.r, b.r));
    let r2 = Math.min(maxR, Math.max(a.r, b.r));
    let c1 = Math.max(0, Math.min(a.c, b.c));
    let c2 = Math.min(maxC, Math.max(a.c, b.c));

    if (modo === 'linha') {
      c1 = 0;
      c2 = maxC;
    } else if (modo === 'coluna') {
      r1 = 0;
      r2 = maxR;
      c1 = c2 = a.c;
    } else if (modo === 'tudo') {
      r1 = 0;
      r2 = maxR;
      c1 = maxC >= 1 ? 1 : 0;
      c2 = maxC;
    }

    return { r1, r2, c1, c2, modo: modo || 'intervalo' };
  }

  function limparVisual_() {
    const grid = grid_();
    if (!grid) return;

    grid.querySelectorAll('.grid-cell-selected').forEach(el => {
      el.classList.remove(
        'grid-cell-selected',
        'grid-selection-top',
        'grid-selection-bottom',
        'grid-selection-left',
        'grid-selection-right'
      );
    });

    grid.querySelectorAll('thead th.grid-header-selected').forEach(el => {
      el.classList.remove('grid-header-selected');
    });
  }

  function aplicarVisual_() {
    limparVisual_();
    if (!selecao) return;

    const grid = grid_();
    if (!grid) return;

    const trs = Array.from(grid.querySelectorAll('tbody tr[data-row-id]'));

    for (let r = selecao.r1; r <= selecao.r2; r++) {
      const tr = trs[r];
      if (!tr) continue;

      const tds = Array.from(tr.children);

      for (let c = selecao.c1; c <= selecao.c2; c++) {
        const td = tds[c];
        if (!td) continue;

        td.classList.add('grid-cell-selected');
        if (r === selecao.r1) td.classList.add('grid-selection-top');
        if (r === selecao.r2) td.classList.add('grid-selection-bottom');
        if (c === selecao.c1) td.classList.add('grid-selection-left');
        if (c === selecao.c2) td.classList.add('grid-selection-right');
      }
    }

    if (selecao.modo === 'coluna') {
      const th = grid.querySelector('thead tr th:nth-child(' + (selecao.c1 + 1) + ')');
      if (th) th.classList.add('grid-header-selected');
    }
  }

  function definirSelecao_(a, b, modo) {
    selecao = normalizarSelecao_(a, b, modo);
    aplicarVisual_();
  }

  function limparSelecao_() {
    selecao = null;
    ancora = null;
    arrastando = false;
    moveuDuranteArrasto = false;
    document.body.classList.remove('grid-selecting');
    limparVisual_();
  }

  function cabecalhoClicado_(event) {
    if (!gridAtiva_()) return;

    const th = event.target.closest ? event.target.closest('#grid thead th') : null;
    if (!th) return;

    const c = th.cellIndex;
    if (c < 0 || c >= totalColunas_()) return;

    event.preventDefault();
    ancora = { r: 0, c };
    definirSelecao_({ r: 0, c }, { r: Math.max(totalLinhas_() - 1, 0), c }, 'coluna');
  }

  function iniciarSelecao_(event) {
    if (!gridAtiva_() || event.button !== 0) return;

    const coord = coordenadaCelula_(event.target);
    if (!coord) return;

    /* A primeira coluna é somente leitura: funciona como seletor da linha. */
    if (coord.c === 0) {
      event.preventDefault();
      ancora = { r: coord.r, c: 0 };
      definirSelecao_(ancora, ancora, 'linha');
      return;
    }

    arrastando = true;
    moveuDuranteArrasto = false;
    document.body.classList.add('grid-selecting');

    if (event.shiftKey && ancora) {
      definirSelecao_(ancora, coord, 'intervalo');
    } else {
      ancora = { r: coord.r, c: coord.c };
      definirSelecao_(ancora, coord, 'intervalo');
    }
  }

  function continuarSelecao_(event) {
    if (!arrastando || !gridAtiva_()) return;

    const coord = coordenadaCelula_(event.target);
    if (!coord || !ancora) return;

    if (coord.r !== ancora.r || coord.c !== ancora.c) {
      moveuDuranteArrasto = true;
    }

    if (moveuDuranteArrasto) {
      event.preventDefault();
      definirSelecao_(ancora, coord, 'intervalo');
    }
  }

  function finalizarSelecao_() {
    if (!arrastando) return;
    arrastando = false;
    document.body.classList.remove('grid-selecting');
  }

  function colunaEditavel_(colIndex) {
    if (colIndex <= 0) return false;

    const cfg = getPageConfig();
    const header = cfg.headers[colIndex];

    if (
      currentPage === 'RECEBIMENTO' &&
      (header === 'Diferença' || header === 'Diferença em %')
    ) {
      return false;
    }

    return true;
  }

  function linhasSelecionadas_() {
    if (!selecao) return [];

    const lista = [];
    for (let r = selecao.r1; r <= selecao.r2; r++) {
      if (rows[r]) lista.push(rows[r]);
    }
    return lista;
  }

  async function persistirExclusao_(afetadas) {
    if (!afetadas.length) return;

    cancelarTimers();
    salvamentoEmLote = true;

    const botao = document.getElementById('reportButton');
    if (botao) {
      botao.disabled = true;
      botao.textContent = 'SALVANDO DADOS...';
    }

    setStatus('Atualizando dados apagados...', 'saving');

    try {
      const date = document.getElementById('selectedDate').value || hojeISO();
      const apagar = afetadas.filter(row => row.sheetRow && linhaSemDados(row));
      const manter = afetadas.filter(row => !linhaSemDados(row));

      /* Exclui primeiro as linhas totalmente vazias para limpar também o Histórico. */
      for (const row of apagar) {
        await chamarApiAppsScript('limparLinha', [currentPage, row.sheetRow]);
        row.sheetRow = null;
        row.saving = false;
      }

      if (manter.length) {
        const payload = manter.map(row => ({
          clientId: row.id,
          sheetRow: row.sheetRow,
          values: row.values.slice()
        }));

        const result = await chamarApiAppsScript('salvarLinhasEmLote', [
          currentPage,
          date,
          payload
        ]);

        const salvas = result && Array.isArray(result.rows) ? result.rows : [];

        salvas.forEach(item => {
          const row = rows.find(r => r.id === item.clientId);
          if (!row) return;
          row.sheetRow = item.sheetRow;
          row.saving = false;
          if (Array.isArray(item.values)) row.values = item.values.slice();
        });
      }

      garantirDuasLinhasVazias();
      renderTable();
      setStatus('Alterações salvas • Histórico e Conciliação atualizados', 'saved');
    } catch (error) {
      setStatus(
        error && error.message ? error.message : 'Erro ao apagar os dados selecionados.',
        'error'
      );
      alert(
        (error && error.message) ||
        'Não foi possível apagar todos os dados selecionados.'
      );
    } finally {
      salvamentoEmLote = false;

      if (botao) {
        botao.disabled = false;
        botao.textContent = 'GERAR RELATÓRIO';
      }

      limparSelecao_();
    }
  }

  function apagarSelecao_() {
    if (!selecao || !gridAtiva_()) return false;

    const afetadas = linhasSelecionadas_();
    const unicas = new Map();

    afetadas.forEach(row => {
      if (!row) return;

      for (let c = selecao.c1; c <= selecao.c2; c++) {
        if (!colunaEditavel_(c)) continue;
        row.values[c] = '';
      }

      if (currentPage === 'RECEBIMENTO' && typeof recalcularRecebimentoModelo === 'function') {
        recalcularRecebimentoModelo(row);
      }

      unicas.set(row.id, row);
    });

    garantirDuasLinhasVazias();
    renderTable();

    persistirExclusao_(Array.from(unicas.values()));
    return true;
  }

  function selecionarTudo_() {
    const maxR = Math.max(totalLinhas_() - 1, 0);
    const maxC = Math.max(totalColunas_() - 1, 0);

    if (maxC < 1) return;

    ancora = { r: 0, c: 1 };
    definirSelecao_(ancora, { r: maxR, c: maxC }, 'tudo');
  }

  async function copiarSelecao_() {
    if (!selecao || !navigator.clipboard || !navigator.clipboard.writeText) return false;

    const linhas = [];

    for (let r = selecao.r1; r <= selecao.r2; r++) {
      const row = rows[r];
      if (!row) continue;

      const valores = [];
      for (let c = selecao.c1; c <= selecao.c2; c++) {
        valores.push(String(row.values[c] == null ? '' : row.values[c]));
      }
      linhas.push(valores.join('\t'));
    }

    try {
      await navigator.clipboard.writeText(linhas.join('\n'));
      return true;
    } catch (e) {
      return false;
    }
  }

  function tecladoGlobal_(event) {
    if (!gridAtiva_()) return;

    const target = event.target;
    const dentroGrid = target && target.closest && target.closest('#grid');

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && dentroGrid) {
      event.preventDefault();
      selecionarTudo_();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selecao && dentroGrid) {
      if (
        selecao.r1 !== selecao.r2 ||
        selecao.c1 !== selecao.c2 ||
        selecao.modo === 'linha' ||
        selecao.modo === 'coluna' ||
        selecao.modo === 'tudo'
      ) {
        event.preventDefault();
        copiarSelecao_();
      }
      return;
    }

    if (event.key === 'Escape' && selecao) {
      event.preventDefault();
      limparSelecao_();
      return;
    }

    const multipla = selecao && (
      selecao.r1 !== selecao.r2 ||
      selecao.c1 !== selecao.c2 ||
      selecao.modo === 'linha' ||
      selecao.modo === 'coluna' ||
      selecao.modo === 'tudo'
    );

    if (selecao && (event.key === 'Delete' || (event.key === 'Backspace' && multipla))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      apagarSelecao_();
    }
  }

  function injetarCss_() {
    if (document.getElementById('gridSelectionStyles')) return;

    const style = document.createElement('style');
    style.id = 'gridSelectionStyles';
    style.textContent = `
      #grid tbody td.grid-cell-selected {
        background: #dbeafe !important;
      }
      #grid tbody td.grid-cell-selected .cell-input {
        background: transparent !important;
      }
      #grid tbody td.grid-selection-top { border-top: 2px solid #2563eb !important; }
      #grid tbody td.grid-selection-bottom { border-bottom: 2px solid #2563eb !important; }
      #grid tbody td.grid-selection-left { border-left: 2px solid #2563eb !important; }
      #grid tbody td.grid-selection-right { border-right: 2px solid #2563eb !important; }
      #grid thead th.grid-header-selected {
        background: #bfdbfe !important;
        box-shadow: inset 0 -2px 0 #2563eb;
      }
      #grid thead th { cursor: pointer; }
      #grid tbody td.date-cell { cursor: pointer; }
      #grid tbody td.date-cell::after {
        content: '';
        position: absolute;
        left: 2px;
        top: 50%;
        width: 3px;
        height: 18px;
        transform: translateY(-50%);
        border-radius: 2px;
        background: #94a3b8;
        opacity: .55;
      }
      body.grid-selecting, body.grid-selecting * {
        user-select: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener('mousedown', event => {
    if (event.target.closest && event.target.closest('#grid thead th')) {
      cabecalhoClicado_(event);
      return;
    }
    iniciarSelecao_(event);
  }, true);

  document.addEventListener('mouseover', continuarSelecao_, true);
  document.addEventListener('mouseup', finalizarSelecao_, true);
  document.addEventListener('keydown', tecladoGlobal_, true);

  /* Se a grade for redesenhada, reaplica a marcação selecionada. */
  const observer = new MutationObserver(() => {
    if (selecao && gridAtiva_()) {
      requestAnimationFrame(aplicarVisual_);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    injetarCss_();
    const grid = grid_();
    if (grid) observer.observe(grid, { childList: true, subtree: true });
  });

  window.limparSelecaoGradeOperacional = limparSelecao_;
})();
