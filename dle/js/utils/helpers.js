import { flagUrl } from '../../../shared/js/flags.js';

/** Escapa caracteres HTML para evitar XSS con datos externos. */
export { esc } from '../../../shared/js/escape.js';

/**
 * Convierte un emoji de bandera a su código ISO 3166-1 alpha-2
 * derivándolo matemáticamente de los Regional Indicator Symbols (U+1F1E6–U+1F1FF).
 */
function emojiToIso(emoji) {
  if (!emoji) return null;
  const pts = [...emoji].map(c => c.codePointAt(0));
  if (pts.length >= 2 && pts[0] >= 0x1F1E6 && pts[0] <= 0x1F1FF) {
    return String.fromCharCode(pts[0] - 0x1F1E6 + 65, pts[1] - 0x1F1E6 + 65).toLowerCase();
  }
  return null;
}

/**
 * Devuelve un `<img>` HTML con la bandera (SVG propio).
 * @param {string} flagEmoji
 * @param {number} size — ancho en px con el que se muestra
 */
export function flagImg(flagEmoji, size = 20) {
  const code = emojiToIso(flagEmoji);
  if (!code) return '';
  return `<img data-flag src="${flagUrl(code)}"
              width="${size}" height="${Math.round(size * 0.75)}"
              style="vertical-align:middle;border-radius:2px;display:inline-block"
              alt="">`;
}

// Sin bandera para ese país: se oculta la imagen (el error de carga no burbujea, de ahí la captura)
document.addEventListener('error', e => {
  if (e.target instanceof HTMLImageElement && e.target.hasAttribute('data-flag')) e.target.style.display = 'none';
}, true);
