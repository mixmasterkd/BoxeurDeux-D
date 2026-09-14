import test from 'node:test';
import assert from 'node:assert/strict';
import {MarathonWorld,MARATHON_LAYOUTS,COURSE_POINTS,MARATHON_METRO_ARRIVALS} from '../src/game/MarathonWorld.js';
const reach=(world,target)=>{
 for(let i=0;i<1800;i++){
  const dx=target.x-world.state.x,dy=target.y-world.state.y,d=Math.hypot(dx,dy);
  if(d<8){world.releaseControls();return;}
  world.setInput({x:dx/d,y:dy/d});world.update(1/60);
 }
 assert.fail(`Blocked ${world.place} at ${world.state.x},${world.state.y} towards ${target.x},${target.y}`);
};
test('a runner can follow every bend, park path, bridge and stadium approach using ordinary movement',()=>{
 for(const [place,points]of Object.entries(COURSE_POINTS)){
  const world=new MarathonWorld({place,position:place==='marathon-island'?{x:960,y:790,facing:'up'}:MARATHON_LAYOUTS[place].spawn});
  for(const point of points)reach(world,point);
 }
});
test('metro exits remain walkable outside the race and the island departure can be reached around the pavilion',()=>{
 const island=new MarathonWorld({position:MARATHON_METRO_ARRIVALS['marathon-island']});
 for(const p of [{x:680,y:1375},{x:680,y:850},{x:930,y:820}])reach(island,p);
 assert.equal(island.getNearby().id,'start');
 const stadium=new MarathonWorld({place:'marathon-stadium',position:MARATHON_METRO_ARRIVALS['marathon-stadium']});
 for(const p of [{x:2090,y:1500},{x:2090,y:970},{x:2180,y:545},{x:1490,y:545}])reach(stadium,p);
 assert.ok(stadium.state.y<600,'can approach the stadium instead of remaining on the south road');
});
test('bridge deck collisions keep feet off the rail, piers and water; invalid early test spawn recovers',()=>{
 const world=new MarathonWorld({position:{x:2600,y:745,facing:'right'}});
 world.setInput({x:0,y:1});world.update(1);assert.ok(world.state.y<=814);
 world.setInput({x:0,y:-1});world.update(1);assert.ok(world.state.y>=713);
 const old=new MarathonWorld({position:{x:640,y:580}});assert.ok(old.state.y>1200);
});
