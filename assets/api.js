/**
 * Camada de comunicação GitHub Pages -> Google Apps Script.
 *
 * Regras desta versão:
 * - leituras podem ocorrer em paralelo;
 * - gravações são serializadas para evitar concorrência e lock excessivo;
 * - timeout explícito para não deixar a tela presa indefinidamente;
 * - erro de HTML/timeout do Apps Script é identificado corretamente;
 * - mantém compatibilidade com google.script.run.
 */

const API_MUTATION_METHODS = new Set([
  'salvarLinha',
  'salvarLinhasEmLote',
  'limparLinha',
  'editarHistorico',
  'finalizarRelatorioRapido',
  'salvarPdfRapidoDrive',
  'salvarProgramacaoSgq'
]);

let apiMutationQueue_ = Promise.resolve();

function apiTimeoutMs_(method) {
  return API_MUTATION_METHODS.has(String(method || '')) ? 90000 : 45000;
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

  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    const html = /<\s*!doctype|<\s*html|<\s*body/i.test(text || '');
    const status = response && response.status ? ' HTTP ' + response.status + '.' : '';

    console.error('Resposta não JSON da API:', {
      method,
      status: response ? response.status : null,
      preview: String(text || '').slice(0, 300)
    });

    throw new Error(
      html
        ? 'O Apps Script retornou uma página de erro em vez de JSON.' + status +
          ' Isso normalmente indica falha/tempo limite no processamento do servidor.'
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

function chamarApiAppsScript(method, args) {
  const nome = String(method || '');

  if (!API_MUTATION_METHODS.has(nome)) {
    return executarFetchApi_(nome, args);
  }

  /*
   * Apps Script + Google Sheets trabalham melhor quando as mutações não
   * chegam concorrendo entre si. A fila evita múltiplos locks/requests
   * simultâneos e reduz timeout e duplicidade por corrida.
   */
  const executar = () => executarFetchApi_(nome, args);
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
