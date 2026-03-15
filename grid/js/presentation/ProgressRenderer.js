import { EVENTS } from '../events.js';
import { t } from '../i18n.js';

export class ProgressRenderer {
  constructor(bus, containerEl) {
    this._el = containerEl;
    bus.on(EVENTS.GAME_STARTED,  () => this._init());
    bus.on(EVENTS.GUESS_CORRECT, ({ filledCount }) => this._activate(filledCount - 1));
    document.addEventListener('langchange', () => {
      const lbl = this._el.querySelector('.progress-label');
      if (lbl) lbl.textContent = t('cells');
    });
  }

  _init() {
    this._el.innerHTML = `<span class="progress-label">${t('cells')}</span>`;
    for (let i = 0; i < 9; i++) {
      const p = document.createElement('div');
      p.className = 'pip';
      p.id = `pip-${i}`;
      this._el.appendChild(p);
    }
  }

  _activate(i) { document.getElementById(`pip-${i}`)?.classList.add('active'); }
}
