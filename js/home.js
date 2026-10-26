import { mountSwitcher, applyStaticTranslations } from '../shared/lang.js';

const T = {
  es: {
    heroSub:   'Juegos de LoL Esports',
    c1tag:'Pistas · Diario',        c1title:'Adivina el Pro',        c1desc:'Consigue pistas con cada intento',
    c3tag:'Roster · Histórico',     c3title:'Roster Guess',          c3desc:'Adivina los rosters míticos de Worlds',
    c4tag:'Timeline · Carrera',                                       c4desc:'Adivina al jugador por su carrera',
    c2tag:'Grid · Conexiones',                                        c2desc:'Rellena la cuadrícula 3×3 de pro players',
    c5tag:'Wordle · Diario',                                          c5desc:'El nombre del pro player en 6 intentos',
    legal:'Aviso legal', privacy:'Política de privacidad',
  },
  en: {
    heroSub:   'LoL Esports Games',
    c1tag:'Clues · Daily',          c1title:'Guess the Pro',         c1desc:'Get clues with each attempt',
    c3tag:'Roster · Historical',    c3title:'Roster Guess',          c3desc:'Guess the legendary Worlds rosters',
    c4tag:'Timeline · Career',                                        c4desc:'Guess the player from their career',
    c2tag:'Grid · Connections',                                       c2desc:'Fill the 3×3 pro player grid',
    c5tag:'Wordle · Daily',                                           c5desc:'The pro player’s name in 6 tries',
    legal:'Legal notice', privacy:'Privacy policy',
  },
};

mountSwitcher(document.querySelector('.topbar'));   // dentro de la barra superior
applyStaticTranslations(T);
document.addEventListener('langchange', () => applyStaticTranslations(T));
