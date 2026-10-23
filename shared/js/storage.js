/** localStorage con JSON que nunca lanza (modo privado, cuota llena, datos corruptos). */
export const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
  },
};
