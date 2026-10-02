import { PlayerRepository, DAILY_FILTER } from './repositories/PlayerRepository.js';
import { GameService }        from './services/GameService.js';
import { DailyService }       from './services/DailyService.js';
import { SearchComponent }    from './ui/SearchComponent.js';
import { GridComponent }      from './ui/GridComponent.js';
import { VictoryComponent }   from './ui/VictoryComponent.js';
import { ParticlesComponent } from './ui/ParticlesComponent.js';
import { t, getLang, setLang, applyStaticTranslations } from './utils/i18n.js';
import { mountSwitcher } from '../../shared/lang.js';
import { CookieBanner } from './ui/CookieBanner.js';
import { mountGameNav } from '../../shared/nav.js';
import { recordResult } from '../../shared/auth.js';

async function boot() {
  applyStaticTranslations();
  mountSwitcher();
  mountGameNav();
  new CookieBanner().init();

  const repo = new PlayerRepository();
  await repo.load('./data/players.json');

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
    updateHardBtn();
    updateVHardBtn();
    renderFilters();
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

  const guessBtn         = document.getElementById('guess-btn');
  const giveupBtn        = document.getElementById('giveup-btn');
  const countEl          = document.getElementById('attempt-count');
  const shareBtn         = document.getElementById('share-btn');
  const countdownEl      = document.getElementById('daily-countdown');
  const freeModeBtn      = document.getElementById('free-mode-btn');
  const hardBtn          = document.getElementById('hard-mode-btn');
  const freePlayOptions  = document.getElementById('free-play-options');
  const vHardBtn         = document.getElementById('v-hard-btn');
  const vTierBtns        = document.getElementById('v-tier-btns');
  const vRegionBtns      = document.getElementById('v-region-btns');
  const tierSelect       = document.getElementById('tier-filter-select');
  const regionSelect     = document.getElementById('region-filter-select');

  // ── Estado del modo ───────────────────────────────────────
  let isDaily      = true;
  let pendingRows  = []; // acumula filas para el share
  let isHard       = localStorage.getItem('dle_hard_mode') === '1';
  // Modo libre: hasta qué tier de liga entra (1 = solo ligas de Worlds) y región
  let freeTier     = Number(localStorage.getItem('dle_free_tier')) || 1;
  let freeRegion   = null; // null = todas las regiones

  // ── Modo difícil ──────────────────────────────────────────
  grid.setHardMode(isHard);
  updateHardBtn();

  hardBtn?.addEventListener('click', () => {
    if (game.attempts > 0) return;
    isHard = !isHard;
    localStorage.setItem('dle_hard_mode', isHard ? '1' : '0');
    grid.setHardMode(isHard);
    updateHardBtn();
    updateVHardBtn();
  });

  function updateHardBtn() {
    if (!hardBtn) return;
    hardBtn.textContent = isHard ? t('hardModeOn') : t('hardModeBtn');
    hardBtn.classList.toggle('border-gold',       isHard);
    hardBtn.classList.toggle('text-gold',         isHard);
    hardBtn.classList.toggle('border-lol-border', !isHard);
    hardBtn.classList.toggle('text-lol-dim',      !isHard);
  }

  // ── Filtros del modo libre: tier y región ─────────────────
  // Los mismos filtros se muestran como botones en el overlay de victoria y como
  // desplegables junto al modo difícil.
  const TIERS = [1, 2, 3];
  const tierLabel   = tier   => t(`tier${tier}`);
  const regionLabel = region => region === 'all' ? t('regionAll') : region;
  const freeFilter  = () => ({ maxTier: freeTier, region: freeRegion });

  function onFilterChange() {
    localStorage.setItem('dle_free_tier', String(freeTier));
    if (!repo.getRegions(freeTier).includes(freeRegion)) freeRegion = null;
    renderFilters();
    // En plena partida sin intentos, empezar otra con el nuevo filtro
    if (!isDaily && game.attempts === 0) {
      game.start(null, freeFilter());
      resetUI();
    }
  }

  function renderButtons(container, items, isActive, label, onPick) {
    if (!container) return;
    container.replaceChildren(...items.map(item => {
      const btn = document.createElement('button');
      const active = isActive(item);
      btn.className = [
        'font-rajdhani text-xs font-bold tracking-widest uppercase',
        'px-3 py-1 border transition-all duration-200 hover:border-gold hover:text-gold',
        active ? 'border-gold text-gold' : 'border-lol-border text-lol-dim',
      ].join(' ');
      btn.textContent = label(item);
      btn.addEventListener('click', () => onPick(item));
      return btn;
    }));
  }

  function renderSelect(select, items, value, label) {
    if (!select) return;
    select.replaceChildren(...items.map(item => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = label(item);
      return opt;
    }));
    select.value = String(value);
  }

  function renderFilters() {
    const regions = ['all', ...repo.getRegions(freeTier)];
    const pickTier   = tier   => { freeTier = tier; onFilterChange(); };
    const pickRegion = region => { freeRegion = region === 'all' ? null : region; onFilterChange(); };
    renderButtons(vTierBtns, TIERS, tier => tier === freeTier, tierLabel, pickTier);
    renderButtons(vRegionBtns, regions, r => (r === 'all' ? null : r) === freeRegion,
                  regionLabel, pickRegion);
    renderSelect(tierSelect, TIERS, freeTier, tierLabel);
    renderSelect(regionSelect, regions, freeRegion ?? 'all', regionLabel);
    if (tierSelect)   tierSelect.title   = t('tierFilter');
    if (regionSelect) regionSelect.title = t('regionFilter');
  }

  tierSelect?.addEventListener('change', () => {
    freeTier = Number(tierSelect.value);
    onFilterChange();
  });
  regionSelect?.addEventListener('change', () => {
    freeRegion = regionSelect.value === 'all' ? null : regionSelect.value;
    onFilterChange();
  });
  renderFilters();

  if (vHardBtn) {
    vHardBtn.addEventListener('click', () => {
      isHard = !isHard;
      localStorage.setItem('dle_hard_mode', isHard ? '1' : '0');
      updateVHardBtn();
      updateHardBtn();
    });
    updateVHardBtn();
  }

  function updateVHardBtn() {
    if (!vHardBtn) return;
    const label = isHard ? t('hardModeOn') : t('hardModeBtn');
    vHardBtn.innerHTML = `💀 <span>${label}</span>`;
    vHardBtn.classList.toggle('border-gold',       isHard);
    vHardBtn.classList.toggle('text-gold',         isHard);
    vHardBtn.classList.toggle('border-lol-border', !isHard);
    vHardBtn.classList.toggle('text-lol-dim',      !isHard);
  }

  function setFilterSelectsVisible(visible) {
    tierSelect?.classList.toggle('hidden', !visible);
    regionSelect?.classList.toggle('hidden', !visible);
  }


  // ── Modo diario (solo jugadores de ligas tier 1) ──────────
  function getDailyPlayer() {
    return repo.getDaily(DailyService.getDailyIndex(repo.dailyCount));
  }

  function startDaily() {
    isDaily     = true;
    pendingRows = [];
    updateDailyBadge();
    setFilterSelectsVisible(false);

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

    game.start(getDailyPlayer(), DAILY_FILTER);
    resetUI();
    hideFreeModeBanner();
  }

  function startFreePlay() {
    isDaily = false;
    updateDailyBadge();
    game.start(null, freeFilter());
    resetUI();
    showFreeModeBanner();
    setFilterSelectsVisible(true);
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
    saveToHistory(false);

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
      saveToHistory(true);

      setTimeout(() => {
        showVictory(game.secret, game.attempts, true);
        particles.launchConfetti();
      }, 1000);
    }
  }

  /** Historial del usuario (cuenta de Google o este navegador). */
  function saveToHistory(won) {
    recordResult({
      game: 'dle', mode: isDaily ? 'daily' : 'free', won,
      attempts: won ? game.attempts : null,
      details: { player: game.secret.name, hard: isHard,
                 ...(isDaily ? {} : { maxTier: freeTier, region: freeRegion }) },
    });
  }

  // ── Helpers de UI ─────────────────────────────────────────
  function showVictory(secret, attempts, won) {
    victory.show(secret, won ? attempts : 0);
    if (isDaily) showFreePlayOptions();
  }

  function resetUI() {
    grid.clear();
    countEl.textContent = '0';
    search.clearInput();
    enableInput();
    victory.hide();
    particles.stopConfetti();
    if (shareBtn)       shareBtn.classList.add('hidden');
    if (countdownEl)    countdownEl.classList.add('hidden');
    hideFreePlayOptions();
    updateHardBtn();
  }

  function showFreePlayOptions() {
    if (!freePlayOptions) return;
    updateVHardBtn();
    renderFilters();
    freePlayOptions.classList.remove('hidden');
  }

  function hideFreePlayOptions() {
    if (!freePlayOptions) return;
    freePlayOptions.classList.add('hidden');
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
