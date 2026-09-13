import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession, TIMINGS, PUNCH_BUFFER } from '../src/game/SparringSession.js';
import { fighterMotion } from '../src/game/FighterMotion.js';
const create = options => { const s = new SparringSession({ random: () => .5, ...options }); s.start(); return s; };
const impact = attack => TIMINGS.player[attack].duration * TIMINGS.player[attack].impact;
const nearEnd = (s, attack = 'jab') => s.update(TIMINGS.player[attack].duration - PUNCH_BUFFER + .01);

test('a natural fast J K J sequence accepts one late follow-up per hand and scores only three actual contacts', () => {
  const results = [20, 60].map(hz => {
    const s = create(); const inputs = [[0, 'jab'], [.25, 'cross'], [.65, 'jab']]; let i = 0;
    while (s.state.elapsed < 1.4 - 1e-9) {
      if (i < inputs.length && s.state.elapsed >= inputs[i][0] - 1e-8) { assert.equal(s.act(inputs[i++][1]), true); }
      const next = i < inputs.length ? inputs[i][0] : 1.4;
      s.update(Math.min(1 / hz, next - s.state.elapsed, 1.4 - s.state.elapsed));
    }
    const events = s.drainEvents().filter(e => e.type.startsWith('player-'));
    assert.deepEqual(events.map(e => e.attack), ['jab', 'cross', 'hook']);
    assert.equal(s.state.stats.thrown, 3); assert.equal(s.state.stats.combos, 1);
    assert.equal(s.state.stamina, 52);
    return events.map(e => ({ type: e.type, attack: e.attack, time: Number(e.time.toFixed(8)) }));
  });
  assert.deepEqual(results[0], results[1]);
});

test('an even rapid three-press cadence keeps J K J without requiring different pauses between hands', () => {
  const s = create();
  s.act('jab'); s.update(.30);
  assert.equal(s.act('cross'), true); s.update(.30);
  assert.equal(s.act('jab'), true); s.update(.60);
  assert.equal(s.state.stats.thrown, 3);
  assert.equal(s.state.stats.combos, 1);
  assert.equal(s.state.stamina, 52);
});

test('early presses do not queue; one late press is remembered without charging or skipping the first recovery', () => {
  const s = create(); s.act('jab');
  for (let i = 0; i < 8; i++) { assert.equal(s.act('cross'), false); s.update(.02); }
  s.update(.04); const before = { stamina: s.state.stamina, thrown: s.state.stats.thrown };
  assert.equal(s.act('cross'), true);
  for (let i = 0; i < 20; i++) assert.equal(s.act(i % 2 ? 'cross' : 'jab'), false);
  assert.deepEqual({ stamina: s.state.stamina, thrown: s.state.stats.thrown }, before);
  assert.equal(s.state.player.action, 'jab');
  s.update(.13999); assert.equal(s.state.player.action, 'jab');
  s.update(.00001); assert.equal(s.state.player.action, 'cross'); assert.equal(s.state.stamina, 73);
  s.update(TIMINGS.player.cross.duration + .1); assert.equal(s.state.stats.thrown, 2);
});

for (const interrupt of ['pause', 'releaseControls', 'guard', 'dodge']) test(`${interrupt} discards an unstarted buffered punch without cancelling the committed glove`, () => {
  const s = create(); s.act('jab'); nearEnd(s); assert.equal(s.act('cross'), true);
  if (interrupt === 'guard') s.setGuard(true); else if (interrupt === 'dodge') s.act('dodgeLeft'); else s[interrupt]();
  if (interrupt === 'pause') { const frozen = structuredClone(s.state); s.update(2); assert.deepEqual(s.state, frozen); s.resume(); }
  s.update(.5); assert.equal(s.state.stats.thrown, 1); assert.equal(s.state.stats.landed, 1);
});

test('a buffered body punch remembers the selected target and an unaffordable follow-up costs nothing', () => {
  const s = create(); s.act('jab'); nearEnd(s); s.setGuard(true, 'body'); s.act('cross'); s.setGuard(false);
  s.update(.2); assert.equal(s.state.player.action, 'cross'); assert.equal(s.state.player.target, 'body');
  const exhausted = create(); exhausted.state.stamina = 20; exhausted.act('jab'); nearEnd(exhausted); exhausted.act('cross'); exhausted.update(.2);
  assert.equal(exhausted.state.stats.thrown, 1); assert.equal(exhausted.state.stamina, 10); assert.equal(exhausted.state.player.action, 'idle');
});

test('the round bell discards the queued hand; a visible contact stays aligned at the faster timing', () => {
  const s = create({ duration: 1 }); s.update(.7); s.act('jab'); s.update(.2); s.act('cross'); s.update(.1);
  assert.equal(s.state.phase, 'finished'); assert.equal(s.state.stats.thrown, 1); assert.equal(s._queuedPunch, null);
  for (const attack of ['jab', 'cross']) {
    const a = create(); a.act(attack); a.update(impact(attack) - .00001); assert.equal(a.state.stats.landed, 0);
    a.update(.00001); assert.equal(a.state.stats.landed, 1); assert.equal(fighterMotion(a.state.player, a.state.elapsed, 'player').phase, 'contact');
  }
});
