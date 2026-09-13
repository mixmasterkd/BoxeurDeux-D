import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY, CAREER_VERSION } from '../src/game/CareerProfile.js';
import { WORLD_SCENES } from '../src/game/DayRules.js';
import { DELIVERY_STOPS, HOTEL_ROOM_SPAWN, TOURNAMENT_RETURN_SPAWN } from '../src/game/ChapterRules.js';

class MemoryStorage {
  constructor() { this.values = new Map(); this.writes = 0; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); this.writes += 1; }
}
const create = storage => new CareerProfile({ storage, now: () => '2026-09-12T15:00:00Z' });
function tour(profile, tip = 2) {
  if (profile.dailyStatus().energy < 30) assert.equal(profile.sleep().ok, true);
  assert.equal(profile.startDelivery().ok, true);
  for (const id of DELIVERY_STOPS) assert.equal(profile.deliverParcel(id, { tip }).ok, true);
}
function tournamentReady(profile) {
  assert.equal(profile.recordFight({ winner: 'player', opponent: 'beton', score: 9 }).ok, true);
  assert.equal(profile.recordFight({ winner: 'player', opponent: 'kramer', score: 12 }).ok, true);
  for (let i = 0; i < 6; i++) tour(profile);
  assert.equal(profile.startTournament().ok, true);
}
function currentResult(profile, winner = 'player') {
  const current = profile.tournamentStatus();
  return { winner, opponent: current.opponent, score: 15, matchId: current.currentMatchId };
}

test('v2 migration preserves a depleted day, location and acquired progress, adding a free default wardrobe and empty wallet', () => {
  const storage = new MemoryStorage(), source = create(null);
  source.reward('rope', { hits: 24, accuracy: 80 }); source.spendEnergy('sparring'); source.sleep();
  source.spendEnergy('rope'); source.setLocation({ scene: 'neighborhood', x: 1900, y: 700, facing: 'right' });
  const old = source.snapshot(); old.version = 2;
  for (const key of ['wallet', 'inventory', 'delivery', 'tournament', 'fightReceipts']) delete old[key];
  delete old.activities.pads; delete old.activities.pool;
  for (const id of ['kramer', 'bellini', 'fortin', 'gagnon']) delete old.fights[id];
  const original = JSON.stringify(old); storage.setItem(CAREER_STORAGE_KEY, original);
  const migrated = create(storage).snapshot();
  assert.equal(migrated.version, CAREER_VERSION);
  for (const key of ['daily', 'location', 'stats', 'revision', 'createdAt', 'updatedAt']) assert.deepEqual(migrated[key], old[key]);
  assert.deepEqual(migrated.fights.beton, old.fights.beton);
  assert.deepEqual(migrated.inventory, { owned: ['street-black', 'boxing-blue'], equipped: { street: 'street-black', boxing: 'boxing-blue' } });
  assert.deepEqual(migrated.wallet, { money: 0, totalEarned: 0 });
  assert.equal(storage.getItem(CAREER_BACKUP_KEY), original);
  assert.deepEqual(create(storage).snapshot(), migrated);
});

test('a route spends energy once, persists partial deliveries, and cannot pay twice or accept the wrong address', () => {
  const storage = new MemoryStorage(); let profile = create(storage);
  assert.equal(profile.startDelivery().ok, true);
  assert.equal(profile.dailyStatus().energy, 70);
  const before = profile.exportText();
  assert.equal(profile.startDelivery().ok, false);
  assert.equal(profile.deliverParcel(DELIVERY_STOPS[1]).ok, false);
  assert.equal(profile.deliverParcel(DELIVERY_STOPS[0], { tip: 200 }).ok, false);
  assert.equal(profile.sleep().ok, false);
  assert.equal(profile.exportText(), before);
  assert.equal(profile.deliverParcel(DELIVERY_STOPS[0], { tip: 2 }).paid, 7);
  profile = create(storage);
  assert.equal(profile.deliveryStatus().nextStop, DELIVERY_STOPS[1]);
  const partial = profile.exportText();
  assert.equal(profile.deliverParcel(DELIVERY_STOPS[0]).duplicate, true);
  assert.equal(profile.exportText(), partial);
  assert.equal(profile.deliverParcel(DELIVERY_STOPS[1], { tip: 0 }).paid, 5, 'slow delivery still pays');
  const last = profile.deliverParcel(DELIVERY_STOPS[2], { tip: 1 });
  assert.equal(last.completed, true); assert.equal(last.earned, 18);
  assert.equal(profile.dailyStatus().energy, 70); assert.equal(profile.deliveryStatus().active, null);
  assert.equal(profile.deliveryStatus().completedTours, 1); assert.equal(profile.moneyStatus().money, 18);
  assert.equal(profile.deliverParcel(DELIVERY_STOPS[2]).ok, false);
});

test('abandoning retains actual pay and expenditure; insufficient energy and invalid routes are atomic', () => {
  const profile = create(new MemoryStorage());
  for (const route of [[], ['a', 'a', 'b'], ['a', 'b'], ['a', 'b', '__proto__', 'd'], [12, 24, 36]]) {
    assert.equal(profile.startDelivery(route).ok, false); assert.equal(profile.dailyStatus().energy, 100);
  }
  profile.startDelivery(); profile.deliverParcel(DELIVERY_STOPS[0]); profile.abandonDelivery();
  assert.equal(profile.moneyStatus().money, 6); assert.equal(profile.dailyStatus().energy, 70);
  assert.equal(profile.deliveryStatus().completedTours, 0);
  profile.spendEnergy('sparring'); profile.spendEnergy('sparring'); profile.spendEnergy('rope');
  const before = profile.exportText();
  assert.equal(profile.startDelivery().ok, false); assert.equal(profile.exportText(), before);
});

test('two working tours per day fund the first inscription in three days while leaving 40 energy for training', () => {
  const profile = create(new MemoryStorage());
  profile.recordFight({ opponent: 'beton', winner: 'player' }); profile.recordFight({ opponent: 'kramer', winner: 'player' });
  for (let day = 1; day <= 3; day++) {
    tour(profile); tour(profile);
    assert.equal(profile.dailyStatus().energy, 40);
    if (day < 3) { assert.equal(profile.canStartTournament().ok, false); profile.sleep(); }
  }
  assert.equal(profile.moneyStatus().money, 126); assert.equal(profile.dailyStatus().day, 3);
  assert.equal(profile.startTournament().fee, 120); assert.equal(profile.moneyStatus().money, 6);
  assert.equal(profile.dailyStatus().energy, 40, 'travel and the inscription are not energy refills');
});

test('money caps follow advancement, excess tips do not overflow, and victories unlock caps without free stats', () => {
  const profile = create(new MemoryStorage());
  for (let i = 0; i < 10; i++) tour(profile);
  assert.deepEqual(profile.moneyStatus(), { money: 200, totalEarned: 200, cap: 200 });
  assert.equal(profile.canFight('kramer').ok, false);
  const stats = profile.snapshot().stats;
  profile.recordFight({ opponent: 'beton', winner: 'player' });
  assert.equal(profile.canFight('kramer').ok, true); assert.equal(profile.moneyStatus().cap, 350);
  assert.deepEqual(profile.snapshot().stats, stats);
  assert.deepEqual(profile.snapshot().caps, { power: 7, recovery: 1.14, endurance: 116, resistance: 114 });
  profile.recordFight({ opponent: 'kramer', winner: 'player' });
  assert.equal(profile.moneyStatus().cap, 500); assert.deepEqual(profile.snapshot().stats, stats);
  assert.deepEqual(profile.snapshot().caps, { power: 10, recovery: 1.2, endurance: 124, resistance: 122 });
});

test('purchases and changing clothes are separate saved transactions and never grant a combat bonus', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  assert.equal(profile.buyItem('street-blue').ok, false);
  for (let i = 0; i < 3; i++) tour(profile);
  const stats = profile.snapshot().stats;
  assert.equal(profile.buyItem('street-blue').ok, true);
  assert.equal(profile.moneyStatus().money, 35);
  assert.equal(profile.snapshot().inventory.equipped.street, 'street-black');
  const bought = profile.exportText();
  assert.equal(profile.buyItem('street-blue').ok, false); assert.equal(profile.exportText(), bought);
  assert.equal(profile.equipItem('street-blue', 'gym').ok, false);
  assert.equal(profile.equipItem('street-blue', 'home').ok, true);
  assert.equal(profile.buyItem('boxing-emerald').ok, true);
  assert.equal(profile.equipItem('boxing-emerald', 'home').ok, false);
  assert.equal(profile.equipItem('boxing-emerald', 'gym').ok, true);
  assert.equal(profile.moneyStatus().money, 3); assert.deepEqual(profile.snapshot().stats, stats);
  const reopened = create(storage);
  assert.deepEqual(reopened.snapshot().inventory.equipped, { street: 'street-blue', boxing: 'boxing-emerald' });
  assert.equal(reopened.catalogue('boxing').length, 3);
  const writes = storage.writes; reopened.equipItem('boxing-emerald', 'gym');
  assert.equal(storage.writes, writes, 'equipping the current outfit does not write again');
});

test('entry requires Kramer, the fee and no active delivery; duplicate entry cannot charge twice', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  for (let i = 0; i < 6; i++) tour(profile);
  const before = profile.exportText();
  assert.equal(profile.startTournament().ok, false); assert.equal(profile.exportText(), before);
  assert.equal(profile.recordFight({ opponent: 'kramer', winner: 'player' }).ok, false);
  profile.recordFight({ opponent: 'beton', winner: 'player' }); profile.recordFight({ opponent: 'kramer', winner: 'player' });
  if (profile.dailyStatus().energy < 30) profile.sleep();
  profile.startDelivery(); assert.equal(profile.startTournament().ok, false); profile.abandonDelivery();
  assert.equal(profile.startTournament().ok, true);
  assert.deepEqual(profile.snapshot().location, HOTEL_ROOM_SPAWN);
  const entered = profile.exportText(), writes = storage.writes;
  assert.equal(profile.startTournament().ok, false); assert.equal(profile.startDelivery().ok, false);
  assert.equal(profile.exportText(), entered); assert.equal(storage.writes, writes);
  assert.deepEqual(create(storage).tournamentStatus(), profile.tournamentStatus());
});

test('the complete three-day tournament survives reload, gates sleep and opponents, and awards one gold medal', () => {
  const storage = new MemoryStorage(); let profile = create(storage); tournamentReady(profile);
  const stats = profile.snapshot().stats, firstDay = profile.dailyStatus().day;
  for (const [index, opponent] of ['bellini', 'fortin', 'gagnon'].entries()) {
    assert.equal(profile.tournamentStatus().opponent, opponent); assert.equal(profile.tournamentStatus().active.day, index + 1);
    const before = profile.exportText(); assert.equal(profile.sleep().ok, false); assert.equal(profile.exportText(), before);
    const result = currentResult(profile);
    assert.equal(profile.recordTournamentFight({ ...result, opponent: 'beton' }).ok, false);
    assert.equal(profile.recordTournamentFight({ ...result, matchId: '99:1' }).ok, false);
    assert.equal(profile.recordTournamentFight(result).ok, true);
    const recorded = profile.exportText();
    assert.equal(profile.recordTournamentFight(result).duplicate, true); assert.equal(profile.exportText(), recorded);
    profile = create(storage);
    assert.equal(profile.snapshot().fights[opponent].wins, 1);
    if (index < 2) {
      assert.equal(profile.tournamentStatus().active.status, 'awaiting-sleep');
      assert.equal(profile.sleep().ok, true); assert.equal(profile.dailyStatus().energy, 100);
      assert.deepEqual(profile.snapshot().location, HOTEL_ROOM_SPAWN);
      assert.equal(profile.sleep().ok, false, 'double-clicking night cannot skip the next bout');
      profile = create(storage);
    }
  }
  assert.equal(profile.dailyStatus().day, firstDay + 2); assert.deepEqual(profile.snapshot().stats, stats);
  assert.equal(profile.tournamentStatus().active.status, 'champion');
  assert.deepEqual(profile.tournamentStatus().medals, [{ tournamentId: 1, type: 'gold', day: firstDay + 2 }]);
  assert.equal(profile.leaveTournament().ok, true); assert.deepEqual(profile.snapshot().location, TOURNAMENT_RETURN_SPAWN);
  assert.equal(profile.tournamentStatus().active, null); assert.equal(profile.tournamentStatus().history[0].status, 'champion');
  assert.equal(create(storage).tournamentStatus().medals.length, 1); assert.equal(profile.canStartTournament().fee, 60);
});

for (const [losingDay, medal] of [[1, 'participation'], [2, 'bronze'], [3, 'silver']]) {
  test(`a defeat on tournament day ${losingDay} grants ${medal}, allows staying at the hotel and survives return home`, () => {
    const storage = new MemoryStorage(), profile = create(storage); tournamentReady(profile);
    for (let day = 1; day < losingDay; day++) { profile.recordTournamentFight(currentResult(profile)); profile.sleep(); }
    profile.recordTournamentFight(currentResult(profile, 'remi'));
    assert.equal(profile.tournamentStatus().active.status, 'eliminated');
    assert.equal(profile.tournamentStatus().medals[0].type, medal); assert.equal(profile.tournamentStatus().canFight, false);
    assert.equal(profile.sleep().ok, true); assert.deepEqual(profile.snapshot().location, HOTEL_ROOM_SPAWN);
    assert.equal(profile.tournamentStatus().active.day, losingDay, 'sleep after elimination does not invent a later match');
    profile.leaveTournament(); assert.equal(profile.tournamentStatus().medals.length, 1);
    assert.deepEqual(create(storage).snapshot(), profile.snapshot());
  });
}

test('early departure is a paid forfeit without a medal; retry costs less and receives a new match identity', () => {
  const storage = new MemoryStorage(), profile = create(storage); tournamentReady(profile);
  const oldResult = currentResult(profile); profile.recordTournamentFight(oldResult);
  const money = profile.moneyStatus().money;
  assert.equal(profile.leaveTournament().ok, true);
  assert.equal(profile.moneyStatus().money, money); assert.equal(profile.tournamentStatus().medals.length, 0);
  assert.equal(profile.tournamentStatus().history[0].status, 'forfeited');
  for (let i = 0; i < 3; i++) tour(profile);
  assert.equal(profile.startTournament().fee, 60);
  const before = profile.exportText();
  assert.equal(profile.recordTournamentFight(oldResult).ok, false); assert.equal(profile.exportText(), before);
  assert.equal(profile.tournamentStatus().currentMatchId, '2:1');
  assert.deepEqual(create(storage).snapshot(), profile.snapshot());
});

test('a drawn tournament bout is replayed for free on the same day without awarding a result or medal', () => {
  const profile = create(new MemoryStorage()); tournamentReady(profile);
  const before = profile.exportText(), result = currentResult(profile, 'draw');
  const replay = profile.recordTournamentFight(result);
  assert.equal(replay.ok, false); assert.equal(replay.replay, true);
  assert.equal(profile.exportText(), before); assert.equal(profile.sleep().ok, false);
  assert.equal(profile.recordTournamentFight({ ...result, winner: 'player' }).ok, true);
  assert.equal(profile.tournamentStatus().active.status, 'awaiting-sleep');
  assert.equal(profile.snapshot().fights.bellini.wins, 1);
});

test('pads and pool reward completed practice at modest unlocked caps and neither sleep nor cosmetics advances stats', () => {
  const profile = create(new MemoryStorage()); tournamentReady(profile);
  for (const activity of ['pads', 'pool']) assert.equal(profile.activityCost(activity), 10);
  assert.equal(profile.reward('pads', { completed: false, hits: 30, accuracy: 100 }).gained, 0);
  assert.equal(profile.reward('pool', { completed: true, laps: 2, accuracy: 100 }).gained, 0);
  for (let i = 0; i < 20; i++) {
    profile.reward('pads', { completed: true, hits: 12, accuracy: 60 });
    profile.reward('pool', { completed: true, laps: 3, accuracy: 60 });
  }
  assert.equal(profile.snapshot().stats.power, 10); assert.equal(profile.snapshot().stats.endurance, 124);
  assert.equal(profile.reward('pads', { completed: true, hits: 12, accuracy: 60 }).capped, true);
  const before = profile.snapshot().stats;
  profile.recordTournamentFight(currentResult(profile)); profile.sleep(); assert.deepEqual(profile.snapshot().stats, before);
});

test('match receipts prevent duplicate regular fight results across reload, with backward-compatible Béton calls', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  assert.equal(profile.recordFight({ winner: 'player', score: 3, matchId: 'session-1' }).ok, true);
  const reloaded = create(storage), before = reloaded.exportText();
  assert.equal(reloaded.recordFight({ winner: 'player', score: 3, matchId: 'session-1' }).duplicate, true);
  assert.equal(reloaded.exportText(), before);
  assert.equal(reloaded.recordFight({ opponent: 'kramer', winner: 'player', matchId: 'session-2' }).ok, true);
  assert.equal(reloaded.snapshot().fights.beton.wins, 1); assert.equal(reloaded.snapshot().fights.kramer.wins, 1);
});

test('all explorable destinations validate and survive transfer without changing energy', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  for (const scene of WORLD_SCENES) {
    profile.setLocation({ scene, x: 640, y: 540, facing: 'down' });
    assert.equal(create(storage).snapshot().location.scene, scene); assert.equal(profile.dailyStatus().energy, 100);
  }
});

test('invalid money, inventory, delivery and tournament data cannot replace the current saved game', () => {
  const storage = new MemoryStorage(), profile = create(storage); tournamentReady(profile);
  const before = profile.exportText(), saved = storage.getItem(CAREER_STORAGE_KEY);
  const mutations = [p => { delete p.wallet; }, p => { p.wallet.money = -1; }, p => { p.wallet.money = 501; },
    p => { p.wallet.money = 12.5; }, p => { p.wallet.totalEarned = 0; },
    p => { p.inventory.owned.push('invented'); }, p => { p.inventory.equipped.street = 'street-blue'; },
    p => { p.inventory.equipped.boxing = 'street-black'; }, p => { p.delivery.nextId = 0; },
    p => { p.delivery.active = { id: 1, stops: [...DELIVERY_STOPS], completed: [], earned: 0 }; },
    p => { p.tournament.active.day = 3; }, p => { p.tournament.active.status = 'champion'; },
    p => { p.tournament.active.medal = 'gold'; }, p => { p.tournament.entries = 0; },
    p => { p.tournament.medals = [{ tournamentId: 1, type: 'gold', day: 1 }]; },
    p => { p.fightReceipts = ['a', 'a']; }, p => { delete p.activities.pool; }, p => { delete p.fights.kramer; }];
  for (const mutate of mutations) {
    const raw = JSON.parse(before); mutate(raw);
    assert.throws(() => profile.inspectImport(JSON.stringify(raw)));
    assert.throws(() => profile.importText(JSON.stringify(raw)));
    assert.equal(profile.exportText(), before); assert.equal(storage.getItem(CAREER_STORAGE_KEY), saved);
  }
});

test('a failed chapter save reports the failure but export preserves in-memory transactions without duplicating old pay on reload', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.startDelivery(); const before = storage.getItem(CAREER_STORAGE_KEY);
  storage.setItem = () => { throw new Error('quota'); };
  const paid = profile.deliverParcel(DELIVERY_STOPS[0]);
  assert.equal(paid.ok, true); assert.equal(paid.saved, false); assert.match(paid.saveMessage, /indisponible/);
  assert.equal(JSON.parse(profile.exportText()).wallet.money, 6);
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), before);
  assert.equal(create(storage).moneyStatus().money, 0);
  const target = create(new MemoryStorage()); target.importText(profile.exportText());
  assert.equal(target.moneyStatus().money, 6); assert.equal(target.deliverParcel(DELIVERY_STOPS[0]).duplicate, true);
});

test('delivery timing survives scene changes and reload, cannot decrease, and resets only after the current parcel is paid', () => {
  const storage = new MemoryStorage(); let profile = create(storage);
  profile.startDelivery(); const money = profile.moneyStatus(), energy = profile.dailyStatus().energy;
  assert.equal(profile.recordDeliveryProgress({ elapsed: 38.25, bumps: 2 }).ok, true);
  profile.setLocation({ scene: 'commercial', x: 2265, y: 780, facing: 'left' });
  profile = create(storage);
  assert.equal(profile.deliveryStatus().active.elapsed, 38.25);
  assert.equal(profile.deliveryStatus().active.bumps, 2);
  const writes = storage.writes;
  assert.equal(profile.recordDeliveryProgress({ elapsed: 0, bumps: 0 }).unchanged, true);
  assert.equal(profile.recordDeliveryProgress({ elapsed: 38.25, bumps: 2 }).unchanged, true);
  assert.equal(storage.writes, writes, 'Repeated or stale saves must not reset or rewrite the trip');
  for (const invalid of [{ elapsed: -1 }, { elapsed: Infinity }, { elapsed: NaN }, { bumps: -1 }, { bumps: .5 }]) {
    assert.equal(profile.recordDeliveryProgress(invalid).ok, false);
    assert.equal(storage.writes, writes);
  }
  profile.recordDeliveryProgress({ elapsed: 63 });
  assert.equal(profile.deliveryStatus().active.bumps, 2);
  const beforeWrongDoor = profile.exportText();
  profile.deliverParcel(DELIVERY_STOPS[1]);
  assert.equal(profile.exportText(), beforeWrongDoor, 'A rejected delivery must keep its penalties');
  assert.deepEqual(profile.moneyStatus(), money); assert.equal(profile.dailyStatus().energy, energy);
  profile.deliverParcel(DELIVERY_STOPS[0], { tip: 0 });
  profile = create(storage);
  assert.equal(profile.moneyStatus().money, 5); assert.equal(profile.deliveryStatus().active.elapsed, 0);
  assert.equal(profile.deliveryStatus().active.bumps, 0); assert.equal(profile.deliveryStatus().nextStop, DELIVERY_STOPS[1]);
  profile.abandonDelivery(); assert.equal(profile.recordDeliveryProgress({ elapsed: 1, bumps: 0 }).ok, false);
});

test('early v3 delivery saves receive safe timing defaults while malformed present timing cannot replace progress', () => {
  const storage = new MemoryStorage(), original = create(storage); original.startDelivery();
  original.deliverParcel(DELIVERY_STOPS[0]); const raw = original.snapshot();
  delete raw.delivery.active.elapsed; delete raw.delivery.active.bumps;
  storage.setItem(CAREER_STORAGE_KEY, JSON.stringify(raw)); const profile = create(storage);
  assert.equal(profile.deliveryStatus().active.elapsed, 0); assert.equal(profile.deliveryStatus().active.bumps, 0);
  assert.equal(profile.deliveryStatus().nextStop, DELIVERY_STOPS[1]); assert.equal(profile.moneyStatus().money, 6);
  const current = profile.exportText();
  for (const patch of [{ elapsed: -1 }, { elapsed: null }, { elapsed: '50' }, { bumps: -1 }, { bumps: 1.5 }, { bumps: null }]) {
    const bad = JSON.parse(current); Object.assign(bad.delivery.active, patch);
    assert.throws(() => profile.importText(JSON.stringify(bad))); assert.equal(profile.exportText(), current);
  }
});

test('full training ceilings and savings cannot skip the victory-based Béton → Kramer → tournament order', () => {
  const profile = create(new MemoryStorage());
  for (let i = 0; i < 30; i++) {
    profile.reward('bag', { contacts: 12, accuracy: 100 });
    profile.reward('rope', { hits: 30, accuracy: 100 });
    profile.reward('speedball', { hits: 30, accuracy: 100 });
    profile.reward('sparring', { completed: true, rounds: 1, actions: 20 });
  }
  for (let i = 0; i < 10; i++) tour(profile);
  assert.deepEqual(profile.snapshot().stats, profile.snapshot().caps);
  assert.equal(profile.moneyStatus().money, 200);
  for (const winner of ['draw', 'remi']) profile.recordFight({ opponent: 'beton', winner });
  const before = profile.exportText();
  for (const opponent of ['kramer', 'bellini', 'fortin', 'gagnon']) assert.equal(Boolean(profile.canFight(opponent).ok), false);
  assert.equal(profile.recordFight({ opponent: 'kramer', winner: 'player' }).ok, false);
  assert.equal(profile.startTournament().ok, false); assert.equal(profile.exportText(), before);
  profile.recordFight({ opponent: 'beton', winner: 'player' });
  assert.equal(profile.canFight('kramer').ok, true); assert.equal(profile.canStartTournament().ok, false);
  for (const winner of ['draw', 'remi']) profile.recordFight({ opponent: 'kramer', winner });
  assert.equal(profile.canStartTournament().ok, false);
  profile.recordFight({ opponent: 'kramer', winner: 'player' });
  assert.equal(profile.startTournament().ok, true);
  assert.equal(profile.canFight('bellini').ok, true);
  assert.equal(profile.canFight('fortin').ok, false); assert.equal(profile.canFight('gagnon').ok, false);
  profile.recordTournamentFight(currentResult(profile));
  assert.equal(profile.canFight('bellini').ok, false); assert.equal(profile.canFight('fortin').ok, false);
  profile.sleep(); assert.equal(profile.canFight('fortin').ok, true); assert.equal(profile.canFight('gagnon').ok, false);
});
