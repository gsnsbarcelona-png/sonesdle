import { PlayerRepository }  from './repositories/PlayerRepository.js';
import { GameService }        from './services/GameService.js';
import { DailyService }       from './services/DailyService.js';
import { SearchComponent }    from './ui/SearchComponent.js';
import { GridComponent }      from './ui/GridComponent.js';
import { VictoryComponent }   from './ui/VictoryComponent.js';
import { ParticlesComponent } from './ui/ParticlesComponent.js';
import { t, getLang, setLang, applyStaticTranslations } from './utils/i18n.js';
import { CookieBanner } from './ui/CookieBanner.js';
import { mountGameNav } from '../../shared/nav.js';

async function boot() {
  applyStaticTranslations();
  setupLangSwitcher();
  mountGameNav();
  new CookieBanner().init();

  const repo = new PlayerRepository();
  try {
    await repo.loadFromAPI();
  } catch (apiErr) {
    console.warn('[DLE Games] API no disponible, usando datos locales:', apiErr.message);
    await repo.load('./data/players.json');
  }

  const game = new GameService(repo);

  const particles = new ParticlesComponent({
    particleCanvas: document.getElementById('canvas-particles'),
    confettiCanvas: document.getElementById('canvas-confetti'),
  });

  const grid = new GridComponent({
    headerEl: document.getElementById('grid-header'),
    listEl:   document.getElementById('attempts-list'),
  });

  document.addEventListener('langchange', () => {
    grid.refreshHeader();
    updateDailyBadge();
  });

  const victory = new VictoryComponent({
    overlayEl: document.getElementById('victory-overlay'),
    titleEl:   document.getElementById('v-title'),
    playerEl:  document.getElementById('v-player'),
    realEl:    document.getElementById('v-real'),
    triesEl:   document.getElementById('v-tries'),
    imgEl:     document.getElementById('v-img'),
    onRestart: startFreePlay,
  });

  const search = new SearchComponent({
    inputEl:    document.getElementById('search-input'),
    dropdownEl: document.getElementById('search-dropdown'),
    errorEl:    document.getElementById('error-msg'),
    getResults: q => game.searchPlayers(q),
    onGuess:    handleGuess,
  });

  const guessBtn    = document.getElementById('guess-btn');
  const giveupBtn   = document.getElementById('giveup-btn');
  const countEl     = document.getElementById('attempt-count');
  const shareBtn    = document.getElementById('share-btn');
  const countdownEl = document.getElementById('daily-countdown');
  const freeModeBtn = document.getElementById('free-mode-btn');

  // ── Estado del modo ───────────────────────────────────────
  let isDaily      = true;
  let pendingRows  = []; // acumula filas para el share

  // ── Modo diario ───────────────────────────────────────────
  function getDailyPlayer() {
    return repo.getByIndex(DailyService.getDailyIndex(repo.count));
  }

  function startDaily() {
    isDaily     = true;
    pendingRows = [];
    updateDailyBadge();

    if (DailyService.hasPlayedToday()) {
      // Ya jugó hoy: reconstruir grid y mostrar resultado
      const saved = DailyService.getTodayResult();
      disableInput();
      showVictory(getDailyPlayer(), saved.attempts, saved.won);
      if (saved.won) particles.launchConfetti();
      else           particles.launchDefeat();
      showCountdown();
      showShareBtn(saved);
      return;
    }

    game.start(getDailyPlayer());
    resetUI();
    hideFreeModeBanner();
  }

  function startFreePlay() {
    isDaily = false;
    updateDailyBadge();
    game.start();
    resetUI();
    showFreeModeBanner();
  }

  // ── Handlers ──────────────────────────────────────────────
  guessBtn.addEventListener('click', () => handleGuess(search.value));

  giveupBtn.addEventListener('click', () => {
    const outcome = game.giveUp();
    if (outcome.error) return;
    disableInput();

    if (isDaily) {
      DailyService.saveResult({ secret: game.secret, attempts: 0, won: false, rows: pendingRows });
      showCountdown();
      showShareBtn(DailyService.getTodayResult());
    }

    setTimeout(() => {
      showVictory(game.secret, 0, false);
      particles.launchDefeat();
    }, 300);
  });

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const result = DailyService.getTodayResult();
      if (!result) return;
      const text = DailyService.buildShareText(result);
      try {
        await navigator.clipboard.writeText(text);
        shareBtn.textContent = t('dailyCopied');
        setTimeout(() => { shareBtn.textContent = t('dailyShare'); }, 2000);
      } catch {
        shareBtn.textContent = t('dailyCopied');
      }
    });
  }

  if (freeModeBtn) {
    freeModeBtn.addEventListener('click', startFreePlay);
  }

  function handleGuess(name) {
    if (!name) { search.showError(t('errEmpty')); return; }

    const outcome = game.guess(name);
    if (outcome.error === 'not_found')       { search.showError(t('errNotFound')); return; }
    if (outcome.error === 'already_guessed') { search.showError(t('errAlready'));  return; }
    if (outcome.error === 'game_over') return;

    // Acumula fila para share (7 columnas de datos, sin la de nombre)
    const row = [
      outcome.result.country,
      outcome.result.league,
      outcome.result.position,
      outcome.result.titles,
      outcome.result.worlds,
      outcome.result.age.status,
      outcome.result.team,
    ];
    pendingRows.unshift(row); // las más recientes primero (igual que el grid)

    search.clearInput();
    countEl.textContent = game.attempts;
    grid.addRow(outcome.player, outcome.result);

    if (outcome.won) {
      disableInput();

      if (isDaily) {
        DailyService.saveResult({ secret: game.secret, attempts: game.attempts, won: true, rows: pendingRows });
        showCountdown();
        showShareBtn(DailyService.getTodayResult());
      }

      setTimeout(() => {
        showVictory(game.secret, game.attempts, true);
        particles.launchConfetti();
      }, 1000);
    }
  }

  // ── Helpers de UI ─────────────────────────────────────────
  function showVictory(secret, attempts, won) {
    victory.show(secret, won ? attempts : 0);
  }

  function resetUI() {
    grid.clear();
    countEl.textContent = '0';
    search.clearInput();
    enableInput();
    victory.hide();
    particles.stopConfetti();
    if (shareBtn)    shareBtn.classList.add('hidden');
    if (countdownEl) countdownEl.classList.add('hidden');
  }

  function disableInput() {
    search.setEnabled(false);
    guessBtn.disabled  = true;
    giveupBtn.disabled = true;
  }

  function enableInput() {
    search.setEnabled(true);
    guessBtn.disabled  = false;
    giveupBtn.disabled = false;
  }

  function showShareBtn(result) {
    if (!shareBtn || !result) return;
    shareBtn.textContent = t('dailyShare');
    shareBtn.classList.remove('hidden');
  }

  function showCountdown() {
    if (!countdownEl) return;
    countdownEl.classList.remove('hidden');
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    if (!countdownEl) return;
    const secs = DailyService.secondsUntilNext();
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    countdownEl.textContent = `${t('dailyNext')} ${h}:${m}:${s}`;
  }

  function updateDailyBadge() {
    const badge = document.getElementById('daily-badge');
    if (!badge) return;
    badge.textContent  = isDaily ? t('dailyBadge') : t('dailyFreePlay');
    badge.dataset.mode = isDaily ? 'daily' : 'free';
  }

  function showFreeModeBanner() {
    const banner = document.getElementById('free-mode-banner');
    if (banner) banner.classList.remove('hidden');
  }

  function hideFreeModeBanner() {
    const banner = document.getElementById('free-mode-banner');
    if (banner) banner.classList.add('hidden');
  }

  // ── Arranque ──────────────────────────────────────────────
  startDaily();
}

function setupLangSwitcher() {
  const btn     = document.getElementById('lang-btn');
  const menu    = document.getElementById('lang-menu');
  const flagImg = document.getElementById('lang-flag');
  const codeEl  = document.getElementById('lang-code');

  const FLAGS = { es: { src: 'https://flagcdn.com/w20/es.png', code: 'ES' },
                  en: { src: 'https://flagcdn.com/w20/gb.png', code: 'EN' } };

  const updateBtn = lang => { flagImg.src = FLAGS[lang].src; codeEl.textContent = FLAGS[lang].code; };

  updateBtn(getLang());
  btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      setLang(opt.dataset.lang);
      updateBtn(opt.dataset.lang);
      menu.classList.add('hidden');
    });
  });
  document.addEventListener('click', () => menu.classList.add('hidden'));
}

boot().catch(err => {
  console.error('[DLE Games]', err);
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:100vh;color:#ff4444;font-family:monospace;text-align:center;
                padding:2rem;background:#010a13;">
      <h2 style="font-size:1.4rem;margin-bottom:1rem">Error al cargar el juego</h2>
      <p style="color:#aaa;margin-bottom:0.5rem">Inténtalo de nuevo en unos segundos.</p>
      <button onclick="location.reload()" style="margin-top:1.5rem;padding:0.6rem 1.8rem;
        background:transparent;border:1px solid #c89b3c;color:#c89b3c;
        font-family:monospace;font-size:0.85rem;cursor:pointer;">Recargar</button>
    </div>
  `;
});
