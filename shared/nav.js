/**
 * nav.js — Navegador de juegos flotante para LOL Pro Games.
 * Se monta en cualquier juego con: import { mountGameNav } from '../../shared/nav.js';
 * y llamando mountGameNav() al arrancar.
 */

const GAMES = [
  { id: 'dle',        href: '../dle/index.html',        icon: '🎯', name: 'Adivina el Pro',  tag: 'Wordle · Diario'       },
  { id: 'rostergues', href: '../rostergues/index.html', icon: '🏆', name: 'Roster Guess',    tag: 'Roster · Histórico'    },
  { id: 'carrera',    href: '../carrera/index.html',    icon: '📋', name: 'Career Guess',    tag: 'Timeline · Carrera'    },
  { id: 'grid',       href: null,                       icon: '🔲', name: 'Pro Grid',         tag: 'Próximamente', disabled: true },
];

function getCurrentId() {
  const path = window.location.pathname;
  return GAMES.find(g => path.includes('/' + g.id + '/'))?.id ?? null;
}

export function mountGameNav() {
  _injectStyles();

  const currentId = getCurrentId();

  const wrap = document.createElement('div');
  wrap.id = 'game-nav';

  // ── Toggle button ──────────────────────────────────────────
  wrap.innerHTML = `
    <button id="game-nav-btn" title="Cambiar de juego" aria-label="Menú de juegos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18">
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

  document.body.appendChild(wrap);

  const btn   = wrap.querySelector('#game-nav-btn');
  const panel = wrap.querySelector('#game-nav-panel');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !panel.hidden;
    panel.hidden = open;
    btn.classList.toggle('gnav-open', !open);
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) {
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

function _injectStyles() {
  if (document.getElementById('game-nav-styles')) return;
  const s = document.createElement('style');
  s.id = 'game-nav-styles';
  s.textContent = `
    #game-nav {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 9998;
      font-family: 'Rajdhani', sans-serif;
    }

    /* ── Toggle button ── */
    #game-nav-btn {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      background: #0a1428;
      border: 1px solid #1e3a5f;
      color: #4a6080;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s, box-shadow 0.2s;
    }
    #game-nav-btn:hover,
    #game-nav-btn.gnav-open {
      border-color: #c89b3c;
      color: #c89b3c;
      box-shadow: 0 0 14px rgba(200,155,60,0.2);
    }

    /* ── Panel ── */
    #game-nav-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 230px;
      background: #0a1428;
      border: 1px solid #1e3a5f;
      border-top: 2px solid #785a28;
      animation: gnavSlideUp 0.18s ease;
    }
    @keyframes gnavSlideUp {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .gnav-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #1e3a5f;
    }
    .gnav-title {
      font-size: 0.58rem; font-weight: 700; letter-spacing: 3px;
      text-transform: uppercase; color: #785a28;
    }
    .gnav-home {
      font-size: 0.58rem; font-weight: 600; letter-spacing: 1px;
      color: #4a6080; text-decoration: none;
      transition: color 0.15s;
    }
    .gnav-home:hover { color: #c89b3c; }

    /* ── List ── */
    .gnav-list {
      list-style: none;
      padding: 4px 0;
    }
    .gnav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      text-decoration: none;
      color: #c8d4e8;
      transition: background 0.12s, color 0.12s;
      cursor: pointer;
      position: relative;
    }
    a.gnav-item:hover {
      background: rgba(200,155,60,0.07);
      color: #c89b3c;
    }
    .gnav-current {
      background: rgba(200,155,60,0.06);
      color: #c89b3c;
    }
    .gnav-disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .gnav-icon { font-size: 1rem; flex-shrink: 0; line-height: 1; }

    .gnav-info {
      display: flex; flex-direction: column; gap: 1px; flex: 1;
    }
    .gnav-name {
      font-size: 0.82rem; font-weight: 700; letter-spacing: 0.03em;
    }
    .gnav-tag {
      font-size: 0.58rem; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #4a6080;
    }
    .gnav-current .gnav-tag { color: #785a28; }

    .gnav-dot {
      width: 5px; height: 5px;
      background: #c89b3c;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 6px rgba(200,155,60,0.6);
    }
  `;
  document.head.appendChild(s);
}
