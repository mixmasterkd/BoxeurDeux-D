import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DistrictWorld, DISTRICT_LAYOUTS, DISTRICT_ARRIVALS, DISTRICT_PLACES } from '../src/game/DistrictWorld.js';
import { canStand } from '../src/game/ExplorationWorld.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Use the real controller throughout each trip. Waypoints follow the visible
// sidewalks, depot alley and shop aisles; no collider is disabled or skipped.
function walk(world, points, dt = 1 / 30) {
  for (const [x, y] of points) {
    const target = { x, y };
    assert.ok(canStand(world.layout, target), `Invalid destination in ${world.place}: ${x},${y}`);
    let frames = 0;
    while (distance(world.state, target) > .001) {
      const before = { ...world.state }, remaining = distance(before, target);
      world.setInput({ x: (x - before.x) / remaining, y: (y - before.y) / remaining });
      world.update(Math.min(dt, remaining / world.layout.speed));
      assert.ok(canStand(world.layout, world.state), `Collision crossed in ${world.place} before ${x},${y}`);
      assert.ok(distance(before, world.state) > .00001, `Blocked route in ${world.place} before ${x},${y}`);
      assert.ok(++frames < 4000, 'An ordinary journey must finish');
    }
    world.releaseControls();
  }
}

for (const speed of [230, 360]) test(`the residential loop links all three delivery doors, depot and both district exits at speed ${speed}`, () => {
  for (const dt of [1 / 60, 1 / 20]) {
    const world = new DistrictWorld({ place: 'residential' });
    world.layout.speed = speed;
    assert.equal(world.getNearby()?.id, 'return-neighborhood');
    walk(world, [[2265, 680], [1942.5, 680], [1942.5, 490]], dt);
    assert.equal(world.getNearby()?.id, 'maison-36');
    walk(world, [[1189.5, 490]], dt); assert.equal(world.getNearby()?.id, 'maison-24');
    walk(world, [[441, 490]], dt); assert.equal(world.getNearby()?.id, 'maison-12');
    walk(world, [[441, 680], [120, 680]], dt); assert.equal(world.getNearby()?.id, 'to-commercial');
    walk(world, [[1500, 680], [1500, 835]], dt);
    assert.equal(world.getNearby()?.id, 'depot');
    walk(world, [[1450,835],[1450,1250],[1182, 1250],[1182,1305]], dt); assert.equal(world.getNearby()?.id, 'works-delivery');
    walk(world, [[1450, 1305], [1450, 835], [1500, 680], [2265, 680]], dt);
    assert.equal(world.getNearby()?.id, 'return-neighborhood');
    assert.ok(world.state.walkTime * speed > 4 * 1280, 'The trip spans several fixed camera widths');
  }
});

test('commercial sidewalks connect both shops, closed fronts, works and the return street', () => {
  const world = new DistrictWorld({ place: 'commercial' });
  assert.equal(world.getNearby()?.id, 'return-residential');
  walk(world, [[2280, 780], [2280, 440], [2070, 440]]);
  assert.equal(world.getNearby()?.id, 'closed-shop');
  for (const [x, id] of [[1522.5, 'boxing-store'], [963, 'clothing-store'], [375, 'closed-cafe']]) {
    walk(world, [[x, 440]]); assert.equal(world.getNearby()?.id, id);
  }
  walk(world, [[120, 440], [120, 780], [1150, 780], [1150, 1030]]);
  assert.equal(world.getNearby()?.id, 'works-commercial');
  walk(world, [[1150, 780], [2265, 780]]); assert.equal(world.getNearby()?.id, 'return-residential');
});

for (const place of ['clothing-shop', 'boxing-shop']) test(`${place} counter and exit can be reached around furniture at full character scale`, () => {
  const world = new DistrictWorld({ place });
  walk(world, [[650, 310]]); assert.equal(world.getNearby()?.id, 'counter');
  walk(world, [[260, 350], [260, 600], [640, 645]]); assert.equal(world.getNearby()?.id, 'shop-exit');
  world.pause(); const paused = world.location();
  world.setInput({ y: -1 }); world.update(10); assert.deepEqual(world.location(), paused);
  world.resume(); world.update(1); assert.deepEqual(world.location(), paused, 'Unpausing discards held movement');
});

test('all saved district arrivals fit the footprint and expose the expected nearby landmark', () => {
  for (const place of DISTRICT_PLACES) assert.ok(canStand(DISTRICT_LAYOUTS[place], DISTRICT_LAYOUTS[place].spawn), `${place} spawn`);
  const expected = {
    residential: { neighborhood: 'return-neighborhood', commercial: 'to-commercial' },
    commercial: { residential: 'return-residential', 'clothing-shop': 'clothing-store', 'boxing-shop': 'boxing-store' },
    'metro-station': {neighborhood:'metro-exit','metro-riverside':'train'},
    'metro-riverside': {riverside:'metro-exit','metro-station':'train'},
    riverside:{'metro-riverside':'to-metro'},
  };
  for (const [place, arrivals] of Object.entries(DISTRICT_ARRIVALS)) for (const [from, arrival] of Object.entries(arrivals)) {
    assert.ok(canStand(DISTRICT_LAYOUTS[place], arrival), `${from} → ${place} arrival`);
    const world = new DistrictWorld({ place, position: arrival });
    assert.deepEqual(world.location(), { scene: place, ...arrival });
    assert.equal(world.getNearby()?.id, expected[place][from]);
  }
  for (const place of DISTRICT_PLACES) {
    const layout = DISTRICT_LAYOUTS[place], obstacle = layout.obstacles[0];
    for (const position of [undefined, { x: -1, y: 400 }, { x: Infinity, y: 400 },
      { x: obstacle.x + obstacle.width / 2, y: obstacle.y + obstacle.height / 2 }]) {
      const world = new DistrictWorld({ place, position });
      assert.deepEqual(world.location(), { scene: place, ...layout.spawn });
    }
  }
});

test('stalled and sustained input cannot cross houses, parked cars, roadworks or either shop counter', () => {
  for (const [place, position, input, limit, direction] of [
    ['residential', { x: 441, y: 490 }, { y: -1 }, 473, 'above'],
    ['residential', { x: 1182, y: 1305 }, { y: 1 }, 1307.5, 'below'],
    ['commercial', { x: 1440, y: 780 }, { y: -1 }, 677, 'above'],
    ['commercial', { x: 1150, y: 1030 }, { y: 1 }, 1057, 'below'],
    ['clothing-shop', { x: 650, y: 310 }, { y: -1 }, 276, 'above'],
    ['boxing-shop', { x: 650, y: 310 }, { y: -1 }, 292, 'above'],
  ]) {
    const world = new DistrictWorld({ place, position });
    if (place === 'residential') world.layout.speed = 360;
    world.setInput(input);
    for (let frame = 0; frame < 5; frame++) {
      world.update(60); assert.ok(canStand(world.layout, world.state));
      assert.ok(direction === 'above' ? world.state.y >= limit : world.state.y <= limit, `${place} blocked footprint`);
    }
    assert.equal(world.state.moving, false, `${place} settles into idle against an obstacle`);
  }
});

test('new neighborhood images use uniform world scaling and both shop interiors retain the fixed frame', () => {
  for (const place of DISTRICT_PLACES) {
    const data = readFileSync(new URL(`../public/assets/world/${place==='metro-riverside'?'metro-station':place}.png`, import.meta.url));
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20), world = DISTRICT_LAYOUTS[place];
    assert.equal(world.width / width, world.height / height, `${place} has no stretched axes`);
    if (place.endsWith('shop')||place.startsWith('metro-')) assert.deepEqual([world.width, world.height], [1280, 720]);
    else assert.ok(world.width > 1280 && world.height > 720);
  }
});
