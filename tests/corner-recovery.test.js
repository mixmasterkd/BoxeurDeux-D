import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession } from '../src/game/SparringSession.js';
function corner() { const game = new SparringSession({opponent:'beton',duration:1}); game.start(); game.update(1); assert.equal(game.state.phase,'corner'); return game; }
test('Fredo awards eight deliberate breaths once, recovers only at the next round',()=>{
 const g=corner();g.state.bout.resistance.player=50;
 for(let i=0;i<8;i++){g.update(1);assert.equal(g.act(i%2?'cross':'jab'),true);assert.equal(g.act(i%2?'cross':'jab'),false);}
 assert.equal(g.state.bout.resistance.player,50);g.update(1);assert.equal(g.state.phase,'between');
 assert.equal(g.state.bout.corner.bonus,8);g.nextRound();assert.equal(g.state.bout.resistance.player,78);assert.equal(g.state.stamina,100);assert.equal(g.state.stats.thrown,0);
 assert.equal(g.nextRound(),false);assert.equal(g.state.bout.resistance.player,78);
});
test('skipping, wrong buttons and mashing retain baseline without fishing for a bonus',()=>{
 for(const mode of ['skip','wrong','mash']){
 const g=corner();g.state.bout.resistance.player=50;
 if(mode==='skip')g.finishCorner();
 else if(mode==='wrong'){for(let i=0;i<8;i++){g.update(1);g.act(i%2?'jab':'cross');}g.update(1);}
 else for(let t=0;t<901;t++){g.act('jab');g.act('cross');g.update(.01);}
 assert.equal(g.state.phase,'between');assert.equal(g.state.bout.corner.bonus,0,mode);g.nextRound();assert.equal(g.state.bout.resistance.player,70);
 }
});
test('corner time and input pause together; no combat time or score changes',()=>{
 const g=corner();g.update(.9);const before=structuredClone(g.state);assert.equal(g.pause(),true);g.update(30);assert.equal(g.act('jab'),false);assert.equal(g.state.bout.corner.elapsed,before.bout.corner.elapsed);
 g.resume();assert.equal(g.state.phase,'corner');assert.equal(g.act('jab'),true);g.update(20);assert.equal(g.state.phase,'between');assert.equal(g.state.elapsed,1);assert.deepEqual(g.state.stats,before.stats);assert.equal(g.state.bout.roundHistory.length,1);
});
test('round recovery is capped, and sparring retains its familiar interval',()=>{
 const g=corner();for(let i=0;i<8;i++){g.update(1);g.act(i%2?'cross':'jab');}g.update(1);g.nextRound();assert.equal(g.state.bout.resistance.player,100);
 const r=new SparringSession({lesson:'resistance',duration:1});r.start();r.update(1);assert.equal(r.state.phase,'between');assert.equal(r.state.bout.corner,null);
});
