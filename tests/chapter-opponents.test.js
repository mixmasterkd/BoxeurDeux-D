import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession, TIMINGS } from '../src/game/SparringSession.js';
import { getOpponentProfile } from '../src/game/OpponentProfiles.js';

const ids = ['kramer', 'bellini', 'fortin', 'gagnon'];
function play(id, { hz = 60, duration = 60, protect = true, counters = true, pauseAtSurrender = false } = {}) {
  const game = new SparringSession({ opponent: id, duration }); game.start();
  let sequence = null, clock = 0, pausedSurrender = false; const events = [], falls = [];
  while (clock < 350 && game.state.phase !== 'finished') {
    const state = game.state;
    if (pauseAtSurrender && !pausedSurrender && state.bout?.count?.stage === 'surrender') {
      game.pause(); const snapshot = structuredClone(game.state); game.update(5);
      assert.deepEqual(game.state, snapshot); game.resume(); pausedSurrender = true;
    }
    if (state.phase === 'between') { game.nextRound(); sequence = null; }
    if (state.phase === 'running') {
      const striking = ['jab', 'cross'].includes(state.remi.action);
      game.setGuard(protect && striking, state.remi.target);
      if (counters && state.player.action === 'idle') {
        if (sequence) { if (game.act(sequence)) sequence = sequence === 'cross' ? 'jab' : null; }
        else if (state.remi.action === 'open' && state.remi.duration >= 1.7 && state.remi.progress < .06 && state.stamina >= 48) {
          if (game.act('jab')) sequence = 'cross';
        }
      }
    } else sequence = null;
    game.update(1 / hz); clock += 1 / hz;
    for (const event of game.drainEvents()) { events.push(event); if (event.type === 'knockdown') falls.push({ boutRound: event.round, ...event.downs.remi }); }
  }
  return { game, events, falls, clock, pausedSurrender };
}

for (const id of ids) {
  test(`${id}: each authored opponent is beatable by guarding and countering at 20/60 Hz`, () => {
    for (const hz of [20, 60]) {
      const { game, events } = play(id, { hz });
      assert.equal(game.state.bout.result?.winner, 'player', JSON.stringify(game.state.bout));
      assert.ok(game.state.stats.blocked >= 1);
      assert.ok(game.state.stats.combos >= 2);
      assert.equal(events.filter(event => event.type === 'bout-finish').length, 1);
      if (id === 'kramer') {
        assert.equal(game.state.bout.result.reason, 'abandon');
        assert.equal(game.state.bout.downs.remi.total, 2);
        assert.equal(events.filter(event => event.type === 'opponent-abandon').length, 1);
      } else assert.notEqual(game.state.bout.result.reason, 'abandon');
    }
  });
  test(`${id}: an unprotected player can lose through the actual ten-count`, () => {
    const { game } = play(id, { protect: false, counters: false });
    assert.equal(game.state.bout.result.winner, 'remi');
    assert.equal(game.state.bout.result.reason, 'ko');
  });
  test(`${id}: attack schedule and guard heights are independent of player input`, () => {
    const a = new SparringSession({ opponent: id }), b = new SparringSession({ opponent: id }); a.start(); b.start();
    for (let frame = 0; frame < 600; frame++) {
      a.setGuard(true, a.state.remi.target); b.setGuard(frame % 2 === 0, b.state.remi.target);
      if (frame % 33 === 0) b.act(frame % 66 ? 'jab' : 'cross');
      a.update(1/60); b.update(1/60);
      assert.equal(a._remiAction.action, b._remiAction.action);
      assert.equal(a._remiAction.guardLevel, b._remiAction.guardLevel);
      assert.equal(a._remiAction.target, b._remiAction.target);
      assert.equal(a._remiAction.duration, b._remiAction.duration);
      assert.ok(Math.abs(a._remiAction.elapsed - b._remiAction.elapsed) < 1e-7);
    }
  });
}

test('Kramer counts both falls across different rounds and cannot advance while his surrender is paused', () => {
  const { game, falls, pausedSurrender } = play('kramer', { duration: 15, pauseAtSurrender: true });
  assert.equal(game.state.bout.result?.reason, 'abandon');
  assert.equal(falls.length, 2);
  assert.ok(falls[1].boutRound > falls[0].boutRound, JSON.stringify(falls));
  assert.equal(game.state.remi.action, 'surrender');
  assert.equal(pausedSurrender, true);
});

test('Kramer and Gagnon feints cannot score contact and every real attack receives at least 600 ms of tell', () => {
  for (const id of ids) {
    const profile = getOpponentProfile(id);
    for (const stage of profile.pattern) if (stage.attack) assert.ok(stage.tell >= .60);
    const { events } = play(id, { counters:false });
    for (const event of events.filter(event => event.type === 'remi-hit')) assert.ok(['jab','cross'].includes(event.attack));
  }
});

test('new training ceilings are accepted by the combat model without granting bonuses on their own', () => {
  const base = new SparringSession({ opponent: 'gagnon' });
  assert.equal(base.state.stamina, 100); assert.equal(base.state.bout.resistance.player, 100);
  const trained = new SparringSession({ opponent:'gagnon',maxStamina:124,maxResistance:122,recoveryBonus:.2,powerBonus:10 });
  assert.equal(trained.state.stamina, 124); assert.equal(trained.state.bout.resistance.player, 122);
  assert.equal(trained.settings.powerBonus, 10); assert.equal(trained.settings.recoveryBonus, .2);
});
