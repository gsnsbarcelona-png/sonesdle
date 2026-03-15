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
  },
};

export function t(key, ...args) {
  const val = T[getLang()]?.[key] ?? T.es[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
