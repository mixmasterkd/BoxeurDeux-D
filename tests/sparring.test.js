import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession, TIMINGS, IMPACT_HOLD } from '../src/game/SparringSession.js';

const create = (settings = {}) => new SparringSession({ random: () => 0.5, ...settings });
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

function advanceUntil(session, predicate, seconds = 10) {
  for (let t = 0; t < seconds && !predicate(session.state); t += 0.005) session.update(0.005);
  assert.ok(predicate(session.state), 'Expected combat stage reached in time');
}

test('only a started, running round accepts controls and advances time', () => {
  const session = create();
  assert.equal(session.act('jab'), false);
  assert.equal(session.setGuard(true), false);
  session.update(3);
  assert.equal(session.state.remaining, 60);
  assert.equal(session.start(), true);
  assert.equal(session.start(), false);
  assert.equal(session.act('not-an-action'), false);
  assert.equal(session.act('hit'), false);
  assert.equal(session.act('jab'), true);
  assert.equal(session.act('cross'), false, 'Cannot overlap two offensive actions');
});

test('jab counts exactly at glove contact and has time for a visible contact hold', () => {
  const session = create();
  session.start();
  session.act('jab');
  const contact = TIMINGS.player.jab.duration * TIMINGS.player.jab.impact;
  session.update(contact - 0.00001);
  assert.equal(session.state.stats.landed, 0);
  session.update(0.00001);
  assert.equal(session.state.stats.landed, 1);
  close(session.state.player.progress, TIMINGS.player.jab.impact);
  assert.equal(session.state.remi.action, 'hit');
  assert.equal(session.state.remi.hurt, 1);
  const events = session.drainEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'player-hit');
  close(events[0].time, contact);
  session.update(IMPACT_HOLD);
  assert.equal(session.state.player.action, 'jab');
  session.update(0.4);
  assert.equal(session.state.stats.landed, 1, 'One punch cannot count twice');
  assert.equal(session.drainEvents().length, 0, 'Events are consumed once');
});

test('cross costs more stamina, hits later, and resting recovers after its delay', () => {
  const session = create();
  session.start();
  session.act('cross');
  assert.equal(session.state.stamina, 83);
  session.update(0.299);
  assert.equal(session.state.stats.landed, 0);
  session.update(0.001);
  assert.equal(session.state.stats.landed, 1);
  close(session.state.player.progress, 0.5);
  session.update(0.64);
  close(session.state.stamina, 83);
  session.update(0.5);
  assert.ok(session.state.stamina > 92 && session.state.stamina < 94);
});

test('Rémi keeps the same tell and attack schedule when the player punches repeatedly', () => {
  const quiet = create();
  const active = create();
  quiet.start();
  active.start();
  const quietSchedule = [];
  const activeSchedule = [];
  for (let i = 0; i < 360; i += 1) {
    active.act(i % 2 ? 'jab' : 'cross');
    quiet.update(0.05);
    active.update(0.05);
    for (const [session, schedule] of [[quiet, quietSchedule], [active, activeSchedule]]) {
      schedule.push(...session.drainEvents()
        .filter(event => event.type === 'tell' || event.type.startsWith('remi-'))
        .map(event => ({ time: Math.round(event.time * 1e6), side: event.side, attack: event.attack })));
    }
  }
  assert.ok(quietSchedule.length >= 10);
  assert.deepEqual(activeSchedule, quietSchedule, 'No reactive input-reading blocks or stun-lock of tells');
});

test('a telegraph stays readable when Rémi receives a jab during preparation', () => {
  const session = create();
  session.start();
  advanceUntil(session, state => state.remi.action === 'tellLeft');
  session.act('jab');
  session.update(0.2);
  assert.equal(session.state.stats.landed, 1);
  assert.equal(session.state.remi.action, 'tellLeft');
  assert.ok(session.state.remi.hurt > 0);
  advanceUntil(session, state => state.remi.action === 'jab');
  assert.equal(session.state.remi.safeDodge, 'dodgeRight');
  session.update(0.25);
  assert.equal(session.state.stats.received, 1);
});

test('guard, a correct dodge, a wrong dodge and an early dodge have distinct outcomes', () => {
  for (const defense of ['guard', 'dodgeRight', 'dodgeLeft', 'early']) {
    const session = create();
    session.start();
    if (defense === 'early') {
      advanceUntil(session, state => state.remi.action === 'tellLeft');
      session.act('dodgeRight');
    }
    advanceUntil(session, state => state.remi.action === 'jab');
    session.drainEvents();
    if (defense === 'guard') session.setGuard(true);
    else if (defense !== 'early') session.act(defense);
    session.update(0.24);
    const events = session.drainEvents();
    const expected = defense === 'guard' ? 'remi-blocked' : defense === 'dodgeRight' ? 'remi-dodged' : 'remi-hit';
    assert.equal(events.at(-1).type, expected, defense);
    assert.equal(session.state.stats.received, expected === 'remi-hit' ? 1 : 0, defense);
    assert.equal(session.state.stats.blocked, expected === 'remi-blocked' ? 1 : 0, defense);
    assert.equal(session.state.stats.dodged, expected === 'remi-dodged' ? 1 : 0, defense);
  }
});

test('the second attack reverses the safe dodge and leaves an opening afterward', () => {
  const session = create();
  session.start();
  advanceUntil(session, state => state.remi.action === 'tellRight');
  assert.equal(session.state.remi.safeDodge, 'dodgeLeft');
  advanceUntil(session, state => state.remi.action === 'cross');
  assert.equal(session.act('dodgeLeft'), true);
  session.update(0.28);
  assert.equal(session.state.stats.dodged, 1);
  advanceUntil(session, state => state.remi.action === 'open');
  assert.equal(session.act('cross'), true);
  session.update(0.3);
  assert.equal(session.state.stats.landed, 1);
});

test('Rémi blocks only during his scheduled guard, regardless of button press timing', () => {
  const session = create();
  session.start();
  advanceUntil(session, state => state.remi.action === 'guard');
  session.act('jab');
  session.update(0.2);
  assert.equal(session.state.stats.opponentBlocked, 1);
  assert.equal(session.state.stats.landed, 0);
  assert.equal(session.drainEvents().at(-1).type, 'player-blocked');
  assert.equal(session.state.remi.action, 'guard');
});

test('holding guard drains stamina, can break, and releasing permits recovery', () => {
  const session = create({ duration: 40 });
  session.start();
  session.setGuard(true);
  session.update(10);
  assert.ok(session.state.stamina < 20);
  session.update(5);
  assert.ok(session.drainEvents().some(event => event.type === 'exhausted'));
  assert.ok(session.state.stamina >= 0 && session.state.stamina <= 100);
  session.releaseControls();
  const depleted = session.state.stamina;
  session.update(1);
  assert.ok(session.state.stamina > depleted);
});

test('pause freezes timer, actions and stamina and releases held guard', () => {
  const session = create();
  session.start();
  session.setGuard(true);
  session.update(0.4);
  assert.equal(session.pause(), true);
  const frozen = structuredClone(session.state);
  assert.equal(session.state.player.action, 'idle');
  session.update(20);
  assert.deepEqual(session.state, frozen);
  assert.equal(session.act('jab'), false);
  assert.equal(session.setGuard(true), false);
  assert.equal(session.resume(), true);
  session.update(0.5);
  assert.ok(session.state.stamina > frozen.stamina);
});

test('a round finishes once at 60 seconds and reset yields a clean playable round', () => {
  const session = create();
  session.start();
  session.act('jab');
  session.update(80);
  assert.equal(session.state.phase, 'finished');
  assert.equal(session.state.remaining, 0);
  assert.equal(session.state.elapsed, 60);
  const endEvents = session.drainEvents().filter(event => event.type === 'round-end');
  assert.equal(endEvents.length, 1);
  assert.equal(endEvents[0].stats.landed, 1);
  assert.equal(session.act('jab'), false);
  session.update(5);
  assert.deepEqual(session.drainEvents(), []);
  session.reset({ tempo: 'calm', recovery: 1.5 });
  assert.equal(session.state.phase, 'ready');
  assert.equal(session.state.stamina, 100);
  assert.equal(session.state.stats.landed, 0);
  assert.equal(session.state.settings.tempo, 'calm');
  session.start();
  assert.equal(session.act('cross'), true);
});

test('tempo and recovery settings change their intended training dimensions', () => {
  const calm = create({ tempo: 'calm', recovery: 1 });
  const fast = create({ tempo: 'fast', recovery: 1.5 });
  for (const session of [calm, fast]) {
    session.start();
    session.act('cross');
    session.update(1.2);
  }
  assert.ok(fast.state.stamina > calm.state.stamina);
  advanceUntil(calm, state => state.remi.action === 'tellLeft');
  advanceUntil(fast, state => state.remi.action === 'tellLeft');
  assert.ok(calm.state.remi.duration > fast.state.remi.duration);
  const committedDuration = calm.state.remi.duration;
  calm.setSettings({ tempo: 'fast' });
  calm.update(0.01);
  assert.equal(calm.state.remi.duration, committedDuration, 'An announced attack must not suddenly accelerate');
});
