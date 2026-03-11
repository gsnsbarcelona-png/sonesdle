export class EventBus {
  constructor() { this._map = {}; }

  on(event, fn) {
    (this._map[event] || (this._map[event] = [])).push(fn);
    return this;
  }

  off(event, fn) {
    this._map[event] = (this._map[event] || []).filter(f => f !== fn);
  }

  emit(event, payload) {
    payload = payload || {};
    (this._map[event] || []).slice().forEach(fn => fn(payload));
  }
}
