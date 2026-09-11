import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SparringSession, TIMINGS, IMPACT_HOLD } from '../src/game/SparringSession.js';
import { fighterMotion, transformFighterPoint } from '../src/game/FighterMotion.js';
import { FighterView } from '../src/scenes/FighterView.js';

// Authored landmarks let these renderer checks run without Phaser's browser
// dependency. Visual quality and the artwork itself are checked in-browser.
const metadata = JSON.parse(readFileSync(new URL('../public/assets/sprites/sparring-v2/fighters.json', import.meta.url)));
Object.assign(metadata.poses, JSON.parse(readFileSync(new URL('../public/assets/sprites/sparring-hook/fighters.json', import.meta.url))).poses);
function displayObject(x, y) {
  return {
    x, y, rotation: 0, flipX: false,
    setOrigin() { return this; },
    setScale(scale) { this.scaleX = this.scaleY = scale; return this; },
    setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
    setFlipX(flip) { this.flipX = flip; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setTexture(key) { this.texture = { key }; return this; },
  };
}
function view(who, landmarks = metadata) {
  const scene = {
    cache: { json: { get: () => landmarks } },
    add: { ellipse: displayObject, image: displayObject },
  };
  return new FighterView(scene, who, 640, who === 'player' ? 718 : 592, 390);
}

test('every player contact uses its authored pose on the same frame as the scored touch', () => {
  for (const attack of ['jab', 'cross', 'hook']) {
    for (const dt of [1 / 120, 1 / 30, .05]) {
      const session = new SparringSession({ random: () => .5 });
      const boxer = view('player');
      boxer.target = { x: 643.3, y: 240.2 };
      session.start();
      if (attack === 'hook') {
        session.act('jab'); session.update(TIMINGS.player.jab.duration);
        session.act('cross'); session.update(TIMINGS.player.cross.duration);
        session.drainEvents();
      }
      session.act(attack === 'hook' ? 'jab' : attack);
      let contactSeen = false;
      const observedPoses = new Set();
      while (session.state.player.action === attack) {
        boxer.render(session.state.player, session.state.elapsed);
        observedPoses.add(boxer.pose);
        const events = session.drainEvents();
        if (!contactSeen && !events.some((event) => event.type === 'player-hit')) {
          assert.notEqual(boxer.pose, attack, 'extension must not precede the score');
        }
        if (events.some((event) => event.type === 'player-hit')) {
          contactSeen = true;
          assert.equal(boxer.pose, attack);
          const contact = boxer.contact();
          assert.ok(Math.hypot(contact.x - boxer.target.x, contact.y - boxer.target.y) < 1);
        }
        assert.equal(boxer.sprite.scaleX, boxer.baseScale, 'a punch must not resize the boxer');
        session.update(dt);
      }
      assert.ok(contactSeen);
      assert.ok(observedPoses.has(`${attack}-windup`));
      assert.ok(observedPoses.has(`${attack}-recover`));
    }
  }
});

test('Rémi keeps a readable windup and meets his contact on both committed attacks', () => {
  const session = new SparringSession({ random: () => .5 });
  const boxer = view('remi');
  boxer.target = { x: 640, y: 355 };
  session.start();
  const attacks = new Set();
  while (session.state.elapsed < 10 && attacks.size < 2) {
    session.update(1 / 120);
    boxer.render(session.state.remi, session.state.elapsed);
    const fighter = session.state.remi;
    if (fighter.action.startsWith('tell') && fighter.progress > .25) {
      assert.ok(boxer.pose.endsWith('-windup'));
    }
    for (const event of session.drainEvents()) {
      if (event.type !== 'remi-hit') continue;
      attacks.add(event.attack);
      assert.equal(boxer.pose, event.attack);
      const contact = boxer.contact();
      const expectedX = boxer.target.x + (event.attack === 'jab' ? -36 : 36);
      assert.ok(Math.hypot(contact.x - expectedX, contact.y - boxer.target.y - 18) < 1);
    }
  }
  assert.deepEqual([...attacks], ['jab', 'cross']);
});

test('the contact hold lasts 100ms and the return is progressive without scale changes', () => {
  for (const who of ['player', 'remi']) {
    for (const attack of who === 'player' ? ['jab', 'cross', 'hook'] : ['jab', 'cross']) {
      const timing = TIMINGS[who][attack];
      const sample = (seconds) => fighterMotion({ action: attack, ...timing, progress: seconds / timing.duration }, seconds, who);
      const contactAt = timing.duration * timing.impact;
      assert.equal(sample(contactAt - .001).phase, 'preparation');
      assert.equal(sample(contactAt).phase, 'contact');
      assert.equal(sample(contactAt + IMPACT_HOLD - .001).pose, attack);
      assert.equal(sample(contactAt + IMPACT_HOLD + .001).pose, `${attack}-recover`);
      let previousReach = 1;
      for (let age = contactAt + IMPACT_HOLD; age <= timing.duration; age += .001) {
        const motion = sample(age);
        assert.ok(motion.reach <= previousReach + 1e-9);
        assert.ok(motion.reach >= 0);
        previousReach = motion.reach;
      }
      const resting = sample(timing.duration);
      assert.equal(resting.pose, 'guard');
      assert.equal(resting.reach, 0);
    }
  }
});

test('a simultaneous hit and moving target cannot pull the glove off its contact', () => {
  const boxer = view('player');
  boxer.target = { x: 637.4, y: 280.6 };
  const state = { action: 'cross', ...TIMINGS.player.cross, progress: .5, hurt: .65 };
  boxer.render(state, 3);
  const contact = boxer.contact();
  assert.ok(Math.hypot(contact.x - boxer.target.x, contact.y - boxer.target.y) < 1);
  boxer.target = { x: 681, y: 333 };
  boxer.render({ ...state, progress: .6 }, 3.06);
  assert.deepEqual(boxer.contact(), contact, 'defender recoil does not track an already landed punch');
  assert.equal(boxer.sprite.scaleX, boxer.baseScale);
});

test('left and right dodges are mirrored and remain fully displaced throughout the active defense', () => {
  for (const direction of ['dodgeLeft', 'dodgeRight']) {
    const timing = TIMINGS.player[direction];
    const side = direction === 'dodgeLeft' ? -1 : 1;
    for (const seconds of [timing.activeFrom, .2, timing.activeUntil]) {
      const motion = fighterMotion({ action: direction, ...timing, progress: seconds / timing.duration }, seconds, 'player');
      assert.equal(motion.pose, 'dodge');
      assert.equal(Math.sign(motion.dx), side);
      assert.equal(motion.flip, side > 0);
      assert.equal(Math.abs(motion.dx), 26);
    }
    const resting = fighterMotion({ action: direction, ...timing, progress: 1 }, 1, 'player');
    assert.equal(resting.pose, 'guard');
    assert.equal(resting.flip, false);
    assert.ok(Math.abs(resting.dx) < 2);
  }
});

test('visible landmarks follow rotation and mirroring instead of the untransformed sprite', () => {
  const point = transformFighterPoint({ x: 202, y: 594 }, { x: 192, y: 624 }, {
    x: 640, y: 718, scale: 2, flip: true, rotation: Math.PI / 2,
  });
  assert.ok(Math.abs(point.x - 700) < 1e-9);
  assert.ok(Math.abs(point.y - 698) < 1e-9);
});

test('an authored mirrored pose aims its contact correctly and combines with directional mirroring', () => {
  const landmarks = structuredClone(metadata);
  landmarks.poses['player-cross'].mirror = true;
  landmarks.poses['player-dodge'].mirror = true;
  const boxer = view('player', landmarks);
  const contactPoint = landmarks.poses['player-cross'].contact;
  const originalOffset = (contactPoint.x - landmarks.anchor.x) * boxer.baseScale;
  assert.ok(Math.abs(boxer.point('cross', 'contact').x - (boxer.x - originalOffset)) < 1e-9);

  boxer.target = { x: 641.6, y: 252.3 };
  boxer.render({ action: 'cross', ...TIMINGS.player.cross, progress: .5 }, 1);
  assert.equal(boxer.sprite.flipX, true);
  const contact = boxer.contact();
  assert.ok(Math.hypot(contact.x - boxer.target.x, contact.y - boxer.target.y) < 1);

  boxer.render({ action: 'dodgeRight', ...TIMINGS.player.dodgeRight, progress: .4 }, 2);
  assert.equal(boxer.sprite.flipX, false, 'two mirrors cancel instead of forcing a flipped pose');
  const head = boxer.point('dodge', 'head', true);
  const expected = transformFighterPoint(landmarks.poses['player-dodge'].head, landmarks.anchor, {
    x: boxer.sprite.x, y: boxer.sprite.y, scale: boxer.baseScale,
    flip: false, rotation: boxer.sprite.rotation,
  });
  assert.deepEqual(head, expected);
});
