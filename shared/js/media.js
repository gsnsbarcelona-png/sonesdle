/**
 * media.js — Logos de equipo y fotos de jugador.
 *
 * Los logos los genera build.py en shared/data/team-logos.json ({equipo: URL}); las fotos vienen en
 * los datos de cada juego. Son un extra: si falta el fichero, el equipo o la foto, o la imagen no
 * carga, el juego sigue con solo el texto (logo) o con un marcador genérico (foto).
 */
import { esc } from './escape.js';

const LOGOS_URL   = new URL('../data/team-logos.json', import.meta.url);
const PLACEHOLDER = new URL('../../dle/img/player-placeholder.svg', import.meta.url).pathname;

let logos = new Map();
const key = name => String(name ?? '').trim().toLowerCase();

/** Carga los logos. No falla nunca: sin fichero, no hay logos. */
export async function loadTeamLogos() {
  try {
    const r = await fetch(LOGOS_URL);
    if (r.ok) logos = new Map(Object.entries(await r.json()).map(([team, url]) => [key(team), url]));
  } catch { /* sin logos */ }
  return logos;
}

/** `<img>` con el logo del equipo, o '' si no hay. `size`: clase de tamaño (team-logo-sm|lg|xl). */
export function teamLogoHtml(team, size = '') {
  const url = logos.get(key(team));
  return url
    ? `<img class="team-logo ${size}" src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : '';
}

/** `<img>` redondo con la foto del jugador; sin foto, el marcador genérico. */
export function playerPhotoHtml(url, size = '') {
  return `<img class="player-photo ${size}" src="${esc(url || PLACEHOLDER)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
}

// La CSP no permite onerror en línea: una imagen que no carga se trata aquí.
// Un logo roto se quita; una foto rota pasa al marcador (una sola vez, para no entrar en bucle).
document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.classList.contains('team-logo')) img.remove();
  else if (img.classList.contains('player-photo') && !img.dataset.fallback) {
    img.dataset.fallback = '1';
    img.src = PLACEHOLDER;
  }
}, true);
