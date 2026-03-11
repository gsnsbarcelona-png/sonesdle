/**
 * CookieBanner — Banner de consentimiento de cookies estilo gaming (GDPR).
 *
 * Categorías:
 *  - necessary   : siempre activas (estado del juego, caché)
 *  - preferences : opcionales (idioma seleccionado)
 *
 * localStorage keys:
 *  - dle_cookie_consent : 'accepted' | 'rejected' | 'custom'
 *  - dle_cookie_prefs   : JSON { necessary: true, preferences: boolean }
 */
import { t } from '../utils/i18n.js';

const CONSENT_KEY = 'dle_cookie_consent';
const PREFS_KEY   = 'dle_cookie_prefs';

const CSS = `
/* ══ COOKIE BANNER ═══════════════════════════════════════════ */
@keyframes ck-slide-up   { from { transform:translateY(110%); opacity:0; } to { transform:translateY(0); opacity:1; } }
@keyframes ck-slide-down { from { transform:translateY(0); opacity:1; }    to { transform:translateY(110%); opacity:0; } }
@keyframes ck-fade-in    { from { opacity:0; }  to { opacity:1; } }
@keyframes ck-fade-out   { from { opacity:1; }  to { opacity:0; } }
@keyframes ck-modal-in   { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }

#ck-banner {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 9990;
  background: linear-gradient(to top, #030d18, #050f1c);
  border-top: 1px solid #785a28;
  padding: 16px;
  font-family: 'Rajdhani', sans-serif;
  animation: ck-slide-up 0.4s cubic-bezier(.22,.68,0,1.2) both;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
}
#ck-banner.ck-hiding {
  animation: ck-slide-down 0.3s ease forwards;
}
#ck-banner .ck-wrap {
  max-width: 960px; margin: 0 auto;
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
}
#ck-banner .ck-icon {
  font-size: 1.8rem; flex-shrink: 0; line-height: 1;
  filter: drop-shadow(0 0 8px rgba(200,155,60,0.5));
}
#ck-banner .ck-body { flex: 1; min-width: 200px; }
#ck-banner .ck-title {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 3px;
  text-transform: uppercase; color: #c89b3c; margin-bottom: 4px;
}
#ck-banner .ck-msg {
  font-size: 0.8rem; color: #7a9cc0; line-height: 1.45;
}
#ck-banner .ck-actions {
  display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; align-items: center;
}
.ck-btn {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; padding: 9px 20px; border: 1px solid;
  cursor: pointer; transition: all 0.18s; border-radius: 3px;
  white-space: nowrap;
}
.ck-btn-accept {
  background: #c89b3c; border-color: #c89b3c; color: #010a13;
}
.ck-btn-accept:hover { background: #f0e6d3; border-color: #f0e6d3; }
.ck-btn-reject {
  background: transparent; border-color: #3a5070; color: #4a6080;
}
.ck-btn-reject:hover { border-color: #7a9cc0; color: #7a9cc0; }
.ck-btn-settings {
  background: transparent; border-color: #785a28; color: #785a28;
}
.ck-btn-settings:hover { border-color: #c89b3c; color: #c89b3c; }

/* ── Reopener button ──────────────────────────────────────── */
#ck-reopener {
  position: fixed; bottom: 16px; left: 16px; z-index: 9980;
  display: flex; align-items: center; gap: 6px;
  background: rgba(5,14,26,0.92); border: 1px solid #785a28;
  border-radius: 3px; padding: 6px 12px; cursor: pointer;
  font-family: 'Rajdhani', sans-serif; font-size: 0.65rem;
  font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  color: #785a28; transition: all 0.18s;
  animation: ck-fade-in 0.4s ease both;
}
#ck-reopener:hover { border-color: #c89b3c; color: #c89b3c; }
#ck-reopener .ck-rp-icon { font-size: 0.95rem; }

/* ── Modal overlay ────────────────────────────────────────── */
#ck-overlay {
  position: fixed; inset: 0; z-index: 9995;
  background: rgba(1,10,19,0.85);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: ck-fade-in 0.25s ease both;
}
#ck-overlay.ck-hiding { animation: ck-fade-out 0.2s ease forwards; }

#ck-modal {
  background: #0a1428;
  border: 1px solid #785a28;
  max-width: 520px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  position: relative;
  box-shadow: 0 0 60px rgba(200,155,60,0.12), 0 20px 60px rgba(0,0,0,0.7);
  animation: ck-modal-in 0.35s cubic-bezier(.22,.68,0,1.15) both;
}
#ck-modal .ck-modal-top {
  height: 3px;
  background: linear-gradient(to right, transparent, #c89b3c, transparent);
}
#ck-modal .ck-modal-body { padding: 24px; }
#ck-modal .ck-modal-title {
  font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 700;
  color: #c89b3c; letter-spacing: 3px; text-transform: uppercase;
  margin-bottom: 8px;
}
#ck-modal .ck-modal-desc {
  font-size: 0.8rem; color: #7a9cc0; line-height: 1.5; margin-bottom: 20px;
}
#ck-modal .ck-divider {
  height: 1px; background: #1e3a5f; margin: 16px 0;
}

/* ── Cookie category row ──────────────────────────────────── */
.ck-cat {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 14px 0;
}
.ck-cat + .ck-cat { border-top: 1px solid #0f1e36; }
.ck-cat-info { flex: 1; }
.ck-cat-name {
  font-size: 0.78rem; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #c8d4e8; margin-bottom: 4px;
}
.ck-cat-desc { font-size: 0.72rem; color: #4a6080; line-height: 1.4; }
.ck-cat-ctrl { flex-shrink: 0; padding-top: 2px; }

/* Toggle switch */
.ck-toggle-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.6rem; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #4a6080; cursor: pointer;
}
.ck-toggle-label input { display: none; }
.ck-track {
  width: 38px; height: 20px; border-radius: 10px;
  background: #1e3a5f; border: 1px solid #2a4a6f;
  position: relative; transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.ck-toggle-label input:checked ~ .ck-track { background: #c89b3c; border-color: #c89b3c; }
.ck-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.ck-toggle-label input:checked ~ .ck-track .ck-thumb { transform: translateX(18px); }

/* Always-on badge */
.ck-always {
  font-size: 0.58rem; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #00cc66; white-space: nowrap;
  border: 1px solid #00cc6660; border-radius: 2px; padding: 3px 7px;
}

/* Modal footer */
#ck-modal .ck-modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 0 24px 20px; flex-wrap: wrap;
}

/* Privacy link */
.ck-privacy {
  font-size: 0.62rem; color: #785a28; letter-spacing: 1px;
  text-decoration: none; text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 9px 0; flex: 1;
}
.ck-privacy:hover { color: #c89b3c; }

/* Scrollbar inside modal */
#ck-modal::-webkit-scrollbar       { width: 4px; }
#ck-modal::-webkit-scrollbar-track { background: #010a13; }
#ck-modal::-webkit-scrollbar-thumb { background: #785a28; border-radius: 2px; }
`;

export class CookieBanner {
  #prefs    = { necessary: true, preferences: true };
  #bannerEl = null;
  #overlayEl = null;
  #reopenerEl = null;

  /** Inicializa: muestra el banner si no hay decisión guardada. */
  init() {
    this.#injectCSS();
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved) {
      this.#loadPrefs();
      this.#showReopener();
    } else {
      this.#showBanner();
    }
    document.addEventListener('langchange', () => this.#applyLang());
  }

  static isAccepted()         { return localStorage.getItem(CONSENT_KEY) === 'accepted'; }
  static prefEnabled(cat)     {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')[cat] !== false; }
    catch { return true; }
  }

  // ── Private ──────────────────────────────────────────────

  #injectCSS() {
    if (document.getElementById('ck-style')) return;
    const s = document.createElement('style');
    s.id = 'ck-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  #loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      this.#prefs = { necessary: true, preferences: p.preferences !== false };
    } catch { /* usa defaults */ }
  }

  // ── Banner ────────────────────────────────────────────────

  #showBanner() {
    const el = document.createElement('div');
    el.id = 'ck-banner';
    el.innerHTML = this.#bannerHTML();
    document.body.appendChild(el);
    this.#bannerEl = el;

    el.querySelector('#ck-accept-all').addEventListener('click', () => this.#acceptAll());
    el.querySelector('#ck-reject-all').addEventListener('click', () => this.#rejectAll());
    el.querySelector('#ck-open-settings').addEventListener('click', () => this.#openModal());
  }

  #bannerHTML() {
    return `
      <div class="ck-wrap">
        <div class="ck-icon">🍪</div>
        <div class="ck-body">
          <div id="ck-b-title" class="ck-title">${t('cookieTitle')}</div>
          <div id="ck-b-msg"   class="ck-msg">${t('cookieMsg')}</div>
        </div>
        <div class="ck-actions">
          <button id="ck-accept-all"    class="ck-btn ck-btn-accept">${t('cookieAcceptAll')}</button>
          <button id="ck-open-settings" class="ck-btn ck-btn-settings">${t('cookieSettings')}</button>
          <button id="ck-reject-all"    class="ck-btn ck-btn-reject">${t('cookieRejectAll')}</button>
        </div>
      </div>
    `;
  }

  #hideBanner(cb) {
    if (!this.#bannerEl) { cb?.(); return; }
    this.#bannerEl.classList.add('ck-hiding');
    setTimeout(() => { this.#bannerEl?.remove(); this.#bannerEl = null; cb?.(); }, 310);
  }

  // ── Modal ─────────────────────────────────────────────────

  #openModal() {
    if (this.#overlayEl) return;
    const ov = document.createElement('div');
    ov.id = 'ck-overlay';
    ov.innerHTML = this.#modalHTML();
    document.body.appendChild(ov);
    this.#overlayEl = ov;

    // Wiring toggles
    const prefToggle = ov.querySelector('#ck-pref-toggle');
    if (prefToggle) prefToggle.checked = this.#prefs.preferences;

    ov.querySelector('#ck-save').addEventListener('click', () => {
      if (prefToggle) this.#prefs.preferences = prefToggle.checked;
      this.#saveCustom();
    });
    ov.querySelector('#ck-m-accept-all').addEventListener('click', () => this.#acceptAll());
    ov.querySelector('#ck-m-reject-all').addEventListener('click', () => this.#rejectAll());
    ov.addEventListener('click', e => { if (e.target === ov) this.#closeModal(); });
  }

  #modalHTML() {
    return `
      <div id="ck-modal">
        <div class="ck-modal-top"></div>
        <div class="ck-modal-body">
          <div id="ck-m-title" class="ck-modal-title">${t('cookieSettingsTitle')}</div>
          <div id="ck-m-desc"  class="ck-modal-desc">${t('cookieMsg')}</div>

          <!-- Categoría: Necesarias -->
          <div class="ck-cat">
            <div class="ck-cat-info">
              <div id="ck-nec-name" class="ck-cat-name">🔒 ${t('cookieNecTitle')}</div>
              <div id="ck-nec-desc" class="ck-cat-desc">${t('cookieNecDesc')}</div>
            </div>
            <div class="ck-cat-ctrl">
              <span id="ck-always-lbl" class="ck-always">${t('cookieAlways')}</span>
            </div>
          </div>

          <!-- Categoría: Preferencias -->
          <div class="ck-cat">
            <div class="ck-cat-info">
              <div id="ck-pref-name" class="ck-cat-name">⚙️ ${t('cookiePrefTitle')}</div>
              <div id="ck-pref-desc" class="ck-cat-desc">${t('cookiePrefDesc')}</div>
            </div>
            <div class="ck-cat-ctrl">
              <label class="ck-toggle-label">
                <input type="checkbox" id="ck-pref-toggle" ${this.#prefs.preferences ? 'checked' : ''}>
                <div class="ck-track"><div class="ck-thumb"></div></div>
              </label>
            </div>
          </div>
        </div>

        <div class="ck-modal-footer">
          <a id="ck-privacy-link" class="ck-privacy" href="/privacy.html" target="_blank" rel="noopener">
            🔗 ${t('cookiePrivacy')}
          </a>
          <button id="ck-m-reject-all" class="ck-btn ck-btn-reject">${t('cookieRejectAll')}</button>
          <button id="ck-save"         class="ck-btn ck-btn-settings">${t('cookieSave')}</button>
          <button id="ck-m-accept-all" class="ck-btn ck-btn-accept">${t('cookieAcceptAll')}</button>
        </div>
      </div>
    `;
  }

  #closeModal(cb) {
    if (!this.#overlayEl) { cb?.(); return; }
    this.#overlayEl.classList.add('ck-hiding');
    setTimeout(() => { this.#overlayEl?.remove(); this.#overlayEl = null; cb?.(); }, 220);
  }

  // ── Reopener ──────────────────────────────────────────────

  #showReopener() {
    if (this.#reopenerEl) return;
    const el = document.createElement('button');
    el.id = 'ck-reopener';
    el.innerHTML = `<span class="ck-rp-icon">🍪</span><span id="ck-rp-lbl">${t('cookieReopener')}</span>`;
    el.addEventListener('click', () => {
      this.#hideBanner(() => this.#openModal());
    });
    document.body.appendChild(el);
    this.#reopenerEl = el;
  }

  // ── Decisiones ────────────────────────────────────────────

  #acceptAll() {
    this.#prefs = { necessary: true, preferences: true };
    this.#commit('accepted');
  }

  #rejectAll() {
    this.#prefs = { necessary: true, preferences: false };
    this.#commit('rejected');
  }

  #saveCustom() {
    const allOn = this.#prefs.preferences;
    this.#commit(allOn ? 'accepted' : 'custom');
  }

  #commit(status) {
    localStorage.setItem(CONSENT_KEY, status);
    localStorage.setItem(PREFS_KEY, JSON.stringify(this.#prefs));
    this.#closeModal(() => this.#hideBanner(() => this.#showReopener()));
  }

  // ── Actualización de textos (langchange) ──────────────────

  #applyLang() {
    this.#applyBannerLang();
    this.#applyModalLang();
    this.#applyReopenerLang();
  }

  #applyBannerLang() {
    const el = this.#bannerEl;
    if (!el) return;
    this.#setText(el, '#ck-b-title', t('cookieTitle'));
    this.#setText(el, '#ck-b-msg',   t('cookieMsg'));
    this.#setText(el, '#ck-accept-all',    t('cookieAcceptAll'));
    this.#setText(el, '#ck-open-settings', t('cookieSettings'));
    this.#setText(el, '#ck-reject-all',    t('cookieRejectAll'));
  }

  #applyModalLang() {
    const el = this.#overlayEl;
    if (!el) return;
    this.#setText(el, '#ck-m-title',    t('cookieSettingsTitle'));
    this.#setText(el, '#ck-m-desc',     t('cookieMsg'));
    this.#setText(el, '#ck-nec-name',   `🔒 ${t('cookieNecTitle')}`);
    this.#setText(el, '#ck-nec-desc',   t('cookieNecDesc'));
    this.#setText(el, '#ck-pref-name',  `⚙️ ${t('cookiePrefTitle')}`);
    this.#setText(el, '#ck-pref-desc',  t('cookiePrefDesc'));
    this.#setText(el, '#ck-always-lbl', t('cookieAlways'));
    this.#setText(el, '#ck-save',       t('cookieSave'));
    this.#setText(el, '#ck-m-accept-all', t('cookieAcceptAll'));
    this.#setText(el, '#ck-m-reject-all', t('cookieRejectAll'));
    const link = el.querySelector('#ck-privacy-link');
    if (link) link.innerHTML = `🔗 ${t('cookiePrivacy')}`;
  }

  #applyReopenerLang() {
    const el = this.#reopenerEl?.querySelector('#ck-rp-lbl');
    if (el) el.textContent = t('cookieReopener');
  }

  #setText(root, sel, text) {
    const el = root.querySelector(sel);
    if (el) el.textContent = text;
  }
}
