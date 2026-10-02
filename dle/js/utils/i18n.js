const TRANSLATIONS = {
  es: {
    subtitle:      'Adivina el Pro Player',
    placeholder:   'Escribe el nombre de un pro player...',
    guess:         'Adivinar',
    attempts:      'Intentos',
    giveup:        'Rendirse',
    playAgain:     'Jugar de nuevo',
    victory:       '¡Acertaste!',
    giveUpTitle:   'Era este...',
    triesGaveUp:   'Te has rendido. ¡Suerte la próxima!',
    triesFirst:    '¡Acertaste a la primera!',
    triesN:        n => `Resuelto en ${n} intentos`,
    errEmpty:      'Escribe el nombre de un jugador',
    errNotFound:   'Jugador no encontrado. Selecciona del desplegable.',
    errAlready:    'Ya has intentado con ese jugador',
    colPlayer:     'Jugador',
    colCountry:    'País',
    colLeague:     'Liga',
    colPosition:   'Posición',
    colTitles:     'Títulos',
    colWorlds:     'Internacional',
    colAge:        'Edad',
    colTeam:       'Equipo',
    yes:           '✓ Sí',
    no:            '✗ No',
    cookieTitle:        'Aviso de cookies',
    cookieMsg:          'Usamos almacenamiento local para que el juego funcione correctamente y recordar tus preferencias. No se comparte ningún dato con terceros.',
    cookieAcceptAll:    'Aceptar todo',
    cookieRejectAll:    'Rechazar',
    cookieSettings:     'Configurar',
    cookieSave:         'Guardar preferencias',
    cookieSettingsTitle:'Configuración de cookies',
    cookieNecTitle:     'Necesarias',
    cookieNecDesc:      'Imprescindibles para el funcionamiento del juego (puntuación, estado de la partida). No se pueden desactivar.',
    cookiePrefTitle:    'Preferencias',
    cookiePrefDesc:     'Guardan configuraciones personales como el idioma seleccionado.',
    cookieAlways:       'Siempre activo',
    cookiePrivacy:      'Política de privacidad',
    cookieReopener:     'Cookies',
    tipPlayer:   'Jugador que has adivinado',
    tipCountry:  'País de origen del jugador',
    tipLeague:   'Liga actual del jugador. 🟧 = otra liga de la misma región',
    tipPosition: 'Rol en el equipo. 🟧 = coincidencia parcial',
    tipTitles:   'Ha ganado alguna liga regional (LEC, LCK, LFL...)',
    tipWorlds:   'Ha ganado Worlds o MSI',
    tipAge:      'Edad actual. ↑ mayor · ↓ menor',
    tipTeam:     'Equipo actual. FA = agente libre, se muestra su último equipo',
    freeAgentTip: 'Agente libre: este es su último equipo',
    dailyBadge:         'DIARIO',
    dailyDone:          '¡Ya has jugado hoy!',
    dailyNext:          'Próximo reto en',
    dailyFreePlay:      'Modo libre',
    dailyShare:         'Compartir resultado',
    dailyCopied:        '¡Copiado!',
    hardModeBtn:        '💀 Modo difícil',
    hardModeOn:         '💀 DIFÍCIL · ACTIVO',
    hardModeTip:        'Oculta las columnas Liga y Equipo',
    freePlayOptions:    'Opciones modo libre',
    tierFilter:         'Nivel de liga',
    tier1:              'Tier 1 · Worlds',
    tier2:              'Tier 1-2',
    tier3:              'Todas las ligas',
    regionFilter:       'Región',
    regionAll:          'Todas',
  },
  en: {
    subtitle:      'Guess the Pro Player',
    placeholder:   'Type a pro player name...',
    guess:         'Guess',
    attempts:      'Attempts',
    giveup:        'Give Up',
    playAgain:     'Play Again',
    victory:       'Correct!',
    giveUpTitle:   'It was...',
    triesGaveUp:   'You gave up. Better luck next time!',
    triesFirst:    'Got it in one!',
    triesN:        n => `Solved in ${n} attempts`,
    errEmpty:      'Type a player name',
    errNotFound:   'Player not found. Select from the dropdown.',
    errAlready:    'You already tried that player',
    colPlayer:     'Player',
    colCountry:    'Country',
    colLeague:     'League',
    colPosition:   'Position',
    colTitles:     'Titles',
    colWorlds:     'Internacional',
    colAge:        'Age',
    colTeam:       'Team',
    yes:           '✓ Yes',
    no:            '✗ No',
    cookieTitle:        'Cookie notice',
    cookieMsg:          'We use local storage to make the game work correctly and remember your preferences. No data is shared with third parties.',
    cookieAcceptAll:    'Accept all',
    cookieRejectAll:    'Reject',
    cookieSettings:     'Settings',
    cookieSave:         'Save preferences',
    cookieSettingsTitle:'Cookie settings',
    cookieNecTitle:     'Necessary',
    cookieNecDesc:      'Essential for the game to function (score, game state). Cannot be disabled.',
    cookiePrefTitle:    'Preferences',
    cookiePrefDesc:     'Store personal settings such as your selected language.',
    cookieAlways:       'Always on',
    cookiePrivacy:      'Privacy policy',
    cookieReopener:     'Cookies',
    tipPlayer:   'The player you guessed',
    tipCountry:  'Player\'s country of origin',
    tipLeague:   'Current league. 🟧 = another league in the same region',
    tipPosition: 'Role in the team. 🟧 = partial match',
    tipTitles:   'Has won a regional league (LEC, LCK, LFL...)',
    tipWorlds:   'Has won Worlds or MSI',
    tipAge:      'Current age. ↑ older · ↓ younger',
    tipTeam:     'Current team. FA = free agent, showing their last team',
    freeAgentTip: 'Free agent: this was their last team',
    dailyBadge:         'DAILY',
    dailyDone:          'Already played today!',
    dailyNext:          'Next challenge in',
    dailyFreePlay:      'Free play',
    dailyShare:         'Share result',
    dailyCopied:        'Copied!',
    hardModeBtn:        '💀 Hard mode',
    hardModeOn:         '💀 HARD · ON',
    hardModeTip:        'Hides League and Team columns',
    freePlayOptions:    'Free play options',
    tierFilter:         'League level',
    tier1:              'Tier 1 · Worlds',
    tier2:              'Tier 1-2',
    tier3:              'All leagues',
    regionFilter:       'Region',
    regionAll:          'All',
  },
};

// Delegar getLang/setLang a shared/lang.js para sincronización global
import { getLang as _sharedGetLang, setLang as _sharedSetLang } from '../../../shared/lang.js';

export function getLang() { return _sharedGetLang(); }

export function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _sharedSetLang(lang);        // guarda en localStorage y emite 'langchange'
  applyStaticTranslations();   // aplica traducciones DLE inmediatamente
}

export function t(key, ...args) {
  const lang = getLang();
  const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['es'][key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

/** Actualiza todos los elementos con [data-i18n] y [data-i18n-ph]. */
export function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}
