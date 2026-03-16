/**
 * nav.js — Barra superior de navegación para LOL Pro Games.
 * Crea una topbar fija que contiene el menú de juegos (izquierda)
 * y absorbe el lang-switcher existente (derecha), añadiendo
 * padding-top al body para que el contenido no quede tapado.
 */

const GAMES = [
  { id: 'dle',        href: '../dle/index.html',        icon: '🎯', name: 'Adivina el Pro',  tag: 'Wordle · Diario'    },
  { id: 'rostergues', href: '../rostergues/index.html', icon: '🏆', name: 'Roster Guess',    tag: 'Roster · Histórico' },
  { id: 'carrera',    href: '../carrera/index.html',    icon: '📋', name: 'Career Guess',    tag: 'Timeline · Carrera' },
  { id: 'grid',       href: null,                       icon: '🔲', name: 'Pro Grid',        tag: 'Próximamente', disabled: true },
];

const TOPBAR_H = 44; // px — altura de la barra

function getCurrentId() {
  const path = window.location.pathname;
  return GAMES.find(g => path.includes('/' + g.id + '/'))?.id ?? null;
}

export function mountGameNav() {
  _injectStyles();

  const currentId = getCurrentId();

  // ── Topbar ──────────────────────────────────────────────────
  const topbar = document.createElement('div');
  topbar.id = 'game-topbar';

  // Lado izquierdo: botón + panel
  const navWrap = document.createElement('div');
  navWrap.id = 'game-nav';
  navWrap.innerHTML = `
    <button id="game-nav-btn" title="Cambiar de juego" aria-label="Menú de juegos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    </button>
    <div id="game-nav-panel" hidden>
      <div class="gnav-header">
        <span class="gnav-title">LOL PRO GAMES</span>
        <a href="../index.html" class="gnav-home">Inicio ›</a>
      </div>
      <ul class="gnav-list">
        ${GAMES.map(g => `
          <li>
            ${g.disabled || !g.href
              ? `<span class="gnav-item gnav-disabled">`
              : `<a href="${g.href}" class="gnav-item${g.id === currentId ? ' gnav-current' : ''}">`
            }
              <span class="gnav-icon">${g.icon}</span>
              <span class="gnav-info">
                <span class="gnav-name">${g.name}</span>
                <span class="gnav-tag">${g.tag}</span>
              </span>
              ${g.id === currentId ? '<span class="gnav-dot"></span>' : ''}
            ${g.disabled || !g.href ? '</span>' : '</a>'}
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  // Lado derecho: slot para el lang-switcher
  const langSlot = document.createElement('div');
  langSlot.id = 'game-topbar-right';

  topbar.appendChild(navWrap);
  topbar.appendChild(langSlot);
  document.body.prepend(topbar);

  // Mover #lang-switcher dentro de la topbar si ya existe,
  // o esperar a que aparezca (lang.js lo crea justo después)
  _adoptLangSwitcher(langSlot);

  // ── Padding-top al body ──────────────────────────────────────
  document.body.style.paddingTop = TOPBAR_H + 'px';

  // ── Eventos ──────────────────────────────────────────────────
  const btn   = navWrap.querySelector('#game-nav-btn');
  const panel = navWrap.querySelector('#game-nav-panel');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !panel.hidden;
    panel.hidden = open;
    btn.classList.toggle('gnav-open', !open);
  });

  document.addEventListener('click', e => {
    if (!navWrap.contains(e.target)) {
      panel.hidden = true;
      btn.classList.remove('gnav-open');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      panel.hidden = true;
      btn.classList.remove('gnav-open');
    }
  });
}

/** Mueve #lang-switcher al slot de la topbar en cuanto esté disponible. */
function _adoptLangSwitcher(slot) {
  const existing = document.getElementById('lang-switcher');
  if (existing) {
    // Quita el posicionamiento fijo que le pone lang.js
    existing.style.cssText = '';
    slot.appendChild(existing);
    return;
  }
  // Todavía no existe: observar hasta que aparezca
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
    /* ── Topbar ── */
    #game-topbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: ${TOPBAR_H}px;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      background: rgba(1,10,19,0.92);
      border-bottom: 1px solid #1e3a5f;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      font-family: 'Rajdhani', sans-serif;
    }

    /* Empujar el contenido que esté fixed justo arriba del topbar */
    #ck-reopener { bottom: 16px !important; left: 16px !important; }

    /* ── Nav wrap (izquierda) ── */
    #game-nav {
      position: relative;
      display: flex;
      align-items: center;
    }

    /* ── Toggle button ── */
    #game-nav-btn {
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: transparent;
      border: 1px solid #1e3a5f;
      color: #4a6080;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s, background 0.2s;
    }
    #game-nav-btn:hover,
    #game-nav-btn.gnav-open {
      border-color: #c89b3c;
      color: #c89b3c;
      background: rgba(200,155,60,0.06);
    }

    /* ── Dropdown panel ── */
    #game-nav-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 230px;
      background: #0a1428;
      border: 1px solid #1e3a5f;
      border-top: 2px solid #785a28;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      animation: gnavDrop 0.16s ease;
    }
    @keyframes gnavDrop {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Panel header ── */
    .gnav-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #1e3a5f;
    }
    .gnav-title {
      font-size: 0.56rem; font-weight: 700; letter-spacing: 3px;
      text-transform: uppercase; color: #785a28;
    }
    .gnav-home {
      font-size: 0.58rem; font-weight: 600; letter-spacing: 1px;
      color: #4a6080; text-decoration: none; transition: color 0.15s;
    }
    .gnav-home:hover { color: #c89b3c; }

    /* ── Game list ── */
    .gnav-list { list-style: none; padding: 4px 0; }

    .gnav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      text-decoration: none; color: #c8d4e8;
      transition: background 0.12s, color 0.12s;
      cursor: pointer; position: relative;
    }
    a.gnav-item:hover {
      background: rgba(200,155,60,0.07); color: #c89b3c;
    }
    .gnav-current { background: rgba(200,155,60,0.06); color: #c89b3c; }
    .gnav-disabled { opacity: 0.32; cursor: not-allowed; }

    .gnav-icon  { font-size: 1rem; flex-shrink: 0; line-height: 1; }
    .gnav-info  { display: flex; flex-direction: column; gap: 1px; flex: 1; }
    .gnav-name  { font-size: 0.82rem; font-weight: 700; letter-spacing: 0.03em; }
    .gnav-tag   { font-size: 0.56rem; font-weight: 600; letter-spacing: 0.08em;
                  text-transform: uppercase; color: #4a6080; }
    .gnav-current .gnav-tag { color: #785a28; }

    .gnav-dot {
      width: 5px; height: 5px; background: #c89b3c;
      border-radius: 50%; flex-shrink: 0;
      box-shadow: 0 0 6px rgba(200,155,60,0.6);
    }

    /* ── Lang slot (derecha) ── */
    #game-topbar-right {
      display: flex; align-items: center;
    }
    /* Anular el posicionamiento fijo que inyecta lang.js */
    #game-topbar-right #lang-switcher {
      position: static !important;
    }
  `;
  document.head.appendChild(s);
}
