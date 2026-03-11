import { EVENTS } from '../events.js';

export class EndScreenPresenter {
  constructor(bus, overlayEl, replayBtnEl, showEvent) {
    this._overlay = overlayEl;
    replayBtnEl.addEventListener('click', () => {
      this._hide();
      bus.emit(EVENTS.GAME_RESET);
    });
    bus.on(showEvent,         () => this._show());
    bus.on(EVENTS.GAME_RESET, () => this._hide());
  }

  _show() { this._overlay.style.display = 'flex'; }
  _hide() { this._overlay.style.display = 'none'; }
}
