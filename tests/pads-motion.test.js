import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ReactivePadsSession } from '../src/game/ReactivePadsSession.js';
import { padsMotion } from '../src/game/PadsMotion.js';
import { readPng } from '../scripts/sprite-png.mjs';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const coaches=[['Fredo','fredo'],['The Octopus','octopus-pads']];
const player=json('../public/assets/sprites/sparring-v2/fighters.json');

for(const [name,directory]of coaches){
const coach=json(`../public/assets/sprites/${directory}/coach.json`);
test(`${name}: anatomical pad targets sit on real opaque mitts on the announced screen side`,()=>{
  for(const side of ['left','right']) {
    const p=coach.poses[side][`${side}Target`];
    assert.ok(side==='left'?p.x>coach.anchor.x:p.x<coach.anchor.x);
    const png=readPng(new URL(`../public/assets/sprites/${directory}/${side}.png`,import.meta.url));
    assert.ok(png.pixels[(Math.round(p.y)*png.width+Math.round(p.x))*4+3]>220);
  }
});

test(`${name}: both real gloves cross to the same anatomical pad exactly when scored, including mirrored direct`,()=>{
  for(const hz of [20,60]) {
    const s=new ReactivePadsSession({random:()=>1});s.start();let contacts=0;
    while(contacts<2) {
      if(s.state.target.phase==='waiting'&&s.state.player.action==='idle')s.act(s.state.target.expected);
      s.update(1/hz);const view=padsMotion(s.state,coach,player);
      for(const e of s.drainEvents())if(e.type==='hit') {
        assert.equal(view.phase,'contact');
        assert.ok(Math.hypot(view.glove.x-view.aim.x,view.glove.y-view.aim.y)<1e-6);
        assert.equal(view.coachPose,e.input==='jab'?'left':'right');
        assert.equal(view.player.flip,e.input==='cross');
        contacts++;
      }
    }
  }
});

test(`${name}: the wrong hand visibly misses the raised pad, waiting and pause do not move that target`,()=>{
  const s=new ReactivePadsSession();s.start();const initial=padsMotion(s.state,coach,player);
  s.update(8);assert.deepEqual(padsMotion(s.state,coach,player).aim,initial.aim);
  s.act('cross');s.update(.19);const wrong=padsMotion(s.state,coach,player);
  assert.ok(Math.hypot(wrong.glove.x-wrong.aim.x,wrong.glove.y-wrong.aim.y)>100);
  assert.equal(s.state.stats.hits,0);assert.equal(s.state.stats.wrong,1);
  s.pause();s.update(10);assert.deepEqual(padsMotion(s.state,coach,player),wrong);
});

}
