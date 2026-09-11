import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ShadowSession } from '../src/game/ShadowSession.js';
import { TIMINGS } from '../src/game/SparringSession.js';
import { ShadowFighterView, MIRROR_LAYOUT } from '../src/scenes/ShadowFighterView.js';

// These checks exercise the view's real pose selection and transforms against
// the authored opaque bounds. Browser inspection still verifies the raster art.
const base = JSON.parse(readFileSync(new URL('../public/assets/sprites/bag-orthodox/fighters.json', import.meta.url)));
const defense = JSON.parse(readFileSync(new URL('../public/assets/sprites/mirror/fighters.json', import.meta.url)));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);

function displayObject(x, y, texture) {
  return {
    x, y, texture: { key: texture }, rotation: 0, scaleX: 1, scaleY: 1,
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
    setTexture(key) { this.texture = { key }; return this; },
    setTint(tint) { this.tint = tint; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
  };
}
function create(speed = 1) {
  const session = new ShadowSession({ speed });
  const view = new ShadowFighterView({
    cache: { json: { get: key => key === 'shadow-base-data' ? base : defense } },
    add: { image: displayObject, ellipse: displayObject },
  });
  session.start();
  return { session, view };
}
function frames(session, seconds, hz, sample) {
  for (let remaining = seconds; remaining > 1e-9;) {
    const dt = Math.min(remaining, 1 / hz);
    session.update(dt);
    sample();
    remaining -= dt;
  }
}
function inside(bounds, rect, label) {
  assert.ok(bounds.left >= rect.x && bounds.top >= rect.y
    && bounds.right <= rect.x + rect.width && bounds.bottom <= rect.y + rect.height,
  `${label} exceeds its visible frame: ${JSON.stringify(bounds)}`);
}
function rendered(view) {
  return {
    pose: view.pose, phase: view.phase,
    player: { ...view.sprite, texture: { ...view.sprite.texture } },
    reflection: { ...view.reflection, texture: { ...view.reflection.texture } },
  };
}

test('at 20 and 60 Hz every counted gesture has its authored pose and both figures stay inside their frames', () => {
  assert.deepEqual(MIRROR_LAYOUT.glass, defense.background.glass, 'Use the authored mirror opening');
  for (const hz of [20, 60]) {
    const { session, view } = create();
    const poses = new Set();
    const phases = new Set();
    const counted = [];
    const sample = () => {
      view.render(session.state.player, session.state.elapsed);
      poses.add(view.pose);
      phases.add(view.phase);
      assert.equal(view.sprite.texture.key, `shadow-${view.pose}`);
      assert.equal(view.reflection.texture.key, view.sprite.texture.key, 'The reflection never uses a delayed pose');
      assert.ok(view.sprite.scaleX > 0 && view.sprite.scaleY > 0, 'The actual boxer keeps his authored orthodox stance');
      assert.ok(view.reflection.scaleX < 0 && view.reflection.scaleY > 0, 'Only the reflected figure is mirrored');
      inside(view.bounds(), { x: 0, y: 0, width: 1280, height: 720 }, `Boxer ${view.pose}`);
      inside(view.bounds(true), defense.background.glass, `Reflected ${view.pose}`);
      for (const event of session.drainEvents()) {
        assert.equal(event.type, 'motion');
        assert.equal(view.pose, event.action, `Count ${event.action} only when its full movement is visible`);
        assert.equal(view.phase, event.action.startsWith('dodge') ? 'dodge' : 'contact');
        counted.push(event.action);
      }
    };
    sample();
    for (const [input, expected] of [['jab', 'jab'], ['cross', 'cross'], ['jab', 'hook']]) {
      assert.equal(session.act(input), true);
      assert.equal(session.state.player.action, expected);
      sample();
      frames(session, TIMINGS.player[expected].duration, hz, sample);
    }
    session.setGuard(true);
    frames(session, .8, hz, sample);
    session.setGuard(false);
    for (const direction of ['dodgeLeft', 'dodgeRight']) {
      assert.equal(session.act(direction), true);
      sample();
      frames(session, TIMINGS.player[direction].duration, hz, sample);
    }
    frames(session, 2, hz, sample);
    assert.deepEqual(counted, ['jab', 'cross', 'hook', 'dodgeLeft', 'dodgeRight']);
    assert.deepEqual([...poses].sort(), ['guard', 'windup', 'jab', 'cross', 'hook-windup', 'hook', 'block', 'dodgeLeft', 'dodgeRight'].sort());
    for (const phase of ['preparation', 'contact', 'recovery', 'defense', 'dodge', 'idle']) assert.ok(phases.has(phase), `${phase} was actually sampled`);
  }
});

test('glove and body landmarks remain exact mirror counterparts through turns and slips', () => {
  const { session, view } = create();
  const sample = () => {
    view.render(session.state.player, session.state.elapsed);
    const pose = view.metadata.poses[view.pose];
    const { x, y, width, height } = pose.bounds;
    const landmarks = [{ x, y }, { x: x + width, y: y + height }, view.anchor];
    if (pose.contact) landmarks.push(pose.contact);
    for (const landmark of landmarks) {
      const actual = view.point(landmark);
      const reflected = view.point(landmark, true);
      // Normalize each scene location to its resting feet and scale. A true
      // mirror reverses horizontal distance while preserving vertical distance.
      close((actual.x - MIRROR_LAYOUT.player.x) / MIRROR_LAYOUT.player.scale,
        -(reflected.x - MIRROR_LAYOUT.reflection.x) / MIRROR_LAYOUT.reflection.scale);
      close((actual.y - MIRROR_LAYOUT.player.feet) / MIRROR_LAYOUT.player.scale,
        (reflected.y - MIRROR_LAYOUT.reflection.feet) / MIRROR_LAYOUT.reflection.scale);
    }
  };
  for (const [input, action] of [['jab', 'jab'], ['cross', 'cross'], ['jab', 'hook'], ['dodgeLeft', 'dodgeLeft'], ['dodgeRight', 'dodgeRight']]) {
    session.act(input);
    frames(session, TIMINGS.player[action].duration, 60, sample);
  }
  session.setGuard(true);
  frames(session, .5, 60, sample);
});

test('normal and slowed practice share one movement instant, and pausing freezes the boxer and reflection together', () => {
  const normal = create();
  const slow = create(.65);
  for (const { session } of [normal, slow]) session.act('jab');
  normal.session.update(.15);
  slow.session.update(.15 / .65);
  for (const { session, view } of [normal, slow]) view.render(session.state.player, session.state.elapsed);
  assert.equal(normal.view.pose, slow.view.pose);
  assert.equal(normal.view.phase, slow.view.phase);
  for (const sprite of ['sprite', 'reflection']) {
    assert.equal(normal.view[sprite].texture.key, slow.view[sprite].texture.key);
    for (const coordinate of ['x', 'y', 'rotation', 'scaleX', 'scaleY']) close(normal.view[sprite][coordinate], slow.view[sprite][coordinate]);
  }
  assert.ok(slow.session.state.seconds > normal.session.state.seconds, 'Slowing the motion still measures the real practice duration');
  slow.session.pause();
  slow.view.render(slow.session.state.player, slow.session.state.elapsed);
  const paused = rendered(slow.view);
  slow.session.update(20);
  slow.view.render(slow.session.state.player, slow.session.state.elapsed);
  assert.deepEqual(rendered(slow.view), paused);
  slow.session.resume();
  slow.session.update(.048 / .65);
  slow.view.render(slow.session.state.player, slow.session.state.elapsed);
  assert.equal(slow.view.pose, 'jab');
  assert.equal(slow.view.sprite.texture.key, slow.view.reflection.texture.key);
  assert.equal(slow.session.state.stats.jab, 1);
  slow.session.finish();
  const finished = rendered(slow.view);
  slow.session.releaseControls();
  slow.session.update(20);
  slow.view.render(slow.session.state.player, slow.session.state.elapsed);
  assert.deepEqual(rendered(slow.view), finished, 'The report preserves the same extended glove in both figures');
});
