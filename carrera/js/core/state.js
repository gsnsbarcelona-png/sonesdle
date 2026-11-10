import { PLAYERS }          from '../data/players.js';
import { compareGuess }     from './hintEngine.js';
import { recordResult }     from '../../../shared/auth.js';

/** Maximum guesses per round. */
export const MAX_ATTEMPTS = 6;

/** Etapas que se enseñan como mínimo al empezar una ronda. */
const MIN_INITIAL_REVEAL = 1;

/**
 * Hasta cuántas etapas se enseñan al empezar. La primera etapa de una carrera suele ser un equipo
 * que casi nadie conoce (Caps empezó en Enigma Esports, Rekkles en Fnatic.Beta) y con eso solo es
 * imposible acertar. Se enseñan etapas, en orden, hasta llegar a un equipo conocido.
 */
const MAX_INITIAL_REVEAL = 3;

/** Ligas mayores: una etapa con esta etiqueta es de un equipo que jugó en ella (ver build.py). */
const MAJOR_REGIONS = new Set(['LCK', 'LPL', 'LEC', 'LCS']);

/** Un equipo es "conocido" si aparece en la carrera de al menos tantos jugadores del juego. */
const KNOWN_TEAM_MIN = 3;

/** Cuántos jugadores han pasado por cada equipo (una vez por jugador). */
const TEAM_PLAYERS = new Map();
for (const p of PLAYERS) {
  for (const team of new Set(p.career.map((c) => c.team.toLowerCase()))) {
    TEAM_PLAYERS.set(team, (TEAM_PLAYERS.get(team) ?? 0) + 1);
  }
}

/** Una etapa es reconocible si el equipo jugó una liga mayor en ella o es de los más repetidos. */
function isKnownStage(stage) {
  return MAJOR_REGIONS.has(stage.region) || (TEAM_PLAYERS.get(stage.team.toLowerCase()) ?? 0) >= KNOWN_TEAM_MIN;
}

/**
 * Etapas visibles al empezar con `player`: de 1 a MAX_INITIAL_REVEAL, las justas para que aparezca
 * un equipo conocido. Si no hay ninguno en ese tramo, se enseña el tramo entero.
 * @param {{ career: { team: string, region: string }[] }} player
 */
export function initialReveal(player) {
  const limit = Math.min(MAX_INITIAL_REVEAL, player.career.length);
  for (let i = 0; i < limit; i++) {
    if (isKnownStage(player.career[i])) {
      return Math.max(i + 1, Math.min(MIN_INITIAL_REVEAL, player.career.length));
    }
  }
  return limit;
}

/** Storage key for persistent stats. */
const STORAGE_KEY = 'lolguess_stats';

/** Ronda en curso: así recargar la página no cambia de jugador ni devuelve los intentos. */
const ROUND_KEY = 'lolguess_round';

// ─── Internal state ───────────────────────────────────────────────────────────

let currentPlayer  = null;
let attempts       = [];   // { name: string, correct: boolean, isHint?: boolean }[]
let hintsLog       = [];   // { type: 'wrong', name: string, info: object }[]
let revealedCount  = MIN_INITIAL_REVEAL;
let hintsGiven     = 0;      // total manual hints used this round (>=1 means position revealed)
let roundOver      = false;
let won            = false;
let queue          = [];   // shuffled indices into PLAYERS
let stats          = { wins: 0, played: 0, streak: 0 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.wins   !== undefined) stats.wins   = saved.wins;
    if (saved.played !== undefined) stats.played = saved.played;
    if (saved.streak !== undefined) stats.streak = saved.streak;
  } catch (_) { /* ignore corrupt storage */ }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function saveRound() {
  try {
    localStorage.setItem(ROUND_KEY, JSON.stringify({
      player: currentPlayer.name, attempts, hintsLog, revealedCount, hintsGiven,
    }));
  } catch (_) { /* modo privado: la ronda no sobrevivirá a una recarga */ }
}

function clearRound() {
  try { localStorage.removeItem(ROUND_KEY); } catch (_) { /* nada que borrar */ }
}

/** Recupera la ronda guardada si es válida. Devuelve false si no hay o está dañada. */
function restoreRound() {
  try {
    const saved = JSON.parse(localStorage.getItem(ROUND_KEY) || 'null');
    const player = saved && PLAYERS.find((p) => p.name === saved.player);
    if (!player) return false;
    const okAttempts = Array.isArray(saved.attempts) && saved.attempts.length < MAX_ATTEMPTS
      && saved.attempts.every((a) => a && typeof a.name === 'string' && typeof a.correct === 'boolean');
    const okLog = Array.isArray(saved.hintsLog)
      && saved.hintsLog.every((h) => h && h.type === 'wrong' && typeof h.name === 'string' && h.info);
    const okReveal = Number.isInteger(saved.revealedCount)
      && saved.revealedCount >= Math.min(MIN_INITIAL_REVEAL, player.career.length)
      && saved.revealedCount <= player.career.length;
    if (!okAttempts || !okLog || !okReveal || !Number.isInteger(saved.hintsGiven) || saved.hintsGiven < 0) return false;

    currentPlayer = player;
    attempts      = saved.attempts;
    hintsLog      = saved.hintsLog;
    revealedCount = saved.revealedCount;
    hintsGiven    = saved.hintsGiven;
    roundOver     = false;
    won           = false;
    return true;
  } catch (_) { return false; }
}

function endRound(didWin) {
  clearRound();
  roundOver = true;
  won       = didWin;
  stats.played++;
  if (didWin) { stats.wins++; stats.streak++; }
  else         { stats.streak = 0; }
  saveStats();

  // Historial del usuario (cuenta de Google o este navegador)
  recordResult({
    game: 'carrera', mode: 'free', won: didWin, attempts: attempts.length,
    details: { player: currentPlayer.name, hints: hintsGiven },
  });
}

function resetQueue() {
  // Fisher-Yates: sort(() => Math.random() - 0.5) no baraja de forma uniforme
  queue = [...Array(PLAYERS.length).keys()];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Snapshot of the current state (immutable copy). */
export function getState() {
  return {
    currentPlayer,
    attempts:      [...attempts],
    hintsLog:      [...hintsLog],
    revealedCount,
    hintUsed:      hintsGiven >= 1,
    hintsGiven,
    roundOver,
    won,
    stats:         { ...stats },
  };
}

/** Names already guessed this round (lower-cased). */
export function getAttemptedNames() {
  return attempts.map((a) => a.name.toLowerCase());
}

/** Load the next player from the queue, resetting round state. */
export function nextPlayer() {
  if (!queue.length) resetQueue();
  const idx = queue.pop();
  currentPlayer = PLAYERS[idx];
  attempts      = [];
  hintsLog      = [];
  revealedCount = initialReveal(currentPlayer);
  hintsGiven    = 0;
  roundOver     = false;
  won           = false;
  saveRound();
}

/**
 * Submit a guess. Unknown or repeated names are rejected without using an attempt.
 * @param {string} name
 * @returns {{ correct: boolean, finished: boolean } | { invalid: true } | { duplicate: true } | null}
 *          null if the round is over
 */
export function guess(name) {
  if (roundOver) return null;

  const wanted = name.trim().toLowerCase();
  const guessed = PLAYERS.find((p) => p.name.toLowerCase() === wanted);
  if (!guessed) return { invalid: true };
  if (getAttemptedNames().includes(wanted)) return { duplicate: true };

  const correct = guessed.name === currentPlayer.name;
  attempts.push({ name: guessed.name, correct });

  if (correct) {
    endRound(true);
    return { correct: true, finished: true };
  }

  // Reveal one more career entry, then compare against what is now visible
  if (revealedCount < currentPlayer.career.length) revealedCount++;
  hintsLog.push({
    type: 'wrong',
    name: guessed.name,
    info: { ...compareGuess(guessed, currentPlayer, revealedCount), positionKnown: hintsGiven >= 1 },
  });

  if (attempts.length >= MAX_ATTEMPTS) {
    endRound(false);
    return { correct: false, finished: true };
  }

  saveRound();
  return { correct: false, finished: false };
}

/**
 * Spend 1 attempt slot to reveal a hint.
 * - 1st hint: reveals the player's position.
 * - Subsequent hints: reveal the next career stage.
 * @returns {{ used: boolean, finished: boolean } | false} false if round over or no more to reveal
 */
export function useHint() {
  if (roundOver) return false;

  // Check there is something left to reveal
  const isFirstHint = hintsGiven === 0;
  if (!isFirstHint && revealedCount >= currentPlayer.career.length) return false;
  // A hint on the last attempt would just lose the round
  if (attempts.length >= MAX_ATTEMPTS - 1) return false;

  hintsGiven++;
  attempts.push({ name: `Pista ${hintsGiven}`, correct: false, isHint: true });

  if (!isFirstHint) {
    revealedCount++;
  }

  if (attempts.length >= MAX_ATTEMPTS) {
    endRound(false);
    return { used: true, finished: true };
  }

  saveRound();
  return { used: true, finished: false };
}

/** Forfeit the current round without counting it as a win. */
export function skip() {
  if (roundOver) return;
  endRound(false);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

loadStats();
resetQueue();
if (!restoreRound()) nextPlayer();
