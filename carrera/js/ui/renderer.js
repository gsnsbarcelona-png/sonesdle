/**
 * Renderer — reads state and updates the DOM.
 * Has no side effects beyond DOM mutations.
 */

import { MAX_ATTEMPTS } from '../core/state.js';
import { t } from '../i18n.js';

// ─── Region badge helper ───────────────────────────────────────────────────────

const REGION_CLASSES = { LCK: 'LCK', LPL: 'LPL', LEC: 'LEC', LCS: 'LCS' };

/** @param {string} region */
function regionClass(region) {
  return REGION_CLASSES[region] ?? 'OTHER';
}

// ─── Cached DOM elements (set once on first update) ───────────────────────────

let dom = null;
function getDOM() {
  if (dom) return dom;
  dom = {
    timeline:   document.getElementById('timeline'),
    dots:       document.getElementById('progress-dots'),
    hintsLog:   document.getElementById('hints-log'),
    statWins:   document.getElementById('stat-wins'),
    statPlayed: document.getElementById('stat-played'),
    statStreak: document.getElementById('stat-streak'),
    input:      document.getElementById('guess-input'),
    btnSubmit:  document.getElementById('btn-submit'),
    btnHint:    document.getElementById('btn-hint'),
    btnSkip:    document.getElementById('btn-skip'),
    btnNext:    document.getElementById('btn-next'),
    posBadge:   document.getElementById('position-badge'),
  };
  return dom;
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

/**
 * @param {import('../data/players.js').Player} player
 * @param {number} revealedCount
 */
function renderTimeline(player, revealedCount) {
  const { timeline } = getDOM();
  const shown  = player.career.slice(0, revealedCount);
  const hidden = player.career.length - revealedCount;

  const itemsHTML = shown
    .map(
      (c) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <span class="timeline-year">${c.year}</span>
        <span class="timeline-team">${c.team}</span>
        <span class="region-badge ${regionClass(c.region)}">${c.region}</span>
      </div>`
    )
    .join('');

  const moreHTML =
    hidden > 0
      ? `<div class="timeline-more">
           <div class="more-dots"><span></span><span></span><span></span></div>
           <span>${t('stagesLeft', hidden)}</span>
         </div>`
      : '';

  timeline.innerHTML = itemsHTML + moreHTML;
}

/**
 * @param {{ name: string, correct: boolean, isHint?: boolean }[]} attempts
 */
function renderDots(attempts) {
  const { dots } = getDOM();
  dots.innerHTML = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const a = attempts[i];
    let cls = 'dot';
    if (a) {
      if (a.isHint)       cls += ' hint';
      else if (a.correct) cls += ' correct';
      else                cls += ' wrong';
    } else if (i === attempts.length) {
      cls += ' current';
    }
    return `<div class="${cls}"></div>`;
  }).join('');
}

/**
 * @param {{ type: string, text: string, detail?: string }[]} hintsLog
 */
function renderHintsLog(hintsLog) {
  const { hintsLog: el } = getDOM();
  el.innerHTML = hintsLog
    .map((h) => {
      if (h.type === 'wrong') {
        return `
          <div class="hint-item wrong">
            <span class="hint-icon">✗</span>
            <div>
              <span class="hint-player">${h.text}</span>
              ${h.detail ? `<br><span class="hint-text">${h.detail}</span>` : ''}
            </div>
          </div>`;
      }
      if (h.type === 'manual') {
        return `
          <div class="hint-item manual">
            <span class="hint-icon">💡</span>
            <span class="hint-text">${h.text}</span>
          </div>`;
      }
      return '';
    })
    .join('');
}

/** @param {{ wins: number, played: number, streak: number }} stats */
function renderStats(stats) {
  const { statWins, statPlayed, statStreak } = getDOM();
  statWins.textContent   = stats.wins;
  statPlayed.textContent = stats.played;
  statStreak.textContent = stats.streak;
}

/** @param {object} state */
function renderControls(state) {
  const { roundOver, hintUsed, revealedCount, currentPlayer } = state;
  const { input, btnSubmit, btnHint, btnSkip, btnNext, posBadge } = getDOM();

  // Position badge
  posBadge.textContent   = hintUsed ? currentPlayer.position : '';
  posBadge.classList.toggle('hidden', !hintUsed);

  const noMoreHints = hintUsed && revealedCount >= currentPlayer.career.length;

  if (roundOver) {
    input.disabled    = true;
    btnSubmit.disabled = true;
    btnHint.classList.add('hidden');
    btnSkip.classList.add('hidden');
    btnNext.classList.add('visible');
  } else {
    input.disabled     = false;
    btnSubmit.disabled = false;
    btnNext.classList.remove('visible');

    btnHint.classList.toggle('hidden', noMoreHints);
    btnSkip.classList.toggle('hidden', !noMoreHints);
    btnHint.disabled = false;
    btnSkip.disabled = false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full DOM update from a state snapshot.
 *
 * @param {ReturnType<import('../core/state.js').getState>} state
 */
export function update(state) {
  renderTimeline(state.currentPlayer, state.revealedCount);
  renderDots(state.attempts);
  renderHintsLog(state.hintsLog);
  renderStats(state.stats);
  renderControls(state);
}
