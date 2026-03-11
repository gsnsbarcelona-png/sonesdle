import { GridBuilderStrategy } from '../abstracts.js';

export class RandomGridBuilder extends GridBuilderStrategy {
  build(players, categories) {
    for (let i = 0; i < 40; i++) {
      const shuffled = [...categories].sort(() => Math.random() - .5);
      const cols = shuffled.slice(0, 3);
      const rows = shuffled.slice(3, 6);
      const valid = this._computeValid(cols, rows, players);
      if (valid.every(row => row.every(cell => cell.length >= 3)))
        return { cols, rows, valid };
    }
    // Guaranteed fallback
    const cols = categories.filter(c => ['t1','geng','fnatic'].includes(c.id));
    const rows = categories.filter(c => ['mid','adc','top'].includes(c.id));
    return { cols, rows, valid: this._computeValid(cols, rows, players) };
  }

  _computeValid(cols, rows, players) {
    return rows.map(row =>
      cols.map(col =>
        players.filter(p => row.match(p) && col.match(p)).map(p => p.key)
      )
    );
  }
}
