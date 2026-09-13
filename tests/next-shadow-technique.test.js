import test from 'node:test';
import assert from 'node:assert/strict';
import { ShadowSession } from '../src/game/ShadowSession.js';
import { OctopusDrill } from '../src/game/GymFriendsRules.js';

const motion = (session, action, drill) => {
  assert.equal(session.act(action), true);
  let events = [];
  while (!['idle', 'guard'].includes(session.state.player.action)) {
    session.update(.01); const next = session.drainEvents();
    drill?.observe(session.state, next); events.push(...next);
  }
  return events;
};

test('double jab remains ordinary punches before learning; JKJ stays available after learning', () => {
  for (const learned of [false, true]) {
    const session = new ShadowSession({ techniques: { doubleJab: learned } }); session.start();
    const events = ['jab', 'jab', 'cross'].flatMap(input => motion(session, input));
    assert.equal(events.filter(event => event.comboType === 'doubleJab' && event.combo).length, learned ? 1 : 0);
    session.releaseControls();
    const old = ['jab', 'cross', 'jab'].flatMap(input => motion(session, input));
    assert.equal(old.at(-1).action, 'hook'); assert.equal(old.at(-1).combo, true);
  }
});

test('Octopus technique lesson needs three completed JJK series; pause and other punches do not qualify', () => {
  const session = new ShadowSession({ techniques: { doubleJab: true } }); session.start();
  const drill = new OctopusDrill('doubleJab');
  motion(session, 'jab', drill); motion(session, 'jab', drill); session.pause(); session.resume(); motion(session, 'cross', drill);
  assert.equal(drill.progress, 0);
  for (let count = 0; count < 3; count++) {
    for (const input of ['jab', 'jab', 'cross']) motion(session, input, drill);
    assert.equal(drill.progress, count + 1); assert.equal(drill.completed, count === 2);
  }
  assert.equal(session.state.stats.doubleJabCombos, 3);
});
