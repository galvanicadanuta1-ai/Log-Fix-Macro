/**
 * Camada de comunicação GitHub Pages -> Google Apps Script.
 * Mantém compatibilidade com google.script.run.
 */
async function chamarApiAppsScript(method, args) {
  if (!apiConfigurada()) {
    throw new Error(
      'API do Apps Script ainda não configurada. ' +
      'Edite assets/config.js e informe a URL /exec da implantação.'
    );
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({
      method,
      args: Array.isArray(args) ? args : []
    })
  });

  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(
      'A API respondeu em formato inválido. ' +
      'Confirme se a URL termina em /exec e se a nova versão foi implantada.'
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
