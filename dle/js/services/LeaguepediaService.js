/**
 * LeaguepediaService — consume la API publica de lol.fandom.com (Cargo API).
 * Endpoint base: https://lol.fandom.com/api.php
 */

const BASE_URL = 'https://lol.fandom.com/api.php';

/** Mapa de pais (ingles, formato API) a emoji de bandera */
const COUNTRY_FLAGS = {
  'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿',
  'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
  'Belarus': '🇧🇾', 'Belgium': '🇧🇪', 'Bolivia': '🇧🇴',
  'Bosnia and Herzegovina': '🇧🇦', 'Brazil': '🇧🇷', 'Bulgaria': '🇧🇬',
  'Canada': '🇨🇦', 'Chile': '🇨🇱', 'China': '🇨🇳',
  'Colombia': '🇨🇴', 'Croatia': '🇭🇷', 'Czech Republic': '🇨🇿',
  'Denmark': '🇩🇰', 'Estonia': '🇪🇪', 'Finland': '🇫🇮',
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Greece': '🇬🇷',
  'Hong Kong': '🇭🇰', 'Hungary': '🇭🇺', 'Iceland': '🇮🇸',
  'Indonesia': '🇮🇩', 'Israel': '🇮🇱', 'Italy': '🇮🇹',
  'Japan': '🇯🇵', 'Kazakhstan': '🇰🇿', 'Latvia': '🇱🇻',
  'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺', 'Malaysia': '🇲🇾',
  'Mexico': '🇲🇽', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿',
  'Norway': '🇳🇴', 'Philippines': '🇵🇭', 'Poland': '🇵🇱',
  'Portugal': '🇵🇹', 'Romania': '🇷🇴', 'Russia': '🇷🇺',
  'Serbia': '🇷🇸', 'Singapore': '🇸🇬', 'Slovakia': '🇸🇰',
  'Slovenia': '🇸🇮', 'South Korea': '🇰🇷', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Taiwan': '🇹🇼',
  'Thailand': '🇹🇭', 'Turkey': '🇹🇷', 'Ukraine': '🇺🇦',
  'United Kingdom': '🇬🇧', 'United States': '🇺🇸', 'Venezuela': '🇻🇪',
  'Vietnam': '🇻🇳',
};

/** Mapa de Residency (API) a nombre de liga */
const RESIDENCY_TO_LEAGUE = {
  'Korea':               'LCK',
  'China':               'LPL',
  'Europe':              'LEC',
  'EMEA':                'LEC',
  'North America':       'LCS',
  'Vietnam':             'VCS',
  'Pacific':             'PCS',
  'Brazil':              'CBLOL',
  'Japan':               'LJL',
  'Latin America North': 'LLA',
  'Latin America South': 'LLA',
  'Turkey':              'TCL',
  'CIS':                 'LCL',
  'Oceania':             'LCO',
};

/**
 * Calcula la edad en anios a partir de una fecha de nacimiento (YYYY-MM-DD).
 * @param {string} birthdate
 * @returns {number|null}
 */
function calculateAge(birthdate) {
  if (!birthdate) return null;
  const born = new Date(birthdate);
  if (isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
  return age;
}

export class LeaguepediaService {
  /**
   * Ejecuta una cargoquery contra la API de Leaguepedia.
   * @param {Record<string, string>} params
   * @returns {Promise<object[]>}
   */
  async #query(params) {
    const url = new URL(BASE_URL);
    url.search = new URLSearchParams({
      action: 'cargoquery',
      format: 'json',
      origin: '*',
      ...params,
    }).toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Leaguepedia API: HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Leaguepedia: ${data.error.info}`);
    return (data.cargoquery ?? []).map(e => e.title);
  }

  /** Parsea un campo de lista de IDs separados por coma. */
  #parseIds(raw) {
    return (raw ?? '').split(',').map(s => s.trim()).filter(Boolean);
  }

  /**
   * Obtiene jugadores (activos y retirados) que tengan rol y fecha de nacimiento.
   * Deduplica por ID: si hay dos entradas con el mismo ID, prioriza la no retirada.
   * @returns {Promise<object[]>}
   */
  async fetchPlayers() {
    const rows = await this.#query({
      tables: 'Players',
      fields: 'ID,Name,Country,Role,Team,Residency,Birthdate,IsRetired,Image',
      where:  `Role IS NOT NULL AND Role != "" AND Birthdate IS NOT NULL AND Birthdate != ""`,
      limit:  '500',
    });

    // Deduplica por ID priorizando el jugador activo (IsRetired="0")
    const byId = new Map();
    for (const p of rows) {
      const existing = byId.get(p.ID);
      if (!existing) {
        byId.set(p.ID, p);
      } else {
        // Si el existente esta retirado y el nuevo no, reemplazar
        if (existing.IsRetired === '1' && p.IsRetired !== '1') {
          byId.set(p.ID, p);
        }
      }
    }
    return [...byId.values()];
  }

  /**
   * Obtiene el conjunto de IDs de jugadores que han participado en Worlds.
   * @returns {Promise<Set<string>>}
   */
  async fetchWorldsParticipants() {
    try {
      const rows = await this.#query({
        tables:  'Tournaments,TournamentRosters',
        join_on: 'Tournaments.OverviewPage=TournamentRosters.OverviewPage',
        fields:  'TournamentRosters.Players',
        where:   'Tournaments.League="World Championship"',
        limit:   '500',
      });
      const ids = new Set();
      for (const row of rows) this.#parseIds(row['Players']).forEach(id => ids.add(id));
      return ids;
    } catch (err) {
      console.warn('[LeaguepediaService] fetchWorldsParticipants fallo:', err.message);
      return new Set();
    }
  }

  /**
   * Obtiene un mapa de ID de jugador → numero de titulos regionales ganados.
   * Cuenta las apariciones en rosters ganadores de ligas regionales.
   * @returns {Promise<Map<string, number>>}
   */
  async fetchRegionalTitles() {
    try {
      const rows = await this.#query({
        tables:  'Tournaments,TournamentRosters',
        join_on: 'Tournaments.OverviewPage=TournamentRosters.OverviewPage,Tournaments.Winner=TournamentRosters.Team',
        fields:  'TournamentRosters.Players',
        where:   `Tournaments.IsQualifier="0" AND Tournaments.League IN ("LCK","LPL","LEC","LCS","VCS","CBLOL","LJL","LLA","TCL","LCO","PCS","LCL")`,
        limit:   '500',
      });
      const titlesMap = new Map();
      for (const row of rows) {
        this.#parseIds(row['Players']).forEach(id =>
          titlesMap.set(id, (titlesMap.get(id) ?? 0) + 1)
        );
      }
      return titlesMap;
    } catch (err) {
      console.warn('[LeaguepediaService] fetchRegionalTitles fallo:', err.message);
      return new Map();
    }
  }

  /**
   * Transforma un registro de la API al formato del Player entity.
   * Devuelve null si faltan datos esenciales (rol, edad valida).
   * @param {object} apiPlayer
   * @param {Set<string>} worldsSet
   * @param {Map<string, number>} titlesMap
   * @returns {object|null}
   */
  mapToPlayerData(apiPlayer, worldsSet, titlesMap) {
    const age = calculateAge(apiPlayer.Birthdate);
    if (!age || age < 16 || age > 50) return null;
    if (!apiPlayer.Role) return null;

    const imageFile = apiPlayer.Image?.trim();
    return {
      name:     apiPlayer.ID,
      real:     apiPlayer.Name || apiPlayer.ID,
      country:  apiPlayer.Country || 'Unknown',
      flag:     COUNTRY_FLAGS[apiPlayer.Country] ?? '🌍',
      league:   RESIDENCY_TO_LEAGUE[apiPlayer.Residency] ?? apiPlayer.Residency ?? 'Otra',
      position: [apiPlayer.Role],
      titles:   (titlesMap.get(apiPlayer.ID) ?? 0) > 0,
      worlds:   worldsSet.has(apiPlayer.ID),
      age,
      team:     apiPlayer.Team || (apiPlayer.IsRetired === '1' ? 'Retirado' : 'Sin equipo'),
      image:    imageFile ? `https://lol.fandom.com/wiki/Special:FilePath/${encodeURIComponent(imageFile)}` : null,
    };
  }
}
