import { EVENTS } from '../events.js';
import { prefersReducedMotion } from '../../../shared/js/a11y.js';

export class ParticleSystem {
  constructor(bus, confettiEl) {
    this._cc   = confettiEl; this._cctx = confettiEl.getContext('2d');
    this._conf = [];
    this._rainActive = false; this._rainTimer = null; this._confRunning = false;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._still = prefersReducedMotion();   // sin movimiento: sin confeti

    bus.on(EVENTS.CELL_RENDERED, ({ rect }) =>
      this._cellBurst(rect.left + rect.width / 2, rect.top + rect.height / 2)
    );
    bus.on(EVENTS.GAME_WON,   ({ restored } = {}) => { if (!restored) this._startRain(); });
    bus.on(EVENTS.GAME_RESET, () => this._stopRain());
    bus.on(EVENTS.GAME_LOST,  () => this._stopRain());
  }

  _cellBurst(x, y) {
    if (this._still) return;
    const colors = ['#e8b84a','#e9edf1','#0bc4c4','#00ff88','#fff'];
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 5 + 2;
      this._conf.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1, decay: .025, gravity: .1,
      });
    }
    this._startConfLoop();
  }

  _startRain() {
    if (this._still) return;
    this._rainActive = true;
    this._rainTimer = setInterval(() => {
      if (!this._rainActive) { clearInterval(this._rainTimer); return; }
      const colors = ['#e8b84a','#e9edf1','#0bc4c4','#00ff88','#fff','#ff8c55'];
      for (let i = 0; i < 8; i++) {
        this._conf.push({
          x: Math.random() * this._cc.width, y: -10,
          vx: (Math.random() - .5) * 3, vy: Math.random() * 3 + 1.5,
          size: Math.random() * 5 + 3, rot: Math.random() * 360, rotSpeed: (Math.random() - .5) * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1, decay: .006, gravity: .04,
        });
      }
      this._startConfLoop();
    }, 60);
  }

  _stopRain() { this._rainActive = false; clearInterval(this._rainTimer); }

  /** El bucle del confeti solo corre mientras hay partículas. */
  _startConfLoop() {
    if (this._confRunning) return;
    this._confRunning = true;
    this._confLoop();
  }

  _confLoop() {
    this._cctx.clearRect(0, 0, this._cc.width, this._cc.height);
    this._conf = this._conf.filter(p => p.alpha > 0);
    for (const p of this._conf) {
      this._cctx.save();
      this._cctx.globalAlpha = p.alpha; this._cctx.fillStyle = p.color;
      if (p.rot !== undefined) {
        this._cctx.translate(p.x, p.y); this._cctx.rotate(p.rot * Math.PI / 180);
        this._cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .5);
      } else {
        this._cctx.shadowColor = p.color; this._cctx.shadowBlur = 5;
        this._cctx.beginPath(); this._cctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); this._cctx.fill();
      }
      this._cctx.restore();
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
      if (p.rot !== undefined) p.rot += p.rotSpeed;
      if (p.y > this._cc.height * .65) p.alpha -= .018; else p.alpha -= p.decay;
    }
    if (this._conf.length || this._rainActive) {
      requestAnimationFrame(() => this._confLoop());
    } else {
      this._confRunning = false;
      this._cctx.clearRect(0, 0, this._cc.width, this._cc.height);
    }
  }

  _resize() {
    this._cc.width = innerWidth; this._cc.height = innerHeight;
  }
}
