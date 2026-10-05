import { mountSwitcher, applyStaticTranslations } from '../../shared/lang.js';
import { mountGameNav } from '../../shared/nav.js';
import { recordResult, getTodayDaily, today } from '../../shared/auth.js';
import { unlockGate } from '../../shared/js/beta.js';
import { T, t } from './i18n.js';

const ROWS = 6;
const LEN  = 5;
// Modo libre: "LCP" incluye a sus antecesoras (PCS y LMS, que en los datos van como "PCS")
const LEAGUES = [null, 'LCK', 'LPL', 'LEC', 'LCS', 'CBLOL', 'LCP'];
const LEAGUE_ALIASES = { LCP: ['LCP', 'PCS'] };
const DAILY_LEAGUES = ['LCK', 'LPL', 'LEC', 'LCS', 'CBLOL', 'LCP'];
const DAILY_KEY  = 'wordle_daily';
const LEAGUE_KEY = 'wordle_league';
const KB_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫'];
const EMOJI = { hit: '🟩', near: '🟨', miss: '⬛' };

mountSwitcher();
mountGameNav();
applyStaticTranslations(T);

const $ = id => document.getElementById(id);
const store = {
  get(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } },
};

await unlockGate();   // en pruebas: ver shared/js/beta.js

const [{ answers, guesses }, schedule] = await Promise.all([
  fetch('./data/words.json').then(r => r.json()),
  fetch('./data/schedule.json').then(r => r.json()).catch(() => ({})),
]);

// Palabra → jugadores con ese nombre (el más conocido primero)
const byWord = new Map();
for (const a of answers) byWord.set(a.w, [...(byWord.get(a.w) ?? []), a]);
const valid = new Set([...guesses, ...byWord.keys()]);

const state = {
  mode: 'daily', league: store.get(LEAGUE_KEY) ?? null,
  word: '', rows: [], current: '', over: false, won: false, busy: false,
};

// ── Palabras ───────────────────────────────────────────────────

const inLeague = (a, league) =>
  !league || a.leagues.some(l => (LEAGUE_ALIASES[league] ?? [league]).includes(l));

function dailyWord() {
  if (schedule[today()]) return schedule[today()];
  // Sin calendario (no debería pasar): palabra fija por fecha
  const pool = [...byWord.keys()].filter(w => byWord.get(w).some(a => a.leagues.some(l => DAILY_LEAGUES.includes(l)))).sort();
  let h = 0;
  for (const c of today()) h = (Math.imul(31, h) + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

function freeWord() {
  const pool = [...byWord.keys()].filter(w => byWord.get(w).some(a => inLeague(a, state.league)) && w !== state.word);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Colores de un intento, con letras repetidas bien contadas (como el Wordle original). */
function evaluate(guess, word) {
  const res  = Array(LEN).fill('miss');
  const left = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === word[i]) res[i] = 'hit';
    else left[word[i]] = (left[word[i]] ?? 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] !== 'hit' && left[guess[i]]) { res[i] = 'near'; left[guess[i]]--; }
  }
  return res;
}

// ── Partidas ───────────────────────────────────────────────────

async function startDaily() {
  Object.assign(state, { mode: 'daily', word: dailyWord(), rows: [], current: '', over: false, won: false });
  const saved = store.get(DAILY_KEY);
  if (saved?.date === today() && saved.word === state.word) {
    Object.assign(state, { rows: saved.rows, over: saved.over, won: saved.won });
  }
  render(true);
  if (state.over) return showEnd();
  // Jugado ya en otro dispositivo con la misma cuenta
  const remote = await getTodayDaily('wordle');
  if (remote && state.mode === 'daily' && !state.over) {
    Object.assign(state, { rows: remote.details?.rows ?? [], over: true, won: remote.won });
    saveDaily();
    render(true);
    showEnd();
  }
}

function startFree() {
  Object.assign(state, { mode: 'free', rows: [], current: '', over: false, won: false });
  state.word = freeWord();
  render(true);
}

function saveDaily() {
  if (state.mode !== 'daily') return;
  store.set(DAILY_KEY, { date: today(), word: state.word, rows: state.rows, over: state.over, won: state.won });
}

function submit() {
  if (state.current.length < LEN) return reject(t('tooShort'));
  if (!valid.has(state.current))   return reject(t('notPlayer'));
  state.rows.push(state.current);
  state.won  = state.current === state.word;
  state.over = state.won || state.rows.length === ROWS;
  state.current = '';
  saveDaily();
  render();
  if (state.over) {
    recordResult({ game: 'wordle', mode: state.mode, won: state.won, attempts: state.rows.length,
                   details: { word: state.word, rows: state.rows, league: state.mode === 'free' ? state.league : null } });
    state.busy = true;
    setTimeout(() => { state.busy = false; showEnd(); }, 900);
  }
}

function press(key) {
  if (state.over || state.busy) return;
  if (key === 'ENTER') return submit();
  if (key === 'BACK')  state.current = state.current.slice(0, -1);
  else if (/^[A-Z]$/.test(key) && state.current.length < LEN) state.current += key;
  renderRow(state.rows.length);
}

// ── Pintado ────────────────────────────────────────────────────

function render(restored = false) {
  $('board').innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'row' + (restored ? ' restored' : '');
    row.innerHTML = '<div class="tile"></div>'.repeat(LEN);
    $('board').appendChild(row);
    renderRow(r);
  }
  renderKeyboard();
  renderControls();
}

function renderRow(r) {
  const row = $('board').children[r];
  if (!row) return;
  const done  = r < state.rows.length;
  const text  = done ? state.rows[r] : r === state.rows.length ? state.current : '';
  const marks = done ? evaluate(text, state.word) : [];
  [...row.children].forEach((tile, i) => {
    tile.textContent = text[i] ?? '';
    tile.className = 'tile' + (done ? ' ' + marks[i] : text[i] ? ' filled' : '');
  });
}

function renderKeyboard() {
  const best = {};
  const rank = { miss: 1, near: 2, hit: 3 };
  for (const g of state.rows) {
    evaluate(g, state.word).forEach((m, i) => { if ((rank[m]) > (rank[best[g[i]]] ?? 0)) best[g[i]] = m; });
  }
  $('keyboard').innerHTML = KB_ROWS.map(row => `<div class="kb-row">${[...row].map(k => {
    const id = k === '⏎' ? 'ENTER' : k === '⌫' ? 'BACK' : k;
    const label = k === '⏎' ? t('enter') : k;
    return `<button class="key${k === '⏎' || k === '⌫' ? ' wide' : ''} ${best[k] ?? ''}" data-key="${id}" type="button">${label}</button>`;
  }).join('')}</div>`).join('');
}

function renderControls() {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
  $('leagues').classList.toggle('hidden', state.mode !== 'free');
  $('leagues').innerHTML = LEAGUES.map(l =>
    `<button class="league-btn${l === state.league ? ' active' : ''}" data-league="${l ?? ''}" type="button"
             ${l === 'LCP' ? `title="${t('lcpTip')}"` : ''}>${l ?? t('allLeagues')}</button>`).join('');
}

let toastTimer;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

function reject(msg) {
  toast(msg);
  const row = $('board').children[state.rows.length];
  row.classList.remove('shake');
  void row.offsetWidth;
  row.classList.add('shake');
}

// ── Resultado ──────────────────────────────────────────────────

const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const leagueLabel = l => l === 'PCS' ? 'PCS/LMS' : l;
const MAX_PATH = 5;
let countdown;

/** Recorrido de equipos con su liga: "Dignitas (LCS) → Misfits Gaming (LEC)". Solo los últimos si es largo. */
function pathHtml(path) {
  const shown = path.slice(-MAX_PATH).map(([team, league]) =>
    `${esc(team)} <span class="path-league">${leagueLabel(league)}</span>`);
  return (path.length > MAX_PATH ? '… → ' : '') + shown.join(' → ');
}

function showEnd() {
  const players = byWord.get(state.word) ?? [];
  const [p, ...others] = players;
  $('endTitle').textContent = state.won ? t('won', state.rows.length) : t('lost');
  $('endWord').textContent  = state.word;
  $('endPlayer').innerHTML = !p ? '' : `
    <div><b>${esc(p.name)}</b> · ${esc(p.role)}${p.years ? ` · ${p.years[0]}${p.years[1] !== p.years[0] ? `–${p.years[1]}` : ''}` : ''}</div>
    ${p.path?.length ? `<div class="path">${pathHtml(p.path)}</div>` : ''}
    <div class="tags">${p.leagues.map(l => `<span class="tag">${leagueLabel(l)}</span>`).join('')}</div>
    ${others.length ? `<div class="also">${t('also', others.map(o => `${esc(o.name)} (${o.leagues.join(', ')})`).join(' · '))}</div>` : ''}`;
  $('endPlayer').classList.toggle('hidden', !p);
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
  const date = today().split('-').reverse().join('/');
  const score = state.won ? state.rows.length : 'X';
  const grid = state.rows.map(g => evaluate(g, state.word).map(m => EMOJI[m]).join('')).join('\n');
  const text = `LoL Pro Wordle ${date} ${score}/6\n\n${grid}\n\nlolprogames.com/wordle`;
  try { await navigator.clipboard.writeText(text); toast(t('copied')); }
  catch { prompt('', text); }
}

// ── Eventos ────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!$('endOverlay').classList.contains('hidden')) return;
  if (e.target.closest?.('input, textarea, [contenteditable]')) return;
  if (e.key === 'Enter')     { e.preventDefault(); press('ENTER'); }
  else if (e.key === 'Backspace') press('BACK');
  else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
});

$('keyboard').addEventListener('click', e => {
  const key = e.target.closest('.key');
  if (key) { press(key.dataset.key); key.blur(); }
});

document.querySelector('.modes').addEventListener('click', e => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  if (btn.dataset.mode === 'daily') {
    if (state.mode === 'daily' && state.over) showEnd();
    else if (state.mode !== 'daily') startDaily();
  } else if (state.mode !== 'free') startFree();
});

$('leagues').addEventListener('click', e => {
  const btn = e.target.closest('.league-btn');
  if (!btn) return;
  state.league = btn.dataset.league || null;
  store.set(LEAGUE_KEY, state.league);
  startFree();
});

$('btnShare').addEventListener('click', share);
$('btnAgain').addEventListener('click', () => { hideEnd(); startFree(); });
$('btnClose').addEventListener('click', hideEnd);
$('endOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) hideEnd(); });

document.addEventListener('langchange', () => {
  applyStaticTranslations(T);
  renderKeyboard();
  renderControls();
  if (!$('endOverlay').classList.contains('hidden')) showEnd();
});

startDaily();
