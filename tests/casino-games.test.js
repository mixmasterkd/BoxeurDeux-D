import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInteger, shuffledDeck } from '../src/game/casino/CasinoRandom.js';
import { actBlackjack, blackjackActions, blackjackMaximumExposure, blackjackValue, createBlackjackGame, validateBlackjackGame } from '../src/game/casino/BlackjackGame.js';
import { createRouletteGame, rouletteMaximumExposure, roulettePayout, validateRouletteGame } from '../src/game/casino/RouletteGame.js';
import { createSlotsGame, getSlotMachine, SLOT_MACHINES, slotOutcomeAt, slotsMaximumExposure, validateSlotsGame } from '../src/game/casino/SlotsGame.js';

const card = rank => ({ rank: String(rank), suit: '♠' });
function round(player, dealer, deck, { bet = 2, bankroll = 100 } = {}) {
  const game = createBlackjackGame({ bet, bankroll, seed: 4 });
  game.status = 'playing'; game.dealerRevealed = false; game.payout = 0; game.profit = null;
  game.hands = [{ cards: player.map(card), bet, split: false, doubled: false, status: 'playing', result: null, payout: 0 }];
  game.dealer = dealer.map(card); game.deck = deck.map(card); game.activeHand = 0;
  return game;
}

// Card totals and casino rules are checked with intentional boundary hands,
// independent of the actual random deal used by production.
test('blackjack: aces soften only as needed', () => {
  assert.deepEqual(blackjackValue(['A', '6'].map(card)), { total: 17, soft: true });
  assert.deepEqual(blackjackValue(['A', 'A', '9'].map(card)), { total: 21, soft: true });
  assert.deepEqual(blackjackValue(['A', 'A', '9', 'K'].map(card)), { total: 21, soft: false });
});

test('blackjack: Karl stands on soft 17, ties refund stake, busts lose', () => {
  const game = round(['10', '7'], ['A', '6'], ['K']);
  const tie = actBlackjack(game, 'stand');
  assert.equal(tie.payout, 2); assert.equal(tie.hands[0].result, 'push'); assert.equal(tie.dealer.length, 2);
  assert.equal(game.status, 'playing', 'Actions do not mutate saved state.');
  const bust = actBlackjack(round(['10', '9'], ['2', '4'], ['5']), 'hit');
  assert.equal(bust.payout, 0); assert.equal(bust.hands[0].result, 'bust'); assert.equal(bust.dealer.length, 2);
});

test('blackjack: hit to 21 ends hand and dealer draws until 17', () => {
  const result = actBlackjack(round(['9', '7'], ['9', '3'], ['5', '4', '6']), 'hit');
  assert.equal(result.status, 'complete'); assert.equal(result.payout, 4);
  assert.deepEqual(result.dealer.map(item => item.rank), ['9', '3', '4', '6']);
});

test('blackjack: doubling takes one card, doubles stake, and requires enough cash', () => {
  const result = actBlackjack(round(['5', '6'], ['10', '7'], ['K']), 'double');
  assert.equal(result.totalBet, 4); assert.equal(result.payout, 8); assert.equal(result.hands[0].cards.length, 3);
  const poor = round(['5', '6'], ['10', '7'], ['K'], { bankroll: 3.5 });
  assert.deepEqual(blackjackActions(poor), ['hit', 'stand']);
  assert.throws(() => actBlackjack(poor, 'double'), RangeError);
});

test('blackjack: split creates two independently played hands, with doubles but no re-split', () => {
  let result = actBlackjack(round(['8', '8'], ['10', '7'], ['3', '2', 'K', 'A']), 'split');
  assert.equal(result.hands.length, 2); assert.equal(result.totalBet, 4);
  assert.equal(blackjackActions(result).includes('split'), false);
  result = actBlackjack(result, 'double');
  assert.equal(result.activeHand, 1); assert.equal(result.totalBet, 6);
  result = actBlackjack(result, 'double');
  assert.equal(result.status, 'complete'); assert.equal(result.totalBet, 8); assert.equal(result.payout, 16);
  assert.deepEqual(blackjackMaximumExposure(2), { maxStake: 8, maxNetWin: 8 });
});

test('blackjack: ten-valued pairs may split, split aces get one card and never 3:2', () => {
  assert.ok(blackjackActions(round(['J', 'K'], ['10', '7'], ['3', '2'])).includes('split'));
  const result = actBlackjack(round(['A', 'A'], ['10', '7'], ['K', '9']), 'split');
  assert.equal(result.status, 'complete'); assert.equal(result.payout, 8);
  assert.ok(result.hands.every(hand => hand.cards.length === 2 && hand.result === 'win'));
});

test('blackjack: initial natural receives 3:2 and dealer natural is checked before play', () => {
  let natural, dealerNatural, mutual;
  for (let seed = 0; seed < 3000 && !(natural && dealerNatural && mutual); seed += 1) {
    const game = createBlackjackGame({ bet: 1, seed });
    if (game.hands[0].result === 'blackjack') natural = game;
    if (blackjackValue(game.dealer).total === 21 && game.hands[0].result === 'lose') dealerNatural = game;
    if (game.hands[0].result === 'push' && game.hands[0].cards.length === 2 && blackjackValue(game.dealer).total === 21) mutual = game;
  }
  assert.equal(natural.payout, 2.5); assert.equal(natural.profit, 1.5);
  assert.equal(dealerNatural.status, 'complete'); assert.equal(dealerNatural.payout, 0);
  assert.equal(mutual.payout, 1); assert.deepEqual(blackjackActions(dealerNatural), []);
});

test('blackjack: reload reproduces remaining cards; wallet never influences deal', () => {
  const initial = createBlackjackGame({ bet: 2, bankroll: 50, seed: 124 });
  assert.equal(initial.status, 'playing');
  const saved = JSON.parse(JSON.stringify(initial));
  assert.deepEqual(actBlackjack(initial, 'stand'), actBlackjack(saved, 'stand'));
  const richer = createBlackjackGame({ bet: 2, bankroll: 500, seed: 124 });
  assert.deepEqual(initial.deck, richer.deck); assert.deepEqual(initial.hands, richer.hands); assert.deepEqual(initial.dealer, richer.dealer);
  assert.equal(validateBlackjackGame(initial), true);
  const finished = actBlackjack(initial, 'stand');
  assert.equal(validateBlackjackGame(JSON.parse(JSON.stringify(finished))), true);
  finished.payout += 100; assert.equal(validateBlackjackGame(finished), false);
  assert.equal(validateBlackjackGame(null), false);
});

test('blackjack: limits reject invalid opening stakes and insufficient funds', () => {
  for (const bet of [0, 0.5, 6, NaN, Infinity]) assert.throws(() => createBlackjackGame({ bet }));
  assert.throws(() => createBlackjackGame({ bet: 5, bankroll: 4 }));
  assert.throws(() => createBlackjackGame({ bankroll: 3.1 }));
});

test('roulette: zero wins straight zero and defeats every outside bet', () => {
  assert.equal(roulettePayout([{ type: 'number', value: 0, amount: 1 }], 0), 36);
  const outside = [{ type: 'color', value: 'red' }, { type: 'parity', value: 'even' }, { type: 'dozen', value: 1 }, { type: 'column', value: 1 }];
  assert.equal(roulettePayout(outside, 0), 0);
});

test('roulette: number, red, odd, dozen and column pay the stated returns', () => {
  const bets = [{ type: 'number', value: 1 }, { type: 'color', value: 'red' }, { type: 'parity', value: 'odd' }, { type: 'dozen', value: 1 }, { type: 'column', value: 1 }];
  assert.equal(roulettePayout(bets, 1), 46);
  assert.equal(roulettePayout([{ type: 'column', value: 3 }], 36), 3);
  assert.equal(roulettePayout([{ type: 'dozen', value: 2 }], 24), 3);
  assert.equal(roulettePayout([{ type: 'dozen', value: 2 }], 25), 0);
  assert.deepEqual(rouletteMaximumExposure(bets), { maxStake: 5, maxNetWin: 41 });
});

test('roulette: return is exactly 36/37 for each supported unit wager', () => {
  for (const bet of [{ type: 'number', value: 5 }, { type: 'color', value: 'black' }, { type: 'parity', value: 'even' }, { type: 'dozen', value: 3 }, { type: 'column', value: 2 }]) {
    const total = Array.from({ length: 37 }, (_, number) => roulettePayout([bet], number)).reduce((sum, n) => sum + n, 0);
    assert.equal(total, 36);
  }
});

test('roulette: maximum exposure accounts for mutually exclusive bets', () => {
  assert.deepEqual(rouletteMaximumExposure([{ type: 'color', value: 'red' }, { type: 'color', value: 'black' }]), { maxStake: 2, maxNetWin: 0 });
  assert.deepEqual(rouletteMaximumExposure([{ type: 'number', value: 0, amount: 5 }]), { maxStake: 5, maxNetWin: 175 });
});

test('roulette: malformed bets cannot slip past the five-dollar limit', () => {
  for (const bets of [[], [{ type: 'number', value: 37 }], [{ type: 'number', value: 1, amount: -1 }], [{ type: 'color', value: 'green' }], [{ type: 'color', value: 'red', amount: .5 }], [{ type: 'color', value: 'red', amount: 5 }, { type: 'color', value: 'black' }]]) {
    assert.throws(() => createRouletteGame({ bets }));
  }
});

test('roulette: exact seed replay rejects forged pocket, payout, and bets', () => {
  const game = createRouletteGame({ seed: 178 });
  assert.equal(validateRouletteGame(JSON.parse(JSON.stringify(game))), true);
  assert.deepEqual(game, createRouletteGame({ seed: 178 }));
  assert.equal(validateRouletteGame({ ...game, payout: 1000 }), false);
  assert.equal(validateRouletteGame({ ...game, number: (game.number + 1) % 37 }), false);
  assert.equal(validateRouletteGame({ ...game, bets: [] }), false);
});

for (const machine of SLOT_MACHINES) {
  test(`slots: ${machine.id} has exact advertised weighted payouts and return below 100%`, () => {
    let sum = 0;
    const frequencies = new Map();
    for (let ticket = 0; ticket < machine.totalWeight; ticket += 1) {
      const outcome = slotOutcomeAt(machine.id, ticket);
      sum += outcome.payout;
      frequencies.set(outcome.payout, (frequencies.get(outcome.payout) ?? 0) + 1);
    }
    assert.equal(machine.totalWeight, 10000);
    for (const outcome of machine.outcomes) assert.equal(frequencies.get(outcome.payout), outcome.weight);
    assert.equal(sum / machine.totalWeight, machine.rtp);
    assert.ok(machine.rtp > .8 && machine.rtp < 1);
    assert.ok(machine.maxPayout >= 25 && machine.maxPayout <= 50);
    assert.deepEqual(slotsMaximumExposure(machine.id), { maxStake: 1, maxNetWin: machine.maxPayout - 1 });
  });
}

test('slots: results persist deterministically and wrong machine/results are rejected', () => {
  const game = createSlotsGame({ machineId: 'diamants', seed: 512 });
  assert.equal(validateSlotsGame(JSON.parse(JSON.stringify(game))), true);
  assert.deepEqual(game, createSlotsGame({ machineId: 'diamants', seed: 512 }));
  assert.equal(validateSlotsGame({ ...game, payout: 500 }), false);
  assert.throws(() => getSlotMachine('unknown'));
  assert.throws(() => slotOutcomeAt('cerises', 10000));
  assert.throws(() => slotOutcomeAt('cerises', -1));
});

test('casino random: shuffled deck has all 52 unique cards and portable deterministic seed', () => {
  const first = shuffledDeck(123), second = shuffledDeck(123);
  assert.deepEqual(first, second); assert.equal(first.cards.length, 52);
  assert.equal(new Set(first.cards.map(card => card.rank + card.suit)).size, 52);
  assert.notDeepEqual(first.cards, shuffledDeck(first.seed).cards);
  for (let seed = 0; seed < 1000; seed += 1) {
    const draw = randomInteger(seed, 37);
    assert.ok(draw.value >= 0 && draw.value <= 36); assert.ok(Number.isInteger(draw.value));
  }
});
