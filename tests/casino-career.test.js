import test from 'node:test';
import assert from 'node:assert/strict';
import {CareerProfile, CAREER_VERSION, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY} from '../src/game/CareerProfile.js';
import {DELIVERY_STOPS, moneyCap} from '../src/game/ChapterRules.js';
import {CASINO_PLACES, freshCasino} from '../src/game/CasinoRules.js';
import {HOME_SPAWN} from '../src/game/DayRules.js';
import {createBlackjackGame, actBlackjack, blackjackActions} from '../src/game/casino/BlackjackGame.js';
import {createSlotsGame} from '../src/game/casino/SlotsGame.js';
import {createRouletteGame} from '../src/game/casino/RouletteGame.js';
import {pokerActions} from '../src/game/casino/PokerGame.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}
const make = (storage = new MemoryStorage()) => new CareerProfile({storage, now: () => '2026-09-27T16:00:00Z'});
const location = scene => ({scene, x: 640, y: 540, facing: 'down'});
function work(p, tours = 1) {
  for (let n = 0; n < tours; n++) {
    if (p.dailyStatus().energy < 30) assert.equal(p.sleep().ok, true);
    assert.equal(p.startDelivery().ok, true);
    for (const stop of DELIVERY_STOPS) assert.equal(p.deliverParcel(stop, {tip: 2}).ok, true);
  }
}
function enterBronze(p) {
  p.recordFight({opponent: 'beton', winner: 'player'});
  p.recordFight({opponent: 'kramer', winner: 'player'});
  work(p, 14);
  assert.equal(p.startTournament().ok, true);
}
function endBronze(p) {
  const match = p.tournamentStatus();
  assert.equal(p.recordTournamentFight({opponent: match.opponent, matchId: match.currentMatchId, winner: 'remi'}).ok, true);
}
function ready(storage = new MemoryStorage()) {
  const p = make(storage); enterBronze(p); endBronze(p); assert.equal(p.leaveTournament().ok, true);
  return p;
}
function table(p, scene = 'casino-tables', chips = 20) {
  assert.equal(p.setLocation(location('casino-lobby')).ok, true);
  assert.equal(p.casinoExchange(chips).ok, true);
  assert.equal(p.setLocation(location(scene)).ok, true);
}
function useSeed(t, seed) { t.mock.method(globalThis.crypto, 'getRandomValues', array => {array[0] = seed; return array;}); }
function findSeed(predicate) {
  for (let seed = 1; seed < 20000; seed++) if (predicate(seed)) return seed;
  throw new Error('No seed matched test fixture.');
}
function setMoney(p, amount) {
  const raw = p.snapshot(); raw.wallet.money = amount; raw.wallet.totalEarned = Math.max(amount, 2000);
  p.importText(JSON.stringify(raw));
}
const ongoingSeed = findSeed(seed => createBlackjackGame({seed}).status === 'playing');
const naturalSeed = findSeed(seed => createBlackjackGame({seed}).hands[0].result === 'blackjack');

test('casino career: access follows completed Bronze and return, not a win or mere registration', () => {
  const p = make(); assert.equal(p.casinoStatus().unlocked, false); assert.equal(p.moneyStatus().cap, 200);
  enterBronze(p); assert.equal(p.casinoStatus().unlocked, false); assert.equal(p.moneyStatus().cap, 500);
  endBronze(p); assert.equal(p.casinoStatus().unlocked, false); assert.equal(p.moneyStatus().cap, 500);
  assert.equal(p.leaveTournament().ok, true);
  assert.equal(p.casinoStatus().unlocked, true); assert.equal(p.casinoStatus().available, true);
  assert.equal(p.moneyStatus().cap, 1000); assert.equal(moneyCap(p.snapshot().fights), 500);
  const forfeited = make(); enterBronze(forfeited); forfeited.leaveTournament();
  assert.equal(forfeited.casinoStatus().unlocked, false); assert.equal(forfeited.moneyStatus().cap, 500);
});

test('casino career: V5 migration preserves progression and original backup, adds empty casino', () => {
  const original = ready(), old = original.snapshot(); old.version = 5; delete old.casino;
  const text = JSON.stringify(old), storage = new MemoryStorage(); storage.setItem(CAREER_STORAGE_KEY, text);
  const migrated = make(storage);
  assert.equal(CAREER_VERSION, 7); assert.equal(migrated.snapshot().version, CAREER_VERSION);
  for (const key of ['wallet', 'inventory', 'fights', 'daily', 'location', 'tournament', 'cuba', 'mexico', 'marathon']) {
    assert.deepEqual(migrated.snapshot()[key], old[key], key);
  }
  assert.deepEqual(migrated.snapshot().casino, freshCasino()); assert.equal(storage.getItem(CAREER_BACKUP_KEY), text);
  assert.deepEqual(make(storage).snapshot(), migrated.snapshot());
});

test('casino career: exchange is reversible, allows half-dollars, and never counts as earnings', () => {
  const storage = new MemoryStorage(), p = ready(storage); p.setLocation(location('casino-lobby'));
  const before = p.snapshot();
  assert.equal(p.casinoExchange(20.5).ok, true);
  assert.equal(p.moneyStatus().money, before.wallet.money - 20.5); assert.equal(p.casinoStatus().chips, 20.5);
  assert.equal(p.moneyStatus().totalEarned, before.wallet.totalEarned);
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
  assert.equal(p.casinoExchange(-20.5).ok, true); assert.deepEqual(p.snapshot().wallet, before.wallet);
  assert.equal(p.casinoStatus().chips, 0); assert.deepEqual(p.snapshot().daily, before.daily);
});

test('casino career: exchanges reject missing balance, unknown fractions and wrong room atomically', () => {
  const p = ready(); p.setLocation(location('casino-lobby'));
  for (const amount of [0, .1, Infinity, NaN, -1, '1', '-1', true, false, null, p.moneyStatus().money + 1]) {
    const before = p.exportText(); assert.equal(p.casinoExchange(amount).ok, false); assert.equal(p.exportText(), before);
  }
  p.setLocation(location('casino-tables')); const before = p.exportText();
  assert.equal(p.casinoExchange(1).ok, false); assert.equal(p.exportText(), before);
});

test('casino career: every table requires the correct room and bankroll, without mutating on refusal', () => {
  const p = ready();
  for (const game of ['blackjack', 'roulette', 'poker', 'slots', 'unknown']) {
    const before = p.exportText(); assert.equal(p.casinoStart(game).ok, false); assert.equal(p.exportText(), before);
  }
  for (const [game, room] of [['blackjack', 'casino-tables'], ['roulette', 'casino-tables'], ['poker', 'casino-poker'], ['slots', 'casino-lobby']]) {
    p.setLocation(location(room)); const before = p.exportText();
    assert.equal(p.casinoStart(game).ok, false); assert.equal(p.exportText(), before);
  }
});

test('casino career: natural blackjack credits 3:2 once and preserves half-dollar import/reload', t => {
  useSeed(t, naturalSeed);
  const storage = new MemoryStorage(), p = ready(storage); table(p);
  const before = p.snapshot(); assert.equal(p.casinoStart('blackjack', {bet: 1}).ok, true);
  assert.equal(p.casinoStatus().active.settled, true); assert.equal(p.casinoStatus().chips, 21.5);
  assert.equal(p.snapshot().casino.wagered, 1); assert.equal(p.snapshot().casino.won, 2.5);
  assert.equal(p.moneyStatus().totalEarned, before.wallet.totalEarned + 1.5); assert.equal(p.casinoStatus().rounds, 1);
  const settled = p.exportText(); assert.equal(p.casinoAct('stand').ok, false); assert.equal(p.exportText(), settled);
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
  const imported = make(); imported.importText(settled); assert.deepEqual(imported.snapshot().casino, p.snapshot().casino);
  assert.equal(p.casinoDismiss().ok, true); assert.equal(p.casinoDismiss().ok, true); assert.equal(p.casinoStatus().rounds, 1);
  p.setLocation(location('casino-lobby')); assert.equal(p.casinoExchange(-21.5).ok, true);
  assert.equal(p.moneyStatus().money, before.wallet.money + 21.5); assert.equal(p.moneyStatus().totalEarned, before.wallet.totalEarned + 1.5);
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
});

test('casino career: blackjack loss removes stake without a second debit or false earnings', t => {
  const seed = findSeed(seed => {const g = createBlackjackGame({seed}); return g.status === 'playing' && actBlackjack(g, 'stand').payout === 0;});
  useSeed(t, seed); const p = ready(); table(p); const earned = p.moneyStatus().totalEarned;
  p.casinoStart('blackjack', {bet: 1}); assert.equal(p.casinoStatus().chips, 19);
  assert.equal(p.casinoAct('stand').ok, true); assert.equal(p.casinoStatus().chips, 19);
  assert.equal(p.moneyStatus().totalEarned, earned); assert.equal(p.snapshot().casino.wagered, 1);
  assert.equal(p.snapshot().casino.won, 0); assert.equal(p.casinoStatus().rounds, 1);
});

test('casino career: split and double debit only new stakes and survive each save boundary', t => {
  const seed = findSeed(seed => {
    let game = createBlackjackGame({seed, bet: 2, bankroll: 20});
    if (!blackjackActions(game).includes('split')) return false;
    game = actBlackjack(game, 'split');
    if (!blackjackActions(game).includes('double') || game.activeHand !== 0) return false;
    game = actBlackjack(game, 'double');
    return game.activeHand === 1 && blackjackActions(game).includes('double');
  });
  useSeed(t, seed); const storage = new MemoryStorage(); let p = ready(storage); table(p);
  const earned = p.moneyStatus().totalEarned;
  assert.equal(p.casinoStart('blackjack', {bet: 2}).ok, true); assert.equal(p.casinoStatus().chips, 18);
  assert.equal(p.casinoAct('split').ok, true); assert.equal(p.casinoStatus().chips, 16);
  p = make(storage); assert.equal(p.casinoStatus().active.stake, 4); assert.equal(p.casinoStatus().active.state.hands.length, 2);
  assert.equal(p.casinoAct('double').ok, true); assert.equal(p.casinoStatus().chips, 14);
  p = make(storage); assert.equal(p.casinoStatus().active.stake, 6);
  assert.equal(p.casinoAct('double').ok, true);
  const result = p.casinoStatus().active.state;
  assert.equal(p.casinoStatus().active.stake, 8); assert.equal(p.casinoStatus().chips, 12 + result.payout);
  assert.equal(p.snapshot().casino.wagered, 8); assert.equal(p.moneyStatus().totalEarned, earned + Math.max(0, result.payout - 8));
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
});

test('casino career: pending hand remains exactly the same on pause/reopen and rejects a reroll', t => {
  useSeed(t, ongoingSeed); const storage = new MemoryStorage(); let p = ready(storage); table(p);
  p.casinoStart('blackjack', {bet: 1}); const before = p.exportText();
  assert.equal(p.casinoDismiss().ok, false); assert.equal(p.casinoStart('blackjack').ok, false);
  assert.equal(p.casinoExchange(-1).ok, false); assert.equal(p.exportText(), before);
  p = make(storage); assert.equal(p.exportText(), before); assert.equal(p.casinoStatus().active.settled, false);
  const expected = actBlackjack(p.casinoStatus().active.state, 'stand');
  assert.equal(p.casinoAct('stand').ok, true); assert.deepEqual(p.casinoStatus().active.state, expected);
});

for (const [game, room, options, engine] of [
  ['roulette', 'casino-tables', {bets: [{type: 'number', value: 0}]}, createRouletteGame],
  ['slots', 'casino-lobby', {machineId: 'diamants'}, createSlotsGame],
]) {
  test(`casino career: ${game} commits outcome before display and reload never pays twice`, t => {
    useSeed(t, 512); const storage = new MemoryStorage(), p = ready(storage); table(p, room);
    const expected = engine({...options, seed: 512}), before = p.snapshot();
    assert.equal(p.casinoStart(game, options).ok, true);
    assert.equal(p.casinoStatus().chips, 20 - expected.totalBet + expected.payout);
    assert.equal(p.moneyStatus().totalEarned, before.wallet.totalEarned + Math.max(0, expected.profit));
    assert.equal(p.casinoStatus().active.settled, true); assert.equal(p.casinoStatus().rounds, 1);
    assert.deepEqual(make(storage).snapshot(), p.snapshot());
    const save = p.exportText(); assert.equal(p.casinoAct('spin').ok, false); assert.equal(p.exportText(), save);
  });
}

test('casino career: combined wallet/chips headroom is checked before engagement, no gain clipping', () => {
  const p = ready(); setMoney(p, 999); table(p, 'casino-lobby', 20);
  const before = p.exportText(); assert.equal(p.casinoStart('slots').ok, false); assert.equal(p.exportText(), before);
  p.setLocation(location('casino-tables'));
  assert.equal(p.casinoOffer('blackjack', {bet: 1}).ok, false);
  assert.equal(p.casinoOffer('roulette', {bets: [{type: 'number', value: 1}]}).ok, false);
  assert.equal(p.casinoOffer('roulette', {bets: [{type: 'color', value: 'red'}]}).ok, true);
  assert.equal(p.moneyStatus().money + p.casinoStatus().chips, 999);
});

test('casino career: deliveries respect chips held at the casino, preserve half-dollar capped pay', () => {
  const storage = new MemoryStorage(), p = ready(storage); setMoney(p, 998.5); table(p, 'casino-lobby', 20);
  p.setLocation(HOME_SPAWN); if (p.dailyStatus().energy < 30) p.sleep();
  assert.equal(p.startDelivery().ok, true);
  const paid = p.deliverParcel(DELIVERY_STOPS[0], {tip: 2}); assert.equal(paid.paid, 1.5);
  assert.equal(p.moneyStatus().money + p.casinoStatus().chips, 1000); assert.equal(p.snapshot().delivery.active.earned, 1.5);
  assert.doesNotThrow(() => p.inspectImport(p.exportText()));
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
  assert.equal(p.deliverParcel(DELIVERY_STOPS[1], {tip: 2}).paid, 0);
  assert.equal(p.deliverParcel(DELIVERY_STOPS[2], {tip: 2}).paid, 0);
  assert.equal(p.moneyStatus().money + p.casinoStatus().chips, 1000);
});

test('casino career: zero daily energy does not block entertainment or advance time', t => {
  useSeed(t, 512); const p = ready(); table(p, 'casino-lobby');
  while (p.dailyStatus().energy >= 5) assert.equal(p.spendEnergy('shadow').ok, true);
  const before = p.snapshot().daily;
  assert.equal(p.activityCost('casino'), 0); assert.equal(p.canStartActivity('casino').ok, true);
  assert.equal(p.casinoStart('slots').ok, true); assert.deepEqual(p.snapshot().daily, before);
  p.casinoDismiss(); p.setLocation(location('casino-tables'));
  assert.equal(p.casinoStart('roulette').ok, true); assert.deepEqual(p.snapshot().daily, before);
});

test('casino career: pending hand blocks departure, sleep, deliveries and tournaments atomically', t => {
  useSeed(t, ongoingSeed); const p = ready(); table(p); p.casinoStart('blackjack', {bet: 1});
  const before = p.exportText();
  for (const action of [() => p.setLocation(HOME_SPAWN), () => p.sleep(), () => p.startDelivery(), () => p.startTournament(),
    () => p.spendEnergy('pads'), () => p.canFight('beton'), () => p.reserveTravel('cuba'), () => p.boardTravel('cuba'),
    () => p.registerMarathon(), () => p.startMarathon()]) {
    assert.equal(action().ok, false); assert.equal(p.exportText(), before);
  }
  for (const scene of CASINO_PLACES) {
    assert.equal(p.setLocation(location(scene)).ok, true);
    assert.doesNotThrow(() => p.inspectImport(p.exportText()));
  }
});

test('casino career: replay validation rejects forged active outcomes and leaves the save untouched', t => {
  useSeed(t, ongoingSeed); const p = ready(); table(p); p.casinoStart('blackjack', {bet: 1});
  const before = p.exportText();
  const corruptions = [
    raw => {raw.casino.active.state.payout = 100;},
    raw => {raw.casino.active.state.hands[0].cards[0].rank = 'X';},
    raw => {raw.casino.active.actions.push('stand');},
    raw => {raw.casino.active.stake += 1;},
    raw => {raw.casino.active.seed += 1;},
    raw => {raw.casino.active.settled = true;},
    raw => {raw.casino.nextId += 1;},
    raw => {raw.casino.chips = 1001;},
    raw => {raw.casino.chips = .1;},
    raw => {raw.location = {...HOME_SPAWN};},
    raw => {raw.casino.chips += 1;},
    raw => {raw.wallet.money = 1000 - raw.casino.chips - raw.casino.active.stake; raw.wallet.totalEarned = 2000;},
  ];
  for (const mutate of corruptions) {
    const invalid = JSON.parse(before); mutate(invalid);
    assert.throws(() => p.importText(JSON.stringify(invalid))); assert.equal(p.exportText(), before);
  }
});

test('casino career: impossible data and pre-Bronze chips are rejected on import', () => {
  const p = make(); const before = p.exportText();
  for (const mutate of [raw => {delete raw.casino;}, raw => {raw.casino.chips = 1;}, raw => {raw.casino.won = -.5;}, raw => {raw.casino.rounds = 1;}]) {
    const raw = JSON.parse(before); mutate(raw); assert.throws(() => p.importText(JSON.stringify(raw))); assert.equal(p.exportText(), before);
  }
});


test('casino career: poker reserves one buy-in, rejects control of bots, and resumes every betting turn', t => {
  useSeed(t, 512); const storage = new MemoryStorage(); let p = ready(storage); table(p, 'casino-poker');
  const earned = p.moneyStatus().totalEarned;
  assert.equal(p.casinoStart('poker', {buyIn: 10}).ok, true); assert.equal(p.casinoStatus().chips, 10);
  assert.notEqual(p.casinoStatus().active.state.turn, 0);
  const before = p.exportText(); assert.equal(p.casinoAct({type: 'fold'}).ok, false); assert.equal(p.exportText(), before);
  for (let step = 0; step < 100 && !p.casinoStatus().active.settled; step++) {
    const state = p.casinoStatus().active.state, legal = pokerActions(state);
    const action = state.turn === 0 ? {type: legal.check ? 'check' : 'call'} : 'bot';
    assert.equal(p.casinoAct(action).ok, true);
    const saved = p.snapshot(); p = make(storage); assert.deepEqual(p.snapshot(), saved);
  }
  const result = p.casinoStatus().active;
  assert.equal(result.settled, true); assert.equal(p.casinoStatus().chips, 10 + result.state.result.payout);
  assert.equal(p.snapshot().casino.wagered, 10); assert.equal(p.casinoStatus().rounds, 1);
  assert.equal(p.moneyStatus().totalEarned, earned + Math.max(0, result.state.result.net));
});

test('casino career: terminal teleports clean only the test hand and preserve the normal active deal', t => {
  useSeed(t, ongoingSeed); const storage = new MemoryStorage(), p = ready(storage); table(p);
  p.casinoStart('blackjack', {bet: 1});
  const normal = p.exportText(), primary = storage.getItem(CAREER_STORAGE_KEY);
  assert.equal(p.applyTestCommand('test maison').ok, true);
  assert.equal(p.snapshot().location.scene, 'home'); assert.equal(p.casinoStatus().active, null);
  assert.equal(p.casinoStatus().chips, 20); assert.equal(p.snapshot().casino.wagered, 0);
  assert.doesNotThrow(() => p.inspectImport(p.exportText()));
  assert.equal(p.applyTestCommand('argent 999999').ok, true);
  assert.equal(p.moneyStatus().money + p.casinoStatus().chips, 1000);
  assert.doesNotThrow(() => p.inspectImport(p.exportText()));
  assert.equal(p.applyTestCommand('retour').ok, true); assert.equal(p.exportText(), normal);
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), primary);
});

test('casino career: test money command preserves headroom reserved for an unfinished deal', t => {
  useSeed(t, ongoingSeed); const p = ready(); table(p); p.casinoStart('blackjack', {bet: 1});
  const normal = p.exportText();
  assert.equal(p.applyTestCommand('argent 999999').ok, true);
  const casino = p.casinoStatus();
  assert.equal(p.moneyStatus().money + casino.chips + casino.active.stake + casino.active.maxNetWin, 1000);
  assert.doesNotThrow(() => p.inspectImport(p.exportText()));
  assert.equal(p.casinoAct('stand').ok, true); assert.doesNotThrow(() => p.inspectImport(p.exportText()));
  p.applyTestCommand('retour'); assert.equal(p.exportText(), normal);
});
