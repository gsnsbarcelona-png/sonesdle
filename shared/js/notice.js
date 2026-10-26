/**
 * notice.js — Aviso de almacenamiento local, común a toda la web.
 *
 * El sitio no usa cookies, analítica, publicidad ni terceros: solo guarda en el navegador lo
 * imprescindible (progreso, idioma, sesión de la cuenta). Ese almacenamiento está exento de
 * consentimiento, así que basta un aviso informativo y descartable, no un banner de
 * aceptar/rechazar. Se muestra una vez y se recuerda en localStorage.
 */
import { getLang } from '../lang.js';

const KEY = 'storage_notice_ok';

const TEXT = {
  es: {
    label: 'Aviso de almacenamiento',
    msg:   'Esta web no usa cookies de publicidad ni de seguimiento: solo guarda en tu navegador tu progreso, idioma y sesión.',
    link:  'Política de privacidad',
    ok:    'Entendido',
  },
  en: {
    label: 'Storage notice',
    msg:   'This site uses no advertising or tracking cookies: it only stores your progress, language and session in your browser.',
    link:  'Privacy policy',
    ok:    'Got it',
  },
};

const tx = () => TEXT[getLang()] ?? TEXT.es;

function seen() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
function remember() {
  try { localStorage.setItem(KEY, '1'); } catch { /* modo privado: se volverá a mostrar */ }
}

const CSS = `
#storage-notice{position:fixed;left:0;right:0;bottom:0;z-index:9990;box-sizing:border-box;
  background:var(--surface);border-top:1px solid #8a6a1f;box-shadow:0 -8px 40px rgba(0,0,0,.6);
  padding:12px 16px;font-family:var(--font-body)}
#storage-notice .sn-wrap{max-width:960px;margin:0 auto;display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap}
#storage-notice p{flex:1;min-width:220px;margin:0;font-size:.85rem;line-height:1.45;color:#a9bfd8}
#storage-notice a{color:#e8b84a;text-decoration:underline;white-space:nowrap}
#storage-notice button{font:700 .75rem var(--font-body);letter-spacing:2px;text-transform:uppercase;
  padding:9px 20px;border:1px solid #e8b84a;background:#e8b84a;color:#0b0d10;border-radius:3px;cursor:pointer}
#storage-notice button:hover{background:#e9edf1;border-color:#e9edf1}
#storage-notice button:focus-visible,#storage-notice a:focus-visible{outline:2px solid #e9edf1;outline-offset:2px}
@media (prefers-reduced-motion:no-preference){#storage-notice{animation:sn-up .35s ease both}}
@keyframes sn-up{from{transform:translateY(100%)}to{transform:none}}
`;

function mount() {
  if (seen() || document.getElementById('storage-notice')) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'storage-notice';
  el.setAttribute('role', 'region');
  el.innerHTML = '<div class="sn-wrap"><p><span class="sn-msg"></span> <a class="sn-link" href="/privacidad.html"></a></p>'
               + '<button type="button" class="sn-ok"></button></div>';
  document.body.appendChild(el);

  const render = () => {
    const s = tx();
    el.setAttribute('aria-label', s.label);
    el.querySelector('.sn-msg').textContent  = s.msg;
    el.querySelector('.sn-link').textContent = s.link;
    el.querySelector('.sn-ok').textContent   = s.ok;
  };
  render();
  document.addEventListener('langchange', render);

  el.querySelector('.sn-ok').addEventListener('click', () => {
    remember();
    document.removeEventListener('langchange', render);
    el.remove();
    style.remove();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
