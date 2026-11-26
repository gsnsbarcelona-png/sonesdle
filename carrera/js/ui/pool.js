/**
 * Panel de la pool: chips de regiones y de eras. Cada clic cambia los filtros en el estado, que
 * dice si se aplican (nunca se deja la pool vacía) y si ya sale un jugador nuevo.
 */
import * as State from '../core/state.js';
import { ZONES, ERAS } from '../core/pool.js';
import { t } from '../i18n.js';
import { esc } from '../../../shared/js/escape.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function chips(container, group, ids, labelKey, active) {
  container.innerHTML = ids.map((id) =>
    `<button type="button" class="pool-chip" data-group="${group}" data-id="${esc(id)}" aria-pressed="${active.includes(id)}">${esc(t(labelKey(id)))}</button>`
  ).join('');
}

/** Pinta los chips y el contador con los filtros actuales. */
export function render(note = '') {
  const f = State.getFilters();
  chips(document.getElementById('pool-zones'), 'zones', ZONES, (id) => `zone${id}`, f.zones);
  chips(document.getElementById('pool-eras'), 'eras', ERAS.map((e) => e.id), (id) => `era${cap(id)}`, f.eras);
  document.getElementById('pool-count').textContent = t('poolCount', State.poolSize(f));
  document.getElementById('pool-note').textContent = note;
}

/**
 * @param {() => void} onNewRound se llama cuando el cambio saca un jugador nuevo
 */
export function bind(onNewRound) {
  document.getElementById('pool-box').addEventListener('click', (e) => {
    const chip = e.target.closest('.pool-chip');
    if (!chip) return;
    const f = State.getFilters();
    const list = f[chip.dataset.group];
    const id = chip.dataset.id;
    // Un grupo no se queda sin ninguna opción: el último chip no se apaga
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    if (!next.length) return;
    const result = State.setFilters({ ...f, [chip.dataset.group]: next });
    if (!result.applied) { render(t('poolEmpty')); return; }
    render(result.newRound ? '' : t('poolLater'));
    if (result.newRound) onNewRound();
  });
}
