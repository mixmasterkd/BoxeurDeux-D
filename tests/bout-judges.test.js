import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeBout } from '../src/game/BoutJudges.js';

const round = (landed, received, extras = {}) => ({
  stats: { landed, received, ...extras }, downs: { player: 0, remi: 0 },
});
const mirror = history => history.map(entry => ({
  ...entry,
  stats: {
    landed: entry.stats.received, received: entry.stats.landed,
    blocked: entry.stats.opponentBlocked, opponentBlocked: entry.stats.blocked,
    dodged: entry.stats.missed, missed: entry.stats.dodged,
  },
  downs: { player: entry.downs.remi, remi: entry.downs.player },
}));

test('three clearly won rounds award an unanimous 30–27 to either boxer', () => {
  const history = [round(12, 4), round(9, 6), round(7, 2)];
  const result = judgeBout(history);
  assert.equal(result.winner, 'player');
  assert.equal(result.kind, 'unanimous');
  assert.ok(result.cards.every(card => card.player === 30 && card.remi === 27));
  const reversed = judgeBout(mirror(history));
  assert.equal(reversed.winner, 'remi');
  assert.ok(reversed.cards.every(card => card.remi === 30 && card.player === 27));
});

test('two narrow rounds outweigh a third round with many more clean hits', () => {
  const result = judgeBout([round(4, 2), round(5, 3), round(0, 25)]);
  assert.equal(result.winner, 'player');
  assert.ok(result.cards.every(card => card.player === 29 && card.remi === 28));
});

test('knockdowns are deductions from the boxer who fell, including both falling', () => {
  const first = round(8, 3);
  first.downs.remi = 1;
  const second = round(4, 4);
  second.downs = { player: 1, remi: 1 };
  const result = judgeBout([first, second]);
  assert.deepEqual(result.cards[0].rounds, [
    { round: 1, player: 10, remi: 8 }, { round: 2, player: 9, remi: 9 },
  ]);
  assert.equal(judgeBout(mirror([first, second])).winner, 'remi');
});

test('empty, inactive and purely defensive rounds do not invent a winner', () => {
  assert.equal(judgeBout().winner, 'draw');
  const result = judgeBout([round(0, 0, { blocked: 40, dodged: 50, thrown: 90 })]);
  assert.equal(result.kind, 'draw');
  assert.ok(result.cards.every(card => card.player === 10 && card.remi === 10));
  const passive = judgeBout([round(0, 1, { blocked: 90, dodged: 90 })]);
  assert.equal(passive.winner, 'remi');
  assert.ok(passive.cards.every(card => card.winner === 'remi'));
});

test('a close, inaccurate round can split judges without randomness', () => {
  const history = [round(2, 1, { missed: 6, blocked: 1 })];
  const result = judgeBout(history);
  assert.equal(result.kind, 'split');
  assert.equal(result.winner, 'player');
  assert.deepEqual(result.cards.map(card => card.winner), ['player', 'player', 'remi']);
  assert.deepEqual(judgeBout(history), result);
  assert.equal(judgeBout(mirror(history)).winner, 'remi');
});

test('a majority decision requires two winning cards and one even card', () => {
  const result = judgeBout([
    round(2, 1, { missed: 6, blocked: 1 }),
    round(5, 3),
  ]);
  assert.equal(result.winner, 'player');
  assert.equal(result.kind, 'majority');
  assert.deepEqual(result.cards.map(card => card.winner), ['player', 'player', 'draw']);
});

test('extra clean hits beat huge defensive advantages; misses never improve a card', () => {
  const clear = judgeBout([round(3, 1, { missed: 10000 })]);
  assert.ok(clear.cards.every(card => card.winner === 'player'));
  const accurate = judgeBout([round(2, 1)]);
  const spam = judgeBout([round(2, 1, { missed: 100, thrown: 10000 })]);
  assert.ok(spam.cards.every((card, i) => card.player - card.remi
    <= accurate.cards[i].player - accurate.cards[i].remi));
  assert.deepEqual(judgeBout([round(2, 1, { thrown: 10000 })]), accurate);
});

test('judging leaves round history intact and remains symmetric with defences and falls', () => {
  const history = [round(5, 5, { blocked: 3, dodged: 2, opponentBlocked: 7, missed: 1 }),
    round(9, 7), round(2, 1, { missed: 6, blocked: 1 })];
  history[1].downs.player = 1;
  const before = structuredClone(history);
  const result = judgeBout(history);
  const reversed = judgeBout(mirror(history));
  assert.deepEqual(history, before);
  for (let i = 0; i < 3; i++) {
    assert.equal(result.cards[i].player, reversed.cards[i].remi);
    assert.equal(result.cards[i].remi, reversed.cards[i].player);
  }
});
