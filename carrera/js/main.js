/**
 * main.js — Game Controller
 *
 * Wires DOM events to state mutations and UI updates.
 * This is the only module that knows about both the core state and the UI.
 */

import * as State        from './core/state.js';
import * as Autocomplete from './ui/autocomplete.js';
import * as Renderer     from './ui/renderer.js';
import * as Modal        from './ui/modal.js';
import { ParticlesComponent } from './ui/particles.js';

// ─── Element shortcuts ────────────────────────────────────────────────────────

const inputEl = () => document.getElementById('guess-input');
const listEl  = () => document.getElementById('autocomplete-list');

// ─── Actions ──────────────────────────────────────────────────────────────────

function submitGuess() {
  const name = inputEl().value.trim();
  if (!name) { shakeInput(); return; }

  const result = State.guess(name);
  if (!result) return;

  inputEl().value = '';
  Autocomplete.close(listEl());
  Renderer.update(State.getState());

  if (result.finished) {
    const s = State.getState();
    setTimeout(() => Modal.showModal(s.won, s.currentPlayer, s.stats, s.attempts), 300);
  }
}

function useHint() {
  const result = State.useHint();
  if (!result) return;

  Renderer.update(State.getState());

  if (result.finished) {
    const s = State.getState();
    setTimeout(() => Modal.showModal(false, s.currentPlayer, s.stats, s.attempts), 300);
  }
}

function skip() {
  State.skip();
  Renderer.update(State.getState());
  const s = State.getState();
  setTimeout(() => Modal.showModal(false, s.currentPlayer, s.stats, s.attempts), 200);
}

function nextRound() {
  Modal.hideModal();
  State.nextPlayer();
  Renderer.update(State.getState());
  inputEl().value = '';
  inputEl().focus();
  document.getElementById('hints-log').innerHTML = '';
}

function shakeInput() {
  const el = inputEl();
  el.style.animation = 'none';
  void el.offsetWidth; // force reflow
  el.style.animation = 'shake 0.4s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

// ─── Event bindings ───────────────────────────────────────────────────────────

function bindEvents() {
  const input = inputEl();
  const list  = listEl();

  // Autocomplete filtering
  input.addEventListener('input', () => {
    const results = Autocomplete.filter(input.value);
    Autocomplete.render(results, input, list);
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      Autocomplete.navigate(1, list);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      Autocomplete.navigate(-1, list);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = Autocomplete.getActive();
      if (active) {
        input.value = active;
        Autocomplete.close(list);
      }
      submitGuess();
    } else if (e.key === 'Escape') {
      Autocomplete.close(list);
    }
  });

  // Autocomplete click — selecciona Y envía directamente
  list.addEventListener('mousedown', (e) => {
    e.preventDefault(); // evita que el input pierda foco antes del submit
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      input.value = item.dataset.name;
      Autocomplete.close(list);
      submitGuess();
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) Autocomplete.close(list);
  });

  // Buttons
  document.getElementById('btn-submit').addEventListener('click', submitGuess);
  document.getElementById('btn-hint').addEventListener('click', useHint);
  document.getElementById('btn-skip').addEventListener('click', skip);
  document.getElementById('btn-next').addEventListener('click', nextRound);
  document.getElementById('modal-btn').addEventListener('click', nextRound);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Boot canvas particles (same as /dle)
  const particles = new ParticlesComponent({
    particleCanvas: document.getElementById('canvas-particles'),
    confettiCanvas: document.getElementById('canvas-confetti'),
  });
  Modal.setParticles(particles);

  bindEvents();
  Renderer.update(State.getState());
});
