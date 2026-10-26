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
    allLengths: 'Todas', letters: 'letras',
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
    allLengths: 'All', letters: 'letters',
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
let wordleLength = null;   // Pro Wordle: estadísticas de una sola longitud (4, 5, 6)

/** Añade el botón de cuenta al final de `container` (la fila de iconos). */
const USER_SVG = '<svg class="gnav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>';

export function mountAccount(container, gameId) {
  injectStyles();
  currentGame = GAMES.includes(gameId) ? gameId : GAMES[0];

  button = document.createElement('button');
  button.type = 'button';
  button.className = 'gnav-icon-btn acc-btn';
  button.title = t('account');
  button.innerHTML = USER_SVG;
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
    : USER_SVG;
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
  const results = await getResults(game);
  if (!el.isConnected) return;
  // En el wordle se puede ver una sola longitud. La racha es siempre la de todos los
  // retos diarios: el diario cambia de longitud cada día.
  const byLength = game === 'wordle' && wordleLength
    ? results.filter(r => r.details?.word?.length === wordleLength) : results;
  const s = computeStats(byLength);
  const all = computeStats(results);
  const chips = game === 'wordle' && all.played ? `<div class="acc-tabs acc-lengths">${
    [null, 4, 5, 6].map(n => `<button class="acc-tab${n === wordleLength ? ' active' : ''}" data-acc-length="${n ?? ''}">${
      n ? `${n} ${t('letters')}` : t('allLengths')}</button>`).join('')}</div>` : '';
  if (!s.played) {
    el.innerHTML = chips + `<p class="acc-empty">${t('empty')}</p>`;
    bindLengths(el, game);
    return;
  }
  const maxCount = Math.max(1, ...Object.values(s.distribution));
  const bars = Object.entries(s.distribution)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([tries, n]) => `<div class="acc-bar-row"><span>${tries}</span>
        <div class="acc-bar" style="width:${Math.max(8, 100 * n / maxCount)}%">${n}</div></div>`)
    .join('');
  el.innerHTML = `${chips}
    <div class="acc-nums">
      ${[[s.played, t('played')], [s.winPct, t('winPct')],
         [all.currentStreak, t('streak')], [all.maxStreak, t('maxStreak')]]
        .map(([n, label]) => `<div><div class="acc-num">${n}</div><div class="acc-label">${label}</div></div>`)
        .join('')}
    </div>
    ${bars ? `<div class="acc-label acc-dist-title">${t('distribution')}</div>${bars}` : ''}`;
  bindLengths(el, game);
}

function bindLengths(el, game) {
  el.querySelectorAll('[data-acc-length]').forEach(b => b.addEventListener('click', () => {
    wordleLength = Number(b.dataset.accLength) || null;
    renderStats(el, game);
  }));
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
    .acc-btn.acc-signed { border-color: #a8832a; }
    .acc-avatar { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

    #acc-overlay {
      position: fixed; inset: 0; z-index: 9995;
      background: rgba(11,13,16,0.88);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-body);
    }
    .acc-card {
      position: relative; width: 92%; max-width: 420px; max-height: 88vh; overflow-y: auto;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0,0,0,.6); padding: 32px 24px 20px;
      color: var(--text);
    }
    .acc-close {
      position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; border-radius: 6px;
      background: none; border: none; color: #8b96a3; font-size: 1.5rem; line-height: 1; cursor: pointer;
    }
    .acc-close:hover { color: #e9edf1; background: var(--surface2); }
    .acc-title {
      font-family: var(--font-display); color: var(--text); font-size: 1.9rem; font-weight: 700;
      text-transform: uppercase; line-height: 1; text-align: center; margin: 0 0 18px;
    }
    .acc-info { font-size: 0.85rem; line-height: 1.45; color: #8b96a3; margin: 0 0 14px; text-align: center; }
    .acc-google {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; height: 48px; margin-bottom: 18px; cursor: pointer;
      background: #fff; color: #1f1f1f; border: none; border-radius: 6px;
      font-family: var(--font-body); font-size: 0.95rem; font-weight: 700;
    }
    .acc-google:hover { background: #f0f0f0; }
    .acc-user { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .acc-user-avatar { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #a8832a; }
    .acc-name { font-weight: 700; color: var(--text); }
    .acc-email { font-size: 0.8rem; color: #8b96a3; }
    .acc-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .acc-tab {
      flex: 1; padding: 8px 4px; cursor: pointer; background: transparent; border-radius: 6px;
      border: 1px solid #232a33; color: #8b96a3;
      font-family: var(--font-display); font-size: 0.9rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
    }
    .acc-tab.active, .acc-tab:hover { border-color: #e8b84a; color: #e8b84a; }
    .acc-nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; margin-bottom: 14px; }
    .acc-num { font-family: var(--font-display); font-size: 1.9rem; font-weight: 700; color: var(--text); }
    .acc-label { font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase; color: #8b96a3; }
    .acc-dist-title { margin-bottom: 6px; }
    .acc-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 0.8rem; }
    .acc-bar-row > span { width: 18px; text-align: right; color: #8b96a3; }
    .acc-bar {
      background: #232a33; color: var(--text); text-align: right; padding: 1px 6px; border-radius: 3px;
      font-size: 0.75rem; font-weight: 700; min-width: 18px;
    }
    .acc-empty { text-align: center; color: #8b96a3; font-size: 0.85rem; margin: 18px 0; }
    .acc-footer {
      display: flex; justify-content: center; flex-wrap: wrap; gap: 14px;
      margin-top: 18px; padding-top: 12px; border-top: 1px solid #232a33;
    }
    .acc-link {
      background: none; border: none; cursor: pointer; padding: 0;
      font-family: var(--font-body); font-size: 0.78rem; color: #8b96a3; text-decoration: underline;
    }
    .acc-link:hover { color: #e8b84a; }
    .acc-delete:hover { color: #e0645c; }
  `;
  document.head.appendChild(s);
}
