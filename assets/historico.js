/* ============================================================
   HISTÓRICO
   ============================================================ */
function atualizarBotaoLimparHistorico() {
  const input = document.getElementById('historySearch');
  const clear = document.getElementById('historySearchClear');
  if (!input || !clear) return;
  clear.style.display = input.value.trim() ? 'block' : 'none';
}

function fecharSugestoesHistorico() {
  const box = document.getElementById('historySuggestions');
  if (!box) return;
  box.style.display = 'none';
  box.innerHTML = '';
}

function limparBuscaHistorico() {
  const input = document.getElementById('historySearch');
  if (!input) return;
  input.value = '';
  atualizarBotaoLimparHistorico();
  fecharSugestoesHistorico();
  input.focus();
  consultarHistorico(true);
}

function historicoBuscaDigitando() {
  atualizarBotaoLimparHistorico();

  clearTimeout(historySuggestionTimer);

  const input = document.getElementById('historySearch');
  const termo = input ? input.value.trim() : '';

  if (!termo || termo.length < 2) {
    fecharSugestoesHistorico();
    return;
  }

  historySuggestionTimer = setTimeout(() => {
    buscarSugestoesHistoricoTela(termo);
  }, 280);
}

function buscarSugestoesHistoricoTela(termo) {
  const dataInicial = document.getElementById('historyStartDate').value;
  const dataFinal = document.getElementById('historyEndDate').value;

  if (!dataInicial || !dataFinal || !currentHistoryPage) return;

  const seq = ++historySuggestionSeq;

  google.script.run
    .withSuccessHandler(lista => {
      if (seq !== historySuggestionSeq) return;
      renderSugestoesHistorico(lista || []);
    })
    .withFailureHandler(() => {
      if (seq !== historySuggestionSeq) return;
      fecharSugestoesHistorico();
    })
    .buscarSugestoesHistorico(
      currentHistoryPage,
      dataInicial,
      dataFinal,
      termo
    );
}

function renderSugestoesHistorico(lista) {
  const box = document.getElementById('historySuggestions');
  if (!box) return;

  box.innerHTML = '';

  if (!lista.length) {
    box.style.display = 'none';
    return;
  }

  lista.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-suggestion';

    const tipo = document.createElement('span');
    tipo.className = 'history-suggestion-type';
    tipo.textContent = item.type || '';

    const valor = document.createElement('span');
    valor.textContent = item.value || '';

    button.appendChild(tipo);
    button.appendChild(valor);

    button.onclick = () => {
      const input = document.getElementById('historySearch');
      input.value = item.value || '';
      atualizarBotaoLimparHistorico();
      fecharSugestoesHistorico();
      consultarHistorico(true);
    };

    box.appendChild(button);
  });

  box.style.display = 'block';
}

function historicoEnter(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    consultarHistorico(true);
  }
}

function consultarHistorico(manual) {
  historyOffset = 0;
  historyNextOffset = null;
  historyTotal = 0;
  historyRowsCache = [];

  executarConsultaHistorico(manual, false);
}


function carregarMaisHistorico() {
  if (historyNextOffset === null) return;

  historyOffset = historyNextOffset;
  executarConsultaHistorico(historyRenderMode === 'range', true);
}


function executarConsultaHistorico(manual, append) {
  const dataInicial = document.getElementById('historyStartDate').value;
  const dataFinal = document.getElementById('historyEndDate').value;
  const busca = document.getElementById('historySearch').value.trim();

  if (!dataInicial || !dataFinal) {
    alert('Selecione a data inicial e a data final.');
    return;
  }

  if (dataInicial > dataFinal) {
    alert('A data inicial não pode ser maior que a data final.');
    return;
  }

  if (!append) {
    historyRenderMode = manual ? 'range' : 'daily';
  }

  const button = document.getElementById('historyConsultButton');
  const moreButton = document.getElementById('historyLoadMore');

  button.disabled = true;
  button.textContent = 'CONSULTANDO...';

  if (moreButton) {
    moreButton.disabled = true;
    moreButton.textContent = append ? 'CARREGANDO...' : 'CARREGAR MAIS';
  }

  document.getElementById('historyLoading').style.display =
    append ? 'none' : 'block';

  if (!append) {
    document.getElementById('historyEmpty').style.display = 'none';
    document.getElementById('historyCards').innerHTML = '';
    document.getElementById('historyInfo').textContent = '';
  }

  google.script.run
    .withSuccessHandler(result => {
      button.disabled = false;
      button.textContent = 'CONSULTAR';

      document.getElementById('historyLoading').style.display = 'none';

      const novas = result.rows || [];

      historyRowsCache = append
        ? historyRowsCache.concat(novas)
        : novas.slice();

      historyHeadersCache =
        result.headers ||
        getPageConfigByKey(currentHistoryPage).headers;

      historyTotal = Number(result.total || 0);
      historyNextOffset =
        result.nextOffset === null ||
        result.nextOffset === undefined
          ? null
          : Number(result.nextOffset);

      renderHistoryCards(
        historyRowsCache,
        historyHeadersCache,
        dataInicial,
        dataFinal,
        historyRenderMode
      );

      document.getElementById('historyInfo').textContent =
        historyRowsCache.length +
        ' de ' +
        historyTotal +
        (historyTotal === 1 ? ' registro' : ' registros');

      if (moreButton) {
        moreButton.disabled = false;
        moreButton.textContent = 'CARREGAR MAIS';
        moreButton.style.display =
          result.hasMore ? 'inline-block' : 'none';
      }
    })
    .withFailureHandler(error => {
      button.disabled = false;
      button.textContent = 'CONSULTAR';

      document.getElementById('historyLoading').style.display = 'none';

      if (moreButton) {
        moreButton.disabled = false;
        moreButton.textContent = 'CARREGAR MAIS';
      }

      if (!append) {
        document.getElementById('historyEmpty').style.display = 'block';
        document.getElementById('historyEmpty').textContent =
          error.message || 'Erro ao consultar o histórico.';
      }
    })
    .consultarHistoricoPaginado(
      currentHistoryPage,
      dataInicial,
      dataFinal,
      busca,
      historyOffset,
      historyPageSize
    );
}


function renderHistoryCards(historyRows, headers, dataInicial, dataFinal, mode) {

  const container = document.getElementById('historyCards');
  const empty = document.getElementById('historyEmpty');

  container.innerHTML = '';

  if (!historyRows.length) {
    empty.style.display = 'block';
    empty.textContent =
      'Nenhum registro encontrado para os filtros selecionados.';
    return;
  }

  empty.style.display = 'none';

  if (mode === 'daily') {

    const grupos = {};

    historyRows.forEach(item => {
      const data = item.values && item.values[0] ? item.values[0] : 'Sem data';

      if (!grupos[data]) grupos[data] = [];
      grupos[data].push(item);
    });

    Object.keys(grupos).forEach(data => {
      criarHistoryCard(
        container,
        tituloCardHistorico(data, data),
        headers,
        grupos[data]
      );
    });

  } else {

    criarHistoryCard(
      container,
      tituloCardHistorico(dataBR(dataInicial), dataBR(dataFinal)),
      headers,
      historyRows
    );
  }
}

function tituloCardHistorico(dataInicialBR, dataFinalBR) {
  const tipo = currentHistoryPage === 'RECEBIMENTO'
    ? 'Relatório de Entrada'
    : 'Relatório de Saída';

  if (dataInicialBR === dataFinalBR) {
    return tipo + ' de ' + dataInicialBR;
  }

  return tipo + ' de ' + dataInicialBR + ' a ' + dataFinalBR;
}

function criarHistoryCard(container, titulo, headers, items) {

  const card = document.createElement('div');
  card.className = 'history-card';

  const title = document.createElement('div');
  title.className = 'history-card-title';
  title.textContent = titulo;

  const body = document.createElement('div');
  body.className = 'history-card-body';

  const table = document.createElement('table');
  table.className = 'history-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headRow.appendChild(th);
  });

  const editTh = document.createElement('th');
  editTh.className = 'edit-col';
  editTh.textContent = '';
  headRow.appendChild(editTh);

  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');

  items.forEach(item => {
    tbody.appendChild(criarLinhaHistorico(item, headers));
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  body.appendChild(table);

  card.appendChild(title);
  card.appendChild(body);

  container.appendChild(card);
}

function criarLinhaHistorico(item, headers) {

  const tr = document.createElement('tr');
  tr.dataset.historyRow = item.historyRow;

  (item.values || []).forEach((value, index) => {
    const td = document.createElement('td');
    td.textContent = value ?? '';
    td.dataset.label = headers[index] || '';
    tr.appendChild(td);
  });

  const actionTd = document.createElement('td');
  actionTd.className = 'edit-col';
  actionTd.dataset.label = 'Editar';

  const editButton = document.createElement('button');
  editButton.className = 'edit-history-btn';
  editButton.type = 'button';
  editButton.title = 'Editar linha';
  editButton.textContent = '✎';

  editButton.onclick = () => iniciarEdicaoHistorico(tr, item, headers);

  actionTd.appendChild(editButton);
  tr.appendChild(actionTd);

  return tr;
}

function iniciarEdicaoHistorico(tr, item, headers) {

  const valuesOriginais = (item.values || []).slice();

  tr.innerHTML = '';

  headers.forEach((header, index) => {
    const td = document.createElement('td');
    td.dataset.label = header;

    const input = document.createElement('input');
    input.className = 'history-edit-input';
    input.type = 'text';
    input.value = valuesOriginais[index] ?? '';

    if (
      currentHistoryPage === 'RECEBIMENTO' &&
      header === 'Cor'
    ) {
      input.setAttribute('list', 'coresFixparList');
    }

    if (
      currentHistoryPage === 'RECEBIMENTO' &&
      header === 'Processo'
    ) {
      input.setAttribute('list', 'processosFixparList');
    }

    const autoCalc =
      currentHistoryPage === 'RECEBIMENTO' &&
      (header === 'Diferença' || header === 'Diferença em %');

    if (autoCalc) {
      input.readOnly = true;
      input.style.background = '#f1f4f6';
    }

    td.appendChild(input);
    tr.appendChild(td);
  });

  const actionTd = document.createElement('td');
  actionTd.className = 'edit-col';
  actionTd.dataset.label = 'Editar';

  const actions = document.createElement('div');
  actions.className = 'history-actions';

  const save = document.createElement('button');
  save.className = 'save-history-btn';
  save.type = 'button';
  save.title = 'Salvar alteração';
  save.textContent = '✓';

  const cancel = document.createElement('button');
  cancel.className = 'cancel-history-btn';
  cancel.type = 'button';
  cancel.title = 'Cancelar';
  cancel.textContent = '×';

  save.onclick = () => salvarEdicaoHistorico(tr, item);
  cancel.onclick = () => cancelarEdicaoHistorico(tr, item, headers);

  actions.appendChild(save);
  actions.appendChild(cancel);
  actionTd.appendChild(actions);
  tr.appendChild(actionTd);

  if (currentHistoryPage === 'RECEBIMENTO') {
    const inputs = tr.querySelectorAll('.history-edit-input');
    const cfg = getPageConfigByKey(currentHistoryPage);
    const nfIndex = cfg.headers.indexOf('Peso NF. Fixpar');
    const danutaIndex = cfg.headers.indexOf('Peso Danuta');

    [nfIndex, danutaIndex].forEach(idx => {
      if (idx >= 0 && inputs[idx]) {
        inputs[idx].addEventListener('input', () => {
          recalcularHistoricoEditavel(inputs, cfg.headers);
        });
      }
    });
  }
}

function recalcularHistoricoEditavel(inputs, headers) {
  const nfIndex = headers.indexOf('Peso NF. Fixpar');
  const danutaIndex = headers.indexOf('Peso Danuta');
  const diferencaIndex = headers.indexOf('Diferença');
  const percentualIndex = headers.indexOf('Diferença em %');

  const nf = parseNumeroTela(inputs[nfIndex] ? inputs[nfIndex].value : '');
  const danuta = parseNumeroTela(inputs[danutaIndex] ? inputs[danutaIndex].value : '');

  if (nf === null || danuta === null) {
    if (inputs[diferencaIndex]) inputs[diferencaIndex].value = '';
    if (inputs[percentualIndex]) inputs[percentualIndex].value = '';
    return;
  }

  if (inputs[diferencaIndex]) {
    inputs[diferencaIndex].value =
      formatarNumeroTela(arredondarTela(nf - danuta, 3));
  }

  if (inputs[percentualIndex]) {
    inputs[percentualIndex].value =
      nf === 0
        ? ''
        : formatarPercentualTela(arredondarTela((danuta / nf) * 100, 2));
  }
}

function salvarEdicaoHistorico(tr, item) {

  const inputs = tr.querySelectorAll('.history-edit-input');
  const novosValores = Array.from(inputs).map(input => input.value);

  const botoes = tr.querySelectorAll('button');
  botoes.forEach(btn => btn.disabled = true);

  google.script.run
    .withSuccessHandler(result => {

      item.values = (result.values || novosValores).slice();

      const cfg = getPageConfigByKey(currentHistoryPage);

      cancelarEdicaoHistorico(tr, item, cfg.headers);

      // Atualiza cache para relatórios e visualização.
      const cacheItem = historyRowsCache.find(
        x => Number(x.historyRow) === Number(item.historyRow)
      );

      if (cacheItem) {
        cacheItem.values = item.values.slice();
      }

      alert(
        result.alteracoes
          ? 'Alteração salva e registrada no log.'
          : 'Nenhuma alteração foi identificada.'
      );
    })
    .withFailureHandler(error => {
      botoes.forEach(btn => btn.disabled = false);
      alert(error.message || 'Não foi possível salvar a alteração.');
    })
    .editarHistorico(
      currentHistoryPage,
      item.historyRow,
      novosValores
    );
}

function cancelarEdicaoHistorico(tr, item, headers) {
  const nova = criarLinhaHistorico(item, headers);
  tr.replaceWith(nova);
}

async function gerarRelatorioHistoricoTela() {

  const dataInicial =
    document.getElementById('historyStartDate').value;

  const dataFinal =
    document.getElementById('historyEndDate').value;

  const busca =
    document.getElementById('historySearch').value.trim();

  if (!dataInicial || !dataFinal) {
    alert('Selecione a data inicial e a data final.');
    return;
  }

  if (dataInicial > dataFinal) {
    alert('A data inicial não pode ser maior que a data final.');
    return;
  }

  const prefixo =
    currentHistoryPage === 'RECEBIMENTO'
      ? 'Relatório de Entrada'
      : 'Relatório de Saída';

  const nomePeriodo =
    dataInicial === dataFinal
      ? dataBR(dataInicial).replace(/\//g, '-')
      : (
          dataBR(dataInicial).replace(/\//g, '-') +
          '_a_' +
          dataBR(dataFinal).replace(/\//g, '-')
        );

  const nomeSugerido =
    prefixo +
    ' - ' +
    nomePeriodo +
    '.pdf';

  // Mesma regra de todos os relatórios.
  const janelaSalvar = abrirJanelaSalvarRelatorio();

  const button =
    document.getElementById('historyReportButton');

  button.disabled = true;
  button.textContent = 'GERANDO...';

  google.script.run
    .withSuccessHandler(async result => {

      button.disabled = false;
      button.textContent = 'GERAR RELATÓRIO';

      prepararJanelaSalvarRelatorio(
        janelaSalvar,
        result
      );

      mostrarSucessoRelatorio();
    })
    .withFailureHandler(error => {

      if (janelaSalvar && !janelaSalvar.closed) janelaSalvar.close();

      button.disabled = false;
      button.textContent = 'GERAR RELATÓRIO';

      alert(
        error.message ||
        'Não foi possível gerar o relatório.'
      );
    })
    .gerarRelatorioHistorico(
      currentHistoryPage,
      dataInicial,
      dataFinal,
      busca
    );
}



