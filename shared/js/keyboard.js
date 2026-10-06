/**
 * Teclado en pantallas táctiles: tras enviar un intento se cierra para que se vea la
 * página entera. En el ordenador el cursor se queda en el campo para seguir escribiendo.
 */
const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

/** Cierra el teclado del móvil quitando el foco del campo. */
export function hideKeyboard(input) {
  if (isTouch()) input?.blur();
}

/** Pone el foco en el campo solo en el ordenador (en el móvil abriría el teclado sin pedirlo). */
export function focusIfDesktop(input) {
  if (!isTouch()) input?.focus();
}
