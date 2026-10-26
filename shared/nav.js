/**
 * nav.js — Cabecera compartida para LOL Pro Games.
 * Barra única: marca (link a inicio) · iconos de cada juego · cuenta + idioma
 */
import { mountAccount } from './account.js';

const GAMES = [
  { id: 'dle',        href: '../dle/',        name: 'Adivina el Pro',  tag: 'Pistas'       },
  { id: 'rostergues', href: '../rostergues/', name: 'Roster Guess',    tag: 'Roster'       },
  { id: 'carrera',    href: '../carrera/',    name: 'Career Guess',    tag: 'Career'       },
  { id: 'grid',       href: '../grid/',       name: 'Pro Grid',        tag: 'Grid'         },
  { id: 'wordle',     href: '../wordle/',     name: 'Pro Wordle',      tag: 'Wordle'       },
];

/** Iconos de trazo (viewBox 24). */
const ICONS = {
  dle: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  rostergues: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8"/>',
  carrera: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  wordle: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'
};

function svgIcon(paths) {
  return `<svg class="gnav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function getCurrentId() {
  const path = window.location.pathname;
  return GAMES.find(g => path.includes('/' + g.id + '/'))?.id ?? null;
}

export function mountGameNav() {
  _injectStyles();

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
    el.innerHTML = svgIcon(ICONS[g.id]);
    if (g.id === currentId) el.setAttribute('aria-current', 'page');
    iconsRow.appendChild(el);
  });

  const right = document.createElement('div');
  right.id = 'game-topbar-right';
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

function _injectStyles() {
  if (document.getElementById('game-nav-styles')) return;
  const s = document.createElement('style');
  s.id = 'game-nav-styles';
  s.textContent = `
    #game-header {
      position: relative; z-index: 10;
      display: flex; align-items: center; gap: 24px;
      width: 100%; max-width: 1120px; margin: 0 auto;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      font-family: var(--font-body);
    }

    #game-brand-link {
      font-family: var(--font-display);
      font-size: 1.2rem; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--text); text-decoration: none; white-space: nowrap;
    }
    #game-brand-link::before {
      content: ''; display: inline-block;
      width: 9px; height: 9px; margin-right: 10px;
      background: var(--gold); transform: rotate(45deg);
    }
    #game-brand-link:hover { color: var(--gold); }

    #game-nav-icons { display: flex; align-items: center; gap: 2px; flex: 1; }

    .gnav-icon-btn {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: 0; border-radius: 6px;
      color: var(--dim); text-decoration: none; cursor: pointer;
      position: relative; transition: color 0.15s, background 0.15s;
    }
    .gnav-icon-btn:hover { color: var(--text); background: var(--surface2); }
    .gnav-icon-btn.gnav-current { color: var(--text); background: var(--surface2); }
    .gnav-icon-btn.gnav-current::after {
      content: ''; position: absolute; left: 8px; right: 8px; bottom: 2px;
      height: 2px; background: var(--gold);
    }
    .gnav-svg { display: block; }

    #game-topbar-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
    #game-topbar-right #lang-switcher { position: static !important; }

    @media (max-width: 560px) {
      #game-header { flex-wrap: wrap; gap: 8px 12px; padding: 12px 16px; }
      #game-nav-icons { order: 3; flex-basis: 100%; justify-content: space-between; }
      .gnav-icon-btn { width: 44px; height: 44px; }
    }

    /* ── Cookie reopener ── */
    #ck-reopener { bottom: 16px !important; left: 16px !important; }
  `;
  document.head.appendChild(s);
}
