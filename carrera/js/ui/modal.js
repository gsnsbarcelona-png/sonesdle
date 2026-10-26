import { t } from '../i18n.js';

/** @type {import('../../../shared/js/ParticlesComponent.js').ParticlesComponent | null} */
let _particles = null;

/** Inject the ParticlesComponent instance (called from main.js after boot). */
export function setParticles(p) { _particles = p; }

/** Iconos de trazo del resultado (estáticos, sin datos de usuario). */
const ICON_WIN  = '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8"/></svg>';
const ICON_LOSE = '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>';

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
    : t('modalLoseSub', player.position, player.career[0]?.year);

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
