export class BoardState {
  constructor()       { this._reset(); }
  reset()             { this._reset(); }
  place(r, c, key)    { this._board[r][c] = key; }
  isFilled(r, c)      { return !!this._board[r][c]; }
  filledCount()       { return this._board.flat().filter(Boolean).length; }
  snapshot()          { return this._board.map(row => [...row]); }
  _reset()            { this._board = Array.from({length:3}, () => Array(3).fill(null)); }
}
