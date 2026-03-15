import { GameFactory }            from './GameFactory.js';
import { LoLPlayerRepository }    from './repositories/LoLPlayerRepository.js';
import { LoLCategoryRepository }  from './repositories/LoLCategoryRepository.js';
import { mountSwitcher, applyStaticTranslations } from '../../shared/lang.js';
import { mountGameNav } from '../../shared/nav.js';
import { t } from './i18n.js';

// ── Traducciones estáticas del HTML ─────────────────────────
const STATIC = {
  es: {
    headerSub: 'Completa las 9 casillas · Pro Players',
    placeholder: 'Nombre del pro player…',
    confirm: 'Confirmar', cancel: 'Cancelar',
    victory: '¡Victoria!', victorySub: 'Todas las casillas completadas', playAgain: 'Jugar de nuevo',
    gameOver: 'Game Over', gameOverSub: 'Se acabaron las vidas', tryAgain: 'Intentar de nuevo',
  },
  en: {
    headerSub: 'Fill all 9 cells · Pro Players',
    placeholder: 'Pro player name…',
    confirm: 'Confirm', cancel: 'Cancel',
    victory: 'Victory!', victorySub: 'All cells completed', playAgain: 'Play again',
    gameOver: 'Game Over', gameOverSub: 'Out of lives', tryAgain: 'Try again',
  },
};

mountSwitcher();
mountGameNav();
applyStaticTranslations(STATIC);
document.addEventListener('langchange', () => applyStaticTranslations(STATIC));

// ── Carga de datos e inicio del juego ────────────────────────
const [players, categories] = await Promise.all([
  fetch('./data/players.json').then(r => r.json()),
  fetch('./data/categories.json').then(r => r.json()),
]);

GameFactory.create({
  playerRepository:   new LoLPlayerRepository(players),
  categoryRepository: new LoLCategoryRepository(categories),
}).start();
