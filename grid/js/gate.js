/**
 * Acceso con contraseña mientras el grid está en pruebas.
 * No es seguridad real (todo se ejecuta en el navegador); solo evita que se juegue sin querer.
 * Para abrirlo al público: quitar `await unlockGate()` de main.js y borrar este archivo.
 */
const HASH = 'e9d43f9b0fa32e205d74f2f047d6b3188bdafa2d4cfbe28ecf38ca8e1f22cf96';   // SHA-256
const KEY  = 'grid_unlocked';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function isUnlocked() {
  try { return localStorage.getItem(KEY) === HASH; } catch { return false; }
}

export function unlockGate() {
  if (isUnlocked()) return Promise.resolve();
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal-card"><div class="modal-body">
        <div class="cell-context">
          <span class="cell-context-icons">🔒</span>
          <span class="cell-context-text">Grid en pruebas · introduce la contraseña</span>
        </div>
        <div class="input-wrap">
          <input class="modal-input" type="password" placeholder="Contraseña" autocomplete="off">
        </div>
        <p class="error-msg"></p>
        <div class="btn-row"><button class="btn btn-confirm">Entrar</button></div>
      </div></div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('input');
    const error = overlay.querySelector('.error-msg');

    const submit = async () => {
      if (await sha256(input.value) !== HASH) {
        error.textContent = 'Contraseña incorrecta';
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
