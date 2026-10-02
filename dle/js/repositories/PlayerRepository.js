/** Edad actual a partir de "YYYY-MM-DD" (así no se queda desfasada en el JSON). */
function ageFrom(birthdate) {
  const [y, m, d] = birthdate.split('-').map(Number);
  const now = new Date();
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  return now.getFullYear() - y - (hadBirthday ? 0 : 1);
}

class Player {
  constructor(data) {
    this.name     = data.name;
    this.real     = data.real;
    this.country  = data.country;
    this.flag     = data.flag;
    this.league   = data.league ?? '—';
    this.tier     = data.tier;     // 1 = liga con plaza a Worlds
    this.region   = data.region;   // EMEA, KR, CN, PAC, NA, BR, LATAM
    this.position = data.position;
    this.titles   = data.titles;
    this.worlds   = data.worlds;
    this.age      = data.birthdate ? ageFrom(data.birthdate) : null;
    this.team     = data.team;
    this.freeAgent = data.free_agent ?? false;   // sin equipo hace poco: `team` es el último
    this.image    = data.image ?? null;
  }
}

/**
 * Filtro de jugadores: { maxTier: 1|2|3, region: string|null }.
 * El reto diario usa DAILY_FILTER (solo ligas tier 1).
 */
export const DAILY_FILTER = Object.freeze({ maxTier: 1, region: null });

const matches = (p, { maxTier = 3, region = null } = {}) =>
  (p.tier ?? 3) <= maxTier && (!region || p.region === region);

export class PlayerRepository {
  // Índice name.toLowerCase() → Player para búsquedas O(1)
  #players   = [];
  #daily     = [];
  #playerMap = new Map();

  async load(url = './data/players.json') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
    const { players } = await res.json();
    this.#setPlayers(players);
    if (this.#daily.length < 2) throw new Error('players.json necesita al menos 2 jugadores tier 1.');
  }

  /** Jugador del reto diario: solo ligas tier 1. */
  getDaily(i) { return this.#daily[i % this.#daily.length]; }
  get dailyCount() { return this.#daily.length; }

  getRandom(filter) {
    const pool = this.#players.filter(p => matches(p, filter));
    const from = pool.length ? pool : this.#daily;
    return from[Math.floor(Math.random() * from.length)];
  }

  findByName(name) {
    return this.#playerMap.get(name.toLowerCase()) ?? null;
  }

  /** Regiones con jugadores hasta `maxTier`, ordenadas por número de jugadores. */
  getRegions(maxTier = 3) {
    const counts = new Map();
    for (const p of this.#players) {
      if (matches(p, { maxTier }) && p.region) counts.set(p.region, (counts.get(p.region) ?? 0) + 1);
    }
    return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  }

  search(query, exclude = new Set(), filter) {
    const q = query.toLowerCase();
    return this.#players
      .filter(p => !exclude.has(p.name) && p.name.toLowerCase().includes(q) && matches(p, filter))
      .slice(0, 8);
  }

  #setPlayers(data) {
    this.#players   = data.map(p => new Player(p));
    this.#daily     = this.#players.filter(p => matches(p, DAILY_FILTER));
    this.#playerMap = new Map(this.#players.map(p => [p.name.toLowerCase(), p]));
  }
}
