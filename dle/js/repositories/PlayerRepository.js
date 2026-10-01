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
    this.league   = data.league;
    this.position = data.position;
    this.titles   = data.titles;
    this.worlds   = data.worlds;
    this.age      = data.birthdate ? ageFrom(data.birthdate) : null;
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
