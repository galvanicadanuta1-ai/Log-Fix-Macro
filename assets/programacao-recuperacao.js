/* ============================================================
   PROGRAMAÇÃO SGQ - CAMADA FINAL ESTÁVEL
   ============================================================
   A fonte de dados vem exclusivamente do backend.

   Responsabilidades desta camada:
   - separar 1 caixa no bloco da direita;
   - remover Enc. do bloco de 1 caixa;
   - pesquisa por OP somente na tela;
   - PDF sempre com TODA a programação, ignorando pesquisa/data;
   - Excel sempre com TODA a programação;
   - PDF salvo no Drive mesmo se o salvamento local for cancelado.
   ============================================================ */

(function () {
  const LOGO_URL = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';
  const LAYOUT_VERSION = '2026-10-05-estavel-v2';

  window.programacaoSgqBusca = window.programacaoSgqBusca || '';

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

  function formatarDataCurta_(valor) {
    if (typeof formatarDataCurtaProgramacao_ === 'function') {
      return formatarDataCurtaProgramacao_(valor);
    }

    const texto = String(valor || '').trim();
    const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (m) {
      return String(m[1]).padStart(2, '0') + '/' +
        String(m[2]).padStart(2, '0') + '/' +
        String(m[3]).slice(-2);
    }

    return texto;
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

  function htmlCabecalho_(titulo, subtituloId, headers) {
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
      '<tr class="programacao-column-head">' +
        headers.map(h => '<th>' + h + '</th>').join('') +
      '</tr>' +
    '</thead>';
  }

  window.garantirLayoutProgramacaoDividida_ = function () {
    const wrap = document.querySelector('#programacaoSgqScreen .programacao-table-wrap');
    if (!wrap) return;

    const reconstruir =
      wrap.dataset.layoutVersion !== LAYOUT_VERSION ||
      !document.getElementById('programacaoSgqBody') ||
      !document.getElementById('programacaoSgqBodyUmaCaixa');

    if (reconstruir) {
      wrap.innerHTML =
        '<div class="programacao-dual-grid">' +
          '<section class="programacao-bloco programacao-bloco-principal">' +
            '<table class="programacao-table programacao-table-compacta">' +
              htmlCabecalho_(
                'Programação SGQ - Fixpar',
                'programacaoBlocoEsquerdoSubtitulo',
                headersEsquerda_()
              ) +
              '<tbody id="programacaoSgqBody"></tbody>' +
            '</table>' +
          '</section>' +
          '<section class="programacao-bloco programacao-bloco-uma-caixa">' +
            '<table class="programacao-table programacao-table-compacta">' +
              htmlCabecalho_(
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

  function ordenar_(lista) {
    const copia = lista.slice();
    if (typeof compararProgramacaoSgq_ === 'function') {
      copia.sort(compararProgramacaoSgq_);
    }
    return copia;
  }

  function separar_(usarBusca) {
    const principal = [];
    const umaCaixa = [];
    const busca = usarBusca
      ? String(window.programacaoSgqBusca || '').trim().toUpperCase()
      : '';

    (programacaoSgqRows || []).forEach(item => {
      const op = String(item && item.op || '').toUpperCase();
      if (busca && !op.includes(busca)) return;

      const caixas = numero_(item.qtdCaixas);
      const cacamba = numero_(item.qtdConteiner);

      if (Math.abs(caixas - 1) < 0.0000001) {
        umaCaixa.push(item);
        return;
      }

      if (caixas > 1 || cacamba >= 1 || item.manual === true) {
        principal.push(item);
      }
    });

    return {
      principal: ordenar_(principal),
      umaCaixa: ordenar_(umaCaixa)
    };
  }

  window.separarProgramacaoSgqRows_ = function () {
    return separar_(true);
  };

  function appendTexto_(tr, valor, curta, classe) {
    const td = document.createElement('td');
    if (classe) td.className = classe;
    td.textContent = curta
      ? formatarDataCurta_(valor)
      : (valor == null ? '' : String(valor));
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
    const encInput = tr.querySelector('.programacao-encaminhado');

    const status = statusInput ? statusInput.value.trim() : '';
    const ok = okInput ? okInput.checked : false;
    const encaminhado = encInput
      ? encInput.checked
      : tr.dataset.encaminhado === '1';

    if (typeof setProgramacaoStatus === 'function') {
      setProgramacaoStatus('Salvando...', 'saving');
    }

    google.script.run
      .withSuccessHandler(() => {
        const item = (programacaoSgqRows || []).find(row => String(row.op) === String(op));

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

  window.renderProgramacaoSgq = function () {
    garantirLayoutProgramacaoDividida_();

    const esquerda = document.getElementById('programacaoSgqBody');
    const direita = document.getElementById('programacaoSgqBodyUmaCaixa');
    const empty = document.getElementById('programacaoSgqEmpty');
    const resumo = document.getElementById('programacaoSgqResumo');

    if (!esquerda || !direita) return;

    if (typeof ordenarProgramacaoSgqRows_ === 'function') ordenarProgramacaoSgqRows_();

    const grupos = separar_(true);

    esquerda.innerHTML = '';
    direita.innerHTML = '';

    grupos.principal.forEach(item => esquerda.appendChild(criarLinhaProgramacaoSgq_(item, false)));
    grupos.umaCaixa.forEach(item => direita.appendChild(criarLinhaProgramacaoSgq_(item, true)));

    const totalFiltrado = grupos.principal.length + grupos.umaCaixa.length;
    const temBusca = String(window.programacaoSgqBusca || '').trim() !== '';

    if (empty) {
      if (!(programacaoSgqRows || []).length) {
        empty.style.display = 'block';
        empty.textContent = 'Não há OPs pendentes de saída.';
      } else if (temBusca && !totalFiltrado) {
        empty.style.display = 'block';
        empty.textContent = 'Nenhuma OP encontrada na pesquisa.';
      } else {
        empty.style.display = 'none';
      }
    }

    if (resumo) {
      resumo.textContent =
        grupos.principal.length + ' na programação principal' +
        ' • ' + grupos.umaCaixa.length + ' OPs de 1 caixa' +
        (temBusca ? ' • filtro: ' + window.programacaoSgqBusca : '');
    }

    if (typeof atualizarCabecalhosBlocosProgramacao_ === 'function') {
      atualizarCabecalhosBlocosProgramacao_();
    }
  };

  function garantirBusca_() {
    const area = document.querySelector('#programacaoSgqScreen .programacao-actions-right');
    if (!area || document.getElementById('programacaoSgqSearch')) return;

    const report = area.querySelector('.programacao-report-button');
    const wrap = document.createElement('div');
    wrap.className = 'programacao-search-wrap';

    const input = document.createElement('input');
    input.id = 'programacaoSgqSearch';
    input.type = 'search';
    input.placeholder = 'Buscar OP';
    input.autocomplete = 'off';
    input.className = 'programacao-search-input';
    input.addEventListener('input', () => {
      window.programacaoSgqBusca = input.value || '';
      renderProgramacaoSgq();
    });

    wrap.appendChild(input);
    area.insertBefore(wrap, report || area.firstChild);

    const style = document.createElement('style');
    style.textContent =
      '.programacao-search-wrap{display:flex;align-items:center}' +
      '.programacao-search-input{height:34px;width:150px;border:1px solid #9ca3af;border-radius:4px;padding:0 9px;font-size:12px;background:#fff;color:#111827;box-sizing:border-box}' +
      '.programacao-search-input:focus{outline:none;border-color:#1f6f43;box-shadow:0 0 0 2px rgba(31,111,67,.12)}' +
      '@media(max-width:900px){.programacao-search-input{width:120px}}' +
      '@media print{.programacao-search-wrap{display:none!important}}';
    document.head.appendChild(style);
  }

  function linhaEsquerda_(item) {
    return [
      formatarDataCurta_(item.dataEntrada),
      item.op || '',
      item.qtdCaixas || '',
      item.qtdConteiner || '',
      item.cor || '',
      item.pesoDanuta || '',
      item.status || '',
      item.ok ? '✓' : '',
      item.encaminhado ? '✓' : ''
    ];
  }

  function linhaDireita_(item) {
    return [
      formatarDataCurta_(item.dataEntrada),
      item.op || '',
      item.qtdCaixas || '',
      item.cor || '',
      item.pesoDanuta || '',
      item.status || '',
      item.ok ? '✓' : ''
    ];
  }

  /* Exportações SEM filtro de pesquisa. */
  window.dadosProgramacaoParaExportar_ = function () {
    const grupos = separar_(false);

    return {
      headers: headersEsquerda_(),
      headersEsquerda: headersEsquerda_(),
      headersDireita: headersDireita_(),
      headersPrincipal: headersEsquerda_(),
      headersUmaCaixa: headersDireita_(),
      principal: grupos.principal.map(linhaEsquerda_),
      umaCaixa: grupos.umaCaixa.map(linhaDireita_),
      dados: grupos.principal.map(linhaEsquerda_)
    };
  };

  function obterJsPdf_() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    throw new Error('Biblioteca de PDF não carregada.');
  }

  function desenharTitulo_(doc, x, largura, titulo, subtitulo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(titulo, x + largura / 2, 8, { align: 'center' });

    doc.setFontSize(7.5);
    doc.text(subtitulo, x + largura / 2, 12, { align: 'center' });
  }

  function tabelaPdf_(doc, x, largura, headers, rows, direita) {
    if (typeof doc.autoTable !== 'function') {
      throw new Error('Componente de tabela do PDF não carregado.');
    }

    const pageWidth = doc.internal.pageSize.getWidth();

    const columnStyles = direita
      ? {
          0: { cellWidth: 16 },
          1: { cellWidth: 16 },
          2: { cellWidth: 12 },
          3: { cellWidth: 35 },
          4: { cellWidth: 13 },
          5: { cellWidth: 27 },
          6: { cellWidth: 9 }
        }
      : {
          0: { cellWidth: 15 },
          1: { cellWidth: 15 },
          2: { cellWidth: 10 },
          3: { cellWidth: 12 },
          4: { cellWidth: 27 },
          5: { cellWidth: 12 },
          6: { cellWidth: 18 },
          7: { cellWidth: 8 },
          8: { cellWidth: 9 }
        };

    doc.autoTable({
      startY: 15,
      head: [headers],
      body: rows,
      theme: 'grid',
      tableWidth: largura,
      margin: {
        left: x,
        right: Math.max(pageWidth - x - largura, 0),
        top: 15,
        bottom: 5
      },
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 8.3,
        cellPadding: .8,
        valign: 'middle',
        halign: 'center',
        lineWidth: .1,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [233, 238, 242],
        textColor: [17, 24, 39],
        fontStyle: 'bold',
        fontSize: 6.5,
        cellPadding: .7
      },
      columnStyles,
      didParseCell: data => {
        if (data.section !== 'body') return;
        const statusIndex = direita ? 5 : 6;
        const status = rows[data.row.index] && rows[data.row.index][statusIndex]
          ? String(rows[data.row.index][statusIndex]).trim().toLowerCase()
          : '';

        if (status === 'urgente') {
          data.cell.styles.fillColor = [255, 242, 242];
          if (data.column.index === statusIndex) {
            data.cell.styles.textColor = [190, 30, 30];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  async function criarPdfCompleto_() {
    const JsPdf = obterJsPdf_();
    const doc = new JsPdf({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const dados = dadosProgramacaoParaExportar_();
    const turno = typeof obterTurnoProgramacaoSgq === 'function'
      ? obterTurnoProgramacaoSgq()
      : 'Turno Dia';
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const subtitulo = turno + ' • ' + dataHoje;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margem = 4;
    const gap = 4;
    const largura = (pageWidth - (margem * 2) - gap) / 2;
    const xEsq = margem;
    const xDir = margem + largura + gap;

    /*
     * Quantidade conservadora por página para impedir que o autoTable
     * jogue uma das tabelas para uma página vazia.
     */
    const porPagina = 11;
    const totalPaginas = Math.max(
      1,
      Math.ceil(dados.principal.length / porPagina),
      Math.ceil(dados.umaCaixa.length / porPagina)
    );

    for (let pagina = 0; pagina < totalPaginas; pagina++) {
      if (pagina > 0) doc.addPage('a4', 'landscape');

      const inicio = pagina * porPagina;
      const esquerda = dados.principal.slice(inicio, inicio + porPagina);
      const direita = dados.umaCaixa.slice(inicio, inicio + porPagina);

      desenharTitulo_(doc, xEsq, largura, 'Programação SGQ - Fixpar', subtitulo);
      desenharTitulo_(doc, xDir, largura, 'OPs de 1 caixa', subtitulo);

      tabelaPdf_(doc, xEsq, largura, dados.headersEsquerda, esquerda, false);
      tabelaPdf_(doc, xDir, largura, dados.headersDireita, direita, true);
    }

    return doc.output('blob');
  }

  window.gerarRelatorioProgramacaoSgq = async function () {
    if (!(programacaoSgqRows || []).length) {
      alert('Não existem OPs na programação para gerar o relatório.');
      return;
    }

    const turno = typeof obterTurnoProgramacaoSgq === 'function'
      ? obterTurnoProgramacaoSgq()
      : 'Turno Dia';
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const baseNome = 'Programação SGQ - Fixpar - ' + turno + ' - ' + dataHoje.replace(/\//g, '-');
    const nomeArquivo = typeof normalizarNomeArquivo_ === 'function'
      ? normalizarNomeArquivo_(baseNome, 'pdf')
      : baseNome + '.pdf';

    let destino = { cancelado: true };

    try {
      if (typeof escolherDestinoArquivo_ === 'function') {
        destino = await escolherDestinoArquivo_(
          nomeArquivo,
          'application/pdf',
          '.pdf',
          'Documento PDF'
        );
      }

      const pdfBlob = await criarPdfCompleto_();

      /* Drive sempre recebe o PDF completo, mesmo se o usuário cancelar o salvar local. */
      if (typeof salvarPdfNoDrive_ === 'function') {
        Promise.resolve(salvarPdfNoDrive_(nomeArquivo, pdfBlob)).catch(error => {
          console.error('Falha ao salvar PDF da programação no Drive:', error);
        });
      }

      if (!destino || destino.cancelado) return;

      if (typeof salvarBlobDestino_ === 'function') {
        await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);
      }
    } catch (error) {
      console.error(error);
      alert(error && error.message
        ? error.message
        : 'Não foi possível gerar o relatório da programação.');
    }
  };

  garantirBusca_();
  garantirLayoutProgramacaoDividida_();
})();
