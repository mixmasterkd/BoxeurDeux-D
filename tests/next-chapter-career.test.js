import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile, CAREER_VERSION, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS, LEGACY_FIGHT_IDS, trainingCaps } from '../src/game/ChapterRules.js';
import { NEXT_FIGHT_IDS, LEGACY_NEXT_FIGHT_IDS, AIRPORT_SPAWN, CUBA_PRICE, CUBA_HOME_SPAWN, CUBA_RETURN_SPAWN, CUBA_PLACES, postBronzeUnlocked } from '../src/game/NextChapterRules.js';

class Storage {
  values = new Map(); writes = 0;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); this.writes++; }
}
const make = (storage = new Storage()) => new CareerProfile({ storage, now: () => '2026-09-13T15:00:00Z' });
function enterCuba(profile) {
  const result = profile.startCuba();
  if (!result.ok) return result;
  profile.setLocation(AIRPORT_SPAWN);
  return profile.boardTravel('cuba');
}
function work(profile, tours = 1) {
  for (let i = 0; i < tours; i++) {
    if (profile.dailyStatus().energy < 30) assert.equal(profile.sleep().ok, true);
    assert.equal(profile.startDelivery().ok, true);
    for (const stop of DELIVERY_STOPS) assert.equal(profile.deliverParcel(stop, { tip: 2 }).ok, true);
  }
}
function enterBronze(profile) {
  profile.recordFight({ opponent: 'beton', winner: 'player', matchId: 'first' });
  profile.recordFight({ opponent: 'kramer', winner: 'player', matchId: 'second' });
  work(profile, 14);
  assert.equal(profile.startTournament().ok, true);
}
function finishBronze(profile, champion = false) {
  enterBronze(profile);
  do {
    const { opponent, currentMatchId } = profile.tournamentStatus();
    profile.recordTournamentFight({ opponent, matchId: currentMatchId, winner: champion ? 'player' : 'remi', score: 3 });
    if (profile.tournamentStatus().active.status === 'awaiting-sleep') profile.sleep();
    else break;
  } while (true);
  assert.equal(profile.leaveTournament().ok, true);
}

test('post-Bronze unlock requires a completed participation and return, including a first-round elimination', () => {
  const profile = make();
  for (const id of NEXT_FIGHT_IDS) assert.equal(profile.canFight(id).ok, false);
  enterBronze(profile);
  assert.equal(profile.cubaOffer().ok, false);
  const run = profile.tournamentStatus();
  profile.recordTournamentFight({ opponent: run.opponent, matchId: run.currentMatchId, winner: 'remi' });
  assert.equal(postBronzeUnlocked(profile.snapshot()), false, 'The first hotel stay must finish before chapter access');
  profile.leaveTournament();
  assert.equal(postBronzeUnlocked(profile.snapshot()), true);
  assert.equal(profile.canFight('dyrex').ok, true);
  assert.equal(profile.canFight('lefeu').ok, true);
  assert.equal(profile.canFight('louisto').ok, false);
  assert.equal(profile.cubaOffer().ok, true);
  assert.equal(profile.snapshot().tournament.medals[0].type, 'participation');
});

test('forfeiting the tournament does not unlock any post-Bronze challenge or technique', () => {
  const profile = make(); enterBronze(profile); profile.leaveTournament();
  assert.equal(postBronzeUnlocked(profile.snapshot()), false);
  for (const id of NEXT_FIGHT_IDS) assert.equal(profile.canFight(id).ok, false);
  assert.equal(profile.startCuba().ok, false);
  assert.equal(profile.unlockTechnique('doubleJab', { completed: true, source: 'octopus' }).ok, false);
});

for (const order of [['dyrex', 'lefeu', 'louisto'], ['lefeu', 'louisto', 'dyrex'], ['louisto', 'dyrex', 'lefeu']]) {
  test(`post-Bronze challenges can be won in free order ${order.join(' → ')} without money, energy or stat rewards`, () => {
    const profile = make(); finishBronze(profile);
    const base = profile.snapshot(), caps = trainingCaps(base.fights);
    for (const opponent of order) {
      if (opponent === 'louisto') enterCuba(profile);
      const before = profile.snapshot();
      assert.equal(profile.canFight(opponent).ok, true);
      assert.equal(profile.recordFight({ opponent, winner: 'player', score: 10, matchId: `new-${opponent}` }).ok, true);
      assert.deepEqual(profile.snapshot().stats, before.stats);
      assert.deepEqual(profile.snapshot().caps, caps);
      assert.deepEqual(profile.snapshot().wallet, before.wallet);
      assert.deepEqual(profile.snapshot().daily, before.daily);
      if (opponent === 'louisto') profile.leaveCuba();
    }
    for (const id of LEGACY_NEXT_FIGHT_IDS) assert.equal(profile.snapshot().fights[id].wins, 1);
  });
}

test('Cuba charges once, includes return, blocks overlapping activities and survives reload and all local locations', () => {
  const storage = new Storage(); let profile = make(storage); finishBronze(profile);
  const money = profile.moneyStatus().money, daily = profile.dailyStatus(), stats = profile.snapshot().stats;
  assert.equal(enterCuba(profile).ok, true);
  assert.equal(profile.moneyStatus().money, money - CUBA_PRICE);
  assert.deepEqual(profile.dailyStatus(), daily);
  assert.deepEqual(profile.snapshot().location, CUBA_HOME_SPAWN);
  const paid = profile.exportText(), writes = storage.writes;
  assert.equal(profile.startCuba().duplicate, true);
  assert.equal(profile.startDelivery().ok, false);
  assert.equal(profile.startTournament().ok, false);
  assert.equal(profile.canFight('dyrex').ok, false);
  assert.equal(profile.canFight('lefeu').ok, false);
  assert.equal(profile.canFight('beton').ok, false);
  assert.equal(profile.canFight('louisto').ok, true);
  assert.equal(profile.exportText(), paid); assert.equal(storage.writes, writes);
  for (const scene of CUBA_PLACES) {
    profile.setLocation({ scene, x: 500, y: 550, facing: 'left' });
    profile = make(storage);
    assert.equal(profile.snapshot().location.scene, scene);
    assert.equal(profile.cubaStatus().active.id, 1);
  }
  profile.spendEnergy('pads');
  const beforeSleep = profile.snapshot();
  assert.equal(profile.sleep().ok, true);
  assert.equal(profile.dailyStatus().day, daily.day + 1);
  assert.equal(profile.dailyStatus().energy, 100);
  assert.deepEqual(profile.snapshot().cuba, beforeSleep.cuba);
  assert.deepEqual(profile.snapshot().wallet, beforeSleep.wallet);
  assert.deepEqual(profile.snapshot().stats, stats);
  assert.deepEqual(profile.snapshot().location, CUBA_HOME_SPAWN);
  assert.equal(profile.leaveCuba().ok, true);
  assert.deepEqual(profile.snapshot().location, CUBA_RETURN_SPAWN);
  assert.equal(profile.cubaStatus().history.length, 1);
  const returned = profile.exportText();
  assert.equal(profile.leaveCuba().ok, false); assert.equal(profile.exportText(), returned);
  assert.equal(profile.canFight('louisto').ok, false);
  assert.deepEqual(make(storage).snapshot(), profile.snapshot());
});

test('Cuba at zero energy is possible, but insufficient funds and active delivery reject without mutation', () => {
  const profile = make(); finishBronze(profile);
  profile.sleep(); profile.startDelivery();
  const working = profile.exportText();
  assert.equal(profile.startCuba().ok, false); assert.equal(profile.exportText(), working);
  profile.abandonDelivery();
  while (profile.dailyStatus().energy >= 10) profile.spendEnergy('lesson');
  assert.equal(enterCuba(profile).ok, true);
  assert.equal(profile.dailyStatus().energy, 0);
  profile.leaveCuba();
  const broke = profile.exportText();
  assert.equal(profile.startCuba().ok, false); assert.match(profile.cubaOffer().message, /Il manque/);
  assert.equal(profile.exportText(), broke);
  profile.sleep(); work(profile, 8);
  assert.equal(enterCuba(profile).ok, true); assert.equal(profile.cubaStatus().active.id, 2);
});

test('old and repeated fight receipts cannot record a new result twice, including Louisto after reload', () => {
  const storage = new Storage(); let profile = make(storage); finishBronze(profile);
  for (const opponent of LEGACY_NEXT_FIGHT_IDS) {
    if (opponent === 'louisto') enterCuba(profile);
    const result = { opponent, matchId: 'one-attempt', winner: 'remi', score: 2 };
    assert.equal(profile.recordFight(result).ok, true);
    profile = make(storage); const saved = profile.exportText();
    assert.equal(profile.recordFight({ ...result, winner: 'player' }).duplicate, true);
    assert.equal(profile.exportText(), saved);
    assert.equal(profile.snapshot().fights[opponent].losses, 1);
  }
});

test('v3 migration retains the entire chapter including medals, gains, outfits, receipts and an active delivery', () => {
  const source = make(); finishBronze(source, true);
  source.buyItem('street-octopus'); source.equipItem('street-octopus', 'home');
  source.reward('pads', { completed: true, hits: 20, accuracy: 90 });
  source.sleep(); source.startDelivery(); source.deliverParcel(DELIVERY_STOPS[0]);
  source.recordDeliveryProgress({ elapsed: 31.25, bumps: 2 });
  source.setLocation({ scene: 'commercial', x: 520, y: 750, facing: 'left' });
  const old = source.snapshot(); old.version = 3; delete old.cuba; delete old.techniques;
  for (const id of NEXT_FIGHT_IDS) delete old.fights[id];
  const text = JSON.stringify(old), storage = new Storage(); storage.setItem(CAREER_STORAGE_KEY, text);
  const migrated = make(storage), snapshot = migrated.snapshot();
  assert.equal(snapshot.version, CAREER_VERSION);
  for (const key of ['revision', 'createdAt', 'updatedAt', 'daily', 'location', 'stats', 'caps', 'activities', 'wallet', 'inventory', 'delivery', 'tournament', 'fightReceipts']) assert.deepEqual(snapshot[key], old[key], key);
  for (const id of LEGACY_FIGHT_IDS) assert.deepEqual(snapshot.fights[id], old.fights[id]);
  assert.deepEqual(snapshot.techniques, { doubleJab: false }); assert.equal(snapshot.cuba.active, null);
  assert.equal(storage.getItem(CAREER_BACKUP_KEY), text);
  assert.deepEqual(make(storage).snapshot(), snapshot);
});

test('v3 active hotel stay remains intact and blocks Cuba after migration, without losing its pending sleep', () => {
  const source = make(); enterBronze(source);
  const match = source.tournamentStatus(); source.recordTournamentFight({ opponent: match.opponent, matchId: match.currentMatchId, winner: 'player' });
  const old = source.snapshot(); old.version = 3; delete old.cuba; delete old.techniques;
  for (const id of NEXT_FIGHT_IDS) delete old.fights[id];
  const target = make(); target.importText(JSON.stringify(old));
  assert.deepEqual(target.snapshot().tournament, old.tournament);
  assert.equal(target.startCuba().ok, false); assert.equal(target.sleep().ok, true);
  assert.equal(target.tournamentStatus().opponent, 'fortin');
});

test('double jab requires a completed Octopus drill after Bronze, persists once and changes no capacities', () => {
  const storage = new Storage(), profile = make(storage);
  const learned = { completed: true, source: 'octopus' };
  assert.equal(profile.unlockTechnique('doubleJab', learned).ok, false);
  finishBronze(profile);
  const before = profile.snapshot();
  for (const proof of [{}, { completed: false, source: 'octopus' }, { completed: true, source: 'fredo' }]) assert.equal(profile.unlockTechnique('doubleJab', proof).ok, false);
  assert.equal(profile.unlockTechnique('unknown', learned).ok, false);
  assert.equal(profile.unlockTechnique('doubleJab', learned).ok, true);
  const saved = profile.exportText(), writes = storage.writes;
  assert.equal(profile.unlockTechnique('doubleJab', learned).unchanged, true);
  assert.equal(profile.exportText(), saved); assert.equal(storage.writes, writes);
  for (const key of ['stats', 'caps', 'daily', 'wallet']) assert.deepEqual(profile.snapshot()[key], before[key]);
  assert.deepEqual(make(storage).snapshot().techniques, { doubleJab: true });
});

test('malformed current stays, duplicate identities, invalid technique and overlap reject import atomically', () => {
  const profile = make(); finishBronze(profile); enterCuba(profile);
  const saved = profile.exportText();
  for (const mutate of [p => { delete p.cuba; }, p => { p.cuba.active.fee = 0; }, p => { p.cuba.active.startedAtDay = p.daily.day + 1; },
    p => { p.cuba.nextId = 1; }, p => { p.cuba.history.push({ ...p.cuba.active, returnedAtDay: p.daily.day }); },
    p => { p.techniques.doubleJab = 'true'; }, p => { delete p.fights.dyrex; },
    p => { p.delivery.active = { id: 15, stops: [...DELIVERY_STOPS], completed: [], earned: 0, elapsed: 0, bumps: 0 }; p.delivery.nextId = 16; },
    p => { p.tournament.history[0].status = 'forfeited'; }]) {
    const bad = JSON.parse(saved); mutate(bad);
    assert.throws(() => profile.importText(JSON.stringify(bad)));
    assert.equal(profile.exportText(), saved);
  }
});

test('failed Cuba persistence stays playable and exports the paid trip without a second charge', () => {
  const storage = new Storage(), profile = make(storage); finishBronze(profile);
  storage.setItem = () => { throw new Error('quota'); };
  const entered = profile.startCuba(); assert.equal(entered.ok, true); assert.equal(entered.saved, false);
  const paid = profile.exportText(); assert.equal(profile.startCuba().duplicate, true); assert.equal(profile.exportText(), paid);
  const target = make(); target.importText(paid);
  assert.deepEqual(target.cubaStatus(), profile.cubaStatus());
  assert.equal(target.moneyStatus().money, profile.moneyStatus().money);
});
