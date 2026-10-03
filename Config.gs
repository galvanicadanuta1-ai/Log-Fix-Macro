/**
 * ============================================================
 * CONFIGURAÇÃO CENTRAL - SGQ FIXPAR
 * ============================================================
 * Edite IDs, nomes de abas e colunas somente aqui.
 */
const PASTA_RELATORIOS_ID = '1f8NHcxsAGSTtqIGnoL-ikDH_vr_6b1Gm';

const STATUS_HEADER = '__STATUS_RELATORIO';
const STATUS_GERADO = 'GERADO';

const HIST_SOURCE_HEADER = '__SOURCE_ROW';
const HIST_UPDATED_HEADER = '__ATUALIZADO_EM';

const CONFIG = {
  RECEBIMENTO: {
    sheetName: 'Recebimento Fixpar',
    historySheetName: 'Histórico Entrada',
    logSheetName: 'Log Histórico Entrada',
    title: 'Recebimento SGQ - Fixpar',
    historyTitle: 'Histórico Recebimento',
    reportTitle: 'Relatório de Recebimento SGQ Fixpar',
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

  SAIDA: {
    sheetName: 'Entregas Fixpar',
    historySheetName: 'Histórico Saída',
    logSheetName: 'Log Histórico Saída',
    title: 'Saída SGQ - Fixpar',
    historyTitle: 'Histórico Saída',
    reportTitle: 'Relatório de Saída SGQ - Fixpar',
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
