/**
 * autocomplete.js — Lógica de UI para dropdown de autocompletado.
 * Compartido por Carrera y Rostergues.
 *
 * Sin dependencias de juego: recibe los datos filtrados externamente
 * y solo gestiona renderizado, navegación y cierre del dropdown.
 *
 * Cada instancia de uso mantiene su propio índice activo:
 *   import * as AC from '../../shared/js/autocomplete.js';
 *   AC.render(resultados, listEl, query);
 *   AC.navigate(1, listEl);
 *   AC.getActive(listEl);
 *   AC.close(listEl);
 */

let _activeIndex = -1;

/** Envuelve la coincidencia con <strong> en dorado. */
export function highlight(name, query) {
  const q   = query.trim();
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (!q || idx === -1) return name;
  return (
    name.slice(0, idx) +
    `<strong style="color:var(--gold)">${name.slice(idx, idx + q.length)}</strong>` +
    name.slice(idx + q.length)
  );
}

/**
 * Renderiza items en el dropdown.
 * @param {{ name: string, position?: string }[]} results
 * @param {HTMLElement} listEl
 * @param {string} query  — para resaltar la coincidencia
 */
export function render(results, listEl, query = '') {
  _activeIndex = -1;

  if (!results.length) {
    listEl.classList.remove('open');
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = results
    .map((p, i) =>
      `<div class="autocomplete-item" data-index="${i}" data-name="${p.name}">
        <span class="autocomplete-name">${highlight(p.name, query)}</span>
        ${p.position ? `<span class="autocomplete-pos">${p.position}</span>` : ''}
      </div>`
    )
    .join('');

  listEl.classList.add('open');
}

/**
 * Navega el dropdown con teclado.
 * @param {1 | -1} dir
 * @param {HTMLElement} listEl
 * @returns {string | null} nombre activo o null
 */
export function navigate(dir, listEl) {
  const els = listEl.querySelectorAll('.autocomplete-item');
  if (!els.length) return null;

  if (dir === 1)  _activeIndex = (_activeIndex + 1) % els.length;
  if (dir === -1) _activeIndex = (_activeIndex - 1 + els.length) % els.length;

  els.forEach((el, i) => el.classList.toggle('active', i === _activeIndex));
  return els[_activeIndex]?.dataset.name ?? null;
}

/** Devuelve el nombre activo o null. */
export function getActive(listEl) {
  if (_activeIndex < 0) return null;
  return listEl.querySelectorAll('.autocomplete-item')[_activeIndex]?.dataset.name ?? null;
}

/** Cierra el dropdown. */
export function close(listEl) {
  listEl.classList.remove('open');
  listEl.innerHTML = '';
  _activeIndex = -1;
}
