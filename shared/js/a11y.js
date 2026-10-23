/**
 * a11y.js — Accesibilidad compartida: diálogos con foco, combobox ARIA y movimiento reducido.
 *
 * No toca la lógica de cada juego: observa el DOM y añade los atributos y el manejo de
 * foco que faltan, así que sirve con cualquier forma de abrir y cerrar (clase, style...).
 */

/** ¿Pide el usuario menos animación? */
export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),'
                + 'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const isShown = el => {
  const cs = getComputedStyle(el);
  return !el.hidden && !el.classList.contains('hidden') && cs.display !== 'none' && cs.visibility !== 'hidden';
};

/**
 * Convierte un overlay en un diálogo modal accesible: role/aria-modal, nombre,
 * foco al abrirlo, Tab atrapado dentro, Escape para cerrar y foco devuelto al cerrarlo.
 *
 * @param {HTMLElement} el          el overlay (se detecta si está abierto o cerrado solo)
 * @param {{ onClose?: () => void, closeSelector?: string, label?: string }} [opts]
 *   onClose: qué hace Escape. Si no hay, se pulsa `closeSelector` si existe dentro.
 *   Sin ninguno de los dos, Escape no cierra (p. ej. la pantalla de fin de partida).
 */
export function setupDialog(el, { onClose, closeSelector, label } = {}) {
  if (!el) return;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (label) el.setAttribute('aria-label', label);
  else if (!el.hasAttribute('aria-labelledby') && !el.hasAttribute('aria-label')) {
    const heading = el.querySelector('h1,h2,h3,[role="heading"]');
    if (heading) {
      heading.id ||= `${el.id || 'dialog'}-title`;
      el.setAttribute('aria-labelledby', heading.id);
    }
  }

  let open = false;
  let previous = null;

  const focusables = () => [...el.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null);

  const onKeydown = e => {
    if (e.key === 'Escape') {
      const close = onClose ?? (closeSelector && (() => el.querySelector(closeSelector)?.click()));
      if (close) { e.preventDefault(); close(); }
    } else if (e.key === 'Tab') {
      const items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const sync = () => {
    const now = isShown(el);
    if (now === open) return;
    open = now;
    if (open) {
      previous = document.activeElement;
      document.addEventListener('keydown', onKeydown, true);
      // Tras la animación de entrada; si el juego ya ha puesto el foco dentro (un input), se respeta
      setTimeout(() => {
        if (!open || el.contains(document.activeElement)) return;
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        (focusables()[0] ?? el).focus({ preventScroll: true });
      }, 120);
    } else {
      document.removeEventListener('keydown', onKeydown, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      previous = null;
    }
  };

  // Muchos overlays se muestran con una transición de `visibility`: justo al cambiar la clase
  // aún cuentan como ocultos, así que se vuelve a comprobar cuando la transición ha acabado
  let recheck;
  new MutationObserver(() => {
    sync();
    clearTimeout(recheck);
    recheck = setTimeout(sync, 450);
  }).observe(el, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  sync();
}

/**
 * Patrón combobox/listbox para un buscador con desplegable de resultados.
 * El juego sigue pintando y marcando la opción activa como hasta ahora; aquí solo se
 * mantienen al día roles, ids, aria-expanded, aria-selected y aria-activedescendant.
 *
 * @param {{ input: HTMLInputElement, list: HTMLElement, optionSelector: string,
 *           activeClass: string, label?: string }} cfg
 */
export function setupCombobox({ input, list, optionSelector, activeClass, label }) {
  if (!input || !list) return;
  list.id ||= `${input.id || 'combo'}-list`;
  list.setAttribute('role', 'listbox');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-expanded', 'false');
  if (label && !input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
    input.setAttribute('aria-label', label);
  }

  const sync = () => {
    const options = [...list.querySelectorAll(optionSelector)];
    let active = null;
    options.forEach((opt, i) => {
      opt.setAttribute('role', 'option');
      opt.id ||= `${list.id}-opt-${i}`;
      const on = opt.classList.contains(activeClass);
      opt.setAttribute('aria-selected', String(on));
      if (on) active = opt;
    });
    input.setAttribute('aria-expanded', String(options.length > 0 && isShown(list)));
    if (active) input.setAttribute('aria-activedescendant', active.id);
    else input.removeAttribute('aria-activedescendant');
  };

  new MutationObserver(sync).observe(list, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'],
  });
  sync();
}

/** Marca un elemento como región viva: los cambios de texto se anuncian. */
export function setLive(el, mode = 'polite') {
  if (!el) return;
  el.setAttribute('aria-live', mode);
  el.setAttribute('aria-atomic', 'true');
  if (mode === 'assertive') el.setAttribute('role', 'alert');
}
