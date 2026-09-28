import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPokerGame, pokerActions, actPoker, advancePokerBots, pokerPublicState,
  evaluatePokerHand, comparePokerHands, pokerBotView, validatePokerGame, cardLabel,
} from '../src/game/casino/PokerGame.js';

const clone = value => JSON.parse(JSON.stringify(value));
const suits = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const cards = text => text.split(' ').map(value => ({ rank: ({ A: 14, K: 13, Q: 12, J: 11, T: 10 })[value[0]] || Number(value.slice(0, -1)), suit: suits[value.at(-1)] }));
const totalChips = state => state.pot + state.players.reduce((total, player) => total + player.stack, 0);
const checkOrCall = state => actPoker(state, { type: pokerActions(state).check ? 'check' : 'call' });

function riverFixture({ board, hands, committed, stacks, folded = [], button = 0, turn = 0, currentBet = 0, streetBets, pending }) {
  const state = createPokerGame({ buyIn: 20, seed: 123, button });
  state.street = 'river'; state.board = cards(board); state.currentBet = currentBet; state.turn = turn;
  state.actedAtBet = [null, null, null, null];
  state.players.forEach((player, i) => {
    player.cards = cards(hands[i]); player.committed = committed[i]; player.stack = stacks[i];
    player.streetBet = streetBets?.[i] || 0; player.folded = folded.includes(i); player.allIn = player.stack === 0;
  });
  state.pot = committed.reduce((a, b) => a + b, 0);
  state.pending = pending || state.players.map((player, i) => !player.folded && player.stack ? i : -1).filter(i => i >= 0);
  return state;
}

test('four-player setup deals a deterministic fair deck, blinds 1/2 and the correct first seat', () => {
  const first = createPokerGame({ buyIn: 10, seed: 123 });
  assert.deepEqual(first, createPokerGame({ buyIn: 10, seed: 123 }));
  assert.notDeepEqual(first.deck, createPokerGame({ buyIn: 10, seed: 124 }).deck);
  assert.deepEqual(first.deck, createPokerGame({ buyIn: 20, seed: 123 }).deck);
  assert.equal(new Set(first.deck.map(cardLabel)).size, 52);
  assert.deepEqual(first.players.map(player => player.cards.length), [2, 2, 2, 2]);
  assert.deepEqual(first.players.map(player => player.stack), [10, 9, 8, 10]);
  assert.equal(first.pot, 3); assert.equal(first.turn, 3); assert.equal(first.cursor, 8);
  assert.equal(totalChips(first), 40); assert.equal(validatePokerGame(first), true);
  assert.equal(first.players[1].accessory, 'sunglasses');
  assert.throws(() => createPokerGame({ buyIn: 100 }));
  assert.throws(() => createPokerGame({ seed: NaN }));
});

test('button rotation changes the blinds and position without changing the shuffled deck', () => {
  for (let button = 0; button < 4; button++) {
    const state = createPokerGame({ seed: 9, button });
    assert.equal(state.turn, (button + 3) % 4);
    assert.equal(state.players[(button + 1) % 4].streetBet, 1);
    assert.equal(state.players[(button + 2) % 4].streetBet, 2);
    assert.equal(validatePokerGame(state), true);
  }
});

test('the big blind retains its preflop option; each later street starts left of the button', () => {
  let state = createPokerGame({ seed: 7 });
  for (let i = 0; i < 3; i++) state = checkOrCall(state);
  assert.equal(state.street, 'preflop'); assert.equal(state.turn, 2); assert.equal(pokerActions(state).check, true);
  assert.equal(pokerActions(state).raise, true);
  state = checkOrCall(state);
  assert.equal(state.street, 'flop'); assert.equal(state.board.length, 3); assert.equal(state.cursor, 12); assert.equal(state.turn, 1);
  for (const street of ['turn', 'river']) {
    for (let i = 0; i < 4; i++) state = checkOrCall(state);
    assert.equal(state.street, street); assert.equal(state.turn, 1);
  }
  for (let i = 0; i < 4; i++) state = checkOrCall(state);
  assert.equal(state.status, 'complete'); assert.equal(state.board.length, 5); assert.equal(state.result.totalPot, 8);
  assert.equal(totalChips(state), 40); assert.equal(state.result.payout, state.players[0].stack);
});

test('actions are immutable, integer raises obey minimums, and unknown keys cannot masquerade as actions', () => {
  const state = createPokerGame({ seed: 32 }), before = clone(state);
  assert.equal(pokerActions(state).minRaiseTo, 4);
  for (const action of [{ type: 'raise', amount: 3 }, { type: 'raise', amount: 4.5 }, { type: 'raise', amount: 11 }, { type: 'check' }, { type: 'callAmount' }, { type: '__proto__' }]) {
    assert.throws(() => actPoker(state, action)); assert.deepEqual(state, before);
  }
  const next = actPoker(state, { type: 'raise', amount: 6 });
  assert.equal(next.currentBet, 6); assert.equal(next.lastFullRaise, 4);
  assert.equal(pokerActions(next).minRaiseTo, 10); assert.equal(totalChips(next), 40);
  assert.deepEqual(state, before);
});

test('every five-card category is ordered correctly, and kickers break ties', () => {
  const examples = [
    'As Jd 9h 5c 2d', 'As Ad 9h 5c 2d', 'As Ad 9h 9c 2d', 'As Ad Ah 5c 2d',
    '9s 8d 7h 6c 5d', 'As Js 9s 5s 2s', 'As Ad Ah 5c 5d', 'As Ad Ah Ac 2d', 'As Ks Qs Js Ts',
  ].map(text => evaluatePokerHand(cards(text)));
  examples.forEach((hand, index) => assert.equal(hand.category, index));
  for (let i = 1; i < examples.length; i++) assert.equal(comparePokerHands(examples[i], examples[i - 1]), 1);
  assert.equal(comparePokerHands(evaluatePokerHand(cards('Ah Ad Ks 8c 2d')), evaluatePokerHand(cards('As Ac Qh Jh Td'))), 1);
  assert.equal(comparePokerHands(evaluatePokerHand(cards('Ah Ad Ks 8c 2d')), evaluatePokerHand(cards('As Ac Kh 8h 2s'))), 0);
  assert.throws(() => evaluatePokerHand(cards('As As Qh Jh Td')));
});

test('best five of seven handles wheels, two triples, flush kickers and a board-only tie', () => {
  assert.deepEqual(evaluatePokerHand(cards('As 2d 3h 4c 5d Ks Qs')).score, [4, 5]);
  assert.deepEqual(evaluatePokerHand(cards('As 2s 3s 4s 5s Ks Qd')).score, [8, 5]);
  assert.deepEqual(evaluatePokerHand(cards('As Ad Ah Kc Kd Kh 2s')).score, [6, 14, 13]);
  assert.deepEqual(evaluatePokerHand(cards('As Js 9s 5s 2s 3s Qd')).score, [5, 14, 11, 9, 5, 3]);
  const board = cards('As Ks Qs Js Ts');
  assert.equal(comparePokerHands(evaluatePokerHand([...board, ...cards('2h 3c')]), evaluatePokerHand([...board, ...cards('Ah Ad')])), 0);
});

test('three folds award the pot and return uncalled chips without exposing a losing hand', () => {
  let state = createPokerGame({ seed: 21 });
  state = actPoker(state, { type: 'fold' });
  state = actPoker(state, { type: 'fold' });
  state = actPoker(state, { type: 'fold' });
  assert.equal(state.status, 'complete'); assert.deepEqual(state.result.winners, [2]);
  assert.equal(state.players[2].stack, 11); assert.equal(state.result.showdown, false);
  assert.equal(state.result.pots.at(-1).kind, 'uncalled'); assert.equal(totalChips(state), 40);
  assert.deepEqual(pokerPublicState(state).players[2].cards, [null, null]);
});

test('all-in calls automatically run the board and conserve all chips', () => {
  let state = createPokerGame({ buyIn: 20, seed: 18 });
  state = actPoker(state, { type: 'all-in' });
  while (state.status === 'playing') state = actPoker(state, { type: 'call' });
  assert.equal(state.board.length, 5); assert.equal(state.result.totalPot, 80);
  assert.equal(totalChips(state), 80); assert.equal(state.result.showdown, true);
  assert.ok(state.result.payout <= 80);
  assert.ok(pokerPublicState(state).players.every(player => player.cards.every(Boolean)));
});

test('three different all-in sizes create main and side pots won by eligible hands', () => {
  let state = riverFixture({
    board: '2c 3d 4h 8s 9c', hands: ['As 5s', '8h 8d', 'Ah Ad', 'Kh Kd'],
    committed: [5, 10, 20, 19], stacks: [0, 0, 0, 1], turn: 3, currentBet: 20, streetBets: [5, 10, 20, 19], pending: [3],
  });
  state = actPoker(state, { type: 'call' });
  assert.deepEqual(state.result.pots.map(pot => pot.amount), [20, 15, 20]);
  assert.deepEqual(state.result.pots.map(pot => pot.winners), [[0], [1], [2]]);
  assert.deepEqual(state.players.map(player => player.stack), [20, 15, 20, 0]);
  assert.equal(totalChips(state), 55);
});

test('tied pots split fairly, with odd chips given left of the button and folded hands excluded', () => {
  let state = riverFixture({
    board: 'As Ks Qs Js Ts', hands: ['2h 3c', 'Ah Ad', 'Kh Kd', 'Qh Qd'],
    committed: [2, 2, 1, 0], stacks: [18, 18, 19, 20], folded: [2, 3],
  });
  state = checkOrCall(checkOrCall(state));
  assert.deepEqual(state.result.winners, [1, 0]);
  assert.deepEqual(state.players.map(player => player.stack), [20, 21, 19, 20]);
  assert.equal(totalChips(state), 80);
  const visible = pokerPublicState(state);
  assert.ok(visible.players[1].cards.every(Boolean));
  assert.deepEqual(visible.players[2].cards, [null, null]);
  assert.equal(Object.hasOwn(visible.result.hands, '2'), false);
});

test('a short all-in requires a call but does not reopen a previous raiser’s action', () => {
  let state = createPokerGame({ buyIn: 20, seed: 5 });
  state.currentBet = 10; state.lastFullRaise = 8; state.turn = 1; state.pending = [1, 2, 3];
  state.actedAtBet = [10, null, null, null]; state.pot = 16;
  state.players.forEach((player, i) => { player.streetBet = player.committed = i === 0 ? 10 : 2; player.stack = i < 2 ? 10 : 18; });
  assert.equal(pokerActions(state).raise, false); assert.equal(pokerActions(state).allIn, true);
  state = actPoker(state, { type: 'all-in' });
  assert.equal(state.currentBet, 12); assert.equal(state.lastFullRaise, 8);
  state = checkOrCall(checkOrCall(state));
  assert.equal(state.turn, 0);
  assert.equal(pokerActions(state).callAmount, 2); assert.equal(pokerActions(state).raise, false); assert.equal(pokerActions(state).allIn, false);
  assert.throws(() => actPoker(state, { type: 'all-in' }));
  state = checkOrCall(state); assert.equal(state.street, 'flop');
});

test('cumulative short all-ins reopen raising once a full raise is faced', () => {
  let state = createPokerGame({ buyIn: 20, seed: 5 });
  state.currentBet = 10; state.lastFullRaise = 8; state.turn = 1; state.pending = [1, 2, 3];
  state.actedAtBet = [10, null, null, null]; state.pot = 16;
  state.players.forEach((player, i) => { player.streetBet = player.committed = i === 0 ? 10 : 2; player.stack = [30, 10, 16, 30][i]; });
  state = actPoker(state, { type: 'all-in' }); // 12; incomplete raise of 2.
  state = actPoker(state, { type: 'all-in' }); // 18; incomplete raise of 6.
  state = checkOrCall(state);
  assert.equal(state.turn, 0); assert.equal(state.currentBet, 18);
  assert.equal(pokerActions(state).raise, true); assert.equal(pokerActions(state).minRaiseTo, 26);
});

test('a remaining player cannot raise into opponents who are all-in', () => {
  const state = riverFixture({
    board: '2c 3d 4h 8s 9c', hands: ['As 5s', '8h 8d', 'Ah Ad', 'Kh Kd'],
    committed: [5, 10, 10, 10], stacks: [15, 0, 0, 0], turn: 0, currentBet: 10, streetBets: [5, 10, 10, 10],
  });
  const legal = pokerActions(state);
  assert.equal(legal.callAmount, 5); assert.equal(legal.raise, false); assert.equal(legal.allIn, false);
  assert.equal(actPoker(state, { type: 'call' }).status, 'complete');
});

test('bot input excludes all hidden hands and deck, and decisions do not change when hidden cards change', () => {
  const state = createPokerGame({ seed: 765 });
  const view = pokerBotView(state);
  assert.equal(Object.hasOwn(view, 'deck'), false); assert.equal(Object.hasOwn(view, 'seed'), false);
  assert.ok(view.players.every(player => !Object.hasOwn(player, 'cards')));
  assert.deepEqual(view.cards, state.players[state.turn].cards);
  const altered = clone(state);
  for (let i = 0; i < 3; i++) altered.players[i].cards = cards('As Ah');
  altered.deck.reverse(); altered.wallet = 1000;
  assert.deepEqual(advancePokerBots(state).history.at(-1), advancePokerBots(altered).history.at(-1));
  assert.equal(state.history.length, 0);
});

test('public state hides future randomness and other players’ cards throughout a live hand', () => {
  const state = createPokerGame({ seed: 45 }), view = pokerPublicState(state);
  for (const key of ['deck', 'cursor', 'rngState', 'seed']) assert.equal(Object.hasOwn(view, key), false);
  assert.deepEqual(view.players[0].cards, state.players[0].cards);
  assert.ok(view.players.slice(1).every(player => player.cards.every(card => card === null)));
  view.players[0].stack = 999; assert.equal(state.players[0].stack, 10);
});

test('JSON round-trips resume exact bot actions, cards, and payout; validation rejects forged states', () => {
  let state = createPokerGame({ buyIn: 20, seed: 908 });
  while (state.status === 'playing') {
    assert.equal(validatePokerGame(state), true);
    const restored = JSON.parse(JSON.stringify(state));
    const step = value => value.turn === 0 ? checkOrCall(value) : advancePokerBots(value);
    const next = step(state); assert.deepEqual(step(restored), next); state = next;
  }
  assert.equal(validatePokerGame(state), true);
  assert.equal(advancePokerBots(state), state);
  for (const mutate of [value => value.players[0].stack++, value => value.result.payout++, value => value.deck.reverse(), value => value.rngState++, value => value.history.pop()]) {
    const forged = clone(state); mutate(forged); assert.equal(validatePokerGame(forged), false);
  }
  for (const invalid of [null, {}, [], { type: 'poker', version: 1, seed: 1, history: Array(300).fill({}) }]) assert.equal(validatePokerGame(invalid), false);
});

test('a varied run of seeded hands always terminates, remains replayable and never creates chips', () => {
  for (let seed = 0; seed < 100; seed++) {
    let state = createPokerGame({ buyIn: seed % 2 ? 20 : 10, seed, button: seed % 4 }), steps = 0;
    const bankroll = totalChips(state);
    while (state.status === 'playing') {
      assert.ok(steps++ < 180, `hand ${seed} failed to end`);
      if (state.turn === 0) {
        const legal = pokerActions(state), options = [{ type: 'fold' }];
        if (legal.check) options.push({ type: 'check' });
        if (legal.call) options.push({ type: 'call' });
        if (legal.raise) options.push({ type: 'raise', amount: legal.minRaiseTo });
        if (legal.allIn) options.push({ type: 'all-in' });
        state = actPoker(state, options[(seed + steps * 3) % options.length]);
      } else state = advancePokerBots(state);
      assert.equal(totalChips(state), bankroll, `chips changed at seed ${seed}`);
      assert.ok(state.players.every(player => Number.isInteger(player.stack) && player.stack >= 0));
    }
    assert.equal(validatePokerGame(state), true, `hand ${seed} failed validation`);
    assert.ok(state.result.payout >= 0 && state.result.payout <= state.buyIn * 4);
    assert.equal(state.result.net, state.result.payout - state.buyIn);
  }
});


test('an opening all-in below the minimum does not reopen a player who already checked', () => {
  let state = riverFixture({
    board: '2c 3d 4h 8s 9c', hands: ['As 5s', '8h 8d', 'Ah Ad', 'Kh Kd'],
    committed: [5, 5, 5, 5], stacks: [15, 15, 1, 15], turn: 0,
  });
  state = actPoker(state, { type: 'check' });
  state = actPoker(state, { type: 'check' });
  state = actPoker(state, { type: 'all-in' }); // Opening wager 1, below the 2-dollar minimum.
  assert.equal(state.turn, 3);
  assert.equal(pokerActions(state).raise, true); // This player has not acted yet.
  assert.equal(pokerActions(state).minRaiseTo, 3);
  state = actPoker(state, { type: 'call' });
  assert.equal(state.turn, 0);
  assert.equal(pokerActions(state).raise, false); assert.equal(pokerActions(state).allIn, false);
  assert.equal(pokerActions(state).callAmount, 1);
});
