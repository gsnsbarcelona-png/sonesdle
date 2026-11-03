import { mountSwitcher, applyStaticTranslations, getLang } from '../../shared/lang.js';
import { mountGameNav } from '../../shared/nav.js';
import { recordResult, getTodayDaily, today } from '../../shared/auth.js';
import { T, t } from './i18n.js';
import { esc } from '../../shared/js/escape.js';
import { loadJson, showLoadError } from '../../shared/js/data.js';
import { setupDialog } from '../../shared/js/a11y.js';
import { store } from '../../shared/js/storage.js';

const LIVES = 4;
const DAILY_KEY = 'familias_daily';
const SQUARE = { 1: '🟨', 2: '🟩', 3: '🟦', 4: '🟪' };
const COLOR = { 1: 'yellow', 2: 'green', 3: 'blue', 4: 'purple' };

mountSwitcher();
mountGameNav();
applyStaticTranslations(T);

const $ = id => document.getElementById(id);
const DAY = today();   // no cambia si se cruza la medianoche UTC

setupDialog($('endOverlay'), { closeSelector: '#btnClose' });

const [players, schedule, bank] = await Promise.all([
  loadJson('./data/players.json'),
  loadJson('./data/schedule.json').catch(() => ({})),
  loadJson('./data/bank.json').catch(() => []),
]).catch(showLoadError);

const state = {
  mode: 'daily', puzzle: null, order: [], solved: [], selected: [],
  guesses: [], over: false, won: false, busy: false,
};
const mistakes = () => state.guesses.filter(g => !groupOfGuess(g)).length;
const lives = () => LIVES - mistakes();

// ── Utilidades ─────────────────────────────────────────────────

/** Barajado con semilla: el diario sale igual en cada recarga del mismo día. */
function seeded(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6D2B79F5) >>> 0;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rnd = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const keysOf = puzzle => puzzle.groups.flatMap(g => g.players);
const name = g => (getLang() === 'en' ? g.en : g.es);
/** Grupo que forman exactamente estos 4 jugadores, si lo forman. */
const groupOfGuess = guess => state.puzzle.groups.find(g => guess.every(k => g.players.includes(k)));
const groupOfKey = key => state.puzzle.groups.find(g => g.players.includes(key));

// ── Partidas ───────────────────────────────────────────────────

/** Recompone el estado a partir de la lista de intentos (así se guarda y se restaura). */
function replay(guesses) {
  state.guesses = [];
  state.solved = [];
  for (const guess of guesses) {
    state.guesses.push(guess);
    const g = groupOfGuess(guess);
    if (g && !state.solved.includes(g)) state.solved.push(g);
  }
  finishIfOver();
}

function finishIfOver() {
  state.won = state.solved.length === 4;
  state.over = state.won || lives() <= 0;
  if (state.over && !state.won) {
    // Sin vidas: se enseñan las familias que faltaban, de fácil a difícil
    const left = state.puzzle.groups.filter(g => !state.solved.includes(g)).sort((a, b) => a.level - b.level);
    state.solved.push(...left);
  }
}

function begin(puzzle, mode, guesses = []) {
  Object.assign(state, { mode, puzzle, selected: [], busy: false });
  const rnd = mode === 'daily' ? seeded('familias-' + puzzle.id) : Math.random;
  state.order = shuffle(keysOf(puzzle), rnd);
  replay(guesses);
  render();
}

async function startDaily() {
  const puzzle = schedule[DAY];
  if (!puzzle) {
    Object.assign(state, { mode: 'daily', puzzle: null, over: false });
    render();
    return;
  }
  const saved = store.get(DAILY_KEY);
  begin(puzzle, 'daily', saved?.date === DAY && saved.id === puzzle.id ? saved.guesses : []);
  if (state.over) return showEnd();
  // Jugado ya en otro dispositivo con la misma cuenta
  const remote = await getTodayDaily('familias');
  if (remote?.details?.guesses && state.mode === 'daily' && !state.over) {
    begin(puzzle, 'daily', remote.details.guesses);
    saveDaily();
    showEnd();
  }
}

function startFree() {
  const pool = bank.filter(p => p.id !== state.puzzle?.id);
  const list = pool.length ? pool : bank;
  if (!list.length) return;
  begin(list[Math.floor(Math.random() * list.length)], 'free');
}

function saveDaily() {
  if (state.mode === 'daily') store.set(DAILY_KEY, { date: DAY, id: state.puzzle.id, guesses: state.guesses });
}

function submit() {
  if (state.over || state.busy || state.selected.length !== 4) return;
  const guess = [...state.selected];
  const sig = [...guess].sort().join('|');
  if (state.guesses.some(g => [...g].sort().join('|') === sig)) return toast(t('repeated'));

  const hit = groupOfGuess(guess);
  const best = hit ? 4 : Math.max(...state.puzzle.groups.filter(g => !state.solved.includes(g))
    .map(g => guess.filter(k => g.players.includes(k)).length));
  state.guesses.push(guess);
  state.selected = [];
  if (hit) state.solved.push(hit);
  else {
    shakeSelected(guess);
    toast(best === 3 ? t('oneAway') : '');
  }
  finishIfOver();
  saveDaily();
  render();
  if (state.over) {
    recordResult({ game: 'familias', mode: state.mode, won: state.won, attempts: state.guesses.length,
                   details: { puzzle: state.puzzle.id, mistakes: mistakes(), guesses: state.guesses } });
    state.busy = true;
    setTimeout(() => { state.busy = false; showEnd(); }, 900);
  }
}

function shakeSelected(guess) {
  // el pintado de después recrea los botones: la sacudida se aplica antes de repintar
  document.querySelectorAll('.tile.on').forEach(el => { if (guess.includes(el.dataset.key)) el.classList.add('shake'); });
}

// ── Pintado ────────────────────────────────────────────────────

function render() {
  const ok = !!state.puzzle;
  $('board').hidden = !ok;
  if (!ok) {
    $('solved').innerHTML = '';
    $('board').innerHTML = '';
    $('lives').innerHTML = '';
    $('dayInfo').textContent = t('noPuzzle');
    ['btnShuffle', 'btnClear', 'btnSubmit'].forEach(id => { $(id).disabled = true; });
    renderModes();
    return;
  }
  renderModes();
  $('dayInfo').textContent = '';
  $('solved').innerHTML = state.solved.map(g => `
    <div class="group ${COLOR[g.level]}">
      <div class="group-title">${esc(name(g))}</div>
      <div class="group-names">${g.players.map(k => esc(players[k]?.n ?? k)).join(' · ')}</div>
    </div>`).join('');
  const solvedKeys = new Set(state.solved.flatMap(g => g.players));
  $('board').innerHTML = state.order.filter(k => !solvedKeys.has(k)).map(k => {
    const p = players[k] ?? { n: k, i: '' };
    const on = state.selected.includes(k);
    return `<button class="tile${on ? ' on' : ''}" type="button" data-key="${esc(k)}" aria-pressed="${on}" aria-label="${esc(p.n)}${on ? ', ' + t('selected') : ''}">
      ${p.i ? `<img class="ph" src="${esc(p.i)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="ph"></span>'}
      <span class="nick">${esc(p.n)}</span></button>`;
  }).join('');
  $('lives').innerHTML = Array.from({ length: LIVES }, (_, i) =>
    `<span class="life${i >= lives() ? ' lost' : ''}"></span>`).join('');
  $('lives').setAttribute('aria-label', t('lives', lives()));
  $('btnSubmit').disabled = state.over || state.selected.length !== 4;
  $('btnClear').disabled = state.over || !state.selected.length;
  $('btnShuffle').disabled = state.over;
}

function renderModes() {
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
    b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode));
  });
}

let toastTimer;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').classList.toggle('show', !!msg);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

// ── Resultado ──────────────────────────────────────────────────

let countdown;

function showEnd() {
  $('endTitle').textContent = state.won ? t('won', mistakes()) : t('lost');
  $('endGroups').innerHTML = [...state.puzzle.groups].sort((a, b) => a.level - b.level).map(g => `
    <div class="group ${COLOR[g.level]}">
      <div class="group-title">${esc(name(g))}</div>
      <div class="group-names">${g.players.map(k => esc(players[k]?.n ?? k)).join(' · ')}</div>
    </div>`).join('');
  $('btnShare').classList.toggle('hidden', state.mode !== 'daily');
  $('btnAgain').classList.toggle('hidden', state.mode !== 'free');
  $('endOverlay').classList.remove('hidden');

  clearInterval(countdown);
  $('endNext').textContent = '';
  if (state.mode === 'daily') {
    const tick = () => {
      const now = new Date();
      const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const s = Math.max(0, Math.floor((next - now) / 1000));
      const hms = [s / 3600, (s % 3600) / 60, s % 60].map(n => String(Math.floor(n)).padStart(2, '0')).join(':');
      $('endNext').textContent = t('nextIn', hms);
      if (s === 0) location.reload();
    };
    tick();
    countdown = setInterval(tick, 1000);
  }
}

function hideEnd() {
  $('endOverlay').classList.add('hidden');
  clearInterval(countdown);
}

async function share() {
  const date = DAY.split('-').reverse().join('/');
  const grid = state.guesses.map(g =>
    g.map(k => SQUARE[groupOfKey(k).level]).sort().join('')).join('\n');
  const text = `Family Grid ${date} · ${state.won ? mistakes() : 'X'}/${LIVES - 1}\n\n${grid}\n\nlolprogames.com/familias`;
  try { await navigator.clipboard.writeText(text); toast(t('copied')); }
  catch { prompt('', text); }
}

// ── Eventos ────────────────────────────────────────────────────

$('board').addEventListener('click', e => {
  const tile = e.target.closest('.tile');
  if (!tile || state.over || state.busy) return;
  const key = tile.dataset.key;
  if (state.selected.includes(key)) state.selected = state.selected.filter(k => k !== key);
  else if (state.selected.length < 4) state.selected.push(key);
  else return;
  render();
  document.querySelector(`.tile[data-key="${CSS.escape(key)}"]`)?.focus();
});

$('btnSubmit').addEventListener('click', submit);
$('btnClear').addEventListener('click', () => { state.selected = []; render(); });
$('btnShuffle').addEventListener('click', () => { state.order = shuffle(state.order); render(); });

document.querySelector('.modes').addEventListener('click', e => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  if (btn.dataset.mode === 'daily') {
    if (state.mode === 'daily' && state.over) showEnd();
    else if (state.mode !== 'daily') startDaily();
  } else if (state.mode !== 'free') startFree();
});

$('btnShare').addEventListener('click', share);
$('btnAgain').addEventListener('click', () => { hideEnd(); startFree(); });
$('btnClose').addEventListener('click', hideEnd);
$('endOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) hideEnd(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.target.closest?.('button') && $('endOverlay').classList.contains('hidden')) submit();
});

document.addEventListener('langchange', () => {
  applyStaticTranslations(T);
  if (state.puzzle) render();
  if (!$('endOverlay').classList.contains('hidden')) showEnd();
});

startDaily();
