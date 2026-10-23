// Partículas flotantes
const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');
const GOLD   = ['#c89b3c22','#785a2818','#0bc4c412','#1e3a5f30'];
let W, H, pts = [];

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function spawn() {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.4,
    vx: (Math.random() - 0.5) * 0.25,
    vy: -Math.random() * 0.3 - 0.1,
    c: GOLD[Math.floor(Math.random() * GOLD.length)],
  };
}

function init() { pts = Array.from({ length: 55 }, spawn); }

function draw() {
  ctx.clearRect(0, 0, W, H);
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.c;
    ctx.fill();
    p.x += p.vx; p.y += p.vy;
    if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
  });
  requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize(); init();
// Quien pide menos movimiento ve las partículas quietas
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill(); }); }
else draw();
