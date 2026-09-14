// Game adaptation of the amateur ten-point-must system. Knockdowns inform
// stoppages in the engine; they are never automatic point deductions here.
const n = value => Number.isFinite(value) ? Math.max(0, value) : 0;
const sign = value => Math.abs(value) < 1e-9 ? 0 : Math.sign(value);
const actor = edge => edge > 0 ? 'player' : 'remi';

function criteria(round = {}) {
  const s = round.stats ?? {}, landed = n(s.landed), received = n(s.received);
  const clean = landed - received;
  const accuracy = landed / Math.max(1, landed + n(s.opponentBlocked) + n(s.missed))
    - received / Math.max(1, received + n(s.blocked) + n(s.dodged));
  const defence = (n(s.dodged) + n(s.blocked) * .5 - n(s.missed) - n(s.opponentBlocked) * .5)
    / Math.max(1, landed + received, n(s.dodged) + n(s.blocked), n(s.missed) + n(s.opponentBlocked));
  const quality = n(round.judging?.quality?.player) - n(round.judging?.quality?.remi);
  // Completed clean hits are primary. Defence/accuracy distinguish close
  // exchanges and cannot outweigh a margin of two clean punches.
  const edges = (!landed || !received || Math.abs(clean) >= 2)
    ? Array(5).fill(clean)
    : [clean, clean + accuracy * 1.2, clean + defence * 1.2,
      clean + accuracy * .6 + defence * .6, clean + Math.tanh(quality / 4) * 1.2];
  return { edges, clean, accuracy, defence, quality, landed, received };
}

function tieEdge(round, c, roundIndex, judge) {
  for (const value of [c.clean, c.quality, c.accuracy, c.defence]) if (sign(value)) return sign(value);
  // Chronology is saved with the actual contacts. Equal totals favour the
  // boxer who established the clean scoring, then the first committed attack.
  const initiative = round.judging?.firstClean ?? round.judging?.initiative;
  if (initiative === 'player' || initiative === 'remi') return initiative === 'player' ? 1 : -1;
  // Only legacy/empty fixture rounds can reach this exact symmetry. Rotate the
  // designated tie corner by round/judge instead of favouring the human boxer.
  const corner = round.judging?.tieCorner === 'player' ? 1 : -1;
  return (roundIndex + judge) % 2 ? -corner : corner;
}

export function judgeBout(roundHistory = [], { judges = 3 } = {}) {
  const count = judges === 5 ? 5 : 3;
  const cards = Array.from({ length: count }, (_, index) => ({ name: `Juge ${index + 1}`, player: 0, remi: 0, winner: null, rounds: [] }));
  for (const [index, round] of roundHistory.entries()) {
    const c = criteria(round);
    for (const [judge, card] of cards.entries()) {
      const edge = sign(c.edges[judge]) || tieEdge(round, c, index, judge);
      const difference = Math.abs(c.clean), total = c.landed + c.received;
      // A broad, sustained clean-punch superiority produces 10–8/10–7;
      // a single flash knockdown in an otherwise close round remains 10–9.
      const loserScore = difference >= 18 && difference / Math.max(1, total) >= .70 ? 7
        : difference >= 10 && difference / Math.max(1, total) >= .50 ? 8 : 9;
      const player = edge > 0 ? 10 : loserScore, remi = edge < 0 ? 10 : loserScore;
      card.rounds.push({ round: round.round ?? index + 1, player, remi });
      card.player += player; card.remi += remi;
    }
  }
  for (const [judge, card] of cards.entries()) {
    let edge = sign(card.player - card.remi);
    if (!edge) {
      // A level total (for example 28–28) is resolved by whole-bout quality,
      // then the same ordered technical criteria. The printed totals stay true.
      const aggregate = roundHistory.reduce((out, round) => {
        const c = criteria(round);
        for (const key of ['clean', 'quality', 'accuracy', 'defence']) out[key] += c[key];
        return out;
      }, { clean: 0, quality: 0, accuracy: 0, defence: 0 });
      edge = tieEdge(roundHistory.find(r => r.judging?.firstClean) ?? roundHistory[0] ?? {}, aggregate, 0, judge);
      card.tiebreak = true;
    }
    card.winner = actor(edge);
  }
  const playerCards = cards.filter(card => card.winner === 'player').length;
  const winner = playerCards > count / 2 ? 'player' : 'remi';
  return { winner, kind: cards.every(card => card.winner === winner) ? 'unanimous' : 'split', cards };
}
