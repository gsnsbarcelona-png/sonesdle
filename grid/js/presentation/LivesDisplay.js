import { EVENTS } from '../events.js';

export class LivesDisplay {
  constructor(bus, containerEl) {
    this._el = containerEl;
    bus.on(EVENTS.GAME_STARTED, ({ lives }) => this._init(lives));
    bus.on(EVENTS.GUESS_WRONG,  ({ livesLeft }) => this._loseOne(livesLeft));
  }

  _init(lives) {
    this._el.innerHTML = '<span class="lives-label">Vidas</span>';
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
