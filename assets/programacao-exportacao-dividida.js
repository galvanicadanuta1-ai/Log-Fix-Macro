/* ============================================================
   EXPORTAÇÃO DA PROGRAMAÇÃO DIVIDIDA
   ============================================================
   - esquerda: programação principal;
   - direita: OPs de 1 caixa;
   - direita sem Contêiner e sem Enc.;
   - Urgentes no topo e depois data;
   - PDF em paisagem com dois blocos equilibrados.
   ============================================================ */

(function () {
  function dataCurta_(valor) {
    if (typeof formatarDataCurtaProgramacao_ === 'function') {
      return formatarDataCurtaProgramacao_(valor);
    }
    return valor || '';
  }

  function headersPrincipal_() {
    return [
      'Data Entrada',
      'OP',
      'Qtd. Caixas',
      'Qtd. Contêiner',
      'Cor',
      'Kgs',
      'Status',
      'OK',
      'Enc.'
    ];
  }

  function headersUmaCaixa_() {
    return [
      'Data Entrada',
      'OP',
      'Qtd. Caixas',
      'Cor',
      'Kgs',
      'Status',
      'OK'
    ];
  }

  function linhaPrincipal_(item) {
    return [
      dataCurta_(item.dataEntrada),
      item.op || '',
      item.qtdCaixas || '',
      item.qtdConteiner || '',
      item.cor || '',
      item.pesoDanuta || '',
      item.status || '',
      item.ok ? 'SIM' : '',
      item.encaminhado ? 'SIM' : ''
    ];
  }

  function linhaUmaCaixa_(item) {
    return [
      dataCurta_(item.dataEntrada),
      item.op || '',
      item.qtdCaixas || '',
      item.cor || '',
      item.pesoDanuta || '',
      item.status || '',
      item.ok ? 'SIM' : ''
    ];
  }

  function grupos_() {
    if (typeof separarProgramacaoSgqRows_ !== 'function') {
      return { principal: [], umaCaixa: [] };
    }

    const grupos = separarProgramacaoSgqRows_();
    return {
      principal: (grupos.principal || []).slice(),
      umaCaixa: (grupos.umaCaixa || []).slice()
    };
  }

  window.dadosProgramacaoParaExportar_ = function () {
    const grupos = grupos_();

    return {
      headers: headersPrincipal_(),
      headersPrincipal: headersPrincipal_(),
      headersUmaCaixa: headersUmaCaixa_(),
      principal: grupos.principal.map(linhaPrincipal_),
      umaCaixa: grupos.umaCaixa.map(linhaUmaCaixa_),
      dados: (programacaoSgqRows || []).map(linhaPrincipal_)
    };
  };

  function criarPlanilha_(titulo, subtitulo, headers, rows, larguras) {
    const aoa = [[titulo], [subtitulo], [], headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const ultimaColuna = Math.max(headers.length - 1, 0);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColuna } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaColuna } }
    ];

    ws['!cols'] = larguras.map(wch => ({ wch }));
    return ws;
  }

  window.exportarProgramacaoSgqExcel = async function () {
    try {
      if (!(programacaoSgqRows || []).length) {
        throw new Error('Não existem OPs na programação para exportar.');
      }

      verificarXlsx_();

      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const turno = typeof obterTurnoProgramacaoSgq === 'function'
        ? obterTurnoProgramacaoSgq()
        : 'Turno Dia';

      const nomeArquivo = normalizarNomeArquivo_(
        'Programação SGQ - Fixpar - ' + turno + ' - ' + dataHoje.replace(/\//g, '-'),
        'xlsx'
      );

      const destino = await escolherDestinoArquivo_(
        nomeArquivo,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xlsx',
        'Planilha Excel'
      );

      if (destino.cancelado) return;

      const dados = dadosProgramacaoParaExportar_();
      const wb = XLSX.utils.book_new();
      const subtitulo = turno + ' • ' + dataHoje;

      XLSX.utils.book_append_sheet(
        wb,
        criarPlanilha_(
          'Programação SGQ - Fixpar',
          subtitulo,
          dados.headersPrincipal,
          dados.principal,
          [11, 11, 8, 9, 24, 9, 13, 6, 7]
        ),
        'Programação'
      );

      XLSX.utils.book_append_sheet(
        wb,
        criarPlanilha_(
          'OPs de 1 caixa',
          subtitulo,
          dados.headersUmaCaixa,
          dados.umaCaixa,
          [11, 12, 8, 28, 9, 14, 6]
        ),
        'OPs 1 caixa'
      );

      const array = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
        compression: true
      });

      const blob = new Blob(
        [array],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      await salvarBlobDestino_(destino, blob, nomeArquivo);
    } catch (error) {
      alert(error.message || 'Não foi possível exportar a programação.');
    }
  };

  async function carregarLogo_() {
    const url = 'https://raw.githubusercontent.com/galvanicadanuta1-ai/canhoto-digital/main/logo.png';

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();

      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  }

  function desenharCabecalhoPainel_(doc, x, largura, titulo, subtitulo, logo) {
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', x + 1, 3.5, 18, 8);
      } catch (e) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.2);
    doc.text(titulo, x + largura / 2, 7.8, { align: 'center' });

    doc.setFontSize(7.8);
    doc.text(subtitulo, x + largura / 2, 12.5, { align: 'center' });
  }

  function estilosPrincipal_() {
    return {
      0: { cellWidth: 16 },
      1: { cellWidth: 15 },
      2: { cellWidth: 10 },
      3: { cellWidth: 11 },
      4: { cellWidth: 30 },
      5: { cellWidth: 11 },
      6: { cellWidth: 20 },
      7: { cellWidth: 8 },
      8: { cellWidth: 10 }
    };
  }

  function estilosUmaCaixa_() {
    return {
      0: { cellWidth: 16 },
      1: { cellWidth: 17 },
      2: { cellWidth: 11 },
      3: { cellWidth: 44 },
      4: { cellWidth: 13 },
      5: { cellWidth: 25 },
      6: { cellWidth: 9 }
    };
  }

  function desenharTabelaPainel_(doc, x, largura, headers, rows, tipo) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const statusIndex = tipo === 'umaCaixa' ? 5 : 6;

    doc.autoTable({
      startY: 15.5,
      head: [headers],
      body: rows,
      theme: 'grid',
      tableWidth: largura - 1,
      margin: {
        left: x,
        right: Math.max(pageWidth - x - largura, 0),
        bottom: 4
      },
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      styles: {
        font: 'helvetica',
        fontSize: 9.2,
        cellPadding: 1.0,
        valign: 'middle',
        halign: 'center',
        lineWidth: 0.12,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [233, 238, 242],
        textColor: [17, 24, 39],
        fontStyle: 'bold',
        fontSize: 6.9,
        cellPadding: .8
      },
      columnStyles: tipo === 'umaCaixa'
        ? estilosUmaCaixa_()
        : estilosPrincipal_(),
      didParseCell: data => {
        if (data.section !== 'body') return;

        const status = rows[data.row.index] && rows[data.row.index][statusIndex]
          ? String(rows[data.row.index][statusIndex]).trim().toLowerCase()
          : '';

        if (status === 'urgente') {
          data.cell.styles.fillColor = [255, 244, 244];

          if (data.column.index === statusIndex) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  async function criarPdfProgramacaoDividida_() {
    const JsPdf = obterJsPdf_();
    const doc = new JsPdf({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const dados = dadosProgramacaoParaExportar_();
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const turno = typeof obterTurnoProgramacaoSgq === 'function'
      ? obterTurnoProgramacaoSgq()
      : 'Turno Dia';
    const subtitulo = turno + ' • ' + dataHoje;
    const logo = await carregarLogo_();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margem = 4;
    const gap = 3;
    const larguraPainel = (pageWidth - (margem * 2) - gap) / 2;
    const xEsquerdo = margem;
    const xDireito = margem + larguraPainel + gap;
    const porPagina = 18;
    const totalPaginas = Math.max(
      1,
      Math.ceil(dados.principal.length / porPagina),
      Math.ceil(dados.umaCaixa.length / porPagina)
    );

    for (let pagina = 0; pagina < totalPaginas; pagina++) {
      if (pagina > 0) doc.addPage('a4', 'landscape');

      const inicio = pagina * porPagina;
      const esquerda = dados.principal.slice(inicio, inicio + porPagina);
      const direita = dados.umaCaixa.slice(inicio, inicio + porPagina);

      desenharCabecalhoPainel_(
        doc,
        xEsquerdo,
        larguraPainel,
        'Programação SGQ - Fixpar',
        subtitulo,
        logo
      );

      desenharCabecalhoPainel_(
        doc,
        xDireito,
        larguraPainel,
        'OPs de 1 caixa',
        subtitulo,
        logo
      );

      desenharTabelaPainel_(
        doc,
        xEsquerdo,
        larguraPainel,
        dados.headersPrincipal,
        esquerda,
        'principal'
      );

      desenharTabelaPainel_(
        doc,
        xDireito,
        larguraPainel,
        dados.headersUmaCaixa,
        direita,
        'umaCaixa'
      );
    }

    return doc.output('blob');
  }

  window.gerarRelatorioProgramacaoSgq = async function () {
    if (!(programacaoSgqRows || []).length) {
      alert('Não existem OPs na programação para gerar o relatório.');
      return;
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const turno = typeof obterTurnoProgramacaoSgq === 'function'
      ? obterTurnoProgramacaoSgq()
      : 'Turno Dia';

    const nomeArquivo = normalizarNomeArquivo_(
      'Programação SGQ - Fixpar - ' + turno + ' - ' + dataHoje.replace(/\//g, '-'),
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
      const pdfBlob = await criarPdfProgramacaoDividida_();
      await salvarBlobDestino_(destino, pdfBlob, nomeArquivo);
      salvarPdfNoDrive_(nomeArquivo, pdfBlob);
    } catch (error) {
      alert(error.message || 'Não foi possível gerar o relatório da programação.');
    }
  };
})();
