import { getLang } from '../lang.js';

/**
 * Acceso con código beta para los juegos en pruebas (ahora solo el wordle).
 * No es seguridad real (todo se ejecuta en el navegador); solo evita que se juegue sin querer.
 * Para abrir un juego al público: quitar `await unlockGate()` de su main.js.
 * Necesita los estilos .overlay / .modal-card / .modal-input / .btn-confirm del juego.
 */
const HASH = 'e9d43f9b0fa32e205d74f2f047d6b3188bdafa2d4cfbe28ecf38ca8e1f22cf96';   // SHA-256
const KEY  = 'grid_unlocked';   // nombre antiguo: así sigue valiendo el código ya introducido

const TEXT = {
  es: { title: 'Acceso beta', sub: 'Introduce tu código beta para jugar', ph: 'Código beta', btn: 'Entrar', err: 'Código no válido' },
  en: { title: 'Beta access', sub: 'Enter your beta code to play',        ph: 'Beta code',   btn: 'Enter',  err: 'Invalid code' },
};

/** SHA-256 en JS: crypto.subtle no existe fuera de https (p. ej. probando en local por IP). */
function sha256(text) {
  const K = [], H = [];
  const frac = x => (x - Math.floor(x)) * 2 ** 32 | 0;
  for (let n = 2, found = 0; found < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (!prime) continue;
    if (found < 8) H[found] = frac(n ** (1 / 2));
    K[found++] = frac(n ** (1 / 3));
  }
  const data  = new TextEncoder().encode(text);
  const bytes = [...data, 0x80];
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bits = data.length * 8;
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bits >>> (i * 8)) & 0xff);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = [];
    for (let i = 0; i < 64; i++) {
      if (i < 16) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      else {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) | 0, c, b, a, (t1 + t2) | 0];
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

function isUnlocked() {
  try { return localStorage.getItem(KEY) === HASH; } catch { return false; }
}

export function unlockGate() {
  if (isUnlocked()) return Promise.resolve();
  const tx = TEXT[getLang()] ?? TEXT.es;
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal-card"><div class="modal-body">
        <div class="cell-context">
          <span class="cell-context-icons">🧪</span>
          <span class="cell-context-text"><strong>${tx.title}</strong> · ${tx.sub}</span>
        </div>
        <div class="input-wrap">
          <input class="modal-input" type="text" placeholder="${tx.ph}" autocomplete="off" autocapitalize="none" spellcheck="false"
                 style="text-align:center;letter-spacing:3px;text-transform:uppercase">
        </div>
        <p class="error-msg"></p>
        <div class="btn-row"><button class="btn btn-confirm">${tx.btn}</button></div>
      </div></div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('input');
    const error = overlay.querySelector('.error-msg');

    const submit = () => {
      if (sha256(input.value.trim().toLowerCase()) !== HASH) {
        error.textContent = tx.err;
        input.select();
        return;
      }
      try { localStorage.setItem(KEY, HASH); } catch {}
      overlay.remove();
      resolve();
    };
    overlay.querySelector('button').addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    setTimeout(() => input.focus(), 80);
  });
}
