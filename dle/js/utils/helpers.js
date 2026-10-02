/** Escapa caracteres HTML para evitar XSS con datos externos. */
export const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
 * Devuelve un `<img>` HTML con la bandera desde flagcdn.com.
 * @param {string} flagEmoji
 * @param {number} size — ancho en px con el que se muestra
 */
export function flagImg(flagEmoji, size = 20) {
  const code = emojiToIso(flagEmoji);
  if (!code) return '';
  // flagcdn solo tiene anchos fijos (w24 da un 404): se pide el siguiente y se escala
  const cdnWidth = [20, 40, 80, 160].find(w => w >= size) ?? 160;
  return `<img src="https://flagcdn.com/w${cdnWidth}/${code}.png"
              width="${size}" height="${Math.round(size * 0.75)}"
              style="vertical-align:middle;border-radius:2px;display:inline-block"
              alt="" onerror="this.style.display='none'">`;
}
