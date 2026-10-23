/** Abrir y cerrar el modal de instrucciones (#instructions-modal) de los juegos. */
const modal = document.getElementById('instructions-modal');
document.getElementById('instructions-btn')?.addEventListener('click', () => modal?.classList.add('open'));
document.getElementById('instructions-close')?.addEventListener('click', () => modal?.classList.remove('open'));
modal?.addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});
