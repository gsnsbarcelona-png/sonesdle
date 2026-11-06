import { getLang } from '../../shared/lang.js';

export const T = {
  es: {
    headerSub: 'Agrupa los 16 jugadores en 4 familias',
    daily: 'Reto diario', free: 'Modo libre',
    shuffle: 'Mezclar', clear: 'Borrar', submit: 'Validar',
    share: 'Compartir', shareX: 'Compartir en X', again: 'Otro puzle', close: 'Cerrar',
    won: n => n === 0 ? '¡Perfecto, sin errores!' : `¡Lo has conseguido con ${n} ${n === 1 ? 'error' : 'errores'}!`,
    lost: 'Te has quedado sin vidas',
    nextIn: time => `Próximo reto en ${time}`,
    copied: 'Resultado copiado',
    oneAway: 'Casi… te falta uno',
    repeated: 'Ya has probado esa combinación',
    pickFour: 'Elige 4 jugadores',
    lives: n => `${n} ${n === 1 ? 'vida' : 'vidas'}`,
    selected: 'seleccionado',
    levels: { yellow: 'amarillo', green: 'verde', blue: 'azul', purple: 'morado' },
    todayInfo: 'Hoy',
    noPuzzle: 'Todavía no hay puzle para hoy',
  },
  en: {
    headerSub: 'Sort the 16 players into 4 families',
    daily: 'Daily', free: 'Free play',
    shuffle: 'Shuffle', clear: 'Clear', submit: 'Submit',
    share: 'Share', shareX: 'Share on X', again: 'New puzzle', close: 'Close',
    won: n => n === 0 ? 'Perfect, no mistakes!' : `You did it with ${n} ${n === 1 ? 'mistake' : 'mistakes'}!`,
    lost: 'You ran out of lives',
    nextIn: time => `Next challenge in ${time}`,
    copied: 'Result copied',
    oneAway: 'So close… one away',
    repeated: 'You already tried that combination',
    pickFour: 'Pick 4 players',
    lives: n => `${n} ${n === 1 ? 'life' : 'lives'}`,
    selected: 'selected',
    levels: { yellow: 'yellow', green: 'green', blue: 'blue', purple: 'purple' },
    todayInfo: 'Today',
    noPuzzle: 'There is no puzzle for today yet',
  },
};

export function t(key, ...args) {
  const val = T[getLang()]?.[key] ?? T.es[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
