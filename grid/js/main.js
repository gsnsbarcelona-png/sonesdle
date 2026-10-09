import { GameFactory }            from './GameFactory.js';
import { LoLPlayerRepository }    from './repositories/LoLPlayerRepository.js';
import { LoLCategoryRepository }  from './repositories/LoLCategoryRepository.js';
import { EVENTS }                 from './events.js';
import { mountSwitcher, applyStaticTranslations, getLang } from '../../shared/lang.js';
import { mountGameNav } from '../../shared/nav.js';
import { getResults, computeStats, today } from '../../shared/auth.js';

// ── Traducciones estáticas del HTML ─────────────────────────
const STATIC = {
  es: {
    headerSub: 'Completa las 9 casillas · Pro Players',
    daily: 'Reto diario', free: 'Modo libre',
    placeholder: 'Nombre del pro player…',
    confirm: 'Confirmar', cancel: 'Cancelar',
    victory: '¡Victoria!', victorySub: 'Todas las casillas completadas', playAgain: 'Jugar de nuevo',
    gameOver: 'Game Over', gameOverSub: 'Se acabaron las vidas', tryAgain: 'Intentar de nuevo',
    seeSolutions: 'Ver soluciones', seeBoard: 'Ver tablero', share: 'Compartir',
    freePlay: 'Jugar modo libre', copied: '¡Copiado!', streak: 'Racha', best: 'Mejor',
  },
  en: {
    headerSub: 'Fill all 9 cells · Pro Players',
    daily: 'Daily', free: 'Free play',
    placeholder: 'Pro player name…',
    confirm: 'Confirm', cancel: 'Cancel',
    victory: 'Victory!', victorySub: 'All cells completed', playAgain: 'Play again',
    gameOver: 'Game Over', gameOverSub: 'Out of lives', tryAgain: 'Try again',
    seeSolutions: 'See solutions', seeBoard: 'See board', share: 'Share',
    freePlay: 'Play free mode', copied: 'Copied!', streak: 'Streak', best: 'Best',
  },
};
const tx = key => STATIC[getLang()]?.[key] ?? STATIC.es[key];

mountSwitcher();
mountGameNav();
applyStaticTranslations(STATIC);

// ── Carga de datos e inicio del juego ────────────────────────
const [players, categories, schedule] = await Promise.all([
  fetch('./data/players.json').then(r => r.json()),
  fetch('./data/categories.json').then(r => r.json()),
  fetch('./data/schedule.json').then(r => r.json()).catch(() => ({})),
]);

const session = GameFactory.create({
  playerRepository:   new LoLPlayerRepository(players),
  categoryRepository: new LoLCategoryRepository(categories),
  schedule,
});

// ── Modo diario / libre ──────────────────────────────────────
const modeButtons = document.querySelectorAll('.mode-btn');
const shareButtons = document.querySelectorAll('.btn-share');
const replayButtons = ['btnVictoryReplay', 'btnGameoverReplay', 'btnBoardReplay'].map(id => document.getElementById(id));

/** Botones según el modo: en el diario se comparte y "jugar de nuevo" lleva al libre. */
function renderMode() {
  modeButtons.forEach(b => {
    b.classList.toggle('active', b.dataset.mode === session.mode);
    b.disabled = b.dataset.mode === 'daily' && !session.hasDaily;
  });
  shareButtons.forEach(b => b.classList.toggle('hidden', session.mode !== 'daily'));
  replayButtons.forEach(b => {
    b.textContent = session.mode === 'daily' ? tx('freePlay') : tx(b.dataset.i18n);
  });
}

modeButtons.forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode !== session.mode) session.start(b.dataset.mode);
}));

shareButtons.forEach(b => b.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(session.shareText());
    b.textContent = tx('copied');
    setTimeout(() => { b.textContent = tx('share'); }, 1500);
  } catch { prompt('', session.shareText()); }
}));

// ── Racha del reto diario (pantalla final) ───────────────────
const streakEls = document.querySelectorAll('.end-streak');
let streak = null;

function renderStreak() {
  streakEls.forEach(el => {
    el.classList.toggle('hidden', !streak);
    if (streak) el.textContent = `🔥 ${tx('streak')} ${streak.currentStreak} · ${tx('best')} ${streak.maxStreak}`;
  });
}

/** Con la cuenta, el reto de hoy puede no haberse subido aún: se cuenta aquí. */
async function showStreak({ mode }, won) {
  if (mode !== 'daily') return;
  const results = (await getResults('grid'))
    .filter(r => !(r.mode === 'daily' && r.played_on === today()));
  results.push({ mode: 'daily', played_on: today(), won });
  streak = computeStats(results);
  renderStreak();
}

session.bus.on(EVENTS.GAME_WON,  p => showStreak(p, true));
session.bus.on(EVENTS.GAME_LOST, p => showStreak(p, false));
session.bus.on(EVENTS.GAME_STARTED, () => { streak = null; renderStreak(); renderMode(); });
document.addEventListener('langchange', () => { applyStaticTranslations(STATIC); renderMode(); renderStreak(); });

session.start();
