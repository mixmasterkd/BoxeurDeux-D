import test from 'node:test';
import assert from 'node:assert/strict';
import { OctopusDrill, nextFightAdvice } from '../src/game/GymFriendsRules.js';
import { ShadowSession } from '../src/game/ShadowSession.js';
import { TIMINGS } from '../src/game/SparringSession.js';

function practice(id) {
  const session = new ShadowSession(), drill = new OctopusDrill(id); session.start();
  const tick = (seconds) => { for (let left = seconds; left > 1e-8;) { const dt = Math.min(left, 1 / 60); session.update(dt); drill.observe(session.state, session.drainEvents()); left -= dt; } };
  const move = input => { assert.equal(session.act(input), true); tick(TIMINGS.player[session.state.player.action].duration + .02); };
  return { session, drill, tick, move };
}

test('Octopus counts the requested extended punch, not the button or a wrong body shot', () => {
  const { session, drill, tick, move } = practice('basics');
  move('cross'); assert.equal(drill.progress, 0);
  session.setGuard(true, 'body'); move('jab'); assert.equal(drill.progress, 0);
  session.setGuard(false); assert.equal(session.act('jab'), true); assert.equal(drill.progress, 0);
  tick(TIMINGS.player.jab.duration + .02); assert.equal(drill.progress, 1);
  move('cross'); session.setGuard(true, 'head'); tick(.5); session.setGuard(false); move('jab'); move('cross');
  assert.equal(drill.completed, true); assert.equal(drill.progress, 5);
});

test('defense drill needs deliberate held guards then real dodges and answers', () => {
  const { session, drill, tick, move } = practice('defense');
  session.setGuard(true, 'head'); tick(.25); assert.equal(drill.progress, 0);
  session.pause(); tick(1); session.resume(); tick(.3); assert.equal(drill.progress, 0, 'paused time never completes a guard');
  session.setGuard(true, 'head'); tick(.5); assert.equal(drill.progress, 1);
  session.setGuard(true, 'body'); tick(.5); assert.equal(drill.progress, 2);
  session.setGuard(false); for (const input of ['dodgeLeft', 'jab', 'dodgeRight', 'cross']) move(input);
  assert.equal(drill.completed, true);
});

test('three complete combos qualify; isolated hooks and unfinished repetitions do not', () => {
  const { drill, move } = practice('combo');
  move('jab'); move('cross'); assert.equal(drill.progress, 0); move('jab'); assert.equal(drill.progress, 1);
  for (let i = 0; i < 2; i++) for (const input of ['jab', 'cross', 'jab']) move(input);
  assert.equal(drill.completed, true);
  drill.reset(); assert.equal(drill.progress, 0); assert.equal(drill.completed, false);
});

test('briefly early next punch is remembered once, but pause discards it', () => {
  const { session, tick } = practice('combo');
  session.act('jab'); tick(TIMINGS.player.jab.duration - .12);
  assert.equal(session.act('cross'), true); assert.equal(session.act('cross'), false);
  tick(.14); assert.equal(session.state.player.action, 'cross');
  tick(TIMINGS.player.cross.duration - .13); assert.equal(session.act('jab'), true);
  session.pause(); session.resume(); tick(1);
  assert.equal(session.state.stats.hook, 0); assert.equal(session.state.player.action, 'idle');
});

test('friendly advice follows unlocked opponents and current tournament day', () => {
  const p = { fights: { beton: { wins: 0 }, kramer: { wins: 0 } }, tournament: { active: null } };
  assert.equal(nextFightAdvice(p).id, 'beton'); p.fights.beton.wins++;
  assert.equal(nextFightAdvice(p).id, 'kramer'); p.fights.kramer.wins++;
  assert.equal(nextFightAdvice(p).id, 'bellini'); p.tournament.active = { day: 2 };
  assert.equal(nextFightAdvice(p).id, 'fortin'); p.tournament.active.day = 3;
  assert.equal(nextFightAdvice(p).id, 'gagnon');
});
