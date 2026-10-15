/* ============================================================
   MENU - PROGRAMAÇÃO DENTRO DE CADA CLIENTE
   ============================================================
   Ajuste apenas de navegação/apresentação:
   - remove "Programação" do menu principal;
   - adiciona "Programação" dentro de SGQ Fixpar;
   - adiciona "Programação" dentro de Macrosul como função futura;
   - ao voltar da Programação SGQ, retorna ao menu SGQ Fixpar.
   Não altera regras, dados, API, relatórios ou programação.
   ============================================================ */

(function () {
  const STYLE_ID = 'menuProgramacaoClientesStyle';

  function garantirEstilo_() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .menu-programacao-cliente-wrap {
        width: 100%;
        max-width: 650px;
        margin: 20px auto 0;
        display: flex;
        justify-content: center;
      }

      .menu-programacao-cliente {
        width: calc(50% - 9px);
        min-height: 50px;
        padding: 10px 22px;
        border-radius: 24px;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,.08);
        transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
      }

      .menu-programacao-cliente:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0,0,0,.12);
      }

      #logisticaMenu .menu-programacao-cliente {
        background: #22a85a;
        border: 1px solid #198647;
      }

      #logisticaMenu .menu-programacao-cliente:hover {
        background: #198f4b;
      }

      #macrosulMenu .menu-programacao-cliente {
        background: #e53935;
        border: 1px solid #c62828;
      }

      #macrosulMenu .menu-programacao-cliente:hover {
        background: #d32f2f;
      }

      #programacaoMenu.menu-programacao-legado {
        display: none !important;
      }

      @media (max-width: 800px) {
        .menu-programacao-cliente-wrap {
          margin-top: 14px;
        }

        .menu-programacao-cliente {
          width: 100%;
          max-width: 360px;
          min-height: 48px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removerProgramacaoMenuPrincipal_() {
    document.querySelectorAll('#mainMenu .main-menu-button').forEach(button => {
      if (String(button.textContent || '').trim().toLocaleLowerCase('pt-BR') === 'programação') {
        button.remove();
      }
    });
  }

  function criarBotaoProgramacao_(menuId, tipo) {
    const menu = document.getElementById(menuId);
    if (!menu || menu.querySelector('.menu-programacao-cliente-wrap')) return;

    const menuScreen = menu.querySelector('.menu-screen');
    const back = menu.querySelector('.menu-back');
    if (!menuScreen || !back) return;

    const wrap = document.createElement('div');
    wrap.className = 'menu-programacao-cliente-wrap';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-programacao-cliente';
    button.textContent = 'Programação';

    if (tipo === 'fixpar') {
      button.title = 'Abrir Programação SGQ - Fixpar';
      button.addEventListener('click', () => {
        if (typeof window.abrirProgramacaoSgq === 'function') {
          window.abrirProgramacaoSgq();
        }
      });
    } else {
      button.title = 'Programação Macrosul';
      button.addEventListener('click', () => {
        if (typeof window.funcaoEmBreve === 'function') {
          window.funcaoEmBreve('Programação - Macrosul');
        }
      });
    }

    wrap.appendChild(button);
    menuScreen.insertBefore(wrap, back);
  }

  function ajustarNavegacao_() {
    /* Compatibilidade: qualquer chamada antiga de abrir o menu exclusivo
       de Programação agora leva ao menu SGQ Fixpar. */
    window.abrirMenuProgramacao = function () {
      if (typeof window.abrirMenuLogistica === 'function') {
        window.abrirMenuLogistica();
      }
    };

    /* O botão Voltar da tela Programação retorna para SGQ Fixpar. */
    window.voltarMenuProgramacao = function () {
      if (typeof window.voltarMenuLogistica === 'function') {
        window.voltarMenuLogistica();
      } else if (typeof window.abrirMenuLogistica === 'function') {
        window.abrirMenuLogistica();
      }
    };

    const legado = document.getElementById('programacaoMenu');
    if (legado) {
      legado.classList.add('menu-programacao-legado');
      legado.setAttribute('aria-hidden', 'true');
    }
  }

  function aplicar_() {
    garantirEstilo_();
    removerProgramacaoMenuPrincipal_();
    criarBotaoProgramacao_('logisticaMenu', 'fixpar');
    criarBotaoProgramacao_('macrosulMenu', 'macrosul');
    ajustarNavegacao_();
  }

  aplicar_();
})();
