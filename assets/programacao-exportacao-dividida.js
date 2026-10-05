/* ============================================================
   EXPORTAÇÃO DA PROGRAMAÇÃO DIVIDIDA
   ============================================================
   Espelha a folha impressa:
   - esquerda: Caixas > 1 ou Contêiner >= 1;
   - direita: todas as OPs com exatamente 1 caixa;
   - Urgentes no topo de cada bloco;
   - depois, data mais antiga para a mais nova.
   ============================================================ */

(function () {
  function headers_() {
    return [
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
  }

  function linhaExportacao_(item) {
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
      headers: headers_(),
      principal: grupos.principal.map(linhaExportacao_),
      umaCaixa: grupos.umaCaixa.map(linhaExportacao_),
      dados: programacaoSgqRows.map(linhaExportacao_)
    };
  };

  function criarPlanilha_(titulo, subtitulo, headers, rows) {
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

    ws['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 11 },
      { wch: 13 },
      { wch: 15 },
      { wch: 13 },
      { wch: 7 },
      { wch: 13 }
    ];

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
          dados.headers,
          dados.principal
        ),
        'Programação'
      );

      XLSX.utils.book_append_sheet(
        wb,
        criarPlanilha_(
          'OPs de 1 caixa',
          subtitulo,
          dados.headers,
          dados.umaCaixa
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
        doc.addImage(logo, 'PNG', x + 1, 4, 18, 8);
      } catch (e) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(titulo, x + largura / 2, 8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(subtitulo, x + largura / 2, 13, { align: 'center' });
  }

  function desenharTabelaPainel_(doc, x, largura, headers, rows) {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.autoTable({
      startY: 17,
      head: [headers],
      body: rows,
      theme: 'grid',
      tableWidth: 130,
      margin: {
        left: x,
        right: Math.max(pageWidth - x - largura, 0),
        bottom: 5
      },
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 8.6,
        cellPadding: 1.15,
        valign: 'middle',
        halign: 'center',
        lineWidth: 0.12,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [233, 238, 242],
        textColor: [17, 24, 39],
        fontStyle: 'bold',
        fontSize: 7.2,
        cellPadding: 1
      },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 17 },
        2: { cellWidth: 10 },
        3: { cellWidth: 11 },
        4: { cellWidth: 14 },
        5: { cellWidth: 14 },
        6: { cellWidth: 18 },
        7: { cellWidth: 8 },
        8: { cellWidth: 22 }
      },
      didParseCell: data => {
        if (data.section !== 'body') return;

        const status = rows[data.row.index] && rows[data.row.index][6]
          ? String(rows[data.row.index][6]).trim().toLowerCase()
          : '';

        if (status === 'urgente') {
          data.cell.styles.fillColor = [255, 244, 244];

          if (data.column.index === 6) {
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
    const margem = 5;
    const gap = 5;
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

      doc.setDrawColor(150, 150, 150);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(pageWidth / 2, 3, pageWidth / 2, 205);
      doc.setLineDashPattern([], 0);

      desenharTabelaPainel_(
        doc,
        xEsquerdo,
        larguraPainel,
        dados.headers,
        esquerda
      );

      desenharTabelaPainel_(
        doc,
        xDireito,
        larguraPainel,
        dados.headers,
        direita
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
