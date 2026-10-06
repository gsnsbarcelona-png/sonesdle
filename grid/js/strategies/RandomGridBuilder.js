import { GridBuilderStrategy } from '../abstracts.js';

// Cruzar dos posiciones (Mid × Jungle) o dos nacionalidades no tiene sentido como pregunta
const NO_SELF_CROSS = new Set(['pos', 'nat']);
// Cruce regalado: casi todo el grupo pequeño cumple el otro (T1 × LCK, Coreano × Gen.G...)
const MAX_OVERLAP = 0.9;

export class RandomGridBuilder extends GridBuilderStrategy {
  build(players, categories) {
    const members = new Map(categories.map(c => [c.id, new Set(players.filter(c.match).map(p => p.key))]));
    const trivial = (a, b) => {
      const [small, big] = [members.get(a.id), members.get(b.id)].sort((x, y) => x.size - y.size);
      let both = 0;
      for (const k of small) if (big.has(k)) both++;
      return both >= MAX_OVERLAP * small.size;
    };
    for (let i = 0; i < 300; i++) {
      const shuffled = this._shuffle(categories);
      const cols = shuffled.slice(0, 3);
      const rows = shuffled.slice(3, 6);
      if (rows.some(r => cols.some(c => (r.type === c.type && NO_SELF_CROSS.has(r.type)) || trivial(r, c)))) continue;
      const valid = this._computeValid(cols, rows, players);
      if (valid.every(row => row.every(cell => cell.length >= 3)))
        return { cols, rows, valid };
    }
    // Guaranteed fallback
    const cols = categories.filter(c => ['t1','geng','fnatic'].includes(c.id));
    const rows = categories.filter(c => ['mid','adc','top'].includes(c.id));
    return { cols, rows, valid: this._computeValid(cols, rows, players) };
  }

  /** Tablero con categorías ya elegidas (reto diario de schedule.json). */
  fromIds(players, categories, colIds, rowIds) {
    const byId = new Map(categories.map(c => [c.id, c]));
    const cols = colIds.map(id => byId.get(id));
    const rows = rowIds.map(id => byId.get(id));
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
