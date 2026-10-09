/* ============================================================
   RELATÓRIOS PDF - CABEÇALHO COM LOGO DANUTA
   ============================================================
   Aplica o mesmo padrão visual aos PDFs operacionais e do histórico:
   - logo à esquerda;
   - título centralizado;
   - data/período à direita;
   - cabeçalho repetido em todas as páginas.
   ============================================================ */

(function () {
  const LOGO_PDF_URL = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';
  let logoPdfPromise_ = null;

  function carregarLogoPdf_() {
    if (logoPdfPromise_) return logoPdfPromise_;

    logoPdfPromise_ = fetch(LOGO_PDF_URL, { cache: 'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error('Logo não disponível.');
        return response.blob();
      })
      .then(blob => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      }))
      .catch(() => '');

    return logoPdfPromise_;
  }

  function desenharCabecalhoPdf_(doc, opcoes, logo) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const titulo = String(opcoes.titulo || 'Relatório');
    const subtitulo = String(opcoes.subtitulo || '');

    if (logo) {
      try {
        doc.addImage(logo, 'PNG', 7, 4.2, 28, 10.5);
      } catch (e) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text(titulo, pageWidth / 2, 10.2, { align: 'center' });

    if (subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(subtitulo, pageWidth - 7, 10.2, { align: 'right' });
    }

    doc.setDrawColor(70, 81, 92);
    doc.setLineWidth(0.2);
    doc.line(7, 16.2, pageWidth - 7, 16.2);
  }

  async function criarPdfTabelaLogo_(opcoes) {
    const JsPdf = obterJsPdf_();
    const orientation = opcoes.orientation || 'landscape';
    const doc = new JsPdf({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const headers = Array.isArray(opcoes.headers) ? opcoes.headers : [];
    const rowsPdf = Array.isArray(opcoes.rows) ? opcoes.rows : [];
    const fontSize = Number(opcoes.fontSize || 8.5);
    const logo = await carregarLogoPdf_();

    doc.autoTable({
      startY: 19.5,
      head: [headers],
      body: rowsPdf,
      theme: 'grid',
      margin: { top: 19.5, left: 7, right: 7, bottom: 8 },
      styles: {
        font: 'helvetica',
        fontSize,
        cellPadding: 1.8,
        valign: 'middle',
        halign: 'center',
        lineWidth: 0.15,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [228, 233, 237],
        textColor: [17, 24, 39],
        fontStyle: 'bold',
        fontSize: Math.max(fontSize, 8.5)
      },
      didParseCell: data => {
        if (
          Number.isInteger(opcoes.highlightColumnIndex) &&
          data.section === 'body' &&
          data.column.index === opcoes.highlightColumnIndex
        ) {
          data.cell.styles.fillColor = [237, 246, 253];
        }
      },
      didDrawPage: () => {
        desenharCabecalhoPdf_(doc, opcoes, logo);
      }
    });

    return doc.output('blob');
  }

  function esperar_(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function criarReportId_() {
    const aleatoria = Math.random().toString(36).slice(2, 10);
    return 'sgq-v3-' + Date.now() + '-' + aleatoria;
  }

  async function esperarLoteAtual_() {
    const inicio = Date.now();

    while (salvamentoEmLote) {
      if (Date.now() - inicio > 30000) {
        throw new Error(
          'Ainda existe uma gravação anterior em andamento. ' +
          'Aguarde alguns segundos e tente novamente.'
        );
      }
      await esperar_(150);
    }
  }

  async function finalizarSeguro_(args) {
    let ultimoErro = null;

    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const result = await chamarApiAppsScript('finalizarRelatorioRapido', args);

        if (!result || result.ok !== true) {
          throw new Error('O servidor não confirmou a finalização completa.');
        }

        return result;
      } catch (error) {
        ultimoErro = error;
        if (tentativa < 2) await esperar_(900);
      }
    }

    throw ultimoErro || new Error('Falha ao finalizar o relatório.');
  }

  window.gerarRelatorio = async function () {
    let preenchidas = rows.filter(row => !linhaSemDados(row));

    if (!preenchidas.length) {
      alert('Não existem dados preenchidos para gerar o relatório.');
      return;
    }

    const pageKeyFinal = currentPage;
    const dateFinal = document.getElementById('selectedDate').value || hojeISO();
    const recebimento = pageKeyFinal === 'RECEBIMENTO';
    const cfg = getPageConfigByKey(pageKeyFinal);

    const nomeArquivo = normalizarNomeArquivo_(
      (recebimento
        ? 'Relatório de Recebimento SGQ Fixpar - Data '
        : 'Relatório de Saída SGQ - Fixpar - Data ') +
        dataBR(dateFinal).replace(/\//g, '-'),
      'pdf'
    );

    const headers = cfg.headers.slice();
    const dadosPdf = preenchidas.map(row =>
      row.values.map((value, index) =>
        index === 0
          ? dataValorRelatorio_(value || dateFinal)
          : textoRelatorio_(value)
      )
    );

    const pesoIndex = recebimento
      ? headers.indexOf('Peso Danuta')
      : -1;

    const destinoPromise = escolherDestinoArquivo_(
      nomeArquivo,
      'application/pdf',
      '.pdf',
      'Documento PDF'
    );

    const button = document.getElementById('reportButton');
    const textoOriginal = button ? button.textContent : 'GERAR RELATÓRIO';

    if (button) {
      button.disabled = true;
      button.textContent = 'CONFERINDO DADOS...';
    }

    let erroLocal = null;

    try {
      await esperarLoteAtual_();

      if (typeof sincronizarTelaAntesRelatorio_ === 'function') {
        await sincronizarTelaAntesRelatorio_();
      }

      preenchidas = rows.filter(row => !linhaSemDados(row));

      if (!preenchidas.length) {
        throw new Error('Não existem dados preenchidos após a consolidação.');
      }

      const dadosAtualizados = preenchidas.map(row =>
        row.values.map((value, index) =>
          index === 0
            ? dataValorRelatorio_(value || dateFinal)
            : textoRelatorio_(value)
        )
      );

      const pdfBlob = await criarPdfTabelaLogo_({
        titulo: recebimento ? 'Relatório de Entrada - SGQ Fixpar' : cfg.title,
        subtitulo: 'Data: ' + dataBR(dateFinal),
        headers,
        rows: dadosAtualizados,
        orientation: 'landscape',
        fontSize: recebimento ? 7.2 : 8.5,
        highlightColumnIndex: pesoIndex
      });

      if (button) {
        button.disabled = true;
        button.textContent = 'FINALIZANDO...';
      }

      if (typeof setStatus === 'function') {
        setStatus('Finalizando relatório...', 'saving');
      }

      const payload = preenchidas.map(row => ({
        clientId: row.id,
        sheetRow: row.sheetRow,
        values: row.values.slice()
      }));

      const reportId = criarReportId_();
      const pdfBase64 = await blobParaBase64_(pdfBlob);
      const destino = await destinoPromise;

      if (!destino.cancelado) {
        try {
          await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);
        } catch (error) {
          erroLocal = error;
        }
      }

      await finalizarSeguro_([
        pageKeyFinal,
        dateFinal,
        payload,
        nomeArquivo,
        pdfBase64,
        reportId
      ]);

      rows = [];
      garantirDuasLinhasVazias();
      renderTable();

      if (typeof setStatus === 'function') {
        setStatus('Pronto', 'saved');
      }

      if (erroLocal) {
        alert(
          'O relatório foi registrado no sistema, mas o arquivo local não pôde ser salvo.\n\n' +
          'A cópia do sistema foi preservada.'
        );
      }
    } catch (error) {
      if (typeof setStatus === 'function') {
        setStatus('Falha ao finalizar. Dados mantidos na tela.', 'error');
      }

      alert(
        'O relatório NÃO foi finalizado no sistema.\n\n' +
        'Os dados foram mantidos nesta tela para não haver perda.\n\n' +
        ((error && error.message) ? error.message : 'Erro desconhecido.')
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = textoOriginal;
      }
    }
  };

  window.gerarRelatorioHistoricoTela = async function () {
    let filtros;

    try {
      filtros = filtrosHistoricoAtuais_();
    } catch (error) {
      alert(error.message);
      return;
    }

    const info = tituloPeriodoHistorico_(
      currentHistoryPage,
      filtros.dataInicial,
      filtros.dataFinal
    );

    const nomePeriodo = filtros.dataInicial === filtros.dataFinal
      ? dataBR(filtros.dataInicial).replace(/\//g, '-')
      : dataBR(filtros.dataInicial).replace(/\//g, '-') +
        '_a_' +
        dataBR(filtros.dataFinal).replace(/\//g, '-');

    const nomeArquivo = normalizarNomeArquivo_(
      info.prefixo + ' - ' + nomePeriodo,
      'pdf'
    );

    const destino = await escolherDestinoArquivo_(
      nomeArquivo,
      'application/pdf',
      '.pdf',
      'Documento PDF'
    );

    if (destino.cancelado) return;

    const button = document.getElementById('historyReportButton');
    const original = button ? button.textContent : 'GERAR RELATÓRIO';

    if (button) {
      button.disabled = true;
      button.textContent = 'GERANDO...';
    }

    try {
      const consulta = await obterHistoricoCompletoAtual_();
      const result = consulta.result || {};
      const items = Array.isArray(result.rows) ? result.rows : [];

      if (!items.length) {
        throw new Error('Não existem registros para gerar o relatório.');
      }

      const headers = result.headers || getPageConfigByKey(currentHistoryPage).headers;
      const dados = items.map(item => (item.values || []).map(textoRelatorio_));
      const pesoIndex = currentHistoryPage === 'RECEBIMENTO'
        ? headers.indexOf('Peso Danuta')
        : -1;

      const pdfBlob = await criarPdfTabelaLogo_({
        titulo: currentHistoryPage === 'RECEBIMENTO'
          ? 'Relatório de Entrada - SGQ Fixpar'
          : info.prefixo,
        subtitulo: info.periodo,
        headers,
        rows: dados,
        orientation: 'landscape',
        fontSize: currentHistoryPage === 'RECEBIMENTO' ? 7.2 : 8.5,
        highlightColumnIndex: pesoIndex
      });

      await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);
      await salvarPdfNoDrive_(nomeArquivo, pdfBlob);
      mostrarSucessoRelatorio();
    } catch (error) {
      alert(error.message || 'Não foi possível gerar o relatório.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  };

  /* Pré-carrega o logo para que o primeiro PDF já abra sem atraso. */
  carregarLogoPdf_();
})();
