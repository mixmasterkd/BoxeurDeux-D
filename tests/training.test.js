import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, TrainingCoach } from '../src/game/TrainingCoach.js';
import { SparringSession, TIMINGS } from '../src/game/SparringSession.js';

const create = (lesson, settings = {}) => new SparringSession({ random: () => .5, lesson, ...settings });
const running = (lesson) => { const session = create(lesson); session.start(); return session; };
function until(session, predicate, timeout = 15) {
  const deadline = session.state.elapsed + timeout;
  while (!predicate(session.state) && session.state.elapsed < deadline && session.state.phase === 'running') session.update(.005);
  assert.ok(predicate(session.state), `Expected training stage before ${deadline.toFixed(2)}s`);
}
const nextAttack = (session) => until(session, state => ['jab', 'cross'].includes(state.remi.action) && state.remi.progress < .05);
function dodgeToOpening(session) {
  nextAttack(session);
  const before = session.state.stats.dodged;
  assert.equal(session.act(session.state.remi.safeDodge), true);
  until(session, state => state.stats.dodged > before);
  until(session, state => state.remi.action === 'open' && state.player.action === 'idle');
}
function blockAndRest(session) {
  nextAttack(session);
  const blocked = session.state.stats.blocked;
  const progress = session.state.training.progress;
  session.setGuard(true);
  until(session, state => state.stats.blocked > blocked);
  assert.equal(session.state.training.progress, progress, 'the block alone is not the exercise');
  session.update(.15);
  const stamina = session.state.stamina;
  session.setGuard(false);
  until(session, state => state.training.progress > progress);
  assert.ok(session.state.stamina + 1e-7 >= Math.min(100, stamina + 8));
}

test('lesson selection has stable descriptors, calm 60-second sessions, and clean reset semantics', () => {
  assert.deepEqual(Object.keys(LESSONS), ['free', 'resistance', 'jab', 'guard', 'counter']);
  for (const id of ['jab', 'guard', 'counter']) {
    assert.equal(LESSONS[id].target, 3);
    assert.ok(LESSONS[id].title && LESSONS[id].description && LESSONS[id].objective);
    const session = create(id, { tempo: 'fast', duration: 5 });
    assert.equal(session.state.settings.tempo, 'calm');
    assert.equal(session.state.remaining, 60);
    assert.equal(session.state.training.id, id);
  }
  const session = create('free');
  assert.equal(session.state.training, null);
  session.start(); session.act('cross'); session.update(.3);
  session.setSettings({ lesson: 'jab' });
  assert.equal(session.state.phase, 'ready');
  assert.equal(session.state.stats.landed, 0);
  assert.equal(session.state.elapsed, 0);
  session.start(); session.act('jab'); session.update(.2);
  assert.equal(session.state.training.progress, 1);
  session.pause(); session.setSettings({ lesson: 'counter' });
  assert.equal(session.state.phase, 'ready');
  assert.equal(session.state.training.progress, 0);
  session.setSettings({ lesson: 'free' });
  assert.equal(session.state.training, null);
  session.setSettings({ lesson: 'unsupported' });
  assert.equal(session.state.settings.lesson, 'free');
});

test('jab validates only the requested punch and at most once in each real opening', () => {
  const session = running('jab');
  session.act('cross'); session.update(.6);
  assert.equal(session.state.stats.landed, 1);
  assert.equal(session.state.training.progress, 0);
  assert.match(session.state.training.cue, /jab/);
  session.act('jab'); session.update(.44);
  assert.equal(session.state.training.progress, 1);
  session.act('jab'); session.update(.44);
  assert.equal(session.state.stats.landed, 3);
  assert.equal(session.state.training.progress, 1, 'repeated touches do not farm one opening');
  assert.equal(session.state.remi.action, 'guard');
  session.act('jab'); session.update(.44);
  assert.equal(session.state.stats.opponentBlocked, 1);
  assert.equal(session.state.training.progress, 1);
  until(session, state => state.remi.action === 'open');
  session.act('jab'); session.update(.2);
  assert.equal(session.state.training.progress, 2);
  until(session, state => state.remi.action === 'guard');
  until(session, state => state.remi.action === 'open');
  session.act('jab'); session.update(.198);
  assert.equal(session.state.training.progress, 3);
  assert.equal(session.state.training.completed, true);
  assert.equal(session.state.player.action, 'jab');
  assert.equal(session.state.phase, 'running', 'the final impact stays visible');
  const succeededAt = session.state.elapsed;
  session.update(.49);
  assert.equal(session.state.phase, 'running');
  session.update(.03);
  assert.equal(session.state.phase, 'finished');
  assert.ok(session.state.elapsed - succeededAt >= .5 - 1e-7);
  assert.equal(session.state.remaining, 0);
  assert.equal(session.state.stats.landed, 5);
  const events = session.drainEvents();
  assert.equal(events.filter(event => event.type === 'lesson-progress').length, 3);
  assert.equal(events.filter(event => event.type === 'lesson-complete').length, 1);
  assert.equal(events.filter(event => event.type === 'round-end').length, 1);
  session.update(20);
  assert.deepEqual(session.drainEvents(), []);
});

test('jab lesson never attacks or closes its guard in response to the player', () => {
  const quiet = running('jab');
  const active = running('jab');
  for (let step = 0; step < 80; step++) {
    active.act('jab');
    quiet.update(.05); active.update(.05);
    assert.equal(active.state.remi.action === 'guard', quiet.state.remi.action === 'guard');
    assert.equal(active.state.stats.received, 0);
  }
  quiet.update(60);
  assert.equal(quiet.state.phase, 'finished');
  assert.equal(quiet.state.training.progress, 0);
  assert.equal(quiet.state.training.completed, false);
  assert.equal(quiet.state.stats.received, 0);
  assert.ok(!quiet.drainEvents().some(event => event.type === 'tell' || event.type.startsWith('remi-')));
});

test('guard requires three separate blocks followed by deliberate release and recovery', () => {
  const session = running('guard');
  for (let cycle = 1; cycle <= 3; cycle++) {
    blockAndRest(session);
    assert.equal(session.state.training.progress, cycle);
  }
  const succeededAt = session.state.elapsed;
  session.update(.49);
  assert.equal(session.state.phase, 'running');
  until(session, state => state.phase === 'finished');
  assert.ok(session.state.elapsed - succeededAt >= .5 - 1e-7);
  assert.equal(session.state.stats.blocked, 3);
  assert.equal(session.state.stats.received, 0);
  assert.match(session.state.training.summary.positive, /3\/3/);
});

test('holding guard permanently, even through exhaustion, does not validate a recovery cycle', () => {
  const session = running('guard');
  session.setGuard(true);
  session.update(60);
  assert.equal(session.state.phase, 'finished');
  assert.ok(session.state.stats.blocked > 0);
  assert.equal(session.state.training.progress, 0);
  assert.equal(session.state.training.completed, false);
  assert.match(session.state.training.summary.improve, /relâche/);
});

test('guard recovery is capped at full endurance and cannot count repeatedly without a new block', () => {
  const coach = new TrainingCoach('guard');
  const context = { phase: 'running', time: 2, stamina: 97, guardHeld: true, playerAction: null };
  coach.onEvent({ type: 'remi-blocked' }, context);
  coach.onGuardChange(false, true, { ...context, guardHeld: false });
  assert.deepEqual(coach.update({ ...context, guardHeld: false, stamina: 99.9 }), []);
  assert.equal(coach.update({ ...context, guardHeld: false, stamina: 100 })[0].type, 'lesson-progress');
  assert.equal(coach.state.progress, 1);
  assert.deepEqual(coach.update({ ...context, guardHeld: false, stamina: 100 }), []);
});

test('counter needs a real successful dodge before a hit and accepts one reply per dodge', () => {
  const session = running('counter');
  session.act('jab'); session.update(.44);
  assert.equal(session.state.stats.landed, 1);
  assert.equal(session.state.training.progress, 0);
  for (let cycle = 1; cycle <= 3; cycle++) {
    dodgeToOpening(session);
    assert.equal(session.state.training.progress, cycle - 1, 'an unreturned dodge is not a counter');
    session.act(cycle === 2 ? 'jab' : 'cross');
    session.update(cycle === 2 ? .2 : .3);
    assert.equal(session.state.training.progress, cycle);
    if (cycle === 1) {
      until(session, state => state.player.action === 'idle');
      session.act('jab'); session.update(.2);
      assert.equal(session.state.training.progress, 1, 'one dodge cannot authorize two counters');
    }
  }
  assert.equal(session.state.phase, 'running');
  until(session, state => state.phase === 'finished');
  assert.equal(session.state.stats.dodged, 3);
  assert.equal(session.state.stats.received, 0);
  assert.equal(session.state.training.completed, true);
});

test('a wrong dodge and an expired counter window cannot validate a later touch', () => {
  const wrong = running('counter');
  nextAttack(wrong);
  wrong.act(wrong.state.remi.safeDodge === 'dodgeLeft' ? 'dodgeRight' : 'dodgeLeft');
  until(wrong, state => state.remi.action === 'open' && state.player.action === 'idle');
  wrong.act('jab'); wrong.update(.2);
  assert.equal(wrong.state.stats.received, 1);
  assert.equal(wrong.state.training.progress, 0);

  const late = running('counter');
  dodgeToOpening(late);
  until(late, state => state.remi.action === 'guard');
  until(late, state => state.remi.action === 'open' && state.player.action === 'idle');
  late.act('jab'); late.update(.2);
  assert.equal(late.state.stats.dodged, 1);
  assert.equal(late.state.stats.landed, 1);
  assert.equal(late.state.training.progress, 0, 'an old dodge does not carry into a later opening');
});

test('a touch during the tail of Rémi’s punch is not yet a counter in his next opening', () => {
  const session = running('counter');
  until(session, state => state.remi.action === 'tellRight' && state.remi.duration * (1 - state.remi.progress) <= .15);
  session.act('dodgeLeft');
  until(session, state => state.stats.dodged === 1 && state.player.action === 'idle');
  assert.equal(session.state.remi.action, 'cross');
  session.act('jab');
  session.update(TIMINGS.player.jab.duration * TIMINGS.player.jab.impact);
  assert.equal(session.state.remi.action, 'cross');
  assert.equal(session.state.stats.landed, 1);
  assert.equal(session.state.training.progress, 0);
  until(session, state => state.remi.action === 'open' && state.player.action === 'idle');
  session.act('jab'); session.update(.2);
  assert.equal(session.state.training.progress, 1);
});

test('pause freezes counter opportunities, recovery goals and the completion delay', () => {
  const counter = running('counter');
  dodgeToOpening(counter);
  counter.pause();
  const frozen = structuredClone(counter.state);
  counter.update(30);
  assert.deepEqual(counter.state, frozen);
  counter.resume(); counter.act('jab'); counter.update(.2);
  assert.equal(counter.state.training.progress, 1, 'paused time does not close the opening');

  const recovering = running('guard');
  nextAttack(recovering); recovering.setGuard(true);
  until(recovering, state => state.stats.blocked === 1);
  const releasedAt = recovering.state.stamina;
  recovering.setGuard(false); recovering.update(.4);
  assert.equal(recovering.state.training.progress, 0);
  recovering.pause();
  const resting = structuredClone(recovering.state);
  recovering.update(20);
  assert.deepEqual(recovering.state, resting);
  recovering.resume();
  until(recovering, state => state.training.progress === 1);
  assert.ok(recovering.state.stamina + 1e-7 >= Math.min(100, releasedAt + 8));

  const guard = running('guard');
  nextAttack(guard); guard.setGuard(true);
  until(guard, state => state.stats.blocked === 1);
  guard.pause(); guard.update(20); guard.resume(); guard.update(1);
  assert.equal(guard.state.training.progress, 0, 'automatic control release on pause is not an intentional rest cycle');
  guard.setGuard(true); guard.setGuard(false); guard.update(.01);
  assert.equal(guard.state.training.progress, 0, 'a late guard tap cannot reuse the block before pause');
  blockAndRest(guard);
  for (let cycle = 0; cycle < 2; cycle++) blockAndRest(guard);
  guard.pause();
  const finishedGoal = structuredClone(guard.state);
  guard.update(20);
  assert.deepEqual(guard.state, finishedGoal);
  guard.resume(); guard.update(.49);
  assert.equal(guard.state.phase, 'running');
  until(guard, state => state.phase === 'finished');
});

test('timeout reports partial progress honestly and every lesson can restart cleanly', () => {
  for (const id of ['jab', 'guard', 'counter']) {
    const session = running(id);
    session.update(60);
    assert.equal(session.state.phase, 'finished');
    assert.equal(session.state.training.progress, 0);
    assert.equal(session.state.training.completed, false);
    assert.ok(session.state.training.summary.positive);
    assert.ok(session.state.training.summary.improve);
    assert.doesNotMatch(session.state.training.summary.positive, /réussi|validé|bien placé/);
    assert.equal(session.drainEvents().filter(event => event.type === 'lesson-complete').length, 0);
    session.reset();
    assert.equal(session.state.phase, 'ready');
    assert.equal(session.state.training.id, id);
    assert.equal(session.state.training.progress, 0);
    assert.equal(session.state.remaining, 60);
    assert.equal(session.start(), true);
  }
  const partial = running('jab');
  partial.act('jab'); partial.update(.5); partial.update(60);
  assert.equal(partial.state.training.progress, 1);
  assert.equal(partial.state.training.completed, false);
  assert.match(partial.state.training.summary.positive, /1\/3/);
});

test('a third success near the clock limit finishes at 60 seconds without duplicate completion', () => {
  const session = running('jab');
  session.act('jab'); session.update(.44);
  until(session, state => state.remi.action === 'guard');
  until(session, state => state.remi.action === 'open');
  session.act('jab'); session.update(.44);
  assert.equal(session.state.training.progress, 2);
  until(session, state => state.elapsed >= 59.7, 60);
  assert.equal(session.state.remi.action, 'open');
  session.act('jab'); session.update(.2);
  assert.equal(session.state.training.progress, 3);
  assert.equal(session.state.phase, 'running');
  session.update(1);
  assert.equal(session.state.phase, 'finished', 'the time limit ends the lesson without extending the round');
  assert.equal(session.state.elapsed, 60);
  assert.equal(session.state.remaining, 0);
  assert.equal(session.state.training.completed, true);
  assert.equal(session.state.player.action, 'jab', 'The clock stops exactly while the last pose remains visible');
  const events = session.drainEvents();
  assert.equal(events.filter(event => event.type === 'lesson-complete').length, 1);
  assert.equal(events.filter(event => event.type === 'round-end').length, 1);
  session.update(20);
  assert.deepEqual(session.drainEvents(), []);
});
