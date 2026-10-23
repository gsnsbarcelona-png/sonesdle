import { today } from '../../../shared/auth.js';

const KEY          = 'dle_daily_v1';
const KEY_PROGRESS = 'dle_daily_progress_v1';
const KEY_SECRET   = 'dle_daily_secret_v1';

export class DailyService {
  /** Clave del día actual: 'YYYY-MM-DD' (UTC, igual que el resto de juegos). */
  static getTodayKey() {
    return today();
  }

  /**
   * Índice determinista basado en la fecha.
   * Mismo resultado para todos los usuarios el mismo día.
   */
  static getDailyIndex(playerCount) {
    const date = this.getTodayKey();
    let h = 0;
    for (const c of date) h = (Math.imul(31, h) + c.charCodeAt(0)) >>> 0;
    return h % playerCount;
  }

  /**
   * Nombre del secreto de hoy si ya está fijado (resultado guardado o secreto
   * fijado en la primera carga del día), para que una actualización de
   * players.json a mitad de día no lo cambie.
   */
  static getSecretName(day = this.getTodayKey()) {
    const res = this.#load();
    if (res?.date === day && res.secretName) return res.secretName;
    const pinned = this.#read(KEY_SECRET);
    return pinned?.date === day ? pinned.name : null;
  }

  static pinSecret(name, day = this.getTodayKey()) {
    this.#write(KEY_SECRET, { date: day, name });
  }

  /** Nombres de los intentos de hoy, en orden cronológico (partida en curso o terminada). */
  static getGuesses(day = this.getTodayKey()) {
    const res = this.#load();
    if (res?.date === day && Array.isArray(res.guesses)) return res.guesses;
    const prog = this.#read(KEY_PROGRESS);
    return prog?.date === day && Array.isArray(prog.guesses) ? prog.guesses : [];
  }

  static saveProgress(guesses, day = this.getTodayKey()) {
    this.#write(KEY_PROGRESS, { date: day, guesses });
  }

  static hasPlayedToday() {
    return this.#load()?.date === this.getTodayKey();
  }

  /**
   * Guarda el resultado de la partida diaria.
   * @param {{ secret: object, attempts: number, won: boolean, rows: string[][] }} data
   *   rows: array de filas, cada fila es array de status ('correct'|'partial'|'wrong')
   */
  static saveResult({ secret, attempts, won, rows, guesses = [], day = this.getTodayKey() }) {
    this.#write(KEY, {
      date: day,
      secretName: secret.name,
      attempts,
      won,
      rows,
      guesses,
    });
  }

  static getTodayResult() {
    const saved = this.#load();
    return saved?.date === this.getTodayKey() ? saved : null;
  }

  /**
   * Genera el texto para compartir en redes sociales.
   * @param {{ attempts: number, won: boolean, rows: string[][] }} result
   */
  static buildShareText(result) {
    const EMOJI = { correct: '🟩', partial: '🟧', wrong: '🟥' };
    const date  = this.getTodayKey().split('-').reverse().join('/');
    const title = result.won
      ? `DLE Games 🎮 ${date} — ${result.attempts} intento${result.attempts !== 1 ? 's' : ''}`
      : `DLE Games 🎮 ${date} — Me rendí`;

    const grid = result.rows
      .map(row => row.map(s => EMOJI[s] ?? '⬜').join(''))
      .join('\n');

    return `${title}\n\n${grid}\n\nlolprogames.com/dle`;
  }

  /** Segundos hasta la medianoche UTC (próximo reto). */
  static secondsUntilNext() {
    return 86400 - (Math.floor(Date.now() / 1000) % 86400);
  }

  static #load() { return this.#read(KEY); }

  static #read(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }

  static #write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado */ }
  }
}
