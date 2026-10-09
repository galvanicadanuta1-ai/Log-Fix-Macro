/* ============================================================
   PROGRAMAÇÃO SGQ - PRIORIDADE
   ============================================================
   Mantém o campo interno "status" para compatibilidade com o backend,
   mas apresenta ao usuário o conceito correto de "Prioridade".

   Regras:
   - cabeçalho "Prioridade" nas duas grades;
   - sugestões "Urgente" e "Vazio";
   - "Vazio" limpa realmente o campo e não é salvo como texto;
   - continua permitindo digitar qualquer texto livremente;
   - campo sem valor fica VISUALMENTE vazio (sem placeholder);
   - mantém o valor local atualizado enquanto o usuário digita, evitando
     que um re-render recoloque "Urgente" antes do salvamento;
   - PDFs/Excel usam o cabeçalho "Prioridade";
   - formulário de OS manual segue o mesmo padrão.
   ============================================================ */

(function () {
  const DATALIST_ID = 'programacaoPrioridadeList';
  const VALOR_LIMPAR = 'Vazio';

  function garantirDatalistPrioridade_() {
    let list = document.getElementById(DATALIST_ID);

    if (!list) {
      list = document.createElement('datalist');
      list.id = DATALIST_ID;
      document.body.appendChild(list);
    }

    list.innerHTML =
      '<option value="Urgente"></option>' +
      '<option value="Vazio"></option>';

    return list;
  }

  function ajustarCabecalhosPrioridade_() {
    document
      .querySelectorAll('#programacaoSgqScreen .programacao-table thead .programacao-column-head th, #programacaoSgqScreen .programacao-table thead tr:last-child th')
      .forEach(th => {
        if (String(th.textContent || '').trim().toLowerCase() === 'status') {
          th.textContent = 'Prioridade';
        }
      });
  }

  function atualizarEstadoLocal_(input) {
    if (!input) return;

    const tr = input.closest('tr');
    const op = tr ? String(tr.dataset.op || '') : '';
    if (!op) return;

    try {
      if (typeof programacaoSgqRows !== 'undefined' && Array.isArray(programacaoSgqRows)) {
        const item = programacaoSgqRows.find(row => String(row && row.op || '') === op);
        if (item) item.status = String(input.value || '').trim();
      }
    } catch (e) {}
  }

  function normalizarSelecao_(input) {
    if (!input) return;

    if (String(input.value || '').trim().toLocaleLowerCase('pt-BR') === VALOR_LIMPAR.toLocaleLowerCase('pt-BR')) {
      input.value = '';
    }

    atualizarEstadoLocal_(input);
  }

  function ajustarInputPrioridade_(input) {
    if (!input) return;

    input.setAttribute('list', DATALIST_ID);
    input.setAttribute('autocomplete', 'off');
    input.placeholder = '';
    input.title = 'Selecione Urgente, Vazio ou digite livremente';
    input.setAttribute('aria-label', 'Prioridade');

    if (input.dataset.prioridadeAjustada === '1') return;
    input.dataset.prioridadeAjustada = '1';

    input.addEventListener('input', () => {
      normalizarSelecao_(input);
    });

    input.addEventListener('change', () => {
      const eraVazio = String(input.value || '').trim().toLocaleLowerCase('pt-BR') === VALOR_LIMPAR.toLocaleLowerCase('pt-BR');
      normalizarSelecao_(input);
      if (eraVazio) {
        setTimeout(() => input.blur(), 0);
      }
    });
  }

  function ajustarModalManual_() {
    const label = document.querySelector('label[for="manualOsStatus"]');
    if (label) label.textContent = 'Prioridade';

    const atual = document.getElementById('manualOsStatus');
    if (!atual) return;

    if (atual.tagName === 'SELECT') {
      const input = document.createElement('input');
      input.id = 'manualOsStatus';
      input.type = 'text';
      input.value = atual.value || '';
      input.placeholder = '';
      input.autocomplete = 'off';
      input.setAttribute('list', DATALIST_ID);
      input.setAttribute('aria-label', 'Prioridade');
      input.title = 'Selecione Urgente, Vazio ou digite livremente';
      atual.replaceWith(input);
      ajustarInputPrioridade_(input);
    } else {
      ajustarInputPrioridade_(atual);
    }
  }

  function ajustarTelaPrioridade_() {
    garantirDatalistPrioridade_();
    ajustarCabecalhosPrioridade_();
    ajustarModalManual_();

    document
      .querySelectorAll('#programacaoSgqScreen .programacao-status-input')
      .forEach(ajustarInputPrioridade_);
  }

  const garantirLayoutOriginal_ = window.garantirLayoutProgramacaoDividida_;
  if (typeof garantirLayoutOriginal_ === 'function') {
    window.garantirLayoutProgramacaoDividida_ = function () {
      const result = garantirLayoutOriginal_.apply(this, arguments);
      ajustarTelaPrioridade_();
      return result;
    };
  }

  const criarLinhaOriginal_ = window.criarLinhaProgramacaoSgq_;
  if (typeof criarLinhaOriginal_ === 'function') {
    window.criarLinhaProgramacaoSgq_ = function () {
      garantirDatalistPrioridade_();
      const tr = criarLinhaOriginal_.apply(this, arguments);
      ajustarInputPrioridade_(tr && tr.querySelector('.programacao-status-input'));
      return tr;
    };
  }

  const dadosExportacaoOriginal_ = window.dadosProgramacaoParaExportar_;
  if (typeof dadosExportacaoOriginal_ === 'function') {
    window.dadosProgramacaoParaExportar_ = function () {
      const dados = dadosExportacaoOriginal_.apply(this, arguments) || {};

      const trocar = lista => Array.isArray(lista)
        ? lista.map(valor => String(valor || '').trim() === 'Status' ? 'Prioridade' : valor)
        : lista;

      dados.headers = trocar(dados.headers);
      dados.headersEsquerda = trocar(dados.headersEsquerda);
      dados.headersDireita = trocar(dados.headersDireita);
      dados.headersPrincipal = trocar(dados.headersPrincipal);
      dados.headersUmaCaixa = trocar(dados.headersUmaCaixa);

      return dados;
    };
  }

  garantirDatalistPrioridade_();
  ajustarTelaPrioridade_();
})();
