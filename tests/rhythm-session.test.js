import test from 'node:test';
import assert from 'node:assert/strict';
import { RhythmSession } from '../src/game/RhythmSession.js';

const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, message ?? `${actual} ≠ ${expected}`);
const advanceTo = (session, time) => session.update(Math.max(0, time - session.state.elapsed));

function perfectRound(activity, fps = 60, duration = 45) {
  const session = new RhythmSession({ activity, duration });
  session.start();
  let nextInput = session.rules.preparation, index = 0;
  for (let frame = 1; session.state.phase === 'running'; frame += 1) {
    const end = Math.min(duration, frame / fps);
    while (nextInput <= end + 1e-9 && nextInput + session.rules.duration + session.rules.tolerance <= duration + 1e-9) {
      advanceTo(session, nextInput);
      assert.equal(session.act(index % 2 ? 'cross' : 'jab'), true);
      index += 1; nextInput = session.rules.preparation + index * session.rules.interval;
    }
    advanceTo(session, end);
  }
  return session;
}

for (const activity of ['speedball', 'rope']) {
  test(`${activity}: a fresh input starts a real motion; the score and sound occur at contact`, () => {
    const session = new RhythmSession({ activity }); session.start(); session.drainEvents();
    const first = { ...session.state.beat };
    near(first.targetAt - first.inputAt, session.rules.contact);
    advanceTo(session, first.inputAt);
    assert.equal(session.act('jab'), true);
    assert.equal(session.state.player.action, 'jab');
    assert.equal(session.state.player.input, 'jab');
    assert.equal(session.state.player.impacted, false);
    assert.equal(session.state.player.status, 'pending');
    assert.equal(session.state.beat.status, 'pending');
    assert.equal(session.state.stats.hits, 0);
    assert.equal(session.state.stats.attempts, 0);
    assert.deepEqual(session.drainEvents(), []);

    session.update(session.rules.contact - .0001);
    assert.equal(session.state.stats.hits, 0);
    session.update(.0001);
    assert.equal(session.state.stats.hits, 1);
    assert.equal(session.state.stats.attempts, 1);
    assert.equal(session.state.stats.perfect, 1);
    assert.equal(session.state.player.impacted, true);
    assert.equal(session.state.player.status, 'hit');
    assert.equal(session.state.player.phase, 'contact');
    const [contact] = session.drainEvents();
    assert.equal(contact.type, 'hit'); assert.equal(contact.input, 'jab');
    assert.equal(contact.result, 'perfect'); assert.equal(contact.index, 0);
    near(contact.time, first.targetAt); near(contact.offset, 0);
    assert.equal(session.state.beat.expected, 'cross');
    session.update(session.rules.hold / 2);
    assert.equal(session.state.player.phase, 'contact');
    assert.equal(session.act('cross'), false, 'The returning hand cannot queue a second action.');
    advanceTo(session, first.inputAt + session.rules.duration);
    assert.equal(session.state.player.action, 'idle');
  });

  test(`${activity}: a wrong side uses one beat and keeps its visible motion through recovery`, () => {
    const session = new RhythmSession({ activity }); session.start();
    advanceTo(session, session.state.beat.inputAt);
    assert.equal(session.act('cross'), true);
    assert.equal(session.state.stats.wrong, 0);
    assert.equal(session.state.player.action, 'cross');
    assert.equal(session.state.player.result, 'wrong');
    session.update(session.rules.contact);
    assert.equal(session.state.stats.wrong, 1); assert.equal(session.state.stats.missed, 0);
    assert.equal(session.state.player.action, 'cross');
    assert.equal(session.state.player.status, 'miss');
    advanceTo(session, session.rules.preparation + session.rules.interval - .001);
    assert.equal(session.state.stats.wrong, 1);
    assert.equal(session.state.stats.missed, 0, 'A reserved wrong beat must never also become a missed beat.');
    const miss = session.drainEvents().filter(event => event.type === 'miss');
    assert.equal(miss.length, 1); assert.equal(miss[0].result, 'wrong');
    assert.equal(session.state.beat.index, 1);
  });

  test(`${activity}: pause and control release freeze an unfinished movement without losing it`, () => {
    const session = new RhythmSession({ activity }); session.start(); session.drainEvents();
    advanceTo(session, session.state.beat.inputAt); session.act('jab');
    session.update(session.rules.contact / 2);
    assert.equal(session.pause(), true); session.releaseControls();
    const paused = structuredClone(session.state);
    session.update(100);
    assert.deepEqual(session.state, paused);
    assert.equal(session.act('cross'), false);
    assert.deepEqual(session.drainEvents(), []);
    assert.equal(session.resume(), true);
    session.update(session.rules.contact / 2);
    assert.equal(session.state.stats.hits, 1);
    assert.equal(session.state.player.impacted, true);
    near(session.drainEvents()[0].time, session.rules.preparation + session.rules.contact);
  });

  test(`${activity}: 20 Hz and 60 Hz produce identical training results and contact times`, () => {
    const low = perfectRound(activity, 20), high = perfectRound(activity, 60);
    assert.deepEqual(low.state.summary, high.state.summary);
    assert.equal(low.state.summary.accuracy, 100);
    assert.equal(low.state.summary.qualified, true);
    assert.ok(low.state.summary.hits >= 50);
    const lowEvents = low.drainEvents(), highEvents = high.drainEvents();
    assert.equal(lowEvents.length, highEvents.length);
    lowEvents.forEach((event, i) => {
      assert.equal(event.type, highEvents[i].type);
      assert.equal(event.result, highEvents[i].result);
      near(event.time, highEvents[i].time);
    });
    assert.equal(lowEvents.filter(event => event.type === 'round-end').length, 1);
    low.update(100); assert.deepEqual(low.drainEvents(), []);
  });

  test(`${activity}: simultaneous inputs and a held action cannot create repeat hits`, () => {
    const session = new RhythmSession({ activity }); session.start();
    advanceTo(session, session.state.beat.inputAt);
    assert.equal(session.act('jab'), true);
    for (let i = 0; i < 20; i += 1) {
      assert.equal(session.act('jab'), false);
      assert.equal(session.act('cross'), false);
    }
    session.update(100);
    assert.equal(session.state.summary.hits, 1);
    assert.equal(session.state.summary.attempts, 1);
    assert.equal(session.state.summary.qualified, false);
    assert.equal(session.drainEvents().filter(event => event.type === 'hit').length, 1);
  });

  test(`${activity}: button mashing cannot earn a training improvement`, () => {
    const session = new RhythmSession({ activity }); session.start();
    let presses = 0;
    while (session.state.phase === 'running') {
      session.act(presses++ % 2 ? 'cross' : 'jab');
      session.update(.05);
    }
    assert.equal(session.state.summary.qualified, false);
    assert.ok(session.state.summary.accuracy < 60);
    assert.ok(session.state.summary.early + session.state.summary.late + session.state.summary.wrong > 0);
    assert.ok(session.state.summary.attempts < presses / 2, 'Movements have a real recovery time.');
  });

  test(`${activity}: a shortened test session never schedules an impossible ending or earns a bonus`, () => {
    const session = perfectRound(activity, 60, 5);
    assert.equal(session.state.duration, 5);
    assert.equal(session.state.summary.accuracy, 100);
    assert.equal(session.state.summary.qualified, false, 'The real minimum remains twenty contacts.');
    assert.equal(session.state.beat.phase, 'complete');
    assert.equal(session.state.beat.expected, null);
    assert.equal(session.act('jab'), false);
    const contacts = session.drainEvents().filter(event => event.type === 'hit');
    const last = contacts.at(-1);
    assert.ok(last.time - session.rules.contact + session.rules.duration + session.rules.tolerance <= 5 + 1e-9);
  });
}

test('early and late attempts are counted only at their contact and lower the final precision', () => {
  const session = new RhythmSession({ activity: 'speedball', duration: 5 }); session.start();
  assert.equal(session.act('jab'), true);
  assert.equal(session.state.stats.early, 0);
  session.update(session.rules.contact);
  assert.equal(session.state.stats.early, 1);
  advanceTo(session, session.state.beat.inputAt); session.act('jab');
  session.update(session.rules.duration);
  const second = { ...session.state.beat };
  advanceTo(session, second.inputAt + session.rules.tolerance + .01);
  assert.equal(session.act('cross'), true);
  assert.equal(session.state.stats.late, 0);
  session.update(session.rules.contact);
  assert.equal(session.state.stats.late, 1);
  session.update(100);
  const summary = session.state.summary;
  const attemptsAndBeats = summary.hits + summary.wrong + summary.missed + summary.early + summary.late;
  assert.equal(summary.accuracy, Math.round(100 * summary.hits / attemptsAndBeats));
  assert.equal(summary.attempts, 3);
  assert.equal(summary.qualified, false);
});

test('waiting for the beat never starts an automatic jump or punch', () => {
  for (const activity of ['rope', 'speedball']) {
    const session = new RhythmSession({ activity }); session.start();
    session.update(4);
    assert.equal(session.state.player.action, 'idle');
    assert.equal(session.state.stats.attempts, 0);
    assert.equal(session.state.stats.hits, 0);
    assert.ok(session.state.stats.missed > 0);
    session.update(100);
    assert.equal(session.state.summary.qualified, false);
  }
});

test('invalid settings retain the public 45 second default, with no device names in model feedback', () => {
  const session = new RhythmSession({ activity: 'unknown', duration: 'nope' });
  assert.equal(session.activity, 'speedball');
  assert.equal(session.state.duration, 45);
  assert.equal(session.state.remaining, 45);
  assert.equal(session.state.rules.interval, .68);
  assert.equal(new RhythmSession({ activity: 'rope' }).state.rules.interval, .8);
  assert.doesNotMatch(session.state.feedback.text, /\b[ABJK]\b/);
  assert.equal(session.act('jab'), false);
  session.start();
  assert.equal(session.act('dodgeLeft'), false);
  session.update(100);
  assert.equal(session.state.summary.hits, 0);
  assert.ok(session.state.summary.missed >= 60);
  assert.equal(session.state.summary.qualified, false);
});
