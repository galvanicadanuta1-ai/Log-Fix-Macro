/* ============================================================
   PROGRAMAÇÃO SGQ - DEDUPLICAÇÃO FINAL DE SEGURANÇA
   ============================================================
   Corrige duplicações históricas sem depender do backend.
   A lista de OPs pendentes continua vindo do backend, mas os
   quantitativos são reconstruídos pelo Histórico Entrada com
   deduplicação por conteúdo visível.
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

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  }

  function formatarNumero_(valor, temValor) {
    if (!temValor) return '';

    const numero = Number(valor || 0);

    if (Math.abs(numero - Math.round(numero)) < 0.0000001) {
      return String(Math.round(numero));
    }

    return String(Math.round(numero * 1000) / 1000).replace('.', ',');
  }

  function dataTime_(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return Number.MAX_SAFE_INTEGER;

    let match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      return new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1])
      ).getTime();
    }

    match = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      ).getTime();
    }

    const data = new Date(texto);
    return isNaN(data.getTime()) ? Number.MAX_SAFE_INTEGER : data.getTime();
  }

  function fingerprint_(values) {
    return (values || [])
      .slice(0, 12)
      .map(value => String(value == null ? '' : value).trim())
      .join('\u001f');
  }

  function agruparHistoricoSemDuplicar_(resultado) {
    const registros = resultado && Array.isArray(resultado.rows)
      ? resultado.rows
      : [];

    const fingerprints = new Set();
    const agrupado = new Map();

    registros.forEach(registro => {
      const values = registro && Array.isArray(registro.values)
        ? registro.values
        : [];

      if (!values.length) return;

      const fingerprint = fingerprint_(values);
      if (fingerprints.has(fingerprint)) return;
      fingerprints.add(fingerprint);

      const op = String(values[1] == null ? '' : values[1]).trim();
      const chave = chaveOp_(op);
      if (!chave) return;

      if (!agrupado.has(chave)) {
        agrupado.set(chave, {
          op,
          dataEntrada: values[0] || '',
          primeiraData: dataTime_(values[0]),
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
      const tempo = dataTime_(values[0]);

      if (tempo < item.primeiraData) {
        item.primeiraData = tempo;
        item.dataEntrada = values[0] || '';
      }

      if (String(values[2] == null ? '' : values[2]).trim() !== '') {
        item.temCaixas = true;
        item.qtdCaixas += numero_(values[2]);
      }

      if (String(values[3] == null ? '' : values[3]).trim() !== '') {
        item.temConteiner = true;
        item.qtdConteiner += numero_(values[3]);
      }

      if (String(values[5] == null ? '' : values[5]).trim() !== '') {
        item.temPeso = true;
        item.pesoDanuta += numero_(values[5]);
      }

      const cor = String(values[8] == null ? '' : values[8]).trim();
      if (cor) item.cores.set(cor.toLocaleLowerCase('pt-BR'), cor);
    });

    return agrupado;
  }

  function corrigirBase_(baseRows, historico) {
    const agrupado = agruparHistoricoSemDuplicar_(historico);

    return (Array.isArray(baseRows) ? baseRows : []).map(item => {
      if (!item || item.manual === true) return item;

      const historicoOp = agrupado.get(chaveOp_(item.op));
      if (!historicoOp) return item;

      return Object.assign({}, item, {
        dataEntrada: historicoOp.dataEntrada || item.dataEntrada || '',
        op: historicoOp.op || item.op || '',
        qtdCaixas: formatarNumero_(historicoOp.qtdCaixas, historicoOp.temCaixas),
        qtdConteiner: formatarNumero_(historicoOp.qtdConteiner, historicoOp.temConteiner),
        cor: Array.from(historicoOp.cores.values()).join(' / ') || item.cor || '',
        pesoDanuta: formatarNumero_(historicoOp.pesoDanuta, historicoOp.temPeso),
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
      const ano = new Date().getFullYear();
      const inicio = (ano - 2) + '-01-01';
      const fim = (ano + 1) + '-12-31';

      const resultados = await Promise.all([
        chamarApiAppsScript('carregarProgramacaoSgq', []),
        chamarApiAppsScript('consultarHistorico', [
          'RECEBIMENTO',
          inicio,
          fim,
          ''
        ])
      ]);

      const base = resultados[0] && Array.isArray(resultados[0].rows)
        ? resultados[0].rows
        : [];

      programacaoSgqRows = corrigirBase_(base, resultados[1]);

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
