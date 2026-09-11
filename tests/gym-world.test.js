import test from 'node:test';
import assert from 'node:assert/strict';
import { GymWorld, GYM_LAYOUT } from '../src/game/GymWorld.js';

function world(changes = {}) {
  return new GymWorld({ layout: {
    ...structuredClone(GYM_LAYOUT),
    spawn: { x: 300, y: 500 },
    obstacles: [],
    stations: [],
    ...changes,
  } });
}

function advance(model, seconds, dt = 1 / 60) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) {
    model.update(Math.min(dt, seconds - elapsed));
  }
}

test('walk speed is frame independent and diagonals do not outrun a straight walk', () => {
  for (const dt of [1 / 144, 1 / 60, 1 / 20, .5]) {
    const straight = world();
    const diagonal = world();
    straight.setInput({ x: 1 });
    diagonal.setInput({ x: 1, y: -1 });
    advance(straight, 1, dt);
    advance(diagonal, 1, dt);
    assert.ok(Math.abs(straight.state.x - 500) < 1e-6);
    assert.ok(Math.abs(Math.hypot(diagonal.state.x - 300, diagonal.state.y - 500) - 200) < 1e-6);
    assert.ok(Math.abs(diagonal.state.walkTime - straight.state.walkTime) < 1e-6);
    assert.equal(straight.state.facing, 'right');
    assert.equal(straight.state.moving, true);
  }
});

test('the footprint stops against thin equipment, including after a delayed frame', () => {
  for (const dt of [1 / 60, 1]) {
    const model = world({ obstacles: [{ x: 390, y: 450, width: 2, height: 100 }] });
    model.setInput({ x: 1 });
    advance(model, 1, dt);
    assert.equal(model.state.x, 376);
    assert.equal(model.state.y, 500);
    model.update(.1);
    assert.equal(model.state.moving, false, 'a blocked body must not keep its walk animation');
    const clock = model.state.walkTime;
    model.update(.1);
    assert.equal(model.state.walkTime, clock);
  }
});

test('a diagonal slides along a wall and can walk around its end', () => {
  const model = world({ obstacles: [{ x: 350, y: 370, width: 80, height: 130 }] });
  model.setInput({ x: 1, y: -1 });
  advance(model, .7);
  assert.equal(model.state.x, 336);
  assert.ok(model.state.y < 405, 'blocked horizontal motion must preserve vertical motion');
  advance(model, .8);
  assert.ok(model.state.y < 363);
  assert.ok(model.state.x > 336, 'the boxer can go around the end once the footprint clears it');
});

test('all four room edges contain the entire footprint and never alter the camera frame', () => {
  const model = world();
  const { bounds, footprint } = model.layout;
  for (const [input, axis, expected] of [
    [{ x: -1 }, 'x', bounds.left + footprint.halfWidth],
    [{ x: 1 }, 'x', bounds.right - footprint.halfWidth],
    [{ y: -1 }, 'y', bounds.top + footprint.halfHeight],
    [{ y: 1 }, 'y', bounds.bottom - footprint.halfHeight],
  ]) {
    model.setInput(input);
    advance(model, 8);
    assert.equal(model.state[axis], expected);
  }
  assert.equal(model.layout.width, 1280);
  assert.equal(model.layout.height, 720);
});

test('the nearest accessible station wins, while equipment blocks prompts through a wall', () => {
  const model = world({
    spawn: { x: 300, y: 500 },
    obstacles: [{ x: 320, y: 440, width: 8, height: 120 }],
    stations: [
      { id: 'behind-wall', x: 340, y: 500, radius: 75 },
      { id: 'accessible', x: 260, y: 520, radius: 75 },
      { id: 'far-away', x: 190, y: 500, radius: 75 },
    ],
  });
  assert.equal(model.getNearby()?.id, 'accessible');
  model.setInput({ x: -1 });
  advance(model, .7);
  assert.equal(model.state.nearby?.id, 'far-away');
  model.setInput({ y: -1 });
  advance(model, 1);
  assert.equal(model.getNearby(), null);
});

test('Rémi can be approached without standing inside his footprint', () => {
  const model = world({
    spawn: { x: 915, y: 610 },
    obstacles: [{ id: 'remi', x: 899, y: 458, width: 32, height: 20 }],
    stations: [{ id: 'remi', x: 915, y: 470, radius: 85, kind: 'sparring' }],
  });
  model.setInput({ y: -1 });
  advance(model, 1);
  assert.equal(model.state.y, 485);
  assert.equal(model.state.nearby?.id, 'remi');
  assert.equal(model.getNearby()?.kind, 'sparring');
});

test('pause and a return from sparring preserve position and cannot revive stale input', () => {
  const model = world({ stations: [{ id: 'mirror', x: 350, y: 500, radius: 75 }] });
  model.setInput({ x: 1 });
  advance(model, .25);
  model.pause();
  const paused = structuredClone(model.state);
  model.setInput({ y: -1 });
  advance(model, 60);
  assert.deepEqual(model.state, paused);
  model.resume();
  advance(model, 1);
  assert.equal(model.state.x, paused.x);
  assert.equal(model.state.y, paused.y);
  assert.equal(model.state.moving, false);
  assert.equal(model.getNearby()?.id, 'mirror');
  model.setInput({ y: -1 });
  advance(model, .25);
  assert.ok(Math.abs(model.state.y - 450) < 1e-6);
  const stoppedY = model.state.y;
  model.releaseControls();
  advance(model, 1);
  assert.equal(model.state.y, stoppedY);
});

test('invalid input and elapsed time cannot corrupt the coordinates', () => {
  const model = world();
  model.setInput({ x: NaN, y: Infinity });
  for (const dt of [NaN, Infinity, -1, 0, .1]) model.update(dt);
  assert.equal(model.state.x, 300);
  assert.equal(model.state.y, 500);
  model.setInput({ x: 10 });
  model.update(.1);
  assert.ok(Math.abs(model.state.x - 320) < 1e-6);
  model.setInput({});
  assert.equal(model.state.moving, false);
});
