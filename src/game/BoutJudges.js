// Deliberately simplified game scoring, not a simulation of federation rules.
// Every round is worth 10 points before knockdown deductions. Clean contacts
// decide clear rounds; precision and defence only distinguish very close ones.
const number = value => Number.isFinite(value) ? Math.max(0, value) : 0;
const sign = value => Math.abs(value) < 1e-9 ? 0 : Math.sign(value);
const winnerOf = (player, remi) => player > remi ? 'player' : remi > player ? 'remi' : 'draw';

function criteria({ stats = {} }) {
  const landed = number(stats.landed);
  const received = number(stats.received);
  const clean = landed - received;
  // An empty round, or exclusively defending without landing, earns no edge.
  if (!landed || !received || Math.abs(clean) >= 2) return [clean, clean, clean];

  const blocked = number(stats.blocked);
  const dodged = number(stats.dodged);
  const opponentBlocked = number(stats.opponentBlocked);
  const missed = number(stats.missed);
  // Use resolved attacks, not "thrown": a punch still in flight at the bell
  // must not lower accuracy. A miss or a blocked punch never earns points.
  const precision = landed / (landed + opponentBlocked + missed)
    - received / (received + blocked + dodged);
  const playerDefence = dodged + blocked * 0.5;
  const opponentDefence = missed + opponentBlocked * 0.5;
  const defence = (playerDefence - opponentDefence)
    / Math.max(1, landed + received, playerDefence + opponentDefence);
  // Both secondary criteria are bounded to ±1.2 contacts. Two extra clean
  // contacts therefore outweigh any amount of defence or accuracy advantage.
  return [clean, clean + precision * 1.2, clean + defence * 1.2];
}

/**
 * Three reproducible cards based solely on completed round events.
 * Judge 1 values clean contacts, 2 precision, 3 successful defence. Each gives
 * 10–9 for a won round or 10–10 for an even one, then deducts one point per
 * knockdown from the boxer who went down. Winning a bout requires two cards.
 * No random tie-break, damage bonus, button-reading or aggregate-hit shortcut.
 */
export function judgeBout(roundHistory = []) {
  const cards = [0, 1, 2].map(index => ({
    name: `Juge ${index + 1}`, player: 0, remi: 0, winner: 'draw', rounds: [],
  }));
  for (const [index, round] of roundHistory.entries()) {
    const scores = criteria(round);
    for (const [judge, card] of cards.entries()) {
      const edge = sign(scores[judge]);
      const player = Math.max(0, (edge < 0 ? 9 : 10) - Math.floor(number(round.downs?.player)));
      const remi = Math.max(0, (edge > 0 ? 9 : 10) - Math.floor(number(round.downs?.remi)));
      card.rounds.push({ round: round.round ?? index + 1, player, remi });
      card.player += player;
      card.remi += remi;
    }
  }
  for (const card of cards) card.winner = winnerOf(card.player, card.remi);
  const playerCards = cards.filter(card => card.winner === 'player').length;
  const remiCards = cards.filter(card => card.winner === 'remi').length;
  const winner = playerCards >= 2 ? 'player' : remiCards >= 2 ? 'remi' : 'draw';
  const winningCards = winner === 'player' ? playerCards : remiCards;
  const kind = winner === 'draw' ? 'draw' : winningCards === 3 ? 'unanimous'
    : cards.some(card => card.winner === 'draw') ? 'majority' : 'split';
  return { winner, kind, cards };
}
