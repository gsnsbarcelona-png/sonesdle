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

  // Dos idiomas: un selector ES | EN de un clic (un desplegable taparía los iconos de juego)
  const cur = getLang();
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'Idioma / Language');
  wrapper.innerHTML = Object.entries(FLAGS).map(([lang, f]) => `
    <button class="lang-option${lang === cur ? ' active' : ''}" data-lang="${lang}" type="button"
            aria-pressed="${lang === cur}" title="${lang === 'es' ? 'Español' : 'English'}">
      <img src="${f.src}" width="18" height="12" alt="${f.code}"><span class="lang-code">${f.code}</span>
    </button>`).join('');

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
    #lang-switcher {
      display: flex; font-family: 'Rajdhani', sans-serif;
      background: #0a1428; border: 1px solid #1e3a5f;
    }
    .lang-option {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 9px; cursor: pointer;
      background: none; border: none; color: #4a6080;
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.7rem; font-weight: 700; letter-spacing: 1px;
      transition: background 0.15s, color 0.15s;
    }
    .lang-option + .lang-option { border-left: 1px solid #1e3a5f; }
    .lang-option img { opacity: 0.45; transition: opacity 0.15s; }
    .lang-option:hover { color: #c8d4e8; }
    .lang-option:hover img { opacity: 0.8; }
    .lang-option.active { color: #c89b3c; background: rgba(200,155,60,0.1); cursor: default; }
    .lang-option.active img { opacity: 1; }
    /* Móvil: solo banderas, para no pisar el título de la cabecera */
    @media (max-width: 480px) {
      .lang-option { padding: 6px 7px; }
      .lang-code { display: none; }
    }
  `;
  document.head.appendChild(s);
}

function _bindEvents(wrapper) {
  const options = wrapper.querySelectorAll('.lang-option');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      const lang = opt.dataset.lang;
      if (lang === getLang()) return;
      setLang(lang);
      options.forEach(o => {
        o.classList.toggle('active', o === opt);
        o.setAttribute('aria-pressed', String(o === opt));
      });
    });
  });
}
