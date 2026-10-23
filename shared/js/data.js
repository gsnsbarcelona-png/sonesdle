/**
 * data.js — Carga de JSON con comprobación de errores y mensaje visible.
 */
import { esc } from './escape.js';

/** fetch + JSON que falla ante respuestas HTTP no correctas. */
export async function loadJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

/** Sustituye la página por un mensaje de error en vez de dejarla en blanco. */
export function showLoadError(err) {
  console.error(err);
  let en = false;
  try { en = localStorage.getItem('app_lang') === 'en'; } catch { /* sin storage */ }
  document.body.innerHTML = `<p style="padding:2rem;text-align:center;color:#c8aa6e;font-family:sans-serif">${
    esc(en ? 'Could not load the game data. Please reload the page.'
           : 'No se pudieron cargar los datos del juego. Recarga la página.')}</p>`;
  throw err;
}
