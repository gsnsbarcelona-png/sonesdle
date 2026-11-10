import { iconHtml } from '../../../shared/js/icons.js';
import { t } from '../i18n.js';

/** @type {import('../../../shared/js/ParticlesComponent.js').ParticlesComponent | null} */
let _particles = null;

/** Inject the ParticlesComponent instance (called from main.js after boot). */
export function setParticles(p) { _particles = p; }

/** Iconos de trazo del resultado (estáticos, sin datos de usuario). */
const ICON_WIN  = iconHtml('trophy', 56);
const ICON_LOSE = iconHtml('defeat', 56);

/**
 * Años de la carrera ("2017–2026"): del primero de la primera etapa al último de la última.
 * Las etapas traen "2017–21" (rango) o "2019" (un año), así que no se puede usar el texto tal cual.
 * @param {{ year: string }[]} career
 */
export function careerSpan(career) {
  const start = parseInt(career[0]?.year, 10);
  const lastYear = career[career.length - 1]?.year ?? '';
  const [from, to] = lastYear.split('–');
  const end = to ? Math.floor(parseInt(from, 10) / 100) * 100 + parseInt(to, 10) : parseInt(from, 10);
  if (isNaN(start) || isNaN(end)) return '';
  return start === end ? String(start) : `${start}–${end}`;
}

const overlayEl = () => document.getElementById('modal-overlay');
const modalEl   = () => document.getElementById('modal');

/**
 * Shows the end-of-round modal.
 *
 * @param {boolean} won
 * @param {import('../data/players.js').Player} player
 * @param {{ wins: number, played: number, streak: number }} stats
 * @param {{ name: string, correct: boolean, isHint?: boolean }[]} attempts
 */
export function showModal(won, player, stats, attempts) {
  const overlay = overlayEl();
  const modal   = modalEl();

  modal.className = `modal ${won ? 'win' : 'lose'}`;

  document.getElementById('modal-icon').innerHTML = won ? ICON_WIN : ICON_LOSE;
  document.getElementById('modal-title').textContent = won ? t('modalWin') : t('modalLose');
  document.getElementById('modal-player').textContent = player.name;

  document.getElementById('modal-subtitle').textContent = won
    ? t('modalWinSub', player.position, attempts.length)
    : t('modalLoseSub', player.position, careerSpan(player.career));

  document.getElementById('modal-wins').textContent   = stats.wins;
  document.getElementById('modal-played').textContent = stats.played;
  document.getElementById('modal-streak').textContent = stats.streak;

  overlay.classList.add('open');

  if (_particles) {
    if (won) _particles.launchConfetti();
    else     _particles.launchDefeat();
  }
}

/** Hides the modal and stops confetti. */
export function hideModal() {
  overlayEl().classList.remove('open');
  if (_particles) _particles.stopConfetti();
}
