import { EVENTS } from '../events.js';

export class ModalPresenter {
  constructor(bus, overlayEl, inputEl) {
    this._overlay = overlayEl;
    this._input   = inputEl;
    bus.on(EVENTS.MODAL_OPEN,  ({ rowCat, colCat }) => this._open(rowCat, colCat));
    bus.on(EVENTS.MODAL_CLOSE, () => this._close());
    bus.on(EVENTS.GUESS_WRONG, ({ raw, livesLeft }) => this._showError(raw, livesLeft));
  }

  _open(rowCat, colCat) {
    document.getElementById('modalIcons').textContent = `${rowCat.icon} × ${colCat.icon}`;
    document.getElementById('modalDesc').innerHTML =
      `Pro player que ${rowCat.desc} y que ${colCat.desc}.`;
    this._input.value = '';
    this._clearErr();
    this._overlay.style.display = 'flex';
    setTimeout(() => this._input.focus(), 80);
  }

  _close() { this._overlay.style.display = 'none'; }

  _showError(raw, livesLeft) {
    const el = document.getElementById('errorMsg');
    el.textContent = `"${raw}" no es válido · ${livesLeft} vida${livesLeft !== 1 ? 's' : ''} restante${livesLeft !== 1 ? 's' : ''}`;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  _clearErr() {
    const el = document.getElementById('errorMsg');
    el.textContent = '';
    el.classList.remove('shake');
  }
}
