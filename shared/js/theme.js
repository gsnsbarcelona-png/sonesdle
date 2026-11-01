/** Botón para cambiar entre tema claro y oscuro. La elección se guarda en este navegador. */
import { getLang } from '../lang.js';

const KEY = 'app_theme';

const SUN  = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
const LABEL = {
  es: { toLight: 'Cambiar a tema claro', toDark: 'Cambiar a tema oscuro' },
  en: { toLight: 'Switch to light theme', toDark: 'Switch to dark theme' },
};

/** Tema que se está viendo ahora: el elegido o, si no hay, el del sistema. */
export function currentTheme() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function mountThemeToggle(container) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gnav-icon-btn theme-toggle';

  const render = () => {
    const dark = currentTheme() === 'dark';
    const text = (LABEL[getLang()] ?? LABEL.es)[dark ? 'toLight' : 'toDark'];
    btn.title = text;
    btn.setAttribute('aria-label', text);
    // Muestra a qué tema se pasa: sol en oscuro, luna en claro
    btn.innerHTML = `<svg class="gnav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dark ? SUN : MOON}</svg>`;
  };

  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* modo privado: solo esta visita */ }
    render();
  });
  document.addEventListener('langchange', render);
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', render);

  render();
  container.appendChild(btn);
  return btn;
}
