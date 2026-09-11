import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession, TIMINGS } from '../src/game/SparringSession.js';
import { OPPONENT_PROFILES, getOpponentProfile, betonCornerAdvice } from '../src/game/OpponentProfiles.js';

const create = (settings = {}) => {
  const session = new SparringSession({ opponent: 'beton', random: () => .5, ...settings });
  session.start();
  return session;
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
function until(session, predicate, { control = () => {}, limit = 240, hz = 120 } = {}) {
  let time = 0;
  while (!predicate(session.state) && time < limit) {
    control(session);
    session.update(1 / hz);
    time += 1 / hz;
  }
  assert.ok(predicate(session.state), `Unreached condition: ${JSON.stringify({ phase: session.state.phase, round: session.state.bout?.round, elapsed: session.state.elapsed, stats: session.state.stats })}`);
}
function protect(session) {
  const { remi } = session.state;
  session.setGuard(['jab', 'cross'].includes(remi.action), remi.target);
}
function counterStrategy() {
  let next = null;
  return session => {
    const state = session.state;
    if (state.phase !== 'running') { next = null; return; }
    protect(session);
    if (state.player.action !== 'idle') return;
    if (next) {
      if (session.act(next)) next = next === 'cross' ? 'jab' : null;
    } else if (state.remi.action === 'open' && state.remi.duration >= 1.7
      && state.remi.progress < .05 && state.stamina >= 48) {
      session.act('jab'); next = 'cross';
    }
  };
}

test('Béton is a separate opponent using resistance rules, a fixed authored rhythm and its own score', () => {
  const session = create({ opponent: 'beton', lesson: 'jab', tempo: 'fast' });
  assert.equal(session.state.settings.opponent, 'beton');
  assert.equal(session.state.settings.lesson, 'resistance');
  assert.equal(session.state.settings.tempo, 'normal');
  assert.equal(session.state.training, null);
  assert.deepEqual(session.state.bout.score, { player: 0, remi: 0 });
  assert.deepEqual(session.state.bout.resistance, { player: 100, remi: 100 });
  assert.equal(session.state.remaining, 60);
  assert.equal(session.state.bout.rounds, 3);
  assert.equal(session.state.remi.duration, OPPONENT_PROFILES.beton.rhythm.initialOpening);
  assert.ok(session.state.remi.duration < TIMINGS.player.jab.duration + TIMINGS.player.cross.duration + TIMINGS.player.hook.duration);
  session.setSettings({ tempo: 'calm', lesson: 'counter' });
  assert.equal(session.state.settings.tempo, 'normal');
  assert.equal(session.state.settings.lesson, 'resistance');
  assert.equal(getOpponentProfile('__proto__').id, 'remi');
  assert.equal(getOpponentProfile('unknown').id, 'remi');
});

test('Béton announces a head jab and body direct, keeps a high guard, and offers different reply windows', () => {
  const session = create();
  until(session, state => state.remi.action === 'guard');
  assert.equal(session.state.remi.guardLevel, 'head');
  until(session, state => state.remi.action === 'tellLeft');
  assert.equal(session.state.remi.target, 'head');
  assert.equal(session.state.remi.duration, OPPONENT_PROFILES.beton.rhythm.jabTell);
  until(session, state => state.remi.action === 'jab');
  assert.equal(session.state.remi.target, 'head');
  assert.equal(session.state.remi.duration, TIMINGS.remi.jab.duration);
  protect(session);
  until(session, state => state.remi.action === 'open');
  session.setGuard(false);
  assert.equal(session.state.remi.duration, OPPONENT_PROFILES.beton.rhythm.afterJab);
  until(session, state => state.remi.action === 'guard');
  assert.equal(session.state.remi.guardLevel, 'head');
  until(session, state => state.remi.action === 'tellRight');
  assert.equal(session.state.remi.target, 'body');
  assert.equal(session.state.remi.duration, OPPONENT_PROFILES.beton.rhythm.crossTell);
  until(session, state => state.remi.action === 'cross');
  assert.equal(session.state.remi.target, 'body');
  protect(session);
  until(session, state => state.remi.action === 'open');
  assert.equal(session.state.remi.duration, OPPONENT_PROFILES.beton.rhythm.afterCross);
  assert.ok(session.state.remi.duration > TIMINGS.player.jab.duration + TIMINGS.player.cross.duration + TIMINGS.player.hook.duration);
});

test('only net touches score; a body punch beats the preannounced high guard while blocked punches and dodges add no points', () => {
  const session = create();
  for (const action of ['jab', 'cross']) {
    session.act(action); session.update(TIMINGS.player[action].duration);
  }
  assert.deepEqual(session.state.bout.score, { player: 2, remi: 0 });
  until(session, state => state.remi.action === 'guard');
  session.setGuard(true, 'head'); // Start a fresh jab instead of the prepared hook.
  assert.equal(session.act('jab'), true); session.update(.44);
  assert.equal(session.state.stats.opponentBlocked, 1);
  assert.equal(session.state.bout.score.player, 2);
  session.setGuard(true, 'body');
  assert.equal(session.act('jab'), true); session.update(.198);
  assert.equal(session.state.remi.action, 'guard');
  assert.equal(session.state.remi.guardLevel, 'head');
  assert.equal(session.state.bout.score.player, 3);
  session.update(.242); session.setGuard(false);
  until(session, state => state.remi.action === 'jab');
  protect(session); session.update(.24); session.setGuard(false);
  assert.equal(session.state.stats.blockedHead, 1);
  until(session, state => state.remi.action === 'cross');
  session.act('dodgeLeft'); session.update(.28);
  assert.equal(session.state.stats.dodged, 1);
  assert.deepEqual(session.state.bout.score, { player: 3, remi: 0 });
  until(session, state => state.remi.action === 'jab');
  session.update(.24);
  assert.deepEqual(session.state.bout.score, { player: 3, remi: 1 });
});

test('active input cannot change Béton’s tells or guard schedule, even with different random sources and tempo changes', () => {
  const quiet = create({ random: () => 0 });
  const active = create({ random: () => 1 });
  const logs = [[], []];
  for (let frame = 0; frame < 1440; frame++) {
    active.setSettings({ tempo: frame % 2 ? 'fast' : 'calm' });
    active.setGuard(frame % 10 === 0, frame % 2 ? 'head' : 'body');
    if (active.state.remi.action.startsWith('tell')) active.act('jab');
    for (const [index, session] of [quiet, active].entries()) {
      session.update(1 / 120);
      const r = session.state.remi;
      logs[index].push({ action: r.action, target: r.target, guardLevel: r.guardLevel, duration: r.duration, progress: Math.round(r.progress * 1e8) });
    }
  }
  assert.ok(active.state.stats.thrown >= 4);
  assert.deepEqual(logs[0], logs[1], 'The scheduler never reads a press, target selection, or random sample');
});

test('the baseline fight is winnable by reading both guard heights and countering in the body-direct opening at 20 and 60 Hz', () => {
  const results = [20, 60].map(hz => {
    const session = create();
    until(session, state => state.phase === 'finished', { control: counterStrategy(), hz });
    assert.equal(session.state.bout.result.winner, 'player');
    assert.equal(session.state.bout.result.reason, 'round-limit');
    assert.equal(session.state.bout.downs.remi.round, 3);
    assert.equal(session.state.stats.received, 0);
    assert.ok(session.state.stats.blockedHead > 0 && session.state.stats.blockedBody > 0);
    assert.ok(session.state.stats.combos >= 3);
    assert.ok(session.state.elapsed < 60);
    assert.equal(session.state.bout.score.player, session.state.stats.landed + 9, 'Each of the three real falls adds exactly three bonus points');
    assert.equal(session.state.bout.score.remi, 0);
    assert.match(session.state.bout.coach, /enchaînement/);
    return session.state.bout.result;
  });
  assert.deepEqual(results[0], results[1]);
});

test('an undefended opponent fight can be lost by the real ten-count without any fatigue-only KO', () => {
  const session = create();
  until(session, state => state.phase === 'finished');
  assert.deepEqual(session.state.bout.result, { reason: 'ko', winner: 'remi', loser: 'player' });
  assert.equal(session.state.bout.downs.player.total, 1);
  assert.equal(session.state.bout.count.number, 10);
  assert.ok(session.state.stats.received >= 7);
  assert.ok(session.state.stamina > 0);
  assert.equal(session.state.bout.score.remi, session.state.stats.received + 3);
});

test('three complete sixty-second rounds decide win, loss and draw by net points while keeping round history and recovery', () => {
  for (const outcome of ['player', 'remi', 'draw']) {
    const session = create();
    for (let round = 1; round <= 3; round++) {
      const before = { ...session.state.stats };
      if (outcome === 'player') session.act('jab');
      until(session, state => ['between', 'finished'].includes(state.phase), {
        control: current => {
          if (outcome === 'remi' && current.state.stats.received === before.received) current.setGuard(false);
          else protect(current);
        },
      });
      assert.equal(session.state.elapsed, 60);
      const history = session.state.bout.roundHistory.at(-1);
      assert.equal(history.round, round);
      assert.equal(history.duration, 60);
      assert.deepEqual(history.score, { player: outcome === 'player' ? 1 : 0, remi: outcome === 'remi' ? 1 : 0 });
      assert.equal(session.state.bout.downs.player.total, 0);
      assert.equal(session.state.bout.downs.remi.total, 0);
      if (round < 3) {
        assert.equal(session.state.phase, 'between');
        const resistance = { ...session.state.bout.resistance };
        const points = { ...session.state.bout.score };
        session.nextRound();
        assert.equal(session.state.stamina, 100);
        assert.deepEqual(session.state.bout.score, points);
        for (const actor of ['player', 'remi']) close(session.state.bout.resistance[actor], Math.min(100, resistance[actor] + 20));
      }
    }
    assert.equal(session.state.phase, 'finished');
    assert.equal(session.state.bout.result.reason, 'points');
    assert.equal(session.state.bout.result.winner, outcome);
    assert.deepEqual(session.state.bout.score, { player: outcome === 'player' ? 3 : 0, remi: outcome === 'remi' ? 3 : 0 });
    assert.equal(session.state.bout.roundHistory.length, 3);
    if (outcome === 'remi') assert.match(session.state.bout.coach, /jab vise la tête/);
    if (outcome === 'draw') assert.match(session.state.bout.coach, /Tu lis bien/);
  }
});

test('corner advice uses the latest round’s concrete mistakes, successful ripostes, and exhaustion', () => {
  assert.match(betonCornerAdvice({ stats: { receivedBody: 3, receivedHead: 1 } }), /direct vise le corps/);
  assert.match(betonCornerAdvice({ stats: { receivedBody: 0, receivedHead: 3 } }), /jab vise la tête/);
  assert.match(betonCornerAdvice({ stats: { opponentBlocked: 5, landed: 1 } }), /garde haute est solide/);
  assert.match(betonCornerAdvice({ stats: { combos: 2 }, fatigue: 1 }), /enchaînement.*souffle/);
  const session = create();
  // Let precisely the first body direct through, then guard the rest of round 1.
  until(session, state => state.phase === 'between', { control: current => {
    const expose = current.state.remi.target === 'body' && current.state.stats.receivedBody === 0;
    if (expose) current.setGuard(false); else protect(current);
  } });
  assert.match(session.state.bout.coach, /direct vise le corps/);
  session.nextRound();
  until(session, state => state.phase === 'between', { control: protect });
  assert.equal(session.state.stats.receivedBody, 1, 'The old mistake remains in cumulative stats');
  assert.match(session.state.bout.coach, /Tu lis bien/, 'The new advice reflects a clean defended round instead of repeating the old mistake');
});

test('switching opponents resets the bout and never leaks official points or Béton’s rhythm into Rémi', () => {
  const session = create(); session.act('jab'); session.update(.2);
  assert.equal(session.state.bout.score.player, 1);
  session.setSettings({ opponent: 'remi', lesson: 'resistance' });
  assert.equal(session.state.phase, 'ready');
  assert.equal(session.state.settings.opponent, 'remi');
  assert.equal('score' in session.state.bout, false);
  assert.equal('coach' in session.state.bout, false);
  session.start();
  assert.equal(session.state.remi.duration, 1.85);
  for (const lesson of ['free', 'resistance', 'jab', 'guard', 'counter']) {
    const implicit = new SparringSession({ lesson, random: () => .5 });
    const explicit = new SparringSession({ opponent: 'remi', lesson, random: () => .5 });
    for (const current of [implicit, explicit]) { current.start(); current.act('jab'); current.update(12); }
    assert.deepEqual(explicit.state, implicit.state);
    assert.deepEqual(explicit.drainEvents(), implicit.drainEvents());
    assert.equal(explicit.state.bout?.score, undefined);
  }
});
