import test from 'node:test';
import assert from 'node:assert/strict';
import { HomeBarWorld, HOME_BAR_PLACES, HOME_BAR_LAYOUTS, HOME_ENTRY, HOME_RACE_RETURN, HOME_WAKE,
  ISLAND_BAR_ENTRY, ISLAND_BAR_RETURN, ISLAND_BAR_RETURNS, BAR_BANTER, BAR_BANTER_INTERVAL, homeBarDestination } from '../src/game/HomeBarWorld.js';
import { MarathonWorld, COURSE_POINTS, MARATHON_METRO_ARRIVALS } from '../src/game/MarathonWorld.js';
import { ExplorationWorld, canStand } from '../src/game/ExplorationWorld.js';
import { DoorTravel } from '../src/game/DoorTravel.js';
import { WORLD_SCENES } from '../src/game/DayRules.js';
import { sceneForPlace } from '../src/game/SceneRouting.js';
import { musicTrackForPlace, musicTrackForScene } from '../src/audio/MusicPlaces.js';

function reach(world, x, y, doors) {
  for (let tick = 0; tick < 1800; tick++) {
    const dx = x - world.state.x, dy = y - world.state.y, distance = Math.hypot(dx, dy);
    if (distance < 3) { world.releaseControls(); return null; }
    world.setInput({ x: dx / distance, y: dy / distance }); world.update(1 / 120);
    const door = doors?.update(world.state, world.input);
    if (door) { world.releaseControls(); return door; }
  }
  assert.fail(`${world.place} blocked at ${world.state.x},${world.state.y} toward ${x},${y}`);
}
const path = (world, points) => points.forEach(([x, y]) => reach(world, x, y));
const crossing = (world, x, y) => reach(world, x, y, new DoorTravel(world.layout.doors, world.state));

test('the expanded house and island bar are saved places with explicit routes and existing music', () => {
  for (const place of HOME_BAR_PLACES) {
    assert.ok(WORLD_SCENES.includes(place), place); assert.equal(sceneForPlace(place), 'HomeBarScene');
    assert.equal(musicTrackForPlace(place), place === 'island-bar' ? 'casino' : 'home');
  }
  assert.equal(musicTrackForScene({ sys: { settings: { key: 'RetroRaceScene' } } }), 'home');
  assert.equal(musicTrackForScene({ sys: { settings: { key: 'BilliardsScene' } } }), 'casino');
  assert.equal(sceneForPlace('neighborhood'), 'ExplorationScene');
  assert.equal(sceneForPlace('marathon-island'), 'MarathonScene');
});

test('every room door arrives outside its return threshold at a valid saved position', () => {
  for (const [place, layout] of Object.entries(HOME_BAR_LAYOUTS)) for (const door of layout.doors) {
    const location = homeBarDestination(place, door.id); assert.ok(location, `${place}/${door.id}`);
    const world = location.scene === 'neighborhood' ? new ExplorationWorld({ place: location.scene, position: location })
      : location.scene === 'marathon-island' ? new MarathonWorld({ position: location })
        : new HomeBarWorld({ place: location.scene, position: location });
    assert.deepEqual(world.location(), location, `${place}/${door.id} restores exactly`);
    const latch = new DoorTravel(world.layout.doors, world.state);
    assert.equal(latch.update(world.state, { x: 0, y: 0 }), null, `${place}/${door.id} does not bounce`);
    assert.ok(canStand(world.layout, world.state));
  }
  assert.equal(homeBarDestination('home', 'unknown'), null);
});

test('living room connects physically to the office, garage, stairs and original neighborhood', () => {
  const office = new HomeBarWorld(); path(office, [[350,610],[350,340],[374,290]]);
  assert.equal(crossing(office,374,228),'office');
  const garage = new HomeBarWorld(); path(garage, [[270,610],[270,335],[130,335]]);
  assert.equal(crossing(garage,80,330),'garage');
  const stairs = new HomeBarWorld(); path(stairs, [[980,610],[980,315]]);
  assert.equal(crossing(stairs,980,235),'upstairs');
  const exit = new HomeBarWorld(); assert.equal(crossing(exit,640,675),'exit');
  const karl = new HomeBarWorld(); path(karl, [[770,610],[770,580]]);
  assert.equal(karl.getNearby().id,'karl-xbox');
  assert.deepEqual(new HomeBarWorld({ position: HOME_RACE_RETURN }).location(),HOME_RACE_RETURN);
});

test('the upstairs rooms preserve access to sleep, wardrobe, medals and Karl’s gaming desk', () => {
  for (const [door,x] of [['bedroom',345],['karl-room',940]]) {
    const landing = new HomeBarWorld({place:'home-landing'});path(landing,[[640,470],[x,470],[x,345]]);
    assert.equal(crossing(landing,x,292),door);
  }
  const bedroom = new HomeBarWorld({place:'home-bedroom'});
  path(bedroom,[[510,610],[510,390]]);assert.equal(bedroom.getNearby().id,'bed');
  path(bedroom,[[600,500],[1032,500],[1032,306]]);assert.equal(bedroom.getNearby().id,'wardrobe');
  path(bedroom,[[900,360],[805,276]]);assert.equal(bedroom.getNearby().id,'medals');
  assert.deepEqual(new HomeBarWorld({place:'home-bedroom',position:HOME_WAKE}).location(),HOME_WAKE);
  const karl = new HomeBarWorld({place:'home-karl'});path(karl,[[640,530],[925,530],[925,420]]);
  assert.equal(karl.getNearby().id,'gaming-laptop');
  for (const place of ['home-landing','home-bedroom','home-karl']) {
    const world = new HomeBarWorld({place});assert.equal(crossing(world,640,675),'exit');
  }
});

test('the computer and parked Corolla have clear approaches and solid furniture', () => {
  const office = new HomeBarWorld({place:'home-office'});path(office,[[660,610],[660,324]]);
  assert.equal(office.getNearby().id,'laptop');
  office.setInput({x:0,y:-1});office.update(1);assert.ok(office.state.y>=310);
  const garage = new HomeBarWorld({place:'home-garage'});path(garage,[[800,610],[800,460]]);
  assert.equal(garage.getNearby().id,'corolla');
  assert.ok(garage.layout.obstacles.some(obstacle=>obstacle.id==='corolla'));
  assert.ok(!garage.layout.doors.some(door=>door.id==='drive'),'car is a visitable object, not world transport');
  for (const place of ['home-office','home-garage']) assert.equal(crossing(new HomeBarWorld({place}),640,675),'exit');
});

test('the island bar is reachable from the metro without blocking the casino bridge or marathon course', () => {
  const island = new MarathonWorld({position:MARATHON_METRO_ARRIVALS['marathon-island']});
  path(island,[[660,1375],[660,930],[660,800],[440,800]]);
  assert.equal(crossing(island,440,735),'bar');
  assert.deepEqual(new MarathonWorld({position:ISLAND_BAR_RETURN}).location(),ISLAND_BAR_RETURN);
  const course = new MarathonWorld({position:{x:960,y:790,facing:'right'}});
  for (const point of COURSE_POINTS['marathon-island']) reach(course,point.x,point.y);
  const west = new MarathonWorld({position:MARATHON_METRO_ARRIVALS['marathon-island']});
  path(west,[[125,1375],[125,1335]]);assert.equal(crossing(west,40,1335),'west-casino');
});

test('both opponents and the pool table are reachable; saved returns do not start another game', () => {
  const bar = new HomeBarWorld({place:'island-bar'});assert.deepEqual(bar.location(),ISLAND_BAR_ENTRY);
  path(bar,[[640,530],[440,530],[440,535]]);assert.equal(bar.getNearby().id,'beton');
  path(bar,[[440,530],[1030,530],[1030,520]]);assert.equal(bar.getNearby().id,'kramer');
  path(bar,[[1030,530],[810,530],[810,416]]);assert.equal(bar.getNearby().id,'billiards');
  for (const position of Object.values(ISLAND_BAR_RETURNS)) assert.deepEqual(new HomeBarWorld({place:'island-bar',position}).location(),position);
  path(bar,[[640,500],[640,610]]);assert.equal(crossing(bar,640,675),'exit');
  assert.deepEqual(BAR_BANTER.map(line=>line.text),['Yo tu cé pas chui qui man !','Non TOI tu cé pas chui qui man !']);
  assert.equal(new Set(BAR_BANTER.map(line=>line.speaker)).size,2);assert.ok(BAR_BANTER_INTERVAL>=90_000);
});

test('invalid or old home coordinates fall back safely and layouts are independent', () => {
  const invalid = new HomeBarWorld({position:{x:760,y:350,facing:'left'}});
  assert.deepEqual({x:invalid.state.x,y:invalid.state.y},{x:HOME_ENTRY.x,y:HOME_ENTRY.y});
  const old = new HomeBarWorld({position:{scene:'home',x:640,y:540,facing:'down'}});
  assert.equal(old.place,'home');assert.ok(canStand(old.layout,old.state));
  const first = new HomeBarWorld();first.layout.obstacles.length=0;assert.ok(new HomeBarWorld().layout.obstacles.length>0);
});
