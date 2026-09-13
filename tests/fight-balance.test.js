import test from 'node:test';
import assert from 'node:assert/strict';
import { getOpponentProfile } from '../src/game/OpponentProfiles.js';
import { officialDamage, officialRestoredResistance, OFFICIAL_ROUND_DURATION } from '../src/game/FightBalance.js';

const opponents = ['beton', 'kramer', 'bellini', 'fortin', 'gagnon', 'dyrex', 'louisto', 'lefeu'];
const comboDamage = (profile, power) => ['jab', 'cross', 'hook'].reduce((sum, attack) => sum + officialDamage(profile, 'remi', attack, power), 0);

test('official pacing leaves several exchanges before a knockdown, even at the training cap', () => {
  assert.equal(OFFICIAL_ROUND_DURATION, 45);
  for (const id of opponents) {
    const profile = getOpponentProfile(id);
    const combo = comboDamage(profile, 10);
    // No one-combo second knockdown, formerly common with flat +10 per punch.
    assert.ok(combo < profile.maxResistance / 3, id);
    for (const down of [1, 2, 3]) {
      assert.ok(officialRestoredResistance(profile.maxResistance, down) > combo * 2, `${id}, down ${down}`);
    }
    // A knockout still remains physically possible: there is no round gate.
    let resistance = profile.maxResistance, hits = 0;
    while (resistance > 0 && hits < 100) { resistance -= officialDamage(profile, 'remi', 'jab'); hits++; }
    assert.ok(resistance <= 0 && hits < 30, id);
  }
});

test('training is useful without reversing the strength of jab and finishing punches', () => {
  const profile = getOpponentProfile('beton');
  const trainedJab = officialDamage(profile, 'remi', 'jab', 10);
  assert.ok(trainedJab > officialDamage(profile, 'remi', 'jab', 0));
  assert.ok(trainedJab < officialDamage(profile, 'remi', 'cross', 0));
  assert.equal(officialDamage(profile, 'remi', 'jab', 999), trainedJab);
  assert.equal(officialDamage(profile, 'remi', 'jab', -1), officialDamage(profile, 'remi', 'jab', 0));
  const finisher = officialDamage(profile, 'remi', 'cross', 10, 4);
  assert.ok(finisher > officialDamage(profile, 'remi', 'cross', 10));
  assert.ok(finisher < officialDamage(profile, 'remi', 'hook', 10));
  assert.equal(officialDamage(profile, 'remi', 'guard', 10, 4), 0);
  assert.equal(officialDamage(profile, 'other', 'jab'), 0);
});

test('post-knockdown resistance scales with each fighter and stays bounded', () => {
  assert.deepEqual([1, 2, 3].map(n => officialRestoredResistance(100, n)), [80, 72, 65]);
  assert.deepEqual([1, 2, 3].map(n => officialRestoredResistance(120, n)), [96, 86.4, 78]);
  assert.equal(officialRestoredResistance(100, 20), 65);
  assert.equal(officialRestoredResistance(100, 0), 80);
  assert.equal(officialRestoredResistance(-100, 1), 0);
  assert.equal(officialRestoredResistance(NaN, 1), 0);
});

test('progression adds consequence to missed defence and reduces late free openings', () => {
  let previousResistance = 0, previousDamage = 0;
  for (const id of opponents) {
    const profile = getOpponentProfile(id);
    assert.ok(profile.maxResistance >= previousResistance, id);
    const damage = officialDamage(profile, 'player', 'cross');
    assert.ok(damage >= previousDamage, id);
    previousResistance = profile.maxResistance; previousDamage = damage;
  }
  const beton = getOpponentProfile('beton');
  const lefeu = getOpponentProfile('lefeu');
  assert.ok(officialDamage(lefeu, 'player', 'cross') > officialDamage(beton, 'player', 'cross') * 1.5);
  assert.ok(lefeu.pattern.filter(stage => stage.opening > 1).every(stage => stage.opening < beton.rhythm.afterCross));
  assert.equal(getOpponentProfile('kramer').quitsAfterDowns, 2);
});

test('late patterns preserve visible preparation and enough time for a deliberate counter', () => {
  // J–K–J: jab duration .34 + direct .42 + hook contact .27 = 1.03s.
  // A full opening adds at least .27s to recognize the moment and start.
  for (const id of opponents) {
    const profile = getOpponentProfile(id);
    if (!profile.pattern) continue;
    for (const stage of profile.pattern) {
      assert.ok(Object.isFrozen(stage));
      if (stage.attack) assert.ok(stage.tell >= .55, `${id} ${stage.attack}`);
      if (stage.opening > 1) assert.ok(stage.opening >= 1.30, `${id} counter`);
    }
    assert.ok(profile.pattern.some(stage => stage.opening > 1), `${id} has a counter opening`);
  }
  const sequence = getOpponentProfile('lefeu').pattern.filter(stage => stage.attack);
  assert.deepEqual(sequence.map(stage => stage.target), ['body', 'head', 'body', 'head', 'head']);
});
