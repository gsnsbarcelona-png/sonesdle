import { getLang } from '../../shared/lang.js';

const T = {
  es: {
    lives:         'Vidas',
    cells:         'Celdas',
    modalDesc:     (rd, cd) => `Pro player que ${rd} y que ${cd}.`,
    invalidPlayer: (raw, n) => `"${raw}" no es válido · ${n} vida${n !== 1 ? 's' : ''} restante${n !== 1 ? 's' : ''}`,
    unknownPlayer: raw => `No encontramos a "${raw}" · elige uno de la lista`,
    usedPlayer:    raw => `${raw} ya está en otra casilla`,
    triedPlayer:   raw => `${raw} ya lo has probado aquí`,
    ambiguousPlayer: raw => `Hay varios "${raw}" · elige uno de la lista`,
  },
  en: {
    lives:         'Lives',
    cells:         'Cells',
    modalDesc:     (rd, cd) => `Pro player who ${rd} and ${cd}.`,
    invalidPlayer: (raw, n) => `"${raw}" is not valid · ${n} ${n !== 1 ? 'lives' : 'life'} remaining`,
    unknownPlayer: raw => `"${raw}" not found · pick one from the list`,
    usedPlayer:    raw => `${raw} is already in another cell`,
    triedPlayer:   raw => `You already tried ${raw} here`,
    ambiguousPlayer: raw => `There are several "${raw}" · pick one from the list`,
  },
};

export function t(key, ...args) {
  const val = T[getLang()]?.[key] ?? T.es[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

/** Escapa HTML (los nombres vienen de Leaguepedia). */
import { esc } from '../../shared/js/escape.js';
import { flagEmojiHtml as emojiHtml } from '../../shared/js/flags.js';
export { esc };

export { emojiHtml };   // banderas como imagen (shared/js/flags.js)

/** Icono de una categoría: su logo (grid/img/) si lo tiene, si no su emoji. */
export function catIconHtml(cat) {
  return cat.img ? `<img class="cat-logo" src="./img/${cat.img}.webp" alt="">` : emojiHtml(cat.icon);
}

/** Texto de una categoría en el idioma actual: `cat.en.main` en inglés, `cat.main` en español. */
export function catText(cat, field) {
  return (getLang() === 'en' && cat.en?.[field]) || cat[field];
}
