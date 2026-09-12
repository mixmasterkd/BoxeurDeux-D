import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ExplorationWorld, HOME_LAYOUT, NEIGHBORHOOD_LAYOUT, STREET_SCALE,
  WORLD_ENTRANCES, canStand,
} from '../src/game/ExplorationWorld.js';

const street = (x, y) => ({ x: x * STREET_SCALE, y: y * STREET_SCALE });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// These routes follow the walkable pixels of the actual background. Movement
// goes through the public controller, with collision checks on every frame;
// tests never teleport the boxer between landmarks or disable an obstacle.
function walk(model, points, dt = 1 / 30) {
  for (const point of points) {
    assert.ok(canStand(model.layout, point), `Unreachable waypoint ${JSON.stringify(point)}`);
    let frames = 0;
    while (distance(model.state, point) > .001) {
      const before = { x: model.state.x, y: model.state.y };
      const remaining = distance(before, point);
      model.setInput({ x: (point.x - before.x) / remaining, y: (point.y - before.y) / remaining });
      model.update(Math.min(dt, remaining / model.layout.speed));
      assert.ok(canStand(model.layout, model.state), `The footprint entered scenery near ${JSON.stringify(before)}`);
      assert.ok(distance(before, model.state) > .00001, `The route is blocked before ${JSON.stringify(point)}`);
      assert.ok(++frames < 4000, 'The route must finish in finite walking time');
    }
    model.releaseControls();
  }
}

test('all arrival locations leave the full footprint outside walls and furniture', () => {
  assert.ok(canStand(HOME_LAYOUT, HOME_LAYOUT.spawn));
  assert.ok(canStand(NEIGHBORHOOD_LAYOUT, NEIGHBORHOOD_LAYOUT.spawn));
  for (const [place, entrance] of Object.entries(WORLD_ENTRANCES)) {
    assert.ok(canStand(NEIGHBORHOOD_LAYOUT, entrance), `${place} arrival is blocked`);
    const model = new ExplorationWorld({ place: 'neighborhood', position: entrance });
    assert.deepEqual(model.location(), { scene: 'neighborhood', ...entrance });
    assert.equal(model.getNearby()?.id, place, `${place} must remain reachable after leaving its building`);
  }
});

test('a continuous walk links the house, gym and fight entrance in both directions', () => {
  for (const dt of [1 / 60, 1 / 20]) {
    const model = new ExplorationWorld({ place: 'neighborhood', position: WORLD_ENTRANCES.home });
    for (const id of ['gym', 'fight', 'gym', 'home']) {
      walk(model, [street(model.state.x / STREET_SCALE, 370), street(WORLD_ENTRANCES[id].x / STREET_SCALE, 370), WORLD_ENTRANCES[id]], dt);
      assert.equal(model.getNearby()?.id, id);
    }
    assert.ok(model.state.walkTime * model.layout.speed > 2 * 1280, 'The round trip traverses more than two camera widths');
  }
});

test('both northern alleys can be explored and exited through the street', () => {
  const model = new ExplorationWorld({ place: 'neighborhood', position: WORLD_ENTRANCES.home });
  for (const alleyX of [490, 1015]) {
    walk(model, [street(model.state.x / STREET_SCALE, 370), street(alleyX, 370), street(alleyX, 180)]);
    assert.equal(model.getNearby(), null, 'A doorway must not be activated through an adjacent facade');
    model.setInput({ y: -1 });
    model.update(60);
    assert.ok(model.state.y >= 153 * STREET_SCALE + NEIGHBORHOOD_LAYOUT.footprint.halfHeight,
      'The back fence closes the future alley extension');
    assert.ok(canStand(model.layout, model.state));
    walk(model, [street(alleyX, 370)]);
  }
  walk(model, [street(272, 370), WORLD_ENTRANCES.home]);
  assert.equal(model.getNearby()?.id, 'home');
});

test('the park gate opens onto a complete walk around the garden and back home', () => {
  const model = new ExplorationWorld({ place: 'neighborhood', position: WORLD_ENTRANCES.home });
  walk(model, [
    street(272, 477), street(780, 477), street(780, 860),
    street(680, 860), street(680, 945), street(347, 945),
    street(347, 849), street(260, 849), street(260, 710),
    street(575, 710), street(575, 860), street(347, 860),
    street(347, 945), street(680, 945), street(680, 860),
    street(780, 860), street(780, 477), street(272, 477), WORLD_ENTRANCES.home,
  ]);
  assert.equal(model.getNearby()?.id, 'home');
});

test('the lower shopfronts can be reached without crossing their roofs or the roadworks', () => {
  const model = new ExplorationWorld({ place: 'neighborhood', position: WORLD_ENTRANCES.gym });
  walk(model, [street(752, 477), street(780, 477), street(780, 875), street(1095, 875)]);
  assert.equal(model.getNearby()?.id, 'shop');
  walk(model, [street(1350, 875)]);
  assert.equal(model.getNearby()?.id, 'future');
  walk(model, [street(780, 875), street(780, 477), street(752, 477), WORLD_ENTRANCES.gym]);
  assert.equal(model.getNearby()?.id, 'gym');
});

test('the park approach tolerates a range of joypad positions instead of a single exact line', () => {
  // Crossing this sidewalk must allow at least twelve world pixels of lateral
  // tolerance. These are input routes at normal mobile update rates; the main
  // barrier and isolated cones remain solid and are never removed for the test.
  for (const sourceX of [677, 681, 685]) {
    const model = new ExplorationWorld({ place: 'neighborhood', position: street(sourceX, 860) });
    walk(model, [street(sourceX, 945), street(347, 945), street(347, 849),
      street(347, 945), street(sourceX, 945), street(sourceX, 860)], 1 / 20);
    assert.ok(distance(model.state, street(sourceX, 860)) < .001);
  }
});

test('a stalled frame cannot cross a building, the park fence, or the southern cones', () => {
  for (const [start, input, bound, side] of [
    [street(272, 366), { y: -1 }, 329 * STREET_SCALE + 7, 'above'],
    [street(350, 560), { y: 1 }, 593 * STREET_SCALE - 7, 'below'],
    [street(778, 884), { y: 1 }, 920 * STREET_SCALE - 7, 'below'],
    [street(707, 920), { y: 1 }, 940 * STREET_SCALE - 7, 'below'],
    [street(868, 879), { y: 1 }, 900 * STREET_SCALE - 7, 'below'],
  ]) {
    const model = new ExplorationWorld({ place: 'neighborhood', position: start });
    model.setInput(input);
    for (let index = 0; index < 4; index++) {
      model.update(60);
      assert.ok(canStand(model.layout, model.state));
      assert.ok(side === 'above' ? model.state.y >= bound : model.state.y <= bound,
        'Held movement must stop on the near side of the obstacle');
    }
    assert.equal(model.state.moving, false, 'Blocked walking must settle into an idle pose');
  }
});

test('the east construction barrier remains closed while the west reaches the delivery street entrance', () => {
  for (const [x, input, barrierX] of [[95, -1, 55], [1460, 1, 1504]]) {
    const model = new ExplorationWorld({ place: 'neighborhood', position: street(x, 477) });
    model.setInput({ x: input });
    for (let index = 0; index < 3; index++) model.update(30);
    assert.ok(canStand(model.layout, model.state));
    if (input < 0) assert.ok(model.state.x >= barrierX * STREET_SCALE + 14);
    else assert.ok(model.state.x <= barrierX * STREET_SCALE - 14);
    assert.equal(model.state.moving, false);
    if(input<0)assert.equal(model.getNearby()?.id,'to-residential');
  }
});

test('the bed, wardrobe, notebook and exit are reachable by walking around furniture', () => {
  const model = new ExplorationWorld({ place: 'home' });
  walk(model, [{ x: 875, y: 540 }, { x: 950, y: 405 }, { x: 960, y: 330 }]);
  assert.equal(model.getNearby()?.id, 'bed');
  walk(model, [{ x: 870, y: 330 }, { x: 270, y: 330 }, { x: 170, y: 320 }]);
  assert.equal(model.getNearby()?.id, 'wardrobe');
  walk(model, [{ x: 260, y: 350 }, { x: 240, y: 545 }]);
  assert.equal(model.getNearby()?.id, 'notebook');
  walk(model, [{ x: 290, y: 545 }, { x: 640, y: 550 }, { x: 640, y: 645 }]);
  assert.equal(model.getNearby()?.id, 'exit');
});

test('invalid imported positions fall back safely; valid coordinates retain facing', () => {
  for (const place of ['home', 'neighborhood']) {
    const layout = place === 'home' ? HOME_LAYOUT : NEIGHBORHOOD_LAYOUT;
    const furniture = layout.obstacles[0];
    for (const position of [undefined, null, {}, { x: NaN, y: 300 }, { x: 300, y: Infinity },
      { x: -1, y: 300 }, { x: layout.width + 100, y: 400 },
      { x: furniture.x + furniture.width / 2, y: furniture.y + furniture.height / 2 }]) {
      const model = new ExplorationWorld({ place, position });
      assert.deepEqual(model.location(), { scene: place, ...layout.spawn });
      assert.ok(canStand(layout, model.state));
    }
    const location = { x: layout.spawn.x + .25, y: layout.spawn.y + .3, facing: 'left' };
    const model = new ExplorationWorld({ place, position: location });
    assert.equal(model.state.x, location.x);
    assert.equal(model.state.facing, 'left');
    assert.deepEqual(model.location(), { scene: place, x: Math.round(location.x), y: Math.round(location.y), facing: 'left' });
    const invalidFacing = new ExplorationWorld({ place, position: { ...location, facing: 'sideways' } });
    assert.equal(invalidFacing.state.facing, 'down');
  }
});

test('the world extends beyond the fixed camera and preserves the background proportions', () => {
  const image = readFileSync(new URL('../public/assets/world/neighborhood.png', import.meta.url));
  const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
  assert.ok(NEIGHBORHOOD_LAYOUT.width > 1280 && NEIGHBORHOOD_LAYOUT.height > 720);
  assert.equal(NEIGHBORHOOD_LAYOUT.width / width, STREET_SCALE);
  assert.equal(NEIGHBORHOOD_LAYOUT.height / height, STREET_SCALE, 'The map uses one scale for both axes');
  assert.equal(HOME_LAYOUT.width, 1280);
  assert.equal(HOME_LAYOUT.height, 720);
});
