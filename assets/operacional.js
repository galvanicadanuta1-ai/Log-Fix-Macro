/* ============================================================
   AUTOCOMPLETE DE CORES
   ============================================================ */
function carregarSugestoesCores() {
  google.script.run
    .withSuccessHandler(lista => {
      coresConhecidas = Array.isArray(lista) ? lista : [];
      renderDatalistCores();
    })
    .withFailureHandler(() => {
      // A digitação continua funcionando mesmo se a lista falhar.
    })
    .carregarCores();
}

function renderDatalistCores() {
  const datalist = document.getElementById('coresFixparList');
  if (!datalist) return;

  datalist.innerHTML = '';

  coresConhecidas.forEach(cor => {
    const option = document.createElement('option');
    option.value = cor;
    datalist.appendChild(option);
  });
}

function adicionarCorLocal(cor) {
  const valor = String(cor ?? '').trim();
  if (!valor) return;

  const existe = coresConhecidas.some(
    item => String(item).trim().toLowerCase() === valor.toLowerCase()
  );

  if (!existe) {
    coresConhecidas.push(valor);
    coresConhecidas.sort((a, b) =>
      String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' })
    );
    renderDatalistCores();
  }
}


/* ============================================================
   OPERACIONAL - CARREGAMENTO
   ============================================================ */
function alterarData() {
  cancelarTimers();
  carregar();
}

function cancelarTimers() {
  Object.keys(saveTimers).forEach(key => clearTimeout(saveTimers[key]));
  saveTimers = {};
}

function carregar() {

  setLoading(true);
  setStatus('Carregando...', '');

  const date = document.getElementById('selectedDate').value || hojeISO();

  google.script.run
    .withSuccessHandler(result => {

      rows = (result.rows || []).map(item => ({
        id: criarId(),
        sheetRow: item.sheetRow,
        values: normalizeValues(item.values),
        saving: false
      }));

      garantirDuasLinhasVazias();
      renderTable();
      setLoading(false);
      setStatus('Pronto', '');
    })
    .withFailureHandler(error => {
      setLoading(false);
      setStatus(error.message || 'Erro ao carregar os dados.', 'error');
    })
    .carregarDados(currentPage, date);
}

function criarId() {
  tempIdCounter++;
  return 'row-' + Date.now() + '-' + tempIdCounter;
}

function normalizeValues(values) {

  const count = getPageConfig().headers.length;
  const result = new Array(count).fill('');

  for (let i = 0; i < count; i++) {
    result[i] =
      values && values[i] !== undefined && values[i] !== null
        ? values[i]
        : '';
  }

  return result;
}

function criarLinhaVazia() {

  const count = getPageConfig().headers.length;
  const date = document.getElementById('selectedDate').value || hojeISO();
  const values = new Array(count).fill('');

  values[0] = date;

  return {
    id: criarId(),
    sheetRow: null,
    values: values,
    saving: false
  };
}

function linhaSemDados(row) {
  return row.values
    .slice(1)
    .every(value => String(value ?? '').trim() === '');
}

function quantidadeLinhasVaziasFinal() {

  let quantidade = 0;

  for (let i = rows.length - 1; i >= 0; i--) {

    const row = rows[i];

    if (!row.sheetRow && linhaSemDados(row)) {
      quantidade++;
    } else {
      break;
    }
  }

  return quantidade;
}

function garantirDuasLinhasVazias() {

  let quantidade = quantidadeLinhasVaziasFinal();

  while (quantidade < 2) {
    rows.push(criarLinhaVazia());
    quantidade++;
  }
}

function garantirDuasLinhasNaTela() {

  let quantidade = quantidadeLinhasVaziasFinal();

  while (quantidade < 2) {

    const novaLinha = criarLinhaVazia();
    rows.push(novaLinha);
    appendRow(novaLinha);
    quantidade++;
  }
}

function renderTable() {

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  rows.forEach(row => appendRow(row));
}

function appendRow(row) {

  const tbody = document.getElementById('tableBody');
  const selectedDate = document.getElementById('selectedDate').value || hojeISO();
  const cfg = getPageConfig();

  const tr = document.createElement('tr');
  tr.dataset.rowId = row.id;

  if (!row.sheetRow && linhaSemDados(row)) {
    tr.classList.add('blank-row');
  }

  row.values.forEach((value, colIndex) => {

    const td = document.createElement('td');
    td.dataset.label = cfg.headers[colIndex] || '';

    if (
      currentPage === 'RECEBIMENTO' &&
      cfg.headers[colIndex] === 'Peso Danuta'
    ) {
      td.classList.add('peso-danuta-cell');
    }

    const isAutoCalc =
      currentPage === 'RECEBIMENTO' &&
      (
        cfg.headers[colIndex] === 'Diferença' ||
        cfg.headers[colIndex] === 'Diferença em %'
      );

    if (isAutoCalc) {
      td.classList.add('auto-calc-cell');
    }

    const input = document.createElement('input');
    input.className = 'cell-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.dataset.rowId = row.id;
    input.dataset.colIndex = colIndex;

    if (colIndex === 0) {

      td.classList.add('date-cell');
      input.value = dataBR(selectedDate);
      input.readOnly = true;
      input.tabIndex = -1;

    } else {

      input.value = value ?? '';

      if (
        currentPage === 'RECEBIMENTO' &&
        cfg.headers[colIndex] === 'Cor'
      ) {
        input.setAttribute('list', 'coresFixparList');
      }

      if (
        currentPage === 'RECEBIMENTO' &&
        cfg.headers[colIndex] === 'Processo'
      ) {
        input.setAttribute('list', 'processosFixparList');
      }

      if (isAutoCalc) {
        input.readOnly = true;
        input.tabIndex = -1;
      }

      input.addEventListener('input', event => {
        onCellInput(row.id, colIndex, event.target.value, tr);
      });

      input.addEventListener('paste', event => {
        colarMatriz(event, row.id, colIndex);
      });

      input.addEventListener('blur', () => {
        salvarAgora(row.id);
      });

      input.addEventListener('keydown', event => {
        controlarTeclado(event, row.id, colIndex);
      });
    }

    td.appendChild(input);
    tr.appendChild(td);
  });

  tbody.appendChild(tr);
}

function onCellInput(rowId, colIndex, value, tr) {

  const row = rows.find(item => item.id === rowId);
  if (!row) return;

  row.values[colIndex] = value;

  if (currentPage === 'RECEBIMENTO') {
    const cfg = getPageConfig();

    if (cfg.headers[colIndex] === 'Cor') {
      adicionarCorLocal(value);
    }

    recalcularRecebimentoNaTela(row, tr);
  }

  if (linhaSemDados(row)) {
    tr.classList.add('blank-row');
  } else {
    tr.classList.remove('blank-row');
  }

  garantirDuasLinhasNaTela();
  agendarSalvamento(rowId);
}



/* ============================================================
   COLAR DADOS EM BLOCO - ESTILO EXCEL
   ============================================================ */
function colarMatriz(event, rowId, colIndex) {
  const texto = event.clipboardData
    ? event.clipboardData.getData('text/plain')
    : '';

  if (!texto || (!texto.includes('\t') && !texto.includes('\n') && !texto.includes('\r'))) {
    return;
  }

  event.preventDefault();
  cancelarTimers();

  const linhasColadas = texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  // Remove somente a última linha vazia criada pelo Excel ao copiar.
  if (
    linhasColadas.length > 1 &&
    linhasColadas[linhasColadas.length - 1] === ''
  ) {
    linhasColadas.pop();
  }

  const matriz = linhasColadas.map(linha => linha.split('\t'));

  const startRowIndex = rows.findIndex(item => item.id === rowId);
  if (startRowIndex < 0 || !matriz.length) return;

  const cfg = getPageConfig();
  const maxCol = cfg.headers.length - 1;

  const linhasNecessarias = startRowIndex + matriz.length;

  while (rows.length < linhasNecessarias + 2) {
    rows.push(criarLinhaVazia());
  }

  const afetadas = [];

  matriz.forEach((linhaColada, rowOffset) => {
    const targetIndex = startRowIndex + rowOffset;
    const row = rows[targetIndex];

    if (!row) return;

    linhaColada.forEach((valor, colOffset) => {
      const targetCol = colIndex + colOffset;

      if (targetCol < 0 || targetCol > maxCol) return;

      // A Data da tela permanece controlada pelo calendário.
      if (targetCol === 0) return;

      const header = cfg.headers[targetCol];

      // Diferença e percentual são sempre recalculados.
      if (
        currentPage === 'RECEBIMENTO' &&
        (header === 'Diferença' || header === 'Diferença em %')
      ) {
        return;
      }

      row.values[targetCol] = valor;

      if (
        currentPage === 'RECEBIMENTO' &&
        header === 'Cor'
      ) {
        adicionarCorLocal(valor);
      }
    });

    if (currentPage === 'RECEBIMENTO') {
      recalcularRecebimentoModelo(row);
    }

    if (!linhaSemDados(row)) {
      afetadas.push(row);
    }
  });

  garantirDuasLinhasVazias();
  renderTable();

  if (!afetadas.length) return;

  salvamentoEmLote = true;

  const reportButton = document.getElementById('reportButton');
  if (reportButton) {
    reportButton.disabled = true;
    reportButton.textContent = 'SALVANDO DADOS...';
  }

  setStatus(
    afetadas.length === 1
      ? 'Salvando linha colada...'
      : 'Salvando ' + afetadas.length + ' linhas coladas...',
    'saving'
  );

  const date = document.getElementById('selectedDate').value || hojeISO();

  const payload = afetadas.map(row => ({
    clientId: row.id,
    sheetRow: row.sheetRow,
    values: row.values.slice()
  }));

  google.script.run
    .withSuccessHandler(result => {
      const salvas = result && Array.isArray(result.rows)
        ? result.rows
        : [];

      salvas.forEach(item => {
        const row = rows.find(r => r.id === item.clientId);

        if (!row) return;

        row.sheetRow = item.sheetRow;

        if (Array.isArray(item.values)) {
          row.values = item.values.slice();
        }
      });

      garantirDuasLinhasVazias();
      renderTable();

      if (currentPage === 'RECEBIMENTO') {
        carregarSugestoesCores();
      }

      salvamentoEmLote = false;

      const reportButton = document.getElementById('reportButton');
      if (reportButton) {
        reportButton.disabled = false;
        reportButton.textContent = 'GERAR RELATÓRIO';
      }

      setStatus(
        salvas.length + (salvas.length === 1 ? ' linha salva' : ' linhas salvas') +
        ' • Histórico e Conciliação atualizados',
        'saved'
      );
    })
    .withFailureHandler(error => {

      salvamentoEmLote = false;

      const reportButton = document.getElementById('reportButton');
      if (reportButton) {
        reportButton.disabled = false;
        reportButton.textContent = 'GERAR RELATÓRIO';
      }

      setStatus(
        error.message || 'Erro ao salvar os dados colados.',
        'error'
      );

      alert(
        error.message ||
        'Não foi possível salvar todos os dados colados.'
      );
    })
    .salvarLinhasEmLote(
      currentPage,
      date,
      payload
    );
}

function recalcularRecebimentoModelo(row) {
  if (currentPage !== 'RECEBIMENTO') return;

  const cfg = getPageConfig();

  const nfIndex = cfg.headers.indexOf('Peso NF. Fixpar');
  const danutaIndex = cfg.headers.indexOf('Peso Danuta');
  const diferencaIndex = cfg.headers.indexOf('Diferença');
  const percentualIndex = cfg.headers.indexOf('Diferença em %');

  if (
    nfIndex < 0 ||
    danutaIndex < 0 ||
    diferencaIndex < 0 ||
    percentualIndex < 0
  ) return;

  const nf = parseNumeroTela(row.values[nfIndex]);
  const danuta = parseNumeroTela(row.values[danutaIndex]);

  if (nf === null || danuta === null) {
    row.values[diferencaIndex] = '';
    row.values[percentualIndex] = '';
    return;
  }

  row.values[diferencaIndex] =
    arredondarTela(nf - danuta, 3);

  row.values[percentualIndex] =
    nf === 0
      ? ''
      : formatarPercentualTela(
          arredondarTela((danuta / nf) * 100, 2)
        );
}


/* ============================================================
   CÁLCULOS AUTOMÁTICOS DO RECEBIMENTO
   ============================================================ */
function parseNumeroTela(value) {
  if (value === null || value === undefined || value === '') return null;

  let text = String(value).trim();
  if (!text) return null;

  text = text.replace(/\s/g, '');

  if (text.includes(',') && text.includes('.')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (text.includes(',')) {
    text = text.replace(',', '.');
  }

  text = text.replace('%', '');

  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function arredondarTela(value, casas) {
  const fator = Math.pow(10, casas);
  return Math.round((value + Number.EPSILON) * fator) / fator;
}

function formatarNumeroTela(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace('.', ',');
}

function formatarPercentualTela(value) {
  if (value === null || value === undefined || value === '') return '';
  return formatarNumeroTela(value) + '%';
}

function recalcularRecebimentoNaTela(row, tr) {
  const cfg = getPageConfig();

  const nfIndex = cfg.headers.indexOf('Peso NF. Fixpar');
  const danutaIndex = cfg.headers.indexOf('Peso Danuta');
  const diferencaIndex = cfg.headers.indexOf('Diferença');
  const percentualIndex = cfg.headers.indexOf('Diferença em %');

  if (
    nfIndex < 0 ||
    danutaIndex < 0 ||
    diferencaIndex < 0 ||
    percentualIndex < 0
  ) return;

  const nf = parseNumeroTela(row.values[nfIndex]);
  const danuta = parseNumeroTela(row.values[danutaIndex]);

  if (nf === null || danuta === null) {
    row.values[diferencaIndex] = '';
    row.values[percentualIndex] = '';
  } else {
    row.values[diferencaIndex] = arredondarTela(nf - danuta, 3);
    row.values[percentualIndex] =
      nf === 0
        ? ''
        : formatarPercentualTela(arredondarTela((danuta / nf) * 100, 2));
  }

  if (tr) {
    const inputs = tr.querySelectorAll('.cell-input');

    if (inputs[diferencaIndex]) {
      inputs[diferencaIndex].value =
        row.values[diferencaIndex] === ''
          ? ''
          : formatarNumeroTela(row.values[diferencaIndex]);
    }

    if (inputs[percentualIndex]) {
      inputs[percentualIndex].value = row.values[percentualIndex] ?? '';
    }
  }
}


/* ============================================================
   TECLADO
   ============================================================ */
function controlarTeclado(event, rowId, colIndex) {

  const key = event.key;

  if (key === 'Delete') {
    const input = event.currentTarget;

    if (input && !input.readOnly) {
      event.preventDefault();

      input.value = '';

      const tr = input.closest('tr');

      onCellInput(
        rowId,
        colIndex,
        '',
        tr
      );

      salvarAgora(rowId);
    }

    return;
  }

  if (key === 'Enter') {
    event.preventDefault();
    salvarAgora(rowId);
    moverCelula(rowId, colIndex, 1, 0);
    return;
  }

  if (key === 'ArrowUp') {
    event.preventDefault();
    moverCelula(rowId, colIndex, -1, 0);
    return;
  }

  if (key === 'ArrowDown') {
    event.preventDefault();
    moverCelula(rowId, colIndex, 1, 0);
    return;
  }

  if (key === 'ArrowLeft') {
    event.preventDefault();
    moverCelula(rowId, colIndex, 0, -1);
    return;
  }

  if (key === 'ArrowRight') {
    event.preventDefault();
    moverCelula(rowId, colIndex, 0, 1);
  }
}

function moverCelula(rowId, colIndex, deltaRow, deltaCol) {

  garantirDuasLinhasNaTela();

  const rowIndex = rows.findIndex(item => item.id === rowId);
  if (rowIndex < 0) return;

  let targetRow = rowIndex + deltaRow;
  let targetCol = colIndex + deltaCol;

  if (targetRow < 0) targetRow = 0;
  if (targetRow >= rows.length) {
    garantirDuasLinhasNaTela();
    targetRow = Math.min(targetRow, rows.length - 1);
  }

  const maxCol = getPageConfig().headers.length - 1;

  if (deltaCol !== 0) {
    let candidate = targetCol;

    while (candidate >= 1 && candidate <= maxCol) {
      const target = rows[targetRow];
      const trCandidate = document.querySelector(
        'tr[data-row-id="' + target.id + '"]'
      );

      if (trCandidate) {
        const inputsCandidate = trCandidate.querySelectorAll('.cell-input');
        const candidateInput = inputsCandidate[candidate];

        if (candidateInput && !candidateInput.readOnly) {
          targetCol = candidate;
          break;
        }
      }

      candidate += deltaCol > 0 ? 1 : -1;
    }

    if (candidate < 1 || candidate > maxCol) return;
  } else {
    targetCol = Math.max(1, Math.min(maxCol, targetCol));
  }

  const target = rows[targetRow];
  if (!target) return;

  const tr = document.querySelector('tr[data-row-id="' + target.id + '"]');
  if (!tr) return;

  const inputs = tr.querySelectorAll('.cell-input');
  let input = inputs[targetCol];

  // Movimento vertical: se a coluna for calculada, procura a editável mais próxima.
  if (input && input.readOnly) {
    let direita = targetCol + 1;
    let esquerda = targetCol - 1;

    while (direita <= maxCol || esquerda >= 1) {
      if (direita <= maxCol && inputs[direita] && !inputs[direita].readOnly) {
        input = inputs[direita];
        break;
      }

      if (esquerda >= 1 && inputs[esquerda] && !inputs[esquerda].readOnly) {
        input = inputs[esquerda];
        break;
      }

      direita++;
      esquerda--;
    }
  }

  if (!input || input.readOnly) return;

  input.focus();

  const length = input.value.length;

  try {
    input.setSelectionRange(length, length);
  } catch (e) {}
}


/* ============================================================
   SALVAMENTO
   ============================================================ */
function agendarSalvamento(rowId) {

  clearTimeout(saveTimers[rowId]);

  saveTimers[rowId] = setTimeout(() => {
    salvarAgora(rowId);
  }, 800);
}

function salvarAgora(rowId) {

  clearTimeout(saveTimers[rowId]);

  const row = rows.find(item => item.id === rowId);

  if (!row || row.saving) return;

  const empty = linhaSemDados(row);

  if (!row.sheetRow && empty) return;

  row.saving = true;
  setStatus('Salvando...', 'saving');

  if (row.sheetRow && empty) {

    const antigaSheetRow = row.sheetRow;

    google.script.run
      .withSuccessHandler(() => {
        row.saving = false;
        row.sheetRow = null;
        setStatus('Alterações salvas', 'saved');
        garantirDuasLinhasNaTela();
      })
      .withFailureHandler(error => {
        row.saving = false;
        setStatus(error.message || 'Erro ao apagar registro.', 'error');
      })
      .limparLinha(currentPage, antigaSheetRow);

    return;
  }

  const date = document.getElementById('selectedDate').value || hojeISO();
  row.values[0] = date;

  google.script.run
    .withSuccessHandler(result => {
      row.saving = false;
      row.sheetRow = result.sheetRow;

      if (result.values && Array.isArray(result.values)) {
        row.values = result.values.slice();

        const trAtual = document.querySelector(
          'tr[data-row-id="' + row.id + '"]'
        );

        if (trAtual) {
          const inputs = trAtual.querySelectorAll('.cell-input');

          result.values.forEach((valor, i) => {
            if (inputs[i] && i > 0) {
              inputs[i].value = valor ?? '';
            }
          });
        }
      }

      setStatus('Alterações salvas', 'saved');
      garantirDuasLinhasNaTela();

      if (currentPage === 'RECEBIMENTO') {
        const cfg = getPageConfig();
        const corIndex = cfg.headers.indexOf('Cor');

        if (corIndex >= 0 && row.values[corIndex]) {
          adicionarCorLocal(row.values[corIndex]);
        }
      }
    })
    .withFailureHandler(error => {
      row.saving = false;
      setStatus(error.message || 'Erro ao salvar.', 'error');
    })
    .salvarLinha(
      currentPage,
      date,
      row.values,
      row.sheetRow
    );
}



