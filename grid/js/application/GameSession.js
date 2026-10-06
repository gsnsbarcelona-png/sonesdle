import { EVENTS } from '../events.js';
import { BoardState } from '../domain/BoardState.js';
import { recordResult } from '../../../shared/auth.js';

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
    this._tried    = new Map();   // "r,c" → claves ya falladas en esa casilla
    this._lastRaw  = '';
    // Índice de búsqueda: nombre normalizado (sin tildes) → jugador. `base` sin la
    // desambiguación: "Hybrid (Glenn Doornenbal)" → "hybrid"
    this._index    = playerRepository.getAll().map(p => {
      const norm = normalizer.normalize(p.name);
      return { norm, base: norm.replace(/\s*\(.*\)$/, ''), p };
    });
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
    this._tried.clear();
    this._bus.emit(EVENTS.GAME_STARTED, {
      cols: this._config.cols, rows: this._config.rows, lives: this._lives,
    });
  }

  _onCellClicked({ r, c }) {
    if (this._lives <= 0 || this._board.isFilled(r, c)) return;
    this._active = { r, c };
    this._bus.emit(EVENTS.MODAL_OPEN, {
      r, c,
      rowCat: this._config.rows[r],
      colCat: this._config.cols[c],
    });
  }

  /** Sugerencias entre todos los jugadores (no solo los válidos: eso daría la respuesta). */
  _onInputChanged({ raw }) {
    if (!this._active) return;
    this._lastRaw = raw;
    const norm  = this._norm.normalize(raw);
    const used  = this._usedKeys();
    const tried = this._triedHere();
    const matches = !norm ? [] : this._index
      .filter(({ norm: n, p }) => n.includes(norm) && !used.has(p.key))
      .sort((a, b) => b.norm.startsWith(norm) - a.norm.startsWith(norm) || a.norm.length - b.norm.length)
      .slice(0, 8)
      .map(({ p }) => ({ ...p, tried: tried.has(p.key) }));
    this._bus.emit(EVENTS.AC_RESULTS, { matches });
  }

  _onInputSubmitted({ raw }) {
    if (!this._active || !raw.trim()) return;
    const norm = this._norm.normalize(raw);
    const hit  = this._index.find(e => e.norm === norm);
    if (hit) return this._guess(hit.p, raw.trim());
    // Sin la desambiguación: vale si solo hay un jugador con ese nombre
    const same = this._index.filter(e => e.base === norm);
    if (same.length > 1) return this._bus.emit(EVENTS.GUESS_REJECTED, { raw: raw.trim(), reason: 'ambiguous' });
    this._guess(same[0]?.p ?? null, raw.trim());
  }

  _onAcSelected({ key }) {
    if (!this._active) return;
    const player = this._players.get(key);
    this._guess(player, player?.name ?? key);
  }

  /** Un nombre que no existe o un jugador ya colocado no cuestan vida. */
  _guess(player, raw) {
    if (this._lives <= 0) return;
    if (!player)                           return this._bus.emit(EVENTS.GUESS_REJECTED, { raw, reason: 'unknown' });
    if (this._usedKeys().has(player.key))  return this._bus.emit(EVENTS.GUESS_REJECTED, { raw: player.name, reason: 'used' });
    if (this._triedHere().has(player.key)) return this._bus.emit(EVENTS.GUESS_REJECTED, { raw: player.name, reason: 'tried' });
    const { r, c } = this._active;
    if (this._config.valid[r][c].includes(player.key)) {
      this._doPlace(r, c, player);
    } else {
      this._lives--;
      this._triedHere().add(player.key);
      this._bus.emit(EVENTS.GUESS_WRONG, { raw: player.name, livesLeft: this._lives });
      this._onInputChanged({ raw: this._lastRaw });   // la lista lo muestra ya como fallado
      if (this._lives === 0) {
        this._record(false);
        setTimeout(() => {
          this._bus.emit(EVENTS.MODAL_CLOSE);
          this._bus.emit(EVENTS.GAME_LOST, { reveal: this._solutions() });
        }, 900);
      }
    }
  }

  _triedHere() {
    const k = `${this._active.r},${this._active.c}`;
    if (!this._tried.has(k)) this._tried.set(k, new Set());
    return this._tried.get(k);
  }

  _usedKeys() { return new Set(this._board.snapshot().flat().filter(Boolean)); }

  /**
   * Una respuesta posible para cada casilla vacía, sin repetir jugador. Primero los
   * más conocidos (los que tienen emoji propio) y las casillas con menos opciones.
   */
  _solutions() {
    const used  = this._usedKeys();
    const empty = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!this._board.isFilled(r, c)) empty.push({ r, c });
    empty.sort((a, b) => this._config.valid[a.r][a.c].length - this._config.valid[b.r][b.c].length);
    return empty.map(({ r, c }) => {
      const options = this._config.valid[r][c].map(k => this._players.get(k)).filter(p => p && !used.has(p.key));
      const p = options.find(o => o.em) ?? options[0];
      if (!p) return null;
      used.add(p.key);
      return { r, c, name: p.name, emoji: p.em || '🎮' };
    }).filter(Boolean);
  }

  _doPlace(r, c, player) {
    this._board.place(r, c, player.key);
    const count = this._board.filledCount();
    this._bus.emit(EVENTS.GUESS_CORRECT, { r, c, key: player.key, name: player.name, emoji: player.em || '🎮', filledCount: count });
    this._bus.emit(EVENTS.MODAL_CLOSE);
    if (this._winCond.check(this._board.snapshot())) {
      this._record(true);
      setTimeout(() => this._bus.emit(EVENTS.GAME_WON), 400);
    }
  }

  /** Historial del usuario (cuenta de Google o este navegador). Intentos = fallos. */
  _record(won) {
    recordResult({
      game: 'grid', mode: 'free', won, attempts: this._maxLives - this._lives,
      details: { filled: this._board.filledCount(),
                 cols: this._config.cols.map(c => c.id), rows: this._config.rows.map(c => c.id) },
    });
  }
}
