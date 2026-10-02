import { GridBuilderStrategy } from '../abstracts.js';

// Cruzar dos posiciones (Mid × Jungle) o dos nacionalidades no tiene sentido como pregunta
const NO_SELF_CROSS = new Set(['pos', 'nat']);

export class RandomGridBuilder extends GridBuilderStrategy {
  build(players, categories) {
    for (let i = 0; i < 300; i++) {
      const shuffled = this._shuffle(categories);
      const cols = shuffled.slice(0, 3);
      const rows = shuffled.slice(3, 6);
      if (rows.some(r => cols.some(c => r.type === c.type && NO_SELF_CROSS.has(r.type)))) continue;
      const valid = this._computeValid(cols, rows, players);
      if (valid.every(row => row.every(cell => cell.length >= 3)))
        return { cols, rows, valid };
    }
    // Guaranteed fallback
    const cols = categories.filter(c => ['t1','geng','fnatic'].includes(c.id));
    const rows = categories.filter(c => ['mid','adc','top'].includes(c.id));
    return { cols, rows, valid: this._computeValid(cols, rows, players) };
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _computeValid(cols, rows, players) {
    return rows.map(row =>
      cols.map(col =>
        players.filter(p => row.match(p) && col.match(p)).map(p => p.key)
      )
    );
  }
}
