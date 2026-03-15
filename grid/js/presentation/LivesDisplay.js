import { EVENTS } from '../events.js';
import { t } from '../i18n.js';

export class LivesDisplay {
  constructor(bus, containerEl) {
    this._el = containerEl;
    bus.on(EVENTS.GAME_STARTED, ({ lives }) => this._init(lives));
    bus.on(EVENTS.GUESS_WRONG,  ({ livesLeft }) => this._loseOne(livesLeft));
    document.addEventListener('langchange', () => {
      const lbl = this._el.querySelector('.lives-label');
      if (lbl) lbl.textContent = t('lives');
    });
  }

  _init(lives) {
    this._el.innerHTML = `<span class="lives-label">${t('lives')}</span>`;
    for (let i = 0; i < lives; i++) {
      const h = document.createElement('span');
      h.className = 'heart';
      h.id = `heart-${i}`;
      h.textContent = '❤️';
      this._el.appendChild(h);
    }
  }

  _loseOne(livesLeft) {
    document.getElementById(`heart-${livesLeft}`)?.classList.add('lost');
  }
}
