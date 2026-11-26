/**
 * Pool de secretos: qué jugadores pueden salir según las regiones y las eras de debut elegidas.
 * Sin dependencias del DOM ni del estado de la ronda (solo localStorage para recordar el ajuste).
 */

/** Zonas en las que se reparten los secretos (Américas = NA + Brasil + Latam). */
export const ZONES = ['KR', 'CN', 'EMEA', 'AM', 'PAC'];

/** Eras por año de debut. */
export const ERAS = [
  { id: 'old', from: 0,    to: 2015 },
  { id: 'mid', from: 2016, to: 2019 },
  { id: 'new', from: 2020, to: 9999 },
];

const FILTER_KEY = 'lolguess_filters';

/** Etiqueta de una etapa (liga mayor o región, ver build.py) -> zona. */
const ZONE_OF_LABEL = {
  LCK: 'KR', KR: 'KR', LPL: 'CN', CN: 'CN', LEC: 'EMEA', EMEA: 'EMEA',
  LCS: 'AM', NA: 'AM', BR: 'AM', LATAM: 'AM', PAC: 'PAC',
};

/**
 * Zona de un jugador: la que trae el dato o, si no, donde pasó más etapas (en un empate, la más
 * reciente). Así el filtro funciona aunque el fichero de datos aún no traiga `zone`.
 * @param {{ zone?: string, career: { region: string }[] }} player
 */
export function zoneOf(player) {
  if (ZONES.includes(player.zone)) return player.zone;
  const zones = player.career.map((c) => ZONE_OF_LABEL[c.region]).filter(Boolean);
  if (!zones.length) return null;
  const counts = {};
  for (const z of zones) counts[z] = (counts[z] ?? 0) + 1;
  const top = Math.max(...Object.values(counts));
  return [...zones].reverse().find((z) => counts[z] === top);
}

/** Año de debut (la primera etapa de la carrera). */
export function debutOf(player) {
  return parseInt(player.career[0]?.year, 10);
}

/** Era de debut de un jugador (id de ERAS) o null si no se sabe el año. */
export function eraOf(player) {
  const year = debutOf(player);
  return Number.isNaN(year) ? null : ERAS.find((e) => year >= e.from && year <= e.to).id;
}

/** Todo activado: la pool completa. */
export const allFilters = () => ({ zones: [...ZONES], eras: ERAS.map((e) => e.id) });

/** Filtros válidos a partir de lo guardado (o de lo que llegue): cada grupo con al menos una opción. */
export function cleanFilters(raw) {
  const all = allFilters();
  const pick = (list, valid) => {
    const chosen = Array.isArray(list) ? valid.filter((v) => list.includes(v)) : [];
    return chosen.length ? chosen : valid;
  };
  return { zones: pick(raw?.zones, all.zones), eras: pick(raw?.eras, all.eras) };
}

export function loadFilters() {
  try { return cleanFilters(JSON.parse(localStorage.getItem(FILTER_KEY) || 'null')); }
  catch (_) { return allFilters(); }
}

export function saveFilters(filters) {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)); }
  catch (_) { /* modo privado: el ajuste no se recordará */ }
}

/** Índices (en `players`) de los jugadores que cumplen los filtros. */
export function poolIndices(players, filters) {
  const out = [];
  players.forEach((p, i) => {
    if (filters.zones.includes(zoneOf(p)) && filters.eras.includes(eraOf(p))) out.push(i);
  });
  return out;
}
