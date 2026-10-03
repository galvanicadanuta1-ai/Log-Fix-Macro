/* ============================================================
   MENSAGEM DE SUCESSO SEM ALERT NATIVO
   ============================================================ */
let successToastTimer = null;

function mostrarSucessoRelatorio() {
  const toast = document.getElementById('successToast');
  if (!toast) return;

  clearTimeout(successToastTimer);

  toast.textContent = 'Relatório gerado com sucesso!';
  toast.classList.add('show');

  successToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}


/* ============================================================
   SALVAR PDF NO COMPUTADOR
   ============================================================ */
function base64ParaBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob(
    [bytes],
    { type: mimeType || 'application/pdf' }
  );
}

function abrirJanelaSalvarRelatorio() {
  const popup = window.open('', '_blank', 'width=560,height=330');

  if (!popup) {
    return null;
  }

  popup.document.open();
  popup.document.write(
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<title>Salvar relatório</title>' +
    '<style>' +
    'body{font-family:Arial,sans-serif;margin:0;background:#f3f5f7;color:#17212b;display:flex;align-items:center;justify-content:center;min-height:100vh}' +
    '.box{width:calc(100% - 36px);max-width:470px;background:#fff;border:1px solid #c3ccd4;border-radius:8px;padding:22px;box-shadow:0 5px 18px rgba(0,0,0,.10)}' +
    'h2{font-size:18px;margin:0 0 12px;text-align:center}.msg{text-align:center;color:#6a7680;font-size:13px}' +
    '</style></head><body><div class="box"><h2>Relatório</h2><div class="msg">Aguarde o arquivo ficar disponível.</div></div></body></html>'
  );
  popup.document.close();

  return popup;
}

function prepararJanelaSalvarRelatorio(popup, result) {
  if (!result || !result.pdfBase64) {
    if (popup && !popup.closed) {
      popup.location.href = result && (result.downloadUrl || result.url)
        ? (result.downloadUrl || result.url)
        : 'about:blank';
    }
    return;
  }

  const blob = base64ParaBlob(
    result.pdfBase64,
    result.mimeType || 'application/pdf'
  );

  const blobUrl = URL.createObjectURL(blob);
  const nomePadrao = result.fileName || 'Relatorio.pdf';

  // Se popup foi bloqueado, faz download normal como fallback.
  if (!popup || popup.closed) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = nomePadrao;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return;
  }

  const doc = popup.document;
  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><title>Salvar relatório</title>' +
    '<style>' +
    'body{font-family:Arial,sans-serif;margin:0;background:#f3f5f7;color:#17212b;display:flex;align-items:center;justify-content:center;min-height:100vh}' +
    '.box{width:calc(100% - 36px);max-width:480px;background:#fff;border:1px solid #c3ccd4;border-radius:8px;padding:22px;box-shadow:0 5px 18px rgba(0,0,0,.10)}' +
    'h2{font-size:18px;margin:0 0 14px;text-align:center}label{font-size:11px;font-weight:700;color:#586775}' +
    'input{width:100%;box-sizing:border-box;height:38px;border:1px solid #aeb8c1;border-radius:5px;padding:0 9px;margin:5px 0 14px;font-size:12px}' +
    '.actions{display:flex;gap:8px}.btn{flex:1;height:38px;border-radius:5px;border:1px solid #1f4e78;font-weight:700;cursor:pointer}' +
    '.save{background:#1f4e78;color:#fff}.open{background:#fff;color:#1f4e78}.note{font-size:10.5px;color:#74808a;margin-top:12px;text-align:center}' +
    '</style></head><body><div class="box"><h2>Relatório pronto</h2>' +
    '<label>Nome do arquivo</label><input id="fileName" value="">' +
    '<div class="actions"><button id="saveAs" class="btn save">SALVAR COMO...</button><button id="openPdf" class="btn open">ABRIR PDF</button></div>' +
    '<div class="note">Uma cópia já foi salva automaticamente no Drive.</div>' +
    '</div></body></html>'
  );
  doc.close();

  const nameInput = doc.getElementById('fileName');
  const saveButton = doc.getElementById('saveAs');
  const openButton = doc.getElementById('openPdf');

  nameInput.value = nomePadrao;

  openButton.onclick = () => {
    popup.location.href = blobUrl;
  };

  saveButton.onclick = async () => {
    let nome = String(nameInput.value || nomePadrao).trim();
    if (!/\.pdf$/i.test(nome)) nome += '.pdf';

    if ('showSaveFilePicker' in popup) {
      try {
        const handle = await popup.showSaveFilePicker({
          suggestedName: nome,
          types: [{
            description: 'Documento PDF',
            accept: { 'application/pdf': ['.pdf'] }
          }]
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        popup.close();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }

    // Fallback para navegadores sem seletor nativo.
    const link = doc.createElement('a');
    link.href = blobUrl;
    link.download = nome;
    doc.body.appendChild(link);
    link.click();
    link.remove();
  };
}

/* ============================================================
   GERAR RELATÓRIO
   ============================================================ */
async function gerarRelatorio() {

  cancelarTimers();

  if (salvamentoEmLote) {
    alert(
      'Os dados colados ainda estão sendo salvos.\n\n' +
      'Aguarde aparecer "Histórico e Conciliação atualizados" e clique novamente em GERAR RELATÓRIO.'
    );
    return;
  }

  const preenchidas = rows.filter(row => !linhaSemDados(row));

  if (!preenchidas.length) {
    alert('Não existem dados preenchidos para gerar o relatório.');
    return;
  }

  const pageName =
    currentPage === 'RECEBIMENTO'
      ? 'Recebimento'
      : 'Saída';

  const date =
    document.getElementById('selectedDate').value ||
    hojeISO();

  const confirmar = confirm(
    'Gerar o Relatório de ' +
    pageName +
    ' da data ' +
    dataBR(date) +
    '?\n\n' +
    'Os registros serão retirados desta tela após gerar o PDF, mas permanecerão salvos na planilha e poderão ser consultados no Histórico.'
  );

  if (!confirmar) {
    return;
  }

  const nomeSugerido =
    (
      currentPage === 'RECEBIMENTO'
        ? 'Relatório de Recebimento SGQ Fixpar - Data '
        : 'Relatório de Saída SGQ - Fixpar - Data '
    ) +
    dataBR(date).replace(/\//g, '-') +
    '.pdf';

  // Abre uma janela própria de salvamento. A escolha do destino
  // acontece em uma janela de nível superior, onde o navegador
  // permite exibir o seletor nativo "Salvar como".
  const janelaSalvar = abrirJanelaSalvarRelatorio();

  const button =
    document.getElementById('reportButton');

  button.disabled = true;
  button.textContent = 'GERANDO PDF...';

  const dados = preenchidas.map(row => ({
    sheetRow: row.sheetRow,
    values: row.values.slice()
  }));

  google.script.run
    .withSuccessHandler(async result => {

      button.disabled = false;
      button.textContent = 'GERAR RELATÓRIO';

      // Limpa somente a tela operacional.
      rows = [];
      garantirDuasLinhasVazias();
      renderTable();

      prepararJanelaSalvarRelatorio(
        janelaSalvar,
        result
      );

      mostrarSucessoRelatorio();
    })
    .withFailureHandler(error => {

      if (janelaSalvar && !janelaSalvar.closed) janelaSalvar.close();

      button.disabled = false;
      button.textContent = 'GERAR RELATÓRIO';

      alert(
        (error && error.message)
          ? error.message
          : 'Não foi possível gerar o relatório.'
      );
    })
    .gerarRelatorio(
      currentPage,
      date,
      dados
    );
}



