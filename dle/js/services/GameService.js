export class GameService {
  #repo;
  #secret   = null;
  #guessed  = new Set();
  #attempts = 0;
  #over     = false;

  /** @param {import('../repositories/PlayerRepository.js').PlayerRepository} repository */
  constructor(repository) {
    this.#repo = repository;
  }

  start() {
    this.#secret   = this.#repo.getRandom();
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
    return this.#repo.search(query, this.#guessed);
  }

  // ── Lógica de comparación (antes ComparatorService) ──────

  #compare(guessed, target) {
    return {
      country:  this.#exact(guessed.country,  target.country),
      league:   this.#exact(guessed.league,   target.league),
      position: this.#comparePosition(guessed.position, target.position),
      titles:   this.#exact(guessed.titles,   target.titles),
      worlds:   this.#exact(guessed.worlds,   target.worlds),
      age:      this.#compareNumeric(guessed.age, target.age),
      team:     this.#exact(guessed.team,     target.team),
    };
  }

  #exact(a, b) { return a === b ? 'correct' : 'wrong'; }

  #comparePosition(a, b) {
    if (a.length === b.length && a.every(p => b.includes(p))) return 'correct';
    if (a.some(p => b.includes(p))) return 'partial';
    return 'wrong';
  }

  #compareNumeric(a, b) {
    if (a === b) return { status: 'correct', arrow: null };
    return { status: 'wrong', arrow: a < b ? 'up' : 'down' };
  }
}
