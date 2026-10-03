/* ============================================================
   STATUS / LOADING
   ============================================================ */
function setLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  document.getElementById('grid').style.display = show ? 'none' : 'table';
}

function setStatus(text, state) {
  const status = document.getElementById('statusbar');
  status.textContent = text;
  status.className = 'statusbar';
  if (state) status.classList.add(state);
}


/* ============================================================
   COLAGEM UNIVERSAL - EXCEL / GOOGLE SHEETS / E-MAIL / HTML
   ============================================================
   A colagem segue a MESMA POSIÇÃO visual das colunas.

   Exemplo no Recebimento, clicando em OP:
   OP | Caixas | Contêiner | Peso NF | Peso Danuta | Diferença |
   Diferença % | Cor | NF | NF Caixa | Processo

   Diferença e Diferença % continuam sendo calculadas pelo sistema,
   mas ocupam sua posição na matriz copiada. Assim, as colunas seguintes
   não são deslocadas.
   ============================================================ */

function parseClipboardComoTabela(texto) {
  const resultado = [];
  let linha = [];
  let celula = '';
  let entreAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const proximo = i + 1 < texto.length ? texto[i + 1] : '';

    if (char === '"') {
      if (entreAspas && proximo === '"') {
        celula += '"';
        i++;
        continue;
      }
      entreAspas = !entreAspas;
      continue;
    }

    if (!entreAspas && char === '\t') {
      linha.push(celula);
      celula = '';
      continue;
    }

    if (!entreAspas && (char === '\n' || char === '\r')) {
      if (char === '\r' && proximo === '\n') i++;
      linha.push(celula);
      resultado.push(linha);
      linha = [];
      celula = '';
      continue;
    }

    celula += char;
  }

  linha.push(celula);
  resultado.push(linha);

  if (
    resultado.length > 1 &&
    resultado[resultado.length - 1].every(valor => valor === '') &&
    /(?:\r\n|\r|\n)$/.test(texto)
  ) {
    resultado.pop();
  }

  return resultado;
}


function textoCelulaHtml(celula) {
  const clone = celula.cloneNode(true);

  clone.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });

  return String(clone.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}


function parseClipboardHtmlComoTabela(html) {
  if (!html || !/<table[\s>]/i.test(html)) return [];

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return [];

    const matriz = [];
    const ocupadas = [];
    const trs = Array.from(table.querySelectorAll('tr'));

    trs.forEach((tr, rowIndex) => {
      if (!matriz[rowIndex]) matriz[rowIndex] = [];
      if (!ocupadas[rowIndex]) ocupadas[rowIndex] = [];

      let colIndex = 0;
      const cells = Array.from(tr.children).filter(el =>
        /^(TD|TH)$/i.test(el.tagName)
      );

      cells.forEach(cell => {
        while (ocupadas[rowIndex][colIndex]) colIndex++;

        const valor = textoCelulaHtml(cell);
        const colspan = Math.max(Number(cell.getAttribute('colspan')) || 1, 1);
        const rowspan = Math.max(Number(cell.getAttribute('rowspan')) || 1, 1);

        for (let r = 0; r < rowspan; r++) {
          const rr = rowIndex + r;
          if (!matriz[rr]) matriz[rr] = [];
          if (!ocupadas[rr]) ocupadas[rr] = [];

          for (let c = 0; c < colspan; c++) {
            const cc = colIndex + c;
            matriz[rr][cc] = (r === 0 && c === 0) ? valor : '';
            ocupadas[rr][cc] = true;
          }
        }

        colIndex += colspan;
      });
    });

    const largura = matriz.reduce(
      (max, linha) => Math.max(max, Array.isArray(linha) ? linha.length : 0),
      0
    );

    return matriz
      .map(linha => {
        const normalizada = new Array(largura).fill('');
        (linha || []).forEach((valor, i) => {
          normalizada[i] = valor == null ? '' : String(valor);
        });
        return normalizada;
      })
      .filter(linha => linha.some(valor => String(valor).trim() !== ''));
  } catch (e) {
    return [];
  }
}


function obterMatrizClipboard(event) {
  if (!event.clipboardData) return [];

  const html = event.clipboardData.getData('text/html') || '';
  const texto = event.clipboardData.getData('text/plain') || '';

  const matrizHtml = parseClipboardHtmlComoTabela(html);

  // E-mail normalmente entrega uma tabela HTML correta, mesmo quando
  // o texto puro transforma cada célula em uma linha separada.
  if (
    matrizHtml.length &&
    matrizHtml.some(linha => linha.length > 1)
  ) {
    return matrizHtml;
  }

  return texto ? parseClipboardComoTabela(texto) : [];
}


function obterQuantidadeColunasMatriz(matriz) {
  return matriz.reduce(
    (maior, linha) => Math.max(maior, Array.isArray(linha) ? linha.length : 0),
    0
  );
}


function pareceDataColada(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return true;

  return (
    /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(texto) ||
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(texto)
  );
}


function primeiraColunaPareceData(matriz) {
  const valores = matriz
    .map(linha => Array.isArray(linha) ? linha[0] : '')
    .filter(valor => String(valor ?? '').trim() !== '');

  if (!valores.length) return false;

  const datas = valores.filter(pareceDataColada).length;
  return datas / valores.length >= 0.8;
}


function colunaProtegidaParaColagem(colIndex, cfg) {
  if (colIndex === 0) return true;

  if (currentPage === 'RECEBIMENTO') {
    const header = cfg.headers[colIndex];
    return header === 'Diferença' || header === 'Diferença em %';
  }

  return false;
}


function aplicarMatrizNaGrade(matriz, rowId, colIndex) {
  const startRowIndex = rows.findIndex(item => item.id === rowId);

  if (startRowIndex < 0 || !matriz.length) {
    return { afetadas: [], ultimaCelula: null };
  }

  const cfg = getPageConfig();
  const totalOrigem = obterQuantidadeColunasMatriz(matriz);

  // Se o usuário copiou a linha completa incluindo Data, mas colou em OP,
  // ignoramos somente a Data. O restante continua 100% posicional.
  const sourceStart = (
    colIndex > 0 &&
    totalOrigem === cfg.headers.length &&
    primeiraColunaPareceData(matriz)
  ) ? 1 : 0;

  const linhasNecessarias = startRowIndex + matriz.length;

  while (rows.length < linhasNecessarias + 2) {
    rows.push(criarLinhaVazia());
  }

  const afetadas = [];
  let ultimaCelula = null;

  matriz.forEach((linhaOrigem, rowOffset) => {
    const row = rows[startRowIndex + rowOffset];
    if (!row) return;

    const valoresOrigem = Array.isArray(linhaOrigem) ? linhaOrigem : [];
    let houveAlvo = false;

    for (let sourceCol = sourceStart; sourceCol < valoresOrigem.length; sourceCol++) {
      const offset = sourceCol - sourceStart;
      const targetCol = colIndex + offset;

      if (targetCol < 0 || targetCol >= cfg.headers.length) continue;

      // Importante: mesmo protegida, a coluna consome sua posição.
      // Isso evita que Cor/NF/etc. "andem" para a esquerda.
      if (colunaProtegidaParaColagem(targetCol, cfg)) continue;

      const valor = valoresOrigem[sourceCol] ?? '';
      row.values[targetCol] = valor;
      houveAlvo = true;

      ultimaCelula = {
        rowId: row.id,
        colIndex: targetCol
      };

      if (
        currentPage === 'RECEBIMENTO' &&
        cfg.headers[targetCol] === 'Cor'
      ) {
        adicionarCorLocal(valor);
      }
    }

    if (houveAlvo) {
      if (currentPage === 'RECEBIMENTO') {
        recalcularRecebimentoModelo(row);
      }

      afetadas.push(row);
    }
  });

  garantirDuasLinhasVazias();
  return { afetadas, ultimaCelula };
}


function atualizarCamposVisiveisDaColagem(afetadas) {
  afetadas.forEach(row => {
    const tr = document.querySelector('tr[data-row-id="' + row.id + '"]');
    if (!tr) return;

    const inputs = tr.querySelectorAll('.cell-input');

    row.values.forEach((valor, colIndex) => {
      if (!inputs[colIndex] || colIndex === 0) return;
      inputs[colIndex].value = valor ?? '';
    });

    if (linhaSemDados(row)) {
      tr.classList.add('blank-row');
    } else {
      tr.classList.remove('blank-row');
    }
  });
}


async function salvarColagemUniversal(afetadas) {
  if (!afetadas.length) return;

  // Bloqueia salvamentos individuais disparados pelo blur enquanto
  // o lote está sendo enviado.
  salvamentoEmLote = true;
  afetadas.forEach(row => {
    row.saving = true;
  });

  const reportButton = document.getElementById('reportButton');
  if (reportButton) {
    reportButton.disabled = true;
    reportButton.textContent = 'SALVANDO DADOS...';
  }

  setStatus(
    afetadas.length === 1
      ? 'Salvando linha colada...'
      : 'Salvando ' + afetadas.length + ' linhas coladas...',
    'saving'
  );

  const date = document.getElementById('selectedDate').value || hojeISO();
  const paraSalvar = afetadas.filter(row => !linhaSemDados(row));
  const paraLimpar = afetadas.filter(row => linhaSemDados(row) && row.sheetRow);

  try {
    let salvas = [];

    if (paraSalvar.length) {
      const payload = paraSalvar.map(row => ({
        clientId: row.id,
        sheetRow: row.sheetRow,
        values: row.values.slice()
      }));

      const result = await chamarApiAppsScript(
        'salvarLinhasEmLote',
        [currentPage, date, payload]
      );

      salvas = result && Array.isArray(result.rows)
        ? result.rows
        : [];

      salvas.forEach(item => {
        const row = rows.find(r => r.id === item.clientId);
        if (!row) return;

        row.sheetRow = item.sheetRow;

        if (Array.isArray(item.values)) {
          row.values = item.values.slice();
        }
      });
    }

    for (const row of paraLimpar) {
      await chamarApiAppsScript(
        'limparLinha',
        [currentPage, row.sheetRow]
      );
    }

    garantirDuasLinhasVazias();

    // As linhas continuam marcadas como saving durante o render.
    // Assim, o blur do campo removido não cria uma segunda gravação.
    renderTable();

    if (currentPage === 'RECEBIMENTO') {
      carregarSugestoesCores();
    }

    const quantidade = paraSalvar.length + paraLimpar.length;

    setStatus(
      quantidade +
      (quantidade === 1 ? ' linha salva' : ' linhas salvas') +
      ' • Histórico e Conciliação atualizados',
      'saved'
    );
  } catch (error) {
    setStatus(
      error.message || 'Erro ao salvar os dados colados.',
      'error'
    );

    alert(
      error.message ||
      'Não foi possível salvar todos os dados colados.'
    );
  } finally {
    afetadas.forEach(row => {
      row.saving = false;
    });

    salvamentoEmLote = false;

    if (reportButton) {
      reportButton.disabled = false;
      reportButton.textContent = 'GERAR RELATÓRIO';
    }
  }
}


function focarCelulaDepoisDaColagem(ultimaCelula) {
  if (!ultimaCelula) return;

  requestAnimationFrame(() => {
    const seletor =
      '[data-row-id="' + CSS.escape(String(ultimaCelula.rowId)) + '"]' +
      '[data-col-index="' + Number(ultimaCelula.colIndex) + '"]';

    const campo = document.querySelector(seletor);
    if (!campo || typeof campo.focus !== 'function') return;

    campo.focus();

    if (typeof campo.select === 'function') {
      campo.select();
    }
  });
}


function colagemUniversalPlanilha(event) {
  const alvo = event.target;

  if (!(alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement)) {
    return;
  }

  if (
    !alvo.dataset ||
    !alvo.dataset.rowId ||
    alvo.dataset.colIndex === undefined
  ) {
    return;
  }

  if (alvo.readOnly || alvo.disabled) return;

  const matriz = obterMatrizClipboard(event);
  if (!matriz.length) return;

  const quantidadeColunas = obterQuantidadeColunasMatriz(matriz);

  if (matriz.length === 1 && quantidadeColunas === 1) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  cancelarTimers();

  const rowId = alvo.dataset.rowId;
  const colIndex = Number(alvo.dataset.colIndex);

  const resultado = aplicarMatrizNaGrade(
    matriz,
    rowId,
    colIndex
  );

  if (!resultado.afetadas.length) return;

  // Marca ANTES de trocar foco para impedir um salvarAgora() concorrente.
  salvamentoEmLote = true;
  resultado.afetadas.forEach(row => {
    row.saving = true;
  });

  atualizarCamposVisiveisDaColagem(resultado.afetadas);
  focarCelulaDepoisDaColagem(resultado.ultimaCelula);
  salvarColagemUniversal(resultado.afetadas);
}


document.addEventListener('paste', colagemUniversalPlanilha, true);
