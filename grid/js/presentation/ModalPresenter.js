import { EVENTS } from '../events.js';
import { t, catText, catIconHtml } from '../i18n.js';

const REJECT_KEYS = { used: 'usedPlayer', tried: 'triedPlayer', ambiguous: 'ambiguousPlayer' };

export class ModalPresenter {
  constructor(bus, overlayEl, inputEl) {
    this._overlay = overlayEl;
    this._input   = inputEl;
    this._cats    = null;   // [fila, columna] de la casilla abierta
    bus.on(EVENTS.MODAL_OPEN,  ({ rowCat, colCat }) => this._open(rowCat, colCat));
    bus.on(EVENTS.MODAL_CLOSE, () => this._close());
    bus.on(EVENTS.GUESS_WRONG, ({ raw, livesLeft }) => this._showError(t('invalidPlayer', raw, livesLeft)));
    bus.on(EVENTS.GUESS_REJECTED, ({ raw, reason }) =>
      this._showError(t(REJECT_KEYS[reason] ?? 'unknownPlayer', raw)));
    document.addEventListener('langchange', () => { if (this._cats) this._renderContext(); });
  }

  _open(rowCat, colCat) {
    this._cats = [rowCat, colCat];
    this._renderContext();
    this._input.value = '';
    this._clearErr();
    this._overlay.style.display = 'flex';
    setTimeout(() => this._input.focus(), 80);
  }

  _renderContext() {
    const [rowCat, colCat] = this._cats;
    document.getElementById('modalIcons').innerHTML = `${catIconHtml(rowCat)} × ${catIconHtml(colCat)}`;
    document.getElementById('modalDesc').innerHTML = t('modalDesc', catText(rowCat, 'desc'), catText(colCat, 'desc'));
  }

  _close() { this._overlay.style.display = 'none'; this._cats = null; }

  _showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
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
