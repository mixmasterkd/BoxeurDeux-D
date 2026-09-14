import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainSession} from '../src/game/TrainSession.js';
import {TrainWindowMotion} from '../src/game/TrainWindowMotion.js';
const advance=(train,view,seconds,step=1/60)=>{let frame;for(let t=0;t<seconds-1e-8;t+=step){train.update(Math.min(step,seconds-t));frame=view.update(train.snapshot());}return frame;};
const glazing=(frame,x)=>Boolean(frame.tunnel&&x>=frame.tunnel.left&&x<frame.tunnel.right);

test('doors close at the platform, then the platform and tunnel pass the windows before arrival',()=>{
  const train=new TrainSession(),view=new TrainWindowMotion();
  const closing=advance(train,view,8.2);assert.equal(train.doorsOpen,false);assert.equal(closing.offset,0);
  const leaving=advance(train,view,1);assert.ok(leaving.offset>0);assert.equal(glazing(leaving,220),false);assert.equal(glazing(leaving,1050),true);
  const tunnel=advance(train,view,.8);assert.ok(glazing(tunnel,220)&&glazing(tunnel,1050));
  const entering=advance(train,view,.8);assert.equal(glazing(entering,220),true);assert.equal(glazing(entering,1050),false);
  const settled=advance(train,view,.9);assert.equal(train.doorsOpen,false);assert.ok(!glazing(settled,220)&&!glazing(settled,1050));
  const arrived=advance(train,view,.3);assert.equal(train.doorsOpen,true);assert.equal(arrived.offset,settled.offset);
});

test('pause freezes scenery and reversal at a terminus neither teleports the wall nor mirrors its benches',()=>{
  const train=new TrainSession({station:'metro-stadium',direction:1}),view=new TrainWindowMotion();
  const moving=advance(train,view,10);train.pause();assert.deepEqual(advance(train,view,4),moving);
  train.resume();const end=advance(train,view,2);assert.equal(train.station.id,'metro-airport');assert.equal(train.state.direction,-1);
  assert.equal(advance(train,view,8.2).offset,end.offset);
  const reverse=advance(train,view,1);assert.ok(reverse.offset<end.offset);assert.ok(glazing(reverse,220));assert.ok(!glazing(reverse,1050));
});

test('external displacement stays continuous across successive trips at different frame rates',()=>{
  const run=step=>{const train=new TrainSession(),view=new TrainWindowMotion();return advance(train,view,46,step);};
  const fast=run(1/60),slow=run(1/20);assert.ok(Math.abs(fast.offset-slow.offset)<1e-6);assert.equal(fast.direction,slow.direction);
});
