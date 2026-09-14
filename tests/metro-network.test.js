import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainSession, TRAIN_STOP_SECONDS, TRAIN_TRAVEL_SECONDS } from '../src/game/TrainSession.js';
import { METRO_STATIONS, METRO_STATION_IDS, METRO_PLACES, METRO_EXITS, metroDirection, metroHallLocation, metroPlatformLocation } from '../src/game/MetroNetwork.js';
import { MetroWorld } from '../src/game/MetroWorld.js';
import { DoorTravel } from '../src/game/DoorTravel.js';
import { validLocation } from '../src/game/DayRules.js';
const tick=(session,seconds,dt=1/60)=>{const events=[];for(let elapsed=0;elapsed<seconds-1e-8;elapsed+=dt)events.push(...session.update(Math.min(dt,seconds-elapsed)));return events;};
const walk=(world,vector,seconds)=>{world.setInput(vector);for(let elapsed=0;elapsed<seconds;elapsed+=1/60)world.update(1/60);world.releaseControls();};

test('each station hall has two physically reachable platforms and a separate street exit',()=>{
  for(const station of METRO_STATIONS){
    for(const [x,target] of [[340,'quai-forward'],[940,'quai-backward']]){
      const world=new MetroWorld({place:metroHallLocation(station.id).scene});
      walk(world,{x:Math.sign(x-640),y:0},Math.abs(x-640)/220);
      const doors=new DoorTravel(world.layout.doors,world.state);world.setInput({x:0,y:-1});let triggered=null;
      for(let i=0;i<140&&!triggered;i++){world.update(1/60);triggered=doors.update(world.state,world.input);}
      assert.equal(triggered,target,station.id);
    }
    for(const direction of [-1,1]){
      const place=metroPlatformLocation(station.id,direction);assert.ok(validLocation(place));
      const train=new TrainSession({station:station.id,direction});
      assert.deepEqual(train.resumeLocation(),place,'reload keeps the physical direction of the selected quay');
    }
  }
});

test('five stops connect useful walkable destinations and all save locations are recognized',()=>{
  assert.equal(METRO_STATIONS.length,5);assert.equal(new Set(METRO_STATION_IDS).size,5);
  for(const station of METRO_STATIONS){const exit=METRO_EXITS[station.id];assert.equal(exit.location.scene,station.outside);assert.equal(validLocation(exit.location),true);}
  for(const place of METRO_PLACES){const world=new MetroWorld({place});assert.equal(validLocation(world.location()),true);assert.ok(world.state.y>0);}
  assert.equal(metroDirection('metro-airport',1),-1);assert.equal(metroDirection('metro-station',-1),1);
});

test('the train stops eight seconds, travels four, never ejects its passenger, and reverses at both termini',()=>{
  const session=new TrainSession();assert.equal(session.station.id,'metro-station');assert.ok(session.disembark());
  tick(session,TRAIN_STOP_SECONDS);assert.equal(session.state.phase,'moving');assert.equal(session.disembark(),null);
  const events=tick(session,TRAIN_TRAVEL_SECONDS);assert.equal(events.at(-1).type,'arrive');assert.equal(session.station.id,'metro-riverside');assert.equal(session.state.phase,'stopped');
  for(let index=0;index<3;index++)tick(session,TRAIN_STOP_SECONDS+TRAIN_TRAVEL_SECONDS);
  assert.equal(session.station.id,'metro-airport');assert.equal(session.state.direction,-1);assert.equal(session.nextStation.id,'metro-stadium');
  for(let index=0;index<4;index++)tick(session,TRAIN_STOP_SECONDS+TRAIN_TRAVEL_SECONDS);
  assert.equal(session.station.id,'metro-station');assert.equal(session.state.direction,1);assert.equal(session.state.stops,8);
});

test('pause and stalls never fast-forward a hidden trip and last reached platform is a safe reload point',()=>{
  const session=new TrainSession({station:'metro-island',direction:-1});tick(session,9);
  assert.equal(session.state.phase,'moving');const before=session.snapshot();session.pause();session.update(1000);assert.deepEqual(session.snapshot(),{...before,paused:true});
  session.resume();session.update(1000);assert.ok(Math.abs(session.state.elapsed-2)<1e-8,'stall is capped to one second');
  assert.equal(session.resumeLocation().scene,'metro-island-return');tick(session,2);assert.equal(session.resumeLocation().scene,'metro-riverside-return');
  const world=new MetroWorld({place:session.resumeLocation().scene,position:session.resumeLocation()});assert.deepEqual(world.location(),session.resumeLocation());
  const doors=new DoorTravel(world.layout.doors,world.state);assert.equal(doors.update(world.state,{x:0,y:0}),null);
});

test('walking enters the platform train, closed carriage doors block exit, and opening them permits a deliberate walk out',()=>{
  const platform=new MetroWorld({place:'metro-station'}),entry=new DoorTravel(platform.layout.doors,platform.state);let triggered=null;
  platform.setInput({x:0,y:-1});for(let i=0;i<80&&!triggered;i++){platform.update(1/60);triggered=entry.update(platform.state,platform.input);}assert.equal(triggered,'train');
  const train=new MetroWorld({place:'metro-train'}),doors=new DoorTravel(train.layout.doors,train.state);train.setDoorsOpen(false);walk(train,{x:0,y:-1},3);
  assert.ok(train.state.y>=395);assert.equal(doors.update(train.state,{x:0,y:-1}),null);
  train.setDoorsOpen(true);train.setInput({x:0,y:-1});triggered=null;for(let i=0;i<50&&!triggered;i++){train.update(1/60);triggered=doors.update(train.state,train.input);}assert.equal(triggered,'train-exit');
});

test('both boarding gates, booking counter and metro exit are reachable around airport furniture with no bad spawn in the stairs',()=>{
  const airport=new MetroWorld({place:'airport',position:{x:640,y:570,facing:'down'}});assert.equal(airport.state.y,435,'old arrival inside the stairs returns to the safe landing');
  walk(airport,{x:0,y:-1},.42);assert.equal(airport.getNearby()?.id,'travel-counter');
  for(const [x,gate]of [[320,'board-cuba'],[966,'board-mexico']]){
    airport.restorePosition({x:640,y:435,facing:'up'});walk(airport,{x:Math.sign(x-640),y:0},Math.abs(x-640)/215);
    const travel=new DoorTravel(airport.layout.doors,airport.state);airport.setInput({x:0,y:-1});let trigger=null;
    for(let i=0;i<100&&!trigger;i++){airport.update(1/60);trigger=travel.update(airport.state,airport.input);}assert.equal(trigger,gate);
  }
  airport.restorePosition({x:640,y:435,facing:'down'});const travel=new DoorTravel(airport.layout.doors,airport.state);airport.setInput({x:0,y:1});let trigger=null;
  for(let i=0;i<60&&!trigger;i++){airport.update(1/60);trigger=travel.update(airport.state,airport.input);}assert.equal(trigger,'airport-metro');
});
