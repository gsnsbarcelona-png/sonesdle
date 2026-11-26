import { PLAYERS }           from '../data/players.js';
import { GUESSES }           from '../data/guesses.js';
import { getAttemptedNames } from '../core/state.js';
import * as Base             from '../../../shared/js/autocomplete.js';
import { nameMatches }       from '../../../shared/js/names.js';

// ─── Filtrado (lógica de datos, específica de Carrera) ────────────────────────

export function filter(query) {
  const attempted = getAttemptedNames();
  const q         = query.toLowerCase().trim();
  if (!q) return [];
  // Los jugadores que pueden ser el secreto primero; después los que solo se pueden probar
  return [...PLAYERS, ...GUESSES]
    .filter(p => nameMatches(p.name, q) && !attempted.includes(p.name.toLowerCase()))
    .slice(0, 8);
}

// ─── UI — delegado al módulo compartido ──────────────────────────────────────

export function render(results, inputEl, listEl) {
  Base.render(results, listEl, inputEl.value);
}

export const navigate  = Base.navigate;
export const getActive = Base.getActive;
export const close     = Base.close;
