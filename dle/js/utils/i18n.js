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
    colWorlds:     'Worlds',
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
    tipLeague:   'Liga regional actual del jugador',
    tipPosition: 'Rol en el equipo. 🟧 = coincidencia parcial',
    tipTitles:   'Ha ganado algún título regional',
    tipWorlds:   'Ha ganado el Campeonato Mundial',
    tipAge:      'Edad actual. ↑ mayor · ↓ menor',
    tipTeam:     'Equipo actual',
    dailyBadge:         'DIARIO',
    dailyDone:          '¡Ya has jugado hoy!',
    dailyNext:          'Próximo reto en',
    dailyFreePlay:      'Modo libre',
    dailyShare:         'Compartir resultado',
    dailyCopied:        '¡Copiado!',
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
    colWorlds:     'Worlds',
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
    tipLeague:   'Current regional league',
    tipPosition: 'Role in the team. 🟧 = partial match',
    tipTitles:   'Has won a regional title',
    tipWorlds:   'Has won the World Championship',
    tipAge:      'Current age. ↑ older · ↓ younger',
    tipTeam:     'Current team',
    dailyBadge:         'DAILY',
    dailyDone:          'Already played today!',
    dailyNext:          'Next challenge in',
    dailyFreePlay:      'Free play',
    dailyShare:         'Share result',
    dailyCopied:        'Copied!',
  },
};

let _lang = localStorage.getItem('app_lang') || 'es';

export function t(key, ...args) {
  const val = TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS['es'][key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

export function getLang() { return _lang; }

/**
 * Cambia el idioma, guarda en localStorage,
 * actualiza los elementos estáticos y emite 'langchange'.
 */
export function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _lang = lang;
  localStorage.setItem('app_lang', lang);
  applyStaticTranslations();
  document.dispatchEvent(new Event('langchange'));
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
