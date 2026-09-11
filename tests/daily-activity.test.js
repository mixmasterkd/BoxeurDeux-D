import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile } from '../src/game/CareerProfile.js';
import { DailyActivityGate, sparringActivity } from '../src/game/DailyActivityGate.js';
import { BagSession } from '../src/game/BagSession.js';
import { RhythmSession } from '../src/game/RhythmSession.js';
import { ShadowSession } from '../src/game/ShadowSession.js';
import { SparringSession } from '../src/game/SparringSession.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const activities = [
  ['bag', () => new BagSession(), 15], ['rope', () => new RhythmSession({ activity: 'rope' }), 15],
  ['speedball', () => new RhythmSession({ activity: 'speedball' }), 15], ['shadow', () => new ShadowSession(), 5],
  ['sparring', () => new SparringSession(), 20], ['lesson', () => new SparringSession({ lesson: 'jab' }), 10],
];

test('entering, starting twice, pausing, resuming and restarting have distinct daily costs in every real session model', () => {
  for (const [activity, createSession, cost] of activities) {
    const profile = new CareerProfile({ storage: new MemoryStorage() });
    const session = createSession();
    const gate = new DailyActivityGate({ profile, getState: () => session.state, activity });
    const begin = () => { session.reset(); session.start(); };
    assert.equal(profile.dailyStatus().energy, 100, `${activity}: entering remains free`);
    assert.equal(gate.start(begin).ok, true);
    assert.equal(profile.dailyStatus().energy, 100 - cost);
    assert.equal(gate.start(begin).ok, false, `${activity}: stale double activation must not restart`);
    session.pause(); session.resume(); session.pause();
    assert.equal(profile.dailyStatus().energy, 100 - cost, `${activity}: pause/resume preserves the day`);
    assert.equal(gate.start(begin).ok, true, `${activity}: explicit restart is a new session`);
    assert.equal(profile.dailyStatus().energy, 100 - cost * 2);
  }
});

test('abandoned attempts remain spent after reload, while insufficient energy leaves the paused session resumable', () => {
  const storage = new MemoryStorage();
  let profile = new CareerProfile({ storage });
  for (let attempt = 0; attempt < 6; attempt++) {
    const session = new RhythmSession({ activity: 'rope' });
    const gate = new DailyActivityGate({ profile, getState: () => session.state, activity: 'rope' });
    assert.equal(gate.start(() => session.start()).ok, true);
    profile = new CareerProfile({ storage });
  }
  assert.equal(profile.dailyStatus().energy, 10);
  const session = new ShadowSession();
  const gate = new DailyActivityGate({ profile, getState: () => session.state, activity: 'shadow' });
  const start = () => { session.reset(); session.start(); };
  gate.start(start); session.pause(); gate.start(start); session.pause();
  assert.equal(profile.dailyStatus().energy, 0);
  const before = structuredClone(session.state);
  assert.equal(gate.start(start).ok, false);
  assert.deepEqual(session.state, before, 'failed restart cannot discard the existing paused session');
  assert.equal(session.resume(), true, 'resume remains available even on an empty day');
  assert.equal(new CareerProfile({ storage }).dailyStatus().energy, 0);
});

test('a three-round resistance session is charged once; a new match with Béton remains free on an empty day', () => {
  const profile = new CareerProfile({ storage: new MemoryStorage() });
  const session = new SparringSession({ lesson: 'resistance', duration: 1 });
  const gate = new DailyActivityGate({ profile, getState: () => session.state, activity: () => sparringActivity(session.state.settings) });
  gate.start(() => session.start());
  for (let round = 1; round <= 3; round++) {
    for (let i = 0; i < 61; i++) session.update(1 / 60);
    assert.equal(profile.dailyStatus().energy, 80);
    assert.equal(session.state.phase, round < 3 ? 'between' : 'finished');
    if (round < 3) assert.equal(session.nextRound(), true);
  }
  for (let i = 0; i < 4; i++) profile.spendEnergy('sparring');
  const fight = new SparringSession({ opponent: 'beton' });
  const fightGate = new DailyActivityGate({ profile, getState: () => fight.state, activity: () => sparringActivity(fight.state.settings) });
  assert.equal(fightGate.start(() => fight.start()).ok, true);
  fight.pause();
  assert.equal(fightGate.start(() => { fight.reset(); fight.start(); }).ok, true);
  assert.equal(profile.dailyStatus().energy, 0);
  assert.equal(fight.state.stamina, 100, 'daily energy is separate from combat endurance');
});
