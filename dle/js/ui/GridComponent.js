import { flagImg, esc } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

const COLUMN_KEYS = [
  { key: 'colPlayer',   icon: '',    tip: 'tipPlayer'   },
  { key: 'colCountry',  icon: '🌍',  tip: 'tipCountry'  },
  { key: 'colLeague',   icon: '🏅',  tip: 'tipLeague'   },
  { key: 'colPosition', icon: '🎮',  tip: 'tipPosition' },
  { key: 'colTitles',   icon: '🏅',  tip: 'tipTitles'   },
  { key: 'colWorlds',   icon: '🏆',  tip: 'tipWorlds'   },
  { key: 'colAge',      icon: '📅',  tip: 'tipAge'      },
  { key: 'colTeam',     icon: '🛡️', tip: 'tipTeam'     },
];

const REVEAL_DELAY_MS = 130;

export class GridComponent {
  #headerEl;
  #listEl;

  /**
   * @param {{ headerEl: HTMLElement, listEl: HTMLElement }}
   */
  constructor({ headerEl, listEl }) {
    this.#headerEl = headerEl;
    this.#listEl   = listEl;
    this.refreshHeader();
  }


  addRow(player, result) {
    const row = document.createElement('div');
    row.className = 'game-grid';

    row.appendChild(this.#makeNameCell(player));

    const dataCells = [
      this.#makeCountryCell(player,  result.country),
      this.#makeLeagueCell(player,   result.league),
      this.#makePositionCell(player, result.position),
      this.#makeTitlesCell(player,  result.titles),
      this.#makeWorldsCell(player,   result.worlds),
      this.#makeAgeCell(player,      result.age),
      this.#makeTeamCell(player,     result.team),
    ];
    dataCells.forEach(cell => row.appendChild(cell));

    // Filas mas recientes arriba (igual que Wordle / DLE Games original)
    this.#listEl.insertBefore(row, this.#listEl.firstChild);

    // Flip escalonado
    dataCells.forEach((cell, i) => {
      setTimeout(() => cell.classList.add('cell-revealed'), i * REVEAL_DELAY_MS);
    });
  }

  /** Limpia todas las filas. */
  clear() {
    this.#listEl.innerHTML = '';
  }


  refreshHeader() {
    this.#headerEl.className = 'game-grid mb-1';
    this.#headerEl.innerHTML = COLUMN_KEYS.map(col => `
      <div class="col-header col-tip" data-tip="${t(col.tip)}">
        ${col.icon ? `<span class="col-icon">${col.icon}</span>` : ''}
        <span>${t(col.key)}</span>
      </div>
    `).join('');
  }

  #makeNameCell(p) {
    const d = document.createElement('div');
    d.className = 'cell cell-name';
    d.textContent = p.name;
    return d;
  }

  #makeCountryCell(p, status) {
    const d = this.#baseCell(status);
    d.innerHTML = `<div class="cell-flag">${flagImg(p.flag)}</div><div class="cell-text">${esc(p.country)}</div>`;
    return d;
  }

  #makeLeagueCell(p, status) {
    const d = this.#baseCell(status);
    d.innerHTML = `<div class="cell-main">${esc(p.league)}</div>`;
    return d;
  }

  #makePositionCell(p, status) {
    const d = this.#baseCell(status);
    d.innerHTML = `<div class="cell-main">${esc(p.position.join('/'))}</div>`;
    return d;
  }

  #makeTitlesCell(p, status) {
    const d = this.#baseCell(status);
    d.innerHTML = `<div class="cell-main">${p.titles ? t('yes') : t('no')}</div>`;
    return d;
  }

  #makeWorldsCell(p, status) {
    const d = this.#baseCell(status);
    d.innerHTML = `<div class="cell-main">${p.worlds ? t('yes') : t('no')}</div>`;
    return d;
  }

  #makeAgeCell(p, ageResult) {
    const d = this.#baseCell(ageResult.status);
    const arrow = ageResult.arrow === 'up' ? '↑' : ageResult.arrow === 'down' ? '↓' : '';
    d.innerHTML = `<div class="cell-main">${p.age}</div>${arrow ? `<div class="cell-arrow">${arrow}</div>` : ''}`;
    return d;
  }

  #makeTeamCell(p, status) {
    const d = this.#baseCell(status);
    d.innerHTML = `<div class="cell-text">${esc(p.team)}</div>`;
    return d;
  }

  /** @param {'correct'|'partial'|'wrong'} status */
  #baseCell(status) {
    const d = document.createElement('div');
    d.className = `cell cell-${status}`;
    return d;
  }
}
