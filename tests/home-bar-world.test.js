import test from 'node:test';
import assert from 'node:assert/strict';
import { HomeBarWorld, HOME_BAR_PLACES, HOME_BAR_LAYOUTS, HOME_ENTRY, HOME_RACE_RETURN, HOME_WAKE,
  ISLAND_BAR_ENTRY, ISLAND_BAR_RETURN, ISLAND_BAR_RETURNS, BAR_BANTER, BAR_BANTER_INTERVAL, homeBarDestination } from '../src/game/HomeBarWorld.js';
import { MarathonWorld, COURSE_POINTS, MARATHON_METRO_ARRIVALS } from '../src/game/MarathonWorld.js';
import { BarStreetWorld, BAR_STREET_ENTRY, BAR_STREET_BAR_RETURN, BAR_STREET_NEIGHBORHOOD_RETURN } from '../src/game/BarStreetWorld.js';
import { CareerProfile } from '../src/game/CareerProfile.js';
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

test('the expanded house and compatible bar interior remain saved places with explicit routes and music', () => {
  for (const place of HOME_BAR_PLACES) {
    assert.ok(WORLD_SCENES.includes(place), place); assert.equal(sceneForPlace(place), 'HomeBarScene');
    assert.equal(musicTrackForPlace(place), place === 'island-bar' ? 'casino' : 'home');
  }
  assert.equal(musicTrackForScene({ sys: { settings: { key: 'RetroRaceScene' } } }), 'home');
  assert.equal(musicTrackForScene({ sys: { settings: { key: 'BilliardsScene' } } }), 'casino');
  assert.ok(WORLD_SCENES.includes('bar-street'));
  assert.equal(sceneForPlace('bar-street'), 'BarStreetScene');
  assert.equal(musicTrackForPlace('bar-street'), 'city');
  assert.equal(sceneForPlace('neighborhood'), 'ExplorationScene');
  assert.equal(sceneForPlace('marathon-island'), 'MarathonScene');
});

test('every room door arrives outside its return threshold at a valid saved position', () => {
  for (const [place, layout] of Object.entries(HOME_BAR_LAYOUTS)) for (const door of layout.doors) {
    const location = homeBarDestination(place, door.id); assert.ok(location, `${place}/${door.id}`);
    const world = location.scene === 'neighborhood' ? new ExplorationWorld({ place: location.scene, position: location })
      : location.scene === 'bar-street' ? new BarStreetWorld({ position: location })
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

test('the bar is reached through the east neighborhood street with safe return thresholds', () => {
  const neighborhood=new ExplorationWorld({place:'neighborhood',position:{x:2150,y:716,facing:'right'}});
  assert.equal(crossing(neighborhood,2290,716),'to-bar-street');
  assert.ok(!neighborhood.layout.obstacles.some(obstacle=>obstacle.id==='chantier-est'));
  const street=new BarStreetWorld(); assert.deepEqual(street.location(),BAR_STREET_ENTRY);
  path(street,[[1450,760],[1450,710]]); assert.equal(crossing(street,1450,630),'bar');
  assert.deepEqual(ISLAND_BAR_RETURN,BAR_STREET_BAR_RETURN);
  const outside=new BarStreetWorld({position:homeBarDestination('island-bar','exit')});
  assert.deepEqual(outside.location(),BAR_STREET_BAR_RETURN);
  const latch=new DoorTravel(outside.layout.doors,outside.state);
  assert.equal(latch.update(outside.state,{x:0,y:0}),null);
  path(outside,[[1450,760],[110,760]]); assert.equal(crossing(outside,40,760),'neighborhood');
  const returned=new ExplorationWorld({place:'neighborhood',position:BAR_STREET_NEIGHBORHOOD_RETURN});
  assert.deepEqual(returned.location(),BAR_STREET_NEIGHBORHOOD_RETURN);
  assert.equal(new DoorTravel(returned.layout.doors,returned.state).update(returned.state,{x:0,y:0}),null);
});

test('the new street keeps full footprints outside facades and rejects invalid imported positions', () => {
  for(const start of [BAR_STREET_ENTRY,BAR_STREET_BAR_RETURN]){
    const street=new BarStreetWorld({position:start});street.setInput({x:0,y:-1});
    for(let i=0;i<240;i++)street.update(1/120);
    assert.ok(canStand(street.layout,street.state));
    assert.ok(street.state.y>= (start===BAR_STREET_ENTRY?510:620)+street.layout.footprint.halfHeight);
    assert.equal(street.state.moving,false);
  }
  for(const position of [{x:1450,y:500},{x:-1,y:760},{x:2900,y:760},{x:100,y:1200}]){
    const street=new BarStreetWorld({position});assert.deepEqual(street.location(),BAR_STREET_ENTRY);
  }
});

test('the old island location is a walkable promenade with no bar facade collider, doorway or interaction', () => {
  const island=new MarathonWorld({position:{x:440,y:800,facing:'up'}});
  assert.deepEqual(island.location(),{scene:'marathon-island',x:440,y:800,facing:'up'});
  for(const group of ['doors','stations','obstacles'])assert.ok(!island.layout[group].some(item=>['bar','island-bar'].includes(item.id)),group);
  path(island,[[440,735]]); assert.ok(!island.getNearby()?.id?.includes('bar'));
  const latch=new DoorTravel(island.layout.doors,island.state);island.setInput({x:0,y:-1});
  for(let i=0;i<120;i++){island.update(1/120);assert.equal(latch.update(island.state,island.input),null);}
  const course = new MarathonWorld({position:{x:960,y:790,facing:'right'}});
  for (const point of COURSE_POINTS['marathon-island']) reach(course,point.x,point.y);
  const west = new MarathonWorld({position:MARATHON_METRO_ARRIVALS['marathon-island']});
  path(west,[[125,1375],[125,1335]]);assert.equal(crossing(west,40,1335),'west-casino');
});

test('an existing version-7 island-bar save preserves both scores and exits toward the new street', () => {
  const before=new CareerProfile({storage:null}); before.setLocation({scene:'island-bar',x:640,y:610,facing:'down'});
  for(const [opponent,winner] of [['beton','player'],['kramer','opponent']]){
    const ticket=before.beginLeisureGame('billiards',opponent);assert.ok(ticket.ok);
    assert.ok(before.recordLeisureResult({id:ticket.id,winner}).ok);
  }
  const raw=before.exportText();assert.equal(JSON.parse(raw).version,7);
  const loaded=new CareerProfile({storage:null});assert.doesNotThrow(()=>loaded.importText(raw));
  for(const [key,value] of Object.entries(before.snapshot()))if(!['revision','updatedAt'].includes(key))assert.deepEqual(loaded.snapshot()[key],value,key);
  const inside=new HomeBarWorld({place:loaded.snapshot().location.scene,position:loaded.snapshot().location});
  assert.equal(crossing(inside,640,675),'exit');
  const location=homeBarDestination('island-bar','exit');assert.equal(location.scene,'bar-street');
  loaded.setLocation(location); const next=new CareerProfile({storage:null});assert.doesNotThrow(()=>next.importText(loaded.exportText()));
  assert.deepEqual(next.snapshot().location,BAR_STREET_BAR_RETURN);
  for(const key of ['leisure','daily','wallet','stats','fights'])assert.deepEqual(next.snapshot()[key],before.snapshot()[key],key);
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
