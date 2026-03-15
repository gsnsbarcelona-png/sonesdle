import { t } from '../i18n.js';

/** @type {import('./particles.js').ParticlesComponent | null} */
let _particles = null;

/** Inject the ParticlesComponent instance (called from main.js after boot). */
export function setParticles(p) { _particles = p; }

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

  document.getElementById('modal-icon').textContent = won ? '🏆' : '💀';
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
