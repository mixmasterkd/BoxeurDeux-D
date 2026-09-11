import test from 'node:test';
import assert from 'node:assert/strict';
import { ShadowSession } from '../src/game/ShadowSession.js';
import { COMBO_WINDOW, TIMINGS } from '../src/game/SparringSession.js';

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
const create = (settings) => {
  const session = new ShadowSession(settings);
  session.start();
  return session;
};
function advance(session, seconds, hz = 60) {
  for (let remaining = seconds; remaining > 1e-10;) {
    const step = Math.min(remaining, 1 / hz);
    session.update(step);
    remaining -= step;
  }
}
function move(session, input, expected = input) {
  assert.equal(session.act(input), true);
  assert.equal(session.state.player.action, expected);
  session.update(TIMINGS.player[expected].duration / session.state.speed);
  assert.equal(session.state.player.action, 'idle');
}
function prepareHook(session) {
  move(session, 'jab');
  move(session, 'cross');
  assert.equal(session.state.combo.ready, true);
}

test('free practice starts deliberately, has no timer or stamina limit, and never attacks on its own', () => {
  const session = new ShadowSession();
  assert.equal(session.act('jab'), false);
  assert.equal(session.setGuard(true), false);
  session.update(10);
  assert.equal(session.state.seconds, 0);
  assert.equal(session.start(), true);
  assert.equal(session.start(), false);
  session.update(3600);
  assert.equal(session.state.phase, 'running');
  assert.equal(session.state.seconds, 3600);
  assert.equal('stamina' in session.state, false);
  assert.equal('remaining' in session.state, false);
  assert.deepEqual(session.drainEvents(), []);
  for (let i = 0; i < 30; i += 1) move(session, 'cross');
  assert.equal(session.state.stats.cross, 30, 'Repeated practice is never blocked by exhaustion');
});

test('a jab is counted once at full extension, not on press or during recovery', () => {
  const session = create();
  assert.equal(session.act('jab'), true);
  assert.equal(session.state.stats.jab, 0);
  session.update(.19799);
  assert.equal(session.state.stats.jab, 0);
  assert.deepEqual(session.drainEvents(), []);
  session.update(.00001);
  assert.equal(session.state.stats.jab, 1);
  close(session.state.player.progress, .45);
  const [event] = session.drainEvents();
  assert.equal(event.type, 'motion');
  assert.equal(event.action, 'jab');
  close(event.time, .198);
  session.update(3);
  assert.equal(session.state.stats.jab, 1);
  assert.equal(session.state.player.action, 'idle');
  assert.deepEqual(session.drainEvents(), []);
});

test('J K J keeps the ring cadence and counts the full combination at the left-hook peak', () => {
  const session = create();
  prepareHook(session);
  close(session.state.combo.remaining, COMBO_WINDOW);
  assert.equal(session.state.stats.combos, 0);
  assert.equal(session.act('jab'), true);
  assert.equal(session.state.player.action, 'hook');
  session.update(.31999);
  assert.equal(session.state.stats.hook, 0);
  session.update(.00001);
  assert.equal(session.state.stats.hook, 1);
  assert.equal(session.state.stats.combos, 1);
  const events = session.drainEvents();
  assert.deepEqual(events.map(event => event.action), ['jab', 'cross', 'hook']);
  assert.equal(events[2].combo, true);
  close(events[2].time, 1.36);
  session.update(1);
  assert.equal(session.state.stats.combos, 1);
  assert.equal(session.state.combo.ready, false);
});

test('early repeated presses never buffer an attack or skip directly to a hook', () => {
  const session = create();
  assert.equal(session.act('hook'), false);
  assert.equal(session.act('hit'), false);
  session.act('jab');
  for (let i = 0; i < 10; i += 1) {
    assert.equal(session.act(i % 2 ? 'jab' : 'cross'), false);
    session.update(.02);
  }
  session.update(.24);
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.state.stats.cross, 0);
  assert.equal(session.state.stats.jab, 1);
  session.update(2);
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.state.stats.jab, 1, 'Time alone never repeats a held command');
  move(session, 'cross');
  move(session, 'jab');
  assert.equal(session.state.stats.hook, 0, 'A standalone cross cannot prepare the hook');
});

test('follow-up time begins after recovery and a late third J returns to the jab', () => {
  for (const delay of [COMBO_WINDOW, COMBO_WINDOW + .00001]) {
    const session = create();
    move(session, 'jab');
    session.update(delay);
    move(session, 'cross');
    assert.equal(session.state.combo.ready, delay === COMBO_WINDOW);
  }
  for (const delay of [COMBO_WINDOW, COMBO_WINDOW + .00001]) {
    const session = create();
    prepareHook(session);
    session.update(delay);
    session.act('jab');
    assert.equal(session.state.player.action, delay === COMBO_WINDOW ? 'hook' : 'jab');
  }
});

test('an extra jab begins a fresh sequence while an extra direct breaks it', () => {
  const session = create();
  move(session, 'jab');
  move(session, 'jab');
  move(session, 'cross');
  move(session, 'jab', 'hook');
  assert.equal(session.state.stats.combos, 1);
  move(session, 'jab');
  move(session, 'cross');
  move(session, 'cross');
  move(session, 'jab');
  assert.equal(session.state.stats.hook, 1);
});

test('both dodge directions break the chain and count once when the slip becomes active', () => {
  for (const direction of ['dodgeLeft', 'dodgeRight']) {
    const session = create();
    prepareHook(session);
    session.drainEvents();
    assert.equal(session.act(direction), true);
    assert.equal(session.state.combo.ready, false);
    session.update(.07999);
    assert.equal(session.state.stats[direction], 0);
    session.update(.00001);
    assert.equal(session.state.stats[direction], 1);
    const [event] = session.drainEvents();
    assert.equal(event.action, direction);
    close(event.time, 1.12);
    session.update(.52);
    move(session, 'jab');
    assert.equal(session.state.stats.hook, 0);
    assert.equal(session.state.stats[direction], 1);
  }
});

test('held guard remains available without exhaustion but prevents combo preparation', () => {
  const session = create();
  prepareHook(session);
  session.setGuard(true);
  assert.equal(session.state.combo.ready, false);
  session.update(120);
  assert.equal(session.state.player.action, 'guard');
  assert.equal(session.state.stats.guardSeconds, 120);
  session.act('jab');
  session.update(.20);
  assert.equal(session.state.player.action, 'jab', 'Raising guard never cancels an engaged punch');
  close(session.state.stats.guardSeconds, 120);
  session.update(.54);
  close(session.state.stats.guardSeconds, 120.30);
  assert.equal(session.state.player.action, 'guard');
  assert.equal(session.state.combo.step, 0);
  session.setGuard(false);
  assert.equal(session.state.player.action, 'idle');
  session.update(5);
  close(session.state.stats.guardSeconds, 120.30);
});

test('pause freezes both clocks and the engaged gesture, releases guard and clears the combo', () => {
  const session = create();
  prepareHook(session);
  session.act('jab');
  session.update(.1);
  assert.equal(session.pause(), true);
  const frozen = structuredClone(session.state);
  assert.equal(session.act('cross'), false);
  assert.equal(session.setGuard(true), false);
  session.update(100);
  assert.deepEqual(session.state, frozen);
  assert.equal(session.resume(), true);
  session.update(.22);
  assert.equal(session.state.stats.hook, 1, 'The committed hook still reaches its peak after resuming');
  assert.equal(session.state.stats.combos, 0, 'An interrupted sequence is not a full combination');
  assert.equal(session.drainEvents().at(-1).combo, false);
  session.update(.36);
  session.setGuard(true);
  session.pause();
  assert.equal(session.state.player.action, 'idle');
  session.resume();
  session.update(2);
  assert.equal(session.state.stats.guardSeconds, 0, 'A released key cannot remain held after pause');
});

test('slow practice preserves motion timing while real practice time advances at normal speed', () => {
  const runs = [20, 60].map(hz => {
    const session = create({ speed: .65 });
    for (const [input, action] of [['jab', 'jab'], ['cross', 'cross'], ['jab', 'hook']]) {
      session.act(input);
      advance(session, TIMINGS.player[action].duration / .65, hz);
    }
    assert.equal(session.state.stats.combos, 1);
    close(session.state.elapsed, 1.72);
    close(session.state.seconds, 1.72 / .65);
    session.setGuard(true);
    advance(session, 2, hz);
    close(session.state.stats.guardSeconds, 2);
    return session.drainEvents().map(({ time, ...event }) => ({ ...event, time: Math.round(time * 1e9) }));
  });
  assert.deepEqual(runs[0], runs[1]);
  assert.deepEqual(runs[0].map(event => event.time), [198000000, 740000000, 1360000000]);
});

test('speed changes only in menus and can continue a paused move without losing its progress', () => {
  const session = new ShadowSession();
  assert.equal(session.setSpeed(.65), true);
  assert.equal(session.setSpeed(.1), false);
  session.start();
  assert.equal(session.setSpeed(1), false);
  session.act('cross');
  session.update(.2);
  close(session.state.player.elapsed, .13);
  session.pause();
  assert.equal(session.setSpeed(1), true);
  session.resume();
  session.update(.17);
  assert.equal(session.state.stats.cross, 1);
  close(session.state.seconds, .37);
  close(session.state.elapsed, .3);
  session.pause();
  session.setSpeed(.65);
  session.reset();
  assert.equal(session.state.speed, .65);
});

test('a slow rendering frame keeps real practice and guard time while preserving visible motion', () => {
  for (const speed of [1, .65]) {
    const session = create({ speed });
    session.setGuard(true);
    session.update(.15, .05);
    close(session.state.seconds, .15);
    close(session.state.elapsed, .05 * speed);
    close(session.state.stats.guardSeconds, .15);
    session.act('jab');
    session.update(.15, .05);
    close(session.state.seconds, .30);
    close(session.state.player.elapsed, .05 * speed);
    close(session.state.stats.guardSeconds, .15);
    assert.equal(session.state.stats.jab, 0, 'A delayed frame does not skip the visible preparation');
    session.update((.44 - .075 * speed) / speed);
    close(session.state.player.elapsed, .44 - .025 * speed);
    session.update(.15, .05);
    close(session.state.stats.guardSeconds, .225, 1e-7);
    assert.equal(session.state.player.action, 'guard', 'Recovery uses half this animation step, then guard occupies half its real duration');
  }
});

test('bounded animation time cannot outrun real time and invalid animation deltas are ignored', () => {
  const session = create();
  session.update(.15, .5);
  close(session.state.seconds, .15);
  close(session.state.elapsed, .15);
  const before = structuredClone(session.state);
  for (const invalid of [NaN, Infinity, -1, 0, '1']) session.update(.15, invalid);
  assert.deepEqual(session.state, before);
});

test('finishing freezes the last pose and statistics until a complete reset', () => {
  const session = create();
  session.act('jab');
  session.update(.2);
  const pose = structuredClone(session.state.player);
  assert.equal(session.finish(), true);
  assert.deepEqual(session.state.player, pose);
  session.releaseControls();
  assert.equal(session.setGuard(true), false);
  assert.equal(session.act('cross'), false);
  assert.equal(session.resume(), false);
  session.update(100);
  assert.deepEqual(session.state.player, pose);
  assert.equal(session.state.stats.jab, 1);
  close(session.state.seconds, .2);
  session.reset();
  assert.equal(session.state.phase, 'ready');
  assert.equal(session.state.player.action, 'idle');
  assert.equal(session.state.seconds, 0);
  assert.ok(Object.values(session.state.stats).every(value => value === 0));
  assert.deepEqual(session.drainEvents(), []);
  assert.equal(session.start(), true);
  session.setGuard(true);
  session.finish();
  assert.equal(session.state.player.action, 'guard', 'Finishing also freezes a held guard pose');
});

test('finishing before the peak never awards an unfinished move; invalid deltas do not alter state', () => {
  const session = create();
  session.act('cross');
  session.update(.1);
  for (const invalid of [NaN, Infinity, -1, 0, '1']) session.update(invalid);
  close(session.state.elapsed, .1);
  session.pause();
  assert.equal(session.finish(), true);
  session.update(10);
  assert.equal(session.state.stats.cross, 0);
  assert.deepEqual(session.drainEvents(), []);
});
