import { EVENTS } from '../events.js';

export class GridRenderer {
  constructor(bus, containerEl) {
    this._bus  = bus;
    this._el   = containerEl;
    this._cols = [];
    this._rows = [];

    bus.on(EVENTS.GAME_STARTED, ({ cols, rows }) => {
      this._cols = cols; this._rows = rows; this._render();
    });
    bus.on(EVENTS.GUESS_CORRECT, ({ r, c, key, emoji }) => {
      this._fillCell(r, c, key, emoji);
      const rect = this._getCell(r, c)?.getBoundingClientRect();
      if (rect) bus.emit(EVENTS.CELL_RENDERED, { rect });
    });
  }

  _render() {
    this._el.innerHTML = '';
    const corner = document.createElement('div');
    corner.className = 'corner';
    this._el.appendChild(corner);
    this._cols.forEach(c => this._el.appendChild(this._colLabel(c)));
    for (let r = 0; r < 3; r++) {
      this._el.appendChild(this._rowLabel(this._rows[r]));
      for (let c = 0; c < 3; c++) this._el.appendChild(this._makeCell(r, c));
    }
  }

  _colLabel(cat) {
    const d = document.createElement('div');
    d.className = 'col-label';
    d.innerHTML = `<span class="lbl-icon">${cat.icon}</span>
                   <span class="lbl-main">${cat.main}</span>
                   <span class="lbl-sub">${cat.sub}</span>`;
    return d;
  }

  _rowLabel(cat) {
    const d = document.createElement('div');
    d.className = 'row-label';
    d.innerHTML = `<span class="lbl-icon">${cat.icon}</span>
                   <span class="lbl-main">${cat.main}</span>
                   <span class="lbl-sub">${cat.sub}</span>`;
    return d;
  }

  _makeCell(r, c) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.r = r;
    d.dataset.c = c;
    d.innerHTML = '<span class="cell-plus">+</span>';
    d.addEventListener('click', () => this._bus.emit(EVENTS.CELL_CLICKED, { r, c }));
    return d;
  }

  _fillCell(r, c, key, emoji) {
    const el = this._getCell(r, c);
    if (!el) return;
    el.innerHTML = `<div class="cell-content">
      <span class="cell-emoji">${emoji}</span>
      <span class="cell-name">${this._display(key)}</span>
    </div>`;
    el.classList.add('filled');
  }

  _getCell(r, c) { return this._el.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }
  _display(key)  { return key.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); }
}
