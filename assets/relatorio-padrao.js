/* ============================================================
   PADRÃO GLOBAL DE RELATÓRIOS
   ============================================================
   - Mesmo fluxo para Recebimento e Saída Fixpar.
   - PDF é criado no navegador.
   - Primeiro abre "Salvar como" (quando suportado).
   - Em navegadores sem seletor nativo, baixa para Downloads.
   - A cópia no Drive acontece silenciosamente em segundo plano.
   - Nenhuma mensagem de sucesso é exibida por causa do Drive.
   ============================================================ */

(function () {
  /* Sucesso silencioso: não exibe toast/alerta ao concluir relatório. */
  window.mostrarSucessoRelatorio = function () {};

  /*
   * Histórico e Programação já chamam salvarPdfNoDrive_().
   * Mantemos a mesma assinatura, mas o upload passa a ser realmente
   * assíncrono e não bloqueia a interface.
   */
  window.salvarPdfNoDrive_ = function (nomeArquivo, blob) {
    Promise.resolve()
      .then(() => blobParaBase64_(blob))
      .then(base64 =>
        chamarApiAppsScript('salvarPdfRapidoDrive', [nomeArquivo, base64])
      )
      .catch(error => {
        // Salvamento de Drive é intencionalmente silencioso na interface.
        console.error('Falha ao salvar PDF no Drive em segundo plano:', error);
      });

    return Promise.resolve({ background: true });
  };

  /*
   * Relatório operacional (Recebimento e Saída).
   * A finalização no servidor — Drive + status GERADO + Histórico +
   * Conciliação — é disparada em segundo plano depois que o arquivo local
   * já foi entregue ao usuário.
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

    const date = document.getElementById('selectedDate').value || hojeISO();
    const recebimento = currentPage === 'RECEBIMENTO';

    const nomeArquivo = normalizarNomeArquivo_(
      (recebimento
        ? 'Relatório de Recebimento SGQ Fixpar - Data '
        : 'Relatório de Saída SGQ - Fixpar - Data ') +
        dataBR(date).replace(/\//g, '-'),
      'pdf'
    );

    const destino = await escolherDestinoArquivo_(
      nomeArquivo,
      'application/pdf',
      '.pdf',
      'Documento PDF'
    );

    if (destino.cancelado) return;

    const button = document.getElementById('reportButton');
    const textoOriginal = button ? button.textContent : 'GERAR RELATÓRIO';

    if (button) {
      button.disabled = true;
      button.textContent = 'GERANDO...';
    }

    try {
      cancelarTimers();

      const cfg = getPageConfig();
      const headers = cfg.headers.slice();

      const dadosPdf = preenchidas.map(row =>
        row.values.map((value, index) =>
          index === 0
            ? dataValorRelatorio_(value || date)
            : textoRelatorio_(value)
        )
      );

      const pesoIndex = recebimento
        ? headers.indexOf('Peso Danuta')
        : -1;

      const pdfBlob = criarPdfTabela_({
        titulo: cfg.title,
        subtitulo: 'Data: ' + dataBR(date),
        headers,
        rows: dadosPdf,
        orientation: 'landscape',
        fontSize: recebimento ? 7.2 : 8.5,
        highlightColumnIndex: pesoIndex
      });

      /* O usuário recebe o arquivo antes da sincronização de fundo. */
      await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);

      const pdfBase64 = await blobParaBase64_(pdfBlob);
      const payload = preenchidas.map(row => ({
        sheetRow: row.sheetRow,
        values: row.values.slice()
      }));

      const pageKeyFinal = currentPage;
      const dateFinal = date;

      /*
       * Limpa a tela imediatamente. Os dados já estão persistidos na
       * planilha pelo salvamento normal da grade. A chamada abaixo apenas
       * finaliza o relatório e guarda o PDF no Drive.
       */
      rows = [];
      garantirDuasLinhasVazias();
      renderTable();

      if (typeof setStatus === 'function') {
        setStatus('Pronto', 'saved');
      }

      /* Segundo plano: sem toast e sem alerta de sucesso. */
      chamarApiAppsScript('finalizarRelatorioRapido', [
        pageKeyFinal,
        dateFinal,
        payload,
        nomeArquivo,
        pdfBase64
      ]).catch(error => {
        console.error('Falha ao finalizar relatório em segundo plano:', error);
      });

    } catch (error) {
      alert(
        error && error.message
          ? error.message
          : 'Não foi possível gerar o relatório.'
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = textoOriginal;
      }
    }
  };
})();
