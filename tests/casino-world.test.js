import test from 'node:test';
import assert from 'node:assert/strict';
import {CasinoWorld,CASINO_PLACES,CASINO_LAYOUTS,CASINO_ENTRANCE,casinoFloorDestination,karlGreeting,casinoPoint} from '../src/game/CasinoWorld.js';
import {MarathonWorld,MARATHON_METRO_ARRIVALS} from '../src/game/MarathonWorld.js';
import {CASINO_MAIN_ISLAND_RETURN} from '../src/game/CasinoIslandWorld.js';
import {DoorTravel} from '../src/game/DoorTravel.js';
import {sceneForPlace} from '../src/game/SceneRouting.js';

function reach(world,x,y,travel) {
  for(let tick=0;tick<2000;tick++) {
    const dx=x-world.state.x,dy=y-world.state.y,d=Math.hypot(dx,dy);
    if(d<3){world.releaseControls();return null;}
    world.setInput({x:dx/d,y:dy/d});world.update(1/120);
    const door=travel?.update(world.state,world.input);
    if(door){world.releaseControls();return door;}
  }
  assert.fail(`Blocked ${world.place} at ${world.state.x},${world.state.y} towards ${x},${y}`);
}
const path=(world,points)=>points.forEach(([x,y])=>reach(world,x,y));
const artPath=(world,points)=>points.forEach(([x,y])=>{const p=casinoPoint(x,y);reach(world,p.x,p.y);});

test('the island metro reaches the west passage while the old casino frontage is clear',()=>{
  const island=new MarathonWorld({position:MARATHON_METRO_ARRIVALS['marathon-island']});
  path(island,[[125,1375],[125,1335]]);
  const travel=new DoorTravel(island.layout.doors,island.state);
  assert.equal(reach(island,40,1335,travel),'west-casino');
  assert.deepEqual(new MarathonWorld({position:CASINO_MAIN_ISLAND_RETURN}).location(),CASINO_MAIN_ISLAND_RETURN);
  const returned=new MarathonWorld({position:CASINO_MAIN_ISLAND_RETURN});
  assert.equal(new DoorTravel(returned.layout.doors,returned.state).update(returned.state,{x:0,y:0}),null);
  assert.ok(!island.layout.stations.some(station=>station.id==='casino'));
  assert.ok(!island.layout.obstacles.some(obstacle=>obstacle.id.startsWith('casino-')));
});

test('all four machine models, cashier, reception, lift and exit have clear walking approaches',()=>{
  const world=new CasinoWorld();assert.deepEqual(world.location(),CASINO_ENTRANCE);
  artPath(world,[[835,720]]);
  for(const [id,x]of [['cerises',360],['cloches',442],['diamants',800],['montreal',880],['cerises-east',1230],['cloches-east',1310]]){
    const artX=world.state.x*1672/2880;artPath(world,[[artX,660],[x,660],[x,584]]);
    assert.equal(world.getNearby().id,`slots-${id}`);
  }
  artPath(world,[[1310,660],[1040,660],[1040,300],[1230,285]]);assert.equal(world.getNearby().id,'cashier');
  artPath(world,[[1040,300],[837,300],[837,266]]);assert.equal(world.getNearby().id,'lift');
  artPath(world,[[837,300],[630,300],[435,285]]);assert.equal(world.getNearby().id,'reception');
  artPath(world,[[630,300],[630,690],[835,690],[835,875]]);
  const doors=new DoorTravel(world.layout.doors,world.state),end=casinoPoint(835,919);assert.equal(reach(world,end.x,end.y,doors),'exit');
});

test('Karl, roulette and the future gala entrances remain accessible around solid tables',()=>{
  const world=new CasinoWorld({place:'casino-tables'});
  artPath(world,[[837,655],[560,655],[560,590]]);assert.equal(world.getNearby().id,'blackjack');
  world.setInput({x:0,y:-1});world.update(1);assert.ok(world.state.y>=casinoPoint(560,568).y+8,'cannot walk through the blackjack table');
  artPath(world,[[560,655],[1220,655],[1220,587]]);assert.equal(world.getNearby().id,'roulette');
  artPath(world,[[1220,655],[837,655],[837,330],[233,330],[233,292]]);assert.equal(world.getNearby().id,'gala');
  artPath(world,[[233,330],[1436,330],[1436,292]]);assert.equal(world.getNearby().id,'future');
});

test('poker table, players and reserved salons have distinct walkable approaches',()=>{
  const world=new CasinoWorld({place:'casino-poker'});
  artPath(world,[[1200,312],[1200,705],[837,705],[837,665]]);assert.equal(world.getNearby().id,'poker');
  world.setInput({x:0,y:-1});world.update(1);assert.ok(world.state.y>=casinoPoint(837,632).y+8,'cannot enter the poker table');
  artPath(world,[[837,705],[440,705],[440,480]]);assert.equal(world.getNearby().id,'profiles');
  artPath(world,[[220,480],[220,330],[139,330],[139,290]]);assert.equal(world.getNearby().id,'vip');
});

test('floor routing restores safe lift positions, validates saved positions and uses independent colliders',()=>{
  for(const place of CASINO_PLACES) {
    const destination=casinoFloorDestination(place);
    assert.equal(sceneForPlace(place),'CasinoScene');
    assert.deepEqual(new CasinoWorld({place,position:destination}).location(),destination);
    assert.ok(CASINO_LAYOUTS[place].width>1280&&CASINO_LAYOUTS[place].height>720);
  }
  assert.equal(casinoFloorDestination('home'),null);
  const invalid=new CasinoWorld({place:'casino-poker',position:{x:1440,y:1000,facing:'up'}});
  assert.equal(invalid.state.y,CASINO_LAYOUTS['casino-poker'].spawn.y);
  const first=new CasinoWorld();first.layout.obstacles.length=0;assert.ok(new CasinoWorld().layout.obstacles.length);
});

test('Karl recognizes progression without requiring a bronze gold medal',()=>{
  assert.match(karlGreeting({}),/Gants de bronze/);
  assert.match(karlGreeting({fights:{louisto:{wins:1}}}),/Cuba/);
  assert.match(karlGreeting({fights:{danielo:{wins:1}}}),/Mexique/);
  assert.match(karlGreeting({tournament:{medals:[{tier:'gold',type:'participation'}]}}),/Gants dorés/);
});
