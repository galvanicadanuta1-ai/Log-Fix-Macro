/* ============================================================
   OPERAÇÃO - CAMADA DE CONFIABILIDADE V3
   ============================================================
   Não altera layout nem regras de negócio.
   Apenas endurece o fluxo de gravação:
   - debounce por linha;
   - uma linha nunca dispara duas gravações simultâneas;
   - se houver edição enquanto salva, grava novamente ao terminar;
   - clientId é enviado ao backend para idempotência;
   - antes de relatório, toda a tela é consolidada em UM lote.
   ============================================================ */

(function () {
  const SAVE_DELAY_MS = 1200;

  window.onCellInput = function (rowId, colIndex, value, tr) {
    const row = rows.find(item => item.id === rowId);
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

    const row = rows.find(item => item.id === rowId);
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

    if (typeof setStatus === 'function') {
      setStatus('Salvando...', 'saving');
    }

    let promise;

    if (row.sheetRow && empty) {
      const antigaSheetRow = row.sheetRow;

      promise = chamarApiAppsScript('limparLinha', [
        currentPage,
        antigaSheetRow
      ]).then(() => {
        row.sheetRow = null;
        row.dirty = false;
        if (typeof setStatus === 'function') {
          setStatus('Alterações salvas', 'saved');
        }
        garantirDuasLinhasNaTela();
        return null;
      });
    } else {
      const date = document.getElementById('selectedDate').value || hojeISO();
      row.values[0] = date;

      promise = chamarApiAppsScript('salvarLinha', [
        currentPage,
        date,
        row.values.slice(),
        row.sheetRow,
        row.id
      ]).then(result => {
        if (result) {
          row.sheetRow = result.sheetRow || row.sheetRow;

          if (Array.isArray(result.values)) {
            row.values = result.values.slice();

            const trAtual = document.querySelector(
              'tr[data-row-id="' + row.id + '"]'
            );

            if (trAtual) {
              const inputs = trAtual.querySelectorAll('.cell-input');
              result.values.forEach((valor, i) => {
                if (inputs[i] && i > 0 && document.activeElement !== inputs[i]) {
                  inputs[i].value = valor ?? '';
                }
              });
            }
          }
        }

        if (Number(row.revision || 0) === revisionEnviada) {
          row.dirty = false;
        }

        if (typeof setStatus === 'function') {
          setStatus('Alterações salvas', 'saved');
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
      });
    }

    row.savePromise = promise
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

        if (precisaRepetir) {
          setTimeout(() => salvarAgora(row.id), 0);
        }
      });

    return row.savePromise;
  };

  window.sincronizarTelaAntesRelatorio_ = async function () {
    cancelarTimers();

    const preenchidas = rows.filter(row => !linhaSemDados(row));
    if (!preenchidas.length) return { ok: true, rows: [] };

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

    const date = document.getElementById('selectedDate').value || hojeISO();
    const payload = preenchidas.map(row => ({
      clientId: row.id,
      sheetRow: row.sheetRow,
      values: row.values.slice()
    }));

    try {
      const result = await chamarApiAppsScript('salvarLinhasEmLote', [
        currentPage,
        date,
        payload
      ]);

      const salvas = result && Array.isArray(result.rows)
        ? result.rows
        : [];

      salvas.forEach(item => {
        const row = rows.find(r => r.id === item.clientId);
        if (!row) return;

        row.sheetRow = item.sheetRow || row.sheetRow;
        row.dirty = false;

        if (Array.isArray(item.values)) {
          row.values = item.values.slice();
        }
      });

      renderTable();

      if (typeof setStatus === 'function') {
        setStatus('Dados consolidados', 'saved');
      }

      return result;
    } finally {
      salvamentoEmLote = false;

      if (button) {
        button.disabled = false;
        button.textContent = textoOriginal || 'GERAR RELATÓRIO';
      }
    }
  };
})();
