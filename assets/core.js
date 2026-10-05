let currentPage = null;
let currentHistoryPage = null;
let rows = [];
let saveTimers = {};
let tempIdCounter = 0;
let historyRowsCache = [];
let historyRenderMode = 'daily';
let coresConhecidas = [];
let salvamentoEmLote = false;
let historySuggestionTimer = null;
let historySuggestionSeq = 0;
let historyOffset = 0;
let historyNextOffset = null;
let historyTotal = 0;
let historyHeadersCache = [];
let historyPageSize = window.matchMedia('(max-width: 800px)').matches ? 25 : 60;


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('selectedDate').value = hojeISO();

  document.addEventListener('click', event => {
    const wrap = document.querySelector('.history-search-wrap');
    if (wrap && !wrap.contains(event.target)) {
      fecharSugestoesHistorico();
    }
  });

  /*
   * Ajustes carregados por último para valerem como padrão global:
   * - relatório rápido/silencioso no Drive;
   * - navegação interna integrada ao Voltar/Avançar do navegador.
   */
  carregarScriptsGlobais_([
    'assets/relatorio-padrao.js',
    'assets/navegacao.js'
  ]);
});


function carregarScriptsGlobais_(arquivos) {
  const lista = Array.isArray(arquivos) ? arquivos.slice() : [];

  function proximo_() {
    if (!lista.length) return;

    const src = lista.shift();

    if (document.querySelector('script[data-global-src="' + src + '"]')) {
      proximo_();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.globalSrc = src;
    script.onload = proximo_;
    script.onerror = () => {
      console.error('Não foi possível carregar o ajuste global:', src);
      proximo_();
    };

    document.body.appendChild(script);
  }

  proximo_();
}


/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
function esconderTelas() {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
}

function abrirMenuPrincipal() {
  cancelarTimers();
  esconderTelas();
  document.getElementById('mainMenu').classList.add('active');
}

function abrirMenuLogistica() {
  cancelarTimers();
  esconderTelas();
  document.getElementById('logisticaMenu').classList.add('active');
}

function abrirMenuMacrosul() {
  cancelarTimers();
  esconderTelas();
  document.getElementById('macrosulMenu').classList.add('active');
}

function voltarMenuLogistica() {
  cancelarTimers();
  esconderTelas();
  document.getElementById('logisticaMenu').classList.add('active');
}

function abrirSistema(pageKey) {
  currentPage = pageKey;
  esconderTelas();
  document.getElementById('systemScreen').classList.add('active');
  renderPageState();

  if (pageKey === 'RECEBIMENTO') {
    carregarSugestoesCores();
  }

  carregar();
}

function abrirHistorico(pageKey) {

  currentHistoryPage = pageKey;

  if (pageKey === 'RECEBIMENTO') {
    carregarSugestoesCores();
  }

  esconderTelas();
  document.getElementById('historyScreen').classList.add('active');

  const cfg = getPageConfigByKey(pageKey);

  document.getElementById('historyTitle').textContent = cfg.historyTitle;

  const periodo = periodoMesAtual();
  document.getElementById('historyStartDate').value = periodo.inicio;
  document.getElementById('historyEndDate').value = periodo.fim;
  document.getElementById('historySearch').value = '';
  document.getElementById('historyInfo').textContent = '';
  atualizarBotaoLimparHistorico();
  fecharSugestoesHistorico();

  historyRenderMode = 'daily';
  historyRowsCache = [];
  historyOffset = 0;
  historyNextOffset = null;
  const moreButton = document.getElementById('historyLoadMore');
  if (moreButton) moreButton.style.display = 'none';
  consultarHistorico(false);
}


/* ============================================================
   DATAS
   ============================================================ */
function hojeISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateToLocalISO(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function periodoMesAtual() {

  const hoje = new Date();
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  return {
    inicio: dateToLocalISO(primeiro),
    fim: dateToLocalISO(ultimo)
  };
}

function dataBR(iso) {

  if (!iso) return '';

  const parts = iso.split('-');
  if (parts.length !== 3) return iso;

  return parts[2] + '/' + parts[1] + '/' + parts[0];
}


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */
function getPageConfig() {
  return getPageConfigByKey(currentPage);
}

function getPageConfigByKey(pageKey) {
  return pageKey === 'RECEBIMENTO'
    ? CONFIG.recebimento
    : CONFIG.saida;
}

function renderPageState() {
  const cfg = getPageConfig();
  document.getElementById('pageTitle').textContent = cfg.title;
  renderHeaders(cfg.headers);
}

function renderHeaders(headers) {

  const tr = document.getElementById('headerRow');
  tr.innerHTML = '';

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    tr.appendChild(th);
  });
}

function renderHistoryHeaders(headers) {
  // Mantido por compatibilidade. Os cabeçalhos agora são criados em cada card.
}



