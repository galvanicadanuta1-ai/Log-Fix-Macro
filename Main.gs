/**
 * ============================================================
 * ENTRADA DO WEB APP
 * ============================================================
 * IMPORTANTE:
 * A preparação estrutural NÃO roda no doGet().
 * Isso reduz o tempo de abertura, principalmente no celular.
 */

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialConfig = JSON.stringify(getInitialConfig_());

  return template
    .evaluate()
    .setTitle('SGQ Fixpar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}


function getInitialConfig_() {
  return {
    recebimento: {
      key: 'RECEBIMENTO',
      title: CONFIG.RECEBIMENTO.title,
      historyTitle: CONFIG.RECEBIMENTO.historyTitle,
      historyReportPrefix: CONFIG.RECEBIMENTO.historyReportPrefix,
      headers: CONFIG.RECEBIMENTO.headers
    },
    saida: {
      key: 'SAIDA',
      title: CONFIG.SAIDA.title,
      historyTitle: CONFIG.SAIDA.historyTitle,
      historyReportPrefix: CONFIG.SAIDA.historyReportPrefix,
      headers: CONFIG.SAIDA.headers
    }
  };
}
