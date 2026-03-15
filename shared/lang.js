/**
 * lang.js — Utilidad de idioma compartida para todo LOL Pro Games.
 * Todas las subpáginas usan la clave 'app_lang' en localStorage.
 */

const LANG_KEY = 'app_lang';

const FLAGS = {
  es: { src: 'https://flagcdn.com/w20/es.png', code: 'ES' },
  en: { src: 'https://flagcdn.com/w20/gb.png', code: 'EN' },
};

/** Devuelve el idioma actual ('es' | 'en'). Migra la clave antigua 'dle_lang' si existe. */
export function getLang() {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored) return stored;
  // Migración desde clave antigua del proyecto DLE
  const legacy = localStorage.getItem('dle_lang');
  if (legacy) { localStorage.setItem(LANG_KEY, legacy); return legacy; }
  return 'es';
}

/** Guarda el idioma y emite el evento 'langchange'. */
export function setLang(lang) {
  if (!FLAGS[lang]) return;
  localStorage.setItem(LANG_KEY, lang);
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/**
 * Actualiza todos los elementos [data-i18n] y [data-i18n-ph] con el diccionario dado.
 * @param {{ es: Record<string,string>, en: Record<string,string> }} translations
 */
export function applyStaticTranslations(translations) {
  const dict = translations[getLang()] ?? translations.es ?? {};
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = dict[el.dataset.i18n];
    if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const v = dict[el.dataset.i18nPh];
    if (v !== undefined) el.placeholder = v;
  });
}

/**
 * Monta el selector de idioma.
 * Si se pasa un contenedor, lo añade dentro. Si no, crea un botón fijo arriba a la derecha.
 * @param {HTMLElement|null} [container]
 */
export function mountSwitcher(container = null) {
  const wrapper = document.createElement('div');
  wrapper.id = 'lang-switcher';

  const cur = getLang();
  wrapper.innerHTML = `
    <button id="lang-btn" type="button" aria-label="Cambiar idioma / Change language">
      <img id="lang-flag" src="${FLAGS[cur].src}" width="20" height="14" alt="">
      <span id="lang-code">${FLAGS[cur].code}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <div id="lang-menu" hidden>
      <button class="lang-option" data-lang="es" type="button">
        <img src="${FLAGS.es.src}" width="20" height="14" alt=""> ES — Español
      </button>
      <button class="lang-option" data-lang="en" type="button">
        <img src="${FLAGS.en.src}" width="20" height="14" alt=""> EN — English
      </button>
    </div>`;

  if (container) {
    container.appendChild(wrapper);
  } else {
    wrapper.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999';
    document.body.appendChild(wrapper);
  }

  _injectStyles();
  _bindEvents(wrapper);
}

function _injectStyles() {
  if (document.getElementById('lang-switcher-styles')) return;
  const s = document.createElement('style');
  s.id = 'lang-switcher-styles';
  s.textContent = `
    #lang-switcher { position: relative; font-family: 'Rajdhani', sans-serif; }
    #lang-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; cursor: pointer;
      background: #0a1428; border: 1px solid #1e3a5f; color: #c8d4e8;
      font-size: 0.7rem; font-weight: 700; letter-spacing: 1px;
      transition: border-color 0.2s, color 0.2s;
    }
    #lang-btn:hover { border-color: #c89b3c; color: #c89b3c; }
    #lang-menu {
      position: absolute; right: 0; top: calc(100% + 4px);
      background: #0a1428; border: 1px solid #1e3a5f;
      min-width: 140px; z-index: 10000;
    }
    .lang-option {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 12px; cursor: pointer;
      background: none; border: none; color: #c8d4e8;
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.5px;
      font-family: 'Rajdhani', sans-serif;
      transition: background 0.15s, color 0.15s;
    }
    .lang-option:hover { background: rgba(200,155,60,0.1); color: #c89b3c; }
  `;
  document.head.appendChild(s);
}

function _bindEvents(wrapper) {
  const menu = wrapper.querySelector('#lang-menu');
  const btn  = wrapper.querySelector('#lang-btn');
  const flag = wrapper.querySelector('#lang-flag');
  const code = wrapper.querySelector('#lang-code');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });

  wrapper.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const lang = opt.dataset.lang;
      setLang(lang);
      flag.src         = FLAGS[lang].src;
      code.textContent = FLAGS[lang].code;
      menu.hidden      = true;
    });
  });

  document.addEventListener('click', () => { menu.hidden = true; });
}
