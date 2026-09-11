import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_WINDOW, SparringSession, TIMINGS, TEMPOS } from '../src/game/SparringSession.js';
import { fighterMotion } from '../src/game/FighterMotion.js';

const create = (settings = {}) => {
  const session = new SparringSession({ random: () => 0.5, ...settings });
  session.start();
  return session;
};
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
const attackEvents = session => session.drainEvents().filter(event => event.type.startsWith('player-'));

function advance(session, seconds, frame = 1 / 60) {
  for (let remaining = seconds; remaining > 1e-9;) {
    const dt = Math.min(frame, remaining);
    session.update(dt);
    remaining -= dt;
  }
}

function until(session, predicate, limit = 10) {
  for (let time = 0; !predicate(session.state) && time < limit; time += .005) session.update(.005);
  assert.ok(predicate(session.state), 'Expected scheduled stage was reached');
}

function punch(session, input, expected = input, frame = 1 / 60) {
  assert.equal(session.act(input), true, `${input} is accepted after recovery`);
  assert.equal(session.state.player.action, expected);
  advance(session, TIMINGS.player[expected].duration, frame);
}

function prepareHook(session, frame = 1 / 60) {
  punch(session, 'jab', 'jab', frame);
  punch(session, 'cross', 'cross', frame);
  assert.equal(session.state.combo.step, 2);
  assert.equal(session.state.combo.ready, true);
  close(session.state.combo.remaining, COMBO_WINDOW);
}

test('J K J lands a left hook at contact, charges 48 stamina and counts a full combination once', () => {
  const session = create();
  prepareHook(session);
  assert.equal(session.state.stats.landed, 2);
  assert.equal(session.state.stats.hooks, 0);
  assert.equal(session.state.stats.combos, 0);
  assert.equal(session.act('jab'), true);
  assert.equal(session.state.player.action, 'hook');
  assert.deepEqual(session.state.combo, { step: 0, ready: false, remaining: 0 });
  assert.equal(session.state.stamina, 52);
  session.update(.31999);
  assert.equal(session.state.stats.landed, 2);
  session.update(.00001);
  assert.equal(session.state.stats.landed, 3);
  assert.equal(session.state.stats.hooks, 1);
  assert.equal(session.state.stats.combos, 1);
  const events = attackEvents(session);
  assert.deepEqual(events.map(event => event.attack), ['jab', 'cross', 'hook']);
  assert.equal(events[2].combo, true);
  close(events[2].time, 1.36);
  session.update(.36);
  assert.equal(session.state.stats.thrown, 3);
  assert.equal(session.state.stats.combos, 1);
  session.update(.34);
  close(session.state.stamina, 52);
  session.update(.20);
  assert.ok(session.state.stamina > 55 && session.state.stamina < 57, 'Rest still recovers after the hook');
});

test('20 and 60 Hz produce the same punch contacts, stamina and combination result', () => {
  const outcomes = [20, 60].map(hz => {
    const session = create();
    prepareHook(session, 1 / hz);
    punch(session, 'jab', 'hook', 1 / hz);
    return {
      stats: session.state.stats,
      stamina: session.state.stamina,
      events: attackEvents(session).map(({ type, attack, combo, time }) => ({ type, attack, combo, time: Math.round(time * 1e6) })),
    };
  });
  assert.deepEqual(outcomes[0], outcomes[1]);
  assert.equal(outcomes[0].stats.combos, 1);
});

test('a hook cannot be invoked directly and a cross alone does not prepare one', () => {
  const session = create();
  assert.equal(session.act('hook'), false);
  assert.equal(session.state.stamina, 100);
  punch(session, 'cross');
  assert.equal(session.state.combo.step, 0);
  punch(session, 'cross');
  punch(session, 'jab');
  assert.equal(session.state.stats.hooks, 0);
  assert.equal(session.state.combo.step, 1, 'A fresh jab begins a new sequence');
});

test('the follow-up window begins after recovery, includes its boundary and then expires', () => {
  for (const stage of ['cross', 'hook']) {
    for (const delay of [COMBO_WINDOW, COMBO_WINDOW + .00001]) {
      const session = create();
      if (stage === 'cross') punch(session, 'jab');
      else prepareHook(session);
      advance(session, delay);
      assert.equal(session.state.combo.step, delay === COMBO_WINDOW ? (stage === 'cross' ? 1 : 2) : 0);
      assert.equal(session.act(stage === 'cross' ? 'cross' : 'jab'), true);
      if (stage === 'cross') assert.equal(session.state.combo.step, delay === COMBO_WINDOW ? 2 : 0);
      else assert.equal(session.state.player.action, delay === COMBO_WINDOW ? 'hook' : 'jab');
    }
  }
});

test('early button spam is ignored without queuing, breaking or advancing the sequence', () => {
  const session = create();
  assert.equal(session.act('jab'), true);
  for (let i = 0; i < 10; i += 1) {
    assert.equal(session.act(i % 2 ? 'jab' : 'cross'), false);
    session.update(.02);
  }
  assert.equal(session.state.combo.step, 1);
  assert.equal(session.state.combo.remaining, 0);
  assert.equal(session.state.stats.thrown, 1);
  session.update(.24);
  assert.equal(session.state.player.action, 'idle', 'No buffered direct starts automatically');
  punch(session, 'cross');
  assert.equal(session.act('jab'), true);
  assert.equal(session.state.player.action, 'hook');
});

test('an accepted second jab restarts the chain instead of completing the wrong sequence', () => {
  const session = create();
  punch(session, 'jab');
  punch(session, 'jab');
  assert.equal(session.state.combo.step, 1);
  punch(session, 'cross');
  punch(session, 'jab', 'hook');
  assert.deepEqual(attackEvents(session).map(event => event.attack), ['jab', 'jab', 'cross', 'hook']);
});

test('a scheduled guard can block the hook without changing its animation or refunding its cost', () => {
  const session = create();
  advance(session, .55);
  prepareHook(session);
  assert.equal(session.state.stats.landed, 2);
  assert.equal(session.act('jab'), true);
  session.update(.32);
  assert.equal(session.state.player.action, 'hook');
  assert.equal(session.state.remi.action, 'guard');
  assert.equal(session.state.stats.opponentBlocked, 1);
  assert.equal(session.state.stats.hooks, 0);
  assert.equal(session.state.stats.combos, 0);
  assert.equal(session.state.stamina, 52);
  assert.equal(attackEvents(session).at(-1).type, 'player-blocked');
});

test('blocked lead punches still permit the motion sequence but not a three-touch combination', () => {
  const session = create();
  until(session, state => state.remi.action === 'guard');
  prepareHook(session);
  punch(session, 'jab', 'hook');
  const events = attackEvents(session);
  assert.equal(events[0].type, 'player-blocked');
  assert.equal(events.at(-1).attack, 'hook');
  assert.equal(events.at(-1).type, 'player-hit');
  assert.equal(events.at(-1).combo, false);
  assert.equal(session.state.stats.hooks, 1);
  assert.equal(session.state.stats.combos, 0);
});

test('guard and either dodge break a prepared sequence; holding guard cannot rebuild one', () => {
  for (const defense of ['guard', 'dodgeLeft', 'dodgeRight']) {
    const session = create();
    prepareHook(session);
    if (defense === 'guard') {
      session.setGuard(true);
      session.setGuard(false);
    } else punch(session, defense);
    assert.equal(session.state.combo.step, 0);
    punch(session, 'jab');
  }
  const held = create();
  held.setGuard(true);
  punch(held, 'jab');
  punch(held, 'cross');
  punch(held, 'jab');
  assert.equal(held.state.combo.step, 0);
  assert.equal(held.state.stats.hooks, 0);
});

test('insufficient stamina rejects the expensive hook, clears preparation and never substitutes a cheaper jab', () => {
  const session = create();
  // Boundary fixture: 40 stamina affords both lead punches, but not their hook.
  session.state.stamina = 40;
  punch(session, 'jab');
  punch(session, 'cross');
  assert.equal(session.state.stamina, 13);
  assert.equal(session.state.combo.step, 2);
  assert.equal(session.state.combo.ready, false);
  assert.equal(session.act('jab'), false);
  assert.equal(session.state.stats.thrown, 2);
  assert.equal(session.state.stamina, 13);
  assert.equal(session.state.combo.step, 0);
  assert.equal(session.drainEvents().at(-1).action, 'hook');
  assert.equal(session.act('jab'), true, 'A deliberate new press may start an affordable new jab');
  assert.equal(session.state.player.action, 'jab');
});

test('pause and focus-release clear preparation and preserve an already committed punch', () => {
  for (const interrupt of ['pause', 'releaseControls']) {
    const session = create();
    prepareHook(session);
    session[interrupt]();
    assert.equal(session.state.combo.step, 0);
    if (interrupt === 'pause') session.resume();
    punch(session, 'jab');

    const committed = create();
    prepareHook(committed);
    committed.act('jab');
    committed.update(.1);
    committed[interrupt]();
    assert.equal(committed.state.player.action, 'hook');
    if (interrupt === 'pause') {
      const frozen = structuredClone(committed.state);
      committed.update(4);
      assert.deepEqual(committed.state, frozen);
      committed.resume();
    }
    committed.update(.22);
    assert.equal(committed.state.stats.hooks, 1);
    assert.equal(committed.state.stats.combos, 0, 'The interruption breaks the three-touch achievement');
    assert.equal(attackEvents(committed).at(-1).combo, false);
  }
});

test('receiving a punch breaks the chain while the committed hook still makes contact', () => {
  const session = create();
  until(session, state => state.remi.action === 'guard');
  // The jab lands just after the guard opens; Rémi then attacks during our hook.
  advance(session, session.state.remi.duration * (1 - session.state.remi.progress) - .19);
  prepareHook(session);
  assert.equal(session.state.stats.landed, 2);
  assert.equal(session.act('jab'), true);
  until(session, state => state.stats.received === 1);
  assert.equal(session.state.player.action, 'hook', 'A received punch never cancels the glove already in flight');
  until(session, state => state.stats.hooks === 1);
  assert.equal(session.state.stats.landed, 3);
  assert.equal(session.state.stats.combos, 0);
  assert.equal(attackEvents(session).at(-1).combo, false);
});

test('free openings fit the combination while all three guided lessons retain their original attacks and timings', () => {
  for (const tempo of ['calm', 'normal', 'fast']) {
    const session = create({ tempo });
    assert.equal(session.state.remi.duration, 1.85);
    until(session, state => state.remi.action === 'jab');
    until(session, state => state.remi.action === 'open');
    assert.equal(session.state.remi.duration, TEMPOS[tempo].openingFree);
  }
  for (const lesson of ['jab', 'guard', 'counter']) {
    const session = create({ lesson });
    assert.equal(session.state.remi.duration, 1.30);
    punch(session, 'jab');
    punch(session, 'cross');
    punch(session, 'jab');
    assert.deepEqual(session.state.combo, { step: 0, ready: false, remaining: 0 });
    assert.equal(session.state.stats.hooks, 0);
    assert.equal(session.state.stats.combos, 0);
  }
});

test('round completion and restart discard a prepared chain and reset its statistics', () => {
  const session = create({ duration: 2 });
  prepareHook(session);
  punch(session, 'jab', 'hook');
  advance(session, 1);
  assert.equal(session.state.phase, 'finished');
  assert.deepEqual(session.state.combo, { step: 0, ready: false, remaining: 0 });
  const end = session.drainEvents().find(event => event.type === 'round-end');
  assert.equal(end.stats.combos, 1);
  session.reset();
  assert.equal(session.state.stats.hooks, 0);
  assert.equal(session.state.stats.combos, 0);
  session.start();
  punch(session, 'jab');
  assert.equal(session.state.combo.step, 1);
});

test('a hook scored in the final frame stays visibly at contact while the clock and report freeze', () => {
  const session = create({ duration: 1.37 });
  prepareHook(session);
  assert.equal(session.act('jab'), true);
  session.update(.30);
  session.drainEvents();
  session.update(.05); // This frame crosses both contact at 1.36 and the bell at 1.37.
  assert.equal(session.state.phase, 'finished');
  assert.equal(session.state.elapsed, 1.37);
  assert.equal(session.state.remaining, 0);
  assert.equal(session.state.player.action, 'hook');
  assert.equal(fighterMotion(session.state.player, session.state.elapsed, 'player').phase, 'contact');
  assert.equal(session.state.stats.hooks, 1);
  assert.equal(session.state.stats.combos, 1);
  const events = session.drainEvents();
  assert.deepEqual(events.map(event => event.type), ['player-hit', 'round-end']);
  close(events[0].time, 1.36);
  assert.equal(events[1].stats.combos, 1);
  const frozen = structuredClone(session.state);
  assert.equal(session.act('jab'), false);
  session.update(5);
  assert.deepEqual(session.state, frozen, 'An unfinished pose cannot produce any post-bell attack or score');
  assert.deepEqual(session.drainEvents(), []);
  session.reset();
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.state.remi.action, 'idle');
  assert.equal(session.state.stats.hooks, 0);
  assert.equal(session.state.stats.combos, 0);
});

test('Rémi also retains a committed contact in the final frame without another received hit afterward', () => {
  const session = create({ duration: 3.60 });
  session.update(3.55);
  session.drainEvents();
  session.update(.05);
  assert.equal(session.state.phase, 'finished');
  assert.equal(session.state.elapsed, 3.60);
  assert.equal(session.state.remi.action, 'jab');
  assert.equal(fighterMotion(session.state.remi, session.state.elapsed, 'remi').phase, 'contact');
  assert.equal(session.state.stats.received, 1);
  assert.deepEqual(session.drainEvents().map(event => event.type), ['remi-hit', 'round-end']);
  const frozen = structuredClone(session.state);
  session.update(5);
  assert.deepEqual(session.state, frozen);
  assert.deepEqual(session.drainEvents(), []);
});
