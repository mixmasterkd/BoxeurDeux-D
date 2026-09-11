import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY, CAREER_VERSION } from '../src/game/CareerProfile.js';
import { ACTIVITY_COSTS, HOME_SPAWN, LEGACY_GYM_SPAWN, LOCATION_LIMIT } from '../src/game/DayRules.js';

class MemoryStorage {
  constructor() { this.values = new Map(); this.writes = 0; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); this.writes += 1; }
}
const create = storage => new CareerProfile({ storage, now: () => '2026-09-11T14:00:00Z' });
const legacy = () => {
  const profile = create(null);
  profile.reward('bag', { contacts: 9, accuracy: 80 });
  profile.reward('rope', { hits: 30, accuracy: 90 });
  profile.recordFight({ winner: 'player', score: 13 });
  const value = profile.snapshot();
  value.version = 1; delete value.daily; delete value.location;
  return value;
};

test('new games start at home with a full first day, independently of combat stamina', () => {
  const profile = create(new MemoryStorage());
  assert.deepEqual(profile.dailyStatus(), { day: 1, energy: 100, maxEnergy: 100 });
  assert.deepEqual(profile.snapshot().location, HOME_SPAWN);
  assert.equal(profile.snapshot().version, 2);
  const daily = profile.dailyStatus(); daily.energy = 0;
  assert.equal(profile.dailyStatus().energy, 100, 'status does not expose mutable profile state');
  profile.spendEnergy('sparring');
  assert.equal(profile.bonuses().maxStamina, 100, 'daily spending never weakens a combat stat');
});

test('a v1 player is migrated at the gym without losing gains or fight history; the original file is backed up', () => {
  const storage = new MemoryStorage(), old = legacy(), text = JSON.stringify(old);
  storage.setItem(CAREER_STORAGE_KEY, text);
  const profile = create(storage), result = profile.snapshot();
  assert.equal(result.version, CAREER_VERSION);
  assert.equal(result.revision, old.revision, 'migration is not a reward or player action');
  for (const key of ['stats', 'caps', 'activities', 'fights', 'createdAt', 'updatedAt']) assert.deepEqual(result[key], old[key]);
  assert.deepEqual(result.location, LEGACY_GYM_SPAWN);
  assert.deepEqual(result.daily, { day: 1, energy: 100, maxEnergy: 100 });
  assert.equal(storage.getItem(CAREER_BACKUP_KEY), text);
  assert.deepEqual(JSON.parse(storage.getItem(CAREER_STORAGE_KEY)), result, 'migration is saved before another game action');
  assert.deepEqual(create(storage).snapshot(), result);
});

test('v1 import preview is read-only and confirmation preserves progress with migrated day data', () => {
  const storage = new MemoryStorage(), target = create(storage), old = legacy();
  target.spendEnergy('rope');
  const before = target.exportText(), writes = storage.writes;
  const preview = target.inspectImport(JSON.stringify(old));
  assert.deepEqual(preview.location, LEGACY_GYM_SPAWN);
  assert.equal(preview.daily.energy, 100);
  assert.equal(target.exportText(), before); assert.equal(storage.writes, writes);
  target.importText(JSON.stringify(old));
  assert.deepEqual(target.snapshot().stats, old.stats);
  assert.deepEqual(create(storage).snapshot(), target.snapshot());
});

test('training costs are charged only at start; insufficient energy rejects the whole transaction', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  for (const id of ['bag', 'rope', 'speedball', 'sparring', 'lesson', 'shadow']) {
    const before = profile.dailyStatus().energy, writes = storage.writes;
    const offer = profile.canStartActivity(id);
    assert.equal(offer.ok, true); assert.equal(offer.cost, ACTIVITY_COSTS[id]);
    assert.equal(profile.dailyStatus().energy, before); assert.equal(storage.writes, writes);
    const spent = profile.spendEnergy(id);
    assert.equal(spent.ok, true); assert.equal(spent.saved, true);
    assert.equal(spent.energy, before - ACTIVITY_COSTS[id]);
  }
  assert.equal(profile.dailyStatus().energy, 20);
  assert.equal(profile.spendEnergy('sparring').energy, 0, 'exactly enough energy is accepted');
  const before = profile.exportText(), writes = storage.writes;
  const refused = profile.spendEnergy('shadow');
  assert.equal(refused.ok, false); assert.match(refused.message, /dormir/);
  assert.equal(profile.exportText(), before); assert.equal(storage.writes, writes);
  assert.equal(profile.snapshot().activities.rope.sessions, 0, 'starting alone never counts a finished session or earns a bonus');
  assert.equal(profile.snapshot().stats.endurance, 100);
  assert.deepEqual(create(storage).snapshot(), profile.snapshot());
});

test('fights remain accessible at zero daily energy and an unknown activity cannot silently be free', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  for (let i = 0; i < 5; i++) profile.spendEnergy('sparring');
  const before = profile.exportText(), writes = storage.writes;
  assert.equal(profile.canStartActivity('fight').ok, true);
  assert.equal(profile.spendEnergy('fight').cost, 0);
  assert.equal(profile.exportText(), before); assert.equal(storage.writes, writes);
  assert.throws(() => profile.spendEnergy('walking'));
  assert.throws(() => profile.canStartActivity('__proto__'));
  assert.equal(profile.exportText(), before);
});

test('sleep advances exactly one day, restores only daily energy, and keeps a home position and all acquired progress', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.importText(JSON.stringify(legacy()));
  profile.spendEnergy('rope'); profile.spendEnergy('bag');
  profile.setLocation({ scene: 'home', x: 825, y: 401, facing: 'up' });
  const before = profile.snapshot(), writes = storage.writes;
  assert.equal(profile.dailyStatus().day, 1, 'merely entering the house does not sleep');
  assert.equal(storage.writes, writes, 'examining the day does not mutate storage');
  const sleep = profile.sleep(), after = profile.snapshot();
  assert.equal(sleep.ok, true); assert.equal(sleep.saved, true);
  assert.deepEqual(after.daily, { day: 2, energy: 100, maxEnergy: 100 });
  for (const key of ['stats', 'caps', 'activities', 'fights', 'location']) assert.deepEqual(after[key], before[key]);
  assert.deepEqual(create(storage).snapshot(), after);
  profile.sleep();
  assert.equal(profile.dailyStatus().day, 3, 'sleeping at full energy still advances to the next day');
  assert.deepEqual(profile.snapshot().stats, before.stats, 'repeated sleeping grants no passive skill bonus');
});

test('sleep from an old gym save resumes safely at home; New game resets day, energy, location and gains together', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.importText(JSON.stringify(legacy()));
  profile.sleep();
  assert.deepEqual(profile.snapshot().location, HOME_SPAWN);
  profile.spendEnergy('bag'); const previous = profile.snapshot();
  profile.reset();
  assert.deepEqual(profile.dailyStatus(), { day: 1, energy: 100, maxEnergy: 100 });
  assert.deepEqual(profile.snapshot().location, HOME_SPAWN);
  assert.equal(profile.snapshot().stats.power, 0);
  assert.deepEqual(JSON.parse(storage.getItem(CAREER_BACKUP_KEY)), previous);
});

test('walking and changing places cost no energy, persist the resume point, and identical coordinates do not write again', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  const point = { scene: 'neighborhood', x: 1845.5, y: 750.25, facing: 'left' };
  profile.setLocation(point);
  const result = profile.snapshot(), writes = storage.writes;
  assert.equal(result.daily.energy, 100);
  assert.deepEqual(create(storage).snapshot().location, point);
  profile.setLocation({ ...point, unused: 'ignored' });
  assert.equal(storage.writes, writes); assert.deepEqual(profile.snapshot(), result);
  point.x = 0;
  assert.equal(profile.snapshot().location.x, 1845.5, 'caller cannot mutate the saved location');
  const returned = profile.setLocation(profile.snapshot().location); returned.location.y = 0;
  assert.equal(profile.snapshot().location.y, 750.25);
});

test('malformed imported days and locations leave both the current game and its saved file untouched', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.spendEnergy('bag');
  const before = profile.exportText(), persisted = storage.getItem(CAREER_STORAGE_KEY);
  const mutations = [
    p => { delete p.daily; }, p => { p.daily.day = 0; }, p => { p.daily.day = 1.5; },
    p => { p.daily.day = Number.MAX_SAFE_INTEGER + 1; }, p => { p.daily.energy = -1; },
    p => { p.daily.energy = 101; }, p => { p.daily.energy = 10.5; }, p => { p.daily.energy = '80'; },
    p => { p.daily.maxEnergy = 1000; }, p => { delete p.location; },
    p => { p.location.scene = 'sparring'; }, p => { p.location.facing = 'diagonal'; },
    p => { p.location.x = -1; }, p => { p.location.x = LOCATION_LIMIT + 1; },
    p => { p.location.y = null; }, p => { p.location.y = '540'; },
  ];
  for (const mutate of mutations) {
    const raw = JSON.parse(before); mutate(raw);
    assert.throws(() => profile.inspectImport(JSON.stringify(raw)));
    assert.throws(() => profile.importText(JSON.stringify(raw)));
    assert.equal(profile.exportText(), before); assert.equal(storage.getItem(CAREER_STORAGE_KEY), persisted);
  }
  for (const location of [null, [], { ...HOME_SPAWN, x: NaN }, { ...HOME_SPAWN, y: Infinity }]) {
    assert.throws(() => profile.setLocation(location)); assert.equal(profile.exportText(), before);
  }
});

test('day, depleted energy and neighborhood position transfer together through export/import and reload', () => {
  const source = create(new MemoryStorage());
  source.sleep(); source.sleep(); source.spendEnergy('rope'); source.spendEnergy('speedball');
  source.setLocation({ scene: 'neighborhood', x: 2050, y: 946, facing: 'right' });
  const targetStorage = new MemoryStorage(), target = create(targetStorage);
  target.importText(source.exportText());
  const resumed = create(targetStorage).snapshot();
  assert.deepEqual(resumed.daily, { day: 3, energy: 70, maxEnergy: 100 });
  assert.deepEqual(resumed.location, source.snapshot().location);
  assert.deepEqual(resumed.stats, source.snapshot().stats);
});

test('failed storage writes keep the playable day in memory and report that the newest state is unsaved', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.spendEnergy('bag'); const persisted = storage.getItem(CAREER_STORAGE_KEY);
  storage.setItem = () => { throw new Error('quota'); };
  const spend = profile.spendEnergy('rope');
  assert.equal(spend.ok, true); assert.equal(spend.energy, 70); assert.equal(spend.saved, false);
  assert.match(spend.message, /Sauvegarde locale indisponible/);
  const sleep = profile.sleep();
  assert.equal(sleep.ok, true); assert.equal(sleep.day, 2); assert.equal(sleep.saved, false);
  assert.match(sleep.message, /Sauvegarde locale indisponible/);
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), persisted);
  assert.deepEqual(JSON.parse(profile.exportText()).daily, { day: 2, energy: 100, maxEnergy: 100 });
  assert.match(profile.saveStatus().message, /exportez/);
});

test('a failed migration never destroys the original v1 save or reports the migrated state as saved', () => {
  const storage = new MemoryStorage(), old = JSON.stringify(legacy());
  storage.setItem(CAREER_STORAGE_KEY, old);
  storage.setItem = () => { throw new Error('quota'); };
  const profile = create(storage);
  assert.equal(profile.snapshot().version, 2);
  assert.equal(profile.saveStatus().persisted, false);
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), old);
  assert.deepEqual(profile.snapshot().stats, JSON.parse(old).stats);
  assert.doesNotThrow(() => profile.inspectImport(profile.exportText()));
});

test('a damaged primary can recover and migrate a valid v1 backup', () => {
  const storage = new MemoryStorage(), old = legacy();
  storage.setItem(CAREER_STORAGE_KEY, '{broken'); storage.setItem(CAREER_BACKUP_KEY, JSON.stringify(old));
  const profile = create(storage);
  assert.equal(profile.saveStatus().state, 'recovered');
  assert.equal(profile.snapshot().version, 2);
  assert.deepEqual(profile.snapshot().stats, old.stats);
  assert.deepEqual(profile.snapshot().location, LEGACY_GYM_SPAWN);
  assert.deepEqual(create(storage).snapshot(), profile.snapshot());
});

test('day operations cannot overwrite a future-version save', () => {
  const storage = new MemoryStorage(), raw = create(null).snapshot(); raw.version = CAREER_VERSION + 1;
  const original = JSON.stringify(raw); storage.setItem(CAREER_STORAGE_KEY, original);
  const profile = create(storage);
  assert.equal(profile.spendEnergy('rope').saved, false);
  assert.equal(profile.sleep().saved, false);
  assert.equal(profile.setLocation(LEGACY_GYM_SPAWN).saved, false);
  assert.equal(profile.saveStatus().state, 'incompatible');
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), original);
});

test('the last representable day cannot overflow into an invalid save', () => {
  const profile = create(new MemoryStorage()), raw = profile.snapshot(); raw.daily.day = Number.MAX_SAFE_INTEGER;
  profile.importText(JSON.stringify(raw)); const before = profile.exportText();
  assert.equal(profile.sleep().ok, false);
  assert.equal(profile.exportText(), before);
});
