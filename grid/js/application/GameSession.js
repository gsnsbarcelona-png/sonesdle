import { EVENTS } from '../events.js';
import { BoardState } from '../domain/BoardState.js';

export class GameSession {
  constructor({ bus, playerRepository, categoryRepository, winCondition, gridBuilder, normalizer, maxLives }) {
    this._bus      = bus;
    this._players  = playerRepository;
    this._cats     = categoryRepository;
    this._winCond  = winCondition;
    this._builder  = gridBuilder;
    this._norm     = normalizer;
    this._maxLives = maxLives;
    this._board    = new BoardState();
    this._config   = null;
    this._lives    = maxLives;
    this._active   = null;
    this._subscribe();
  }

  start() { this._init(); }

  _subscribe() {
    this._bus.on(EVENTS.CELL_CLICKED,    p  => this._onCellClicked(p));
    this._bus.on(EVENTS.INPUT_CHANGED,   p  => this._onInputChanged(p));
    this._bus.on(EVENTS.INPUT_SUBMITTED, p  => this._onInputSubmitted(p));
    this._bus.on(EVENTS.AC_SELECTED,     p  => this._onAcSelected(p));
    this._bus.on(EVENTS.MODAL_CLOSE,     () => { this._active = null; });
    this._bus.on(EVENTS.GAME_RESET,      () => this._init());
  }

  _init() {
    const players    = this._players.getAll();
    const categories = this._cats.getPool();
    this._config     = this._builder.build(players, categories);
    this._board.reset();
    this._lives  = this._maxLives;
    this._active = null;
    this._bus.emit(EVENTS.GAME_STARTED, {
      cols: this._config.cols, rows: this._config.rows, lives: this._lives,
    });
  }

  _onCellClicked({ r, c }) {
    if (this._board.isFilled(r, c)) return;
    this._active = { r, c };
    this._bus.emit(EVENTS.MODAL_OPEN, {
      r, c,
      rowCat: this._config.rows[r],
      colCat: this._config.cols[c],
    });
  }

  _onInputChanged({ raw }) {
    if (!this._active) return;
    const { r, c } = this._active;
    const norm  = this._norm.normalize(raw);
    const valid = this._config.valid[r][c];
    const matches = norm ? valid.filter(k => k.startsWith(norm) || k.includes(norm)) : [];
    this._bus.emit(EVENTS.AC_RESULTS, { matches, emojiMap: this._players.getEmojiMap() });
  }

  _onInputSubmitted({ raw }) {
    if (!this._active || !raw.trim()) return;
    const { r, c } = this._active;
    const key = this._norm.normalize(raw);
    if (this._config.valid[r][c].includes(key)) {
      this._doPlace(r, c, key);
    } else {
      this._lives--;
      this._bus.emit(EVENTS.GUESS_WRONG, { raw: raw.trim(), livesLeft: this._lives });
      if (this._lives === 0) {
        setTimeout(() => {
          this._bus.emit(EVENTS.MODAL_CLOSE);
          this._bus.emit(EVENTS.GAME_LOST);
        }, 900);
      }
    }
  }

  _onAcSelected({ key }) {
    if (!this._active) return;
    this._doPlace(this._active.r, this._active.c, key);
  }

  _doPlace(r, c, key) {
    const emoji = this._players.getEmojiMap()[key] || '🎮';
    this._board.place(r, c, key);
    const count = this._board.filledCount();
    this._bus.emit(EVENTS.GUESS_CORRECT, { r, c, key, emoji, filledCount: count });
    this._bus.emit(EVENTS.MODAL_CLOSE);
    if (this._winCond.check(this._board.snapshot())) {
      setTimeout(() => this._bus.emit(EVENTS.GAME_WON), 400);
    }
  }
}
