/* ============================================================
   PROGRAMAÇÃO SGQ - IMPRESSÃO PAGINADA
   ============================================================
   Garante que TODAS as páginas impressas tenham:
   - logo;
   - título do bloco esquerdo;
   - Turno + data;
   - título "OPs de 1 caixa";
   - Turno + data;
   - cabeçalhos das colunas.
   ============================================================ */

(function () {
  const LOGO_URL = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';
  const LINHAS_POR_PAGINA = 11;

  function esc_(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function turno_() {
    return typeof obterTurnoProgramacaoSgq === 'function'
      ? obterTurnoProgramacaoSgq()
      : 'Turno Dia';
  }

  function dataHoje_() {
    return new Date().toLocaleDateString('pt-BR');
  }

  function dados_() {
    if (typeof dadosProgramacaoParaExportar_ === 'function') {
      return dadosProgramacaoParaExportar_();
    }

    const grupos = typeof separarProgramacaoSgqRows_ === 'function'
      ? separarProgramacaoSgqRows_()
      : { principal: [], umaCaixa: [] };

    const curta = valor => {
      if (typeof formatarDataCurtaProgramacao_ === 'function') {
        return formatarDataCurtaProgramacao_(valor);
      }
      return valor || '';
    };

    return {
      headersEsquerda: ['Data Entrada','OP','Qtd. Caixas','Qtd. Caçamba','Cor','Kgs','Status','OK','Enc.'],
      headersDireita: ['Data Entrada','OP','Qtd. Caixas','Cor','Kgs','Status','OK'],
      principal: (grupos.principal || []).map(item => [
        curta(item.dataEntrada), item.op || '', item.qtdCaixas || '', item.qtdConteiner || '',
        item.cor || '', item.pesoDanuta || '', item.status || '', item.ok ? '✓' : '',
        item.encaminhado ? '✓' : ''
      ]),
      umaCaixa: (grupos.umaCaixa || []).map(item => [
        curta(item.dataEntrada), item.op || '', item.qtdCaixas || '', item.cor || '',
        item.pesoDanuta || '', item.status || '', item.ok ? '✓' : ''
      ])
    };
  }

  function ths_(headers) {
    return headers.map(h => '<th>' + esc_(h) + '</th>').join('');
  }

  function trs_(rows, statusIndex) {
    return rows.map(row => {
      const urgente = String(row[statusIndex] || '').trim().toLocaleLowerCase('pt-BR') === 'urgente';
      return '<tr' + (urgente ? ' class="urgente"' : '') + '>' +
        row.map((valor, i) => '<td' + (i === statusIndex ? ' class="status"' : '') + '>' + esc_(valor) + '</td>').join('') +
      '</tr>';
    }).join('');
  }

  function bloco_(titulo, subtitulo, headers, rows, direita) {
    return '' +
      '<section class="bloco ' + (direita ? 'direita' : 'esquerda') + '">' +
        '<div class="cabecalho">' +
          '<img src="' + LOGO_URL + '" alt="Galvânica Danuta">' +
          '<div class="titulos">' +
            '<div class="titulo">' + esc_(titulo) + '</div>' +
            '<div class="subtitulo">' + esc_(subtitulo) + '</div>' +
          '</div>' +
        '</div>' +
        '<table>' +
          '<thead><tr>' + ths_(headers) + '</tr></thead>' +
          '<tbody>' + trs_(rows, direita ? 5 : 6) + '</tbody>' +
        '</table>' +
      '</section>';
  }

  function montarHtml_() {
    const dados = dados_();
    const subtitulo = turno_() + ' • ' + dataHoje_();
    const esquerda = Array.isArray(dados.principal) ? dados.principal : [];
    const direita = Array.isArray(dados.umaCaixa) ? dados.umaCaixa : [];
    const headersEsq = dados.headersEsquerda || dados.headersPrincipal || [];
    const headersDir = dados.headersDireita || dados.headersUmaCaixa || [];

    const totalPaginas = Math.max(
      1,
      Math.ceil(esquerda.length / LINHAS_POR_PAGINA),
      Math.ceil(direita.length / LINHAS_POR_PAGINA)
    );

    let paginas = '';

    for (let pagina = 0; pagina < totalPaginas; pagina++) {
      const inicio = pagina * LINHAS_POR_PAGINA;
      const esqPagina = esquerda.slice(inicio, inicio + LINHAS_POR_PAGINA);
      const dirPagina = direita.slice(inicio, inicio + LINHAS_POR_PAGINA);

      paginas += '<div class="pagina">' +
        bloco_('Programação SGQ - Fixpar', subtitulo, headersEsq, esqPagina, false) +
        bloco_('OPs de 1 caixa', subtitulo, headersDir, dirPagina, true) +
      '</div>';
    }

    return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
      '<title>Programação SGQ - Fixpar</title>' +
      '<style>' +
        '@page{size:A4 landscape;margin:5mm}' +
        '*{box-sizing:border-box}' +
        'html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}' +
        '.pagina{width:100%;min-height:196mm;display:grid;grid-template-columns:1.03fr .97fr;gap:2mm;page-break-after:always;break-after:page}' +
        '.pagina:last-child{page-break-after:auto;break-after:auto}' +
        '.bloco{min-width:0}' +
        '.cabecalho{display:grid;grid-template-columns:22mm 1fr 22mm;align-items:center;min-height:13mm;padding:0 0 1.2mm;border-bottom:1px solid #222;margin-bottom:1mm}' +
        '.cabecalho img{display:block;max-width:21mm;max-height:10mm;object-fit:contain;justify-self:start}' +
        '.titulos{text-align:center;grid-column:2}' +
        '.titulo{font-size:11pt;font-weight:800;line-height:1.05}' +
        '.subtitulo{margin-top:1mm;font-size:7.8pt;font-weight:700;line-height:1}' +
        'table{width:100%;border-collapse:collapse;table-layout:fixed}' +
        'th,td{border:1px solid #45515c;text-align:center;vertical-align:middle;word-break:normal;overflow-wrap:anywhere}' +
        'th{background:#e9eef2;font-size:6.6pt;font-weight:800;line-height:1.05;padding:.9mm .35mm}' +
        'td{font-size:9pt;font-weight:600;line-height:1.02;padding:1.05mm .35mm;height:6.4mm}' +
        '.urgente td{background:#fff2f2}' +
        '.urgente td.status{color:#b91c1c;font-weight:900}' +
        '.esquerda th:nth-child(1),.esquerda td:nth-child(1){width:11%}' +
        '.esquerda th:nth-child(2),.esquerda td:nth-child(2){width:11%}' +
        '.esquerda th:nth-child(3),.esquerda td:nth-child(3){width:8%}' +
        '.esquerda th:nth-child(4),.esquerda td:nth-child(4){width:9%}' +
        '.esquerda th:nth-child(5),.esquerda td:nth-child(5){width:23%}' +
        '.esquerda th:nth-child(6),.esquerda td:nth-child(6){width:8%}' +
        '.esquerda th:nth-child(7),.esquerda td:nth-child(7){width:14%}' +
        '.esquerda th:nth-child(8),.esquerda td:nth-child(8){width:7%}' +
        '.esquerda th:nth-child(9),.esquerda td:nth-child(9){width:9%}' +
        '.direita th:nth-child(1),.direita td:nth-child(1){width:13%}' +
        '.direita th:nth-child(2),.direita td:nth-child(2){width:13%}' +
        '.direita th:nth-child(3),.direita td:nth-child(3){width:10%}' +
        '.direita th:nth-child(4),.direita td:nth-child(4){width:32%}' +
        '.direita th:nth-child(5),.direita td:nth-child(5){width:10%}' +
        '.direita th:nth-child(6),.direita td:nth-child(6){width:15%}' +
        '.direita th:nth-child(7),.direita td:nth-child(7){width:7%}' +
        '@media print{.pagina{break-inside:avoid;page-break-inside:avoid}}' +
      '</style></head><body>' + paginas + '</body></html>';
  }

  window.imprimirProgramacaoSgq = function () {
    if (!(window.programacaoSgqRows || []).length) {
      alert('Não existem OPs na programação para imprimir.');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(montarHtml_());
    doc.close();

    const imprimir = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => iframe.remove(), 1500);
      }
    };

    const imagens = Array.from(doc.images || []);
    const pendentes = imagens.filter(img => !img.complete);

    if (!pendentes.length) {
      setTimeout(imprimir, 120);
      return;
    }

    let restantes = pendentes.length;
    const concluir = () => {
      restantes -= 1;
      if (restantes <= 0) setTimeout(imprimir, 120);
    };

    pendentes.forEach(img => {
      img.addEventListener('load', concluir, { once: true });
      img.addEventListener('error', concluir, { once: true });
    });

    setTimeout(() => {
      if (iframe.isConnected) imprimir();
    }, 2500);
  };
})();