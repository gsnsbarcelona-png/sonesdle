import { flagImg, esc } from '../utils/helpers.js';
import { t } from '../utils/i18n.js';

/** Iconos de trazo de las cabeceras (sin emojis). */
const ICONS = {
  globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  league: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/></svg>',
  pos: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>',
  award: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/></svg>',
  trophy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8"/></svg>',
  cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>'
};

const COLUMN_KEYS = [
  { key: 'colPlayer',   icon: '',    tip: 'tipPlayer',   hard: true  },
  { key: 'colCountry',  icon: ICONS.globe,  tip: 'tipCountry',  hard: true  },
  { key: 'colLeague',   icon: ICONS.league,  tip: 'tipLeague',   hard: false },
  { key: 'colPosition', icon: ICONS.pos,  tip: 'tipPosition', hard: true  },
  { key: 'colTitles',   icon: ICONS.award,  tip: 'tipTitles',   hard: true  },
  { key: 'colWorlds',   icon: ICONS.trophy,  tip: 'tipWorlds',   hard: true  },
  { key: 'colAge',      icon: ICONS.cal,  tip: 'tipAge',      hard: true  },
  { key: 'colTeam',     icon: ICONS.shield, tip: 'tipTeam',     hard: false },
];

const REVEAL_DELAY_MS = 130;

export class GridComponent {
  #headerEl;
  #listEl;
  #hardMode = false;

  /**
   * @param {{ headerEl: HTMLElement, listEl: HTMLElement }}
   */
  constructor({ headerEl, listEl }) {
    this.#headerEl = headerEl;
    this.#listEl   = listEl;
    this.refreshHeader();
  }

  setHardMode(val) {
    this.#hardMode = val;
    this.refreshHeader();
  }


  addRow(player, result) {
    const row = document.createElement('div');
    row.className = 'game-grid';
    if (this.#hardMode) row.dataset.hard = '';

    row.appendChild(this.#makeNameCell(player));

    const dataCells = [
      this.#makeCountryCell(player,  result.country),
      ...(this.#hardMode ? [] : [this.#makeLeagueCell(player, result.league)]),
      this.#makePositionCell(player, result.position),
      this.#makeTitlesCell(player,   result.titles),
      this.#makeWorldsCell(player,   result.worlds),
      this.#makeAgeCell(player,      result.age),
      ...(this.#hardMode ? [] : [this.#makeTeamCell(player, result.team)]),
    ];
    dataCells.forEach(cell => {
      const status = /cell-(correct|partial|wrong)/.exec(cell.className)?.[1];
      if (status) {   // el color no se lee con lector de pantalla: texto oculto con el estado
        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = t(`status_${status}`);
        cell.appendChild(sr);
      }
      row.appendChild(cell);
    });

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
    if (this.#hardMode) this.#headerEl.dataset.hard = '';
    else delete this.#headerEl.dataset.hard;

    const cols = this.#hardMode ? COLUMN_KEYS.filter(c => c.hard !== false) : COLUMN_KEYS;
    this.#headerEl.innerHTML = cols.map(col => `
      <div class="col-header col-tip" data-tip="${t(col.tip)}">
        ${col.icon ? `<span class="col-icon">${col.icon}</span>` : ''}
        <span class="col-label">${t(col.key)}</span>
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
    // Flecha a la derecha del número, en la misma línea
    const age = p.age == null ? '?' : `${p.ageApprox ? '~' : ''}${p.age}`;
    // "?" (sin dato) y "~" (solo se sabe el año) se explican al pasar por encima
    const tip = p.age == null ? t('ageUnknown') : p.ageApprox ? t('ageApprox') : null;
    if (tip) {
      d.classList.add('col-tip');
      d.dataset.tip = tip;
    }
    d.innerHTML = `<div class="cell-main">${age}${arrow ? `<span class="cell-arrow">${arrow}</span>` : ''}</div>`;
    return d;
  }

  #makeTeamCell(p, status) {
    const d = this.#baseCell(status);
    // Agente libre reciente: se compara con su último equipo
    const tag = p.freeAgent ? `<div class="cell-tag" title="${esc(t('freeAgentTip'))}">FA</div>` : '';
    d.innerHTML = `<div class="cell-text">${esc(p.team)}</div>${tag}`;
    return d;
  }

  /** @param {'correct'|'partial'|'wrong'} status */
  #baseCell(status) {
    const d = document.createElement('div');
    d.className = `cell cell-${status}`;
    return d;
  }
}
