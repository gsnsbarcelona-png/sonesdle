/** URL de la bandera (SVG propio, shared/flags/) a partir de su código ISO de dos letras. */
export function flagUrl(code) {
  return new URL(`../flags/${String(code).toLowerCase()}.svg`, import.meta.url).href;
}
