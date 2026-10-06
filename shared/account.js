/**
 * account.js — Botón de cuenta en la cabecera y ventana con el login de
 * Google y las estadísticas de cada juego.
 */
import { getLang } from './lang.js';
import { getClient, mayHaveSession, onAuthChange, signIn, signOut, deleteAccount,
         getResults, computeStats, GAMES } from './auth.js';

const TEXT = {
  es: {
    account: 'Mi cuenta', signIn: 'Entrar con Google', signOut: 'Cerrar sesión',
    deleteAccount: 'Borrar mi cuenta',
    deleteConfirm: '¿Borrar tu cuenta y todo tu historial? No se puede deshacer.',
    guestInfo: 'Sin cuenta, tu historial solo se guarda en este navegador. Entra con Google para no perderlo y verlo en cualquier dispositivo.',
    played: 'Jugadas', winPct: '% victorias', streak: 'Racha', maxStreak: 'Mejor racha',
    distribution: 'Victorias por intentos', empty: 'Aún no hay partidas de este juego.',
    privacy: 'Privacidad', error: 'No se ha podido completar. Inténtalo de nuevo.',
    games: { dle: 'Adivina el Pro', rostergues: 'Roster Guess', carrera: 'Career Guess', grid: 'Pro Grid', wordle: 'Pro Wordle' },
  },
  en: {
    account: 'My account', signIn: 'Sign in with Google', signOut: 'Sign out',
    deleteAccount: 'Delete my account',
    deleteConfirm: 'Delete your account and all your history? This cannot be undone.',
    guestInfo: 'Without an account, your history is only saved in this browser. Sign in with Google to keep it and see it on any device.',
    played: 'Played', winPct: 'Win %', streak: 'Streak', maxStreak: 'Best streak',
    distribution: 'Wins by attempts', empty: 'No games played yet.',
    privacy: 'Privacy', error: 'Something went wrong. Please try again.',
    games: { dle: 'Guess the Pro', rostergues: 'Roster Guess', carrera: 'Career Guess', grid: 'Pro Grid', wordle: 'Pro Wordle' },
  },
};
const t = key => (TEXT[getLang()] ?? TEXT.es)[key];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let user = null;
let button = null;
let currentGame = null;

/** Añade el botón de cuenta al final de `container` (la fila de iconos). */
export function mountAccount(container, gameId) {
  injectStyles();
  currentGame = GAMES.includes(gameId) ? gameId : GAMES[0];

  button = document.createElement('button');
  button.type = 'button';
  button.className = 'gnav-icon-btn acc-btn';
  button.title = t('account');
  button.innerHTML = '<span class="gnav-icon-emoji">👤</span>';
  button.addEventListener('click', openModal);
  container.appendChild(button);

  // Iniciar el cliente también completa el login al volver de Google (?code=). Sin
  // sesión no se descarga supabase-js: se carga al pulsar "Entrar con Google"
  if (mayHaveSession()) getClient().then(sb => { if (!sb) button.remove(); });
  onAuthChange(u => { user = u; renderButton(); });
}

function renderButton() {
  if (!button) return;
  const avatar = user?.user_metadata?.avatar_url;
  button.title = user ? `${t('account')} · ${user.user_metadata?.full_name ?? user.email}` : t('account');
  button.innerHTML = avatar
    ? `<img class="acc-avatar" src="${esc(avatar)}" alt="" referrerpolicy="no-referrer">`
    : '<span class="gnav-icon-emoji">👤</span>';
  button.classList.toggle('acc-signed', !!user);
}

// ── Ventana ────────────────────────────────────────────────────

function openModal() {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'acc-overlay';
  overlay.innerHTML = `<div class="acc-card" role="dialog" aria-modal="true">
      <button class="acc-close" aria-label="×">×</button>
      <div class="acc-body"></div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('.acc-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', onEsc);
  document.body.appendChild(overlay);
  renderModal();
}

function closeModal() {
  document.getElementById('acc-overlay')?.remove();
  document.removeEventListener('keydown', onEsc);
}

function onEsc(e) { if (e.key === 'Escape') closeModal(); }

async function renderModal() {
  const body = document.querySelector('#acc-overlay .acc-body');
  if (!body) return;

  const header = user
    ? `<div class="acc-user">
         ${user.user_metadata?.avatar_url
           ? `<img class="acc-user-avatar" src="${esc(user.user_metadata.avatar_url)}" alt="" referrerpolicy="no-referrer">` : ''}
         <div><div class="acc-name">${esc(user.user_metadata?.full_name ?? '')}</div>
              <div class="acc-email">${esc(user.email)}</div></div>
       </div>`
    : `<p class="acc-info">${t('guestInfo')}</p>
       <button class="acc-google">${googleIcon()} ${t('signIn')}</button>`;

  const tabs = GAMES.map(g =>
    `<button class="acc-tab${g === currentGame ? ' active' : ''}" data-game="${g}">${t('games')[g]}</button>`
  ).join('');

  body.innerHTML = `
    <h3 class="acc-title">${t('account')}</h3>
    ${header}
    <div class="acc-tabs">${tabs}</div>
    <div class="acc-stats">…</div>
    <div class="acc-footer">
      ${user ? `<button class="acc-link acc-signout">${t('signOut')}</button>
                <button class="acc-link acc-delete">${t('deleteAccount')}</button>` : ''}
      <a class="acc-link" href="/privacidad.html">${t('privacy')}</a>
    </div>`;

  body.querySelector('.acc-google')?.addEventListener('click', () => signIn());
  body.querySelector('.acc-signout')?.addEventListener('click', async () => {
    await signOut();
    renderModal();
  });
  body.querySelector('.acc-delete')?.addEventListener('click', async () => {
    if (!confirm(t('deleteConfirm'))) return;
    try { await deleteAccount(); renderModal(); }
    catch { alert(t('error')); }
  });
  body.querySelectorAll('.acc-tab').forEach(tab => tab.addEventListener('click', () => {
    currentGame = tab.dataset.game;
    renderModal();
  }));

  renderStats(body.querySelector('.acc-stats'), currentGame);
}

async function renderStats(el, game) {
  const s = computeStats(await getResults(game));
  if (!el.isConnected) return;
  if (!s.played) {
    el.innerHTML = `<p class="acc-empty">${t('empty')}</p>`;
    return;
  }
  const maxCount = Math.max(1, ...Object.values(s.distribution));
  const bars = Object.entries(s.distribution)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([tries, n]) => `<div class="acc-bar-row"><span>${tries}</span>
        <div class="acc-bar" style="width:${Math.max(8, 100 * n / maxCount)}%">${n}</div></div>`)
    .join('');
  el.innerHTML = `
    <div class="acc-nums">
      ${[[s.played, t('played')], [s.winPct, t('winPct')],
         [s.currentStreak, t('streak')], [s.maxStreak, t('maxStreak')]]
        .map(([n, label]) => `<div><div class="acc-num">${n}</div><div class="acc-label">${label}</div></div>`)
        .join('')}
    </div>
    ${bars ? `<div class="acc-label acc-dist-title">${t('distribution')}</div>${bars}` : ''}`;
}

function googleIcon() {
  return `<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>`;
}

function injectStyles() {
  if (document.getElementById('acc-styles')) return;
  const s = document.createElement('style');
  s.id = 'acc-styles';
  s.textContent = `
    .acc-btn { padding: 0; font: inherit; overflow: hidden; }
    .acc-btn.acc-signed { border-color: #785a28; }
    .acc-avatar { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

    #acc-overlay {
      position: fixed; inset: 0; z-index: 9995;
      background: rgba(1,10,19,0.88);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Rajdhani', sans-serif;
    }
    .acc-card {
      position: relative; width: 92%; max-width: 420px; max-height: 88vh; overflow-y: auto;
      background: #0a1428; border: 1px solid #785a28; padding: 26px 22px 18px;
      color: #c8d4e8;
    }
    .acc-close {
      position: absolute; top: 8px; right: 12px; background: none; border: none;
      color: #4a6080; font-size: 1.4rem; cursor: pointer;
    }
    .acc-close:hover { color: #c89b3c; }
    .acc-title {
      font-family: 'Cinzel', serif; color: #c89b3c; font-size: 1rem;
      letter-spacing: 2px; text-align: center; margin: 0 0 16px;
    }
    .acc-info { font-size: 0.85rem; line-height: 1.45; color: #7a9cc0; margin: 0 0 14px; text-align: center; }
    .acc-google {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; padding: 10px; margin-bottom: 18px; cursor: pointer;
      background: #fff; color: #1f1f1f; border: none; border-radius: 4px;
      font-family: 'Rajdhani', sans-serif; font-size: 0.95rem; font-weight: 700;
    }
    .acc-google:hover { background: #f0f0f0; }
    .acc-user { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .acc-user-avatar { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #785a28; }
    .acc-name { font-weight: 700; color: #f0e6d2; }
    .acc-email { font-size: 0.8rem; color: #4a6080; }
    .acc-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .acc-tab {
      flex: 1; padding: 6px 4px; cursor: pointer; background: transparent;
      border: 1px solid #1e3a5f; color: #4a6080;
      font-family: 'Rajdhani', sans-serif; font-size: 0.72rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
    }
    .acc-tab.active, .acc-tab:hover { border-color: #c89b3c; color: #c89b3c; }
    .acc-nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; margin-bottom: 14px; }
    .acc-num { font-family: 'Cinzel', serif; font-size: 1.5rem; color: #f0e6d2; }
    .acc-label { font-size: 0.68rem; letter-spacing: 1px; text-transform: uppercase; color: #4a6080; }
    .acc-dist-title { margin-bottom: 6px; }
    .acc-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 0.8rem; }
    .acc-bar-row > span { width: 18px; text-align: right; color: #7a9cc0; }
    .acc-bar {
      background: #1e3a5f; color: #f0e6d2; text-align: right; padding: 1px 6px;
      font-size: 0.75rem; font-weight: 700; min-width: 18px;
    }
    .acc-empty { text-align: center; color: #4a6080; font-size: 0.85rem; margin: 18px 0; }
    .acc-footer {
      display: flex; justify-content: center; flex-wrap: wrap; gap: 14px;
      margin-top: 18px; padding-top: 12px; border-top: 1px solid #1e3a5f;
    }
    .acc-link {
      background: none; border: none; cursor: pointer; padding: 0;
      font-family: 'Rajdhani', sans-serif; font-size: 0.78rem; color: #4a6080; text-decoration: underline;
    }
    .acc-link:hover { color: #c89b3c; }
    .acc-delete:hover { color: #cc2222; }
  `;
  document.head.appendChild(s);
}
