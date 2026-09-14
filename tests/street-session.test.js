import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession } from '../src/game/SparringSession.js';

test('street encounter has no time limit even beyond the normal round bell', () => {
  const game = new SparringSession({ opponent: 'runner', duration: 2 }); game.start();
  for (let i = 0; i < 180 * 60; i++) {
    const state = game.state;
    game.setGuard(['jab','cross'].includes(state.remi.action), state.remi.target);
    game.update(1/60);
  }
  assert.equal(game.state.phase, 'running');
  assert.ok(game.state.elapsed > 179.9);
  assert.equal(game.state.bout.round, 1);
  assert.equal(game.state.bout.roundHistory.length, 0);
  assert.equal(game.state.bout.score, undefined);
});
for (const defend of [true, false]) test(`one real knockdown ends the street encounter (${defend ? 'win' : 'loss'}) without count or judges`, () => {
  const game = new SparringSession({ opponent: 'runner' }); game.start();
  const events = []; let elapsed = 0;
  while (game.state.phase !== 'finished' && elapsed < 180) {
    const state = game.state;
    if (defend) {
      game.setGuard(['jab','cross'].includes(state.remi.action), state.remi.target);
      if (state.remi.action === 'open' && state.player.action === 'idle') game.act(state.stats.thrown % 2 ? 'cross' : 'jab');
    }
    game.update(1/60); elapsed += 1/60; events.push(...game.drainEvents());
  }
  assert.equal(game.state.phase, 'finished');
  assert.equal(game.state.bout.result.reason, 'street-stop');
  assert.equal(game.state.bout.result.winner, defend ? 'player' : 'remi');
  assert.equal(game.state.bout.downs[defend ? 'remi' : 'player'].total, 1);
  assert.equal(game.state.bout.result.decision, undefined);
  assert.equal(events.filter(e => e.type === 'bout-finish').length, 1);
  assert.equal(events.some(e => ['round-break','count'].includes(e.type)), false);
  assert.equal(game.nextRound(), false);
});

test('Pablo keeps a free teaching session, body/head cues, and an independent authored rhythm', () => {
  const game = new SparringSession({ opponent: 'pablo', lesson: 'resistance' }); game.start();
  const tells = [];
  for(let i=0;i<12*60;i++) {
    game.setGuard(['jab','cross'].includes(game.state.remi.action),game.state.remi.target);
    game.update(1/60); tells.push(...game.drainEvents().filter(e=>e.type==='tell'));
  }
  assert.equal(game.profile.official, false);
  assert.equal(game.state.bout.score, undefined);
  assert.deepEqual(tells.slice(0,2).map(t=>t.target), ['head','body']);
  assert.deepEqual(tells.slice(0,2).map(t=>t.safeDodge), ['dodgeRight','dodgeLeft']);
});
