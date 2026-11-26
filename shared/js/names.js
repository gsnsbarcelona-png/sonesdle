/**
 * Nombres de jugadores para buscar: sin mayúsculas y con las cifras que se usan como letras
 * ("Shad0w" se encuentra escribiendo "shadow"). Se aplica a lo escrito y a los nombres.
 */
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's' };

export function foldName(s) {
  return String(s).toLowerCase().replace(/[01345]/g, (d) => LEET[d]);
}

/** ¿Encaja `query` con `name`? Vale el texto tal cual o con las cifras como letras. */
export function nameMatches(name, query) {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  return n.includes(q) || foldName(n).includes(foldName(q));
}
