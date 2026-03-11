import { PLAYERS }           from '../data/players.js';
import { getAttemptedNames } from '../core/state.js';

// ─── Internal state ───────────────────────────────────────────────────────────

let activeIndex = -1;
let items       = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps the matched substring in a gold <strong> tag.
 * @param {string} name
 * @param {string} query
 */
function highlight(name, query) {
  const q   = query.trim();
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (!q || idx === -1) return name;
  return (
    name.slice(0, idx) +
    `<strong style="color:var(--gold)">${name.slice(idx, idx + q.length)}</strong>` +
    name.slice(idx + q.length)
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns filtered player suggestions for `query`.
 * Already-attempted players are excluded.
 *
 * @param {string} query
 * @returns {import('../data/players.js').Player[]}
 */
export function filter(query) {
  const attempted = getAttemptedNames();
  const q         = query.toLowerCase().trim();
  if (!q) return [];
  return PLAYERS
    .filter((p) => p.name.toLowerCase().includes(q) && !attempted.includes(p.name.toLowerCase()))
    .slice(0, 8);
}

/**
 * Renders dropdown items.
 *
 * @param {import('../data/players.js').Player[]} results
 * @param {HTMLInputElement} inputEl
 * @param {HTMLElement} listEl
 */
export function render(results, inputEl, listEl) {
  items       = results;
  activeIndex = -1;

  if (!results.length) {
    listEl.classList.remove('open');
    return;
  }

  listEl.innerHTML = results
    .map(
      (p, i) =>
        `<div class="autocomplete-item" data-index="${i}" data-name="${p.name}">
          <span class="autocomplete-name">${highlight(p.name, inputEl.value)}</span>
          <span class="autocomplete-pos">${p.position}</span>
        </div>`
    )
    .join('');

  listEl.classList.add('open');
}

/**
 * Moves the active highlight up (-1) or down (+1).
 * Returns the highlighted player name, or null.
 *
 * @param {1 | -1} dir
 * @param {HTMLElement} listEl
 * @returns {string | null}
 */
export function navigate(dir, listEl) {
  const els = listEl.querySelectorAll('.autocomplete-item');
  if (!els.length) return null;

  if (dir === 1)  activeIndex = (activeIndex + 1) % els.length;
  if (dir === -1) activeIndex = (activeIndex - 1 + els.length) % els.length;

  els.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
  return items[activeIndex]?.name ?? null;
}

/** Returns the currently highlighted name, or null. */
export function getActive() {
  return activeIndex >= 0 ? (items[activeIndex]?.name ?? null) : null;
}

/** Hides the dropdown and resets state. */
export function close(listEl) {
  listEl.classList.remove('open');
  activeIndex = -1;
}
