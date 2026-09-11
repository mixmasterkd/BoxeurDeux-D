import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerProfile } from '../src/game/CareerProfile.js';
import { SparringSession, TIMINGS } from '../src/game/SparringSession.js';

function trained(repetitions = 1) {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, text) => values.set(key, text) };
  const profile = new CareerProfile({ storage });
  for (let i = 0; i < repetitions; i++) {
    profile.reward('rope', { hits: 30, accuracy: 90 });
    profile.reward('speedball', { hits: 30, accuracy: 90 });
    profile.reward('bag', { contacts: 9, accuracy: 90 });
    profile.reward('sparring', { rounds: 3, completed: true, actions: 12 });
  }
  return { profile: new CareerProfile({ storage }), storage };
}
const fight = (settings = {}) => {
  const session = new SparringSession({ opponent: 'beton', random: () => .5, ...settings });
  session.start(); return session;
};
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} ≠ ${b}`);

test('reloaded gym progress gives measurable player gains in Béton without strengthening the opponent', () => {
  const { profile } = trained(), base = fight(), improved = fight(profile.bonuses());
  assert.equal(improved.state.stamina, 102);
  assert.deepEqual(improved.state.bout.resistance, { player: 102, remi: 100 });
  for (const session of [base, improved]) {
    session.act('jab'); session.update(TIMINGS.player.jab.duration * TIMINGS.player.jab.impact);
    assert.equal(session.state.stats.landed, 1); assert.equal(session.state.bout.score.player, 1);
  }
  assert.equal(base.state.bout.resistance.remi, 88);
  assert.equal(improved.state.bout.resistance.remi, 87);
  near(improved.state.stamina - base.state.stamina, 2);
});

test('speedball changes real post-punch recovery while action costs and impact timing remain the same', () => {
  const { profile } = trained(), base = fight(), improved = fight(profile.bonuses());
  for (const session of [base, improved]) { session.act('cross'); session.update(.9); }
  const before = [base.state.stamina, improved.state.stamina];
  assert.equal(base.state.stats.landed, improved.state.stats.landed);
  for (const session of [base, improved]) session.update(.30);
  const recovered = [base.state.stamina - before[0], improved.state.stamina - before[1]];
  assert.ok(recovered[0] > 0);
  near(recovered[1] / recovered[0], 1.02);
});

test('the corner restores trained endurance and caps resistance separately for player and opponent', () => {
  const { profile } = trained(8), session = fight({ ...profile.bonuses(), duration: 10 });
  while (session.state.phase === 'running') session.update(1 / 60);
  assert.equal(session.state.phase, 'between');
  const resistance = session.state.bout.resistance.player;
  assert.ok(resistance < 108);
  session.nextRound();
  assert.equal(session.state.stamina, 110);
  assert.equal(session.state.bout.resistance.player, Math.min(108, resistance + 20));
  assert.equal(session.state.bout.resistance.remi, 100);
});

test('maximum training cannot defend by itself; a real completed loss persists across reload', () => {
  const { profile, storage } = trained(8), session = fight(profile.bonuses());
  for (let frame = 0; frame < 60 * 240 && session.state.phase !== 'finished'; frame++) {
    if (session.state.phase === 'between') session.nextRound();
    session.update(1 / 60);
  }
  assert.equal(session.state.phase, 'finished');
  assert.equal(session.state.bout.result.winner, 'remi');
  assert.equal(session.state.stats.blocked, 0); assert.equal(session.state.stats.dodged, 0);
  profile.recordFight({ ...session.state.bout.result, score: session.state.bout.score.player });
  const reloaded = new CareerProfile({ storage });
  assert.equal(reloaded.snapshot().fights.beton.losses, 1);
  assert.deepEqual(reloaded.bonuses(), profile.bonuses());
});
