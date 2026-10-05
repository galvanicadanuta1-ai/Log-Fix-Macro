/* ============================================================
   RECUPERAÇÃO DE OPS DE 1 CAIXA
   ============================================================
   Proteção adicional para que OPs automáticas com exatamente
   1 caixa nunca desapareçam da coluna da direita por uma falha
   de composição da programação.

   A fonte de verdade continua sendo o Histórico Entrada/Saída.
   ============================================================ */

(function () {
  let recuperacaoExecutada = false;
  let recuperacaoEmAndamento = false;

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

  function somarTextoNumero_(atual, novo) {
    const soma = numero_(atual) + numero_(novo);

    if (Math.abs(soma - Math.round(soma)) < 0.0000001) {
      return String(Math.round(soma));
    }

    return String(soma)
      .replace('.', ',');
  }

  function dataTime_(valor) {
    const texto = String(valor || '').trim();
    const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (br) {
      return new Date(
        Number(br[3]),
        Number(br[2]) - 1,
        Number(br[1])
      ).getTime();
    }

    const data = new Date(texto);
    return isNaN(data.getTime()) ? Number.MAX_SAFE_INTEGER : data.getTime();
  }

  function periodoSeguro_() {
    const ano = new Date().getFullYear();
    return {
      inicio: (ano - 1) + '-01-01',
      fim: (ano + 1) + '-12-31'
    };
  }

  async function recuperarOpsUmaCaixa_() {
    if (recuperacaoExecutada || recuperacaoEmAndamento) return;
    if (typeof chamarApiAppsScript !== 'function') return;

    recuperacaoEmAndamento = true;

    try {
      const periodo = periodoSeguro_();

      const resultados = await Promise.all([
        chamarApiAppsScript('consultarHistorico', [
          'RECEBIMENTO',
          periodo.inicio,
          periodo.fim,
          ''
        ]),
        chamarApiAppsScript('consultarHistorico', [
          'SAIDA',
          periodo.inicio,
          periodo.fim,
          ''
        ])
      ]);

      const entradas = resultados[0] && Array.isArray(resultados[0].rows)
        ? resultados[0].rows
        : [];
      const saidas = resultados[1] && Array.isArray(resultados[1].rows)
        ? resultados[1].rows
        : [];

      const opsComSaida = new Set();

      saidas.forEach(registro => {
        const valores = registro && Array.isArray(registro.values)
          ? registro.values
          : [];
        const chave = chaveOp_(valores[1]);
        if (chave) opsComSaida.add(chave);
      });

      const agrupado = {};

      entradas.forEach(registro => {
        const valores = registro && Array.isArray(registro.values)
          ? registro.values
          : [];

        const op = String(valores[1] == null ? '' : valores[1]).trim();
        const chave = chaveOp_(op);

        if (!chave || opsComSaida.has(chave)) return;

        if (!agrupado[chave]) {
          agrupado[chave] = {
            dataEntrada: valores[0] || '',
            op: op,
            qtdCaixas: '',
            qtdConteiner: '',
            cor: '',
            pesoDanuta: '',
            status: '',
            ok: false,
            encaminhado: false,
            manual: false,
            cores: new Set(),
            primeiraData: dataTime_(valores[0])
          };
        }

        const item = agrupado[chave];
        const dataAtual = dataTime_(valores[0]);

        if (dataAtual < item.primeiraData) {
          item.primeiraData = dataAtual;
          item.dataEntrada = valores[0] || '';
        }

        if (String(valores[2] == null ? '' : valores[2]).trim() !== '') {
          item.qtdCaixas = somarTextoNumero_(item.qtdCaixas, valores[2]);
        }

        if (String(valores[3] == null ? '' : valores[3]).trim() !== '') {
          item.qtdConteiner = somarTextoNumero_(item.qtdConteiner, valores[3]);
        }

        if (String(valores[5] == null ? '' : valores[5]).trim() !== '') {
          item.pesoDanuta = somarTextoNumero_(item.pesoDanuta, valores[5]);
        }

        const cor = String(valores[8] == null ? '' : valores[8]).trim();
        if (cor) item.cores.add(cor);
      });

      const existentes = new Map();
      (programacaoSgqRows || []).forEach(item => {
        const chave = chaveOp_(item.op);
        if (chave) existentes.set(chave, item);
      });

      let adicionadas = 0;

      Object.keys(agrupado).forEach(chave => {
        const item = agrupado[chave];

        if (numero_(item.qtdCaixas) !== 1) return;
        if (existentes.has(chave)) return;

        item.cor = Array.from(item.cores).join(' / ');
        delete item.cores;
        delete item.primeiraData;

        programacaoSgqRows.push(item);
        adicionadas++;
      });

      recuperacaoExecutada = true;

      if (adicionadas > 0) {
        if (typeof ordenarProgramacaoSgqRows_ === 'function') {
          ordenarProgramacaoSgqRows_();
        }

        if (typeof renderProgramacaoSgqOriginalRecuperacao_ === 'function') {
          renderProgramacaoSgqOriginalRecuperacao_();
        }
      }
    } catch (error) {
      console.error('Falha ao conferir OPs de 1 caixa:', error);
      recuperacaoExecutada = true;
    } finally {
      recuperacaoEmAndamento = false;
    }
  }

  const renderOriginal = window.renderProgramacaoSgq;

  if (typeof renderOriginal === 'function') {
    window.renderProgramacaoSgqOriginalRecuperacao_ = renderOriginal;

    window.renderProgramacaoSgq = function () {
      const resultado = renderOriginal.apply(this, arguments);

      /*
       * Confere em segundo plano se o Histórico possui alguma OP pendente
       * de 1 caixa que não veio na lista principal do backend.
       */
      recuperarOpsUmaCaixa_();

      return resultado;
    };
  }
})();
