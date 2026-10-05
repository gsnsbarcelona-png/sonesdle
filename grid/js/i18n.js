import { getLang } from '../../shared/lang.js';

const T = {
  es: {
    headerSub:     'Completa las 9 casillas · Pro Players',
    lives:         'Vidas',
    cells:         'Celdas',
    placeholder:   'Nombre del pro player…',
    confirm:       'Confirmar',
    cancel:        'Cancelar',
    victory:       '¡Victoria!',
    victorySub:    'Todas las casillas completadas',
    playAgain:     'Jugar de nuevo',
    gameOver:      'Game Over',
    gameOverSub:   'Se acabaron las vidas',
    tryAgain:      'Intentar de nuevo',
    modalDesc:     (rd, cd) => `Pro player que ${rd} y que ${cd}.`,
    invalidPlayer: (raw, n) => `"${raw}" no es válido · ${n} vida${n !== 1 ? 's' : ''} restante${n !== 1 ? 's' : ''}`,
    unknownPlayer: raw => `No encontramos a "${raw}" · elige uno de la lista`,
    usedPlayer:    raw => `${raw} ya está en otra casilla`,
    triedPlayer:   raw => `${raw} ya lo has probado aquí`,
  },
  en: {
    headerSub:     'Fill all 9 cells · Pro Players',
    lives:         'Lives',
    cells:         'Cells',
    placeholder:   'Pro player name…',
    confirm:       'Confirm',
    cancel:        'Cancel',
    victory:       'Victory!',
    victorySub:    'All cells completed',
    playAgain:     'Play again',
    gameOver:      'Game Over',
    gameOverSub:   'Out of lives',
    tryAgain:      'Try again',
    modalDesc:     (rd, cd) => `Pro player who ${rd} and ${cd}.`,
    invalidPlayer: (raw, n) => `"${raw}" is not valid · ${n} ${n !== 1 ? 'lives' : 'life'} remaining`,
    unknownPlayer: raw => `"${raw}" not found · pick one from the list`,
    usedPlayer:    raw => `${raw} is already in another cell`,
    triedPlayer:   raw => `You already tried ${raw} here`,
  },
};

export function t(key, ...args) {
  const val = T[getLang()]?.[key] ?? T.es[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

/** Escapa HTML (los nombres vienen de Leaguepedia). */
export const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Emoji como HTML, con las banderas como imagen: Windows no tiene emojis de bandera
 * y los pinta como letras ("CN", "KR").
 */
export function emojiHtml(text) {
  return esc(text ?? '').replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, flag => {
    const code = [...flag].map(c => String.fromCharCode(c.codePointAt(0) - 0x1F1E6 + 97)).join('');
    return `<img class="flag-img" src="https://flagcdn.com/w40/${code}.png" alt="${flag}">`;
  });
}

/** Icono de una categoría: su logo (grid/img/) si lo tiene, si no su emoji. */
export function catIconHtml(cat) {
  return cat.img ? `<img class="cat-logo" src="./img/${cat.img}.webp" alt="">` : emojiHtml(cat.icon);
}

/** Texto de una categoría en el idioma actual: `cat.en.main` en inglés, `cat.main` en español. */
export function catText(cat, field) {
  return (getLang() === 'en' && cat.en?.[field]) || cat[field];
}
