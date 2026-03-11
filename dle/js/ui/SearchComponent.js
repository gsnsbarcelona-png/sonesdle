import { flagImg, esc } from '../utils/helpers.js';

export class SearchComponent {
  #input;
  #dropdown;
  #errorEl;
  #onGuess;
  #getResults;

  #ddItems = [];
  #ddIndex = -1;

  constructor({ inputEl, dropdownEl, errorEl, onGuess, getResults }) {
    this.#input      = inputEl;
    this.#dropdown   = dropdownEl;
    this.#errorEl    = errorEl;
    this.#onGuess    = onGuess;
    this.#getResults = getResults;
    this.#bindEvents();
  }

  // ── Public API ──────────────────────────────────────────

  get value() { return this.#input.value.trim(); }

  clearInput() {
    this.#input.value = '';
    this.#closeDropdown();
  }

  setEnabled(enabled) {
    this.#input.disabled = !enabled;
  }

  showError(msg) {
    this.#errorEl.textContent = msg;
    setTimeout(() => {
      if (this.#errorEl.textContent === msg) this.#errorEl.textContent = '';
    }, 3000);
  }

  // ── Private ──────────────────────────────────────────────

  #bindEvents() {
    this.#input.addEventListener('input', () => this.#onInput());
    this.#input.addEventListener('keydown', e => this.#onKeydown(e));
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) this.#closeDropdown();
    });
  }

  #onInput() {
    const q = this.#input.value.trim();
    if (!q) { this.#closeDropdown(); return; }
    this.#ddItems = this.#getResults(q);
    this.#ddIndex = -1;
    if (!this.#ddItems.length) { this.#closeDropdown(); return; }
    this.#renderDropdown();
  }

  #onKeydown(e) {
    const open = !this.#dropdown.classList.contains('hidden');
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) return;
        this.#ddIndex = Math.min(this.#ddIndex + 1, this.#ddItems.length - 1);
        this.#updateActive();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) return;
        this.#ddIndex = Math.max(this.#ddIndex - 1, -1);
        this.#updateActive();
        break;
      case 'Enter':
        e.preventDefault();
        if (open && this.#ddIndex >= 0) {
          this.#pick(this.#ddItems[this.#ddIndex]);
        } else {
          this.#onGuess(this.#input.value.trim());
        }
        break;
      case 'Escape':
        this.#closeDropdown();
        break;
    }
  }

  #renderDropdown() {
    const frag = document.createDocumentFragment();
    this.#ddItems.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'dd-item' + (i === this.#ddIndex ? ' dd-active' : '');
      el.innerHTML = `
        <span class="dd-flag">${flagImg(p.flag)}</span>
        <span class="dd-name">${esc(p.name)}</span>
        <span class="dd-pos">${esc(p.position.join('/'))}</span>
      `;
      el.addEventListener('mousedown', ev => { ev.preventDefault(); this.#pick(p); });
      frag.appendChild(el);
    });
    this.#dropdown.innerHTML = '';
    this.#dropdown.appendChild(frag);
    this.#dropdown.classList.remove('hidden');
  }

  #updateActive() {
    const items = this.#dropdown.children;
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('dd-active', i === this.#ddIndex);
    }
  }

  #pick(player) {
    this.#closeDropdown();
    this.#onGuess(player.name);
  }

  #closeDropdown() {
    this.#dropdown.classList.add('hidden');
    this.#dropdown.innerHTML = '';
    this.#ddIndex = -1;
    this.#ddItems = [];
  }
}
