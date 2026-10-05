/* ============================================================
   EXPORTAÇÕES / PDF / EXCEL / IMPRESSÃO
   ============================================================
   PDF é gerado no navegador para ficar muito mais rápido.
   O seletor nativo "Salvar como" é aberto quando o navegador suporta.
   Depois, uma cópia do PDF é enviada ao Drive pelo Apps Script.
   ============================================================ */

function obterJsPdf_() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('Biblioteca de PDF não carregada. Atualize a página e tente novamente.');
  }

  return window.jspdf.jsPDF;
}

function verificarXlsx_() {
  if (!window.XLSX) {
    throw new Error('Biblioteca do Excel não carregada. Atualize a página e tente novamente.');
  }
}

function normalizarNomeArquivo_(nome, extensao) {
  let valor = String(nome || 'arquivo').trim();
  const ext = String(extensao || '').replace(/^\./, '');

  if (ext && !new RegExp('\\.' + ext + '$', 'i').test(valor)) {
    valor += '.' + ext;
  }

  return valor;
}

async function escolherDestinoArquivo_(nome, mimeType, extensao, descricao) {
  if (!('showSaveFilePicker' in window)) {
    return { cancelado: false, handle: null };
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: nome,
      types: [{
        description: descricao || 'Arquivo',
        accept: {
          [mimeType]: [extensao]
        }
      }]
    });

    return { cancelado: false, handle };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return { cancelado: true, handle: null };
    }

    return { cancelado: false, handle: null };
  }
}

async function salvarBlobDestino_(destino, blob, nomeArquivo) {
  if (destino && destino.cancelado) return false;

  if (destino && destino.handle) {
    const writable = await destino.handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 15000);
  return true;
}

function blobParaBase64_(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || '');
      const comma = value.indexOf(',');
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };

    reader.onerror = () => reject(reader.error || new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(blob);
  });
}

function textoRelatorio_(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

function dataValorRelatorio_(valor) {
  const text = String(valor || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return dataBR(text);
  return text;
}

function criarPdfTabela_(opcoes) {
  const JsPdf = obterJsPdf_();
  const orientation = opcoes.orientation || 'landscape';
  const doc = new JsPdf({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const titulo = String(opcoes.titulo || 'Relatório');
  const subtitulo = String(opcoes.subtitulo || '');
  const headers = Array.isArray(opcoes.headers) ? opcoes.headers : [];
  const rows = Array.isArray(opcoes.rows) ? opcoes.rows : [];
  const fontSize = Number(opcoes.fontSize || 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(titulo, doc.internal.pageSize.getWidth() / 2, 11, { align: 'center' });

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitulo, doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
  }

  doc.autoTable({
    startY: subtitulo ? 20 : 16,
    head: [headers],
    body: rows,
    theme: 'grid',
    margin: { left: 7, right: 7, bottom: 8 },
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
    }
  });

  return doc.output('blob');
}

function criarXlsxTabela_(titulo, subtitulo, headers, rows, sheetName) {
  verificarXlsx_();

  const aoa = [
    [titulo],
    [subtitulo || ''],
    [],
    headers,
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastCol = Math.max(headers.length - 1, 0);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
  ];

  ws['!cols'] = headers.map(header => ({
    wch: Math.min(Math.max(String(header || '').length + 4, 12), 30)
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    ws,
    String(sheetName || 'Relatório').slice(0, 31)
  );

  const array = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    compression: true
  });

  return new Blob(
    [array],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

async function salvarPdfNoDrive_(nomeArquivo, blob) {
  const base64 = await blobParaBase64_(blob);
  return chamarApiAppsScript('salvarPdfRapidoDrive', [nomeArquivo, base64]);
}

/* ============================================================
   RELATÓRIO OPERACIONAL - VERSÃO RÁPIDA
   ============================================================ */
async function gerarRelatorio() {
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
    const dados = preenchidas.map(row => row.values.map((value, index) =>
      index === 0 ? dataValorRelatorio_(value || date) : textoRelatorio_(value)
    ));

    const pesoIndex = recebimento ? headers.indexOf('Peso Danuta') : -1;

    const pdfBlob = criarPdfTabela_({
      titulo: cfg.title,
      subtitulo: 'Data: ' + dataBR(date),
      headers,
      rows: dados,
      orientation: 'landscape',
      fontSize: recebimento ? 7.2 : 8.5,
      highlightColumnIndex: pesoIndex
    });

    await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);

    const pdfBase64 = await blobParaBase64_(pdfBlob);
    const payload = preenchidas.map(row => ({
      sheetRow: row.sheetRow,
      values: row.values.slice()
    }));

    await chamarApiAppsScript('finalizarRelatorioRapido', [
      currentPage,
      date,
      payload,
      nomeArquivo,
      pdfBase64
    ]);

    rows = [];
    garantirDuasLinhasVazias();
    renderTable();
    mostrarSucessoRelatorio();
  } catch (error) {
    alert(
      (error && error.message)
        ? error.message
        : 'Não foi possível finalizar o relatório.'
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = textoOriginal;
    }
  }
}

/* ============================================================
   HISTÓRICO - PDF / EXCEL / IMPRESSÃO
   ============================================================ */
function filtrosHistoricoAtuais_() {
  const dataInicial = document.getElementById('historyStartDate').value;
  const dataFinal = document.getElementById('historyEndDate').value;
  const busca = document.getElementById('historySearch').value.trim();

  if (!dataInicial || !dataFinal) {
    throw new Error('Selecione a data inicial e a data final.');
  }

  if (dataInicial > dataFinal) {
    throw new Error('A data inicial não pode ser maior que a data final.');
  }

  return { dataInicial, dataFinal, busca };
}

async function obterHistoricoCompletoAtual_() {
  const filtros = filtrosHistoricoAtuais_();
  const result = await chamarApiAppsScript('consultarHistorico', [
    currentHistoryPage,
    filtros.dataInicial,
    filtros.dataFinal,
    filtros.busca
  ]);

  return {
    ...filtros,
    result
  };
}

function tituloPeriodoHistorico_(pageKey, dataInicial, dataFinal) {
  const prefixo = pageKey === 'RECEBIMENTO'
    ? 'Relatório de Entrada'
    : 'Relatório de Saída';

  const periodo = dataInicial === dataFinal
    ? 'Data: ' + dataBR(dataInicial)
    : 'Período: ' + dataBR(dataInicial) + ' a ' + dataBR(dataFinal);

  return { prefixo, periodo };
}

async function gerarRelatorioHistoricoTela() {
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

    const pdfBlob = criarPdfTabela_({
      titulo: info.prefixo,
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
}

async function exportarHistoricoExcel() {
  const button = document.getElementById('historyExcelButton');

  try {
    const filtros = filtrosHistoricoAtuais_();
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
      'xlsx'
    );

    const destino = await escolherDestinoArquivo_(
      nomeArquivo,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xlsx',
      'Planilha Excel'
    );

    if (destino.cancelado) return;

    if (button) button.disabled = true;

    const consulta = await obterHistoricoCompletoAtual_();
    const result = consulta.result || {};
    const items = Array.isArray(result.rows) ? result.rows : [];

    if (!items.length) {
      throw new Error('Não existem registros para exportar.');
    }

    const headers = result.headers || getPageConfigByKey(currentHistoryPage).headers;
    const dados = items.map(item => (item.values || []).map(textoRelatorio_));

    const blob = criarXlsxTabela_(
      info.prefixo,
      info.periodo,
      headers,
      dados,
      currentHistoryPage === 'RECEBIMENTO' ? 'Entrada' : 'Saída'
    );

    await salvarBlobDestino_(destino, blob, nomeArquivo);
  } catch (error) {
    alert(error.message || 'Não foi possível exportar para Excel.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function imprimirHistoricoTela() {
  const button = document.getElementById('historyPrintButton');

  try {
    if (button) button.disabled = true;

    const consulta = await obterHistoricoCompletoAtual_();
    const result = consulta.result || {};
    const items = Array.isArray(result.rows) ? result.rows : [];

    if (!items.length) {
      throw new Error('Não existem registros para imprimir.');
    }

    const info = tituloPeriodoHistorico_(
      currentHistoryPage,
      consulta.dataInicial,
      consulta.dataFinal
    );

    const headers = result.headers || getPageConfigByKey(currentHistoryPage).headers;
    const dados = items.map(item => (item.values || []).map(textoRelatorio_));

    imprimirTabelaHtml_(info.prefixo, info.periodo, headers, dados);
  } catch (error) {
    alert(error.message || 'Não foi possível imprimir o relatório.');
  } finally {
    if (button) button.disabled = false;
  }
}

function escaparHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function imprimirTabelaHtml_(titulo, subtitulo, headers, rows) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  const cabecalho = headers.map(h => '<th>' + escaparHtml_(h) + '</th>').join('');
  const corpo = rows.map(row =>
    '<tr>' + row.map(v => '<td>' + escaparHtml_(v) + '</td>').join('') + '</tr>'
  ).join('');

  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>' + escaparHtml_(titulo) + '</title>' +
    '<style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial,sans-serif;color:#111;margin:0}' +
    'h1{text-align:center;font-size:18px;margin:0 0 3px}h2{text-align:center;font-size:11px;font-weight:normal;margin:0 0 8px}' +
    'table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #555;padding:4px 3px;text-align:center;font-size:9px}' +
    'th{background:#e9eef2;font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}</style>' +
    '</head><body><h1>' + escaparHtml_(titulo) + '</h1><h2>' + escaparHtml_(subtitulo) + '</h2>' +
    '<table><thead><tr>' + cabecalho + '</tr></thead><tbody>' + corpo + '</tbody></table></body></html>'
  );
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 150);
}

/* ============================================================
   PROGRAMAÇÃO SGQ - PDF / EXCEL
   ============================================================ */
function obterTituloProgramacaoSgq_() {
  const turno = typeof obterTurnoProgramacaoSgq === 'function'
    ? obterTurnoProgramacaoSgq()
    : 'Turno Dia';

  return 'Programação SGQ - Fixpar - ' + turno;
}

function dadosProgramacaoParaExportar_() {
  if (typeof ordenarProgramacaoSgqRows_ === 'function') {
    ordenarProgramacaoSgqRows_();
  }

  const headers = [
    'Data de Entrada',
    'OP',
    'Qtd. Caixas',
    'Qtd. Contêiner',
    'Cor',
    'Peso Danuta (Kg)',
    'Status',
    'OK',
    'Encaminhado'
  ];

  const dados = programacaoSgqRows.map(item => [
    item.dataEntrada || '',
    item.op || '',
    item.qtdCaixas || '',
    item.qtdConteiner || '',
    item.cor || '',
    item.pesoDanuta || '',
    item.status || '',
    item.ok ? 'SIM' : '',
    item.encaminhado ? 'SIM' : ''
  ]);

  return { headers, dados };
}

async function exportarProgramacaoSgqExcel() {
  try {
    if (!programacaoSgqRows.length) {
      throw new Error('Não existem OPs na programação para exportar.');
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const nomeArquivo = normalizarNomeArquivo_(
      obterTituloProgramacaoSgq_() + ' - ' + dataHoje.replace(/\//g, '-'),
      'xlsx'
    );

    const destino = await escolherDestinoArquivo_(
      nomeArquivo,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xlsx',
      'Planilha Excel'
    );

    if (destino.cancelado) return;

    const { headers, dados } = dadosProgramacaoParaExportar_();
    const blob = criarXlsxTabela_(
      obterTituloProgramacaoSgq_(),
      'Data: ' + dataHoje,
      headers,
      dados,
      'Programação SGQ'
    );

    await salvarBlobDestino_(destino, blob, nomeArquivo);
  } catch (error) {
    alert(error.message || 'Não foi possível exportar a programação.');
  }
}

async function gerarRelatorioProgramacaoSgq() {
  if (!programacaoSgqRows.length) {
    alert('Não existem OPs na programação para gerar o relatório.');
    return;
  }

  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const nomeArquivo = normalizarNomeArquivo_(
    obterTituloProgramacaoSgq_() + ' - ' + dataHoje.replace(/\//g, '-'),
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
    const { headers, dados } = dadosProgramacaoParaExportar_();

    const pdfBlob = criarPdfTabela_({
      titulo: obterTituloProgramacaoSgq_(),
      subtitulo: 'Data: ' + dataHoje,
      headers,
      rows: dados,
      orientation: 'landscape',
      fontSize: 9.3
    });

    await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);
    await salvarPdfNoDrive_(nomeArquivo, pdfBlob);
    mostrarSucessoRelatorio();
  } catch (error) {
    alert(error.message || 'Não foi possível gerar o relatório da programação.');
  }
}
