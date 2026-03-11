import { EVENTS } from '../events.js';

export class ParticleSystem {
  constructor(bus, bgEl, confettiEl) {
    this._bg   = bgEl;       this._bctx = bgEl.getContext('2d');
    this._cc   = confettiEl; this._cctx = confettiEl.getContext('2d');
    this._conf = []; this._bgParts = null;
    this._rainActive = false; this._rainTimer = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._bgLoop();
    this._confLoop();

    bus.on(EVENTS.CELL_RENDERED, ({ rect }) =>
      this._cellBurst(rect.left + rect.width / 2, rect.top + rect.height / 2)
    );
    bus.on(EVENTS.GAME_WON,   () => this._startRain());
    bus.on(EVENTS.GAME_RESET, () => this._stopRain());
    bus.on(EVENTS.GAME_LOST,  () => this._stopRain());
  }

  _cellBurst(x, y) {
    const colors = ['#c89b3c','#f0e6d3','#0bc4c4','#00ff88','#fff'];
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 5 + 2;
      this._conf.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1, decay: .025, gravity: .1,
      });
    }
  }

  _startRain() {
    this._rainActive = true;
    this._rainTimer = setInterval(() => {
      if (!this._rainActive) { clearInterval(this._rainTimer); return; }
      const colors = ['#c89b3c','#f0e6d3','#0bc4c4','#00ff88','#fff','#ff8c55'];
      for (let i = 0; i < 8; i++) {
        this._conf.push({
          x: Math.random() * this._cc.width, y: -10,
          vx: (Math.random() - .5) * 3, vy: Math.random() * 3 + 1.5,
          size: Math.random() * 5 + 3, rot: Math.random() * 360, rotSpeed: (Math.random() - .5) * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1, decay: .006, gravity: .04,
        });
      }
    }, 60);
  }

  _stopRain() { this._rainActive = false; clearInterval(this._rainTimer); }

  _bgLoop() {
    if (!this._bgParts)
      this._bgParts = Array.from({ length: 80 }, () => ({
        x: Math.random() * this._bg.width, y: Math.random() * this._bg.height,
        r: Math.random() * 1.4 + .4, alpha: Math.random() * .3 + .05, speed: Math.random() * .3 + .1,
      }));
    this._bctx.clearRect(0, 0, this._bg.width, this._bg.height);
    for (const p of this._bgParts) {
      this._bctx.save();
      this._bctx.globalAlpha = p.alpha; this._bctx.fillStyle = '#c89b3c';
      this._bctx.shadowColor = '#c89b3c'; this._bctx.shadowBlur = 4;
      this._bctx.beginPath(); this._bctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); this._bctx.fill();
      this._bctx.restore();
      p.y -= p.speed;
      if (p.y < -4) { p.y = this._bg.height + 4; p.x = Math.random() * this._bg.width; }
    }
    requestAnimationFrame(() => this._bgLoop());
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
    requestAnimationFrame(() => this._confLoop());
  }

  _resize() {
    const w = innerWidth, h = innerHeight;
    this._bg.width = w; this._bg.height = h;
    this._cc.width = w; this._cc.height = h;
    this._bgParts = null;
  }
}
