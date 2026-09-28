import test from 'node:test';
import assert from 'node:assert/strict';
import {CareerProfile, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY, CAREER_VERSION} from '../src/game/CareerProfile.js';
import {DELIVERY_STOPS} from '../src/game/ChapterRules.js';
import {CASINO_ISLAND_RETURN, CASINO_ENTRANCE} from '../src/game/CasinoWorld.js';
import {CASINO_PLACES} from '../src/game/CasinoRules.js';
import {MARATHON_PLACES, MARATHON_START} from '../src/game/MarathonRules.js';
import {WORLD_SCENES, validLocation} from '../src/game/DayRules.js';
import {sceneForPlace} from '../src/game/SceneRouting.js';
import {createBlackjackGame} from '../src/game/casino/BlackjackGame.js';

class MemoryStorage {
  values = new Map();
  getItem(key) {return this.values.get(key) ?? null;}
  setItem(key, value) {this.values.set(key, value);}
}
const make = (storage = new MemoryStorage()) => new CareerProfile({storage, now: () => '2026-09-28T15:00:00Z'});
function ready(storage = new MemoryStorage()) {
  const p = make(storage);
  for (const opponent of ['beton', 'kramer']) p.recordFight({opponent, winner: 'player'});
  for (let n = 0; n < 14; n++) {
    if (p.dailyStatus().energy < 30) p.sleep();
    assert.equal(p.startDelivery().ok, true);
    for (const stop of DELIVERY_STOPS) assert.equal(p.deliverParcel(stop, {tip: 2}).ok, true);
  }
  assert.equal(p.startTournament().ok, true);
  const match = p.tournamentStatus();
  p.recordTournamentFight({opponent: match.opponent, matchId: match.currentMatchId, winner: 'remi'});
  assert.equal(p.leaveTournament().ok, true);
  return p;
}
const useSeed = (t, seed) => t.mock.method(globalThis.crypto, 'getRandomValues', values => {values[0] = seed; return values;});
const tableLocation = {scene: 'casino-tables', x: 1000, y: 800, facing: 'up'};

// The outdoor district is a visitable saved place, not a gaming room or a
// fifth checkpoint of the existing marathon. Casino rules remain unchanged.
test('casino island: outdoor is a separate routable place, outside gaming rooms and the race', () => {
  assert.equal(CASINO_ISLAND_RETURN.scene, 'casino-island');
  assert.equal(WORLD_SCENES.includes('casino-island'), true);
  assert.equal(CASINO_PLACES.includes('casino-island'), false);
  assert.equal(MARATHON_PLACES.includes('casino-island'), false);
  assert.equal(validLocation(CASINO_ISLAND_RETURN), true);
  assert.equal(sceneForPlace('casino-island'), 'CasinoIslandScene');
  for (const interior of CASINO_PLACES) assert.equal(sceneForPlace(interior), 'CasinoScene');
});

test('casino island: pre-Bronze outdoor visit reloads and imports without unlocking games or rewards', () => {
  const storage = new MemoryStorage(), p = make(storage), before = p.snapshot();
  assert.equal(p.setLocation(CASINO_ISLAND_RETURN).ok, true);
  assert.equal(p.snapshot().location.scene, 'casino-island'); assert.equal(p.casinoStatus().unlocked, false);
  assert.equal(p.moneyStatus().cap, 200);
  for (const key of ['wallet', 'casino', 'daily', 'stats', 'fights', 'tournament']) assert.deepEqual(p.snapshot()[key], before[key], key);
  const save = p.exportText();
  for (const game of ['blackjack', 'roulette', 'slots', 'poker']) assert.equal(p.casinoStart(game).ok, false);
  assert.equal(p.exportText(), save); assert.equal(p.casinoExchange(1).ok, false);
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
  const copy = make(); copy.importText(save);
  assert.deepEqual(copy.snapshot().location, CASINO_ISLAND_RETURN); assert.equal(copy.casinoStatus().unlocked, false);
});

test('casino island: old V5 save at the former entrance remains on the original island after migration', () => {
  const source = make(), oldDoor = {scene: 'marathon-island', x: 420, y: 780, facing: 'up'};
  source.setLocation(oldDoor); const legacy = source.snapshot(); legacy.version = 5; delete legacy.casino;
  const storage = new MemoryStorage(), text = JSON.stringify(legacy); storage.setItem(CAREER_STORAGE_KEY, text);
  const migrated = make(storage);
  assert.equal(migrated.snapshot().version, CAREER_VERSION); assert.deepEqual(migrated.snapshot().location, oldDoor);
  assert.equal(sceneForPlace(migrated.snapshot().location.scene), 'MarathonScene');
  assert.equal(storage.getItem(CAREER_BACKUP_KEY), text);
  for (const key of ['wallet', 'daily', 'stats', 'fights', 'tournament', 'marathon']) assert.deepEqual(migrated.snapshot()[key], legacy[key], key);
  assert.deepEqual(make(storage).snapshot(), migrated.snapshot());
});

test('casino island: old current-version save at former door is neither relabeled nor teleported into the lobby', () => {
  const p = ready(), oldDoor = {scene: 'marathon-island', x: 420, y: 820, facing: 'down'};
  p.setLocation(oldDoor); const oldSave = p.exportText(), copy = make(); copy.importText(oldSave);
  assert.deepEqual(copy.snapshot().location, oldDoor); assert.equal(copy.casinoStatus().unlocked, true);
  assert.equal(copy.casinoStatus().rounds, 0); assert.deepEqual(copy.snapshot().wallet, p.snapshot().wallet);
});

test('casino island: exiting after a completed round preserves chips, result, energy and original save version', t => {
  useSeed(t, 512); const storage = new MemoryStorage(), p = ready(storage);
  p.setLocation(CASINO_ENTRANCE); assert.equal(p.casinoExchange(20).ok, true);
  assert.equal(p.casinoStart('slots', {machineId: 'cerises'}).ok, true);
  assert.equal(p.casinoStatus().active.settled, true);
  const before = p.snapshot(); assert.equal(p.setLocation(CASINO_ISLAND_RETURN).ok, true);
  for (const key of ['wallet', 'casino', 'daily', 'stats', 'version']) assert.deepEqual(p.snapshot()[key], before[key], key);
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
  const outside = p.exportText(); assert.equal(p.casinoOffer('slots').ok, false); assert.equal(p.casinoExchange(-1).ok, false);
  assert.equal(p.exportText(), outside);
  p.setLocation(CASINO_ENTRANCE); assert.equal(p.casinoDismiss().ok, true);
  const chips = p.casinoStatus().chips;
  if (chips) assert.equal(p.casinoExchange(-chips).ok, true);
  assert.equal(p.casinoStatus().chips, 0); assert.equal(p.moneyStatus().money, before.wallet.money + chips);
});

test('casino island: unfinished hand cannot leave for outside or import a forged outside resume point', t => {
  let seed = 1; while (createBlackjackGame({seed}).status !== 'playing') seed++;
  useSeed(t, seed); const storage = new MemoryStorage(), p = ready(storage);
  p.setLocation(CASINO_ENTRANCE); p.casinoExchange(20); p.setLocation(tableLocation);
  assert.equal(p.casinoStart('blackjack', {bet: 1}).ok, true);
  const before = p.exportText();
  assert.equal(p.setLocation(CASINO_ISLAND_RETURN).ok, false); assert.equal(p.exportText(), before);
  const invalid = p.snapshot(); invalid.location = {...CASINO_ISLAND_RETURN};
  assert.throws(() => p.importText(JSON.stringify(invalid))); assert.equal(p.exportText(), before);
  const resumed = make(storage); assert.equal(resumed.exportText(), before);
  assert.equal(resumed.snapshot().location.scene, 'casino-tables'); assert.equal(resumed.casinoStatus().active.settled, false);
});

test('casino island: marathon registration survives an outdoor visit without starting the race', () => {
  const storage = new MemoryStorage(), p = ready(storage); assert.equal(p.registerMarathon().ok, true);
  const before = p.snapshot(); assert.equal(p.setLocation(CASINO_ISLAND_RETURN).ok, true);
  assert.deepEqual(p.snapshot().marathon, before.marathon); assert.deepEqual(p.snapshot().wallet, before.wallet);
  assert.deepEqual(p.snapshot().daily, before.daily); assert.equal(p.casinoStatus().available, true);
  const visiting = p.exportText(); assert.equal(p.startMarathon().ok, false); assert.equal(p.exportText(), visiting);
  assert.deepEqual(make(storage).snapshot(), p.snapshot());
  p.setLocation(MARATHON_START); assert.equal(p.startMarathon().ok, true);
  assert.equal(p.casinoStatus().available, false);
});

test('casino island: active race cannot use the new sector as a checkpoint or unlock table access', () => {
  const p = ready(); p.registerMarathon(); p.setLocation(MARATHON_START); p.startMarathon();
  const before = p.exportText();
  assert.equal(p.recordMarathonProgress({elapsed: 5, checkpoint: CASINO_ISLAND_RETURN}).ok, false);
  assert.equal(p.casinoStatus().available, false); assert.equal(p.casinoOffer('blackjack').ok, false); assert.equal(p.exportText(), before);
  const invalid = p.snapshot(); invalid.marathon.active.checkpoint = {...CASINO_ISLAND_RETURN};
  assert.throws(() => p.importText(JSON.stringify(invalid))); assert.equal(p.exportText(), before);
});
