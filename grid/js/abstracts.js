/** Override check(board) → boolean */
export class WinConditionStrategy {
  check(_board) { throw new Error('WinConditionStrategy.check() not implemented'); }
}

/** Override build(players, categories) → { cols, rows, valid } */
export class GridBuilderStrategy {
  build(_players, _categories) { throw new Error('GridBuilderStrategy.build() not implemented'); }
}

/** Override getAll() and get(key) */
export class PlayerRepository {
  getAll()  { throw new Error('PlayerRepository.getAll() not implemented'); }
  get(_key) { throw new Error('PlayerRepository.get() not implemented'); }
}

/** Override getPool() → category[] */
export class CategoryRepository {
  getPool() { throw new Error('CategoryRepository.getPool() not implemented'); }
}

/** Override normalize(raw) → string */
export class InputNormalizerStrategy {
  normalize(_raw) { throw new Error('InputNormalizerStrategy.normalize() not implemented'); }
}
