export class GameService {
  #repo;
  #secret       = null;
  #guessed      = new Set();
  #attempts     = 0;
  #over         = false;
  #filter       = null;

  constructor(repository) {
    this.#repo = repository;
  }

  /** @param {object|null} forcedPlayer — jugador diario, o null para aleatorio
   *  @param {{maxTier: number, region: string|null}} filter — jugadores que entran en
   *         la partida (secreto y buscador) */
  start(forcedPlayer = null, filter = { maxTier: 1, region: null }) {
    this.#filter   = filter;
    this.#secret   = forcedPlayer ?? this.#repo.getRandom(filter);
    this.#guessed  = new Set();
    this.#attempts = 0;
    this.#over     = false;
  }

  get attempts() { return this.#attempts; }
  get secret()   { return this.#secret; }

  guess(name) {
    if (this.#over) return { error: 'game_over' };

    const player = this.#repo.findByName(name);
    if (!player)                        return { error: 'not_found' };
    if (this.#guessed.has(player.name)) return { error: 'already_guessed' };

    this.#guessed.add(player.name);
    this.#attempts++;

    const result = this.#compare(player, this.#secret);
    const won    = player.name === this.#secret.name;
    if (won) this.#over = true;

    return { player, result, won };
  }

  giveUp() {
    if (this.#over) return { error: 'game_over' };
    this.#over = true;
    return { secret: this.#secret };
  }

  searchPlayers(query) {
    return this.#repo.search(query, this.#guessed, this.#filter);
  }

  #compare(guessed, target) {
    return {
      country:  this.#exact(guessed.country,  target.country),
      league:   this.#compareLeague(guessed, target),
      position: this.#comparePosition(guessed.position, target.position),
      titles:   this.#exact(guessed.titles,   target.titles),
      worlds:   this.#exact(guessed.worlds,   target.worlds),
      age:      guessed.name === target.name
                  ? { status: 'correct', arrow: null }
                  : this.#compareNumeric(guessed.age, target.age),
      team:     this.#exact(guessed.team,     target.team),
    };
  }

  #exact(a, b) { return a === b ? 'correct' : 'wrong'; }

  /** Misma liga: correcto. Otra liga de la misma región (LEC vs LFL): parcial. */
  #compareLeague(guessed, target) {
    if (guessed.league === target.league) return 'correct';
    return guessed.region && guessed.region === target.region ? 'partial' : 'wrong';
  }

  #comparePosition(a, b) {
    if (a.length === b.length && a.every(p => b.includes(p))) return 'correct';
    if (a.some(p => b.includes(p))) return 'partial';
    return 'wrong';
  }

  #compareNumeric(a, b) {
    if (a == null || b == null) return { status: 'wrong', arrow: null }; // edad desconocida
    if (a === b) return { status: 'correct', arrow: null };
    return { status: 'wrong', arrow: a < b ? 'up' : 'down' };
  }
}
