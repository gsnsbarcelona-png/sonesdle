const COLORS = ['#C89B3C', '#F0D270', '#0BC4E3', '#00C853', '#E84057'];

/**
 * Spawns confetti pieces inside `parentEl`.
 * Each piece removes itself after its animation ends.
 *
 * @param {HTMLElement} parentEl
 * @param {number} [count=30]
 */
export function spawnConfetti(parentEl, count = 30) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    const cx = `${(Math.random() - 0.5) * 400}px`;
    const cy = `${-(Math.random() * 300 + 100)}px`;

    piece.style.cssText = [
      `left:${Math.random() * 100}%`,
      `top:50%`,
      `background:${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
      `--cx:${cx}`,
      `--cy:${cy}`,
      `animation-delay:${(Math.random() * 0.3).toFixed(2)}s`,
    ].join(';');

    parentEl.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
}
