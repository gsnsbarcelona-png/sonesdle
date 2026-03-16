/**
 * ParticlesComponent — Partículas de fondo flotantes + confetti.
 * Compartido por todos los juegos de LOL Pro Games.
 *
 * Uso:
 *   import { ParticlesComponent } from '../../shared/js/ParticlesComponent.js';
 *   const fx = new ParticlesComponent({
 *     particleCanvas: document.getElementById('canvas-particles'),
 *     confettiCanvas: document.getElementById('canvas-confetti'),
 *   });
 *   fx.launchConfetti();   // victoria
 *   fx.launchDefeat();     // derrota
 *   fx.stopConfetti();     // limpiar
 */
export class ParticlesComponent {
  static #WIN_COLORS  = ['#c89b3c', '#f0e6d3', '#0bc4c4', '#00ff88', '#ffffff', '#ff8c55'];
  static #LOSE_COLORS = ['#ff2222', '#880000', '#444444', '#222222', '#661111', '#992222'];

  #pCanvas; #pCtx;
  #cCanvas; #cCtx;
  #particles   = [];
  #confetti    = [];
  #cAnimId     = null;
  #resizeTimer = null;
  #rafParticles;
  #rafConfetti;

  constructor({ particleCanvas, confettiCanvas }) {
    this.#pCanvas = particleCanvas;
    this.#pCtx    = particleCanvas.getContext('2d');
    this.#cCanvas = confettiCanvas;
    this.#cCtx    = confettiCanvas.getContext('2d');

    this.#rafParticles = () => this.#animParticles();
    this.#rafConfetti  = () => this.#animConfetti();

    window.addEventListener('resize', () => {
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = setTimeout(() => { this.#resize(); this.#initParticles(); }, 120);
    });

    this.#resize();
    this.#initParticles();
    this.#animParticles();
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  launchConfetti() {
    this.#spawnPieces(140, ParticlesComponent.#WIN_COLORS, 3.5, 3, 2);
  }

  launchDefeat() {
    this.#spawnPieces(80, ParticlesComponent.#LOSE_COLORS, 1.2, 2, 1);
  }

  stopConfetti() {
    if (this.#cAnimId) { cancelAnimationFrame(this.#cAnimId); this.#cAnimId = null; }
    this.#cCtx.clearRect(0, 0, this.#cCanvas.width, this.#cCanvas.height);
    this.#confetti = [];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  #spawnPieces(n, colors, vxRange, vyMax, vyMin) {
    const w = this.#cCanvas.width;
    const h = this.#cCanvas.height;
    this.#confetti = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * -h * 0.5,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * vxRange,
      vy: Math.random() * vyMax + vyMin,
      rot:  Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.18,
      alpha: 1,
    }));
    if (this.#cAnimId) cancelAnimationFrame(this.#cAnimId);
    this.#animConfetti();
  }

  #resize() {
    this.#pCanvas.width  = this.#cCanvas.width  = window.innerWidth;
    this.#pCanvas.height = this.#cCanvas.height = window.innerHeight;
  }

  #initParticles() {
    const n = Math.floor((window.innerWidth * window.innerHeight) / 14000);
    this.#particles = Array.from({ length: n }, () => ({
      x:  Math.random() * this.#pCanvas.width,
      y:  Math.random() * this.#pCanvas.height,
      r:  Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      a:  Math.random() * 0.4 + 0.08,
    }));
  }

  #animParticles() {
    const ctx = this.#pCtx;
    const w = this.#pCanvas.width;
    const h = this.#pCanvas.height;
    ctx.clearRect(0, 0, w, h);
    for (const p of this.#particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,155,60,${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(this.#rafParticles);
  }

  #animConfetti() {
    const ctx = this.#cCtx;
    const w = this.#cCanvas.width;
    const h = this.#cCanvas.height;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of this.#confetti) {
      p.x += p.vx; p.y += p.vy;
      p.rot += p.rotV;
      if (p.y > h * 0.65) p.alpha -= 0.018;
      if (p.alpha > 0) alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) this.#cAnimId = requestAnimationFrame(this.#rafConfetti);
  }
}
