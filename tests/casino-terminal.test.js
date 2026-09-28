import test from 'node:test';
import assert from 'node:assert/strict';
import {CareerProfile, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY, CAREER_TEST_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {CASINO_ISLAND_RETURN, CASINO_ENTRANCE} from '../src/game/CasinoWorld.js';
import {MARATHON_START} from '../src/game/MarathonRules.js';
import {createBlackjackGame} from '../src/game/casino/BlackjackGame.js';

class MemoryStorage {
  values = new Map();
  getItem(key) {return this.values.get(key) ?? null;}
  setItem(key, value) {this.values.set(key, value);}
}
const make = (storage = new MemoryStorage()) => new CareerProfile({storage, now: () => '2026-09-28T18:00:00Z'});
const table = {scene: 'casino-tables', x: 1000, y: 800, facing: 'up'};
const poker = {scene: 'casino-poker', x: 1000, y: 800, facing: 'up'};
const useSeed = (t, seed) => t.mock.method(globalThis.crypto, 'getRandomValues', values => {values[0] = seed; return values;});
let liveSeed = 1; while (createBlackjackGame({seed: liveSeed}).status !== 'playing') liveSeed++;

function assertReady(p) {
  assert.equal(p.testStatus().active, true);
  assert.equal(p.casinoStatus().unlocked, true); assert.equal(p.casinoStatus().available, true);
  assert.deepEqual(p.snapshot().location, CASINO_ISLAND_RETURN);
  assert.equal(p.moneyStatus().money, 400); assert.equal(p.casinoStatus().chips, 100);
  assert.equal(p.moneyStatus().cap, 1000); assert.equal(p.casinoStatus().active, null);
  assert.equal(p.dailyStatus().energy, 100);
  for (const activity of ['delivery', 'tournament', 'cuba', 'mexico', 'marathon']) assert.equal(p.snapshot()[activity].active, null, activity);
  assert.doesNotThrow(() => p.inspectImport(p.exportText()));
}

function normalFiles(storage) {
  return [storage.getItem(CAREER_STORAGE_KEY), storage.getItem(CAREER_BACKUP_KEY)];
}

test('test casino: listed read-only by help, normalized command unlocks a funded and playable visit', () => {
  const p = make(); p.sleep(); const original = p.exportText();
  for (const command of ['liste', ' AIDE ']) {
    const result = p.applyTestCommand(command);
    assert.equal(result.ok, true); assert.equal(result.commands.filter(row => row.command === 'test casino').length, 1);
    assert.equal(p.exportText(), original); assert.equal(p.testStatus().active, false);
  }
  for (const invalid of ['testcasino', 'test casino extra', 'casino']) {
    assert.equal(p.applyTestCommand(invalid).ok, false); assert.equal(p.exportText(), original);
  }
  const result = p.applyTestCommand('  TÉST   CÁSINO  ');
  assert.equal(result.ok, true); assert.deepEqual(result.location, CASINO_ISLAND_RETURN); assertReady(p);
  p.setLocation(CASINO_ENTRANCE);
  assert.equal(p.casinoOffer('slots', {machineId: 'diamants'}).ok, true);
  p.setLocation(table);
  assert.equal(p.casinoOffer('blackjack', {bet: 5}).ok, true);
  assert.equal(p.casinoOffer('roulette', {bets: [{type: 'number', value: 0, amount: 5}]}).ok, true);
  p.setLocation(poker); assert.equal(p.casinoOffer('poker', {buyIn: 20}).ok, true);
  p.setLocation(CASINO_ENTRANCE); assert.equal(p.casinoStart('slots', {machineId: 'cerises'}).ok, true);
});

test('test casino: save and backup stay exact; test visit survives reopening, export/import and return', () => {
  const storage = new MemoryStorage(), p = make(storage); p.sleep(); p.spendEnergy('shadow');
  const normal = p.exportText(), files = normalFiles(storage);
  assert.equal(p.applyTestCommand('test casino').ok, true); assertReady(p);
  const casinoSave = p.exportText(); assert.ok(storage.getItem(CAREER_TEST_STORAGE_KEY));
  assert.deepEqual(normalFiles(storage), files);
  const imported = make(); imported.importText(casinoSave);
  for (const key of ['location', 'wallet', 'casino', 'daily', 'tournament']) assert.deepEqual(imported.snapshot()[key], p.snapshot()[key], key);
  const reopened = make(storage); assert.equal(reopened.exportText(), normal); assert.equal(reopened.testStatus().active, false);
  assert.equal(reopened.enterTestProfile().ok, true); assert.equal(reopened.exportText(), casinoSave); assertReady(reopened);
  assert.deepEqual(normalFiles(storage), files);
  assert.equal(reopened.applyTestCommand('  RETOUR  ').ok, true); assert.equal(reopened.exportText(), normal);
  assert.equal(p.applyTestCommand('retour').ok, true); assert.equal(p.exportText(), normal);
  assert.deepEqual(normalFiles(storage), files);
});

test('test casino: existing test trips, tournament, delivery and running marathon are cleared safely', () => {
  const setups = [
    p => {p.applyTestCommand('test mexique'); assert.ok(p.mexicoStatus().active);},
    p => {p.applyTestCommand('test bronze'); assert.ok(p.tournamentStatus().active);},
    p => {p.applyTestCommand('test maison'); assert.equal(p.startDelivery().ok, true);},
    p => {p.applyTestCommand('test marathon'); p.setLocation(MARATHON_START); assert.equal(p.startMarathon().ok, true);},
  ];
  for (const prepare of setups) {
    const storage = new MemoryStorage(), p = make(storage); p.sleep(); p.spendEnergy('shadow');
    const normal = p.exportText(), files = normalFiles(storage);
    prepare(p); assert.equal(p.applyTestCommand('test casino').ok, true); assertReady(p);
    assert.deepEqual(normalFiles(storage), files);
    p.applyTestCommand('retour'); assert.equal(p.exportText(), normal);
  }
});

test('test casino: an unfinished normal blackjack hand and both normal files survive the test visit intact', t => {
  useSeed(t, liveSeed);
  // Construct a valid unlocked profile through public commands, then import it
  // into a separate normal career before committing the normal game's hand.
  const fixture = make(); fixture.applyTestCommand('test casino');
  const storage = new MemoryStorage(), p = make(storage); p.importText(fixture.exportText());
  p.setLocation(table); assert.equal(p.casinoStart('blackjack', {bet: 2}).ok, true);
  assert.equal(p.testStatus().active, false); assert.equal(p.casinoStatus().active.settled, false);
  const normal = p.exportText(), files = normalFiles(storage), hand = p.casinoStatus().active;
  assert.equal(p.applyTestCommand('test casino').ok, true); assertReady(p);
  assert.deepEqual(normalFiles(storage), files);
  assert.equal(p.applyTestCommand('retour').ok, true);
  assert.equal(p.exportText(), normal); assert.deepEqual(p.casinoStatus().active, hand);
  assert.deepEqual(normalFiles(storage), files); assert.equal(make(storage).exportText(), normal);
});

test('test casino: repeated command clears completed results and pending test hands without stale table state', t => {
  useSeed(t, liveSeed); const p = make(); p.applyTestCommand('test casino');
  p.setLocation(CASINO_ENTRANCE); assert.equal(p.casinoStart('slots').ok, true);
  assert.equal(p.casinoStatus().active.settled, true); const rounds = p.casinoStatus().rounds;
  assert.equal(p.applyTestCommand('test casino').ok, true); assertReady(p);
  assert.equal(p.casinoStatus().rounds, rounds);
  p.setLocation(table); assert.equal(p.casinoStart('blackjack', {bet: 2}).ok, true);
  assert.equal(p.casinoStatus().active.settled, false);
  assert.equal(p.applyTestCommand('test casino').ok, true); assertReady(p);
  assert.equal(p.casinoStatus().rounds, rounds);
  const casino = p.snapshot().casino; assert.equal(casino.nextId, casino.rounds + 1);
});
