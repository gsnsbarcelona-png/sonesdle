import { getLang } from '../../shared/lang.js';

const T = {
  es: {
    subtitle:    'Adivina al jugador por su trayectoria',
    wins:        'Victorias',
    played:      'Jugados',
    streak:      'Racha',
    attempts:    '⚡ Intentos',
    pathTitle:   'Trayectoria Revelada',
    placeholder: 'Escribe el nombre del jugador…',
    btnGuess:    '⚔ Adivinar',
    btnHint:     '💡 Pista',
    btnSkip:     '⚑ Rendirse',
    btnNext:     '▶ Siguiente Jugador',
    stagesLeft:  (n) => `${n} etapa${n > 1 ? 's' : ''} más por revelar`,
    modalWin:    '¡Correcto!',
    modalLose:   'Ronda perdida',
    modalWinSub: (pos, n) => `${pos} · Adivinado en ${n} intento${n !== 1 ? 's' : ''}`,
    modalLoseSub:(pos, yr) => `Era ${pos} · ${yr} – presente`,
    modalBtn:    '▶ Siguiente Jugador',
  },
  en: {
    subtitle:    'Guess the player by their career',
    wins:        'Wins',
    played:      'Played',
    streak:      'Streak',
    attempts:    '⚡ Attempts',
    pathTitle:   'Revealed Career',
    placeholder: 'Type the player name…',
    btnGuess:    '⚔ Guess',
    btnHint:     '💡 Hint',
    btnSkip:     '⚑ Give Up',
    btnNext:     '▶ Next Player',
    stagesLeft:  (n) => `${n} more stage${n > 1 ? 's' : ''} to reveal`,
    modalWin:    'Correct!',
    modalLose:   'Round lost',
    modalWinSub: (pos, n) => `${pos} · Guessed in ${n} attempt${n !== 1 ? 's' : ''}`,
    modalLoseSub:(pos, yr) => `Was ${pos} · ${yr} – present`,
    modalBtn:    '▶ Next Player',
  },
};

export function t(key, ...args) {
  const val = T[getLang()]?.[key] ?? T.es[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
