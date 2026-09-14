import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession } from '../src/game/SparringSession.js';

const opponents = ['beton', 'kramer', 'bellini', 'fortin', 'gagnon', 'dyrex', 'louisto', 'lefeu', 'danielo', 'gold-rios', 'gold-moreau', 'gold-santos'];
const trained = { maxStamina: 124, maxResistance: 122, powerBonus: 10, recoveryBonus: .20 };

/** Only public observations and inputs. Perception is delayed 150ms; neither
 * authored pattern indexes nor upcoming targets are read. The corner is left
 * alone, giving the guaranteed baseline recovery rather than a perfect bonus.
 */
function play(opponent, { hz = 60, bonuses = {}, policy = 'counter' } = {}) {
  const game = new SparringSession({ opponent, ...bonuses });
  const observations = [], events = [];
  let clock = 0, seen = null, followUp = null, recoveryAt = 0, recovery = 'jab';
  let random = 2763, nextRandom = 0, randomGuard = false, randomTarget = 'head';
  const rng = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random / 2 ** 32; };
  game.start();
  while (clock < 350 && game.state.phase !== 'finished') {
    const state = game.state;
    observations.push({ time: clock, phase: state.phase, remi: { ...state.remi } });
    while (observations.length && observations[0].time <= clock - .15 + 1e-9) seen = observations.shift();
    if (state.phase === 'between') game.nextRound();
    if (state.phase === 'knockdown' && clock >= recoveryAt) {
      game.act(recovery); recovery = recovery === 'jab' ? 'cross' : 'jab'; recoveryAt = clock + .4;
    }
    if (state.phase === 'running') {
      if (policy === 'counter' && seen?.phase === 'running') {
        const remi = seen.remi;
        game.setGuard(['jab', 'cross'].includes(remi.action), remi.target);
        if (state.player.action === 'idle') {
          if (followUp) {
            if (game.act(followUp)) followUp = followUp === 'cross' ? 'jab' : null;
          } else if (remi.action === 'open' && remi.duration >= 1.30 && remi.progress < .06 && state.stamina >= 48) {
            if (game.act('jab')) followUp = 'cross';
          }
        }
      } else if (policy === 'spam') {
        game.setGuard(false);
        if (state.player.action === 'idle') game.act(Math.floor(clock * 3) % 2 ? 'cross' : 'jab');
      } else if (policy === 'random') {
        if (clock >= nextRandom) {
          randomGuard = rng() < .35; randomTarget = rng() < .5 ? 'head' : 'body';
          game.setGuard(randomGuard, randomTarget);
          if (!randomGuard) game.act(rng() < .5 ? 'jab' : 'cross');
          nextRandom = clock + .3;
        }
      }
    } else followUp = null;
    game.update(1 / hz); clock += 1 / hz; events.push(...game.drainEvents());
  }
  assert.equal(game.state.phase, 'finished', `${opponent} ${policy} ends`);
  assert.equal(events.filter(event => event.type === 'bout-finish').length, 1);
  return { game, events, clock };
}

for (const hz of [20, 60]) {
  test(`readable counters win over multiple rounds with 150ms perception at ${hz}Hz`, () => {
    for (const bonuses of [{}, trained]) {
      for (const id of opponents) {
        const { game } = play(id, { hz, bonuses });
        assert.equal(game.settings.duration, 45);
        assert.equal(game.state.bout.result.winner, 'player', `${id} power ${bonuses.powerBonus ?? 0}`);
        assert.ok(game.state.bout.round >= 2, `${id} should survive the old first-round steamroll`);
        assert.ok(game.state.stats.blocked > 0, `${id} defence matters`);
        assert.ok(game.state.stats.combos >= 2, `${id} openings accept full counters`);
        if (id === 'kramer') assert.equal(game.state.bout.result.reason, 'abandon');
      }
    }
  });

  test(`late opponents punish blind input at ${hz}Hz despite maximum training`, () => {
    for (const policy of ['spam', 'random']) {
      for (const id of ['dyrex', 'louisto', 'lefeu', 'danielo', 'gold-rios', 'gold-moreau', 'gold-santos']) {
        const { game } = play(id, { hz, bonuses: trained, policy });
        assert.equal(game.state.bout.result.winner, 'remi', `${id} ${policy}`);
        assert.ok(game.state.stats.received > 0);
      }
    }
  });
}

test('a measured baseline fight reaches the judges through actual round clocks', () => {
  const { game, events } = play('lefeu');
  assert.equal(game.state.bout.round, 3);
  assert.equal(game.state.bout.result.reason, 'points');
  assert.equal(game.state.bout.roundHistory.length, 3);
  assert.deepEqual(game.state.bout.roundHistory.map(round => round.duration), [45, 45, 45]);
  assert.equal(events.filter(event => event.type === 'round-break').length, 2);
  assert.equal(game.state.bout.result.decision.cards.length, 3);
});
