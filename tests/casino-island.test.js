import test from 'node:test';
import assert from 'node:assert/strict';
import {CasinoIslandWorld,CASINO_ISLAND_SPAWN,CASINO_ISLAND_RETURN,CASINO_MAIN_ISLAND_RETURN} from '../src/game/CasinoIslandWorld.js';
import {MarathonWorld,MARATHON_METRO_ARRIVALS} from '../src/game/MarathonWorld.js';
import {DoorTravel} from '../src/game/DoorTravel.js';
import {sceneForPlace} from '../src/game/SceneRouting.js';

function reach(world,x,y,travel){
 for(let tick=0;tick<2200;tick++){
  const dx=x-world.state.x,dy=y-world.state.y,d=Math.hypot(dx,dy);
  if(d<3){world.releaseControls();return null;}
  world.setInput({x:dx/d,y:dy/d});world.update(1/120);
  const door=travel?.update(world.state,world.input);
  if(door){world.releaseControls();return door;}
 }
 assert.fail(`Blocked ${world.place} at ${world.state.x},${world.state.y} towards ${x},${y}`);
}
const path=(world,points)=>points.forEach(([x,y])=>reach(world,x,y));

test('the metro leads west onto the separate island, across its bridge and into the casino',()=>{
 const park=new MarathonWorld({position:MARATHON_METRO_ARRIVALS['marathon-island']});
 path(park,[[125,1375],[125,1335]]);
 assert.equal(reach(park,40,1335,new DoorTravel(park.layout.doors,park.state)),'west-casino');
 const island=new CasinoIslandWorld({position:CASINO_ISLAND_SPAWN});
 path(island,[[1700,800],[1700,930],[1250,930],[1250,915]]);
 assert.equal(reach(island,1250,825,new DoorTravel(island.layout.doors,island.state)),'casino');
});

test('returning from the lobby reaches the park and the metro without rebounding through either doorway',()=>{
 const island=new CasinoIslandWorld({position:CASINO_ISLAND_RETURN});
 assert.deepEqual(island.location(),CASINO_ISLAND_RETURN);
 const doors=new DoorTravel(island.layout.doors,island.state);
 assert.equal(doors.update(island.state,{x:0,y:0}),null);
 path(island,[[1700,915],[1700,800],[2770,800]]);
 assert.equal(reach(island,2830,800,doors),'bridge');
 const park=new MarathonWorld({position:CASINO_MAIN_ISLAND_RETURN});
 assert.deepEqual(park.location(),CASINO_MAIN_ISLAND_RETURN);
 const parkDoors=new DoorTravel(park.layout.doors,park.state);
 assert.equal(parkDoors.update(park.state,{x:1,y:0}),null);
 path(park,[[125,1375],[428,1375]]);
 assert.equal(reach(park,428,1310,parkDoors),'metro');
});

test('the full footprint stays on the bridge deck and cannot enter water beside the island',()=>{
 const island=new CasinoIslandWorld({position:{x:2500,y:800,facing:'up'}});
 island.setInput({x:0,y:-1});for(let i=0;i<10;i++)island.update(1);
 assert.ok(island.state.y>=765&&island.state.y<773);
 island.setInput({x:0,y:1});for(let i=0;i<10;i++)island.update(1);
 assert.ok(island.state.y<=831&&island.state.y>827);
 assert.ok(island.onPaving(island.state));
 island.restorePosition(CASINO_ISLAND_RETURN);
 path(island,[[690,915],[690,1010]]);
 island.setInput({x:-1,y:0});for(let i=0;i<10;i++)island.update(1);
 assert.ok(island.state.x>600,'the stepped shoreline remains solid');
 assert.ok(island.onPaving(island.state));
});

test('the courtyard wraps around the flared building and permits the rear terrace',()=>{
 const island=new CasinoIslandWorld({position:CASINO_ISLAND_RETURN});
 path(island,[[690,915],[690,625],[790,625],[790,385],[1200,350],[790,350],[790,625],[690,625],[690,915],[1250,915]]);
 assert.ok(island.onPaving(island.state));
 reach(island,1000,915);island.setInput({x:0,y:-1});for(let i=0;i<4;i++)island.update(1);
 assert.ok(island.state.y>=850,'the wide frontage remains an obstacle outside its door');
});

test('water and building saves recover safely; valid bridge saves and explicit exterior routing survive',()=>{
 for(const position of [{x:200,y:800},{x:2000,y:1200},{x:2600,y:500},{x:1250,y:700}]){
  const island=new CasinoIslandWorld({position});
  assert.equal(island.state.x,CASINO_ISLAND_SPAWN.x);assert.equal(island.state.y,CASINO_ISLAND_SPAWN.y);
 }
 const bridge={scene:'casino-island',x:2500,y:800,facing:'left'};
 assert.deepEqual(new CasinoIslandWorld({position:bridge}).location(),bridge);
 assert.equal(sceneForPlace('casino-island'),'CasinoIslandScene');
 for(const place of ['casino-lobby','casino-tables','casino-poker'])assert.equal(sceneForPlace(place),'CasinoScene');
 const first=new CasinoIslandWorld();first.layout.obstacles.length=0;
 assert.ok(new CasinoIslandWorld().layout.obstacles.length);
});
