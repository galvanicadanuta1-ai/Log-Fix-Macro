/* ============================================================
   OPERAÇÃO - CAMADA DE CONFIABILIDADE V3.1
   ============================================================
   Objetivos:
   - NUNCA sobrescrever o que o operador ainda está digitando;
   - salvar somente após pequena pausa de digitação;
   - uma linha nunca dispara duas gravações simultâneas;
   - se houver edição enquanto salva, a versão mais nova é enviada depois;
   - clientId é enviado ao backend para idempotência;
   - antes do relatório, toda a tela é consolidada em UM lote.
   ============================================================ */

(function () {
  const SAVE_DELAY_MS = 1400;
  const RESAVE_DELAY_MS = 300;

  function linhaPorId_(rowId) {
    return rows.find(item => item.id === rowId) || null;
  }

  function atualizarSomenteSheetRow_(row, result) {
    if (!row || !result) return;
    if (result.sheetRow) row.sheetRow = result.sheetRow;
  }

  /*
   * IMPORTANTE:
   * O retorno do servidor NÃO substitui mais row.values durante a digitação.
   * A tela/local é a fonte de verdade enquanto o operador trabalha.
   * Isso elimina o efeito em que um retorno atrasado apagava campos digitados
   * depois que a requisição havia sido enviada.
   */
  function marcarSalvoSeAtual_(row, revisionEnviada) {
    if (!row) return false;

    const atual = Number(row.revision || 0);
    if (atual === revisionEnviada) {
      row.dirty = false;
      return true;
    }

    row.dirty = true;
    row.needsSave = true;
    return false;
  }

  /* ============================================================
     RENDER DA GRADE
     ============================================================
     Reimplementado apenas para remover o salvamento imediato no blur.
     Ao sair de uma célula, apenas renova o debounce da linha.
     ============================================================ */
  window.appendRow = function (row) {
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

        /*
         * Antes: blur => salvarAgora().
         * Isso disparava uma requisição a cada TAB/célula e permitia que
         * respostas antigas concorressem com a digitação seguinte.
         * Agora: blur apenas reinicia o debounce da linha.
         */
        input.addEventListener('blur', () => {
          agendarSalvamento(row.id);
        });

        input.addEventListener('keydown', event => {
          controlarTeclado(event, row.id, colIndex);
        });
      }

      td.appendChild(input);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  };

  window.onCellInput = function (rowId, colIndex, value, tr) {
    const row = linhaPorId_(rowId);
    if (!row) return;

    row.values[colIndex] = value;
    row.revision = Number(row.revision || 0) + 1;
    row.dirty = true;

    if (currentPage === 'RECEBIMENTO') {
      const cfg = getPageConfig();

      if (cfg.headers[colIndex] === 'Cor') {
        adicionarCorLocal(value);
      }

      recalcularRecebimentoNaTela(row, tr);
    }

    if (tr) {
      if (linhaSemDados(row)) tr.classList.add('blank-row');
      else tr.classList.remove('blank-row');
    }

    garantirDuasLinhasNaTela();
    agendarSalvamento(rowId);
  };

  window.agendarSalvamento = function (rowId) {
    clearTimeout(saveTimers[rowId]);

    saveTimers[rowId] = setTimeout(() => {
      salvarAgora(rowId);
    }, SAVE_DELAY_MS);
  };

  window.salvarAgora = function (rowId) {
    clearTimeout(saveTimers[rowId]);
    delete saveTimers[rowId];

    const row = linhaPorId_(rowId);
    if (!row) return Promise.resolve(null);

    if (row.saving) {
      row.needsSave = true;
      return row.savePromise || Promise.resolve(null);
    }

    const empty = linhaSemDados(row);

    if (!row.sheetRow && empty) {
      row.dirty = false;
      return Promise.resolve(null);
    }

    row.saving = true;
    row.needsSave = false;

    const revisionEnviada = Number(row.revision || 0);
    const date = document.getElementById('selectedDate').value || hojeISO();
    const valuesEnviados = row.values.slice();
    valuesEnviados[0] = date;

    if (typeof setStatus === 'function') {
      setStatus('Salvando...', 'saving');
    }

    let promise;

    if (row.sheetRow && empty) {
      const antigaSheetRow = row.sheetRow;

      promise = chamarApiAppsScript('limparLinha', [
        currentPage,
        antigaSheetRow
      ]).then(result => {
        /* Só limpa a referência se ninguém voltou a digitar na linha. */
        if (Number(row.revision || 0) === revisionEnviada && linhaSemDados(row)) {
          row.sheetRow = null;
          row.dirty = false;
        } else {
          row.needsSave = true;
          row.dirty = true;
        }

        return result || null;
      });
    } else {
      promise = chamarApiAppsScript('salvarLinha', [
        currentPage,
        date,
        valuesEnviados,
        row.sheetRow,
        row.id
      ]).then(result => {
        atualizarSomenteSheetRow_(row, result);
        marcarSalvoSeAtual_(row, revisionEnviada);
        return result;
      });
    }

    row.savePromise = promise
      .then(result => {
        const estaAtual = Number(row.revision || 0) === revisionEnviada;

        if (typeof setStatus === 'function') {
          setStatus(
            estaAtual ? 'Alterações salvas' : 'Salvando alterações recentes...',
            estaAtual ? 'saved' : 'saving'
          );
        }

        garantirDuasLinhasNaTela();

        if (currentPage === 'RECEBIMENTO') {
          const cfg = getPageConfig();
          const corIndex = cfg.headers.indexOf('Cor');
          if (corIndex >= 0 && row.values[corIndex]) {
            adicionarCorLocal(row.values[corIndex]);
          }
        }

        return result;
      })
      .catch(error => {
        row.dirty = true;

        if (typeof setStatus === 'function') {
          setStatus(error.message || 'Erro ao salvar.', 'error');
        }

        throw error;
      })
      .finally(() => {
        row.saving = false;
        row.savePromise = null;

        const precisaRepetir =
          row.needsSave ||
          Number(row.revision || 0) !== revisionEnviada;

        row.needsSave = false;

        if (precisaRepetir && !window.sgqConsolidandoRelatorio_) {
          clearTimeout(saveTimers[row.id]);
          saveTimers[row.id] = setTimeout(() => {
            salvarAgora(row.id);
          }, RESAVE_DELAY_MS);
        }
      });

    return row.savePromise;
  };

  window.sincronizarTelaAntesRelatorio_ = async function () {
    cancelarTimers();
    window.sgqConsolidandoRelatorio_ = true;

    const preenchidas = rows.filter(row => !linhaSemDados(row));
    if (!preenchidas.length) {
      window.sgqConsolidandoRelatorio_ = false;
      return { ok: true, rows: [] };
    }

    salvamentoEmLote = true;

    const button = document.getElementById('reportButton');
    const textoOriginal = button ? button.textContent : '';

    if (button) {
      button.disabled = true;
      button.textContent = 'SALVANDO DADOS...';
    }

    if (typeof setStatus === 'function') {
      setStatus('Consolidando dados antes do relatório...', 'saving');
    }

    try {
      /*
       * Aguarda somente requisições de linha que já estavam em andamento.
       * O conteúdo local NÃO é substituído por nenhuma resposta delas.
       */
      const emAndamento = rows
        .map(row => row.savePromise)
        .filter(Boolean);

      if (emAndamento.length) {
        await Promise.allSettled(emAndamento);
      }

      const date = document.getElementById('selectedDate').value || hojeISO();
      const atuais = rows.filter(row => !linhaSemDados(row));

      const payload = atuais.map(row => ({
        clientId: row.id,
        sheetRow: row.sheetRow,
        values: row.values.slice()
      }));

      const result = await chamarApiAppsScript('salvarLinhasEmLote', [
        currentPage,
        date,
        payload
      ]);

      const salvas = result && Array.isArray(result.rows)
        ? result.rows
        : [];

      /*
       * Novamente: nunca aplicamos item.values sobre a tela.
       * Apenas recebemos o sheetRow confirmado pelo servidor.
       */
      salvas.forEach(item => {
        const row = rows.find(r => r.id === item.clientId);
        if (!row) return;

        if (item.sheetRow) row.sheetRow = item.sheetRow;
        row.dirty = false;
        row.needsSave = false;
      });

      if (typeof setStatus === 'function') {
        setStatus('Dados consolidados', 'saved');
      }

      return result;
    } finally {
      window.sgqConsolidandoRelatorio_ = false;
      salvamentoEmLote = false;

      if (button) {
        button.disabled = false;
        button.textContent = textoOriginal || 'GERAR RELATÓRIO';
      }
    }
  };
})();
