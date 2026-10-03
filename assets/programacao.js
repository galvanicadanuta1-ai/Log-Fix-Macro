/* ============================================================
   PROGRAMAÇÃO SGQ - FIXPAR
   ============================================================ */

let programacaoSgqRows = [];

function abrirProgramacaoSgq() {
  cancelarTimers();
  esconderTelas();

  const screen = document.getElementById('programacaoSgqScreen');
  if (screen) screen.classList.add('active');

  atualizarDataProgramacaoSgq();
  carregarProgramacaoSgq();
}

function voltarMenuProgramacao() {
  cancelarTimers();
  esconderTelas();

  const menu = document.getElementById('programacaoMenu');
  if (menu) menu.classList.add('active');
}

function atualizarDataProgramacaoSgq() {
  const el = document.getElementById('programacaoSgqDate');
  if (!el) return;

  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR');
  el.textContent = 'Data: ' + data;
}

function setProgramacaoStatus(texto, estado) {
  const el = document.getElementById('programacaoStatusMessage');
  if (!el) return;

  el.textContent = texto || '';
  el.className = 'programacao-status-message';
  if (estado) el.classList.add(estado);
}

function carregarProgramacaoSgq() {
  const loading = document.getElementById('programacaoSgqLoading');
  const empty = document.getElementById('programacaoSgqEmpty');
  const tbody = document.getElementById('programacaoSgqBody');
  const resumo = document.getElementById('programacaoSgqResumo');

  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';
  if (tbody) tbody.innerHTML = '';
  if (resumo) resumo.textContent = '';

  setProgramacaoStatus('Carregando programação...', 'saving');

  google.script.run
    .withSuccessHandler(result => {
      programacaoSgqRows = result && Array.isArray(result.rows)
        ? result.rows
        : [];

      if (loading) loading.style.display = 'none';

      renderProgramacaoSgq();
      setProgramacaoStatus('Programação atualizada', 'saved');
    })
    .withFailureHandler(error => {
      if (loading) loading.style.display = 'none';
      if (empty) {
        empty.style.display = 'block';
        empty.textContent = error.message || 'Erro ao carregar a programação.';
      }

      setProgramacaoStatus(
        error.message || 'Erro ao carregar a programação.',
        'error'
      );
    })
    .carregarProgramacaoSgq();
}

function renderProgramacaoSgq() {
  const tbody = document.getElementById('programacaoSgqBody');
  const empty = document.getElementById('programacaoSgqEmpty');
  const resumo = document.getElementById('programacaoSgqResumo');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!programacaoSgqRows.length) {
    if (empty) {
      empty.style.display = 'block';
      empty.textContent = 'Não há OPs pendentes de saída.';
    }

    if (resumo) resumo.textContent = '0 OPs pendentes';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (resumo) {
    resumo.textContent =
      programacaoSgqRows.length +
      (programacaoSgqRows.length === 1 ? ' OP pendente' : ' OPs pendentes');
  }

  programacaoSgqRows.forEach(item => {
    const tr = document.createElement('tr');
    tr.dataset.op = item.op || '';

    appendProgramacaoTextCell(tr, item.op);
    appendProgramacaoTextCell(tr, item.qtdCaixas);
    appendProgramacaoTextCell(tr, item.qtdConteiner);
    appendProgramacaoTextCell(tr, item.cor);
    appendProgramacaoTextCell(tr, item.pesoDanuta);

    const statusTd = document.createElement('td');
    const statusInput = document.createElement('input');
    statusInput.type = 'text';
    statusInput.className = 'programacao-status-input';
    statusInput.value = item.status || '';
    statusInput.placeholder = 'Digite o status';
    statusInput.autocomplete = 'off';
    statusInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        statusInput.blur();
      }
    });
    statusInput.addEventListener('blur', () => {
      salvarEstadoLinhaProgramacaoSgq(tr);
    });
    statusTd.appendChild(statusInput);
    tr.appendChild(statusTd);

    const okTd = document.createElement('td');
    const okInput = document.createElement('input');
    okInput.type = 'checkbox';
    okInput.className = 'programacao-check programacao-ok';
    okInput.checked = Boolean(item.ok);
    okInput.addEventListener('change', () => {
      salvarEstadoLinhaProgramacaoSgq(tr);
    });
    okTd.appendChild(okInput);
    tr.appendChild(okTd);

    const encaminhadoTd = document.createElement('td');
    const encaminhadoInput = document.createElement('input');
    encaminhadoInput.type = 'checkbox';
    encaminhadoInput.className = 'programacao-check programacao-encaminhado';
    encaminhadoInput.checked = Boolean(item.encaminhado);
    encaminhadoInput.addEventListener('change', () => {
      salvarEstadoLinhaProgramacaoSgq(tr);
    });
    encaminhadoTd.appendChild(encaminhadoInput);
    tr.appendChild(encaminhadoTd);

    tbody.appendChild(tr);
  });
}

function appendProgramacaoTextCell(tr, valor) {
  const td = document.createElement('td');
  td.textContent = valor === null || valor === undefined ? '' : String(valor);
  tr.appendChild(td);
}

function salvarEstadoLinhaProgramacaoSgq(tr) {
  if (!tr) return;

  const op = tr.dataset.op || '';
  if (!op) return;

  const statusInput = tr.querySelector('.programacao-status-input');
  const okInput = tr.querySelector('.programacao-ok');
  const encaminhadoInput = tr.querySelector('.programacao-encaminhado');

  const status = statusInput ? statusInput.value.trim() : '';
  const ok = okInput ? okInput.checked : false;
  const encaminhado = encaminhadoInput ? encaminhadoInput.checked : false;

  setProgramacaoStatus('Salvando...', 'saving');

  google.script.run
    .withSuccessHandler(() => {
      const item = programacaoSgqRows.find(row => String(row.op) === String(op));
      if (item) {
        item.status = status;
        item.ok = ok;
        item.encaminhado = encaminhado;
      }

      setProgramacaoStatus('Alterações salvas', 'saved');
    })
    .withFailureHandler(error => {
      setProgramacaoStatus(
        error.message || 'Erro ao salvar programação.',
        'error'
      );
    })
    .salvarProgramacaoSgq(op, status, ok, encaminhado);
}

function imprimirProgramacaoSgq() {
  atualizarDataProgramacaoSgq();
  window.print();
}
