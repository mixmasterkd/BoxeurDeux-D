import test from 'node:test';
import assert from 'node:assert/strict';
import {MexicoWorld,MEXICO_LAYOUTS,MEXICO_FIGHT_RETURN,MEXICO_SPAR_RETURN,MEXICO_PADS_RETURN,mexicoDoorDestination} from '../src/game/MexicoWorld.js';
import {HotelWorld} from '../src/game/HotelWorld.js';
import {hotelBoard} from '../src/game/HotelBoard.js';
import {DoorTravel} from '../src/game/DoorTravel.js';
function move(world,axis,value,door=false){
  const travel=new DoorTravel(world.layout.doors,world.state);
  for(let tick=0;tick<2000;tick++){
    const d=value-world.state[axis];if(Math.abs(d)<3){world.releaseControls();return null;}
    world.setInput(axis==='x'?{x:Math.sign(d),y:0}:{x:0,y:Math.sign(d)});world.update(1/120);
    if(door){const crossed=travel.update(world.state,world.input);if(crossed){world.releaseControls();return crossed;}}
  }
  assert.fail(`Unreachable ${world.place} ${axis}=${value}: ${JSON.stringify(world.location())}`);
}
test('Mexican posada bed and exit are approachable without walking through the furniture',()=>{
  const home=new MexicoWorld();move(home,'x',825);move(home,'y',375);assert.equal(home.getNearby().id,'bed');
  move(home,'y',550);move(home,'x',640);assert.equal(move(home,'y',690,true),'exit');
  const arrival=mexicoDoorDestination('mexico-home','exit');const village=new MexicoWorld({place:arrival.place,position:arrival.location});
  assert.equal(new DoorTravel(village.layout.doors,village.state).update(village.state,{y:0,x:0}),null);
  assert.equal(move(village,'y',365,true),'home');
});
test('Pablo and The Octopus have clear approaches; both return locations remain outside obstacles',()=>{
  const gym=new MexicoWorld({place:'mexico-gym'});
  move(gym,'x',430);move(gym,'y',515);assert.equal(gym.getNearby().id,'pads');
  move(gym,'y',615);move(gym,'x',1040);assert.equal(gym.getNearby().id,'pablo');
  for(const location of [MEXICO_PADS_RETURN,MEXICO_SPAR_RETURN])assert.deepEqual(new MexicoWorld({place:location.scene,position:location}).location(),location);
  move(gym,'x',640);assert.equal(move(gym,'y',690,true),'exit');
});
test('Mexican trip continues by walking village → promenade → arena and back',()=>{
  const village=new MexicoWorld({place:'mexico-village'});move(village,'y',550);move(village,'x',700);move(village,'y',885);move(village,'x',390);assert.equal(village.getNearby().id,'flight');
  move(village,'x',700);move(village,'y',550);assert.equal(move(village,'x',1885,true),'beach');
  const beach=new MexicoWorld({place:'mexico-beach'});move(beach,'x',1366);assert.equal(move(beach,'y',470,true),'arena');
  const arena=new MexicoWorld({place:'mexico-arena'});assert.equal(move(arena,'y',645,true),'fight');
  const returned=new MexicoWorld({place:MEXICO_FIGHT_RETURN.scene,position:MEXICO_FIGHT_RETURN});assert.deepEqual(returned.location(),MEXICO_FIGHT_RETURN);
  assert.equal(new DoorTravel(returned.layout.doors,returned.state).update(returned.state,{y:-1}),null);
  assert.equal(move(returned,'y',1050,true),'exit');
  assert.equal(mexicoDoorDestination('mexico-arena','exit').place,'mexico-beach');
});
test('Mexico keeps proportional interiors, scrollable outdoor maps and independent colliders',()=>{
  for(const place of ['mexico-village','mexico-beach','mexico-arena'])assert.ok(MEXICO_LAYOUTS[place].width>1280&&MEXICO_LAYOUTS[place].height>720);
  for(const place of ['mexico-home','mexico-gym'])assert.deepEqual([MEXICO_LAYOUTS[place].width,MEXICO_LAYOUTS[place].height],[1280,720]);
  const first=new MexicoWorld();first.layout.obstacles.length=0;assert.ok(new MexicoWorld().layout.obstacles.length);
});
test('Gold hotel restaurant is a walk-through door without altering the bronze reception',()=>{
  const bronze=new HotelWorld({place:'hotel-lobby'}),gold=new HotelWorld({place:'hotel-lobby',tier:'gold'});
  assert.ok(!bronze.layout.doors.some(d=>d.id==='restaurant-door'));assert.equal(bronze.layout.obstacles.find(o=>o.id==='reception').width,570);
  move(gold,'y',450);move(gold,'x',728);assert.equal(move(gold,'y',320,true),'restaurant-door');
  const restaurant=new HotelWorld({place:'hotel-restaurant',tier:'gold'});
  move(restaurant,'y',550);move(restaurant,'x',480);move(restaurant,'y',340);assert.equal(restaurant.getNearby().id,'bread');
  move(restaurant,'x',735);assert.equal(restaurant.getNearby().id,'toast');move(restaurant,'x',607);assert.equal(restaurant.getNearby().id,'spread');
  move(restaurant,'y',560);move(restaurant,'x',640);assert.equal(move(restaurant,'y',674,true),'exit');
});
test('Gold bracket uses its own participants and reveals results only after each day',()=>{
  const status={tier:'gold',opponents:['gold-rios','gold-moreau','gold-santos'],active:{tier:'gold',day:1,results:[]},participants:[]};
  let board=hotelBoard(status);assert.match(board,/Rafael Ríos/);assert.match(board,/Émile Moreau/);assert.match(board,/Thiago Santos/);assert.ok(!/Bellini|Fortin|Gagnon/.test(board));assert.ok(!board.includes('✓'));
  status.active.results=[{day:1,winner:'player'}];board=hotelBoard(status);assert.match(board,/Toi ✓ — Rafael Ríos/);assert.match(board,/Toi — Émile Moreau · à venir/);
});
