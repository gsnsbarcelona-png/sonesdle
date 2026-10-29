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

function mount() {
  if (seen() || document.getElementById('storage-notice')) return;

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
