import test from 'node:test';
import assert from 'node:assert/strict';
import {HotelWorld,HOTEL_LAYOUTS} from '../src/game/HotelWorld.js';
function reach(layout,start,target){
  const foot=layout.footprint,step=20;
  const legal=(x,y)=>x-foot.halfWidth>=layout.bounds.left&&x+foot.halfWidth<=layout.bounds.right&&y-foot.halfHeight>=layout.bounds.top&&y+foot.halfHeight<=layout.bounds.bottom&&!layout.obstacles.some(r=>x+foot.halfWidth>r.x&&x-foot.halfWidth<r.x+r.width&&y+foot.halfHeight>r.y&&y-foot.halfHeight<r.y+r.height);
  const q=[[start.x,start.y]],seen=new Set;while(q.length){const [x,y]=q.shift(),key=`${x},${y}`;if(seen.has(key)||!legal(x,y))continue;seen.add(key);
    if(Math.hypot(x-target.x,y-target.y)<target.radius-10)return true;
    for(const [dx,dy]of [[step,0],[-step,0],[0,step],[0,-step]])q.push([x+dx,y+dy]);
  }return false;
}
for(const [place,layout]of Object.entries(HOTEL_LAYOUTS)){
  test(`${place}: every door and activity can be approached from arrival`,()=>{
    for(const station of layout.stations)assert.ok(reach(layout,layout.spawn,station),`${station.id} must be reachable`);
  });
  test(`${place}: movement persists, pause releases, invalid imported location falls back`,()=>{
    const w=new HotelWorld({place,position:{x:-5,y:99999,facing:'right'}});assert.equal(w.state.x,layout.spawn.x);
    w.setInput({x:1,y:0});w.update(.1);const x=w.state.x;w.pause();w.update(1);assert.equal(w.state.x,x);w.resume();w.update(1);assert.equal(w.state.x,x);
    assert.equal(w.location().scene,place);
  });
}
test('a large delta cannot pass through the pool wall',()=>{
  const w=new HotelWorld({place:'hotel-pool',position:{x:640,y:610,facing:'up'}});w.setInput({x:0,y:-1});w.update(10);assert.ok(w.state.y>=550);
});
