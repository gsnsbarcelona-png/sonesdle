/**
 * nav.js — Cabecera compartida para LOL Pro Games.
 * Barra única: marca (link a inicio) · iconos de cada juego · cuenta + idioma
 */
import { mountAccount } from './account.js';
import { mountThemeToggle } from './js/theme.js';
import { iconHtml } from './js/icons.js';

const GAMES = [
  { id: 'dle',        href: '../dle/',        name: 'Adivina el Pro',  tag: 'Pistas'       },
  { id: 'rostergues', href: '../rostergues/', name: 'Roster Guess',    tag: 'Roster'       },
  { id: 'carrera',    href: '../carrera/',    name: 'Career Guess',    tag: 'Career'       },
  { id: 'grid',       href: '../grid/',       name: 'Pro Grid',        tag: 'Grid'         },
  { id: 'wordle',     href: '../wordle/',     name: 'Pro Wordle',      tag: 'Wordle'       },
  { id: 'familias',   href: '../familias/',   name: 'Family Grid',     tag: 'Familias'     },
];


function getCurrentId() {
  const path = window.location.pathname;
  return GAMES.find(g => path.includes('/' + g.id + '/'))?.id ?? null;
}

export function mountGameNav() {
  const currentId = getCurrentId();

  // Barra única: marca · juegos · cuenta + idioma
  const header = document.createElement('header');
  header.id = 'game-header';

  const brandLink = document.createElement('a');
  brandLink.id   = 'game-brand-link';
  brandLink.href = '../';
  brandLink.textContent = 'LoL Pro Games';

  const iconsRow = document.createElement('nav');
  iconsRow.id = 'game-nav-icons';
  iconsRow.setAttribute('aria-label', 'Juegos');

  GAMES.forEach(g => {
    const el = document.createElement('a');
    el.href = g.href;
    el.className = 'gnav-icon-btn' + (g.id === currentId ? ' gnav-current' : '');
    el.title = g.name;
    el.setAttribute('aria-label', g.name);
    el.innerHTML = iconHtml(g.id, 22, 'gnav-svg');
    if (g.id === currentId) el.setAttribute('aria-current', 'page');
    iconsRow.appendChild(el);
  });

  const right = document.createElement('div');
  right.id = 'game-topbar-right';
  mountThemeToggle(right);
  mountAccount(right, currentId);

  header.append(brandLink, iconsRow, right);
  document.body.prepend(header);

  // Mover #lang-switcher al lado de la cuenta
  _adoptLangSwitcher(right);
}

function _adoptLangSwitcher(slot) {
  const existing = document.getElementById('lang-switcher');
  if (existing) {
    existing.style.cssText = '';
    slot.appendChild(existing);
    return;
  }
  const mo = new MutationObserver(() => {
    const el = document.getElementById('lang-switcher');
    if (el) {
      mo.disconnect();
      el.style.cssText = '';
      slot.appendChild(el);
    }
  });
  mo.observe(document.body, { childList: true, subtree: false });
}

