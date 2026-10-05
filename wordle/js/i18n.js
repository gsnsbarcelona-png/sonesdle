import { getLang } from '../../shared/lang.js';

export const T = {
  es: {
    headerSub: 'Adivina el pro player de 5 letras · 6 intentos',
    daily: 'Reto diario', free: 'Modo libre',
    share: 'Compartir', again: 'Otra palabra', close: 'Cerrar',
    allLeagues: 'Todas',
    lcpTip: 'LCP con PCS y LMS',
    tooShort: 'Faltan letras',
    notPlayer: 'No es un pro player conocido',
    won: n => `¡Acertaste en ${n}/6!`,
    lost: 'No lo has adivinado',
    playedTitle: 'Reto de hoy completado',
    nextIn: time => `Próximo reto en ${time}`,
    copied: 'Resultado copiado',
    also: names => `También: ${names}`,
    enter: 'Enviar',
  },
  en: {
    headerSub: 'Guess the 5-letter pro player · 6 tries',
    daily: 'Daily', free: 'Free play',
    share: 'Share', again: 'New word', close: 'Close',
    allLeagues: 'All',
    lcpTip: 'LCP with PCS and LMS',
    tooShort: 'Not enough letters',
    notPlayer: 'Not a known pro player',
    won: n => `You got it in ${n}/6!`,
    lost: 'You didn’t get it',
    playedTitle: 'Today’s challenge done',
    nextIn: time => `Next challenge in ${time}`,
    copied: 'Result copied',
    also: names => `Also: ${names}`,
    enter: 'Enter',
  },
};

export function t(key, ...args) {
  const val = T[getLang()]?.[key] ?? T.es[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
