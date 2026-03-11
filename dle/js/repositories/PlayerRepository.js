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
  /** @type {Player[]} */
  #players = [];
  /** @type {Map<string, Player>} Índice name.toLowerCase() → Player para O(1) */
  #playerMap = new Map();

  /**
   * Carga los jugadores desde el archivo JSON.
   * @param {string} url - ruta relativa al documento HTML
   */
  async load(url = './data/players.json') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
    const { players } = await res.json();
    this.#players = players.map(p => new Player(p));
    if (this.#players.length < 2) {
      throw new Error('El archivo players.json necesita al menos 2 jugadores.');
    }
    this.#buildIndex();
  }

  /**
   * Carga jugadores con patrón stale-while-revalidate:
   * — Si hay caché: la usa para arrancar inmediatamente y lanza la API en background.
   * — Si no hay caché: espera a la API (bloqueante).
   * — Si la API falla sin caché: lanza error → el caller usa el JSON local.
   * La caché se actualiza siempre que la API responda correctamente.
   */
  async loadFromAPI() {
    const CACHE_KEY = 'loldle_players_v3';

    // 1. Leer caché (sin TTL — siempre se revalida con la API)
    let hasCache = false;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { players } = JSON.parse(raw);
        if (Array.isArray(players) && players.length >= 2) {
          this.#players = players.map(p => new Player(p));
          this.#buildIndex();
          hasCache = true;
          console.info(`[DLE Games] Caché cargada (${this.#players.length} jugadores) — actualizando desde API...`);
        }
      }
    } catch { /* caché corrupta, ignorar */ }

    // 2. Fetch a la API (secuencial para no disparar rate-limit)
    const fetchFromAPI = async () => {
      const service    = new LeaguepediaService();
      const apiPlayers = await service.fetchPlayers();
      const worldsSet  = await service.fetchWorldsParticipants();
      const titlesMap  = await service.fetchRegionalTitles();

      const playerData = apiPlayers
        .map(p => service.mapToPlayerData(p, worldsSet, titlesMap))
        .filter(Boolean);

      if (playerData.length < 2) {
        throw new Error(`La API devolvio muy pocos jugadores (${playerData.length}).`);
      }

      const fresh = playerData.map(p => new Player(p));

      // Actualiza la caché con los datos frescos
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          ts:      Date.now(),
          players: fresh.map(p => ({ ...p })),
        }));
      } catch { /* localStorage lleno, ignorar */ }

      return fresh;
    };

    if (!hasCache) {
      // Sin caché: esperar la API obligatoriamente
      this.#players = await fetchFromAPI();
      this.#buildIndex();
      console.info(`[DLE Games] API OK — ${this.#players.length} jugadores cargados`);
    } else {
      // Con caché: lanzar API en background sin bloquear el juego
      fetchFromAPI()
        .then(fresh => {
          this.#players = fresh;
          this.#buildIndex();
          console.info(`[DLE Games] API OK — caché actualizada con ${fresh.length} jugadores`);
        })
        .catch(err => console.warn('[DLE Games] Actualización background fallida:', err.message));
    }
  }

  /** Construye el índice name→Player para búsquedas O(1). */
  #buildIndex() {
    this.#playerMap = new Map(this.#players.map(p => [p.name.toLowerCase(), p]));
  }

  /** @returns {Player} jugador aleatorio */
  getRandom() {
    return this.#players[Math.floor(Math.random() * this.#players.length)];
  }

  /**
   * Busca un jugador por nombre exacto (case-insensitive). O(1).
   * @param {string} name
   * @returns {Player|null}
   */
  findByName(name) {
    return this.#playerMap.get(name.toLowerCase()) ?? null;
  }

  /**
   * Busca jugadores cuyo nombre contenga la query,
   * excluyendo los ya adivinados.
   * @param {string} query
   * @param {Set<string>} exclude - nombres a excluir
   * @returns {Player[]} maximo 8 resultados
   */
  search(query, exclude = new Set()) {
    const q = query.toLowerCase();
    return this.#players
      .filter(p => !exclude.has(p.name) && p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }
}
