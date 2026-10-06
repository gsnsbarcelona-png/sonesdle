import { EVENTS } from '../events.js';

export class EndScreenPresenter {
  /**
   * @param {object} [extra] solo en la pantalla de derrota:
   *   viewBtn: cierra la pantalla para ver las soluciones en el tablero;
   *   boardReplayBtn: botón bajo el tablero para volver a jugar después.
   */
  constructor(bus, overlayEl, replayBtnEl, showEvent, { viewBtn, boardReplayBtn } = {}) {
    this._overlay = overlayEl;
    replayBtnEl.addEventListener('click', () => {
      this._hide();
      bus.emit(EVENTS.GAME_RESET);
    });
    viewBtn?.addEventListener('click', () => {
      this._hide();
      boardReplayBtn?.classList.remove('hidden');
    });
    boardReplayBtn?.addEventListener('click', () => bus.emit(EVENTS.GAME_RESET));
    bus.on(showEvent,         () => this._show());
    bus.on(EVENTS.GAME_RESET, () => { this._hide(); boardReplayBtn?.classList.add('hidden'); });
  }

  _show() { this._overlay.style.display = 'flex'; }
  _hide() { this._overlay.style.display = 'none'; }
}
