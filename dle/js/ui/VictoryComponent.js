import { flagImg, esc } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

const PLACEHOLDER = './img/player-placeholder.svg';   // jugadores sin foto en Leaguepedia

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
    document.getElementById('v-icon')?.classList.toggle('hidden', gaveUp);   // el trofeo solo si se acierta

    this.#playerEl.innerHTML = `${flagImg(secret.flag, 24)} ${esc(secret.name)}`;

    this.#realEl.textContent  = secret.real;
    this.#triesEl.textContent = gaveUp
      ? t('triesGaveUp')
      : attempts === 1
        ? t('triesFirst')
        : t('triesN', attempts);

    if (this.#imgEl) {
      const img = this.#imgEl;
      img.alt = secret.name;
      img.classList.remove('hidden');
      img.src = PLACEHOLDER;   // hasta que llegue la foto, o si no hay
      if (secret.image) {
        const preload = new Image();
        preload.referrerPolicy = 'no-referrer';   // la foto es de un tercero: no se le dice qué página la pide
        preload.onload = () => { img.src = secret.image; };
        preload.src = secret.image;   // si falla, se queda el marcador
      }
    }

    this.#overlay.classList.remove('hidden');
  }

  hide() {
    this.#overlay.classList.add('hidden');
  }
}
