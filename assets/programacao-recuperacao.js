/* ============================================================
   PROGRAMAÇÃO SGQ - CORREÇÃO FINAL / OPs DE 1 CAIXA
   ============================================================
   - garante a leitura das OPs de 1 caixa também pelo Histórico;
   - remove a coluna Enc. do bloco "OPs de 1 caixa";
   - preserva Enc. somente na programação principal;
   - otimiza larguras e aproveitamento dos dois blocos;
   - mantém Urgentes no topo e depois ordena por data.
   ============================================================ */

(function () {
  const LOGO_URL = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';
  const LAYOUT_VERSION = '2026-10-05-final';

  function carregarCssFinal_() {
    if (document.querySelector('link[data-programacao-final-css]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/programacao-final.css';
    link.dataset.programacaoFinalCss = '1';
    document.head.appendChild(link);
  }

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

  function formatarNumero_(valor) {
    const numero = numero_(valor);
    if (!numero) return '';

    if (Math.abs(numero - Math.round(numero)) < 0.0000001) {
      return String(Math.round(numero));
    }

    return String(Math.round(numero * 1000) / 1000).replace('.', ',');
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

    const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      return new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3])
      ).getTime();
    }

    const data = new Date(texto);
    return isNaN(data.getTime()) ? Number.MAX_SAFE_INTEGER : data.getTime();
  }

  function formatarDataCurta_(valor) {
    if (typeof formatarDataCurtaProgramacao_ === 'function') {
      return formatarDataCurtaProgramacao_(valor);
    }

    const texto = String(valor || '').trim();
    const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) {
      return String(br[1]).padStart(2, '0') + '/' +
        String(br[2]).padStart(2, '0') + '/' +
        String(br[3]).slice(-2);
    }

    return texto;
  }

  function periodoSeguro_() {
    const ano = new Date().getFullYear();
    return {
      inicio: (ano - 1) + '-01-01',
      fim: (ano + 1) + '-12-31'
    };
  }

  function headersEsquerda_() {
    return [
      'Data Entrada',
      'OP',
      'Qtd. Caixas',
      'Qtd. Caçamba',
      'Cor',
      'Kgs',
      'Status',
      'OK',
      'Enc.'
    ];
  }

  function headersDireita_() {
    return [
      'Data Entrada',
      'OP',
      'Qtd. Caixas',
      'Cor',
      'Kgs',
      'Status',
      'OK'
    ];
  }

  function htmlCabecalhoTabela_(titulo, subtituloId, headers) {
    const ths = headers.map(header => '<th>' + header + '</th>').join('');

    return '<thead>' +
      '<tr class="programacao-repeat-panel">' +
        '<th colspan="' + headers.length + '">' +
          '<div class="programacao-bloco-cabecalho">' +
            '<img class="programacao-bloco-logo" src="' + LOGO_URL + '" alt="Galvânica Danuta">' +
            '<div class="programacao-bloco-titulos">' +
              '<div class="programacao-bloco-titulo">' + titulo + '</div>' +
              '<div id="' + subtituloId + '" class="programacao-bloco-subtitulo"></div>' +
            '</div>' +
          '</div>' +
        '</th>' +
      '</tr>' +
      '<tr class="programacao-column-head">' + ths + '</tr>' +
    '</thead>';
  }

  window.headersProgramacao_ = headersEsquerda_;

  window.garantirLayoutProgramacaoDividida_ = function () {
    const wrap = document.querySelector('#programacaoSgqScreen .programacao-table-wrap');
    if (!wrap) return;

    const precisaReconstruir =
      wrap.dataset.layoutVersion !== LAYOUT_VERSION ||
      !document.getElementById('programacaoSgqBody') ||
      !document.getElementById('programacaoSgqBodyUmaCaixa');

    if (precisaReconstruir) {
      wrap.innerHTML =
        '<div class="programacao-dual-grid">' +
          '<section class="programacao-bloco programacao-bloco-principal">' +
            '<table class="programacao-table programacao-table-compacta">' +
              htmlCabecalhoTabela_(
                'Programação SGQ - Fixpar',
                'programacaoBlocoEsquerdoSubtitulo',
                headersEsquerda_()
              ) +
              '<tbody id="programacaoSgqBody"></tbody>' +
            '</table>' +
          '</section>' +
          '<section class="programacao-bloco programacao-bloco-uma-caixa">' +
            '<table class="programacao-table programacao-table-compacta">' +
              htmlCabecalhoTabela_(
                'OPs de 1 caixa',
                'programacaoBlocoDireitoSubtitulo',
                headersDireita_()
              ) +
              '<tbody id="programacaoSgqBodyUmaCaixa"></tbody>' +
            '</table>' +
          '</section>' +
        '</div>';

      wrap.dataset.layoutVersion = LAYOUT_VERSION;
    }

    if (typeof atualizarCabecalhosBlocosProgramacao_ === 'function') {
      atualizarCabecalhosBlocosProgramacao_();
    }
  };

  window.garantirCabecalhoDataEntradaProgramacao_ = function () {
    garantirLayoutProgramacaoDividida_();
  };

  window.separarProgramacaoSgqRows_ = function () {
    const principal = [];
    const umaCaixa = [];

    (programacaoSgqRows || []).forEach(item => {
      const caixas = numero_(item.qtdCaixas);
      const conteiner = numero_(item.qtdConteiner);

      if (caixas === 1) {
        umaCaixa.push(item);
        return;
      }

      if (caixas > 1 || conteiner >= 1 || item.manual === true) {
        principal.push(item);
      }
    });

    if (typeof compararProgramacaoSgq_ === 'function') {
      principal.sort(compararProgramacaoSgq_);
      umaCaixa.sort(compararProgramacaoSgq_);
    }

    return { principal, umaCaixa };
  };

  function appendTexto_(tr, valor, dataCurta, classe) {
    const td = document.createElement('td');
    if (classe) td.className = classe;
    td.textContent = dataCurta
      ? formatarDataCurta_(valor)
      : (valor === null || valor === undefined ? '' : String(valor));
    tr.appendChild(td);
  }

  window.criarLinhaProgramacaoSgq_ = function (item, ladoDireito) {
    const tr = document.createElement('tr');
    tr.dataset.op = item.op || '';
    tr.dataset.encaminhado = item.encaminhado ? '1' : '0';

    if (item.manual === true) tr.classList.add('programacao-manual');
    if (typeof statusUrgenteProgramacao_ === 'function' && statusUrgenteProgramacao_(item.status)) {
      tr.classList.add('programacao-urgente');
    }

    appendTexto_(tr, item.dataEntrada, true, 'col-data');
    appendTexto_(tr, item.op, false, 'col-op');
    appendTexto_(tr, item.qtdCaixas, false, 'col-caixas');

    if (!ladoDireito) {
      appendTexto_(tr, item.qtdConteiner, false, 'col-conteiner');
    }

    appendTexto_(tr, item.cor, false, 'col-cor');
    appendTexto_(tr, item.pesoDanuta, false, 'col-peso');

    const statusTd = document.createElement('td');
    statusTd.className = 'col-status';
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
    statusInput.addEventListener('blur', () => salvarEstadoLinhaProgramacaoSgq(tr));
    statusTd.appendChild(statusInput);
    tr.appendChild(statusTd);

    const okTd = document.createElement('td');
    okTd.className = 'col-ok';
    const okInput = document.createElement('input');
    okInput.type = 'checkbox';
    okInput.className = 'programacao-check programacao-ok';
    okInput.checked = Boolean(item.ok);
    okInput.addEventListener('change', () => salvarEstadoLinhaProgramacaoSgq(tr));
    okTd.appendChild(okInput);
    tr.appendChild(okTd);

    /* Enc. existe apenas no bloco principal. */
    if (!ladoDireito) {
      const encTd = document.createElement('td');
      encTd.className = 'col-enc';
      const encInput = document.createElement('input');
      encInput.type = 'checkbox';
      encInput.className = 'programacao-check programacao-encaminhado';
      encInput.checked = Boolean(item.encaminhado);
      encInput.addEventListener('change', () => salvarEstadoLinhaProgramacaoSgq(tr));
      encTd.appendChild(encInput);
      tr.appendChild(encTd);
    }

    return tr;
  };

  window.salvarEstadoLinhaProgramacaoSgq = function (tr) {
    if (!tr) return;

    const op = tr.dataset.op || '';
    if (!op) return;

    const statusInput = tr.querySelector('.programacao-status-input');
    const okInput = tr.querySelector('.programacao-ok');
    const encaminhadoInput = tr.querySelector('.programacao-encaminhado');

    const status = statusInput ? statusInput.value.trim() : '';
    const ok = okInput ? okInput.checked : false;
    const encaminhado = encaminhadoInput
      ? encaminhadoInput.checked
      : tr.dataset.encaminhado === '1';

    if (typeof setProgramacaoStatus === 'function') {
      setProgramacaoStatus('Salvando...', 'saving');
    }

    google.script.run
      .withSuccessHandler(() => {
        const item = (programacaoSgqRows || []).find(row =>
          chaveOp_(row.op) === chaveOp_(op)
        );

        if (item) {
          item.status = status;
          item.ok = ok;
          item.encaminhado = encaminhado;
        }

        if (typeof ordenarProgramacaoSgqRows_ === 'function') {
          ordenarProgramacaoSgqRows_();
        }

        renderProgramacaoSgq();

        if (typeof setProgramacaoStatus === 'function') {
          setProgramacaoStatus('Alterações salvas', 'saved');
        }
      })
      .withFailureHandler(error => {
        if (typeof setProgramacaoStatus === 'function') {
          setProgramacaoStatus(
            error && error.message ? error.message : 'Erro ao salvar programação.',
            'error'
          );
        }
      })
      .salvarProgramacaoSgq(op, status, ok, encaminhado);
  };

  function recuperarUmaCaixaDoHistorico_(baseRows, entradasResultado, saidasResultado) {
    const rows = Array.isArray(baseRows) ? baseRows.slice() : [];
    const entradas = entradasResultado && Array.isArray(entradasResultado.rows)
      ? entradasResultado.rows
      : [];
    const saidas = saidasResultado && Array.isArray(saidasResultado.rows)
      ? saidasResultado.rows
      : [];

    if (!entradas.length) return rows;

    const existentes = new Set();
    rows.forEach(item => {
      const chave = chaveOp_(item && item.op);
      if (chave) existentes.add(chave);
    });

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

      if (!chave || opsComSaida.has(chave) || existentes.has(chave)) return;

      if (!agrupado[chave]) {
        agrupado[chave] = {
          op,
          dataEntrada: valores[0] || '',
          qtdCaixas: 0,
          qtdConteiner: 0,
          pesoDanuta: 0,
          temCaixas: false,
          temConteiner: false,
          temPeso: false,
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
        item.temCaixas = true;
        item.qtdCaixas += numero_(valores[2]);
      }

      if (String(valores[3] == null ? '' : valores[3]).trim() !== '') {
        item.temConteiner = true;
        item.qtdConteiner += numero_(valores[3]);
      }

      if (String(valores[5] == null ? '' : valores[5]).trim() !== '') {
        item.temPeso = true;
        item.pesoDanuta += numero_(valores[5]);
      }

      const cor = String(valores[8] == null ? '' : valores[8]).trim();
      if (cor) item.cores.add(cor);
    });

    Object.keys(agrupado).forEach(chave => {
      const item = agrupado[chave];
      if (!item.temCaixas || Math.abs(item.qtdCaixas - 1) > 0.0000001) return;

      rows.push({
        dataEntrada: item.dataEntrada || '',
        op: item.op || '',
        qtdCaixas: formatarNumero_(item.qtdCaixas),
        qtdConteiner: item.temConteiner ? formatarNumero_(item.qtdConteiner) : '',
        cor: Array.from(item.cores).join(' / '),
        pesoDanuta: item.temPeso ? formatarNumero_(item.pesoDanuta) : '',
        status: '',
        ok: false,
        encaminhado: false,
        manual: false,
        recuperadoHistorico: true
      });
    });

    return rows;
  }

  window.carregarProgramacaoSgq = async function () {
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
        ]).catch(error => {
          console.warn('Histórico de entrada indisponível para conferência:', error);
          return null;
        }),
        chamarApiAppsScript('consultarHistorico', [
          'SAIDA',
          periodo.inicio,
          periodo.fim,
          ''
        ]).catch(error => {
          console.warn('Histórico de saída indisponível para conferência:', error);
          return null;
        })
      ]);

      const base = resultados[0] && Array.isArray(resultados[0].rows)
        ? resultados[0].rows
        : [];

      programacaoSgqRows = recuperarUmaCaixaDoHistorico_(
        base,
        resultados[1],
        resultados[2]
      );

      if (typeof ordenarProgramacaoSgqRows_ === 'function') {
        ordenarProgramacaoSgqRows_();
      }

      if (loading) loading.style.display = 'none';

      renderProgramacaoSgq();

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

  /*
   * Reaplica o render já existente, agora usando os overrides acima.
   */
  const renderOriginal = window.renderProgramacaoSgq;

  if (typeof renderOriginal === 'function') {
    window.renderProgramacaoSgq = function () {
      garantirLayoutProgramacaoDividida_();
      return renderOriginal.apply(this, arguments);
    };
  }

  carregarCssFinal_();
  garantirLayoutProgramacaoDividida_();
})();
