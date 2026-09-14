import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile, CAREER_STORAGE_KEY, CAREER_BACKUP_KEY, CAREER_TEST_STORAGE_KEY, CAREER_VERSION } from '../src/game/CareerProfile.js';
import { V4_FIGHT_IDS, GOLD_TOURNAMENT_OPPONENTS, goldTournamentUnlocked, DELIVERY_STOPS } from '../src/game/ChapterRules.js';
import { AIRPORT_SPAWN, CUBA_HOME_SPAWN, MEXICO_HOME_SPAWN } from '../src/game/NextChapterRules.js';
import { MARATHON_PLACES, MARATHON_START } from '../src/game/MarathonRules.js';
class MemoryStorage { values = new Map(); getItem(key) { return this.values.get(key) ?? null; } setItem(key, value) { this.values.set(key, value); } }
const create = (storage = new MemoryStorage()) => new CareerProfile({ storage, now: () => '2026-09-13T20:00:00Z' });
function work(profile, tours) {
  for (let i = 0; i < tours; i++) {
    if (profile.dailyStatus().energy < 30) profile.sleep();
    assert.equal(profile.startDelivery().ok, true);
    for (const stop of DELIVERY_STOPS) assert.equal(profile.deliverParcel(stop, { tip: 2 }).ok, true);
  }
}
function ready(profile) {
  profile.recordFight({ opponent: 'beton', winner: 'player' }); profile.recordFight({ opponent: 'kramer', winner: 'player' });
  work(profile, 24); profile.startTournament();
  const match = profile.tournamentStatus(); profile.recordTournamentFight({ opponent: match.opponent, matchId: match.currentMatchId, winner: 'remi' }); profile.leaveTournament();
}
function board(profile, destination) {
  if (!profile.travelStatus(destination).reserved) assert.equal(profile.reserveTravel(destination).ok, true);
  profile.setLocation(AIRPORT_SPAWN); assert.equal(profile.boardTravel(destination).ok, true);
}
function runToFinish(profile, { elapsed = 600, encounter = 'avoid' } = {}) {
  profile.setLocation(MARATHON_START); assert.equal(profile.startMarathon().ok, true);
  for (const [index, scene] of MARATHON_PLACES.entries()) {
    assert.equal(profile.recordMarathonProgress({ elapsed: (index + 1) * elapsed / 4, checkpoint: { scene, x: 740, y: 560, facing: 'right' } }).ok, true);
    if (index === 1) {
      assert.equal(profile.encounterMarathon(encounter).ok, true);
      if (encounter === 'fight') assert.equal(profile.resolveMarathonEncounter({ winner: 'player' }).ok, true);
    }
  }
  return profile.finishMarathon({ elapsed });
}

test('booking either destination charges once without transporting, boarding and return charge nothing and survive reload', () => {
  const storage = new MemoryStorage(); let p = create(storage); ready(p);
  const location = p.snapshot().location, money = p.moneyStatus().money;
  assert.equal(p.reserveTravel('mexico').ok, true);
  assert.equal(p.moneyStatus().money, money - 160); assert.deepEqual(p.snapshot().location, location);
  const booked = p.exportText(); assert.equal(p.reserveTravel('mexico').duplicate, true); assert.equal(p.exportText(), booked);
  assert.equal(p.boardTravel('mexico').ok, false); assert.equal(p.canFight('danielo').ok, false);
  p = create(storage); assert.ok(p.mexicoStatus().reserved); assert.equal(p.mexicoStatus().active, null);
  p.setLocation(AIRPORT_SPAWN); assert.equal(p.boardTravel('mexico').ok, true);
  assert.deepEqual(p.snapshot().location, MEXICO_HOME_SPAWN); assert.equal(p.moneyStatus().money, money - 160);
  assert.equal(p.boardTravel('mexico').ok, false); assert.equal(p.canFight('danielo').ok, true); assert.equal(p.canFight('pablo').ok, true);
  assert.equal(p.canFight('louisto').ok, false); assert.equal(p.startDelivery().ok, false); assert.equal(p.startTournament().ok, false);
  p.spendEnergy('pads'); const stats = p.snapshot().stats; p.sleep();
  assert.deepEqual(p.snapshot().location, MEXICO_HOME_SPAWN); assert.deepEqual(p.snapshot().stats, stats); assert.equal(p.dailyStatus().energy, 100);
  p = create(storage); assert.ok(p.mexicoStatus().active); assert.equal(p.leaveMexico().ok, true);
  assert.deepEqual(p.snapshot().location, AIRPORT_SPAWN); assert.equal(p.moneyStatus().money, money - 160);
  assert.equal(p.leaveMexico().ok, false); assert.equal(create(storage).mexicoStatus().history.length, 1);
  board(p, 'cuba'); assert.deepEqual(p.snapshot().location, CUBA_HOME_SPAWN);
});

test('two reservations can coexist but boarding an overlapping trip or buying during active work is rejected atomically', () => {
  const p = create(); ready(p);
  assert.equal(p.reserveTravel('cuba').ok, true); assert.equal(p.reserveTravel('mexico').ok, true);
  p.startDelivery(); const working = p.exportText();
  assert.equal(p.boardTravel('cuba').ok, false); assert.equal(p.exportText(), working); p.abandonDelivery();
  board(p, 'mexico'); const travelling = p.exportText();
  assert.equal(p.boardTravel('cuba').ok, false); assert.equal(p.reserveTravel('cuba').duplicate, true); assert.equal(p.exportText(), travelling);
  p.leaveMexico(); board(p, 'cuba'); assert.equal(p.mexicoStatus().history.length, 1);
});

test('version 4 migration keeps an already paid Cuba stay, outfits, progress and original backup; new chapter data starts empty', () => {
  const original = create(); ready(original); board(original, 'cuba'); original.spendEnergy('rope');
  original.setLocation({ scene: 'cuba-beach', x: 1390, y: 790, facing: 'up' });
  const old = original.snapshot(); old.version = 4; delete old.cuba.reserved; delete old.mexico; delete old.marathon;
  for (const id of Object.keys(old.fights)) if (!V4_FIGHT_IDS.includes(id)) delete old.fights[id];
  const source = JSON.stringify(old), storage = new MemoryStorage(); storage.setItem(CAREER_STORAGE_KEY, source);
  const migrated = create(storage);
  assert.equal(migrated.snapshot().version, CAREER_VERSION); assert.equal(storage.getItem(CAREER_BACKUP_KEY), source);
  for (const key of ['wallet', 'inventory', 'stats', 'caps', 'daily', 'location', 'tournament']) assert.deepEqual(migrated.snapshot()[key], old[key], key);
  assert.deepEqual(migrated.cubaStatus().active, old.cuba.active); assert.equal(migrated.cubaStatus().reserved, null);
  assert.equal(migrated.mexicoStatus().entries, 0); assert.equal(migrated.marathonStatus().entries, 0);
  const money = migrated.moneyStatus().money; migrated.leaveCuba(); assert.equal(migrated.moneyStatus().money, money);
  assert.deepEqual(create(storage).snapshot(), migrated.snapshot());
});

test('marathon registration is optional and separate from start, with 100 dollars per run, no cash prize and only one souvenir medal', () => {
  const storage = new MemoryStorage(); let p = create(storage); work(p, 10);
  const before = p.snapshot(); assert.equal(p.registerMarathon().ok, true);
  assert.equal(p.moneyStatus().money, before.wallet.money - 100); assert.deepEqual(p.snapshot().location, before.location);
  assert.deepEqual(p.snapshot().stats, before.stats); assert.deepEqual(p.snapshot().daily, before.daily);
  assert.equal(p.startMarathon().ok, false); assert.equal(p.registerMarathon().duplicate, true);
  const result = runToFinish(p);
  assert.equal(result.ok, true); assert.equal(result.firstMedal, true); assert.equal(p.moneyStatus().money, before.wallet.money - 100);
  assert.equal(p.marathonStatus().medals.length, 1); assert.equal(p.marathonStatus().bestTime, 600);
  const finished = p.exportText(); assert.equal(p.finishMarathon({ elapsed: 300 }).duplicate, true); assert.equal(p.exportText(), finished);
  p = create(storage); assert.equal(p.marathonStatus().medals.length, 1);
  assert.equal(p.registerMarathon().ok, true); const again = runToFinish(p, { elapsed: 580 });
  assert.equal(again.firstMedal, false); assert.equal(again.personalBest, true); assert.equal(p.marathonStatus().medals.length, 1);
  assert.equal(p.marathonStatus().bestTime, 580); assert.equal(p.moneyStatus().money, 0);
  assert.equal(create(storage).marathonStatus().history.length, 2);
});

test('marathon checkpoint enforces route order and monotonic time; pending one-off encounter resumes after reload without official fight rewards', () => {
  const storage = new MemoryStorage(); let p = create(storage); work(p, 5); p.registerMarathon(); p.setLocation(MARATHON_START); p.startMarathon();
  let before = p.exportText();
  assert.equal(p.recordMarathonProgress({ elapsed: 200, checkpoint: { scene: 'marathon-stadium', x: 640, y: 580, facing: 'up' } }).ok, false);
  assert.equal(p.finishMarathon({ elapsed: 1 }).ok, false); assert.equal(p.exportText(), before);
  const checkpoint = { scene: 'marathon-downtown', x: 891, y: 543, facing: 'right' };
  p.recordMarathonProgress({ elapsed: 140, checkpoint }); assert.equal(p.encounterMarathon('fight').ok, true);
  before = p.exportText(); assert.equal(p.recordMarathonProgress({ elapsed: 150 }).ok, false); assert.equal(p.sleep().ok, false);
  assert.equal(p.startDelivery().ok, false); assert.equal(p.exportText(), before);
  p = create(storage); assert.equal(p.marathonStatus().active.status, 'encounter');
  const noRewards = p.snapshot(); const resume = p.resolveMarathonEncounter({ winner: 'remi' });
  assert.equal(resume.ok, true); assert.deepEqual(resume.location, checkpoint); assert.deepEqual(p.snapshot().location, checkpoint);
  for (const key of ['wallet', 'fights', 'stats', 'daily']) assert.deepEqual(p.snapshot()[key], noRewards[key], key);
  assert.equal(p.encounterMarathon('fight').duplicate, true); assert.equal(p.resolveMarathonEncounter({ winner: 'player' }).duplicate, true);
  assert.equal(p.recordMarathonProgress({ elapsed: 139 }).ok, false);
  assert.equal(p.recordMarathonProgress({ elapsed: 141, checkpoint: { ...checkpoint, scene: 'home' } }).ok, false);
  assert.equal(create(storage).marathonStatus().active.encounter, 'lost');
});

test('abandoned marathon consumes entry, awards nothing, permits free exploration and needs a new paid registration', () => {
  const p = create(); work(p, 10); p.registerMarathon(); const money = p.moneyStatus().money;
  p.setLocation(MARATHON_START); p.startMarathon(); p.encounterMarathon('avoid'); assert.equal(p.abandonMarathon().ok, true);
  assert.equal(p.marathonStatus().medals.length, 0); assert.equal(p.marathonStatus().bestTime, null); assert.equal(p.moneyStatus().money, money);
  for (const scene of MARATHON_PLACES) assert.equal(p.setLocation({ scene, x: 640, y: 580, facing: 'down' }).ok, true);
  assert.equal(p.registerMarathon().ok, true); assert.equal(p.marathonStatus().active.id, 2); assert.equal(p.moneyStatus().money, money - 100);
  assert.equal(p.marathonStatus().active.encounterUsed, false);
});

test('Gold Gloves require the four chapter victories but not marathon and complete all three days with a distinct medal and five judges', () => {
  const storage = new MemoryStorage(), p = create(storage); ready(p);
  assert.equal(p.canStartTournament('gold').ok, false);
  for (const opponent of ['dyrex', 'lefeu']) p.recordFight({ opponent, winner: 'player' });
  assert.equal(p.canStartTournament('gold').ok, false);
  for (const [destination, opponent] of [['mexico', 'danielo'], ['cuba', 'louisto']]) { board(p, destination); p.recordFight({ opponent, winner: 'player' }); p.leaveTravel(destination); }
  assert.equal(goldTournamentUnlocked(p.snapshot()), true); work(p, 10);
  const money = p.moneyStatus().money; assert.equal(p.startTournament('gold').ok, true); assert.equal(p.moneyStatus().money, money - 240);
  assert.equal(p.startTournament('gold').ok, false); assert.equal(p.marathonStatus().entries, 0);
  for (const [index, opponent] of GOLD_TOURNAMENT_OPPONENTS.entries()) {
    const state = p.tournamentStatus(); assert.equal(state.tier, 'gold'); assert.equal(state.judges, 5); assert.equal(state.opponent, opponent);
    assert.equal(p.canFight(opponent).ok, true);
    assert.equal(p.recordTournamentFight({ opponent, matchId: state.currentMatchId, winner: 'player' }).ok, true);
    assert.equal(p.recordTournamentFight({ opponent, matchId: state.currentMatchId, winner: 'player' }).duplicate, true);
    if (index < 2) { assert.equal(p.tournamentStatus().canFight, false); assert.equal(p.sleep().ok, true); }
    assert.deepEqual(create(storage).snapshot(), p.snapshot());
  }
  assert.equal(p.tournamentStatus().active.status, 'champion'); assert.equal(p.tournamentStatus().medals.at(-1).tier, 'gold');
  p.leaveTournament(); assert.equal(p.tournamentStatus().history.at(-1).tier, 'gold'); assert.equal(p.marathonStatus().entries, 0);
});

test('malformed new reservations, overlapping trips, fabricated marathon rewards and gold unlock bypass leave save untouched', () => {
  const p = create(); ready(p); p.reserveTravel('cuba'); const before = p.exportText();
  const corruptions = [
    x => { x.cuba.reserved.fee = 0; }, x => { x.cuba.active = { ...x.cuba.reserved }; }, x => { delete x.mexico; },
    x => { x.marathon.medals.push({ event: 'montreal', runId: 1, day: 1 }); }, x => { x.marathon.bestTime = 1; },
    x => { x.tournament.history[0].tier = 'gold'; }, x => { delete x.fights.danielo; },
  ];
  for (const mutate of corruptions) { const invalid = JSON.parse(before); mutate(invalid); assert.throws(() => p.importText(JSON.stringify(invalid))); assert.equal(p.exportText(), before); }
});

test('CLI list is read-only, test commands persist separately across reopening, and returning preserves normal save and backup byte for byte', () => {
  const storage = new MemoryStorage(); const p = create(storage); p.sleep(); p.spendEnergy('shadow');
  const normal = p.exportText(), primary = storage.getItem(CAREER_STORAGE_KEY), backup = storage.getItem(CAREER_BACKUP_KEY);
  assert.ok(p.applyTestCommand('liste').commands.some(row => row.command === 'retour')); assert.equal(p.testStatus().active, false);
  assert.equal(p.applyTestCommand('rm -rf /').ok, false); assert.equal(p.applyTestCommand('inconnu').ok, false); assert.equal(p.exportText(), normal);
  const entered = p.applyTestCommand('test mexique'); assert.equal(entered.ok, true); assert.equal(entered.location.scene, 'mexico-home');
  assert.ok(p.mexicoStatus().active); assert.ok(storage.getItem(CAREER_TEST_STORAGE_KEY));
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), primary); assert.equal(storage.getItem(CAREER_BACKUP_KEY), backup);
  p.applyTestCommand('argent 999999'); assert.equal(p.moneyStatus().money, 500); p.spendEnergy('pads');
  const testState = p.exportText(); assert.equal(p.applyTestCommand('retour').ok, true); assert.equal(p.exportText(), normal);
  assert.equal(storage.getItem(CAREER_STORAGE_KEY), primary); assert.equal(storage.getItem(CAREER_BACKUP_KEY), backup);
  const reopened = create(storage); assert.equal(reopened.testStatus().active, false); assert.equal(reopened.exportText(), normal);
  reopened.enterTestProfile(); assert.equal(reopened.exportText(), testState); reopened.leaveTestProfile(); assert.equal(reopened.exportText(), normal);
});

test('every documented teleport creates an importable test save and normal mode remains exact even with denied storage', () => {
  for (const destination of ['maison', 'gym', 'aeroport', 'cuba', 'mexique', 'marathon', 'bronze', 'dore']) {
    const p = create(); const original = p.exportText();
    assert.equal(p.applyTestCommand(`test ${destination}`).ok, true, destination); assert.doesNotThrow(() => p.inspectImport(p.exportText()), destination);
    p.leaveTestProfile(); assert.equal(p.exportText(), original);
  }
  for (const opponent of ['beton', 'kramer', 'dyrex', 'feu', 'louisto', 'danielo']) {
    const p = create(); const result = p.applyTestCommand(`combat ${opponent}`); assert.equal(result.ok, true); assert.ok(result.opponent); assert.doesNotThrow(() => p.inspectImport(p.exportText()));
  }
  const storage = new MemoryStorage(), p = create(storage); p.sleep();
  storage.setItem = () => { throw new Error('quota'); }; p.spendEnergy('shadow'); const original = p.exportText(), status = p.saveStatus();
  p.applyTestCommand('test cuba'); p.leaveTestProfile(); assert.equal(p.exportText(), original); assert.deepEqual(p.saveStatus(), status);
});

test('route waypoints persist within a marathon sector, cannot regress, and reset for the next sector including early V5 migration',()=>{
  const storage=new MemoryStorage();let p=create(storage);work(p,5);p.registerMarathon();p.setLocation(MARATHON_START);p.startMarathon();
  assert.equal(p.recordMarathonProgress({routePoint:2,elapsed:20}).ok,true);p=create(storage);assert.equal(p.marathonStatus().active.routePoint,2);
  const before=p.exportText();assert.equal(p.recordMarathonProgress({routePoint:1,elapsed:21}).ok,false);assert.equal(p.exportText(),before);
  assert.equal(p.recordMarathonProgress({routePoint:51}).ok,false);assert.equal(p.recordMarathonProgress({routePoint:-1}).ok,false);
  const checkpoint={scene:'marathon-downtown',x:950,y:780,facing:'right'};
  assert.equal(p.recordMarathonProgress({checkpoint,elapsed:22}).ok,true);assert.equal(p.marathonStatus().active.routePoint,0);
  assert.equal(p.recordMarathonProgress({routePoint:3,elapsed:22}).ok,true,'a waypoint update is saved even with unchanged position and clock');
  assert.equal(create(storage).marathonStatus().active.routePoint,3);
  const early=p.snapshot();delete early.marathon.active.routePoint;p.importText(JSON.stringify(early));assert.equal(p.marathonStatus().active.routePoint,0);
});
