/* ============================================================
   PROGRAMAÇÃO SGQ - FIXPAR
   ============================================================ */

let programacaoSgqRows = [];

function abrirProgramacaoSgq() {
  cancelarTimers();
  esconderTelas();

  const screen = document.getElementById('programacaoSgqScreen');
  if (screen) screen.classList.add('active');

  garantirLayoutProgramacaoDividida_();
  inicializarTurnoProgramacaoSgq();
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
  el.textContent = 'DATA: ' + data;

  atualizarCabecalhosBlocosProgramacao_();
}

function inicializarTurnoProgramacaoSgq() {
  const select = document.getElementById('programacaoSgqTurno');
  if (!select) return;

  let salvo = '';

  try {
    salvo = localStorage.getItem('programacaoSgqTurno') || '';
  } catch (e) {}

  select.value = salvo === 'Turno Noite' ? 'Turno Noite' : 'Turno Dia';
  atualizarTituloTurnoProgramacaoSgq();
}

function obterTurnoProgramacaoSgq() {
  const select = document.getElementById('programacaoSgqTurno');
  return select && select.value === 'Turno Noite'
    ? 'Turno Noite'
    : 'Turno Dia';
}

function alterarTurnoProgramacaoSgq() {
  const turno = obterTurnoProgramacaoSgq();

  try {
    localStorage.setItem('programacaoSgqTurno', turno);
  } catch (e) {}

  atualizarTituloTurnoProgramacaoSgq();
}

function atualizarTituloTurnoProgramacaoSgq() {
  const printTitle = document.getElementById('programacaoSgqPrintTitle');

  if (printTitle) {
    printTitle.textContent =
      'Programação SGQ - Fixpar - ' + obterTurnoProgramacaoSgq();
  }

  atualizarCabecalhosBlocosProgramacao_();
}

function atualizarCabecalhosBlocosProgramacao_() {
  const turno = obterTurnoProgramacaoSgq();
  const data = new Date().toLocaleDateString('pt-BR');

  const esquerdo = document.getElementById('programacaoBlocoEsquerdoSubtitulo');
  const direito = document.getElementById('programacaoBlocoDireitoSubtitulo');

  const texto = turno + ' • ' + data;

  if (esquerdo) esquerdo.textContent = texto;
  if (direito) direito.textContent = texto;
}

function headersProgramacao_() {
  return [
    'Data de Entrada',
    'OP',
    'Qtd. Caixas',
    'Qtd. Contêiner',
    'Cor',
    'Peso Danuta (Kg)',
    'Status',
    'OK',
    'Encaminhado'
  ];
}

function garantirLayoutProgramacaoDividida_() {
  const wrap = document.querySelector('#programacaoSgqScreen .programacao-table-wrap');
  if (!wrap) return;

  if (document.getElementById('programacaoSgqBodyUmaCaixa')) {
    atualizarCabecalhosBlocosProgramacao_();
    return;
  }

  const headers = headersProgramacao_();
  const cabecalho = headers.map(header => '<th>' + header + '</th>').join('');
  const logo = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';

  wrap.innerHTML =
    '<div class="programacao-dual-grid">' +
      '<section class="programacao-bloco programacao-bloco-principal">' +
        '<div class="programacao-bloco-cabecalho">' +
          '<img class="programacao-bloco-logo" src="' + logo + '" alt="Galvânica Danuta">' +
          '<div class="programacao-bloco-titulos">' +
            '<div class="programacao-bloco-titulo">Programação SGQ - Fixpar</div>' +
            '<div id="programacaoBlocoEsquerdoSubtitulo" class="programacao-bloco-subtitulo"></div>' +
          '</div>' +
        '</div>' +
        '<table class="programacao-table programacao-table-compacta">' +
          '<thead><tr>' + cabecalho + '</tr></thead>' +
          '<tbody id="programacaoSgqBody"></tbody>' +
        '</table>' +
      '</section>' +
      '<section class="programacao-bloco programacao-bloco-uma-caixa">' +
        '<div class="programacao-bloco-cabecalho">' +
          '<img class="programacao-bloco-logo" src="' + logo + '" alt="Galvânica Danuta">' +
          '<div class="programacao-bloco-titulos">' +
            '<div class="programacao-bloco-titulo">OPs de 1 caixa</div>' +
            '<div id="programacaoBlocoDireitoSubtitulo" class="programacao-bloco-subtitulo"></div>' +
          '</div>' +
        '</div>' +
        '<table class="programacao-table programacao-table-compacta">' +
          '<thead><tr>' + cabecalho + '</tr></thead>' +
          '<tbody id="programacaoSgqBodyUmaCaixa"></tbody>' +
        '</table>' +
      '</section>' +
    '</div>';

  atualizarCabecalhosBlocosProgramacao_();
}

/* Compatibilidade com chamadas antigas. */
function garantirCabecalhoDataEntradaProgramacao_() {
  garantirLayoutProgramacaoDividida_();
}

function normalizarStatusProgramacao_(status) {
  return String(status || '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function statusUrgenteProgramacao_(status) {
  return normalizarStatusProgramacao_(status) === 'urgente';
}

function numeroProgramacao_(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;

  let texto = String(valor === null || valor === undefined ? '' : valor)
    .trim()
    .replace(/\s/g, '');

  if (!texto) return 0;

  if (texto.includes(',') && texto.includes('.')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

function dataProgramacaoTime_(valor) {
  const texto = String(valor || '').trim();
  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    ).getTime();
  }

  const parsed = new Date(texto);
  return isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function compararProgramacaoSgq_(a, b) {
  const urgenteA = statusUrgenteProgramacao_(a.status);
  const urgenteB = statusUrgenteProgramacao_(b.status);

  if (urgenteA !== urgenteB) {
    return urgenteA ? -1 : 1;
  }

  const dataA = dataProgramacaoTime_(a.dataEntrada);
  const dataB = dataProgramacaoTime_(b.dataEntrada);

  if (dataA !== dataB) return dataA - dataB;

  return String(a.op || '').localeCompare(
    String(b.op || ''),
    'pt-BR',
    { numeric: true, sensitivity: 'base' }
  );
}

function ordenarProgramacaoSgqRows_() {
  programacaoSgqRows.sort(compararProgramacaoSgq_);
}

function separarProgramacaoSgqRows_() {
  const principal = [];
  const umaCaixa = [];

  programacaoSgqRows.forEach(item => {
    const caixas = numeroProgramacao_(item.qtdCaixas);
    const conteiner = numeroProgramacao_(item.qtdConteiner);

    /*
     * A regra da coluna da direita tem prioridade:
     * toda OP com Qtd. Caixas = 1 vai para "OPs de 1 caixa".
     * As demais entram à esquerda quando Caixas > 1 ou Contêiner >= 1.
     */
    if (caixas === 1) {
      umaCaixa.push(item);
      return;
    }

    if (caixas > 1 || conteiner >= 1) {
      principal.push(item);
    }
  });

  principal.sort(compararProgramacaoSgq_);
  umaCaixa.sort(compararProgramacaoSgq_);

  return { principal, umaCaixa };
}

function setProgramacaoStatus(texto, estado) {
  const el = document.getElementById('programacaoStatusMessage');
  if (!el) return;

  el.textContent = texto || '';
  el.className = 'programacao-status-message';
  if (estado) el.classList.add(estado);
}

function carregarProgramacaoSgq() {
  garantirLayoutProgramacaoDividida_();

  const loading = document.getElementById('programacaoSgqLoading');
  const empty = document.getElementById('programacaoSgqEmpty');
  const tbodyEsquerdo = document.getElementById('programacaoSgqBody');
  const tbodyDireito = document.getElementById('programacaoSgqBodyUmaCaixa');
  const resumo = document.getElementById('programacaoSgqResumo');

  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';
  if (tbodyEsquerdo) tbodyEsquerdo.innerHTML = '';
  if (tbodyDireito) tbodyDireito.innerHTML = '';
  if (resumo) resumo.textContent = '';

  setProgramacaoStatus('Carregando programação...', 'saving');

  google.script.run
    .withSuccessHandler(result => {
      programacaoSgqRows = result && Array.isArray(result.rows)
        ? result.rows
        : [];

      ordenarProgramacaoSgqRows_();

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
  garantirLayoutProgramacaoDividida_();

  const tbodyEsquerdo = document.getElementById('programacaoSgqBody');
  const tbodyDireito = document.getElementById('programacaoSgqBodyUmaCaixa');
  const empty = document.getElementById('programacaoSgqEmpty');
  const resumo = document.getElementById('programacaoSgqResumo');

  if (!tbodyEsquerdo || !tbodyDireito) return;

  ordenarProgramacaoSgqRows_();
  const grupos = separarProgramacaoSgqRows_();

  tbodyEsquerdo.innerHTML = '';
  tbodyDireito.innerHTML = '';

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
    const urgentes = programacaoSgqRows.filter(item =>
      statusUrgenteProgramacao_(item.status)
    ).length;

    resumo.textContent =
      grupos.principal.length + ' na programação principal' +
      ' • ' + grupos.umaCaixa.length + ' OPs de 1 caixa' +
      (urgentes ? ' • ' + urgentes + ' urgente' + (urgentes === 1 ? '' : 's') : '');
  }

  grupos.principal.forEach(item => {
    tbodyEsquerdo.appendChild(criarLinhaProgramacaoSgq_(item));
  });

  grupos.umaCaixa.forEach(item => {
    tbodyDireito.appendChild(criarLinhaProgramacaoSgq_(item));
  });

  atualizarCabecalhosBlocosProgramacao_();
}

function criarLinhaProgramacaoSgq_(item) {
  const tr = document.createElement('tr');
  tr.dataset.op = item.op || '';

  if (statusUrgenteProgramacao_(item.status)) {
    tr.classList.add('programacao-urgente');
  }

  appendProgramacaoTextCell(tr, item.dataEntrada);
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
  statusInput.placeholder = 'Status';
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

  return tr;
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

      ordenarProgramacaoSgqRows_();
      renderProgramacaoSgq();
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
  atualizarTituloTurnoProgramacaoSgq();
  renderProgramacaoSgq();
  window.print();
}
