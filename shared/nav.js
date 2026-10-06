/**
 * nav.js — Cabecera compartida para LOL Pro Games.
 * Fila 1: logo "LOL PRO GAMES" (link a inicio) + lang switcher (derecha)
 * Fila 2: iconos circulares de cada juego + botón de cuenta
 */
import { mountAccount } from './account.js';

const GAMES = [
  { id: 'dle',        href: '../dle/index.html',        icon: '🎯', name: 'Adivina el Pro',  tag: 'Pistas'       },
  { id: 'rostergues', href: '../rostergues/index.html', icon: '🏆', name: 'Roster Guess',    tag: 'Roster'       },
  { id: 'carrera',    href: '../carrera/index.html',    icon: '📋', name: 'Career Guess',    tag: 'Career'       },
  { id: 'grid',       href: '../grid/index.html',       icon: '🔲', name: 'Pro Grid',        tag: 'Grid'         },   // en pruebas: pide código beta (shared/js/beta.js)
  { id: 'wordle',     href: '../wordle/index.html',     icon: '🔤', name: 'Pro Wordle',      tag: 'Wordle'       },   // en pruebas: pide código beta
];

const HEADER_H = 96; // px — altura total (fila 1 + fila 2)

function getCurrentId() {
  const path = window.location.pathname;
  return GAMES.find(g => path.includes('/' + g.id + '/'))?.id ?? null;
}

export function mountGameNav() {
  _injectStyles();

  const currentId = getCurrentId();

  // ── Contenedor principal ────────────────────────────────────
  const header = document.createElement('div');
  header.id = 'game-header';

  // ── Fila 1: marca + lang slot ───────────────────────────────
  const brandRow = document.createElement('div');
  brandRow.id = 'game-header-brand';

  const brandLink = document.createElement('a');
  brandLink.id   = 'game-brand-link';
  brandLink.href = '../index.html';
  brandLink.innerHTML = `
    <div class="brand-rule">
      <div class="brand-line brand-line-l"></div>
      <span class="brand-star">✦</span>
      <div class="brand-line brand-line-r"></div>
    </div>
    <div class="brand-title">LOL PRO GAMES</div>
    <div class="brand-rule">
      <div class="brand-line brand-line-l"></div>
      <span class="brand-star">✦</span>
      <div class="brand-line brand-line-r"></div>
    </div>
  `;

  const langSlot = document.createElement('div');
  langSlot.id = 'game-topbar-right';

  brandRow.appendChild(brandLink);
  brandRow.appendChild(langSlot);


  // ── Fila 2: iconos de juego ─────────────────────────────────
  const iconsRow = document.createElement('div');
  iconsRow.id = 'game-nav-icons';

  GAMES.forEach(g => {
    const el = g.disabled || !g.href
      ? document.createElement('span')
      : document.createElement('a');

    if (!g.disabled && g.href) el.href = g.href;
    el.className = 'gnav-icon-btn' +
      (g.id === currentId ? ' gnav-current' : '') +
      (g.disabled          ? ' gnav-disabled' : '');
    el.title = g.name + (g.disabled ? ' · ' + g.tag : '');
    el.innerHTML = `<span class="gnav-icon-emoji">${g.icon}</span>`;
    iconsRow.appendChild(el);
  });

  // Cuenta de Google + estadísticas (a la derecha de los juegos)
  const sep = document.createElement('span');
  sep.className = 'gnav-sep';
  iconsRow.appendChild(sep);
  mountAccount(iconsRow, currentId);

  header.appendChild(brandRow);
  header.appendChild(iconsRow);
  document.body.prepend(header);

  // Mover #lang-switcher al slot
  _adoptLangSwitcher(langSlot);

  // Sin padding extra — el header es parte del flujo normal
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
    /* ── Header contenedor ── */
    #game-header {
      position: relative;
      z-index: 10;
      max-width: 580px;
      margin: 20px auto 0;
      background: rgba(1,10,19,0.82);
      border: 1px solid rgba(30,58,95,0.6);
      font-family: 'Rajdhani', sans-serif;
    }

    /* ── Fila 1: marca ── */
    #game-header-brand {
      position: relative;
      border-bottom: 1px solid rgba(30,58,95,0.5);
    }

    #game-brand-link {
      display: block;
      padding: 10px 20px 8px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    #game-brand-link:hover { opacity: 0.82; }

    /* Líneas decorativas */
    .brand-rule {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 5px;
    }
    .brand-rule:last-child { margin-bottom: 0; margin-top: 5px; }
    .brand-line { flex: 1; height: 1px; }
    .brand-line-l { background: linear-gradient(to right, transparent, #c89b3c); }
    .brand-line-r { background: linear-gradient(to left,  transparent, #c89b3c); }
    .brand-star {
      color: #c89b3c;
      font-size: 0.42rem; letter-spacing: 3px; font-weight: 700;
      font-family: 'Rajdhani', sans-serif;
    }

    /* Título */
    .brand-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: clamp(1.05rem, 3.5vw, 1.45rem);
      font-weight: 700;
      letter-spacing: 0.18em;
      color: #c89b3c;
      text-align: center;
      text-shadow: 0 0 22px rgba(200,155,60,0.4), 0 2px 5px rgba(0,0,0,0.7);
      line-height: 1.1;
      margin-bottom: 3px;
    }

    /* Separador medio */
    .brand-sep {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 3px;
    }
    .brand-sep-line { flex: 1; height: 1px; background: #785a28; opacity: 0.5; }
    .brand-diamonds {
      color: #785a28;
      font-size: 0.38rem; letter-spacing: 2px;
      font-family: 'Rajdhani', sans-serif;
    }

    /* Subtítulo */
    .brand-sub {
      font-family: 'Rajdhani', sans-serif;
      font-size: clamp(0.48rem, 1.6vw, 0.6rem);
      font-weight: 700;
      letter-spacing: 0.3em;
      color: #785a28;
      text-transform: uppercase;
      text-align: center;
    }

    #game-topbar-right {
      position: absolute;
      right: 10px; top: 50%; transform: translateY(-50%);
      display: flex; align-items: center;
    }
    #game-topbar-right #lang-switcher { position: static !important; }

    /* ── Fila 2: iconos ── */
    #game-nav-icons {
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }

    .gnav-icon-btn {
      width: 40px; height: 40px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: #0f1e36;
      border: 2px solid #1e3a5f;
      text-decoration: none;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
      position: relative;
    }
    .gnav-icon-btn:not(.gnav-disabled):hover {
      border-color: #c89b3c;
      box-shadow: 0 0 12px rgba(200,155,60,0.25);
      transform: scale(1.12);
    }
    .gnav-icon-btn.gnav-current {
      border-color: #c89b3c;
      background: rgba(200,155,60,0.1);
      box-shadow: 0 0 10px rgba(200,155,60,0.2);
    }
    .gnav-icon-btn.gnav-disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .gnav-icon-emoji { font-size: 1.15rem; line-height: 1; }
    .gnav-sep { width: 1px; height: 26px; background: #1e3a5f; }

    /* ── Cookie reopener ── */
    #ck-reopener { bottom: 16px !important; left: 16px !important; }
  `;
  document.head.appendChild(s);
}
