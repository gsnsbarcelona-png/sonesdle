const KEY = 'dle_daily_v1';

export class DailyService {
  /** Clave del día actual: 'YYYY-MM-DD' */
  static getTodayKey() {
    return new Date().toISOString().slice(0, 10);
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

  static hasPlayedToday() {
    return this.#load()?.date === this.getTodayKey();
  }

  /**
   * Guarda el resultado de la partida diaria.
   * @param {{ secret: object, attempts: number, won: boolean, rows: string[][] }} data
   *   rows: array de filas, cada fila es array de status ('correct'|'partial'|'wrong')
   */
  static saveResult({ secret, attempts, won, rows }) {
    localStorage.setItem(KEY, JSON.stringify({
      date: this.getTodayKey(),
      secretName: secret.name,
      attempts,
      won,
      rows,
    }));
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

  /** Segundos hasta medianoche (próximo reto). */
  static secondsUntilNext() {
    const now  = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return Math.floor((next - now) / 1000);
  }

  static #load() {
    try { return JSON.parse(localStorage.getItem(KEY)); }
    catch { return null; }
  }
}
