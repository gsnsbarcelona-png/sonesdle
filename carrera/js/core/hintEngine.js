/**
 * Compares a wrong guess with the target player. Returns plain data (no text),
 * so the renderer can translate it. It only uses what the player can already
 * see: the revealed career stages, and the position only once it was revealed.
 *
 * @param {import('../data/players.js').Player} guessed
 * @param {import('../data/players.js').Player} target
 * @param {number} revealedCount  career stages of the target visible now
 * @returns {{ sameRole: boolean, sharedTeam: string|null, debut: { cmp: 'later'|'earlier'|'same', year: number }|null }}
 */
export function compareGuess(guessed, target, revealedCount) {
  const visible = target.career.slice(0, revealedCount);
  const guessedTeams = guessed.career.map((c) => c.team.toLowerCase());
  const shared = visible.find((c) => guessedTeams.includes(c.team.toLowerCase()));

  const targetDebut  = parseInt(target.career[0]?.year);
  const guessedDebut = parseInt(guessed.career[0]?.year);
  let debut = null;
  if (!isNaN(targetDebut) && !isNaN(guessedDebut)) {
    const cmp = targetDebut > guessedDebut ? 'later' : targetDebut < guessedDebut ? 'earlier' : 'same';
    debut = { cmp, year: targetDebut };
  }

  return {
    sameRole:   guessed.position === target.position,
    sharedTeam: shared ? shared.team : null,
    debut,
  };
}
