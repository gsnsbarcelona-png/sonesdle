/**
 * Panel de la pool: chips de regiones y de eras. Cada clic cambia los filtros en el estado, que
 * dice si se aplican (nunca se deja la pool vacía) y si ya sale un jugador nuevo.
 */
import * as State from '../core/state.js';
import { ZONES, ERAS, LEVELS } from '../core/pool.js';
import { t } from '../i18n.js';
import { esc } from '../../../shared/js/escape.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function chips(container, group, ids, labelKey, active) {
  container.innerHTML = ids.map((id) =>
    `<button type="button" class="pool-chip" data-group="${group}" data-id="${esc(id)}" aria-pressed="${active.includes(id)}">${esc(t(labelKey(id)))}</button>`
  ).join('');
}

/** Avisa de lo que implica el nivel Difícil. */
const levelNote = (f) => (f.level === 'hard' ? t('poolHardNote') : '');

/** Pinta los chips y el contador con los filtros actuales. */
export function render(note = '') {
  const f = State.getFilters();
  chips(document.getElementById('pool-zones'), 'zones', ZONES, (id) => `zone${id}`, f.zones);
  chips(document.getElementById('pool-eras'), 'eras', ERAS.map((e) => e.id), (id) => `era${cap(id)}`, f.eras);
  chips(document.getElementById('pool-level'), 'level', LEVELS, (id) => `level${cap(id)}`, [f.level]);
  document.getElementById('pool-count').textContent = t('poolCount', State.poolSize(f));
  document.getElementById('pool-note').textContent = note || levelNote(f);
}

/**
 * @param {() => void} onNewRound se llama cuando el cambio saca un jugador nuevo
 */
export function bind(onNewRound) {
  document.getElementById('pool-box').addEventListener('click', (e) => {
    const chip = e.target.closest('.pool-chip');
    if (!chip) return;
    const f = State.getFilters();
    const id = chip.dataset.id;
    // La dificultad es una sola opción; en los otros grupos el último chip no se apaga
    let next;
    if (chip.dataset.group === 'level') {
      next = id;
    } else {
      const list = f[chip.dataset.group];
      next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      if (!next.length) return;
    }
    const result = State.setFilters({ ...f, [chip.dataset.group]: next });
    if (!result.applied) { render(t('poolEmpty')); return; }
    render(result.newRound ? '' : t('poolLater'));
    if (result.newRound) onNewRound();
  });
}
