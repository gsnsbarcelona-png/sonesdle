export const EVENTS = Object.freeze({
  CELL_CLICKED:    'cell.clicked',
  MODAL_OPEN:      'modal.open',
  MODAL_CLOSE:     'modal.close',
  INPUT_CHANGED:   'input.changed',
  INPUT_SUBMITTED: 'input.submitted',
  INPUT_KEYDOWN:   'input.keydown',
  AC_RESULTS:      'ac.results',
  AC_SELECTED:     'ac.selected',
  GUESS_CORRECT:   'guess.correct',
  GUESS_WRONG:     'guess.wrong',
  GUESS_REJECTED:  'guess.rejected',
  CELL_RENDERED:   'cell.rendered',
  CELL_RESTORED:   'cell.restored',   // casilla de un reto diario ya empezado (sin animación)
  GAME_STARTED:    'game.started',
  GAME_WON:        'game.won',
  GAME_LOST:       'game.lost',
  GAME_RESET:      'game.reset',
});
