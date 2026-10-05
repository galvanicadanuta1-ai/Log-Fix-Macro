/* ============================================================
   RELATÓRIO OPERACIONAL - FLUXO CONFIÁVEL V3
   ============================================================
   - consolida a tela antes de finalizar;
   - envia clientId + sheetRow para escrita idempotente;
   - usa reportId estável nos retries;
   - no máximo 2 tentativas: o backend V3 devolve o mesmo resultado;
   - só limpa a tela após confirmação completa do servidor.
   ============================================================ */

(function () {
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
        const result = await chamarApiAppsScript(
          'finalizarRelatorioRapido',
          args
        );

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

    let pdfBlob;

    try {
      pdfBlob = criarPdfTabela_({
        titulo: cfg.title,
        subtitulo: 'Data: ' + dataBR(dateFinal),
        headers,
        rows: dadosPdf,
        orientation: 'landscape',
        fontSize: recebimento ? 7.2 : 8.5,
        highlightColumnIndex: pesoIndex
      });
    } catch (error) {
      alert(error.message || 'Não foi possível montar o PDF.');
      return;
    }

    /* Abre o seletor cedo para preservar o gesto do clique no navegador. */
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
})();
