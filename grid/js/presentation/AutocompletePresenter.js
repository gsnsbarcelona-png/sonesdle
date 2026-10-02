import { EVENTS } from '../events.js';
import { esc } from '../i18n.js';

export class AutocompletePresenter {
  constructor(bus, inputEl, listEl) {
    this._bus   = bus;
    this._input = inputEl;
    this._list  = listEl;
    this._idx   = -1;

    bus.on(EVENTS.AC_RESULTS,    ({ matches }) => this._update(matches));
    bus.on(EVENTS.MODAL_CLOSE,   () => this._clear());
    bus.on(EVENTS.GAME_STARTED,  () => this._clear());
    bus.on(EVENTS.INPUT_KEYDOWN, ({ dir }) => this._navigate(dir));
  }

  /** Called synchronously by InputCoordinator on Enter. */
  confirmFocused() {
    const items = this._selectable();
    if (this._idx >= 0 && items[this._idx]) {
      this._bus.emit(EVENTS.AC_SELECTED, { key: items[this._idx].dataset.key });
      return true;
    }
    return false;
  }

  _update(matches) {
    this._idx = -1;
    if (!matches.length) { this._clear(); return; }
    this._list.innerHTML = matches
      .map(p => p.tried
        ? `<div class="ac-item tried">❌ <span>${esc(p.name)}</span></div>`
        : `<div class="ac-item" data-key="${esc(p.key)}" data-name="${esc(p.name)}">${p.em || '🎮'} ${esc(p.name)}</div>`)
      .join('');
    this._list.classList.add('open');
    this._selectable().forEach(item =>
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        this._bus.emit(EVENTS.AC_SELECTED, { key: item.dataset.key });
      })
    );
  }

  _clear() { this._list.innerHTML = ''; this._list.classList.remove('open'); this._idx = -1; }

  /** Los jugadores ya fallados en esta casilla se ven en la lista pero no se pueden elegir. */
  _selectable() { return this._list.querySelectorAll('.ac-item:not(.tried)'); }

  _navigate(dir) {
    const items = this._selectable();
    if (!items.length) return;
    if (dir === 'down') this._idx = Math.min(this._idx + 1, items.length - 1);
    else                this._idx = Math.max(this._idx - 1, 0);
    items.forEach((it, i) => it.classList.toggle('focused', i === this._idx));
    if (items[this._idx]) this._input.value = items[this._idx].dataset.name;
  }
}
