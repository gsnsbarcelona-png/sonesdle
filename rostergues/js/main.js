import { ROSTERS }                             from './data/rosters.js';
import { pickRoster }                           from './services/RosterPickerService.js';
import { getHintTarget, getMaskedName, nextRevealIn } from './services/HintService.js';
import { mountSwitcher, applyStaticTranslations, getLang } from '../../shared/lang.js';
import { mountGameNav } from '../../shared/nav.js';
import { ParticlesComponent } from '../../shared/js/ParticlesComponent.js';
import * as AC from '../../shared/js/autocomplete.js';

/* ─── Constants ──────────────────────────────────────────── */
const POSITION_ORDER   = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];
const HINTS_EVERY_N_WRONGS = 5;

/* ─── i18n ───────────────────────────────────────────────── */
const STATIC = {
  es: {
    subtitle:     'Adivina el roster histórico',
    teamLabel:    'Equipo',
    yearLabel:    'Año',
    attemptsLabel:'⚡ Intentos',
    solvedLabel:  '✓ Acertados',
    btnGuess:     '⚔ Adivinar',
    btnSurrender: '⚑ Rendirse',
    resultWin:    '¡Victoria!',
    resultLose:   'Derrota',
    resultBtn:    '▶ Jugar de nuevo',
    posLabels:    { Top:'Top', Jungle:'Jungla', Mid:'Mid', ADC:'ADC', Support:'Support' },
  },
  en: {
    subtitle:     'Guess the historical roster',
    teamLabel:    'Team',
    yearLabel:    'Year',
    attemptsLabel:'⚡ Attempts',
    solvedLabel:  '✓ Solved',
    btnGuess:     '⚔ Guess',
    btnSurrender: '⚑ Surrender',
    resultWin:    'Victory!',
    resultLose:   'Defeat',
    resultBtn:    '▶ Play again',
    posLabels:    { Top:'Top', Jungle:'Jungle', Mid:'Mid', ADC:'ADC', Support:'Support' },
  },
};

function t(key) {
  const lang = getLang();
  return (STATIC[lang] ?? STATIC.es)[key];
}

/* ─── State ──────────────────────────────────────────────── */
const state = {
  roster:          null,
  solvedSlots:     new Set(),
  guesses:         [],
  attempts:        0,
  wrongCount:      0,
  revealedLetters: {},   // { position: number }
  gameStatus:      'playing',
};

/* ─── DOM refs ───────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ─── Particles (instancia compartida) ──────────────────── */
let particles = null;

/* ─── All player names for autocomplete ─────────────────── */
const ALL_PLAYERS = [];
for (const roster of ROSTERS) {
  for (const player of roster.players) {
    if (!ALL_PLAYERS.find(p => p.name.toLowerCase() === player.name.toLowerCase())) {
      ALL_PLAYERS.push({ name: player.name, position: player.position });
    }
  }
}

/* ─── Init ───────────────────────────────────────────────── */
function initGame() {
  state.roster          = pickRoster(ROSTERS);
  state.solvedSlots     = new Set();
  state.guesses         = [];
  state.attempts        = 0;
  state.wrongCount      = 0;
  state.revealedLetters = {};
  state.gameStatus      = 'playing';

  // reset UI
  $('result-overlay').classList.add('hidden');
  $('search-section').classList.remove('hidden');
  $('guess-input').disabled = false;
  $('btn-submit').disabled  = false;
  $('btn-surrender').disabled = false;
  $('guess-input').value    = '';
  AC.close($('autocomplete-list'));

  renderYearBanner();
  renderSlots();
  renderHistory();
  renderCounters();
  renderHintProgress();
}

/* ─── Year Banner ────────────────────────────────────────── */
function renderYearBanner() {
  const r = state.roster;
  $('year-team').textContent  = r.team;
  $('year-year').textContent  = r.year;
  $('year-event').textContent = r.event;

  // region badge
  let badge = document.querySelector('.year-region-badge');
  if (!badge) {
    badge = document.createElement('div');
    $('year-banner').appendChild(badge);
  }
  badge.className   = `year-region-badge ${r.region}`;
  badge.textContent = r.region;
}

/* ─── Slots ──────────────────────────────────────────────── */
function renderSlots() {
  const grid   = $('slots-grid');
  const lang   = getLang();
  const labels = STATIC[lang]?.posLabels ?? STATIC.es.posLabels;

  grid.innerHTML = '';
  for (const pos of POSITION_ORDER) {
    const player   = state.roster.players.find(p => p.position === pos);
    const solved   = state.solvedSlots.has(pos);
    const revealed = state.revealedLetters[pos] ?? 0;
    const hint     = !solved && revealed > 0 ? getMaskedName(player, revealed) : null;

    const slot = document.createElement('div');
    slot.className = 'player-slot ' + (solved ? 'slot-solved' : hint ? 'slot-hint' : 'slot-empty');
    slot.dataset.position = pos;

    if (solved) {
      slot.innerHTML = `
        <div class="slot-position">${labels[pos] ?? pos}</div>
        <div class="slot-name">${player.name}</div>
        <div class="slot-real">${player.real}</div>
        <div class="slot-flag">${player.flag}</div>
        <div class="slot-check">✓</div>
      `;
    } else if (hint) {
      slot.innerHTML = `
        <div class="slot-position">${labels[pos] ?? pos}</div>
        <div class="slot-name">${hint}</div>
      `;
    } else {
      slot.innerHTML = `
        <div class="slot-position">${labels[pos] ?? pos}</div>
        <div class="slot-name">?</div>
      `;
    }

    grid.appendChild(slot);
  }
}

/* ─── Counters ───────────────────────────────────────────── */
function renderCounters() {
  $('counter-attempts').textContent = state.attempts;
  $('counter-solved').textContent   = `${state.solvedSlots.size}/5`;
}

/* ─── Hint progress ──────────────────────────────────────── */
function renderHintProgress() {
  const el   = $('hint-progress');
  const lang = getLang();

  if (state.wrongCount === 0 || state.wrongCount % HINTS_EVERY_N_WRONGS === 0) {
    el.classList.add('hidden');
    return;
  }

  const n = nextRevealIn(state.wrongCount, HINTS_EVERY_N_WRONGS);
  const text = lang === 'en'
    ? `Next hint in ${n} wrong answer${n !== 1 ? 's' : ''}`
    : `Próxima pista en ${n} error${n !== 1 ? 'es' : ''}`;

  el.textContent = text;
  el.classList.remove('hidden');
}

/* ─── History ────────────────────────────────────────────── */
function renderHistory() {
  const container = $('guess-history');
  container.innerHTML = '';

  const list = [...state.guesses].reverse();
  for (const g of list) {
    const item = document.createElement('div');
    item.className = `guess-item ${g.correct ? 'correct' : 'wrong'}`;

    const lang   = getLang();
    const labels = STATIC[lang]?.posLabels ?? STATIC.es.posLabels;
    const posLabel = g.correct ? ` — ${labels[g.position] ?? g.position}` : '';

    item.innerHTML = `
      <span class="guess-item-icon">${g.correct ? '✓' : '✗'}</span>
      <span class="guess-item-name">${g.name}</span>
      <span class="guess-item-pos">${posLabel}</span>
    `;
    container.appendChild(item);
  }
}

/* ─── Submit guess ───────────────────────────────────────── */
function submitGuess(inputName) {
  const name = inputName.trim();
  if (!name) { shakeInput(); return; }

  const alreadyUsed = state.guesses.some(g => g.name.toLowerCase() === name.toLowerCase());
  if (alreadyUsed) { shakeInput(); return; }

  state.attempts++;

  const player = state.roster.players.find(
    p => p.name.toLowerCase() === name.toLowerCase()
  );

  if (player && !state.solvedSlots.has(player.position)) {
    // Correct
    state.solvedSlots.add(player.position);
    state.guesses.push({ name: player.name, correct: true, position: player.position });
  } else {
    // Wrong
    state.wrongCount++;
    state.guesses.push({ name, correct: false, position: null });

    // Reveal hint every N wrongs
    if (state.wrongCount % HINTS_EVERY_N_WRONGS === 0) {
      const target = getHintTarget(state.roster.players, state.solvedSlots);
      if (target) {
        const cur = state.revealedLetters[target.position] ?? 0;
        state.revealedLetters[target.position] = cur + 1;
      }
    }
  }

  $('guess-input').value = '';
  AC.close($('autocomplete-list'));
  renderSlots();
  renderHistory();
  renderCounters();
  renderHintProgress();

  if (state.solvedSlots.size === 5) {
    setTimeout(() => {
      state.gameStatus = 'win';
      showResult();
    }, 400);
  }
}

function shakeInput() {
  const input = $('guess-input');
  input.classList.remove('shake');
  void input.offsetWidth; // reflow
  input.classList.add('shake');
  input.addEventListener('animationend', () => input.classList.remove('shake'), { once: true });
}

/* ─── Surrender ──────────────────────────────────────────── */
function surrender() {
  state.gameStatus = 'surrender';
  showResult();
}

/* ─── Result overlay ─────────────────────────────────────── */
function showResult() {
  const lang    = getLang();
  const isWin   = state.gameStatus === 'win';

  $('result-icon').textContent  = isWin ? '🏆' : '💀';
  $('result-title').textContent = isWin ? t('resultWin') : t('resultLose');
  $('result-title').className   = `result-title ${isWin ? 'win' : 'lose'}`;

  const attLabel = lang === 'en'
    ? `${state.attempts} attempt${state.attempts !== 1 ? 's' : ''} — ${state.solvedSlots.size}/5 solved`
    : `${state.attempts} intento${state.attempts !== 1 ? 's' : ''} — ${state.solvedSlots.size}/5 acertados`;
  $('result-attempts').textContent = attLabel;

  // Roster grid
  const rosterEl = $('result-roster');
  rosterEl.innerHTML = '';
  const labels = STATIC[lang]?.posLabels ?? STATIC.es.posLabels;

  for (const pos of POSITION_ORDER) {
    const player  = state.roster.players.find(p => p.position === pos);
    const guessed = state.solvedSlots.has(pos);
    const card    = document.createElement('div');
    card.className = `result-player ${guessed ? 'guessed' : 'missed'}`;
    card.innerHTML = `
      <div class="result-player-pos">${labels[pos] ?? pos}</div>
      <div class="result-player-flag">${player.flag}</div>
      <div class="result-player-name">${player.name}</div>
    `;
    rosterEl.appendChild(card);
  }

  $('result-overlay').classList.remove('hidden');
  $('search-section').classList.add('hidden');

  // Disable inputs
  $('guess-input').disabled    = true;
  $('btn-submit').disabled     = true;
  $('btn-surrender').disabled  = true;

  if (isWin) particles?.launchConfetti();
}

/* ─── Autocomplete ───────────────────────────────────────── */

function updateAutocomplete(query) {
  const list = $('autocomplete-list');
  const used = new Set(state.guesses.map(g => g.name.toLowerCase()));
  const q    = query.trim().toLowerCase();

  if (!q) { AC.close(list); return; }

  const matches = ALL_PLAYERS
    .filter(p => p.name.toLowerCase().includes(q) && !used.has(p.name.toLowerCase()))
    .slice(0, 10);

  AC.render(matches, list, query);
}

function selectAutocomplete(name) {
  $('guess-input').value = name;
  AC.close($('autocomplete-list'));
  submitGuess(name);
}


/* ─── Event Listeners ────────────────────────────────────── */
function bindEvents() {
  const input       = $('guess-input');
  const btnSubmit   = $('btn-submit');
  const btnSurr     = $('btn-surrender');
  const btnResult   = $('result-btn');

  input.addEventListener('input', () => updateAutocomplete(input.value));

  input.addEventListener('keydown', e => {
    const list = $('autocomplete-list');
    if (e.key === 'ArrowDown') { e.preventDefault(); const n = AC.navigate(1, list); if (n) input.value = n; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const n = AC.navigate(-1, list); if (n) input.value = n; }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const active = AC.getActive(list);
      if (active) { selectAutocomplete(active); return; }
      submitGuess(input.value);
    }
    else if (e.key === 'Escape') AC.close(list);
  });

  input.addEventListener('blur', () => setTimeout(() => AC.close($('autocomplete-list')), 150));

  $('autocomplete-list').addEventListener('mousedown', e => {
    e.preventDefault(); // evita que el blur cierre el dropdown antes del click
    const item = e.target.closest('.autocomplete-item');
    if (item) selectAutocomplete(item.dataset.name);
  });

  btnSubmit.addEventListener('click', () => submitGuess(input.value));

  btnSurr.addEventListener('click', () => {
    if (state.gameStatus === 'playing') surrender();
  });

  btnResult.addEventListener('click', () => initGame());

  // Re-render on language change
  document.addEventListener('langchange', () => {
    applyStaticTranslations(STATIC);
    renderSlots();
    renderHistory();
    renderHintProgress();
  });
}

/* ─── Boot ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  mountSwitcher();
  mountGameNav();
  applyStaticTranslations(STATIC);
  particles = new ParticlesComponent({
    particleCanvas: $('canvas-particles'),
    confettiCanvas: $('canvas-confetti'),
  });
  bindEvents();
  initGame();
});
