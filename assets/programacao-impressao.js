/* ============================================================
   PROGRAMAÇÃO SGQ - IMPRESSÃO PAGINADA
   ============================================================
   Garante que TODAS as páginas impressas tenham:
   - logo;
   - título do bloco esquerdo;
   - Turno + data;
   - título "OPs de 1 caixa";
   - Turno + data;
   - cabeçalhos das colunas;
   - Prioridade com espaço suficiente para "URGENTE" completo.
   ============================================================ */

(function () {
  const LOGO_URL = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';
  const LINHAS_POR_PAGINA = 10;

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
      headersEsquerda: ['Data Entrada','OP','Qtd. Caixas','Qtd. Caçamba','Cor','Kgs','Prioridade','OK','Enc.'],
      headersDireita: ['Data Entrada','OP','Qtd. Caixas','Cor','Kgs','Prioridade','OK'],
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

  function trs_(rows, prioridadeIndex) {
    return rows.map(row => {
      const urgente = String(row[prioridadeIndex] || '')
        .trim()
        .toLocaleLowerCase('pt-BR') === 'urgente';

      return '<tr' + (urgente ? ' class="urgente"' : '') + '>' +
        row.map((valor, i) =>
          '<td' + (i === prioridadeIndex ? ' class="prioridade"' : '') + '>' +
            esc_(valor) +
          '</td>'
        ).join('') +
      '</tr>';
    }).join('');
  }

  function bloco_(titulo, subtitulo, headers, rows, direita) {
    return '' +
      '<section class="bloco ' + (direita ? 'direita' : 'esquerda') + '">' +
        '<div class="cabecalho">' +
          '<div class="logo-box"><img src="' + LOGO_URL + '" alt="Galvânica Danuta"></div>' +
          '<div class="titulos">' +
            '<div class="titulo">' + esc_(titulo) + '</div>' +
            '<div class="subtitulo">' + esc_(subtitulo) + '</div>' +
          '</div>' +
          '<div class="cabecalho-espaco"></div>' +
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
        'html,body{margin:0;padding:0;width:100%;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}' +
        '.pagina{width:100%;min-height:196mm;display:grid;grid-template-columns:1.03fr .97fr;gap:2mm;page-break-after:always;break-after:page;align-items:start}' +
        '.pagina:last-child{page-break-after:auto;break-after:auto}' +
        '.bloco{min-width:0;break-inside:avoid;page-break-inside:avoid}' +
        '.cabecalho{display:flex!important;align-items:center!important;width:100%!important;min-height:14mm!important;padding:0 0 1.4mm!important;border-bottom:1px solid #222!important;margin:0 0 1mm!important;visibility:visible!important}' +
        '.logo-box,.cabecalho-espaco{width:24mm;min-width:24mm;display:flex;align-items:center}' +
        '.logo-box{justify-content:flex-start}' +
        '.cabecalho-espaco{justify-content:flex-end}' +
        '.cabecalho img{display:block!important;width:auto!important;max-width:23mm!important;max-height:10.5mm!important;object-fit:contain!important;visibility:visible!important}' +
        '.titulos{flex:1;min-width:0;text-align:center!important;visibility:visible!important}' +
        '.titulo{font-size:11.5pt!important;font-weight:800!important;line-height:1.05!important;white-space:nowrap!important;visibility:visible!important}' +
        '.subtitulo{margin-top:1mm!important;font-size:7.8pt!important;font-weight:700!important;line-height:1!important;white-space:nowrap!important;visibility:visible!important}' +
        'table{width:100%;border-collapse:collapse;table-layout:fixed}' +
        'thead{display:table-header-group}' +
        'th,td{border:1px solid #45515c;text-align:center;vertical-align:middle;word-break:normal;overflow-wrap:anywhere}' +
        'th{background:#e9eef2;font-size:6.5pt;font-weight:800;line-height:1.05;padding:.9mm .3mm}' +
        'td{font-size:8.6pt;font-weight:600;line-height:1.02;padding:1.0mm .3mm;height:6.3mm}' +
        'td.prioridade{white-space:nowrap!important;word-break:keep-all!important;overflow-wrap:normal!important;font-size:8pt!important;padding-left:.2mm!important;padding-right:.2mm!important}' +
        '.urgente td{background:#fff2f2}' +
        '.urgente td.prioridade{color:#b91c1c;font-weight:900!important}' +
        '.esquerda th:nth-child(1),.esquerda td:nth-child(1){width:11%}' +
        '.esquerda th:nth-child(2),.esquerda td:nth-child(2){width:10%}' +
        '.esquerda th:nth-child(3),.esquerda td:nth-child(3){width:8%}' +
        '.esquerda th:nth-child(4),.esquerda td:nth-child(4){width:9%}' +
        '.esquerda th:nth-child(5),.esquerda td:nth-child(5){width:21%}' +
        '.esquerda th:nth-child(6),.esquerda td:nth-child(6){width:8%}' +
        '.esquerda th:nth-child(7),.esquerda td:nth-child(7){width:17%}' +
        '.esquerda th:nth-child(8),.esquerda td:nth-child(8){width:7%}' +
        '.esquerda th:nth-child(9),.esquerda td:nth-child(9){width:9%}' +
        '.direita th:nth-child(1),.direita td:nth-child(1){width:13%}' +
        '.direita th:nth-child(2),.direita td:nth-child(2){width:13%}' +
        '.direita th:nth-child(3),.direita td:nth-child(3){width:10%}' +
        '.direita th:nth-child(4),.direita td:nth-child(4){width:29%}' +
        '.direita th:nth-child(5),.direita td:nth-child(5){width:10%}' +
        '.direita th:nth-child(6),.direita td:nth-child(6){width:18%}' +
        '.direita th:nth-child(7),.direita td:nth-child(7){width:7%}' +
        '@media print{' +
          'html,body{width:297mm!important;min-height:210mm!important}' +
          '.pagina{width:287mm!important;min-height:200mm!important;break-inside:avoid!important;page-break-inside:avoid!important}' +
          '.cabecalho,.titulo,.subtitulo,.cabecalho img{visibility:visible!important;opacity:1!important}' +
        '}' +
      '</style></head><body>' + paginas + '</body></html>';
  }

  function aguardarImagens_(doc) {
    const imagens = Array.from(doc.images || []);
    const pendentes = imagens.filter(img => !img.complete);

    if (!pendentes.length) return Promise.resolve();

    return new Promise(resolve => {
      let restantes = pendentes.length;
      let finalizado = false;

      const concluir = () => {
        restantes -= 1;
        if (restantes <= 0 && !finalizado) {
          finalizado = true;
          resolve();
        }
      };

      pendentes.forEach(img => {
        img.addEventListener('load', concluir, { once: true });
        img.addEventListener('error', concluir, { once: true });
      });

      setTimeout(() => {
        if (!finalizado) {
          finalizado = true;
          resolve();
        }
      }, 1800);
    });
  }

  window.imprimirProgramacaoSgq = async function () {
    if (!(window.programacaoSgqRows || []).length) {
      alert('Não existem OPs na programação para imprimir.');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-12000px';
    iframe.style.top = '0';
    iframe.style.width = '1123px';
    iframe.style.height = '794px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(montarHtml_());
    doc.close();

    try {
      await aguardarImagens_(doc);

      if (doc.fonts && doc.fonts.ready) {
        try { await doc.fonts.ready; } catch (e) {}
      }

      await new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(() => iframe.remove(), 2500);
    }
  };
})();