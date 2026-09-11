import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession, TIMINGS } from '../src/game/SparringSession.js';
import { ShadowSession } from '../src/game/ShadowSession.js';
import { BagSession, BAG_TIMINGS } from '../src/game/BagSession.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
const create = (Model, settings = {}) => {
  const session = new Model({ random: () => .5, ...settings });
  session.start();
  return session;
};
function until(session, predicate, limit = 30) {
  for (let elapsed = 0; !predicate(session.state) && elapsed < limit; elapsed += .005) session.update(.005);
  assert.ok(predicate(session.state), 'The promised combat stage must arrive');
}
function to(session, time) {
  session.update(Math.max(0, time - session.state.elapsed));
}

test('all boxing activities commit the selected height at press, open the guard to punch, and return to the held guard', () => {
  for (const Model of [SparringSession, ShadowSession, BagSession]) {
    const session = create(Model);
    const timing = Model === BagSession ? BAG_TIMINGS.jab : TIMINGS.player.jab;
    assert.equal(session.setGuard(true, 'body'), true);
    assert.equal(session.state.player.action, 'guard');
    assert.equal(session.state.player.guardLevel, 'body');
    assert.equal(session.act('jab'), true);
    assert.equal(session.state.player.action, 'jab');
    assert.equal(session.state.player.target, 'body');
    session.setGuard(true, 'head');
    session.update(timing.duration * timing.impact);
    assert.equal(session.state.player.target, 'body', 'Changing the stick cannot redirect a committed glove');
    const contact = session.drainEvents().find(event => ['player-hit', 'bag-hit', 'motion'].includes(event.type));
    assert.equal(contact.target, 'body');
    session.update(timing.duration * (1 - timing.impact));
    assert.equal(session.state.player.action, 'guard');
    assert.equal(session.state.player.guardLevel, 'head');
    session.setGuard(false);
    assert.equal(session.state.player.action, 'idle');
    session.act('cross');
    assert.equal(session.state.player.target, 'head', 'Releasing down restores normal head punches');
  }
});

test('holding down across rendering frames preserves a full body combination in sparring and at the mirror', () => {
  for (const Model of [SparringSession, ShadowSession]) {
    for (const hz of [20, 60]) {
      const session = create(Model);
      session.setGuard(true, 'body');
      for (const [input, expected] of [['jab', 'jab'], ['cross', 'cross'], ['jab', 'hook']]) {
        assert.equal(session.act(input), true);
        assert.equal(session.state.player.action, expected);
        assert.equal(session.state.player.target, 'body');
        for (let remaining = TIMINGS.player[expected].duration + .03; remaining > 1e-8;) {
          const dt = Math.min(remaining, 1 / hz);
          session.setGuard(true, 'body');
          session.update(dt);
          remaining -= dt;
        }
        assert.equal(session.state.player.action, 'guard');
      }
      const events = session.drainEvents().filter(event => event.type === 'player-hit' || event.type === 'motion');
      assert.deepEqual(events.map(event => event.target), ['body', 'body', 'body']);
      assert.equal(events.at(-1).combo, true);
      assert.equal(session.state.stats.combos, 1);
      assert.equal(Model === SparringSession ? session.state.stats.landedBody : session.state.stats.body, 3);
    }
  }
});

test('changing to down between punches supports a head-body-body combination without changing previous contacts', () => {
  for (const Model of [SparringSession, ShadowSession]) {
    const session = create(Model);
    session.act('jab');
    session.update(TIMINGS.player.jab.duration);
    session.setGuard(true, 'body');
    session.act('cross');
    session.update(TIMINGS.player.cross.duration);
    assert.equal(session.state.combo.ready, true);
    session.act('jab');
    session.update(TIMINGS.player.hook.duration);
    const events = session.drainEvents().filter(event => event.type === 'player-hit' || event.type === 'motion');
    assert.deepEqual(events.map(event => event.target), ['head', 'body', 'body']);
    assert.equal(session.state.stats.combos, 1);
  }
});

test('only the correct guard height blocks each promised attack; a wrong-height guard gives distinct feedback', () => {
  for (const target of ['head', 'body']) {
    for (const guard of ['head', 'body']) {
      const session = create(SparringSession);
      until(session, state => ['jab', 'cross'].includes(state.remi.action) && state.remi.target === target);
      session.drainEvents();
      const received = session.state.stats.received;
      session.setGuard(true, guard);
      session.update(.28);
      const event = session.drainEvents().find(item => item.type === 'remi-hit' || item.type === 'remi-blocked');
      assert.equal(event.target, target);
      assert.equal(event.type, target === guard ? 'remi-blocked' : 'remi-hit');
      assert.equal(session.state.stats.received - received, target === guard ? 0 : 1);
      if (target === guard) assert.equal(session.state.stats[target === 'body' ? 'blockedBody' : 'blockedHead'], 1);
      else {
        assert.equal(event.wrongGuard, true);
        assert.equal(event.guardBroken, false, 'A wrong-height guard is not exhaustion');
        assert.equal(session.state.player.hurtTarget, target);
      }
    }
  }
});

test('punching from a held low guard leaves the body exposed until recovery', () => {
  const session = create(SparringSession);
  until(session, state => state.remi.action === 'cross' && state.remi.target === 'body');
  session.drainEvents();
  session.setGuard(true, 'body');
  session.act('cross');
  session.update(.272);
  const hit = session.drainEvents().find(event => event.type === 'remi-hit');
  assert.equal(hit.target, 'body');
  assert.equal(session.state.player.action, 'cross', 'The incoming punch must not cancel an already committed reply');
  assert.equal(session.state.stats.blocked, 0);
  session.update(.328);
  assert.equal(session.state.player.action, 'guard');
  assert.equal(session.state.player.guardLevel, 'body');
});

test('a matching guard still needs block endurance and a correctly timed dodge also avoids a body punch', () => {
  const depleted = create(SparringSession);
  until(depleted, state => state.remi.action === 'cross' && state.remi.target === 'body');
  depleted.state.stamina = 8;
  depleted.setGuard(true, 'body');
  depleted.drainEvents();
  depleted.update(.28);
  assert.equal(depleted.drainEvents().find(event => event.type === 'remi-hit').guardBroken, true);
  assert.equal(depleted.state.stats.blockedBody, 0);

  const dodge = create(SparringSession);
  until(dodge, state => state.remi.action === 'cross' && state.remi.target === 'body');
  dodge.drainEvents();
  dodge.act(dodge.state.remi.safeDodge);
  dodge.update(.28);
  assert.equal(dodge.drainEvents().find(event => event.type === 'remi-dodged').target, 'body');
});

test('Rémi alternates advertised heights independently of player input and keeps every tell promise', () => {
  const quiet = create(SparringSession);
  const active = create(SparringSession);
  const logs = [[], []];
  const promised = [null, null];
  for (let frame = 0; frame < 440; frame++) {
    active.setGuard(frame % 3 === 0, frame % 2 ? 'body' : 'head');
    active.act(frame % 2 ? 'jab' : 'cross');
    for (const [index, session] of [quiet, active].entries()) {
      session.update(.05);
      for (const event of session.drainEvents()) {
        if (event.type === 'tell') {
          promised[index] = event.target;
          logs[index].push({ time: Math.round(event.time * 1e8), target: event.target, side: event.side });
        }
        if (event.type.startsWith('remi-')) assert.equal(event.target, promised[index]);
      }
    }
  }
  assert.deepEqual(logs[0], logs[1]);
  assert.deepEqual(logs[0].slice(0, 4).map(event => event.target), ['head', 'body', 'head', 'body']);
});

test('Rémi protects one preselected height and leaves the other open during each scheduled guard', () => {
  for (const guardLevel of ['head', 'body']) {
    for (const target of ['head', 'body']) {
      const session = create(SparringSession);
      until(session, state => state.remi.action === 'guard' && state.remi.guardLevel === guardLevel);
      session.drainEvents();
      session.setGuard(target === 'body', target);
      session.act('jab');
      session.update(.198);
      const event = session.drainEvents().find(item => item.type.startsWith('player-'));
      assert.equal(event.target, target);
      assert.equal(event.type, target === guardLevel ? 'player-blocked' : 'player-hit');
      assert.equal(session.state.remi.guardLevel, guardLevel, 'The glove press never changes Rémi’s chosen defense');
    }
  }
});

test('guided practice keeps head-only opponent tells while body gestures remain available without validating a head-jab lesson', () => {
  for (const lesson of ['guard', 'counter']) {
    const session = create(SparringSession, { lesson });
    session.update(25);
    const tells = session.drainEvents().filter(event => event.type === 'tell');
    assert.ok(tells.length >= 3);
    assert.ok(tells.every(event => event.target === 'head'));
  }
  const session = create(SparringSession, { lesson: 'jab' });
  session.setGuard(true, 'body');
  session.act('jab');
  session.update(.44);
  assert.equal(session.state.stats.landedBody, 1);
  assert.equal(session.state.training.progress, 0);
  assert.match(session.state.training.cue, /tête/);
  session.setGuard(false);
  session.act('jab');
  session.update(.198);
  assert.equal(session.state.training.progress, 1);
});

test('the bag announces its body sequence and accepts its full low-held combination at actual contact', () => {
  const session = create(BagSession);
  until(session, state => state.sequence.id === 'corps');
  const sequence = session.state.sequence;
  assert.match(sequence.title, /corps/);
  assert.ok(sequence.steps.every(step => step.target === 'body' && /corps/.test(step.label)));
  session.setGuard(true, 'body');
  for (const step of sequence.steps) {
    to(session, step.inputAt);
    session.setGuard(true, 'body');
    assert.equal(session.act(step.input), true);
    assert.equal(session.state.player.action, step.action);
    assert.equal(session.state.player.target, 'body');
    to(session, step.targetAt - .00001);
    assert.equal(step.status, 'waiting');
    session.update(.00001);
    assert.equal(step.status, 'hit');
  }
  assert.equal(sequence.result, 'completed');
  assert.equal(session.state.stats.accurateBody, 3);
  const contacts = session.drainEvents().filter(event => event.type === 'bag-hit');
  assert.deepEqual(contacts.map(event => event.attack), ['jab', 'cross', 'hook']);
  assert.ok(contacts.every(event => event.target === 'body' && event.result === 'perfect'));
});

test('a correctly timed bag punch at the wrong height counts a contact but cannot earn choreography accuracy', () => {
  for (const required of ['head', 'body']) {
    const session = create(BagSession);
    if (required === 'body') until(session, state => state.sequence.id === 'corps');
    const step = session.state.sequence.steps[0];
    to(session, step.inputAt);
    session.setGuard(required === 'head', 'body');
    session.act('jab');
    to(session, step.targetAt);
    assert.equal(session.state.stats.contacts, 1);
    assert.equal(session.state.stats.accurate, 0);
    assert.equal(session.state.stats.wrong, 1);
    assert.equal(step.status, 'missed');
    assert.match(session.state.feedback.text, required === 'head' ? /tête/ : /corps/);
  }
});

test('bag defenses share the movement API, never hit the bag, and release on pause in every boxing activity', () => {
  const bag = create(BagSession);
  for (const direction of ['dodgeLeft', 'dodgeRight']) {
    assert.equal(bag.act(direction), true);
    bag.update(.08);
    assert.equal(bag.state.player.action, direction);
    assert.equal(bag.drainEvents().filter(event => event.type === 'motion').at(-1).action, direction);
    bag.update(.52);
  }
  assert.equal(bag.state.stats.contacts, 0);
  for (const Model of [SparringSession, ShadowSession, BagSession]) {
    const session = create(Model);
    session.setGuard(true, 'body');
    session.pause();
    assert.equal(session.state.player.action, 'idle');
    assert.equal(session.state.player.guardLevel, 'head');
    session.resume();
    session.act('jab');
    assert.equal(session.state.player.target, 'head', 'No stale down direction survives focus loss or pause');
  }
});

test('mirror guard statistics separate each height and exclude the whole committed punch duration', () => {
  const session = create(ShadowSession);
  session.setGuard(true, 'head');
  session.update(1);
  session.setGuard(true, 'body');
  session.update(2);
  session.act('jab');
  session.update(.54);
  close(session.state.stats.guardHeadSeconds, 1);
  close(session.state.stats.guardBodySeconds, 2.1);
  close(session.state.stats.guardSeconds, 3.1);
  assert.equal(session.state.stats.body, 1);
  assert.equal(session.state.stats.head, 0);
});

test('an exhausted low guard still selects body punches until down is released, without automatically rearming the defense', () => {
  for (const initialStamina of [0, 1]) {
    const session = create(SparringSession, { lesson: 'jab' });
    session.state.stamina = initialStamina;
    session.setGuard(true, 'body');
    session.update(.2);
    assert.equal(session.state.player.action, 'idle', 'An exhausted guard must lower');
    for (let frame = 0; frame < 100; frame++) {
      // Repeated reconciliation from an input adapter is still the same hold.
      session.setGuard(true, 'body');
      session.update(.02);
    }
    assert.ok(session.state.stamina > 20, 'A continuously held direction cannot rearm and drain each recovered point');
    assert.equal(session.state.player.action, 'idle');
    assert.equal(session.act('jab'), true);
    assert.equal(session.state.player.target, 'body', 'The physical down direction still chooses the body after exhaustion');
    session.update(.44);
    assert.equal(session.state.player.action, 'idle');
    session.setGuard(false);
    session.setGuard(true, 'body');
    assert.equal(session.state.player.action, 'guard', 'Release and press deliberately rearms the recovered guard');
    session.setGuard(false);
    session.act('jab');
    assert.equal(session.state.player.target, 'head', 'Releasing down clears the target selection as well as defense');
  }
});
