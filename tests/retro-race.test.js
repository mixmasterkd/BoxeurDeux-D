import test from 'node:test';
import assert from 'node:assert/strict';
import {RetroRaceSession,RACE_STEP,RACE_GATES,RACE_LAPS,RACE_TRACK,RACE_OBSTACLES,racePointAt,raceNearestPoint,raceDriverInput} from '../src/game/RetroRaceSession.js';
const clone=value=>JSON.parse(JSON.stringify(value));
function runRace(pilot){const race=new RetroRaceSession();race.start();for(let i=0;i<120*120&&race.state.phase!=='finished';i++){race.setInput(pilot?.(race.state.player)??{});race.update(RACE_STEP);}return race;}
function crossGate(race,index,{reverse=false,offset=0}={}){
  const c=race.state.player,g=RACE_GATES[index],tx=Math.cos(g.angle),ty=Math.sin(g.angle),dir=reverse?-1:1;
  const previous={x:g.x-tx*3*dir-ty*offset,y:g.y-ty*3*dir+tx*offset};
  c.x=g.x+tx*3*dir-ty*offset;c.y=g.y+ty*3*dir+tx*offset;
  race.progress(c,previous);
}
test('race begins only on confirmation and holds the cars for its complete countdown',()=>{
  const race=new RetroRaceSession(),initial=clone(race.state);race.update(20);assert.deepEqual(race.state,initial);
  assert.equal(race.start(),true);assert.equal(race.start(),false);race.setInput({throttle:1});race.update(2.9);
  assert.equal(race.state.phase,'countdown');assert.equal(race.state.player.x,initial.player.x);assert.equal(race.state.elapsed,0);
  race.update(.1);assert.equal(race.state.phase,'running');race.update(.5);assert.ok(race.state.player.speed>60);
});
test('identical inputs and elapsed time give the same simulation at 30 and 120 fps',()=>{
  const a=new RetroRaceSession(),b=new RetroRaceSession();a.start();b.start();
  a.setInput({throttle:1,steer:.15});b.setInput({throttle:1,steer:.15});
  for(let i=0;i<600;i++)a.update(1/30);for(let i=0;i<2400;i++)b.update(1/120);
  assert.deepEqual(a.state,b.state);
});
for(const during of ['countdown','running'])test(`pause during ${during} releases inputs and freezes the exact timer and geometry`,()=>{
  const race=new RetroRaceSession();race.start();if(during==='running')race.update(4);
  race.setInput({throttle:1,steer:1});assert.equal(race.pause(),true);const paused=clone(race.state);race.update(9);
  assert.deepEqual(race.state,paused);assert.deepEqual(race.input,{steer:0,throttle:0,brake:0});
  assert.equal(race.resume(),true);assert.equal(race.state.phase,during);assert.equal(race.resume(),false);
});
test('Karl finishes three physical laps if the player stays still; no timeout awards a fake victory',()=>{
  const race=runRace();assert.equal(race.state.phase,'finished');assert.equal(race.state.summary.winner,'opponent');
  assert.equal(race.state.opponent.checkpoints,48);assert.equal(race.state.player.lap,0);assert.ok(race.state.summary.timeMs>35000&&race.state.summary.timeMs<60000);
});
test('the player can beat Karl through all 48 ordered gates using the same driving physics',()=>{
  const race=runRace(c=>raceDriverInput(c,{pace:220}));assert.equal(race.state.summary.winner,'player');assert.equal(race.state.player.lap,RACE_LAPS);
  assert.equal(race.state.player.checkpoints,48);assert.ok(race.state.summary.playerTimeMs>30000);
  const finished=clone(race.state);race.update(10);assert.deepEqual(race.state,finished);
  assert.equal(race.drainEvents().filter(e=>e.type==='finish').length,1);assert.deepEqual(race.drainEvents(),[]);
});
test('a second deterministic run reproduces the winner and finish timestamp exactly',()=>{
  assert.deepEqual(runRace(c=>raceDriverInput(c,{pace:215})).state,runRace(c=>raceDriverInput(c,{pace:215})).state);
});
test('skipping intermediate checkpoints or crossing the finish repeatedly never gives a lap',()=>{
  const race=new RetroRaceSession();race.start();race.update(3);
  for(let i=0;i<20;i++)crossGate(race,0);assert.equal(race.state.player.checkpoints,0);assert.equal(race.state.player.lap,0);
  crossGate(race,2);assert.equal(race.state.player.nextCheckpoint,1);crossGate(race,1);assert.equal(race.state.player.nextCheckpoint,2);
  crossGate(race,0);assert.equal(race.state.player.lap,0);
});
test('backward and grass-side checkpoint crossings are rejected',()=>{
  const race=new RetroRaceSession();crossGate(race,1,{reverse:true});crossGate(race,1,{offset:90});
  assert.equal(race.state.player.nextCheckpoint,1);assert.equal(race.state.player.checkpoints,0);
  crossGate(race,1);assert.equal(race.state.player.checkpoints,1);
});
test('a lap requires all sixteen gates and the forward finish crossing',()=>{
  const race=new RetroRaceSession();for(let i=1;i<16;i++)crossGate(race,i);assert.equal(race.state.player.lap,0);
  crossGate(race,0,{reverse:true});assert.equal(race.state.player.lap,0);crossGate(race,0);assert.equal(race.state.player.lap,1);assert.equal(race.state.player.nextCheckpoint,1);
});
test('grass slows the car, brakes stop it and then allow reversing out of trouble',()=>{
  const race=new RetroRaceSession(),c=race.state.player;c.x=950;c.y=650;c.speed=220;
  race.moveCar(c,{steer:0,throttle:1,brake:0},252);assert.equal(c.offroad,true);assert.ok(c.speed<=78);
  const p=racePointAt(0);Object.assign(c,p,{speed:70});
  for(let i=0;i<90;i++)race.moveCar(c,{steer:0,throttle:0,brake:1},252);
  assert.ok(c.speed<0);assert.ok(c.speed>=-60);
});
test('car collisions separate the bodies and reduce speed without awarding progress',()=>{
  const race=new RetroRaceSession(),a=race.state.player,b=race.state.opponent;
  Object.assign(a,{x:300,y:400,speed:150});Object.assign(b,{x:310,y:400,speed:180});race.collideCars();
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=28-1e-8);assert.ok(a.speed<150&&b.speed<180);assert.equal(a.lap,0);
});
test('trees and outer barriers have actual collision geometry',()=>{
  const race=new RetroRaceSession(),c=race.state.player,o=RACE_OBSTACLES[0];Object.assign(c,{x:o.x,y:o.y,speed:150});
  race.moveCar(c,{steer:0,throttle:0,brake:0},252);assert.ok(Math.hypot(c.x-o.x,c.y-o.y)>=o.radius+13-1e-8);
  Object.assign(c,{x:1279,y:700,speed:150});race.moveCar(c,{steer:0,throttle:0,brake:0},252);assert.ok(c.x<=1240&&c.y<=668);
});
test('reverse driving is identified and invalid time/input never corrupts the state',()=>{
  const race=new RetroRaceSession();race.start();race.update(3);const c=race.state.player;c.angle+=Math.PI;c.speed=80;
  race.moveCar(c,{steer:0,throttle:0,brake:0},252);assert.equal(c.wrongWay,true);
  const before=clone(race.state);for(const dt of [NaN,Infinity,-1,0])race.update(dt);assert.deepEqual(race.state,before);
  race.setInput({throttle:Infinity,brake:-100,steer:NaN});assert.deepEqual(race.input,{steer:0,throttle:1,brake:0});
});
test('track samples, progress and redraw coordinates use the same closed loop',()=>{
  assert.ok(RACE_TRACK.length>2200);assert.deepEqual(racePointAt(0),racePointAt(RACE_TRACK.length));
  for(const point of RACE_GATES)assert.ok(raceNearestPoint(point.x,point.y).offset<1e-8);
});
test('a rematch returns the session to an unscored invitation with no stale input',()=>{
  const race=runRace();race.reset();assert.equal(race.state.phase,'ready');assert.equal(race.state.summary,null);assert.equal(race.state.player.lap,0);assert.equal(race.state.elapsed,0);assert.deepEqual(race.drainEvents(),[]);
});
test('steering changes heading only while moving and reverses naturally when backing up',()=>{
  const race=new RetroRaceSession(),c=race.state.player,angle=c.angle;
  race.moveCar(c,{steer:1,throttle:0,brake:0},252);assert.ok(Math.abs(c.angle-angle)<1e-12);
  c.speed=120;race.moveCar(c,{steer:1,throttle:0,brake:0},252);assert.ok(c.angle>angle);
  const forward=c.angle;c.speed=-45;race.moveCar(c,{steer:1,throttle:0,brake:0},252);assert.ok(c.angle<forward);
});
