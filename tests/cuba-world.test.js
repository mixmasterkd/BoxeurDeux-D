import test from 'node:test';
import assert from 'node:assert/strict';
import {CubaWorld,CUBA_LAYOUTS,CUBA_FIGHT_RETURN,CUBA_ACTIVITY_RETURNS,cubaDoorDestination} from '../src/game/CubaWorld.js';
import {DoorTravel} from '../src/game/DoorTravel.js';

function move(world,axis,value,{door=false}={}){
  const travel=new DoorTravel(world.layout.doors,world.state);
  for(let tick=0;tick<2000;tick++){
    const difference=value-world.state[axis];if(Math.abs(difference)<3){world.releaseControls();return null;}
    world.setInput(axis==='x'?{x:Math.sign(difference),y:0}:{x:0,y:Math.sign(difference)});
    world.update(1/120);
    if(door){const crossed=travel.update(world.state,world.input);if(crossed){world.releaseControls();return crossed;}}
  }
  assert.fail(`Unreachable ${world.place} ${axis}=${value} from ${JSON.stringify(world.state)}`);
}

test('Cuba interiors and two scrolling maps retain one camera frame and human-sized players',()=>{
  for(const name of ['cuba-village','cuba-beach']){
    const layout=CUBA_LAYOUTS[name];assert.ok(layout.width>1280&&layout.height>720);assert.equal(layout.actorScale,1.5);
  }
  for(const name of ['cuba-home','cuba-gym'])assert.deepEqual([CUBA_LAYOUTS[name].width,CUBA_LAYOUTS[name].height],[1280,720]);
  assert.equal(CUBA_LAYOUTS['cuba-home'].actorScale,2);
  const world=new CubaWorld();world.layout.obstacles.length=0;
  assert.ok(new CubaWorld().layout.obstacles.length,'Scene changes cannot mutate the next visit’s furniture');
});

test('home bed and exit are reachable, with no arrival or reload bounce',()=>{
  const home=new CubaWorld();move(home,'x',838);move(home,'y',380);assert.equal(home.getNearby().id,'bed');
  move(home,'y',540);move(home,'x',640);assert.equal(move(home,'y',685,{door:true}),'exit');
  const arrival=cubaDoorDestination('cuba-home','exit'),village=new CubaWorld({place:arrival.place,position:arrival.location});
  const travel=new DoorTravel(village.layout.doors,village.state);assert.equal(travel.update(village.state,{x:0,y:0}),null);
  assert.equal(move(village,'y',320,{door:true}),'home');
  const threshold=new CubaWorld({place:'cuba-village',position:{x:430,y:330,facing:'up'}}),loaded=new DoorTravel(threshold.layout.doors,threshold.state);
  assert.equal(loaded.update(threshold.state,{x:0,y:-1}),null);
  move(threshold,'y',400);loaded.update(threshold.state,{y:1});move(threshold,'y',330);
  assert.equal(loaded.update(threshold.state,{y:-1},true),null,'Paused threshold never travels');
  assert.equal(loaded.update(threshold.state,{y:-1}),'home','Leaving the threshold rearms it');
});

test('pads, hanging tire bag, rope and gym exit have clear walking approaches',()=>{
  const gym=new CubaWorld({place:'cuba-gym'});
  move(gym,'x',780);move(gym,'y',455);assert.equal(gym.getNearby().id,'pads');
  move(gym,'y',480);move(gym,'x',390);move(gym,'y',300);move(gym,'x',285);assert.equal(gym.getNearby().id,'bag');
  move(gym,'y',525);move(gym,'x',225);assert.equal(gym.getNearby().id,'rope');
  move(gym,'x',640);assert.equal(move(gym,'y',686,{door:true}),'exit');
  for(const [id,location]of Object.entries(CUBA_ACTIVITY_RETURNS)){
    const resumed=new CubaWorld({place:location.scene,position:location});assert.equal(resumed.getNearby().id,id);
    assert.equal(new DoorTravel(resumed.layout.doors,resumed.state).update(resumed.state,{y:1}),null);
  }
});

test('village has an accessible paid-return kiosk and a free walking passage to the beach',()=>{
  const village=new CubaWorld({place:'cuba-village'});
  move(village,'y',520);move(village,'x',700);move(village,'y',890);move(village,'x',429);
  assert.equal(village.getNearby().id,'flight');
  move(village,'x',700);move(village,'y',520);assert.equal(move(village,'x',1885,{door:true}),'beach');
  const arrival=cubaDoorDestination('cuba-village','beach');assert.equal(arrival.place,'cuba-beach');
  const beach=new CubaWorld({place:arrival.place,position:arrival.location});assert.equal(beach.state.x,arrival.location.x);
});

test('the beach requires a real walk around the ring furniture and returns outside its steps',()=>{
  const beach=new CubaWorld({place:'cuba-beach'});
  move(beach,'x',700);move(beach,'y',790);move(beach,'x',1390);assert.equal(move(beach,'y',720,{door:true}),'fight');
  const returned=new CubaWorld({place:CUBA_FIGHT_RETURN.scene,position:CUBA_FIGHT_RETURN});
  assert.deepEqual(returned.location(),CUBA_FIGHT_RETURN);
  const travel=new DoorTravel(returned.layout.doors,returned.state);assert.equal(travel.update(returned.state,{x:0,y:0}),null);
  move(returned,'x',700);move(returned,'y',525);assert.equal(move(returned,'x',55,{door:true}),'village');
  const exit=cubaDoorDestination('cuba-beach','village');assert.equal(exit.place,'cuba-village');
  assert.equal(new CubaWorld({place:exit.place,position:exit.location}).state.x,exit.location.x);
});

test('malformed or furniture-overlapping restored coordinates fall back to each scene’s safe spawn',()=>{
  for(const place of Object.keys(CUBA_LAYOUTS)){
    const world=new CubaWorld({place,position:{x:-999,y:50000,facing:'sideways'}});
    assert.equal(world.state.x,CUBA_LAYOUTS[place].spawn.x);assert.equal(world.state.y,CUBA_LAYOUTS[place].spawn.y);
  }
  const home=new CubaWorld({place:'cuba-home',position:{x:960,y:310,facing:'up'}});assert.equal(home.state.x,640);
});
