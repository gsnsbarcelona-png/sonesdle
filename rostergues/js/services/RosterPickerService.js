import { storageService } from './StorageService.js';

const COOLDOWN  = 6;
const KEY       = 'rostergues_seen';

export function pickRoster(rosters) {
  const seen      = storageService.get(KEY) ?? [];
  const available = rosters.filter(r => !seen.includes(r.id));
  const pool      = available.length > 0 ? available : rosters;
  const chosen    = pool[Math.floor(Math.random() * pool.length)];
  const updated   = [...seen, chosen.id].slice(-COOLDOWN);
  storageService.set(KEY, updated);
  return chosen;
}
