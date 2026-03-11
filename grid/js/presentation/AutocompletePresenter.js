import { EVENTS } from '../events.js';

export class AutocompletePresenter {
  constructor(bus, inputEl, listEl) {
    this._bus   = bus;
    this._input = inputEl;
    this._list  = listEl;
    this._idx   = -1;

    bus.on(EVENTS.AC_RESULTS,    ({ matches, emojiMap }) => this._update(matches, emojiMap));
    bus.on(EVENTS.MODAL_CLOSE,   () => this._clear());
    bus.on(EVENTS.GAME_STARTED,  () => this._clear());
    bus.on(EVENTS.INPUT_KEYDOWN, ({ dir }) => this._navigate(dir));
  }

  /** Called synchronously by InputCoordinator on Enter. */
  confirmFocused() {
    const items = this._list.querySelectorAll('.ac-item');
    if (this._idx >= 0 && items[this._idx]) {
      this._bus.emit(EVENTS.AC_SELECTED, { key: items[this._idx].dataset.key });
      return true;
    }
    return false;
  }

  _update(matches, emojiMap) {
    this._idx = -1;
    if (!matches.length) { this._clear(); return; }
    this._list.innerHTML = matches
      .map(p => `<div class="ac-item" data-key="${p}">${emojiMap[p] || '🎮'} ${this._display(p)}</div>`)
      .join('');
    this._list.classList.add('open');
    this._list.querySelectorAll('.ac-item').forEach(item =>
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        this._bus.emit(EVENTS.AC_SELECTED, { key: item.dataset.key });
      })
    );
  }

  _clear() { this._list.innerHTML = ''; this._list.classList.remove('open'); this._idx = -1; }

  _navigate(dir) {
    const items = this._list.querySelectorAll('.ac-item');
    if (!items.length) return;
    if (dir === 'down') this._idx = Math.min(this._idx + 1, items.length - 1);
    else                this._idx = Math.max(this._idx - 1, 0);
    items.forEach((it, i) => it.classList.toggle('focused', i === this._idx));
    if (items[this._idx]) this._input.value = this._display(items[this._idx].dataset.key);
  }

  _display(key) { return key.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); }
}
