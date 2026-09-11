import test from 'node:test';
import assert from 'node:assert/strict';
import { BagSession, BAG_TIMINGS, BAG_RHYTHM, BAG_SEQUENCES } from '../src/game/BagSession.js';

const create = (settings = {}) => { const session = new BagSession(settings); session.start(); return session; };
function advanceTo(session, time, hz = 60) {
  let attempts = 0;
  while (session.state.elapsed < time - 1e-8 && session.state.phase === 'running') {
    session.update(Math.min(1 / hz, time - session.state.elapsed));
    assert.ok(++attempts < 20000, 'the lesson clock must advance');
  }
}
function completeSequence(session, { hz = 60, offset = 0 } = {}) {
  const sequence = session.state.sequence;
  for (const step of sequence.steps) {
    advanceTo(session, step.inputAt + offset, hz);
    session.setGuard(step.target === 'body', step.target);
    assert.equal(session.attack(step.input), true);
  }
  advanceTo(session, sequence.steps.at(-1).targetAt + offset, hz);
  assert.equal(sequence.result, 'completed');
  advanceTo(session, sequence.endsAt, hz);
}
function reachHookSequence(session) {
  for (let index = 0; index < 3; index++) completeSequence(session);
  assert.equal(session.state.sequence.id, 'jab-direct-crochet');
}

test('the bag offers four head patterns followed by a body pattern, 45 seconds and explicit full animation timings', () => {
  const session = new BagSession();
  assert.equal(session.state.remaining, 45);
  assert.equal(session.state.phase, 'ready');
  assert.deepEqual(BAG_SEQUENCES.map(sequence => sequence.actions), [['jab'], ['jab', 'jab'], ['jab', 'cross'], ['jab', 'cross', 'hook'], ['jab', 'cross', 'hook']]);
  assert.equal(BAG_SEQUENCES.at(-1).target, 'body');
  for (const timing of Object.values(BAG_TIMINGS)) {
    assert.ok(Math.abs(timing.anticipation + timing.hold + timing.recovery - timing.duration) < 1e-9);
    assert.equal(timing.impact, timing.anticipation / timing.duration);
    assert.ok(timing.duration < BAG_RHYTHM.spacing);
  }
  for (const sequence of BAG_SEQUENCES) for (const action of sequence.actions.slice(0, -1)) {
    assert.ok(BAG_TIMINGS[action].duration < BAG_RHYTHM.spacing - BAG_RHYTHM.tolerance, 'a late accepted punch recovers before the next ideal input');
  }
  assert.equal(new BagSession({ duration: 'invalid' }).state.remaining, 45);
  assert.equal(new BagSession({ duration: 0 }).state.remaining, 5);
  assert.equal(session.attack('jab'), false);
  assert.equal(session.start(), true);
  assert.equal(session.start(), false);
  assert.equal(session.attack('hook'), false, 'a hook is never a separate input');
});

test('a punch scores once at contact and stays extended for the advertised hold', () => {
  const session = create();
  const target = session.state.sequence.steps[0];
  advanceTo(session, target.inputAt);
  assert.equal(session.attack('jab'), true);
  assert.equal(session.state.stats.contacts, 0);
  assert.equal(session.state.sequence.steps[0].status, 'waiting');
  session.update(BAG_TIMINGS.jab.anticipation - .001);
  assert.equal(session.state.stats.contacts, 0);
  session.update(.001);
  assert.equal(session.state.stats.contacts, 1);
  assert.equal(session.state.stats.accurate, 1);
  assert.equal(session.state.stats.perfect, 1);
  assert.equal(session.state.stats.combosCompleted, 1);
  assert.equal(session.state.player.action, 'jab');
  assert.ok(Math.abs(session.state.player.progress - BAG_TIMINGS.jab.impact) < 1e-8);
  const impact = session.drainEvents().find(event => event.type === 'bag-hit');
  assert.equal(impact.result, 'perfect');
  assert.ok(Math.abs(impact.time - target.targetAt) < 1e-8);
  session.update(BAG_TIMINGS.jab.hold);
  assert.equal(session.state.player.action, 'jab');
  assert.equal(session.state.stats.contacts, 1);
  session.update(BAG_TIMINGS.jab.recovery);
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.drainEvents().filter(event => event.type === 'bag-hit').length, 0);
});

test('a completed jab-direct makes J a hook only in the announced third input window', () => {
  const session = create();
  reachHookSequence(session);
  const sequence = session.state.sequence;
  for (const step of sequence.steps.slice(0, 2)) {
    advanceTo(session, step.inputAt);
    assert.equal(session.attack(step.input), true);
    advanceTo(session, step.inputAt + BAG_TIMINGS[step.action].duration);
  }
  assert.equal(sequence.comboReady, false, 'the third input window is not open yet');
  advanceTo(session, sequence.steps[2].inputAt - .2);
  assert.equal(sequence.comboReady, true);
  assert.equal(session.attack('jab'), true);
  assert.equal(session.state.player.action, 'hook');
  const contacts = session.state.stats.contacts;
  session.update(BAG_TIMINGS.hook.anticipation);
  assert.equal(session.state.stats.contacts, contacts + 1);
  assert.equal(sequence.steps[2].status, 'hit');
  assert.equal(sequence.steps[2].quality, 'good');
  assert.equal(sequence.result, 'completed');
  assert.equal(session.drainEvents().filter(event => event.type === 'bag-hit').at(-1).attack, 'hook');
});

test('an early J or a broken preceding combination stays a jab', () => {
  const early = create();
  reachHookSequence(early);
  const sequence = early.state.sequence;
  for (const step of sequence.steps.slice(0, 2)) {
    advanceTo(early, step.inputAt);
    early.attack(step.input);
    advanceTo(early, step.inputAt + BAG_TIMINGS[step.action].duration);
  }
  assert.equal(early.attack('jab'), true);
  assert.equal(early.state.player.action, 'jab');
  early.update(.48);
  assert.equal(sequence.steps[2].status, 'waiting');

  const broken = create();
  reachHookSequence(broken);
  const brokenSequence = broken.state.sequence;
  advanceTo(broken, brokenSequence.steps[0].inputAt);
  broken.attack('cross');
  advanceTo(broken, brokenSequence.steps[1].inputAt);
  broken.attack('cross');
  advanceTo(broken, brokenSequence.steps[2].inputAt);
  assert.equal(brokenSequence.comboReady, false);
  assert.equal(broken.attack('jab'), true);
  assert.equal(broken.state.player.action, 'jab');
  broken.update(.48);
  assert.equal(brokenSequence.result, 'missed');
  assert.equal(broken.state.stats.wrong, 2);
});

test('wrong input is useful feedback at impact, without a punch queue or repeated scoring', () => {
  const session = create();
  advanceTo(session, session.state.sequence.steps[0].inputAt);
  assert.equal(session.attack('cross'), true);
  for (let input = 0; input < 100; input++) assert.equal(session.attack('jab'), false);
  assert.equal(session.state.stats.wrong, 0);
  session.update(BAG_TIMINGS.cross.anticipation);
  assert.equal(session.state.stats.wrong, 1);
  assert.equal(session.state.stats.contacts, 1);
  assert.equal(session.state.stats.missedSteps, 1);
  assert.equal(session.state.stats.combosMissed, 1);
  assert.match(session.state.feedback.text, /jab/);
  assert.equal(session.state.player.action, 'cross', 'the mistake cannot remove a committed glove');
  session.update(1);
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.state.stats.contacts, 1);
  assert.equal(session.drainEvents().filter(event => event.type === 'bag-hit').length, 1);
});

test('early attempts can recover; late committed punches remain visible when the target expires', () => {
  const early = create();
  early.attack('jab');
  early.update(.48);
  assert.equal(early.state.stats.early, 1);
  assert.equal(early.state.sequence.steps[0].status, 'waiting');
  completeSequence(early);
  assert.equal(early.state.stats.contacts, 2);
  assert.equal(early.state.stats.accurate, 1);

  const late = create();
  const deadline = late.state.sequence.steps[0].targetAt + BAG_RHYTHM.tolerance;
  advanceTo(late, deadline - .05);
  late.attack('jab');
  advanceTo(late, deadline);
  assert.equal(late.state.stats.missedSteps, 1);
  assert.equal(late.state.stats.contacts, 0);
  assert.equal(late.state.player.action, 'jab');
  late.update(.15);
  assert.equal(late.state.stats.contacts, 1);
  assert.equal(late.state.stats.late, 1);
  assert.equal(late.state.player.action, 'jab');
  assert.equal(late.drainEvents().filter(event => event.type === 'bag-hit').length, 1);
});

test('both edges of the beginner tolerance accept the intended contact', () => {
  for (const offset of [-BAG_RHYTHM.tolerance, BAG_RHYTHM.tolerance]) {
    const session = create();
    completeSequence(session, { offset });
    assert.equal(session.state.stats.accurate, 1);
    assert.equal(session.state.stats.perfect, 0);
    assert.equal(session.state.stats.missedSteps, 0);
  }
});

test('pause freezes anticipation, cues and the clock without replaying contact on resume', () => {
  const session = create();
  advanceTo(session, session.state.sequence.steps[0].inputAt);
  session.attack('jab');
  session.update(.1);
  assert.equal(session.pause(), true);
  const frozen = structuredClone(session.state);
  session.update(30);
  assert.equal(session.attack('cross'), false);
  assert.deepEqual(session.state, frozen);
  assert.equal(session.resume(), true);
  session.update(.1);
  assert.equal(session.state.stats.contacts, 1);
  session.pause(); session.update(30); session.resume(); session.update(.3);
  assert.equal(session.state.stats.contacts, 1);
  assert.equal(session.drainEvents().filter(event => event.type === 'bag-hit').length, 1);
});

test('no-input timeout reports missed patterns once, ends exactly at 45 seconds, and resets cleanly', () => {
  const session = create();
  session.update(NaN); session.update(-1); session.update(Infinity);
  assert.equal(session.state.elapsed, 0);
  session.update(100);
  assert.equal(session.state.elapsed, 45);
  assert.equal(session.state.remaining, 0);
  assert.equal(session.state.phase, 'finished');
  assert.equal(session.state.stats.contacts, 0);
  assert.ok(session.state.stats.combosMissed > 3);
  assert.equal(session.state.summary.precision, 0);
  assert.equal(session.state.summary.rhythm, 0);
  assert.doesNotMatch(session.state.summary.positive, /réussi/);
  assert.match(session.state.summary.improve, /jab/);
  const events = session.drainEvents();
  assert.equal(events.filter(event => event.type === 'round-end').length, 1);
  assert.equal(events.filter(event => event.type === 'sequence-end').length, session.state.stats.combosMissed);
  assert.equal(session.attack('jab'), false);
  session.update(5);
  assert.deepEqual(session.drainEvents(), []);
  session.reset();
  assert.equal(session.state.phase, 'ready');
  assert.equal(session.state.remaining, 45);
  assert.equal(session.state.sequence.index, 0);
  assert.equal(session.state.summary, null);
  assert.equal(session.state.stats.contacts, 0);
  assert.equal(session.start(), true);
});

test('the final accepted punch finishes its hold and recovery before the 45-second bell', () => {
  const session = create();
  advanceTo(session, 45 - BAG_TIMINGS.cross.duration);
  assert.equal(session.attack('cross'), true);
  session.update(BAG_TIMINGS.cross.anticipation);
  assert.equal(session.state.stats.contacts, 1);
  assert.equal(session.state.player.action, 'cross');
  session.update(BAG_TIMINGS.cross.hold);
  assert.equal(session.state.phase, 'running');
  session.update(BAG_TIMINGS.cross.recovery);
  assert.equal(session.state.phase, 'finished');
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.state.elapsed, 45);

  const tooLate = create();
  advanceTo(tooLate, 44.8);
  assert.equal(tooLate.attack('jab'), false);
  tooLate.update(1);
  assert.equal(tooLate.state.stats.contacts, 0);
});

test('the same choreography produces the same contacts and completed patterns at 20 and 60 Hz', () => {
  function play(hz) {
    const session = create();
    while (session.state.phase === 'running' && session.state.sequence.result === null) {
      completeSequence(session, { hz });
    }
    advanceTo(session, 45, hz);
    return { state: session.state, events: session.drainEvents() };
  }
  const slow = play(20);
  const fast = play(60);
  assert.deepEqual(slow.state.stats, fast.state.stats);
  assert.equal(slow.state.stats.combosMissed, 0);
  assert.equal(slow.state.stats.missedSteps, 0);
  assert.ok(slow.state.stats.combosCompleted >= 8);
  assert.equal(slow.state.stats.accurate, slow.state.stats.contacts);
  assert.equal(slow.state.summary.precision, 100);
  assert.equal(slow.state.summary.rhythm, 100);
  assert.deepEqual(slow.events.map(({ time, offset, ...event }) => event), fast.events.map(({ time, offset, ...event }) => event));
  for (let index = 0; index < slow.events.length; index++) {
    assert.ok(Math.abs(slow.events[index].time - fast.events[index].time) < 1e-8);
  }
});
