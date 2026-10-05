/* ============================================================
   AJUSTES DA PROGRAMAÇÃO SGQ - FIXPAR
   ============================================================ */

(function () {
  const LOGO_URL = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';

  function carregarCss_() {
    if (document.querySelector('link[data-programacao-ajustes-css]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/programacao-ajustes.css';
    link.dataset.programacaoAjustesCss = '1';
    document.head.appendChild(link);
  }

  function hojeIsoLocal_() {
    if (typeof hojeISO === 'function') return hojeISO();
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function formatarDataCurta_(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return '';

    let match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      return String(match[1]).padStart(2, '0') + '/' +
        String(match[2]).padStart(2, '0') + '/' +
        String(match[3]).slice(-2);
    }

    match = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      return String(match[3]).padStart(2, '0') + '/' +
        String(match[2]).padStart(2, '0') + '/' +
        String(match[1]).slice(-2);
    }

    return texto;
  }

  window.formatarDataCurtaProgramacao_ = formatarDataCurta_;

  function garantirControlesManuais_() {
    const dateEl = document.getElementById('programacaoSgqDate');
    if (!dateEl) return;

    if (!dateEl.parentElement.classList.contains('programacao-date-actions')) {
      const wrap = document.createElement('div');
      wrap.className = 'programacao-date-actions';
      dateEl.parentNode.insertBefore(wrap, dateEl);
      wrap.appendChild(dateEl);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'programacao-add-os-button no-print';
      button.textContent = '+ ADICIONAR OS';
      button.addEventListener('click', abrirModalOsManual_);
      wrap.appendChild(button);
    }

    garantirModalOsManual_();
  }

  function garantirModalOsManual_() {
    if (document.getElementById('programacaoOsManualModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'programacaoOsManualModal';
    overlay.className = 'programacao-modal-overlay no-print';
    overlay.innerHTML =
      '<div class="programacao-modal" role="dialog" aria-modal="true" aria-labelledby="programacaoOsManualTitulo">' +
        '<h2 id="programacaoOsManualTitulo" class="programacao-modal-title">Adicionar OS manual</h2>' +
        '<p class="programacao-modal-help">Somente o número da OS é obrigatório. Preencha apenas as informações que você já recebeu.</p>' +
        '<div class="programacao-modal-grid">' +
          '<div class="programacao-modal-field">' +
            '<label for="manualOsData">Data</label>' +
            '<input id="manualOsData" type="date">' +
          '</div>' +
          '<div class="programacao-modal-field">' +
            '<label for="manualOsNumero">OS / OP *</label>' +
            '<input id="manualOsNumero" type="text" autocomplete="off" placeholder="Ex.: 45123">' +
          '</div>' +
          '<div class="programacao-modal-field">' +
            '<label for="manualOsCaixas">Qtd. Caixas</label>' +
            '<input id="manualOsCaixas" type="text" inputmode="decimal" autocomplete="off">' +
          '</div>' +
          '<div class="programacao-modal-field">' +
            '<label for="manualOsCacamba">Qtd. Caçamba</label>' +
            '<input id="manualOsCacamba" type="text" inputmode="decimal" autocomplete="off">' +
          '</div>' +
          '<div class="programacao-modal-field full">' +
            '<label for="manualOsCor">Cor</label>' +
            '<input id="manualOsCor" type="text" autocomplete="off" list="coresFixparList">' +
          '</div>' +
          '<div class="programacao-modal-field">' +
            '<label for="manualOsPeso">Kgs</label>' +
            '<input id="manualOsPeso" type="text" inputmode="decimal" autocomplete="off" placeholder="Ex.: 21,4">' +
          '</div>' +
          '<div class="programacao-modal-field">' +
            '<label for="manualOsStatus">Status</label>' +
            '<select id="manualOsStatus">' +
              '<option value="">Sem status</option>' +
              '<option value="Urgente">Urgente</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="manualOsErro" class="programacao-modal-error"></div>' +
        '<div class="programacao-modal-actions">' +
          '<button type="button" class="programacao-modal-cancel" id="manualOsCancelar">CANCELAR</button>' +
          '<button type="button" class="programacao-modal-save" id="manualOsSalvar">ADICIONAR OS</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) fecharModalOsManual_();
    });

    document.getElementById('manualOsCancelar').addEventListener('click', fecharModalOsManual_);
    document.getElementById('manualOsSalvar').addEventListener('click', salvarOsManual_);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('show')) {
        fecharModalOsManual_();
      }
    });
  }

  function limparFormularioManual_() {
    const ids = [
      'manualOsNumero',
      'manualOsCaixas',
      'manualOsCacamba',
      'manualOsCor',
      'manualOsPeso'
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const data = document.getElementById('manualOsData');
    if (data) data.value = hojeIsoLocal_();

    const status = document.getElementById('manualOsStatus');
    if (status) status.value = '';

    const erro = document.getElementById('manualOsErro');
    if (erro) erro.textContent = '';
  }

  function abrirModalOsManual_() {
    garantirModalOsManual_();
    limparFormularioManual_();

    const modal = document.getElementById('programacaoOsManualModal');
    if (modal) modal.classList.add('show');

    setTimeout(() => {
      const op = document.getElementById('manualOsNumero');
      if (op) op.focus();
    }, 30);
  }

  function fecharModalOsManual_() {
    const modal = document.getElementById('programacaoOsManualModal');
    if (modal) modal.classList.remove('show');
  }

  window.abrirModalOsManual = abrirModalOsManual_;
  window.fecharModalOsManual = fecharModalOsManual_;

  async function salvarOsManual_() {
    const op = String(document.getElementById('manualOsNumero')?.value || '').trim();
    const dataEntrada = String(document.getElementById('manualOsData')?.value || '').trim();
    const qtdCaixas = String(document.getElementById('manualOsCaixas')?.value || '').trim();
    const qtdConteiner = String(document.getElementById('manualOsCacamba')?.value || '').trim();
    const cor = String(document.getElementById('manualOsCor')?.value || '').trim();
    const pesoDanuta = String(document.getElementById('manualOsPeso')?.value || '').trim();
    const status = String(document.getElementById('manualOsStatus')?.value || '').trim();
    const erro = document.getElementById('manualOsErro');
    const botao = document.getElementById('manualOsSalvar');

    if (!op) {
      if (erro) erro.textContent = 'Informe o número da OS / OP.';
      document.getElementById('manualOsNumero')?.focus();
      return;
    }

    if (erro) erro.textContent = '';
    if (botao) {
      botao.disabled = true;
      botao.textContent = 'SALVANDO...';
    }

    const manualData = {
      manual: true,
      dataEntrada: dataEntrada || hojeIsoLocal_(),
      qtdCaixas,
      qtdConteiner,
      cor,
      pesoDanuta
    };

    google.script.run
      .withSuccessHandler(() => {
        if (botao) {
          botao.disabled = false;
          botao.textContent = 'ADICIONAR OS';
        }

        fecharModalOsManual_();

        if (typeof carregarProgramacaoSgq === 'function') {
          carregarProgramacaoSgq();
        }
      })
      .withFailureHandler(error => {
        if (botao) {
          botao.disabled = false;
          botao.textContent = 'ADICIONAR OS';
        }

        if (erro) {
          erro.textContent = error && error.message
            ? error.message
            : 'Não foi possível adicionar a OS.';
        }
      })
      .salvarProgramacaoSgq(op, status, false, false, manualData);
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
      'OK',
      'Enc.'
    ];
  }

  window.headersProgramacao_ = headersEsquerda_;

  function htmlCabecalhoTabela_(titulo, subtituloId, headers) {
    const colunas = headers.length;
    const ths = headers.map(header => '<th>' + header + '</th>').join('');

    return '<thead>' +
      '<tr class="programacao-repeat-panel">' +
        '<th colspan="' + colunas + '">' +
          '<div class="programacao-bloco-cabecalho">' +
            '<img class="programacao-bloco-logo" src="' + LOGO_URL + '" alt="Galvânica Danuta">' +
            '<div class="programacao-bloco-titulos">' +
              '<div class="programacao-bloco-titulo">' + titulo + '</div>' +
              '<div id="' + subtituloId + '" class="programacao-bloco-subtitulo"></div>' +
            '</div>' +
          '</div>' +
        '</th>' +
      '</tr>' +
      '<tr>' + ths + '</tr>' +
    '</thead>';
  }

  window.garantirLayoutProgramacaoDividida_ = function () {
    const wrap = document.querySelector('#programacaoSgqScreen .programacao-table-wrap');
    if (!wrap) return;

    if (!document.getElementById('programacaoSgqBodyUmaCaixa') || !wrap.querySelector('.programacao-repeat-panel')) {
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
    }

    garantirControlesManuais_();

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
      const caixasTexto = String(item.qtdCaixas ?? '').trim();
      const conteinerTexto = String(item.qtdConteiner ?? '').trim();
      const caixas = typeof numeroProgramacao_ === 'function'
        ? numeroProgramacao_(caixasTexto)
        : Number(caixasTexto.replace(',', '.')) || 0;
      const conteiner = typeof numeroProgramacao_ === 'function'
        ? numeroProgramacao_(conteinerTexto)
        : Number(conteinerTexto.replace(',', '.')) || 0;

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

  function appendTexto_(tr, valor, dataCurta) {
    const td = document.createElement('td');
    td.textContent = dataCurta
      ? formatarDataCurta_(valor)
      : (valor === null || valor === undefined ? '' : String(valor));
    tr.appendChild(td);
  }

  window.criarLinhaProgramacaoSgq_ = function (item, ladoDireito) {
    const tr = document.createElement('tr');
    tr.dataset.op = item.op || '';

    if (item.manual === true) tr.classList.add('programacao-manual');
    if (typeof statusUrgenteProgramacao_ === 'function' && statusUrgenteProgramacao_(item.status)) {
      tr.classList.add('programacao-urgente');
    }

    appendTexto_(tr, item.dataEntrada, true);
    appendTexto_(tr, item.op, false);
    appendTexto_(tr, item.qtdCaixas, false);

    if (!ladoDireito) {
      appendTexto_(tr, item.qtdConteiner, false);
    }

    appendTexto_(tr, item.cor, false);
    appendTexto_(tr, item.pesoDanuta, false);

    const statusTd = document.createElement('td');
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
    const okInput = document.createElement('input');
    okInput.type = 'checkbox';
    okInput.className = 'programacao-check programacao-ok';
    okInput.checked = Boolean(item.ok);
    okInput.addEventListener('change', () => salvarEstadoLinhaProgramacaoSgq(tr));
    okTd.appendChild(okInput);
    tr.appendChild(okTd);

    const encTd = document.createElement('td');
    const encInput = document.createElement('input');
    encInput.type = 'checkbox';
    encInput.className = 'programacao-check programacao-encaminhado';
    encInput.checked = Boolean(item.encaminhado);
    encInput.addEventListener('change', () => salvarEstadoLinhaProgramacaoSgq(tr));
    encTd.appendChild(encInput);
    tr.appendChild(encTd);

    return tr;
  };

  window.renderProgramacaoSgq = function () {
    garantirLayoutProgramacaoDividida_();

    const tbodyEsquerdo = document.getElementById('programacaoSgqBody');
    const tbodyDireito = document.getElementById('programacaoSgqBodyUmaCaixa');
    const empty = document.getElementById('programacaoSgqEmpty');
    const resumo = document.getElementById('programacaoSgqResumo');

    if (!tbodyEsquerdo || !tbodyDireito) return;

    if (typeof ordenarProgramacaoSgqRows_ === 'function') ordenarProgramacaoSgqRows_();
    const grupos = separarProgramacaoSgqRows_();

    tbodyEsquerdo.innerHTML = '';
    tbodyDireito.innerHTML = '';

    if (!programacaoSgqRows.length) {
      if (empty) {
        empty.style.display = 'block';
        empty.textContent = 'Não há OPs pendentes de saída.';
      }
      if (resumo) resumo.textContent = '0 OPs pendentes';
      return;
    }

    if (empty) empty.style.display = 'none';

    if (resumo) {
      const urgentes = programacaoSgqRows.filter(item =>
        typeof statusUrgenteProgramacao_ === 'function' && statusUrgenteProgramacao_(item.status)
      ).length;

      resumo.textContent =
        grupos.principal.length + ' na programação principal' +
        ' • ' + grupos.umaCaixa.length + ' OPs de 1 caixa' +
        (urgentes ? ' • ' + urgentes + ' urgente' + (urgentes === 1 ? '' : 's') : '');
    }

    grupos.principal.forEach(item => {
      tbodyEsquerdo.appendChild(criarLinhaProgramacaoSgq_(item, false));
    });

    grupos.umaCaixa.forEach(item => {
      tbodyDireito.appendChild(criarLinhaProgramacaoSgq_(item, true));
    });

    if (typeof atualizarCabecalhosBlocosProgramacao_ === 'function') {
      atualizarCabecalhosBlocosProgramacao_();
    }
  };

  function dadosExportacao_() {
    const grupos = separarProgramacaoSgqRows_();

    const linhaEsquerda = item => [
      formatarDataCurta_(item.dataEntrada),
      item.op || '',
      item.qtdCaixas || '',
      item.qtdConteiner || '',
      item.cor || '',
      item.pesoDanuta || '',
      item.status || '',
      item.ok ? 'SIM' : '',
      item.encaminhado ? 'SIM' : ''
    ];

    const linhaDireita = item => [
      formatarDataCurta_(item.dataEntrada),
      item.op || '',
      item.qtdCaixas || '',
      item.cor || '',
      item.pesoDanuta || '',
      item.status || '',
      item.ok ? 'SIM' : '',
      item.encaminhado ? 'SIM' : ''
    ];

    return {
      headersEsquerda: headersEsquerda_(),
      headersDireita: headersDireita_(),
      principal: grupos.principal.map(linhaEsquerda),
      umaCaixa: grupos.umaCaixa.map(linhaDireita)
    };
  }

  window.dadosProgramacaoParaExportar_ = dadosExportacao_;

  function criarPlanilha_(titulo, subtitulo, headers, rows, direita) {
    const aoa = [[titulo], [subtitulo], [], headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const ultimaColuna = Math.max(headers.length - 1, 0);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColuna } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaColuna } }
    ];

    ws['!cols'] = direita
      ? [
          { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 20 },
          { wch: 9 }, { wch: 12 }, { wch: 5 }, { wch: 7 }
        ]
      : [
          { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 18 },
          { wch: 9 }, { wch: 12 }, { wch: 5 }, { wch: 7 }
        ];

    return ws;
  }

  window.exportarProgramacaoSgqExcel = async function () {
    try {
      if (!programacaoSgqRows.length) {
        throw new Error('Não existem OPs na programação para exportar.');
      }

      verificarXlsx_();

      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const turno = typeof obterTurnoProgramacaoSgq === 'function'
        ? obterTurnoProgramacaoSgq()
        : 'Turno Dia';

      const nomeArquivo = normalizarNomeArquivo_(
        'Programação SGQ - Fixpar - ' + turno + ' - ' + dataHoje.replace(/\//g, '-'),
        'xlsx'
      );

      const destino = await escolherDestinoArquivo_(
        nomeArquivo,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xlsx',
        'Planilha Excel'
      );

      if (destino.cancelado) return;

      const dados = dadosExportacao_();
      const wb = XLSX.utils.book_new();
      const subtitulo = turno + ' • ' + dataHoje;

      XLSX.utils.book_append_sheet(
        wb,
        criarPlanilha_(
          'Programação SGQ - Fixpar',
          subtitulo,
          dados.headersEsquerda,
          dados.principal,
          false
        ),
        'Programação'
      );

      XLSX.utils.book_append_sheet(
        wb,
        criarPlanilha_(
          'OPs de 1 caixa',
          subtitulo,
          dados.headersDireita,
          dados.umaCaixa,
          true
        ),
        'OPs 1 caixa'
      );

      const array = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
        compression: true
      });

      const blob = new Blob(
        [array],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      await salvarBlobDestino_(destino, blob, nomeArquivo);
    } catch (error) {
      alert(error.message || 'Não foi possível exportar a programação.');
    }
  };

  async function carregarLogo_() {
    try {
      const response = await fetch(LOGO_URL);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  }

  function desenharCabecalhoPainel_(doc, x, largura, titulo, subtitulo, logo) {
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', x + 1, 3.5, 17, 7.5);
      } catch (e) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.8);
    doc.text(titulo, x + largura / 2, 7.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.text(subtitulo, x + largura / 2, 12, { align: 'center' });
  }

  function desenharTabelaPainel_(doc, x, largura, headers, rows, direita) {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.autoTable({
      startY: 15,
      head: [headers],
      body: rows,
      theme: 'grid',
      tableWidth: largura - 1,
      margin: {
        left: x,
        right: Math.max(pageWidth - x - largura, 0),
        bottom: 5
      },
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: .95,
        valign: 'middle',
        halign: 'center',
        lineWidth: 0.12,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [233, 238, 242],
        textColor: [17, 24, 39],
        fontStyle: 'bold',
        fontSize: 6.8,
        cellPadding: .8
      },
      columnStyles: direita
        ? {
            0: { cellWidth: 14 },
            1: { cellWidth: 16 },
            2: { cellWidth: 10 },
            3: { cellWidth: 25 },
            4: { cellWidth: 12 },
            5: { cellWidth: 18 },
            6: { cellWidth: 8 },
            7: { cellWidth: 10 }
          }
        : {
            0: { cellWidth: 14 },
            1: { cellWidth: 15 },
            2: { cellWidth: 9 },
            3: { cellWidth: 11 },
            4: { cellWidth: 20 },
            5: { cellWidth: 11 },
            6: { cellWidth: 16 },
            7: { cellWidth: 7 },
            8: { cellWidth: 10 }
          },
      didParseCell: data => {
        if (data.section !== 'body') return;
        const statusIndex = direita ? 5 : 6;
        const status = rows[data.row.index] && rows[data.row.index][statusIndex]
          ? String(rows[data.row.index][statusIndex]).trim().toLowerCase()
          : '';

        if (status === 'urgente') {
          data.cell.styles.fillColor = [255, 244, 244];
          if (data.column.index === statusIndex) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  async function criarPdfProgramacao_() {
    const JsPdf = obterJsPdf_();
    const doc = new JsPdf({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const dados = dadosExportacao_();
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const turno = typeof obterTurnoProgramacaoSgq === 'function'
      ? obterTurnoProgramacaoSgq()
      : 'Turno Dia';
    const subtitulo = turno + ' • ' + dataHoje;
    const logo = await carregarLogo_();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margem = 5;
    const gap = 3;
    const larguraPainel = (pageWidth - (margem * 2) - gap) / 2;
    const xEsquerdo = margem;
    const xDireito = margem + larguraPainel + gap;
    const porPagina = 20;
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

      desenharCabecalhoPainel_(doc, xEsquerdo, larguraPainel, 'Programação SGQ - Fixpar', subtitulo, logo);
      desenharCabecalhoPainel_(doc, xDireito, larguraPainel, 'OPs de 1 caixa', subtitulo, logo);

      desenharTabelaPainel_(doc, xEsquerdo, larguraPainel, dados.headersEsquerda, esquerda, false);
      desenharTabelaPainel_(doc, xDireito, larguraPainel, dados.headersDireita, direita, true);
    }

    return doc.output('blob');
  }

  window.gerarRelatorioProgramacaoSgq = async function () {
    if (!programacaoSgqRows.length) {
      alert('Não existem OPs na programação para gerar o relatório.');
      return;
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const turno = typeof obterTurnoProgramacaoSgq === 'function'
      ? obterTurnoProgramacaoSgq()
      : 'Turno Dia';

    const nomeArquivo = normalizarNomeArquivo_(
      'Programação SGQ - Fixpar - ' + turno + ' - ' + dataHoje.replace(/\//g, '-'),
      'pdf'
    );

    const destino = await escolherDestinoArquivo_(
      nomeArquivo,
      'application/pdf',
      '.pdf',
      'Documento PDF'
    );

    if (destino.cancelado) return;

    try {
      const pdfBlob = await criarPdfProgramacao_();
      await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);
      salvarPdfNoDrive_(nomeArquivo, pdfBlob);
    } catch (error) {
      alert(error.message || 'Não foi possível gerar o relatório da programação.');
    }
  };

  carregarCss_();
  garantirControlesManuais_();
})();
