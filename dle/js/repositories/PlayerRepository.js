import { LeaguepediaService } from '../services/LeaguepediaService.js';

class Player {
  constructor(data) {
    this.name     = data.name;
    this.real     = data.real;
    this.country  = data.country;
    this.flag     = data.flag;
    this.league   = data.league;
    this.position = data.position;
    this.titles   = data.titles;
    this.worlds   = data.worlds;
    this.age      = data.age;
    this.team     = data.team;
    this.image    = data.image ?? null;
  }
}

export class PlayerRepository {
  // Índice name.toLowerCase() → Player para búsquedas O(1)
  #players   = [];
  #playerMap = new Map();

  async load(url = './data/players.json') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
    const { players } = await res.json();
    this.#setPlayers(players);
    if (this.#players.length < 2) throw new Error('players.json necesita al menos 2 jugadores.');
  }

  /**
   * Stale-while-revalidate:
   * — Con caché: arranca inmediatamente, actualiza API en background.
   * — Sin caché: espera la API (bloqueante).
   * — Si la API falla sin caché: lanza error → el caller usa el JSON local.
   */
  async loadFromAPI() {
    const CACHE_KEY = 'loldle_players_v3';
    let hasCache = false;

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { players } = JSON.parse(raw);
        if (Array.isArray(players) && players.length >= 2) {
          this.#setPlayers(players);
          hasCache = true;
        }
      }
    } catch { /* caché corrupta, ignorar */ }

    const fetchFromAPI = async () => {
      const service    = new LeaguepediaService();
      const apiPlayers = await service.fetchPlayers();
      const worldsSet  = await service.fetchWorldsParticipants();
      const titlesMap  = await service.fetchRegionalTitles();

      const playerData = apiPlayers
        .map(p => service.mapToPlayerData(p, worldsSet, titlesMap))
        .filter(Boolean);

      if (playerData.length < 2)
        throw new Error(`La API devolvio muy pocos jugadores (${playerData.length}).`);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), players: playerData }));
      } catch { /* localStorage lleno, ignorar */ }

      return playerData;
    };

    if (!hasCache) {
      this.#setPlayers(await fetchFromAPI());
    } else {
      fetchFromAPI()
        .then(data => this.#setPlayers(data))
        .catch(err => console.warn('[DLE Games] Actualización background fallida:', err.message));
    }
  }

  get count() { return this.#players.length; }

  getByIndex(i) { return this.#players[i % this.#players.length]; }

  getRandom() {
    return this.#players[Math.floor(Math.random() * this.#players.length)];
  }

  findByName(name) {
    return this.#playerMap.get(name.toLowerCase()) ?? null;
  }

  search(query, exclude = new Set()) {
    const q = query.toLowerCase();
    return this.#players
      .filter(p => !exclude.has(p.name) && p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }

  #setPlayers(data) {
    this.#players   = data.map(p => new Player(p));
    this.#playerMap = new Map(this.#players.map(p => [p.name.toLowerCase(), p]));
  }
}
