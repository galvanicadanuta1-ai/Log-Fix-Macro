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
   COLAGEM UNIVERSAL EM GRADE - ESTILO EXCEL / GOOGLE SHEETS
   ============================================================
   Esta rotina é global e trabalha com qualquer campo de grade que tenha:
   data-row-id e data-col-index.

   Regras:
   - mantém linhas e colunas exatamente como copiadas;
   - preserva células vazias no meio da seleção;
   - entende TAB, CRLF e células do Excel entre aspas;
   - cola várias linhas de uma única vez;
   - pula automaticamente campos protegidos/calculados quando a origem
     contém apenas as colunas editáveis;
   - aceita também uma cópia da linha completa com Data;
   - salva tudo em lote no servidor.
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
      if (char === '\r' && proximo === '\n') {
        i++;
      }

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

function montarPlanoColagem(matriz, startCol, cfg) {
  const totalOrigem = obterQuantidadeColunasMatriz(matriz);
  let sourceStart = 0;

  if (
    startCol > 0 &&
    totalOrigem === cfg.headers.length &&
    primeiraColunaPareceData(matriz)
  ) {
    sourceStart = 1;
  }

  const colunasOrigem = Math.max(totalOrigem - sourceStart, 0);
  const colunasVisiveis = [];
  const colunasEditaveis = [];

  for (let col = startCol; col < cfg.headers.length; col++) {
    colunasVisiveis.push(col);

    if (!colunaProtegidaParaColagem(col, cfg)) {
      colunasEditaveis.push(col);
    }
  }

  let modo = 'editaveis';

  if (colunasOrigem === colunasVisiveis.length) {
    modo = 'posicional';
  } else if (colunasOrigem <= colunasEditaveis.length) {
    modo = 'editaveis';
  } else {
    modo = 'posicional';
  }

  return {
    sourceStart,
    modo,
    colunasVisiveis,
    colunasEditaveis
  };
}

function aplicarMatrizNaGrade(matriz, rowId, colIndex) {
  const startRowIndex = rows.findIndex(item => item.id === rowId);
  if (startRowIndex < 0 || !matriz.length) {
    return { afetadas: [], ultimaCelula: null };
  }

  const cfg = getPageConfig();
  const plano = montarPlanoColagem(matriz, colIndex, cfg);
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

    for (
      let sourceCol = plano.sourceStart;
      sourceCol < valoresOrigem.length;
      sourceCol++
    ) {
      const offset = sourceCol - plano.sourceStart;
      let targetCol;

      if (plano.modo === 'editaveis') {
        targetCol = plano.colunasEditaveis[offset];
      } else {
        targetCol = colIndex + offset;
      }

      if (
        targetCol === undefined ||
        targetCol < 0 ||
        targetCol >= cfg.headers.length
      ) {
        continue;
      }

      if (colunaProtegidaParaColagem(targetCol, cfg)) {
        continue;
      }

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

async function salvarColagemUniversal(afetadas) {
  if (!afetadas.length) return;

  salvamentoEmLote = true;

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

  const texto = event.clipboardData
    ? event.clipboardData.getData('text/plain')
    : '';

  if (!texto) return;

  const matriz = parseClipboardComoTabela(texto);
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

  renderTable();
  focarCelulaDepoisDaColagem(resultado.ultimaCelula);
  salvarColagemUniversal(resultado.afetadas);
}

document.addEventListener('paste', colagemUniversalPlanilha, true);
