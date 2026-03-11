import { PlayerRepository } from '../abstracts.js';

export class LoLPlayerRepository extends PlayerRepository {
  constructor(players) {
    super();
    this._players  = players;
    this._emojiMap = null;
  }

  getAll() { return this._players; }

  getEmojiMap() {
    if (!this._emojiMap)
      this._emojiMap = Object.fromEntries(this._players.map(p => [p.key, p.em]));
    return this._emojiMap;
  }
}
