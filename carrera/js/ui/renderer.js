/**
 * Renderer — reads state and updates the DOM.
 * Has no side effects beyond DOM mutations.
 */

const MAX_ATTEMPTS = 6;

// ─── Region badge helper ───────────────────────────────────────────────────────

const REGION_CLASSES = { LCK: 'LCK', LPL: 'LPL', LEC: 'LEC', LCS: 'LCS' };

/** @param {string} region */
function regionClass(region) {
  return REGION_CLASSES[region] ?? 'OTHER';
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

/**
 * @param {import('../data/players.js').Player} player
 * @param {number} revealedCount
 */
function renderTimeline(player, revealedCount) {
  const el     = document.getElementById('timeline');
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
           <span>${hidden} etapa${hidden > 1 ? 's' : ''} más por revelar</span>
         </div>`
      : '';

  el.innerHTML = itemsHTML + moreHTML;
}

/**
 * @param {{ name: string, correct: boolean, isHint?: boolean }[]} attempts
 */
function renderDots(attempts) {
  const el = document.getElementById('progress-dots');
  el.innerHTML = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const a = attempts[i];
    let cls = 'dot';
    if (a) {
      if (a.isHint)   cls += ' hint';
      else if (a.correct) cls += ' correct';
      else cls += ' wrong';
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
  const el = document.getElementById('hints-log');
  const sorted = [...hintsLog].sort((a, b) => (a.type === 'manual' ? -1 : 1) - (b.type === 'manual' ? -1 : 1));
  el.innerHTML = sorted
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
  document.getElementById('stat-wins').textContent   = stats.wins;
  document.getElementById('stat-played').textContent = stats.played;
  document.getElementById('stat-streak').textContent = stats.streak;
}

/** @param {boolean} roundOver @param {boolean} hintUsed */
function renderControls(roundOver, hintUsed) {
  const input     = document.getElementById('guess-input');
  const btnSubmit = document.getElementById('btn-submit');
  const btnHint   = document.getElementById('btn-hint');
  const btnSkip   = document.getElementById('btn-skip');
  const btnNext   = document.getElementById('btn-next');

  if (roundOver) {
    input.disabled     = true;
    btnSubmit.disabled = true;
    btnHint.disabled   = true;
    btnSkip.disabled   = true;
    btnNext.classList.add('visible');
  } else {
    input.disabled     = false;
    btnSubmit.disabled = false;
    btnHint.disabled   = hintUsed;
    btnSkip.disabled   = false;
    btnNext.classList.remove('visible');
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
  renderControls(state.roundOver, state.hintUsed);
}
