import { EVENTS } from '../events.js';
import { esc, catText, emojiHtml, catIconHtml } from '../i18n.js';

export class GridRenderer {
  constructor(bus, containerEl) {
    this._bus  = bus;
    this._el   = containerEl;
    this._cols = [];
    this._rows = [];

    bus.on(EVENTS.GAME_STARTED, ({ cols, rows }) => {
      this._cols = cols; this._rows = rows; this._render();
    });
    bus.on(EVENTS.GUESS_CORRECT, ({ r, c, name, emoji }) => {
      this._fillCell(r, c, name, emoji);
      const rect = this._getCell(r, c)?.getBoundingClientRect();
      if (rect) bus.emit(EVENTS.CELL_RENDERED, { rect });
    });
    document.addEventListener('langchange', () => this._relabel());
  }

  /** Cambia el idioma de las cabeceras sin tocar las casillas ya rellenas. */
  _relabel() {
    const labels = this._el.querySelectorAll('.col-label, .row-label');
    [...this._cols, ...this._rows].forEach((cat, i) => { if (labels[i]) labels[i].innerHTML = this._labelHtml(cat); });
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

  _colLabel(cat) { return this._label('col-label', cat); }
  _rowLabel(cat) { return this._label('row-label', cat); }

  _label(className, cat) {
    const d = document.createElement('div');
    d.className = className;
    d.innerHTML = this._labelHtml(cat);
    return d;
  }

  _labelHtml(cat) {
    return `<span class="lbl-icon">${catIconHtml(cat)}</span>
            <span class="lbl-main">${catText(cat, 'main')}</span>
            <span class="lbl-sub">${catText(cat, 'sub')}</span>`;
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

  _fillCell(r, c, name, emoji) {
    const el = this._getCell(r, c);
    if (!el) return;
    el.innerHTML = `<div class="cell-content">
      <span class="cell-emoji">${emojiHtml(emoji)}</span>
      <span class="cell-name">${esc(name)}</span>
    </div>`;
    el.classList.add('filled');
  }

  _getCell(r, c) { return this._el.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }
}
