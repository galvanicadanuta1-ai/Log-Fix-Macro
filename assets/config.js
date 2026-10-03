/**
 * SGQ FIXPAR - CONFIGURAÇÃO DO FRONT-END
 *
 * Web App do Apps Script usado como API pelo GitHub Pages.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbwBimN8eXQFB3CkV-xv557oOiHjC8Htce9yUAiKjJhayao7-WXyxjOaiNHqm7NX4P3G8Q/exec';

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
