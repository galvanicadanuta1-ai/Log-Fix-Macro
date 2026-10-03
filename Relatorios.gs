/**
 * ============================================================
 * RELATÓRIOS / PDF / DRIVE
 * ============================================================
 */

function gerarRelatorio(pageKey, isoDate, linhasTela) {
  const cfg = getConfig_(pageKey);

  const registros = normalizarRegistrosRecebidos_(linhasTela);

  if (!registros.length) {
    throw new Error('Não existem dados preenchidos para gerar o relatório.');
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(60000);

  try {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(cfg.sheetName);

    if (!sheet) {
      throw new Error('A aba "' + cfg.sheetName + '" não foi encontrada.');
    }

    const linhasPersistidas = [];
    const opsAfetadas = [];
    const opIndex = acharHeader_(cfg.headers, 'OP');

    registros.forEach(registro => {
      const normalized = normalizarLinhaParaPlanilha_(
        pageKey,
        isoDate,
        registro.values
      );

      let targetRow = Number(registro.sheetRow || 0);

      if (targetRow >= 3) {
        sheet
          .getRange(targetRow, 1, 1, cfg.headers.length)
          .setValues([normalized]);
      } else {
        targetRow = Math.max(sheet.getLastRow() + 1, 3);
        sheet
          .getRange(targetRow, 1, 1, cfg.headers.length)
          .setValues([normalized]);
      }

      sheet.getRange(targetRow, 1).setNumberFormat('dd/MM/yyyy');

      linhasPersistidas.push({
        sheetRow: targetRow,
        values: normalized
      });

      if (opIndex >= 0) {
        opsAfetadas.push(normalized[opIndex]);
      }
    });

    SpreadsheetApp.flush();

    const dataBR = converterIsoParaBR_(isoDate);
    const dataNome = dataBR.replace(/\//g, '-');
    const nomeArquivo =
      cfg.reportTitle +
      ' - Data ' +
      dataNome +
      '.pdf';

    const linhasPdf = linhasPersistidas.map(item =>
      linhaParaRelatorio_(pageKey, item.values)
    );

    const pdf = criarPdf_(
      cfg.reportTitle,
      'Data: ' + dataBR,
      cfg.headers,
      linhasPdf,
      pageKey,
      nomeArquivo
    );

    // Só depois do PDF criado com sucesso:
    // 1) marca como GERADO
    // 2) copia/atualiza no histórico físico.
    const statusCol = cfg.headers.length + 1;

    linhasPersistidas.forEach(item => {
      sheet
        .getRange(item.sheetRow, statusCol)
        .setValue(STATUS_GERADO);

      upsertHistorico_(pageKey, item.sheetRow, item.values);
    });

    SpreadsheetApp.flush();
    sincronizarConciliacaoOps_(opsAfetadas);

    return {
      ok: true,
      fileName: pdf.fileName,
      fileId: pdf.fileId,
      url: pdf.url,
      downloadUrl: pdf.downloadUrl,
      registros: linhasPersistidas.length
    };

  } finally {
    lock.releaseLock();
  }
}


function gerarRelatorioHistorico(pageKey, dataInicialIso, dataFinalIso, busca) {
  const cfg = getConfig_(pageKey);

  const resultado = consultarHistorico(
    pageKey,
    dataInicialIso,
    dataFinalIso,
    busca
  );

  if (!resultado.rows.length) {
    throw new Error('Não existem registros para gerar o relatório.');
  }

  const inicioBR = converterIsoParaBR_(dataInicialIso);
  const fimBR = converterIsoParaBR_(dataFinalIso);

  const mesmoDia = dataInicialIso === dataFinalIso;

  const subtitulo = mesmoDia
    ? 'Data: ' + inicioBR
    : 'Período: ' + inicioBR + ' a ' + fimBR;

  const nomePeriodo = mesmoDia
    ? inicioBR.replace(/\//g, '-')
    : inicioBR.replace(/\//g, '-') + '_a_' + fimBR.replace(/\//g, '-');

  const nomeArquivo =
    cfg.historyReportPrefix +
    ' - ' +
    nomePeriodo +
    '.pdf';

  const linhasPdf = resultado.rows.map(item =>
    item.values.slice()
  );

  const pdf = criarPdf_(
    cfg.historyReportPrefix,
    subtitulo,
    cfg.headers,
    linhasPdf,
    pageKey,
    nomeArquivo
  );

  return {
    ok: true,
    fileName: pdf.fileName,
    fileId: pdf.fileId,
    url: pdf.url,
    downloadUrl: pdf.downloadUrl,
    registros: resultado.rows.length
  };
}


function criarPdf_(
  titulo,
  subtitulo,
  headers,
  dados,
  pageKey,
  nomeArquivo
) {
  let tempSpreadsheet = null;

  try {
    const folder = DriveApp.getFolderById(PASTA_RELATORIOS_ID);

    tempSpreadsheet = SpreadsheetApp.create(
      'TEMP - ' + titulo + ' - ' + Date.now()
    );

    const tempSheet = tempSpreadsheet.getSheets()[0];
    tempSheet.setName('Relatório');

    const totalColunas = headers.length;

    tempSheet
      .getRange(1, 1, 1, totalColunas)
      .merge();

    tempSheet
      .getRange(1, 1)
      .setValue(titulo)
      .setFontSize(16)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    tempSheet.setRowHeight(1, 32);

    tempSheet
      .getRange(2, 1, 1, totalColunas)
      .merge();

    tempSheet
      .getRange(2, 1)
      .setValue(subtitulo)
      .setFontSize(10)
      .setHorizontalAlignment('center');

    tempSheet
      .getRange(4, 1, 1, totalColunas)
      .setValues([headers])
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground('#DDE5EC')
      .setBorder(true, true, true, true, true, true);

    if (dados.length) {
      tempSheet
        .getRange(5, 1, dados.length, totalColunas)
        .setValues(dados)
        .setFontSize(9)
        .setVerticalAlignment('middle')
        .setHorizontalAlignment('center')
        .setBorder(true, true, true, true, true, true);
    }

    if (pageKey === 'RECEBIMENTO') {
      const pesoDanutaIndex = headers.indexOf('Peso Danuta');

      if (pesoDanutaIndex >= 0 && dados.length) {
        tempSheet
          .getRange(5, pesoDanutaIndex + 1, dados.length, 1)
          .setBackground('#EAF4FC');
      }
    }

    tempSheet.setColumnWidth(1, 90);

    for (let c = 2; c <= totalColunas; c++) {
      tempSheet.setColumnWidth(c, 105);
    }

    if (pageKey === 'RECEBIMENTO') {
      if (totalColunas >= 5) tempSheet.setColumnWidth(5, 110);
      if (totalColunas >= 6) tempSheet.setColumnWidth(6, 105);
      if (totalColunas >= 10) tempSheet.setColumnWidth(10, 110);
      if (totalColunas >= 11) tempSheet.setColumnWidth(11, 130);
    }

    tempSheet.setFrozenRows(4);

    SpreadsheetApp.flush();
    Utilities.sleep(900);

    const tempFile = DriveApp.getFileById(tempSpreadsheet.getId());

    const pdfBlob = tempFile
      .getAs(MimeType.PDF)
      .setName(nomeArquivo);

    const pdfFile = folder.createFile(pdfBlob);

    if (!pdfFile || !pdfFile.getId()) {
      throw new Error('O PDF não pôde ser salvo na pasta.');
    }

    const result = {
      fileName: nomeArquivo,
      fileId: pdfFile.getId(),
      url: pdfFile.getUrl(),
      downloadUrl: '',
      mimeType: 'application/pdf',

      // Retorna também os bytes do MESMO PDF salvo no Drive.
      // O navegador usa isso para abrir a janela "Salvar como"
      // sem depender do comportamento do Google Drive.
      pdfBase64: Utilities.base64Encode(
        pdfBlob.getBytes()
      )
    };

    try {
      result.downloadUrl = pdfFile.getDownloadUrl();
    } catch (e) {
      result.downloadUrl = pdfFile.getUrl();
    }

    tempFile.setTrashed(true);
    tempSpreadsheet = null;

    return result;

  } catch (error) {
    try {
      if (tempSpreadsheet) {
        DriveApp
          .getFileById(tempSpreadsheet.getId())
          .setTrashed(true);
      }
    } catch (e) {}

    throw new Error(
      'Não foi possível gerar o relatório: ' +
      error.message
    );
  }
}


function autorizarDrive() {
  const pasta = DriveApp.getFolderById(PASTA_RELATORIOS_ID);
  const nomePasta = pasta.getName();

  const arquivoTeste = pasta.createFile(
    Utilities.newBlob(
      'Teste de autorização SGQ Fixpar',
      'text/plain',
      'TESTE_AUTORIZACAO_SGQ_FIXPAR.txt'
    )
  );

  const idTeste = arquivoTeste.getId();
  arquivoTeste.setTrashed(true);

  Logger.log(
    'Drive autorizado para leitura e escrita. Pasta: ' +
    nomePasta +
    ' | Arquivo de teste: ' +
    idTeste
  );

  return {
    ok: true,
    pasta: nomePasta,
    escrita: true
  };
}
