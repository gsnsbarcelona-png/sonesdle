/**
 * icons.js — Iconos propios (shared/icons.svg). Cada uno es un <symbol> que se pinta con <use>
 * y hereda el color del texto (currentColor), así que sirven en el tema oscuro y en el claro.
 */
const SPRITE = new URL('../icons.svg', import.meta.url).pathname;

/** `<svg>` con el icono `name`. `cls`: clases extra. */
export function iconHtml(name, size = 20, cls = '') {
  return `<svg class="icon ${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="${SPRITE}#${name}"/></svg>`;
}
