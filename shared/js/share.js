/**
 * share.js — Compartir el resultado en X (Twitter).
 *
 * Abre la ventana de publicación de X con el texto ya escrito; la persona decide si publica.
 * No usa ningún script ni dato de X, solo un enlace, así que no cambia la CSP ni la privacidad.
 */
const INTENT = 'https://x.com/intent/post';

/** Abre X con `text` como publicación. Devuelve false si el navegador bloqueó la ventana. */
export function shareToX(text) {
  const win = window.open(`${INTENT}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  return win !== null;
}
