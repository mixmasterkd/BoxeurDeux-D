import test from 'node:test';
import assert from 'node:assert/strict';
import { startAt } from '../src/game/SceneRouting.js';
import { BAR_STREET_ENTRY, BAR_STREET_NEIGHBORHOOD_RETURN } from '../src/game/BarStreetWorld.js';
import { ISLAND_BAR_ENTRY, ISLAND_BAR_RETURN } from '../src/game/HomeBarWorld.js';

test('a completed delivery keeps its return bicycle during the bar detour', () => {
  const arrivals = [[BAR_STREET_ENTRY, 'BarStreetScene'], [ISLAND_BAR_ENTRY, 'HomeBarScene'],
    [ISLAND_BAR_RETURN, 'BarStreetScene'], [BAR_STREET_NEIGHBORHOOD_RETURN, 'ExplorationScene']];
  let returningBike = true;
  for (const [location, sceneKey] of arrivals) {
    let transition;
    startAt({ returningBike, scene: { start: (key, data) => { transition = { key, data }; } } }, location);
    assert.equal(transition.key, sceneKey);
    assert.equal(transition.data.place, location.scene);
    assert.deepEqual(transition.data.location, location);
    assert.equal(transition.data.returningBike, true);
    returningBike = transition.data.returningBike;
  }
  let walkingArrival;
  startAt({ scene: { start: (_key, data) => { walkingArrival = data; } } }, BAR_STREET_ENTRY);
  assert.equal(walkingArrival.returningBike, false, 'a walking visit does not create a bicycle');
});
