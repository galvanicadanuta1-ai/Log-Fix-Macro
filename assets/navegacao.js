/* ============================================================
   NAVEGAÇÃO INTERNA + HISTÓRICO DO NAVEGADOR
   ============================================================
   Cada tela importante do sistema passa a criar uma etapa no histórico.
   Assim, Voltar/Avançar do Chrome/Edge navegam entre as telas do sistema
   antes de sair da página.
   ============================================================ */

(function () {
  const originals = {
    abrirMenuPrincipal: window.abrirMenuPrincipal,
    abrirMenuLogistica: window.abrirMenuLogistica,
    abrirMenuMacrosul: window.abrirMenuMacrosul,
    abrirMenuProgramacao: window.abrirMenuProgramacao,
    voltarMenuLogistica: window.voltarMenuLogistica,
    abrirSistema: window.abrirSistema,
    abrirHistorico: window.abrirHistorico,
    abrirProgramacaoSgq: window.abrirProgramacaoSgq,
    voltarMenuProgramacao: window.voltarMenuProgramacao
  };

  const ROTAS_VALIDAS = new Set([
    'principal',
    'sgq-fixpar',
    'macrosul',
    'programacao',
    'recebimento-fixpar',
    'saida-fixpar',
    'historico-recebimento',
    'historico-saida',
    'programacao-sgq-fixpar'
  ]);

  let aplicandoHistorico = false;

  function estadoAtual_() {
    const state = window.history.state;
    return state && state.sgqInterno ? state : null;
  }

  function rotaDoHash_() {
    const rota = String(window.location.hash || '')
      .replace(/^#/, '')
      .trim();

    return ROTAS_VALIDAS.has(rota) ? rota : 'principal';
  }

  function urlDaRota_(rota) {
    return window.location.pathname + window.location.search + '#' + rota;
  }

  function renderizarRota_(rota) {
    aplicandoHistorico = true;

    try {
      switch (rota) {
        case 'sgq-fixpar':
          if (typeof originals.abrirMenuLogistica === 'function') {
            originals.abrirMenuLogistica();
          }
          break;

        case 'macrosul':
          if (typeof originals.abrirMenuMacrosul === 'function') {
            originals.abrirMenuMacrosul();
          }
          break;

        case 'programacao':
          if (typeof originals.abrirMenuProgramacao === 'function') {
            originals.abrirMenuProgramacao();
          }
          break;

        case 'recebimento-fixpar':
          if (typeof originals.abrirSistema === 'function') {
            originals.abrirSistema('RECEBIMENTO');
          }
          break;

        case 'saida-fixpar':
          if (typeof originals.abrirSistema === 'function') {
            originals.abrirSistema('SAIDA');
          }
          break;

        case 'historico-recebimento':
          if (typeof originals.abrirHistorico === 'function') {
            originals.abrirHistorico('RECEBIMENTO');
          }
          break;

        case 'historico-saida':
          if (typeof originals.abrirHistorico === 'function') {
            originals.abrirHistorico('SAIDA');
          }
          break;

        case 'programacao-sgq-fixpar':
          if (typeof originals.abrirProgramacaoSgq === 'function') {
            originals.abrirProgramacaoSgq();
          }
          break;

        case 'principal':
        default:
          if (typeof originals.abrirMenuPrincipal === 'function') {
            originals.abrirMenuPrincipal();
          }
          break;
      }
    } finally {
      aplicandoHistorico = false;
    }
  }

  function navegarPara_(rota, renderizar) {
    if (aplicandoHistorico) {
      renderizar();
      return;
    }

    const atual = estadoAtual_();
    const profundidade = atual ? Number(atual.profundidade || 0) + 1 : 1;

    window.history.pushState(
      {
        sgqInterno: true,
        rota,
        profundidade
      },
      '',
      urlDaRota_(rota)
    );

    renderizar();
  }

  function substituirRota_(rota, renderizar) {
    const atual = estadoAtual_();
    const profundidade = atual ? Number(atual.profundidade || 0) : 0;

    window.history.replaceState(
      {
        sgqInterno: true,
        rota,
        profundidade
      },
      '',
      urlDaRota_(rota)
    );

    renderizar();
  }

  function voltarInterno_(rotaFallback, renderFallback) {
    const atual = estadoAtual_();

    if (atual && Number(atual.profundidade || 0) > 0) {
      window.history.back();
      return;
    }

    substituirRota_(rotaFallback, renderFallback);
  }

  /* ==========================================================
     ABERTURA DAS TELAS
     ========================================================== */
  if (typeof originals.abrirMenuLogistica === 'function') {
    window.abrirMenuLogistica = function () {
      navegarPara_('sgq-fixpar', () => originals.abrirMenuLogistica());
    };
  }

  if (typeof originals.abrirMenuMacrosul === 'function') {
    window.abrirMenuMacrosul = function () {
      navegarPara_('macrosul', () => originals.abrirMenuMacrosul());
    };
  }

  if (typeof originals.abrirMenuProgramacao === 'function') {
    window.abrirMenuProgramacao = function () {
      navegarPara_('programacao', () => originals.abrirMenuProgramacao());
    };
  }

  if (typeof originals.abrirSistema === 'function') {
    window.abrirSistema = function (pageKey) {
      const key = String(pageKey || '').toUpperCase();
      const rota = key === 'SAIDA'
        ? 'saida-fixpar'
        : 'recebimento-fixpar';

      navegarPara_(rota, () => originals.abrirSistema(key));
    };
  }

  if (typeof originals.abrirHistorico === 'function') {
    window.abrirHistorico = function (pageKey) {
      const key = String(pageKey || '').toUpperCase();
      const rota = key === 'SAIDA'
        ? 'historico-saida'
        : 'historico-recebimento';

      navegarPara_(rota, () => originals.abrirHistorico(key));
    };
  }

  if (typeof originals.abrirProgramacaoSgq === 'function') {
    window.abrirProgramacaoSgq = function () {
      navegarPara_(
        'programacao-sgq-fixpar',
        () => originals.abrirProgramacaoSgq()
      );
    };
  }

  /* ==========================================================
     BOTÕES ← VOLTAR DO PRÓPRIO SISTEMA
     ========================================================== */
  if (typeof originals.abrirMenuPrincipal === 'function') {
    window.abrirMenuPrincipal = function () {
      voltarInterno_('principal', () => originals.abrirMenuPrincipal());
    };
  }

  if (typeof originals.voltarMenuLogistica === 'function') {
    window.voltarMenuLogistica = function () {
      voltarInterno_('sgq-fixpar', () => originals.abrirMenuLogistica());
    };
  }

  if (typeof originals.voltarMenuProgramacao === 'function') {
    window.voltarMenuProgramacao = function () {
      voltarInterno_('programacao', () => originals.abrirMenuProgramacao());
    };
  }

  /* ==========================================================
     VOLTAR / AVANÇAR DO NAVEGADOR
     ========================================================== */
  window.addEventListener('popstate', event => {
    const state = event.state;

    if (state && state.sgqInterno && ROTAS_VALIDAS.has(state.rota)) {
      renderizarRota_(state.rota);
      return;
    }

    const rota = rotaDoHash_();
    if (ROTAS_VALIDAS.has(rota)) {
      renderizarRota_(rota);
    }
  });

  /* ==========================================================
     INICIALIZAÇÃO
     ========================================================== */
  const stateInicial = estadoAtual_();
  const rotaInicial = stateInicial && ROTAS_VALIDAS.has(stateInicial.rota)
    ? stateInicial.rota
    : rotaDoHash_();

  if (!stateInicial) {
    window.history.replaceState(
      {
        sgqInterno: true,
        rota: rotaInicial,
        profundidade: rotaInicial === 'principal' ? 0 : 1
      },
      '',
      urlDaRota_(rotaInicial)
    );
  }

  if (rotaInicial !== 'principal') {
    window.setTimeout(() => renderizarRota_(rotaInicial), 0);
  }
})();
