import { PLAYERS }          from '../data/players.js';
import { generateAutoHint } from './hintEngine.js';

/** Maximum guesses per round. */
const MAX_ATTEMPTS = 6;

/** Teams revealed at the start of each round. */
const INITIAL_REVEAL = 2;

/** Storage key for persistent stats. */
const STORAGE_KEY = 'lolguess_stats';

// ─── Internal state ───────────────────────────────────────────────────────────

let currentPlayer  = null;
let attempts       = [];   // { name: string, correct: boolean, isHint?: boolean }[]
let hintsLog       = [];   // { type: 'wrong'|'manual', text: string, detail?: string }[]
let revealedCount  = INITIAL_REVEAL;
let hintUsed       = false;
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

function resetQueue() {
  queue = [...Array(PLAYERS.length).keys()].sort(() => Math.random() - 0.5);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Snapshot of the current state (immutable copy). */
export function getState() {
  return {
    currentPlayer,
    attempts:      [...attempts],
    hintsLog:      [...hintsLog],
    revealedCount,
    hintUsed,
    roundOver,
    won,
    stats:         { ...stats },
  };
}

/** Names already guessed this round (lower-cased). */
export function getAttemptedNames() {
  return attempts.map((a) => a.name.toLowerCase());
}

/** How many guesses remain. */
export function getRemainingAttempts() {
  return MAX_ATTEMPTS - attempts.length;
}

/** Load the next player from the queue, resetting round state. */
export function nextPlayer() {
  if (!queue.length) resetQueue();
  const idx = queue.pop();
  currentPlayer = PLAYERS[idx];
  attempts      = [];
  hintsLog      = [];
  revealedCount = Math.min(INITIAL_REVEAL, currentPlayer.career.length);
  hintUsed      = false;
  roundOver     = false;
  won           = false;
}

/**
 * Submit a guess.
 * @param {string} name
 * @returns {{ correct: boolean, finished: boolean } | null} null if round is over
 */
export function guess(name) {
  if (roundOver) return null;

  const correct =
    name.trim().toLowerCase() === currentPlayer.name.toLowerCase();

  attempts.push({ name, correct });

  if (correct) {
    won       = true;
    roundOver = true;
    stats.wins++;
    stats.played++;
    stats.streak++;
    saveStats();
    return { correct: true, finished: true };
  }

  // Auto hint on wrong answer
  const detail = generateAutoHint(name, currentPlayer);
  hintsLog.push({ type: 'wrong', text: `"${name}" es incorrecto.`, detail });

  // Reveal one more career entry
  if (revealedCount < currentPlayer.career.length) revealedCount++;

  if (attempts.length >= MAX_ATTEMPTS) {
    roundOver = true;
    won       = false;
    stats.played++;
    stats.streak = 0;
    saveStats();
    return { correct: false, finished: true };
  }

  return { correct: false, finished: false };
}

/**
 * Spend 1 attempt slot to reveal the special hint.
 * @returns {{ used: boolean, finished: boolean } | false} false if already used or round over
 */
export function useHint() {
  if (hintUsed || roundOver) return false;

  hintUsed = true;
  hintsLog.push({ type: 'manual', text: currentPlayer.hint });
  attempts.push({ name: '💡 Pista usada', correct: false, isHint: true });

  if (attempts.length >= MAX_ATTEMPTS) {
    roundOver = true;
    won       = false;
    stats.played++;
    stats.streak = 0;
    saveStats();
    return { used: true, finished: true };
  }

  return { used: true, finished: false };
}

/** Forfeit the current round without counting it as a win. */
export function skip() {
  if (roundOver) return;
  roundOver = true;
  won       = false;
  stats.played++;
  stats.streak = 0;
  saveStats();
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

loadStats();
resetQueue();
nextPlayer();
