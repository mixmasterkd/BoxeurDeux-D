import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY } from '../src/game/CareerProfile.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}
const create = storage => new CareerProfile({ storage, now: () => '2026-09-11T12:00:00Z' });
const qualified = {
  bag: { contacts: 9, accuracy: 66 }, speedball: { hits: 30, accuracy: 80 },
  rope: { hits: 25, accuracy: 75 }, sparring: { completed: true, rounds: 3, actions: 10 },
};

test('qualified gym gains survive reopening and all four capacities stop at the Béton caps', () => {
  const storage = new MemoryStorage(), first = create(storage);
  assert.equal(first.hasProgress(), false);
  assert.equal(first.reward('rope', qualified.rope).gained, 2);
  assert.equal(first.reward('speedball', qualified.speedball).gained, .02);
  assert.equal(first.reward('bag', qualified.bag).gained, 1);
  assert.equal(first.reward('sparring', qualified.sparring).gained, 2);
  const reloaded = create(storage);
  assert.deepEqual(reloaded.bonuses(), { maxStamina: 102, recoveryBonus: .02, maxResistance: 102, powerBonus: 1 });
  for (let i = 0; i < 12; i++) for (const [activity, metrics] of Object.entries(qualified)) reloaded.reward(activity, metrics);
  assert.deepEqual(reloaded.snapshot().stats, { power: 5, recovery: 1.10, endurance: 110, resistance: 108 });
  for (const [activity, metrics] of Object.entries(qualified)) {
    const capped = reloaded.reward(activity, metrics);
    assert.equal(capped.gained, 0); assert.equal(capped.capped, true); assert.equal(capped.saved, true);
  }
  assert.deepEqual(create(storage).snapshot().stats, reloaded.snapshot().stats);
});

test('unfinished, inaccurate, low-volume and mirror practice do not create free bonuses', () => {
  const profile = create(new MemoryStorage());
  for (const [activity, metrics] of [
    ['speedball', { hits: 19, accuracy: 100 }], ['rope', { hits: 40, accuracy: 59 }],
    ['rope', { hits: 31, accuracy: 60, qualified: false }],
    ['bag', { contacts: 5, accuracy: 100 }], ['sparring', { completed: false, rounds: 3, actions: 12 }],
    ['sparring', { completed: 'yes', rounds: 3, actions: 12 }], ['sparring', { completed: true, rounds: 3, actions: 9 }], ['shadow', { seconds: 6000 }],
  ]) assert.equal(profile.reward(activity, metrics).gained, 0);
  assert.deepEqual(profile.bonuses(), { maxStamina: 100, recoveryBonus: 0, maxResistance: 100, powerBonus: 0 });
  assert.equal(profile.snapshot().activities.speedball.sessions, 1);
  assert.equal(profile.snapshot().activities.shadow.sessions, 1);
});

test('export transfers progression and combat history while import preview changes nothing', () => {
  const source = create(new MemoryStorage());
  source.reward('bag', qualified.bag); source.recordFight({ winner: 'player', score: 8 });
  source.recordFight({ winner: 'remi', score: 3 }); source.recordFight({ winner: 'draw', score: 8 });
  const storage = new MemoryStorage(), target = create(storage);
  const before = target.snapshot();
  assert.equal(target.inspectImport(source.exportText()).stats.power, 1);
  assert.deepEqual(target.snapshot(), before); assert.equal(storage.getItem(CAREER_STORAGE_KEY), null);
  target.importText(source.exportText());
  assert.equal(target.snapshot().stats.power, 1);
  assert.deepEqual(target.snapshot().fights.beton, { wins: 1, losses: 1, draws: 1, attempts: 3, bestScore: 8 });
  assert.deepEqual(create(storage).snapshot(), target.snapshot());
});

test('non-save JSON, future versions, malformed schemas and invalid numbers cannot replace a valid game', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.reward('rope', qualified.rope);
  const before = profile.exportText(), saved = storage.getItem(CAREER_STORAGE_KEY);
  const mutate = callback => { const value = JSON.parse(before); callback(value); return JSON.stringify(value); };
  for (const invalid of ['{}', '[]', 'null', '42', '{bad',
    mutate(p => { p.version = 2; }), mutate(p => { delete p.stats; }),
    mutate(p => { delete p.activities.rope; }), mutate(p => { p.stats.endurance = '110'; }),
    mutate(p => { p.revision = -1; }), mutate(p => { p.createdAt = 'hier'; }),
    mutate(p => { p.activities.bag.sessions = 1.5; }), mutate(p => { p.fights.beton.wins = 4; }),
    mutate(p => { p.stats.recovery = null; }),
  ]) {
    assert.throws(() => profile.importText(invalid));
    assert.equal(profile.exportText(), before); assert.equal(storage.getItem(CAREER_STORAGE_KEY), saved);
  }
});

test('imported ceilings cannot bypass the current progression tier', () => {
  const profile = create(new MemoryStorage()), raw = profile.snapshot();
  raw.stats = { power: 9999, recovery: 50, endurance: 9000, resistance: 1000 };
  raw.caps = { power: 9999, recovery: 50, endurance: 9000, resistance: 1000 };
  profile.importText(JSON.stringify(raw));
  assert.deepEqual(profile.snapshot().caps, { power: 5, recovery: 1.10, endurance: 110, resistance: 108 });
  assert.deepEqual(profile.snapshot().stats, profile.snapshot().caps);
});

test('the previous valid save is recovered after primary corruption and remains a valid backup', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.reward('bag', qualified.bag); const previous = profile.snapshot();
  profile.reward('rope', qualified.rope);
  assert.deepEqual(JSON.parse(storage.getItem(CAREER_BACKUP_KEY)), previous);
  storage.setItem(CAREER_STORAGE_KEY, '{cassé');
  const recovered = create(storage);
  assert.deepEqual(recovered.snapshot(), previous);
  assert.equal(recovered.saveStatus().state, 'recovered'); assert.equal(recovered.saveStatus().backupAvailable, true);
  assert.equal(storage.getItem(`${CAREER_STORAGE_KEY}-corrupt`), '{cassé');
  assert.deepEqual(create(storage).snapshot(), previous);
  recovered.reward('speedball', qualified.speedball);
  assert.deepEqual(JSON.parse(storage.getItem(CAREER_BACKUP_KEY)), previous);
});

test('bad primary and backup data never crash startup or pretend to have saved', () => {
  const storage = new MemoryStorage(); storage.setItem(CAREER_STORAGE_KEY, '{}'); storage.setItem(CAREER_BACKUP_KEY, '{cassé');
  const profile = create(storage);
  assert.equal(profile.hasProgress(), false); assert.equal(profile.saveStatus().state, 'invalid');
  assert.equal(profile.saveStatus().persisted, false);
});

test('future local save is protected from incidental writes by an older game', () => {
  const storage = new MemoryStorage(), raw = create(new MemoryStorage()).snapshot(); raw.version = 2;
  const text = JSON.stringify(raw); storage.setItem(CAREER_STORAGE_KEY, text);
  const profile = create(storage);
  assert.equal(profile.saveStatus().state, 'incompatible');
  const reward = profile.reward('rope', qualified.rope);
  assert.equal(reward.saved, false); assert.equal(storage.getItem(CAREER_STORAGE_KEY), text);
  profile.reset();
  assert.equal(JSON.parse(storage.getItem(CAREER_STORAGE_KEY)).version, 1);
});

test('blocked reads, writes, and missing storage retain playable in-memory progress and honest status', () => {
  for (const storage of [null, { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
    { getItem() { return null; }, setItem() { throw new Error('full'); } }]) {
    const profile = create(storage);
    const reward = profile.reward('rope', qualified.rope);
    assert.equal(reward.gained, 2); assert.equal(reward.saved, false);
    assert.equal(profile.saveStatus().state, 'unavailable');
    assert.equal(profile.snapshot().stats.endurance, 102);
    const exported = profile.exportText();
    assert.doesNotThrow(() => profile.importText(exported)); assert.doesNotThrow(() => profile.reset());
  }
});

test('a failed write preserves the last persistent game; exporting still includes unsaved gains', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.reward('bag', qualified.bag); const original = storage.getItem(CAREER_STORAGE_KEY);
  const write = storage.setItem.bind(storage); storage.setItem = () => { throw new Error('quota'); };
  profile.reward('rope', qualified.rope);
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), original);
  assert.equal(profile.saveStatus().persisted, false);
  assert.equal(JSON.parse(profile.exportText()).stats.endurance, 102);
  storage.setItem = write;
  profile.reward('speedball', qualified.speedball);
  assert.equal(profile.saveStatus().persisted, true);
  assert.equal(create(storage).snapshot().stats.endurance, 102);
  assert.equal(storage.getItem(CAREER_BACKUP_KEY), original);
});

test('new game resets only after the explicit API call and preserves the previous game as backup', () => {
  const storage = new MemoryStorage(), profile = create(storage);
  profile.reward('bag', qualified.bag); const previous = profile.snapshot();
  profile.reset();
  assert.equal(profile.hasProgress(), false); assert.equal(create(storage).hasProgress(), false);
  assert.deepEqual(JSON.parse(storage.getItem(CAREER_BACKUP_KEY)), previous);
  const snap = profile.snapshot(); snap.stats.power = 999;
  assert.equal(profile.snapshot().stats.power, 0);
});
