import { EVENTS } from '../events.js';

export class InputCoordinator {
  constructor(bus, { inputEl, confirmBtn, cancelBtn, overlayEl, acPresenter }) {
    inputEl.addEventListener('input', e =>
      bus.emit(EVENTS.INPUT_CHANGED, { raw: e.target.value })
    );

    inputEl.addEventListener('keydown', e => {
      if      (e.key === 'ArrowDown') { e.preventDefault(); bus.emit(EVENTS.INPUT_KEYDOWN, { dir: 'down' }); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); bus.emit(EVENTS.INPUT_KEYDOWN, { dir: 'up' }); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (!acPresenter.confirmFocused())
          bus.emit(EVENTS.INPUT_SUBMITTED, { raw: inputEl.value });
      }
      else if (e.key === 'Escape') bus.emit(EVENTS.MODAL_CLOSE);
    });

    confirmBtn.addEventListener('click', () =>
      bus.emit(EVENTS.INPUT_SUBMITTED, { raw: inputEl.value })
    );
    cancelBtn.addEventListener('click', () => bus.emit(EVENTS.MODAL_CLOSE));
    overlayEl.addEventListener('click', e => {
      if (e.target === e.currentTarget) bus.emit(EVENTS.MODAL_CLOSE);
    });
  }
}
