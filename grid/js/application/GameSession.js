import { EVENTS } from '../events.js';
import { BoardState } from '../domain/BoardState.js';
import { recordResult, getTodayDaily, today } from '../../../shared/auth.js';

const DAILY_KEY = 'grid_daily';

const store = {
  get(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } },
};

/**
 * Partida del grid. Dos modos:
 * - 'daily': el tablero del día (schedule.json), igual para todos. Se guarda tras cada
 *   jugada y se recupera al volver; con cuenta, también si se jugó en otro dispositivo.
 * - 'free':  tablero aleatorio, tantas partidas como se quiera.
 */
export class GameSession {
  constructor({ bus, playerRepository, categoryRepository, winCondition, gridBuilder, normalizer, maxLives, schedule = {} }) {
    this._bus      = bus;
    this._players  = playerRepository;
    this._cats     = categoryRepository;
    this._winCond  = winCondition;
    this._builder  = gridBuilder;
    this._norm     = normalizer;
    this._maxLives = maxLives;
    this._schedule = schedule;
    this._mode     = 'daily';
    this._board    = new BoardState();
    this._config   = null;
    this._lives    = maxLives;
    this._over     = false;
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

  get bus()  { return this._bus; }
  get mode() { return this._mode; }
  /** Hay tablero diario para hoy (si no, solo modo libre). */
  get hasDaily() { return !!this._schedule[today()]; }

  start(mode = this.hasDaily ? 'daily' : 'free') {
    this._mode = mode === 'daily' && this.hasDaily ? 'daily' : 'free';
    this._init();
  }

  _subscribe() {
    this._bus.on(EVENTS.CELL_CLICKED,    p  => this._onCellClicked(p));
    this._bus.on(EVENTS.INPUT_CHANGED,   p  => this._onInputChanged(p));
    this._bus.on(EVENTS.INPUT_SUBMITTED, p  => this._onInputSubmitted(p));
    this._bus.on(EVENTS.AC_SELECTED,     p  => this._onAcSelected(p));
    this._bus.on(EVENTS.MODAL_CLOSE,     () => { this._active = null; });
    // "Jugar de nuevo" tras el diario lleva al modo libre
    this._bus.on(EVENTS.GAME_RESET,      () => this.start('free'));
  }

  _init() {
    const players    = this._players.getAll();
    const categories = this._cats.getPool();
    const daily      = this._mode === 'daily' ? this._schedule[today()] : null;
    this._config = daily
      ? this._builder.fromIds(players, categories, daily.cols, daily.rows)
      : this._builder.build(players, categories);
    this._board.reset();
    this._lives  = this._maxLives;
    this._over   = false;
    this._active = null;
    this._tried.clear();

    const saved = daily ? store.get(DAILY_KEY) : null;
    if (saved?.date === today()) this._restore(saved);
    this._emitStart();
    if (daily && !this._over) this._syncFromAccount();
  }

  _emitStart() {
    this._bus.emit(EVENTS.GAME_STARTED, {
      cols: this._config.cols, rows: this._config.rows,
      lives: this._lives, maxLives: this._maxLives, mode: this._mode,
    });
    for (const [r, c, key] of this._placed()) {
      const p = this._players.get(key);
      this._bus.emit(EVENTS.CELL_RESTORED, { r, c, name: p?.name ?? key, emoji: p?.em || '🎮' });
    }
    if (this._over) this._finish(this._won(), { restored: true });
  }

  /** Reto diario ya jugado en otro dispositivo con la misma cuenta. */
  async _syncFromAccount() {
    const remote = await getTodayDaily('grid');
    if (!remote?.details?.placed || this._mode !== 'daily' || this._over) return;
    this._board.reset();
    this._restore({ ...remote.details, over: true });
    this._save();
    this._emitStart();
  }

  _restore({ placed = [], lives, tried = {}, over }) {
    for (const [r, c, key] of placed) this._board.place(r, c, key);
    this._lives = lives ?? this._maxLives;
    this._tried = new Map(Object.entries(tried).map(([k, v]) => [k, new Set(v)]));
    this._over  = !!over;
  }

  _save() {
    if (this._mode !== 'daily') return;
    store.set(DAILY_KEY, {
      date: today(), placed: this._placed(), lives: this._lives, over: this._over,
      tried: Object.fromEntries([...this._tried].map(([k, v]) => [k, [...v]])),
    });
  }

  _placed() {
    const out = [];
    this._board.snapshot().forEach((row, r) => row.forEach((key, c) => { if (key) out.push([r, c, key]); }));
    return out;
  }

  _won() { return this._winCond.check(this._board.snapshot()); }

  _onCellClicked({ r, c }) {
    if (this._over || this._board.isFilled(r, c)) return;
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
    if (this._over) return;
    if (!player)                           return this._bus.emit(EVENTS.GUESS_REJECTED, { raw, reason: 'unknown' });
    if (this._usedKeys().has(player.key))  return this._bus.emit(EVENTS.GUESS_REJECTED, { raw: player.name, reason: 'used' });
    if (this._triedHere().has(player.key)) return this._bus.emit(EVENTS.GUESS_REJECTED, { raw: player.name, reason: 'tried' });
    const { r, c } = this._active;
    if (this._config.valid[r][c].includes(player.key)) {
      this._doPlace(r, c, player);
    } else {
      this._lives--;
      this._triedHere().add(player.key);
      this._over = this._lives === 0;
      this._save();
      this._bus.emit(EVENTS.GUESS_WRONG, { raw: player.name, livesLeft: this._lives });
      this._onInputChanged({ raw: this._lastRaw });   // la lista lo muestra ya como fallado
      if (this._over) {
        this._record(false);
        setTimeout(() => {
          this._bus.emit(EVENTS.MODAL_CLOSE);
          this._finish(false);
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
    const won = this._won();
    this._over = won;
    this._save();
    const count = this._board.filledCount();
    this._bus.emit(EVENTS.GUESS_CORRECT, { r, c, key: player.key, name: player.name, emoji: player.em || '🎮', filledCount: count });
    this._bus.emit(EVENTS.MODAL_CLOSE);
    if (won) {
      this._record(true);
      setTimeout(() => this._finish(true), 400);
    }
  }

  _finish(won, extra = {}) {
    this._bus.emit(won ? EVENTS.GAME_WON : EVENTS.GAME_LOST,
                   { ...extra, mode: this._mode, reveal: won ? [] : this._solutions() });
  }

  /** Texto para compartir el reto diario: 🟩 acierto, ⬛ casilla vacía. */
  shareText() {
    const date  = today().split('-').reverse().join('/');
    const board = this._board.snapshot().map(row => row.map(k => (k ? '🟩' : '⬛')).join('')).join('\n');
    const lives = '❤️'.repeat(this._lives) + '🖤'.repeat(this._maxLives - this._lives);
    return `LoL Pro Grid ${date} ${this._board.filledCount()}/9\n\n${board}\n${lives}\n\nlolprogames.com/grid`;
  }

  /** Historial del usuario (cuenta de Google o este navegador). Intentos = fallos. */
  _record(won) {
    recordResult({
      game: 'grid', mode: this._mode, won, attempts: this._maxLives - this._lives,
      details: { filled: this._board.filledCount(), placed: this._placed(), lives: this._lives,
                 cols: this._config.cols.map(c => c.id), rows: this._config.rows.map(c => c.id) },
    });
  }
}
