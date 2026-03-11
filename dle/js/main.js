import { PlayerRepository }  from './repositories/PlayerRepository.js';
import { GameService }        from './services/GameService.js';
import { SearchComponent }    from './ui/SearchComponent.js';
import { GridComponent }      from './ui/GridComponent.js';
import { VictoryComponent }   from './ui/VictoryComponent.js';
import { ParticlesComponent } from './ui/ParticlesComponent.js';
import { t, getLang, setLang, applyStaticTranslations } from './utils/i18n.js';
import { CookieBanner } from './ui/CookieBanner.js';

async function boot() {
  // ── 0. i18n + cookies ───────────────────────────────────
  applyStaticTranslations();
  setupLangSwitcher();
  new CookieBanner().init();

  // ── 1. Infraestructura y servicios ──────────────────────
  const repo = new PlayerRepository();

  // Intenta cargar desde la API de Leaguepedia; si falla, usa el JSON local
  try {
    await repo.loadFromAPI();
    console.info('[DLE Games] Jugadores cargados desde Leaguepedia API');
  } catch (apiErr) {
    console.warn('[DLE Games] API no disponible, usando datos locales:', apiErr.message);
    await repo.load('./data/players.json');
  }

  const game = new GameService(repo);

  // ── 2. UI ────────────────────────────────────────────────
  const particles = new ParticlesComponent({
    particleCanvas: document.getElementById('canvas-particles'),
    confettiCanvas: document.getElementById('canvas-confetti'),
  });

  const grid = new GridComponent({
    headerEl: document.getElementById('grid-header'),
    listEl:   document.getElementById('attempts-list'),
  });

  // Actualizar cabeceras de columna al cambiar idioma
  document.addEventListener('langchange', () => grid.refreshHeader());

  const victory = new VictoryComponent({
    overlayEl: document.getElementById('victory-overlay'),
    titleEl:   document.getElementById('v-title'),
    playerEl:  document.getElementById('v-player'),
    realEl:    document.getElementById('v-real'),
    triesEl:   document.getElementById('v-tries'),
    imgEl:     document.getElementById('v-img'),
    onRestart: start,
  });

  const search = new SearchComponent({
    inputEl:    document.getElementById('search-input'),
    dropdownEl: document.getElementById('search-dropdown'),
    errorEl:    document.getElementById('error-msg'),
    getResults: q => game.searchPlayers(q),
    onGuess:    handleGuess,
  });

  const guessBtn  = document.getElementById('guess-btn');
  const giveupBtn = document.getElementById('giveup-btn');
  const countEl   = document.getElementById('attempt-count');

  guessBtn.addEventListener('click', () => handleGuess(search.value));

  giveupBtn.addEventListener('click', () => {
    const outcome = game.giveUp();
    if (outcome.error) return;
    search.setEnabled(false);
    guessBtn.disabled  = true;
    giveupBtn.disabled = true;
    setTimeout(() => {
      victory.show(game.secret, 0);
      particles.launchDefeat();
    }, 300);
  });

  // ── 3. Flujo del juego ───────────────────────────────────
  function start() {
    game.start();
    grid.clear();
    countEl.textContent = '0';
    search.clearInput();
    search.setEnabled(true);
    guessBtn.disabled  = false;
    giveupBtn.disabled = false;
    victory.hide();
    particles.stopConfetti();
  }

  function handleGuess(name) {
    if (!name) {
      search.showError(t('errEmpty'));
      return;
    }

    const outcome = game.guess(name);

    if (outcome.error === 'not_found') {
      search.showError(t('errNotFound'));
      return;
    }
    if (outcome.error === 'already_guessed') {
      search.showError(t('errAlready'));
      return;
    }
    if (outcome.error === 'game_over') return;

    search.clearInput();
    countEl.textContent = game.attempts;
    grid.addRow(outcome.player, outcome.result);

    if (outcome.won) {
      search.setEnabled(false);
      guessBtn.disabled  = true;
      giveupBtn.disabled = true;
      // Espera a que termine la animacion de las celdas
      setTimeout(() => {
        victory.show(game.secret, game.attempts);
        particles.launchConfetti();
      }, 1000);
    }
  }

  start();
}

function setupLangSwitcher() {
  const btn     = document.getElementById('lang-btn');
  const menu    = document.getElementById('lang-menu');
  const flagImg = document.getElementById('lang-flag');
  const codeEl  = document.getElementById('lang-code');

  const FLAGS = { es: { src: 'https://flagcdn.com/w20/es.png', code: 'ES' },
                  en: { src: 'https://flagcdn.com/w20/gb.png', code: 'EN' } };

  function updateBtn(lang) {
    flagImg.src = FLAGS[lang].src;
    codeEl.textContent = FLAGS[lang].code;
  }

  updateBtn(getLang());

  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const lang = opt.dataset.lang;
      setLang(lang);
      updateBtn(lang);
      menu.classList.add('hidden');
    });
  });

  document.addEventListener('click', () => menu.classList.add('hidden'));
}

// ── Arranque con manejo de errores ───────────────────────────
boot().catch(err => {
  console.error('[DLE Games]', err);
  document.body.innerHTML = `
    <div style="
      display:flex; flex-direction:column; align-items:center;
      justify-content:center; min-height:100vh;
      color:#ff4444; font-family:monospace; text-align:center; padding:2rem;
      background:#010a13;
    ">
      <h2 style="font-size:1.4rem; margin-bottom:1rem">Error al cargar el juego</h2>
      <p style="color:#aaa; margin-bottom:0.5rem">${err.message}</p>
      <p style="color:#666; font-size:0.8rem; margin-top:1rem">
        Este juego necesita un servidor local.<br>
        Usa Live Server en VSCode o ejecuta:<br><br>
        <span style="color:#c89b3c">python -m http.server 3000</span>
      </p>
    </div>
  `;
});
