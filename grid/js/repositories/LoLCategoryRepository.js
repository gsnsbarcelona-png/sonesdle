import { CategoryRepository } from '../abstracts.js';

/**
 * Deserializes JSON categories (which cannot store functions) by
 * reconstructing the `match` function from the `type` and `value` fields.
 *
 * JSON schema per category:
 *   { id, icon, main, sub, desc, type: "pos"|"nat"|"team"|"comp", value: string }
 */
export class LoLCategoryRepository extends CategoryRepository {
  constructor(rawCategories) {
    super();
    this._categories = rawCategories.map(cat => ({
      ...cat,
      match: this._buildMatcher(cat),
    }));
  }

  getPool() { return this._categories; }

  _buildMatcher({ type, value }) {
    switch (type) {
      case 'pos':  return p => p.pos.includes(value);
      case 'nat':  return p => p.nat === value;
      case 'team': return p => p.teams.includes(value);
      case 'comp': return p => p.comps.includes(value);
      default: throw new Error(`Unknown category type: "${type}"`);
    }
  }
}
