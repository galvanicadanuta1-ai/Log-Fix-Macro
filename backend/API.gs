/**
 * ============================================================
 * API PARA GITHUB PAGES -> GOOGLE APPS SCRIPT
 * ============================================================
 *
 * Adicione este arquivo ao MESMO projeto Apps Script onde já
 * está o Code.gs atual do SGQ Fixpar.
 *
 * NÃO apague o Code.gs atual.
 * ============================================================
 */

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    const method = String(body.method || '').trim();
    const args = Array.isArray(body.args) ? body.args : [];

    const result = executarMetodoApi_(method, args);

    return respostaJsonApi_({
      ok: true,
      result: result === undefined ? null : result
    });

  } catch (error) {
    return respostaJsonApi_({
      ok: false,
      error: error && error.message
        ? error.message
        : String(error)
    });
  }
}

function executarMetodoApi_(method, args) {
  switch (method) {
    case 'carregarDados':
      return carregarDados.apply(null, args);

    case 'salvarLinha':
      return salvarLinha.apply(null, args);

    case 'salvarLinhasEmLote':
      return salvarLinhasEmLote.apply(null, args);

    case 'limparLinha':
      return limparLinha.apply(null, args);

    case 'carregarCores':
      return carregarCores.apply(null, args);

    case 'consultarHistorico':
      return consultarHistorico.apply(null, args);

    case 'consultarHistoricoPaginado':
      return apiConsultarHistoricoPaginado_.apply(null, args);

    case 'buscarSugestoesHistorico':
      return buscarSugestoesHistorico.apply(null, args);

    case 'editarHistorico':
      return editarHistorico.apply(null, args);

    case 'gerarRelatorio':
      return gerarRelatorio.apply(null, args);

    case 'gerarRelatorioHistorico':
      return gerarRelatorioHistorico.apply(null, args);

    default:
      throw new Error('Método da API não permitido: ' + method);
  }
}

function apiConsultarHistoricoPaginado_(
  pageKey,
  dataInicialIso,
  dataFinalIso,
  busca,
  offset,
  limit
) {
  if (typeof consultarHistoricoPaginado === 'function') {
    return consultarHistoricoPaginado(
      pageKey,
      dataInicialIso,
      dataFinalIso,
      busca,
      offset,
      limit
    );
  }

  const resultado = consultarHistorico(
    pageKey,
    dataInicialIso,
    dataFinalIso,
    busca
  );

  const inicio = Math.max(Number(offset || 0), 0);
  const tamanho = Math.min(
    Math.max(Number(limit || 50), 1),
    100
  );
  const fim = inicio + tamanho;

  return {
    rows: resultado.rows.slice(inicio, fim),
    headers: resultado.headers,
    title: resultado.title,
    total: resultado.total,
    offset: inicio,
    nextOffset: fim < resultado.total ? fim : null,
    hasMore: fim < resultado.total
  };
}

function respostaJsonApi_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
