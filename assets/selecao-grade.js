/* ============================================================
   SGQ FIXPAR - EXPERIÊNCIA DE PLANILHA / SELEÇÃO ESTILO EXCEL
   ============================================================
   Aplicado em:
   - Recebimento
   - Saída
   - Histórico de Recebimento
   - Histórico de Saída

   Recursos:
   - clique para célula ativa;
   - arraste do mouse para selecionar intervalo;
   - clique/arraste nos cabeçalhos para selecionar coluna(s);
   - Shift + clique estende a seleção;
   - Shift + setas estende uma célula;
   - Ctrl + Shift + setas estende até a borda da tabela;
   - Ctrl + C copia a seleção como TAB/linhas, pronto para Excel;
   - botão flutuante "Copiar seleção";
   - Esc limpa a seleção;
   - Ctrl + A seleciona a tabela quando o foco não está editando texto;
   - não apaga nem altera dados.
   ============================================================ */

(function () {
  'use strict';

  const state = {
    table: null,
    anchor: null,
    focus: null,
    selection: null,
    dragging: false,
    draggingHeader: false
  };

  function screenAtiva_() {
    const sistema = document.getElementById('systemScreen');
    const historico = document.getElementById('historyScreen');

    return Boolean(
      (sistema && sistema.classList.contains('active')) ||
      (historico && historico.classList.contains('active'))
    );
  }

  function tabelaPermitida_(table) {
    if (!table) return false;
    if (table.id === 'grid') return true;
    return table.classList.contains('history-table');
  }

  function celulasDadosLinha_(tr) {
    if (!tr) return [];
    return Array.from(tr.children).filter(cell =>
      cell.tagName === 'TD' &&
      !cell.classList.contains('edit-col')
    );
  }

  function cabecalhosDados_(table) {
    if (!table) return [];
    const row = table.querySelector('thead tr');
    if (!row) return [];

    return Array.from(row.children).filter(cell =>
      cell.tagName === 'TH' &&
      !cell.classList.contains('edit-col')
    );
  }

  function linhasDados_(table) {
    if (!table) return [];
    return Array.from(table.querySelectorAll('tbody > tr'));
  }

  function ultimaLinhaComDados_(table) {
    const rows = linhasDados_(table);
    if (!rows.length) return -1;

    if (table.id !== 'grid') return rows.length - 1;

    for (let i = rows.length - 1; i >= 0; i--) {
      if (!rows[i].classList.contains('blank-row')) return i;
    }

    return rows.length - 1;
  }

  function coordenadaCelula_(target) {
    if (!target || !target.closest) return null;

    const td = target.closest('td');
    const table = td && td.closest('table');

    if (!td || !tabelaPermitida_(table) || td.classList.contains('edit-col')) {
      return null;
    }

    const tr = td.closest('tbody > tr');
    if (!tr) return null;

    const rows = linhasDados_(table);
    const cells = celulasDadosLinha_(tr);
    const r = rows.indexOf(tr);
    const c = cells.indexOf(td);

    if (r < 0 || c < 0) return null;

    return { table, tr, td, r, c };
  }

  function coordenadaCabecalho_(target) {
    if (!target || !target.closest) return null;

    const th = target.closest('th');
    const table = th && th.closest('table');

    if (!th || !tabelaPermitida_(table) || th.classList.contains('edit-col')) {
      return null;
    }

    const headers = cabecalhosDados_(table);
    const c = headers.indexOf(th);

    if (c < 0) return null;
    return { table, th, c };
  }

  function limitar_(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizarSelecao_(table, a, b, mode) {
    if (!table || !a || !b) return null;

    const rows = linhasDados_(table);
    const cols = cabecalhosDados_(table).length;

    if (!rows.length || !cols) return null;

    const maxR = rows.length - 1;
    const maxC = cols - 1;

    let r1 = limitar_(Math.min(a.r, b.r), 0, maxR);
    let r2 = limitar_(Math.max(a.r, b.r), 0, maxR);
    let c1 = limitar_(Math.min(a.c, b.c), 0, maxC);
    let c2 = limitar_(Math.max(a.c, b.c), 0, maxC);

    if (mode === 'column') {
      r1 = 0;
      r2 = Math.max(ultimaLinhaComDados_(table), 0);
    }

    if (mode === 'all') {
      r1 = 0;
      r2 = Math.max(ultimaLinhaComDados_(table), 0);
      c1 = 0;
      c2 = maxC;
    }

    return { table, r1, r2, c1, c2, mode: mode || 'range' };
  }

  function limparClasses_() {
    document.querySelectorAll(
      '.excel-cell-selected, .excel-cell-active, .excel-selection-top,' +
      '.excel-selection-bottom, .excel-selection-left, .excel-selection-right'
    ).forEach(el => {
      el.classList.remove(
        'excel-cell-selected',
        'excel-cell-active',
        'excel-selection-top',
        'excel-selection-bottom',
        'excel-selection-left',
        'excel-selection-right'
      );
    });

    document.querySelectorAll('.excel-header-selected').forEach(el => {
      el.classList.remove('excel-header-selected');
    });
  }

  function celulaPorCoordenada_(table, r, c) {
    const rows = linhasDados_(table);
    const tr = rows[r];
    if (!tr) return null;

    const cells = celulasDadosLinha_(tr);
    return cells[c] || null;
  }

  function atualizarPopover_() {
    const pop = document.getElementById('excelSelectionPopover');
    const info = document.getElementById('excelSelectionInfo');
    const copy = document.getElementById('excelSelectionCopy');

    if (!pop || !info || !copy) return;

    if (!state.selection) {
      pop.classList.remove('show');
      return;
    }

    const rows = state.selection.r2 - state.selection.r1 + 1;
    const cols = state.selection.c2 - state.selection.c1 + 1;
    const total = rows * cols;

    info.textContent =
      rows + ' × ' + cols + ' • ' +
      total + (total === 1 ? ' célula' : ' células');

    pop.classList.add('show');
    copy.disabled = false;
  }

  function aplicarVisual_() {
    limparClasses_();

    const s = state.selection;
    if (!s || !s.table || !document.documentElement.contains(s.table)) {
      atualizarPopover_();
      return;
    }

    for (let r = s.r1; r <= s.r2; r++) {
      for (let c = s.c1; c <= s.c2; c++) {
        const td = celulaPorCoordenada_(s.table, r, c);
        if (!td) continue;

        td.classList.add('excel-cell-selected');

        if (r === s.r1) td.classList.add('excel-selection-top');
        if (r === s.r2) td.classList.add('excel-selection-bottom');
        if (c === s.c1) td.classList.add('excel-selection-left');
        if (c === s.c2) td.classList.add('excel-selection-right');
      }
    }

    if (state.focus) {
      const active = celulaPorCoordenada_(
        s.table,
        state.focus.r,
        state.focus.c
      );
      if (active) active.classList.add('excel-cell-active');
    }

    if (s.mode === 'column') {
      const headers = cabecalhosDados_(s.table);
      for (let c = s.c1; c <= s.c2; c++) {
        if (headers[c]) headers[c].classList.add('excel-header-selected');
      }
    }

    atualizarPopover_();
  }

  function selecionar_(table, anchor, focus, mode) {
    state.table = table;
    state.anchor = { r: anchor.r, c: anchor.c };
    state.focus = { r: focus.r, c: focus.c };
    state.selection = normalizarSelecao_(table, anchor, focus, mode);
    aplicarVisual_();
  }

  function limparSelecao_() {
    state.table = null;
    state.anchor = null;
    state.focus = null;
    state.selection = null;
    state.dragging = false;
    state.draggingHeader = false;

    document.body.classList.remove('excel-grid-selecting');
    limparClasses_();
    atualizarPopover_();
  }

  function textoCelula_(td) {
    if (!td) return '';

    const input = td.querySelector(
      'input:not([type="checkbox"]):not([type="radio"]), textarea, select'
    );

    if (input) {
      return String(input.value == null ? '' : input.value);
    }

    return String(td.textContent == null ? '' : td.textContent).trim();
  }

  function textoSelecao_() {
    const s = state.selection;
    if (!s) return '';

    const lines = [];

    for (let r = s.r1; r <= s.r2; r++) {
      const values = [];

      for (let c = s.c1; c <= s.c2; c++) {
        values.push(textoCelula_(celulaPorCoordenada_(s.table, r, c)));
      }

      lines.push(values.join('\t'));
    }

    return lines.join('\n');
  }

  function copiarFallback_(texto) {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    area.style.top = '0';
    document.body.appendChild(area);
    area.select();

    try {
      document.execCommand('copy');
      return true;
    } catch (error) {
      return false;
    } finally {
      area.remove();
    }
  }

  async function copiarSelecao_() {
    const texto = textoSelecao_();
    if (!state.selection) return false;

    let ok = false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        ok = true;
      }
    } catch (error) {
      ok = false;
    }

    if (!ok) ok = copiarFallback_(texto);

    const copy = document.getElementById('excelSelectionCopy');
    if (copy && ok) {
      const old = copy.textContent;
      copy.textContent = 'COPIADO ✓';
      setTimeout(() => {
        if (copy) copy.textContent = old;
      }, 1100);
    }

    return ok;
  }

  function temSelecaoTextoNoInput_(target) {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return false;
    }

    try {
      return (
        typeof target.selectionStart === 'number' &&
        typeof target.selectionEnd === 'number' &&
        target.selectionEnd > target.selectionStart
      );
    } catch (error) {
      return false;
    }
  }

  function iniciarCelula_(event) {
    if (!screenAtiva_() || event.button !== 0) return;

    const coord = coordenadaCelula_(event.target);
    if (!coord) return;

    state.dragging = true;
    state.draggingHeader = false;
    document.body.classList.add('excel-grid-selecting');

    if (
      event.shiftKey &&
      state.anchor &&
      state.table === coord.table
    ) {
      state.focus = { r: coord.r, c: coord.c };
      state.selection = normalizarSelecao_(
        coord.table,
        state.anchor,
        state.focus,
        'range'
      );
      aplicarVisual_();
      return;
    }

    selecionar_(
      coord.table,
      { r: coord.r, c: coord.c },
      { r: coord.r, c: coord.c },
      'range'
    );
  }

  function iniciarCabecalho_(event) {
    if (!screenAtiva_() || event.button !== 0) return false;

    const coord = coordenadaCabecalho_(event.target);
    if (!coord) return false;

    event.preventDefault();

    state.dragging = false;
    state.draggingHeader = true;
    document.body.classList.add('excel-grid-selecting');

    const last = Math.max(ultimaLinhaComDados_(coord.table), 0);
    const anchor = { r: 0, c: coord.c };
    let focus = { r: last, c: coord.c };

    if (
      event.shiftKey &&
      state.anchor &&
      state.table === coord.table
    ) {
      anchor.c = state.anchor.c;
      focus = { r: last, c: coord.c };
    }

    state.table = coord.table;
    state.anchor = { r: 0, c: anchor.c };
    state.focus = focus;
    state.selection = normalizarSelecao_(
      coord.table,
      { r: 0, c: anchor.c },
      { r: last, c: focus.c },
      'column'
    );

    aplicarVisual_();
    return true;
  }

  function continuarArrasto_(event) {
    if (!screenAtiva_()) return;

    if (state.draggingHeader) {
      const header = coordenadaCabecalho_(event.target);
      if (!header || header.table !== state.table || !state.anchor) return;

      event.preventDefault();

      state.focus = {
        r: Math.max(ultimaLinhaComDados_(header.table), 0),
        c: header.c
      };

      state.selection = normalizarSelecao_(
        header.table,
        { r: 0, c: state.anchor.c },
        state.focus,
        'column'
      );

      aplicarVisual_();
      return;
    }

    if (!state.dragging || !state.anchor) return;

    const coord = coordenadaCelula_(event.target);
    if (!coord || coord.table !== state.table) return;

    if (
      coord.r === state.focus.r &&
      coord.c === state.focus.c
    ) return;

    event.preventDefault();

    state.focus = { r: coord.r, c: coord.c };
    state.selection = normalizarSelecao_(
      coord.table,
      state.anchor,
      state.focus,
      'range'
    );

    aplicarVisual_();
  }

  function finalizarArrasto_() {
    state.dragging = false;
    state.draggingHeader = false;
    document.body.classList.remove('excel-grid-selecting');
  }

  function focarCelula_(table, r, c) {
    const td = celulaPorCoordenada_(table, r, c);
    if (!td) return;

    td.scrollIntoView({
      block: 'nearest',
      inline: 'nearest'
    });

    const input = td.querySelector(
      'input:not([type="checkbox"]):not([type="radio"]), textarea, select'
    );

    if (input && typeof input.focus === 'function') {
      input.focus({ preventScroll: true });
    }
  }

  function estenderTeclado_(event) {
    if (!state.selection || !state.table || !state.focus) return false;

    const key = event.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      return false;
    }

    if (!event.shiftKey) return false;

    const rows = linhasDados_(state.table);
    const cols = cabecalhosDados_(state.table).length;
    if (!rows.length || !cols) return false;

    let r = state.focus.r;
    let c = state.focus.c;

    const ctrl = event.ctrlKey || event.metaKey;

    if (key === 'ArrowUp') {
      r = ctrl ? 0 : r - 1;
    } else if (key === 'ArrowDown') {
      r = ctrl
        ? Math.max(ultimaLinhaComDados_(state.table), 0)
        : r + 1;
    } else if (key === 'ArrowLeft') {
      c = ctrl ? 0 : c - 1;
    } else if (key === 'ArrowRight') {
      c = ctrl ? cols - 1 : c + 1;
    }

    r = limitar_(r, 0, rows.length - 1);
    c = limitar_(c, 0, cols - 1);

    event.preventDefault();
    event.stopImmediatePropagation();

    state.focus = { r, c };
    state.selection = normalizarSelecao_(
      state.table,
      state.anchor,
      state.focus,
      'range'
    );

    aplicarVisual_();
    focarCelula_(state.table, r, c);
    return true;
  }

  function selecionarTabelaInteira_() {
    if (!state.table) return;

    const maxR = Math.max(ultimaLinhaComDados_(state.table), 0);
    const maxC = Math.max(cabecalhosDados_(state.table).length - 1, 0);

    selecionar_(
      state.table,
      { r: 0, c: 0 },
      { r: maxR, c: maxC },
      'all'
    );
  }

  function tecladoGlobal_(event) {
    if (!screenAtiva_()) return;

    if (estenderTeclado_(event)) return;

    const key = String(event.key || '').toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && key === 'c' && state.selection) {
      if (temSelecaoTextoNoInput_(event.target)) return;

      event.preventDefault();
      copiarSelecao_();
      return;
    }

    if (
      ctrl &&
      key === 'a' &&
      state.selection &&
      !(
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
    ) {
      event.preventDefault();
      selecionarTabelaInteira_();
      return;
    }

    if (event.key === 'Escape' && state.selection) {
      event.preventDefault();
      limparSelecao_();
    }
  }

  function criarPopover_() {
    if (document.getElementById('excelSelectionPopover')) return;

    const pop = document.createElement('div');
    pop.id = 'excelSelectionPopover';
    pop.className = 'excel-selection-popover';
    pop.innerHTML =
      '<div id="excelSelectionInfo" class="excel-selection-info"></div>' +
      '<button id="excelSelectionCopy" type="button">COPIAR SELEÇÃO</button>' +
      '<button id="excelSelectionClear" type="button" title="Limpar seleção">×</button>';

    document.body.appendChild(pop);

    document
      .getElementById('excelSelectionCopy')
      .addEventListener('click', copiarSelecao_);

    document
      .getElementById('excelSelectionClear')
      .addEventListener('click', limparSelecao_);
  }

  function observarTabelas_() {
    const observer = new MutationObserver(() => {
      if (
        state.selection &&
        state.table &&
        document.documentElement.contains(state.table)
      ) {
        requestAnimationFrame(aplicarVisual_);
      } else if (
        state.selection &&
        state.table &&
        !document.documentElement.contains(state.table)
      ) {
        limparSelecao_();
      }
    });

    const system = document.getElementById('systemScreen');
    const history = document.getElementById('historyScreen');

    if (system) {
      observer.observe(system, { childList: true, subtree: true });
    }

    if (history) {
      observer.observe(history, { childList: true, subtree: true });
    }
  }

  document.addEventListener('mousedown', event => {
    if (iniciarCabecalho_(event)) return;
    iniciarCelula_(event);
  }, true);

  document.addEventListener('mouseover', continuarArrasto_, true);
  document.addEventListener('mouseup', finalizarArrasto_, true);
  document.addEventListener('keydown', tecladoGlobal_, true);

  document.addEventListener('DOMContentLoaded', () => {
    criarPopover_();
    observarTabelas_();
  });

  window.sgqExcelSelection = {
    copy: copiarSelecao_,
    clear: limparSelecao_
  };
})();