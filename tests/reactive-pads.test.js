import test from 'node:test';
import assert from 'node:assert/strict';
import { HotelActivitySession } from '../src/game/HotelActivitySession.js';
import { TIMINGS } from '../src/game/SparringSession.js';
const create = options => { const s = new HotelActivitySession({ activity: 'pads', random: () => .8, ...options }); s.start(); return s; };
const timeToContact = action => TIMINGS.player[action].duration * TIMINGS.player[action].impact;

test('Fredo holds a raised target indefinitely without rhythm windows or punishment for waiting', () => {
  const s = create(); const target = structuredClone(s.state.target); s.update(9);
  assert.deepEqual(s.state.target, target); assert.equal(s.state.stats.missed, 0); assert.equal(s.state.stats.late, 0);
  assert.equal(s.act('jab'), true); s.update(timeToContact('jab') - .00001); assert.equal(s.state.stats.hits, 0);
  s.update(.00001); assert.equal(s.state.stats.hits, 1); assert.equal(s.state.player.phase, 'contact');
  assert.equal(s.state.target.screenSide, 'right'); assert.equal(s.state.target.side, 'left');
});

test('a wrong hand leaves the same pad raised and correct anatomical sides are preserved at each contact', () => {
  const s = create(); s.act('cross'); s.update(TIMINGS.player.cross.duration);
  assert.equal(s.state.stats.wrong, 1); assert.equal(s.state.target.index, 0); assert.equal(s.state.target.phase, 'waiting');
  s.act('jab'); s.update(TIMINGS.player.jab.duration); assert.equal(s.state.target.phase, 'rest');
  assert.equal(s.act('cross'), false, 'A lowered pad cannot be hit before the next target is presented');
  s.update(.5); assert.equal(s.state.target.expected, 'cross'); assert.equal(s.state.target.screenSide, 'left'); assert.equal(s.state.target.side, 'right');
  s.act('cross'); s.update(timeToContact('cross')); assert.equal(s.state.stats.hits, 2);
  const contacts = s.drainEvents().filter(e => e.type === 'hit');
  assert.deepEqual(contacts.map(e => [e.input, e.side, e.screenSide]), [['jab', 'left', 'right'], ['cross', 'right', 'left']]);
});

test('pause freezes a committed glove and the held target; repeated presses cannot queue a burst', () => {
  const s = create(); s.act('jab'); s.update(.05); s.pause(); const frozen = structuredClone(s.state);
  for (let i = 0; i < 20; i++) { s.update(.1); assert.equal(s.act('jab'), false); s.setGuard(true); }
  assert.deepEqual(s.state, frozen); s.resume(); s.update(timeToContact('jab') - .05);
  assert.equal(s.state.stats.hits, 1); assert.equal(s.state.player.phase, 'contact');
  for (let i = 0; i < 20; i++) assert.equal(s.act('jab'), false);
  s.update(2); assert.equal(s.state.stats.hits, 1); assert.equal(s.state.player.action, 'idle');
  assert.equal(s.act('guardHead'), false); assert.equal(s.act('dodgeLeft'), false);
});

test('a full free-target session qualifies through actual contacts, with equal outcomes at20/60Hz', () => {
  const outcomes = [20, 60].map(hz => {
    const s = create();
    while (s.state.phase === 'running') {
      if (s.state.target.phase === 'waiting' && s.state.player.action === 'idle') s.act(s.state.target.expected);
      s.update(1 / hz);
    }
    assert.ok(s.state.summary.hits >= 12); assert.equal(s.state.summary.accuracy, 100); assert.equal(s.state.summary.qualified, true);
    assert.equal(s.state.summary.missed, 0); assert.equal(s.state.summary.early, 0);
    assert.equal(s.drainEvents().filter(e => e.type === 'round-end').length, 1);
    return s.state.summary;
  });
  assert.ok(Math.abs(outcomes[0].hits - outcomes[1].hits) <= 2, 'Frame polling may change reaction latency but never imposes rhythm penalties');
});

test('the swimming session retains its timed alternating strokes and late-miss rule', () => {
  const s = new HotelActivitySession({ activity: 'pool' }); s.start(); s.update(3);
  assert.ok(s.state.stats.missed > 0); assert.equal(s.state.rules.interval, .82); assert.equal(s.state.target, undefined);
});
