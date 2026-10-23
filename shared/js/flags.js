import { esc } from './escape.js';

/** URL de la bandera (SVG propio, shared/flags/) a partir de su código ISO de dos letras. */
export function flagUrl(code) {
  return new URL(`../flags/${String(code).toLowerCase()}.svg`, import.meta.url).href;
}

/**
 * Texto con emojis de bandera -> HTML con la bandera como imagen (y el resto escapado).
 * Windows no tiene emojis de bandera y los pinta como letras ("CN", "KR").
 * Las imágenes llevan la clase `flag-img`, que cada juego dimensiona en su CSS.
 */
export function flagEmojiHtml(text) {
  return esc(text ?? '').replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, flag => {
    const code = [...flag].map(c => String.fromCharCode(c.codePointAt(0) - 0x1F1E6 + 97)).join('');
    return `<img class="flag-img" src="${flagUrl(code)}" alt="${flag}">`;
  });
}
