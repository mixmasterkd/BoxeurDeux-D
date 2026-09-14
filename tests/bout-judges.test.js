import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeBout } from '../src/game/BoutJudges.js';
const round = (landed, received, extras = {}) => ({ stats: { landed, received, ...extras }, downs: { player: 0, remi: 0 } });
const mirror = history => history.map(entry => ({ ...entry, stats: {
  landed: entry.stats.received, received: entry.stats.landed,
  blocked: entry.stats.opponentBlocked, opponentBlocked: entry.stats.blocked,
  dodged: entry.stats.missed, missed: entry.stats.dodged,
}, downs: { player: entry.downs.remi, remi: entry.downs.player } }));

test('three close won rounds award 30–27 symmetrically', () => {
  const history = [round(12, 4), round(9, 6), round(7, 2)];
  assert.ok(judgeBout(history).cards.every(c => c.player === 30 && c.remi === 27));
  assert.ok(judgeBout(mirror(history)).cards.every(c => c.remi === 30 && c.player === 27));
});
test('clean sustained domination gives 10–8 or 10–7, not an aggregate-hit bout shortcut', () => {
  const result = judgeBout([round(15, 3), round(25, 0), round(4, 6)]);
  assert.deepEqual(result.cards[0].rounds.map(r => [r.player, r.remi]), [[10,8],[10,7],[9,10]]);
  assert.equal(result.winner, 'player');
});
test('a knockdown never automatically subtracts a point from an amateur round', () => {
  const history = [round(8, 3), round(5, 7), round(6, 4)];
  const expected = judgeBout(history);
  history[0].downs.remi = 1; history[1].downs = { player: 2, remi: 1 };
  assert.deepEqual(judgeBout(history), expected);
});
test('close technical rounds can split judges reproducibly, with no tied rounds', () => {
  const history = [round(2, 1, { missed: 6, blocked: 1 })];
  const decision = judgeBout(history);
  assert.equal(decision.kind, 'split'); assert.equal(decision.winner, 'player');
  assert.deepEqual(judgeBout(history), decision);
  assert.equal(judgeBout(mirror(history)).winner, 'remi');
  assert.ok(decision.cards.every(c => c.rounds.every(r => Math.max(r.player,r.remi) === 10 && r.player !== r.remi)));
});
test('tournaments have five cards while local bouts have three', () => {
  const history = [round(6, 3), round(4, 7), round(9, 6)];
  assert.equal(judgeBout(history).cards.length, 3);
  const decision = judgeBout(history, { judges: 5 });
  assert.equal(decision.cards.length, 5); assert.equal(decision.winner, 'player');
});
test('level totals are kept on the card and resolved by the technical criteria', () => {
  const decision = judgeBout([round(6,4), round(4,6)], { judges: 5 });
  assert.ok(decision.cards.every(c => c.player === 19 && c.remi === 19 && c.tiebreak));
  assert.ok(decision.cards.every(c => ['player','remi'].includes(c.winner)));
  assert.notEqual(decision.winner, 'draw');
});
test('exactly equal completed exchanges use actual first clean contact; neither actor gets a fixed tie privilege', () => {
  for (const firstClean of ['player','remi']) {
    const history = [round(4,4)]; history[0].judging = { firstClean };
    assert.equal(judgeBout(history).winner, firstClean);
  }
});
test('defending without scoring cannot defeat an opponent who lands a clean punch', () => {
  assert.ok(judgeBout([round(0,1,{blocked:90,dodged:90})]).cards.every(c => c.winner === 'remi'));
});
test('misses cannot improve a score, and judging never mutates round history', () => {
  const clean = [round(3,1,{missed:10000})]; const snapshot = structuredClone(clean);
  assert.ok(judgeBout(clean).cards.every(c => c.winner === 'player'));
  assert.deepEqual(clean,snapshot);
});
