import { EVENTS } from '../events.js';
import { t } from '../i18n.js';

const HEART = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>';

export class LivesDisplay {
  constructor(bus, containerEl) {
    this._el = containerEl;
    bus.on(EVENTS.GAME_STARTED, ({ lives, maxLives = lives }) => this._init(lives, maxLives));
    bus.on(EVENTS.GUESS_WRONG,  ({ livesLeft }) => this._loseOne(livesLeft));
    document.addEventListener('langchange', () => {
      const lbl = this._el.querySelector('.lives-label');
      if (lbl) lbl.textContent = t('lives');
    });
  }

  /** `lives` < `maxLives` al recuperar un reto diario a medias. */
  _init(lives, maxLives) {
    this._el.innerHTML = `<span class="lives-label">${t('lives')}</span>`;
    for (let i = 0; i < maxLives; i++) {
      const h = document.createElement('span');
      h.className = 'heart' + (i >= lives ? ' lost' : '');
      h.id = `heart-${i}`;
      h.innerHTML = HEART;
      this._el.appendChild(h);
    }
  }

  _loseOne(livesLeft) {
    document.getElementById(`heart-${livesLeft}`)?.classList.add('lost');
  }
}
