export class StorageService {
  get(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
}
export const storageService = new StorageService();
