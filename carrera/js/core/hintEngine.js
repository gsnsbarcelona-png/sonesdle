import { PLAYERS } from '../data/players.js';

/**
 * Generates an automatic comparison hint between the guessed player
 * and the target player. Returns an HTML string.
 *
 * @param {string} guessedName
 * @param {import('../data/players.js').Player} target
 * @returns {string}
 */
export function generateAutoHint(guessedName, target) {
  const guessed = PLAYERS.find(
    (p) => p.name.toLowerCase() === guessedName.trim().toLowerCase()
  );

  if (!guessed) {
    return `"${guessedName}" no está en nuestra base de datos.`;
  }

  const hints = [];

  // Role comparison
  if (guessed.position === target.position) {
    hints.push(`mismo rol (<strong>${target.position}</strong>)`);
  } else {
    hints.push(`distinto rol (${guessed.position} vs ${target.position})`);
  }

  // Shared team
  const targetTeams  = target.career.map((c) => c.team.toLowerCase());
  const guessedTeams = guessed.career.map((c) => c.team.toLowerCase());
  const sharedKey    = targetTeams.find((t) => guessedTeams.includes(t));

  if (sharedKey) {
    const original = target.career.find(
      (c) => c.team.toLowerCase() === sharedKey
    ).team;
    hints.push(`ambos jugaron en <strong>${original}</strong>`);
  }

  // Debut year
  const targetDebut  = parseInt(target.career[0]?.year);
  const guessedDebut = parseInt(guessed.career[0]?.year);

  if (!isNaN(targetDebut) && !isNaN(guessedDebut)) {
    if (targetDebut > guessedDebut) {
      hints.push(`el jugador buscado debutó más tarde (<strong>${targetDebut}</strong>)`);
    } else if (targetDebut < guessedDebut) {
      hints.push(`el jugador buscado debutó antes (<strong>${targetDebut}</strong>)`);
    } else {
      hints.push(`debutaron el mismo año (<strong>${targetDebut}</strong>)`);
    }
  }

  return hints.join(' · ');
}
