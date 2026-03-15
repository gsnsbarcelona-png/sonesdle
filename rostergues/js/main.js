import { ROSTERS }                             from './data/rosters.js';
import { pickRoster }                           from './services/RosterPickerService.js';
import { getHintTarget, getMaskedName, nextRevealIn } from './services/HintService.js';
import { mountSwitcher, applyStaticTranslations, getLang } from '../../shared/lang.js';
import { mountGameNav } from '../../shared/nav.js';

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
  closeAutocomplete();

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
  closeAutocomplete();
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

  if (isWin) launchConfetti();
}

/* ─── Autocomplete ───────────────────────────────────────── */
let acIndex = -1;

function updateAutocomplete(query) {
  const list    = $('autocomplete-list');
  const used    = new Set(state.guesses.map(g => g.name.toLowerCase()));
  const q       = query.trim().toLowerCase();

  if (!q) { closeAutocomplete(); return; }

  const matches = ALL_PLAYERS
    .filter(p => p.name.toLowerCase().includes(q) && !used.has(p.name.toLowerCase()))
    .slice(0, 10);

  if (!matches.length) { closeAutocomplete(); return; }

  acIndex       = -1;
  list.innerHTML = '';
  for (const m of matches) {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.dataset.name = m.name;
    item.innerHTML = `<span class="autocomplete-name">${m.name}</span><span class="autocomplete-pos">${m.position}</span>`;
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      selectAutocomplete(m.name);
    });
    list.appendChild(item);
  }
  list.classList.add('open');
}

function closeAutocomplete() {
  const list = $('autocomplete-list');
  list.innerHTML = '';
  list.classList.remove('open');
  acIndex = -1;
}

function selectAutocomplete(name) {
  $('guess-input').value = name;
  closeAutocomplete();
  submitGuess(name);
}

function navigateAutocomplete(dir) {
  const list  = $('autocomplete-list');
  const items = list.querySelectorAll('.autocomplete-item');
  if (!items.length) return;

  items[acIndex]?.classList.remove('active');
  acIndex = (acIndex + dir + items.length) % items.length;
  const active = items[acIndex];
  active.classList.add('active');
  $('guess-input').value = active.dataset.name;
}

/* ─── Particles ──────────────────────────────────────────── */
function initParticles() {
  const canvas = $('canvas-particles');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  let W, H;

  const GOLD = 'rgba(200,155,60,';
  const particles = Array.from({ length: 25 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.1 - Math.random() * 0.25,
    a: 0.15 + Math.random() * 0.45,
  }));

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.x += p.vx / W * 60;
      p.y += p.vy / H * 60;
      if (p.y < -0.02) p.y = 1.02;
      if (p.x < -0.02) p.x = 1.02;
      if (p.x >  1.02) p.x = -0.02;

      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = GOLD + p.a + ')';
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
}

/* ─── Confetti ───────────────────────────────────────────── */
function launchConfetti() {
  const canvas = $('canvas-confetti');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#c89b3c','#f0e6d3','#785a28','#00cc66','#ffffff'];
  const pieces = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 2,
    vy: 2 + Math.random() * 3,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.15,
    alpha: 1,
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of pieces) {
      if (p.alpha <= 0) continue;
      alive = true;
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.vrot;
      if (p.y > canvas.height * 0.7) p.alpha -= 0.018;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle   = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) {
      frame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
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
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateAutocomplete(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); navigateAutocomplete(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (list.classList.contains('open') && acIndex >= 0) {
        const active = list.querySelector('.autocomplete-item.active');
        if (active) { selectAutocomplete(active.dataset.name); return; }
      }
      submitGuess(input.value);
    }
    else if (e.key === 'Escape') closeAutocomplete();
  });

  input.addEventListener('blur', () => setTimeout(closeAutocomplete, 150));

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
  initParticles();
  bindEvents();
  initGame();
});
