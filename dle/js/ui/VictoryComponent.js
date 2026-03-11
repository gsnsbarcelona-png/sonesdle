import { flagImg, esc } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

export class VictoryComponent {
  #overlay;
  #titleEl;
  #playerEl;
  #realEl;
  #triesEl;
  #imgEl;

  constructor({ overlayEl, titleEl, playerEl, realEl, triesEl, imgEl, onRestart }) {
    this.#overlay  = overlayEl;
    this.#titleEl  = titleEl;
    this.#playerEl = playerEl;
    this.#realEl   = realEl;
    this.#triesEl  = triesEl;
    this.#imgEl    = imgEl;

    overlayEl
      .querySelector('.btn-restart')
      ?.addEventListener('click', onRestart);
  }

  show(secret, attempts) {
    const gaveUp = attempts === 0;

    this.#titleEl.textContent = gaveUp ? t('giveUpTitle') : t('victory');

    this.#playerEl.innerHTML = `${flagImg(secret.flag, 24)} ${esc(secret.name)}`;

    this.#realEl.textContent  = secret.real;
    this.#triesEl.textContent = gaveUp
      ? t('triesGaveUp')
      : attempts === 1
        ? t('triesFirst')
        : t('triesN', attempts);

    if (secret.image && this.#imgEl) {
      this.#imgEl.classList.add('hidden');
      const preload = new Image();
      preload.onload = () => {
        this.#imgEl.src = secret.image;
        this.#imgEl.alt = secret.name;
        this.#imgEl.classList.remove('hidden');
      };
      preload.onerror = () => this.#imgEl.classList.add('hidden');
      preload.src = secret.image;
    } else if (this.#imgEl) {
      this.#imgEl.classList.add('hidden');
    }

    this.#overlay.classList.remove('hidden');
  }

  hide() {
    this.#overlay.classList.add('hidden');
  }
}
