/* ============================================================
   PADRÃO GLOBAL DE RELATÓRIOS - MODO SEGURO
   ============================================================
   Regras:
   - Mesmo fluxo para Recebimento e Saída Fixpar.
   - PDF é criado no navegador para manter velocidade.
   - O usuário pode salvar localmente ou cancelar o "Salvar como".
   - O cancelamento local NÃO cancela a finalização do relatório.
   - Drive + planilha + histórico + conciliação são confirmados pelo servidor.
   - A tela operacional só é limpa DEPOIS da confirmação do servidor.
   - Em falha de rede, tenta novamente automaticamente.
   - Se ainda assim falhar, os dados permanecem visíveis na tela.
   - Nenhuma mensagem de sucesso do Drive é exibida.
   ============================================================ */

(function () {
  /* Sucesso silencioso: não exibe toast/alerta ao concluir relatório. */
  window.mostrarSucessoRelatorio = function () {};

  function esperarRelatorio_(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function criarIdRelatorio_() {
    const parteAleatoria = Math.random().toString(36).slice(2, 10);
    return 'sgq-' + Date.now() + '-' + parteAleatoria;
  }

  async function finalizarRelatorioSeguro_(args, tentativas) {
    const totalTentativas = Math.max(Number(tentativas || 3), 1);
    let ultimoErro = null;

    for (let tentativa = 1; tentativa <= totalTentativas; tentativa++) {
      try {
        const result = await chamarApiAppsScript(
          'finalizarRelatorioRapido',
          args
        );

        if (!result || result.ok !== true || result.confirmado !== true) {
          throw new Error(
            'O servidor não confirmou a gravação completa do relatório.'
          );
        }

        return result;
      } catch (error) {
        ultimoErro = error;

        if (tentativa < totalTentativas) {
          await esperarRelatorio_(700 * tentativa);
        }
      }
    }

    throw ultimoErro || new Error('Falha ao finalizar o relatório.');
  }

  /*
   * Histórico e Programação continuam salvando a cópia no Drive em
   * segundo plano, sem mensagem de sucesso na interface.
   */
  window.salvarPdfNoDrive_ = function (nomeArquivo, blob) {
    Promise.resolve()
      .then(() => blobParaBase64_(blob))
      .then(base64 =>
        chamarApiAppsScript('salvarPdfRapidoDrive', [nomeArquivo, base64])
      )
      .catch(error => {
        console.error('Falha ao salvar PDF no Drive em segundo plano:', error);
      });

    return Promise.resolve({ background: true });
  };

  /*
   * Relatório operacional - Recebimento e Saída.
   *
   * Ponto mais importante:
   * rows só é apagado quando o Apps Script confirma que concluiu:
   * - PDF no Drive;
   * - dados na aba operacional;
   * - status GERADO;
   * - Histórico;
   * - Conciliação.
   */
  window.gerarRelatorio = async function () {
    if (salvamentoEmLote) {
      alert('Os dados ainda estão sendo salvos. Aguarde alguns segundos e tente novamente.');
      return;
    }

    const preenchidas = rows.filter(row => !linhaSemDados(row));

    if (!preenchidas.length) {
      alert('Não existem dados preenchidos para gerar o relatório.');
      return;
    }

    cancelarTimers();

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

    /*
     * Dispara o seletor local a partir do clique do usuário, mas ele não
     * controla a gravação oficial do sistema.
     */
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
      button.textContent = 'FINALIZANDO...';
    }

    if (typeof setStatus === 'function') {
      setStatus('Finalizando relatório...', 'saving');
    }

    const payload = preenchidas.map(row => ({
      sheetRow: row.sheetRow,
      values: row.values.slice()
    }));

    const reportId = criarIdRelatorio_();

    /*
     * A finalização oficial começa independentemente do que o usuário fizer
     * no seletor de arquivo local.
     */
    const finalizacaoPromise = blobParaBase64_(pdfBlob)
      .then(pdfBase64 =>
        finalizarRelatorioSeguro_([
          pageKeyFinal,
          dateFinal,
          payload,
          nomeArquivo,
          pdfBase64,
          reportId
        ], 3)
      );

    let erroLocal = null;

    try {
      const destino = await destinoPromise;

      if (!destino.cancelado) {
        try {
          await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);
        } catch (error) {
          erroLocal = error;
        }
      }

      /*
       * NÃO limpa a tela antes desta confirmação.
       */
      await finalizacaoPromise;

      rows = [];
      garantirDuasLinhasVazias();
      renderTable();

      if (typeof setStatus === 'function') {
        setStatus('Pronto', 'saved');
      }

      if (erroLocal) {
        alert(
          'O relatório foi registrado no sistema, mas o arquivo local não pôde ser salvo.\n\n' +
          'Você pode gerar novamente pelo Histórico.'
        );
      }

    } catch (error) {
      /*
       * Falha da confirmação oficial = mantém tudo na tela.
       * Assim o usuário nunca perde as linhas por uma falha de internet,
       * Drive ou Apps Script.
       */
      if (typeof setStatus === 'function') {
        setStatus('Falha ao finalizar. Dados mantidos na tela.', 'error');
      }

      alert(
        'O relatório NÃO foi finalizado no sistema.\n\n' +
        'Os dados foram mantidos nesta tela para não haver perda.\n' +
        'Tente gerar o relatório novamente.\n\n' +
        ((error && error.message) ? error.message : '')
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = textoOriginal;
      }
    }
  };
})();
