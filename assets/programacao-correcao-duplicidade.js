/* ============================================================
   PROGRAMAÇÃO SGQ - CORREÇÃO DE DUPLICIDADE
   ============================================================
   Corrige o caso em que o Histórico contém o mesmo registro mais
   de uma vez, fazendo 1 caixa virar 2, 11 virar 22 e o peso dobrar.

   Regras:
   - primeiro elimina duplicidade por sourceRow;
   - depois elimina registros integralmente idênticos, mesmo que
     tenham sourceRow diferente;
   - corrige quantidade, peso, cor e data das linhas automáticas;
   - preserva Status, OK e Encaminhado;
   - mantém OSs manuais intactas;
   - após a correção, Qtd. Caixas = 1 volta para o bloco da direita.
   ============================================================ */

(function () {
  function chaveOp_(valor) {
    return String(valor == null ? '' : valor)
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  function numero_(valor) {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;

    let texto = String(valor == null ? '' : valor)
      .trim()
      .replace(/\s/g, '');

    if (!texto) return 0;

    if (texto.includes(',') && texto.includes('.')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else if (texto.includes(',')) {
      texto = texto.replace(',', '.');
    }

    const n = Number(texto);
    return Number.isFinite(n) ? n : 0;
  }

  function formatarNumero_(valor, temValor) {
    if (!temValor) return '';

    const n = Number(valor || 0);

    if (Math.abs(n - Math.round(n)) < 0.0000001) {
      return String(Math.round(n));
    }

    return String(Math.round(n * 1000) / 1000).replace('.', ',');
  }

  function dataTime_(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return Number.MAX_SAFE_INTEGER;

    let m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    }

    m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    }

    const d = new Date(texto);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  function periodoSeguro_() {
    const ano = new Date().getFullYear();
    return {
      inicio: (ano - 1) + '-01-01',
      fim: (ano + 1) + '-12-31'
    };
  }

  function assinaturaValores_(registro) {
    const values = registro && Array.isArray(registro.values)
      ? registro.values
      : [];

    return values
      .map(v => String(v == null ? '' : v).trim())
      .join('\u001f');
  }

  function deduplicarHistorico_(resultado) {
    const rows = resultado && Array.isArray(resultado.rows)
      ? resultado.rows
      : [];

    const porSource = new Map();

    rows.forEach(registro => {
      const source = registro && registro.sourceRow !== null &&
        registro.sourceRow !== undefined && registro.sourceRow !== ''
        ? String(registro.sourceRow)
        : '';

      const chave = source
        ? 'SRC|' + source
        : 'SEM_SRC|' + assinaturaValores_(registro);

      const anterior = porSource.get(chave);
      const atualRow = Number(registro && registro.historyRow || 0);
      const anteriorRow = Number(anterior && anterior.historyRow || 0);

      if (!anterior || atualRow >= anteriorRow) {
        porSource.set(chave, registro);
      }
    });

    /*
     * Segunda proteção: há históricos antigos em que o mesmo registro
     * pode existir duas vezes com sourceRow diferente. Se todas as
     * informações visíveis forem idênticas, conta somente uma vez.
     */
    const porConteudo = new Map();

    Array.from(porSource.values()).forEach(registro => {
      const assinatura = assinaturaValores_(registro);
      const anterior = porConteudo.get(assinatura);
      const atualRow = Number(registro && registro.historyRow || 0);
      const anteriorRow = Number(anterior && anterior.historyRow || 0);

      if (!anterior || atualRow >= anteriorRow) {
        porConteudo.set(assinatura, registro);
      }
    });

    return Array.from(porConteudo.values());
  }

  function agruparEntradas_(resultado) {
    const entradas = deduplicarHistorico_(resultado);
    const agrupado = new Map();

    entradas.forEach(registro => {
      const v = registro && Array.isArray(registro.values)
        ? registro.values
        : [];

      const op = String(v[1] == null ? '' : v[1]).trim();
      const chave = chaveOp_(op);
      if (!chave) return;

      if (!agrupado.has(chave)) {
        agrupado.set(chave, {
          op,
          dataEntrada: v[0] || '',
          primeiraData: dataTime_(v[0]),
          qtdCaixas: 0,
          qtdConteiner: 0,
          pesoDanuta: 0,
          temCaixas: false,
          temConteiner: false,
          temPeso: false,
          cores: new Map()
        });
      }

      const item = agrupado.get(chave);
      const dt = dataTime_(v[0]);

      if (dt < item.primeiraData) {
        item.primeiraData = dt;
        item.dataEntrada = v[0] || '';
      }

      if (String(v[2] == null ? '' : v[2]).trim() !== '') {
        item.temCaixas = true;
        item.qtdCaixas += numero_(v[2]);
      }

      if (String(v[3] == null ? '' : v[3]).trim() !== '') {
        item.temConteiner = true;
        item.qtdConteiner += numero_(v[3]);
      }

      if (String(v[5] == null ? '' : v[5]).trim() !== '') {
        item.temPeso = true;
        item.pesoDanuta += numero_(v[5]);
      }

      const cor = String(v[8] == null ? '' : v[8]).trim();
      if (cor) item.cores.set(cor.toLocaleLowerCase('pt-BR'), cor);
    });

    return agrupado;
  }

  function aplicarHistoricoNaBase_(baseRows, entradasResultado) {
    const agrupado = agruparEntradas_(entradasResultado);
    const base = Array.isArray(baseRows) ? baseRows : [];

    return base.map(item => {
      if (!item || item.manual === true) return item;

      const hist = agrupado.get(chaveOp_(item.op));
      if (!hist) return item;

      return Object.assign({}, item, {
        dataEntrada: hist.dataEntrada || item.dataEntrada || '',
        op: hist.op || item.op || '',
        qtdCaixas: formatarNumero_(hist.qtdCaixas, hist.temCaixas),
        qtdConteiner: formatarNumero_(hist.qtdConteiner, hist.temConteiner),
        cor: Array.from(hist.cores.values()).join(' / ') || item.cor || '',
        pesoDanuta: formatarNumero_(hist.pesoDanuta, hist.temPeso),
        status: item.status || '',
        ok: Boolean(item.ok),
        encaminhado: Boolean(item.encaminhado),
        manual: false
      });
    });
  }

  window.carregarProgramacaoSgq = async function () {
    if (typeof garantirLayoutProgramacaoDividida_ === 'function') {
      garantirLayoutProgramacaoDividida_();
    }

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

    if (typeof setProgramacaoStatus === 'function') {
      setProgramacaoStatus('Carregando programação...', 'saving');
    }

    try {
      const periodo = periodoSeguro_();

      const resultados = await Promise.all([
        chamarApiAppsScript('carregarProgramacaoSgq', []),
        chamarApiAppsScript('consultarHistorico', [
          'RECEBIMENTO',
          periodo.inicio,
          periodo.fim,
          ''
        ])
      ]);

      const base = resultados[0] && Array.isArray(resultados[0].rows)
        ? resultados[0].rows
        : [];

      programacaoSgqRows = aplicarHistoricoNaBase_(base, resultados[1]);

      if (typeof ordenarProgramacaoSgqRows_ === 'function') {
        ordenarProgramacaoSgqRows_();
      }

      if (loading) loading.style.display = 'none';

      if (typeof renderProgramacaoSgq === 'function') {
        renderProgramacaoSgq();
      }

      if (typeof setProgramacaoStatus === 'function') {
        setProgramacaoStatus('Programação atualizada', 'saved');
      }
    } catch (error) {
      if (loading) loading.style.display = 'none';

      if (empty) {
        empty.style.display = 'block';
        empty.textContent = error && error.message
          ? error.message
          : 'Erro ao carregar a programação.';
      }

      if (typeof setProgramacaoStatus === 'function') {
        setProgramacaoStatus(
          error && error.message ? error.message : 'Erro ao carregar a programação.',
          'error'
        );
      }
    }
  };
})();
