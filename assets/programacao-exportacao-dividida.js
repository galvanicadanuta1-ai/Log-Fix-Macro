/* ============================================================
   EXPORTAÇÃO DA PROGRAMAÇÃO DIVIDIDA
   ============================================================
   Espelha a folha impressa:
   - esquerda: Caixas > 1 ou Contêiner >= 1;
   - direita: todas as OPs com exatamente 1 caixa;
   - bloco da direita sem coluna Contêiner;
   - Urgentes no topo de cada bloco;
   - depois, data mais antiga para a mais nova;
   - cabeçalhos repetidos em todas as páginas do PDF.
   ============================================================ */

(function () {
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
      'OK',
      'Enc.'
    ];
  }

  function linhaPrincipal_(item) {
    return [
      item.dataEntrada || '',
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
      item.dataEntrada || '',
      item.op || '',
      item.qtdCaixas || '',
      item.cor || '',
      item.pesoDanuta || '',
      item.status || '',
      item.ok ? 'SIM' : '',
      item.encaminhado ? 'SIM' : ''
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
      dados: programacaoSgqRows.map(linhaPrincipal_)
    };
  };

  function criarPlanilha_(titulo, subtitulo, headers, rows, larguras) {
    const aoa = [
      [titulo],
      [subtitulo],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const ultimaColuna = Math.max(headers.length - 1, 0);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColuna } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaColuna } }
    ];

    ws['!cols'] = (larguras || headers.map(() => 12)).map(wch => ({ wch }));

    return ws;
  }

  window.exportarProgramacaoSgqExcel = async function () {
    try {
      if (!programacaoSgqRows.length) {
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
          [12, 11, 9, 10, 22, 9, 12, 6, 7]
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
          [12, 11, 9, 24, 9, 12, 6, 7]
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text(subtitulo, x + largura / 2, 12.5, { align: 'center' });
  }

  function estilosColunasPrincipal_() {
    return {
      0: { cellWidth: 17 },
      1: { cellWidth: 15 },
      2: { cellWidth: 10 },
      3: { cellWidth: 10 },
      4: { cellWidth: 31 },
      5: { cellWidth: 12 },
      6: { cellWidth: 21 },
      7: { cellWidth: 9 },
      8: { cellWidth: 11 }
    };
  }

  function estilosColunasUmaCaixa_() {
    return {
      0: { cellWidth: 17 },
      1: { cellWidth: 16 },
      2: { cellWidth: 11 },
      3: { cellWidth: 37 },
      4: { cellWidth: 13 },
      5: { cellWidth: 22 },
      6: { cellWidth: 9 },
      7: { cellWidth: 11 }
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
      tableWidth: 'wrap',
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
        fontSize: 9.4,
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
        ? estilosColunasUmaCaixa_()
        : estilosColunasPrincipal_(),
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
    const gap = 4;
    const larguraPainel = (pageWidth - (margem * 2) - gap) / 2;
    const xEsquerdo = margem;
    const xDireito = margem + larguraPainel + gap;
    const porPagina = 17;
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

      /* Cabeçalhos completos são desenhados em TODAS as páginas. */
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

      doc.setDrawColor(150, 150, 150);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(pageWidth / 2, 2.5, pageWidth / 2, 206);
      doc.setLineDashPattern([], 0);

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
    if (!programacaoSgqRows.length) {
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

      /* Drive permanece silencioso e em segundo plano. */
      salvarPdfNoDrive_(nomeArquivo, pdfBlob);
    } catch (error) {
      alert(error.message || 'Não foi possível gerar o relatório da programação.');
    }
  };
})();
