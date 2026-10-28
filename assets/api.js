/**
 * SGQ FIXPAR - CAMADA DE COMUNICAÇÃO HÍBRIDA
 *
 * Leituras rápidas: Cloudflare Worker + D1, com fallback automático.
 * Gravações e relatórios: Apps Script V3, mantendo Sheets, histórico e Drive.
 */

const API_MUTATION_METHODS = new Set([
  'salvarLinha',
  'salvarLinhasEmLote',
  'limparLinha',
  'editarHistorico',
  'editarHistoricoPorSourceRow',
  'finalizarRelatorioRapido',
  'salvarPdfRapidoDrive',
  'salvarProgramacaoSgq'
]);

const D1_READ_METHODS = new Set([
  'carregarDados',
  'consultarHistorico',
  'consultarHistoricoPaginado',
  'buscarSugestoesHistorico',
  'carregarProgramacaoSgq'
]);

let apiMutationQueue_ = Promise.resolve();
let apiBackendV3Promise_ = null;
const d1HistorySourceMap_ = new Map();

function apiTimeoutMs_(method) {
  return API_MUTATION_METHODS.has(String(method || '')) ? 90000 : 45000;
}

function d1ApiConfigurada_() {
  return (
    typeof D1_API_URL === 'string' &&
    /^https:\/\/[^/]+\.workers\.dev\/?$/.test(D1_API_URL)
  );
}

function d1FeatureAtiva_(method) {
  if (!d1ApiConfigurada_() || typeof D1_FEATURES !== 'object' || !D1_FEATURES) {
    return false;
  }

  const nome = String(method || '');
  if (nome === 'carregarDados') return D1_FEATURES.operationalReads === true;
  if (nome === 'carregarProgramacaoSgq') return D1_FEATURES.programacaoReads === true;

  if (
    nome === 'consultarHistorico' ||
    nome === 'consultarHistoricoPaginado' ||
    nome === 'buscarSugestoesHistorico'
  ) {
    return D1_FEATURES.historyReads === true;
  }

  return false;
}

function d1Url_(path, params) {
  const base = String(D1_API_URL || '').replace(/\/+$/, '');
  const url = new URL(base + path);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function d1FetchJson_(path, params) {
  const controller = typeof AbortController !== 'undefined'
    ? new AbortController()
    : null;

  const timeout = setTimeout(() => {
    if (controller) controller.abort();
  }, 12000);

  try {
    const response = await fetch(d1Url_(path, params), {
      method: 'GET',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    });

    const payload = await response.json();

    if (!response.ok || !payload || payload.ok !== true) {
      throw new Error(
        payload && payload.error
          ? payload.error
          : 'Falha HTTP ' + response.status + ' na API D1.'
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function d1DataBr_(iso) {
  const value = String(iso || '').trim();
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : value;
}

function d1Texto_(value) {
  return value === null || value === undefined ? '' : String(value);
}

function d1ValuesOperacional_(row, dataset) {
  if (dataset === 'RECEBIMENTO') {
    return [
      d1DataBr_(row.business_date),
      d1Texto_(row.op),
      row.qtd_caixas ?? '',
      row.qtd_conteiner ?? '',
      row.peso_nf ?? '',
      row.peso ?? '',
      row.diferenca ?? '',
      row.diferenca_pct === null || row.diferenca_pct === undefined
        ? ''
        : d1Texto_(row.diferenca_pct) + '%',
      d1Texto_(row.cor),
      d1Texto_(row.nota_fiscal),
      d1Texto_(row.nota_fiscal_caixa),
      d1Texto_(row.processo)
    ];
  }

  return [
    d1DataBr_(row.business_date),
    d1Texto_(row.op),
    row.qtd_caixas ?? '',
    row.qtd_conteiner ?? '',
    row.peso ?? '',
    d1Texto_(row.nota_fiscal),
    d1Texto_(row.nota_fiscal_caixa),
    d1Texto_(row.anotacao)
  ];
}

function d1RegistrarMapeamentoHistorico_(pageKey, rows) {
  (Array.isArray(rows) ? rows : []).forEach(item => {
    const historyRow = Number(item && item.historyRow || 0);
    const sourceRow = Number(item && item.sourceRow || 0);

    if (historyRow >= 3 && sourceRow >= 3) {
      d1HistorySourceMap_.set(
        String(pageKey || '') + '|' + String(historyRow),
        sourceRow
      );
    }
  });
}

async function executarMetodoD1_(method, args) {
  const nome = String(method || '');
  const lista = Array.isArray(args) ? args : [];

  if (nome === 'carregarDados') {
    const dataset = String(lista[0] || '').toUpperCase();
    const date = String(lista[1] || '');

    const payload = await d1FetchJson_('/api/records', {
      client: 'FIXPAR',
      dataset,
      date,
      limit: 1000
    });

    return {
      rows: (payload.rows || []).map(row => ({
        clientId: row.record_id || '',
        sheetRow: Number(row.sheet_row || 0) || null,
        values: d1ValuesOperacional_(row, dataset)
      })),
      source: 'CLOUDFLARE_D1'
    };
  }

  if (nome === 'consultarHistoricoPaginado') {
    const pageKey = String(lista[0] || '').toUpperCase();
    const payload = await d1FetchJson_('/api/history', {
      client: 'FIXPAR',
      dataset: pageKey,
      start: lista[1],
      end: lista[2],
      q: lista[3],
      offset: Number(lista[4] || 0),
      limit: Number(lista[5] || 60)
    });

    d1RegistrarMapeamentoHistorico_(pageKey, payload.rows);
    return payload;
  }

  if (nome === 'consultarHistorico') {
    const pageKey = String(lista[0] || '').toUpperCase();
    const payload = await d1FetchJson_('/api/history', {
      client: 'FIXPAR',
      dataset: pageKey,
      start: lista[1],
      end: lista[2],
      q: lista[3],
      offset: 0,
      limit: 5000
    });

    d1RegistrarMapeamentoHistorico_(pageKey, payload.rows);
    return payload;
  }

  if (nome === 'buscarSugestoesHistorico') {
    const payload = await d1FetchJson_('/api/suggestions', {
      client: 'FIXPAR',
      dataset: String(lista[0] || '').toUpperCase(),
      start: lista[1],
      end: lista[2],
      q: lista[3]
    });

    return payload.rows || [];
  }

  if (nome === 'carregarProgramacaoSgq') {
    return d1FetchJson_('/api/programacao', {
      client: 'FIXPAR'
    });
  }

  throw new Error('Método D1 não suportado: ' + nome);
}

async function executarFetchApi_(method, args) {
  if (!apiConfigurada()) {
    throw new Error(
      'API do Apps Script ainda não configurada. ' +
      'Edite assets/config.js e informe a URL /exec da implantação.'
    );
  }

  const controller = typeof AbortController !== 'undefined'
    ? new AbortController()
    : null;

  const timeout = setTimeout(() => {
    if (controller) controller.abort();
  }, apiTimeoutMs_(method));

  let response;

  try {
    response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        method,
        args: Array.isArray(args) ? args : []
      })
    });
  } catch (error) {
    clearTimeout(timeout);

    if (error && error.name === 'AbortError') {
      throw new Error(
        'O servidor demorou além do limite para responder. ' +
        'Os dados foram mantidos na tela; tente novamente.'
      );
    }

    throw new Error(
      'Falha de comunicação com o servidor. ' +
      ((error && error.message) ? error.message : '')
    );
  }

  clearTimeout(timeout);

  const responseText = await response.text();
  let payload;

  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    const html = /<\s*!doctype|<\s*html|<\s*body/i.test(responseText || '');
    const status = response && response.status ? ' HTTP ' + response.status + '.' : '';

    console.error('Resposta não JSON da API:', {
      method,
      status: response ? response.status : null,
      preview: String(responseText || '').slice(0, 300)
    });

    throw new Error(
      html
        ? 'O Apps Script retornou uma página de erro em vez de JSON.' + status +
          ' Isso normalmente indica falha ou tempo limite no processamento do servidor.'
        : 'A API respondeu em formato inválido.' + status
    );
  }

  if (!response.ok) {
    throw new Error(
      payload && payload.error
        ? payload.error
        : 'Falha HTTP ' + response.status + ' na API.'
    );
  }

  if (!payload || payload.ok !== true) {
    throw new Error(
      payload && payload.error
        ? payload.error
        : 'Erro desconhecido na API.'
    );
  }

  return payload.result;
}

async function garantirBackendV3_() {
  if (apiBackendV3Promise_) return apiBackendV3Promise_;

  apiBackendV3Promise_ = executarFetchApi_('healthCheck', [])
    .then(result => {
      if (!result || result.api !== 'SGQ_FIXPAR_V3') {
        throw new Error('Backend diferente da versão SGQ_FIXPAR_V3.');
      }
      return result;
    })
    .catch(error => {
      apiBackendV3Promise_ = null;

      throw new Error(
        'A versão segura do servidor ainda não está publicada. ' +
        'Nenhum dado foi gravado. Substitua o API.gs pelo arquivo backend/API.gs atual ' +
        'e publique uma NOVA VERSÃO na mesma implantação /exec. ' +
        ((error && error.message) ? '(' + error.message + ')' : '')
      );
    });

  return apiBackendV3Promise_;
}

function resolverMutacaoHistoricoD1_(method, args) {
  const nome = String(method || '');
  const lista = Array.isArray(args) ? args.slice() : [];

  if (nome !== 'editarHistorico') {
    return { method: nome, args: lista };
  }

  const pageKey = String(lista[0] || '').toUpperCase();
  const historyRow = Number(lista[1] || 0);
  const sourceRow = d1HistorySourceMap_.get(
    pageKey + '|' + String(historyRow)
  );

  if (sourceRow) {
    return {
      method: 'editarHistoricoPorSourceRow',
      args: [pageKey, sourceRow, lista[2]]
    };
  }

  return { method: nome, args: lista };
}

function chamarApiAppsScript(method, args) {
  const nome = String(method || '');

  if (
    D1_READ_METHODS.has(nome) &&
    d1FeatureAtiva_(nome)
  ) {
    return executarMetodoD1_(nome, args)
      .catch(error => {
        console.warn(
          'Leitura D1 indisponível; usando Apps Script como fallback:',
          nome,
          error
        );
        return executarFetchApi_(nome, args);
      });
  }

  if (!API_MUTATION_METHODS.has(nome)) {
    return executarFetchApi_(nome, args);
  }

  const executar = async () => {
    await garantirBackendV3_();

    const resolved = resolverMutacaoHistoricoD1_(nome, args);
    return executarFetchApi_(resolved.method, resolved.args);
  };

  const promise = apiMutationQueue_.then(executar, executar);
  apiMutationQueue_ = promise.catch(() => undefined);
  return promise;
}

function criarRunnerAppsScript(successHandler, failureHandler) {
  return new Proxy({}, {
    get(target, prop) {
      if (prop === 'withSuccessHandler') {
        return handler => criarRunnerAppsScript(handler, failureHandler);
      }

      if (prop === 'withFailureHandler') {
        return handler => criarRunnerAppsScript(successHandler, handler);
      }

      if (prop === 'then') return undefined;

      return (...args) => {
        chamarApiAppsScript(String(prop), args)
          .then(result => {
            if (typeof successHandler === 'function') {
              successHandler(result);
            }
          })
          .catch(error => {
            if (typeof failureHandler === 'function') {
              failureHandler(error);
            } else {
              console.error(error);
              alert(error.message || 'Erro ao comunicar com o servidor.');
            }
          });
      };
    }
  });
}

window.google = window.google || {};
window.google.script = window.google.script || {};

Object.defineProperty(window.google.script, 'run', {
  configurable: false,
  enumerable: true,
  get() {
    return criarRunnerAppsScript(null, null);
  }
});
