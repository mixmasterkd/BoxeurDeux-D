import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile, CAREER_VERSION, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { freshLeisure } from '../src/game/LeisureCareer.js';

class Storage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
}
const fixture = () => { const storage = new Storage(); return { storage, career: new CareerProfile({ storage }) }; };
const preserved = p => ({ money: p.wallet, daily: p.daily, stats: p.stats, fights: p.fights, casino: p.casino, activities: p.activities });

test('V6 careers migrate to V7 without changing progress and retain their exact backup', () => {
  const { storage, career } = fixture();
  career.recordFight({ opponent: 'beton', winner: 'player' });
  const old = career.snapshot(); old.version = 6; delete old.leisure;
  const text = JSON.stringify(old); storage.setItem(CAREER_STORAGE_KEY, text);
  const migrated = new CareerProfile({ storage });
  assert.equal(CAREER_VERSION, 7); assert.equal(migrated.snapshot().version, 7);
  assert.deepEqual(preserved(migrated.snapshot()), preserved(old));
  assert.deepEqual(migrated.leisureStatus(), freshLeisure());
  assert.equal(storage.getItem(`${CAREER_STORAGE_KEY}-backup`), text);
  assert.equal(JSON.parse(storage.getItem(CAREER_STORAGE_KEY)).version, 7);
});

test('friendly races record one result, remember wins and personal best, and never pay or spend anything', () => {
  const { career, storage } = fixture(), before = preserved(career.snapshot());
  const game = career.beginLeisureGame('race', 'karl'); assert.equal(game.ok, true);
  assert.equal(career.beginLeisureGame('race', 'karl').ok, false);
  assert.equal(career.recordLeisureResult({ id: game.id, winner: 'player', timeMs: 58347 }).ok, true);
  assert.equal(career.recordLeisureResult({ id: game.id, winner: 'player', timeMs: 1 }).ok, false);
  let next = career.beginLeisureGame('race', 'karl');
  career.recordLeisureResult({ id: next.id, winner: 'player', timeMs: 63000 });
  next = career.beginLeisureGame('race', 'karl');
  career.recordLeisureResult({ id: next.id, winner: 'opponent', timeMs: 52000 });
  assert.deepEqual(career.leisureStatus().race, { playerWins: 2, karlWins: 1, bestMs: 58347 });
  assert.deepEqual(preserved(career.snapshot()), before);
  assert.deepEqual(new CareerProfile({ storage }).leisureStatus(), career.leisureStatus());
});

test('pool opponents keep separate scores and an abandoned or reloaded game cannot add a win', () => {
  const { career, storage } = fixture();
  career.setLocation({ scene: 'island-bar', x: 640, y: 600, facing: 'up' });
  const before = preserved(career.snapshot());
  const first = career.beginLeisureGame('billiards', 'beton'); assert.equal(first.ok, true);
  career.recordLeisureResult({ id: first.id, winner: 'player' });
  const second = career.beginLeisureGame('billiards', 'kramer');
  career.recordLeisureResult({ id: second.id, winner: 'opponent' });
  const third = career.beginLeisureGame('billiards', 'beton');
  career.abandonLeisureGame(third.id);
  assert.equal(career.recordLeisureResult({ id: third.id, winner: 'player' }).ok, false);
  const active = career.beginLeisureGame('billiards', 'kramer');
  const reload = new CareerProfile({ storage });
  assert.equal(reload.recordLeisureResult({ id: active.id, winner: 'player' }).ok, false);
  assert.deepEqual(reload.leisureStatus().billiards, { beton: { playerWins: 1, opponentWins: 0 }, kramer: { playerWins: 0, opponentWins: 1 } });
  assert.deepEqual(preserved(career.snapshot()), before);
});

test('locations, opponents, corrupt scores and stale callbacks cannot bypass career boundaries', () => {
  const { career } = fixture();
  assert.equal(career.beginLeisureGame('billiards', 'beton').ok, false);
  assert.equal(career.beginLeisureGame('race', 'beton').ok, false);
  const game = career.beginLeisureGame('race', 'karl');
  assert.equal(career.recordLeisureResult({ id: game.id, winner: 'player', timeMs: NaN }).ok, false);
  const exported = career.exportText(); career.importText(exported);
  assert.equal(career.recordLeisureResult({ id: game.id, winner: 'player', timeMs: 45000 }).ok, false);
  const next = career.beginLeisureGame('race', 'karl'); assert.equal(next.ok, true); assert.notEqual(next.id, game.id);
  const stable = career.exportText();
  for (const mutate of [p => { p.leisure.race.playerWins = -1; }, p => { p.leisure.race.bestMs = 42; },
    p => { delete p.leisure.billiards.kramer; }, p => { p.leisure.billiards.beton.opponentWins = 1.5; }, p => { p.leisure = null; }]) {
    const bad = JSON.parse(exported); mutate(bad);
    assert.throws(() => career.importText(JSON.stringify(bad)));
    assert.equal(career.exportText(), stable);
  }
  career.reset(); assert.equal(career.recordLeisureResult({ id: next.id, winner: 'player', timeMs: 45000 }).ok, false);
});

test('test profiles keep the normal leisure scores and backup untouched', () => {
  const { career, storage } = fixture();
  const game = career.beginLeisureGame('race', 'karl'); career.recordLeisureResult({ id: game.id, winner: 'player', timeMs: 52000 });
  const primary = storage.getItem(CAREER_STORAGE_KEY), backup = storage.getItem(`${CAREER_STORAGE_KEY}-backup`);
  career.applyTestCommand('test maison');
  const practice = career.beginLeisureGame('race', 'karl'); career.recordLeisureResult({ id: practice.id, winner: 'opponent', timeMs: 50000 });
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), primary);
  assert.equal(storage.getItem(`${CAREER_STORAGE_KEY}-backup`), backup);
  career.applyTestCommand('retour');
  assert.deepEqual(career.leisureStatus().race, { playerWins: 1, karlWins: 0, bestMs: 52000 });
});

test('denied storage preserves one in-memory result for export and tells the player', () => {
  const career = new CareerProfile({storage:{getItem:()=>null,setItem:()=>{throw new Error('denied');}}});
  const ticket = career.beginLeisureGame('race','karl');
  const result = career.recordLeisureResult({id:ticket.id,winner:'player',timeMs:48000});
  assert.equal(result.ok,true); assert.equal(result.saved,false);
  assert.match(result.message,/exportez votre carrière/);
  assert.equal(career.recordLeisureResult({id:ticket.id,winner:'player',timeMs:48000}).ok,false);
  const restored = new CareerProfile({storage:null}); restored.importText(career.exportText());
  assert.deepEqual(restored.leisureStatus().race,{playerWins:1,karlWins:0,bestMs:48000});
  assert.ok(career.beginLeisureGame('race','karl').ok);
});
