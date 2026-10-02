import { PlayerRepository } from '../abstracts.js';

export class LoLPlayerRepository extends PlayerRepository {
  constructor(players) {
    super();
    this._players = players;
    this._byKey   = new Map(players.map(p => [p.key, p]));
  }

  getAll()   { return this._players; }
  get(key)   { return this._byKey.get(key) ?? null; }
}
