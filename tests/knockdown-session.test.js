import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession, KNOCKDOWN_RULES, TIMINGS } from '../src/game/SparringSession.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
const create = (settings = {}) => {
  const session = new SparringSession({ lesson: 'resistance', random: () => .5, ...settings });
  session.start();
  return session;
};
function until(session, predicate, { control = () => {}, limit = 180, hz = 120 } = {}) {
  let time = 0;
  while (!predicate(session.state) && time < limit) {
    control(session); session.update(1 / hz); time += 1 / hz;
  }
  assert.ok(predicate(session.state), `Expected state not reached: ${JSON.stringify({ phase: session.state.phase, round: session.state.bout?.round, count: session.state.bout?.count, time: session.state.elapsed })}`);
}
function protect(session) {
  const remi = session.state.remi;
  session.setGuard(['jab', 'cross'].includes(remi.action), remi.target);
}
function trainJabs(session) {
  protect(session);
  const state = session.state;
  if (state.phase === 'running' && ['open', 'hit'].includes(state.remi.action)
    && state.player.action === 'idle' && state.stamina >= 30) session.act('jab');
}
function playerDown(session) {
  until(session, state => state.phase === 'knockdown' && state.bout.count.downed.player);
  assert.equal(session.state.bout.resistance.player, 0);
}
function countStage(session) {
  until(session, state => state.bout.count?.stage === 'count');
}
function recoverPlayer(session) {
  countStage(session);
  for (let press = 0; press < 6; press++) {
    if (press) session.update(.35);
    assert.equal(session.act(press % 2 ? 'cross' : 'jab'), true);
  }
  until(session, state => state.phase !== 'knockdown');
}
function remiDown(session) {
  until(session, state => state.phase === 'knockdown' && state.bout.count.downed.remi, { control: trainJabs });
}
function waitForStanding(session) {
  until(session, state => state.phase !== 'knockdown');
}
function simultaneousFixture(session) {
  // A narrow health-boundary fixture lets both real committed gloves cross
  // zero at precisely the same instant. Down counters are never assigned.
  until(session, state => state.remi.action === 'tellLeft');
  const remainingTell = session.state.remi.duration * (1 - session.state.remi.progress);
  session.update(remainingTell + TIMINGS.remi.jab.duration * TIMINGS.remi.jab.impact - TIMINGS.player.jab.duration * TIMINGS.player.jab.impact);
  session.state.bout.resistance.player = session.state.bout.resistance.remi = 12;
  session.act('jab');
  return TIMINGS.player.jab.duration * TIMINGS.player.jab.impact;
}

test('resistance is an opt-in three-round mode; free sparring and all guided lessons keep their original non-KO rules', () => {
  for (const lesson of ['free', 'jab', 'guard', 'counter']) {
    const session = create({ lesson });
    assert.equal(session.state.bout, null);
    assert.equal(session.nextRound(), false);
    session.update(60);
    assert.equal(session.state.phase, 'finished');
  }
  const session = create();
  assert.equal(session.state.training, null);
  assert.equal(session.state.remaining, 60);
  assert.equal(session.state.bout.round, 1);
  assert.equal(session.state.bout.rounds, 3);
  assert.deepEqual(session.state.bout.resistance, { player: 100, remi: 100 });
});

test('resistance damage happens only once at each net glove contact; blocks and dodges do not damage it', () => {
  const session = create();
  for (const [input, action] of [['jab', 'jab'], ['cross', 'cross'], ['jab', 'hook']]) {
    const before = session.state.bout.resistance.remi;
    session.act(input);
    const timing = TIMINGS.player[action];
    session.update(timing.duration * timing.impact - .00001);
    assert.equal(session.state.bout.resistance.remi, before);
    session.update(.00001);
    assert.equal(session.state.bout.resistance.remi, before - KNOCKDOWN_RULES.damage[action]);
    session.update(timing.duration * (1 - timing.impact));
    assert.equal(session.state.bout.resistance.remi, before - KNOCKDOWN_RULES.damage[action]);
  }
  until(session, state => state.remi.action === 'guard');
  session.act('jab'); session.update(.2);
  assert.equal(session.state.bout.resistance.remi, 48);
  assert.equal(session.state.stats.opponentBlocked, 1);
  until(session, state => state.remi.action === 'jab');
  session.setGuard(true, 'head'); session.update(.24);
  assert.equal(session.state.bout.resistance.player, 100);
  session.setGuard(false);
  until(session, state => state.remi.action === 'cross');
  session.act(session.state.remi.safeDodge); session.update(.28);
  assert.equal(session.state.bout.resistance.player, 100);
  assert.equal(session.state.stats.dodged, 1);
});

test('fatigue alone never knocks down a boxer and a depleted guard still preserves the held body target', () => {
  const session = create();
  // Exhaust only through attacks/guard during the opening; do not set resistance.
  session.setGuard(true, 'body');
  for (const input of ['cross', 'cross', 'cross', 'cross', 'jab']) {
    session.act(input); session.update(TIMINGS.player[input].duration);
  }
  until(session, state => state.stamina < .01, { limit: 10 });
  assert.equal(session.state.phase, 'running');
  assert.ok(session.state.bout.resistance.player > 0);
  assert.equal(session.state.bout.downs.player.total, 0);
});

test('both simultaneous contacts resolve before a double fall and each contact pose remains visible for 100 ms', () => {
  const session = create();
  const contact = simultaneousFixture(session);
  session.drainEvents(); session.update(contact - .00001);
  assert.deepEqual(session.state.bout.resistance, { player: 12, remi: 12 });
  session.update(.00001);
  assert.equal(session.state.phase, 'knockdown');
  assert.deepEqual(session.state.bout.count.downed, { player: true, remi: true });
  assert.deepEqual(session.drainEvents().map(event => event.type), ['player-hit', 'remi-hit', 'knockdown']);
  assert.equal(session.state.player.action, 'jab');
  close(session.state.player.progress, TIMINGS.player.jab.impact);
  close(session.state.remi.progress, .4);
  const frozen = structuredClone({ elapsed: session.state.elapsed, stamina: session.state.stamina, stats: session.state.stats });
  session.update(.09999);
  assert.equal(session.state.player.action, 'jab');
  session.update(.00001);
  assert.equal(session.state.player.action, 'fall');
  assert.equal(session.state.remi.action, 'fall');
  close(session.state.player.progress, 0);
  session.update(.6);
  assert.equal(session.state.player.action, 'down');
  assert.equal(session.state.bout.count.number, 0);
  assert.deepEqual({ elapsed: session.state.elapsed, stamina: session.state.stamina, stats: session.state.stats }, frozen);
});

test('the recovery gesture accepts six alternated fresh presses, ignores spam, and does not spend endurance or throw punches', () => {
  const session = create(); playerDown(session); countStage(session);
  const before = { elapsed: session.state.elapsed, stamina: session.state.stamina, thrown: session.state.stats.thrown };
  assert.equal(session.state.bout.count.next, 'jab');
  assert.equal(session.state.bout.count.ready, true);
  assert.equal(session.act('cross'), false);
  assert.equal(session.act('jab'), true);
  for (let press = 0; press < 20; press++) assert.equal(session.act('jab'), false);
  assert.equal(session.state.bout.count.accepted, 1);
  assert.equal(session.state.bout.count.next, 'cross');
  close(session.state.bout.count.readyIn, .35);
  assert.equal(session.act('cross'), false);
  session.update(.34999);
  assert.equal(session.act('cross'), false);
  session.update(.00001);
  assert.equal(session.act('cross'), true);
  for (const action of ['jab', 'cross', 'jab', 'cross']) { session.update(.35); assert.equal(session.act(action), true); }
  assert.equal(session.state.bout.count.accepted, 6);
  assert.equal(session.state.bout.count.progress, 1);
  assert.equal(session.state.bout.count.stage, 'rise');
  assert.equal(session.state.player.action, 'rise');
  assert.equal(session.act('jab'), false);
  assert.deepEqual({ elapsed: session.state.elapsed, stamina: session.state.stamina, thrown: session.state.stats.thrown }, before);
  session.update(.8);
  assert.equal(session.state.phase, 'running');
  assert.equal(session.state.bout.resistance.player, 55);
  assert.equal(session.state.stamina, 60);
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.state.remi.action, 'open');
  assert.ok(session.state.remi.duration > 1);
  assert.equal(session.state.bout.count, null);
});

test('pausing freezes falling, counting, readiness and rising, and resumes exactly the same stage', () => {
  const session = create(); playerDown(session);
  for (const stage of ['fall', 'count', 'rise']) {
    if (stage === 'count') countStage(session);
    if (stage === 'rise') {
      for (let press = 0; press < 6; press++) { if (press) session.update(.35); session.act(press % 2 ? 'cross' : 'jab'); }
    }
    assert.equal(session.state.bout.count.stage, stage);
    session.update(.03);
    assert.equal(session.pause(), true);
    assert.equal(session.state.pausedPhase, 'knockdown');
    const snapshot = structuredClone(session.state);
    session.update(100);
    assert.equal(session.act('jab'), false);
    assert.deepEqual(session.state, snapshot);
    session.resume();
    assert.equal(session.state.phase, 'knockdown');
    assert.equal(session.state.pausedPhase, null);
    close(session.state.bout.count.elapsed, snapshot.bout.count.elapsed);
  }
});

test('partial recovery expires at ten real count seconds and produces a single KO without advancing the round clock', () => {
  const session = create(); playerDown(session); countStage(session);
  const roundTime = session.state.elapsed;
  session.drainEvents();
  session.act('jab'); session.update(.35); session.act('cross');
  const used = session.state.bout.count.elapsed;
  session.update(9.99999 - used);
  assert.equal(session.state.phase, 'knockdown');
  assert.equal(session.state.bout.count.number, 9);
  assert.equal(session.state.bout.count.accepted, 2);
  session.update(.00001);
  assert.equal(session.state.phase, 'finished');
  assert.equal(session.state.bout.count.number, 10);
  assert.equal(session.act('jab'), false, 'There is no recovery input after the displayed count reaches ten');
  assert.deepEqual(session.state.bout.result, { reason: 'ko', winner: 'remi', loser: 'player' });
  close(session.state.elapsed, roundTime);
  assert.equal(session.drainEvents().filter(event => event.type === 'bout-finish').length, 1);
  const frozen = structuredClone(session.state);
  session.update(20); assert.equal(session.act('jab'), false); assert.equal(session.nextRound(), false);
  assert.deepEqual(session.state, frozen);
});

test('Rémi rises automatically after six then eight seconds and a third actual fall in one round stops the sparring', () => {
  const session = create({ duration: 300 });
  for (let fall = 1; fall <= 3; fall++) {
    remiDown(session);
    assert.equal(session.state.bout.downs.remi.round, fall);
    assert.equal(session.state.bout.downs.remi.total, fall);
    if (fall === 3) break;
    countStage(session);
    const remaining = KNOCKDOWN_RULES.remiCounts[fall - 1] - session.state.bout.count.elapsed;
    session.update(remaining - .00001);
    assert.equal(session.state.remi.action, 'down');
    session.update(.00001);
    assert.equal(session.state.remi.action, 'rise');
    session.update(.8);
    assert.equal(session.state.phase, 'running');
    assert.equal(session.state.bout.resistance.remi, fall === 1 ? 55 : 45);
  }
  session.update(.7);
  assert.equal(session.state.phase, 'finished');
  assert.deepEqual(session.state.bout.result, { reason: 'round-limit', winner: 'player', loser: 'remi' });
  assert.equal(session.state.bout.count.number, 0, 'A third round fall does not offer an impossible extra recovery');
});

test('round breaks keep resistance and bout history, reset only round falls, and the fourth played fall across rounds stops the bout', () => {
  const session = create();
  for (const targetDowns of [1, 3]) {
    while (session.state.bout.downs.player.total < targetDowns) {
      playerDown(session); recoverPlayer(session);
    }
    until(session, state => state.phase === 'between', { control: protect });
    const previous = structuredClone(session.state.bout);
    const stamina = session.state.stamina;
    session.update(100);
    assert.deepEqual(session.state.bout, previous);
    assert.equal(session.state.stamina, stamina);
    assert.equal(session.act('jab'), false);
    assert.equal(session.nextRound(), true);
    assert.equal(session.state.bout.round, previous.round + 1);
    assert.equal(session.state.bout.downs.player.round, 0);
    assert.equal(session.state.bout.downs.player.total, targetDowns);
    assert.equal(session.state.bout.resistance.player, Math.min(100, previous.resistance.player + 20));
    assert.equal(session.state.stamina, 100);
    assert.equal(session.state.elapsed, 0);
    assert.equal(session.state.bout.roundHistory.length, previous.round);
  }
  playerDown(session);
  assert.equal(session.state.bout.downs.player.round, 1);
  assert.equal(session.state.bout.downs.player.total, 4);
  session.update(.7);
  assert.deepEqual(session.state.bout.result, { reason: 'total-limit', winner: 'remi', loser: 'player' });
});

test('three timed rounds produce per-round touch totals and no invented official winner, then reset starts a clean bout', () => {
  const session = create({ duration: 2 });
  for (let round = 1; round <= 3; round++) {
    session.act('jab'); session.update(2);
    assert.equal(session.state.bout.roundHistory.length, round);
    assert.equal(session.state.bout.roundHistory.at(-1).stats.landed, 1);
    assert.equal(session.state.stats.landed, round);
    if (round < 3) { assert.equal(session.state.phase, 'between'); session.nextRound(); }
  }
  assert.equal(session.state.phase, 'finished');
  assert.deepEqual(session.state.bout.result, { reason: 'time', winner: null, loser: null });
  session.reset();
  assert.equal(session.state.bout.round, 1);
  assert.equal(session.state.bout.count, null);
  assert.equal(session.state.bout.result, null);
  assert.equal(session.state.stats.landed, 0);
  assert.deepEqual(session.state.bout.roundHistory, []);
});

test('an ordinary contact on the interval bell remains visible and cannot score again before the next round', () => {
  const session = create({ duration: 1 });
  session.update(1 - TIMINGS.player.jab.duration * TIMINGS.player.jab.impact);
  session.act('jab');
  session.update(TIMINGS.player.jab.duration * TIMINGS.player.jab.impact);
  assert.equal(session.state.phase, 'between');
  assert.equal(session.state.stats.landed, 1);
  assert.equal(session.state.player.action, 'jab');
  close(session.state.player.progress, TIMINGS.player.jab.impact);
  const frozen = structuredClone(session.state);
  session.update(10);
  assert.deepEqual(session.state, frozen);
  session.nextRound();
  assert.equal(session.state.player.action, 'idle');
  session.update(.2);
  assert.equal(session.state.stats.landed, 1, 'The previous round’s extended glove must not count twice');
});

test('a simultaneous terminal-bell knockdown is counted before the interval; a player failing a double count loses to the standing Rémi', () => {
  for (const recover of [true, false]) {
    const session = create({ duration: 3.582 });
    session.update(simultaneousFixture(session));
    assert.equal(session.state.phase, 'knockdown');
    close(session.state.remaining, 0);
    if (recover) {
      recoverPlayer(session);
      assert.equal(session.state.phase, 'between');
      assert.deepEqual(session.state.bout.downs, { player: { round: 1, total: 1 }, remi: { round: 1, total: 1 } });
      assert.equal(session.state.bout.roundHistory[0].duration, 3.582);
    } else {
      countStage(session); session.update(10);
      assert.equal(session.state.phase, 'finished');
      assert.deepEqual(session.state.bout.result, { reason: 'ko', winner: 'remi', loser: 'player' });
      assert.equal(session.state.bout.resistance.remi, 55);
    }
  }
});

test('when Rémi reaches his fall limit during a double knockdown, the other boxer must still beat the count to avoid a double KO', () => {
  for (const recover of [true, false]) {
    const session = create({ duration: 300 });
    for (let fall = 0; fall < 2; fall++) { remiDown(session); waitForStanding(session); }
    session.setGuard(false);
    session.update(simultaneousFixture(session));
    assert.deepEqual(session.state.bout.count.downed, { player: true, remi: true });
    assert.equal(session.state.bout.count.eliminated.remi, 'round-limit');
    if (recover) recoverPlayer(session);
    else { countStage(session); session.update(10); }
    assert.deepEqual(session.state.bout.result, recover
      ? { reason: 'round-limit', winner: 'player', loser: 'remi' }
      : { reason: 'double-ko', winner: 'draw', loser: 'both' });
  }
});

test('20 and 60 Hz preserve knockdown, count, recovery and round clocks with the same real input schedule', () => {
  const runs = [20, 60].map(hz => {
    const session = create();
    until(session, state => state.phase === 'knockdown', { hz });
    until(session, state => state.bout.count.stage === 'count', { hz });
    const roundTime = session.state.elapsed;
    // Key events are scheduled from the exact count origin, not the first
    // sampled frame which happens to observe it.
    for (let index = 0; index < 6; index++) {
      const at = .1 + index * .4;
      session.update(at - session.state.bout.count.elapsed);
      assert.equal(session.act(index % 2 ? 'cross' : 'jab'), true);
    }
    session.update(.8);
    return { phase: session.state.phase, time: roundTime, stats: session.state.stats, bout: session.state.bout, stamina: session.state.stamina };
  });
  close(runs[0].time, runs[1].time);
  assert.deepEqual({ ...runs[0], time: 0 }, { ...runs[1], time: 0 });
});
