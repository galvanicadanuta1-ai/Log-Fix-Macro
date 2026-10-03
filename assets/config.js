/**
 * SGQ FIXPAR - CONFIGURAÇÃO DO FRONT-END
 *
 * Depois de publicar o Apps Script como Web App, cole a URL /exec abaixo.
 */
const API_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT_EXEC';

const CONFIG = {
  recebimento: {
    key: 'RECEBIMENTO',
    title: 'Recebimento SGQ - Fixpar',
    historyTitle: 'Histórico Recebimento',
    historyReportPrefix: 'Relatório de Entrada',
    headers: [
      'Data',
      'OP',
      'Qtd. Caixas',
      'Qtd. Contêiner',
      'Peso NF. Fixpar',
      'Peso Danuta',
      'Diferença',
      'Diferença em %',
      'Cor',
      'Nota Fiscal',
      'Nota Fiscal de Caixa',
      'Processo'
    ]
  },
  saida: {
    key: 'SAIDA',
    title: 'Saída SGQ - Fixpar',
    historyTitle: 'Histórico Saída',
    historyReportPrefix: 'Relatório de Saída',
    headers: [
      'Data',
      'OP',
      'Caixas',
      'Contêiner',
      'Peso',
      'Nota fiscal',
      'Nota fiscal de caixa',
      'Anotação Fixpar'
    ]
  }
};

function apiConfigurada() {
  return (
    typeof API_URL === 'string' &&
    /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(API_URL)
  );
}
