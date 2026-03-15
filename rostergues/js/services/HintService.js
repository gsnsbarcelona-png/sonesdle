const POSITION_ORDER = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

export function getHintTarget(players, solvedSlots) {
  return players
    .slice()
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
    .find(p => !solvedSlots.has(p.position)) ?? null;
}

export function getMaskedName(player, revealedCount) {
  if (revealedCount === 0) return null;
  const name     = player.name;
  const revealed = name.slice(0, revealedCount);
  return revealedCount >= name.length ? revealed : `${revealed}...`;
}

export function nextRevealIn(wrongCount, hintsEvery) {
  return hintsEvery - (wrongCount % hintsEvery);
}
