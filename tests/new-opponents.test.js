import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession } from '../src/game/SparringSession.js';
import { getOpponentProfile } from '../src/game/OpponentProfiles.js';
import { sparringActivity } from '../src/game/DailyActivityGate.js';

const ids=['dyrex','lefeu','louisto'];
function play(id,hz=60,defend=true){
 const game=new SparringSession({opponent:id});game.start();let sequence=null,clock=0;const events=[];
 while(clock<360&&game.state.phase!=='finished'){
  const s=game.state;
  if(s.phase==='between'){game.nextRound();sequence=null;}
  if(s.phase==='running'){
   game.setGuard(defend&&['jab','cross'].includes(s.remi.action),s.remi.target);
   if(defend&&s.player.action==='idle'){
    if(sequence){if(game.act(sequence))sequence=sequence==='cross'?'jab':null;}
    else if(s.remi.action==='open'&&s.remi.duration>=1.7&&s.remi.progress<.06&&s.stamina>=48){if(game.act('jab'))sequence='cross';}
   }
  }else sequence=null;
  game.update(1/hz);clock+=1/hz;events.push(...game.drainEvents());
 }
 return {game,events};
}
for(const id of ids){
 test(`${id}: patient guards and counters can win with baseline stats at 20/60 Hz`,()=>{
  for(const hz of [20,60]){const{game,events}=play(id,hz);assert.equal(game.state.bout.result?.winner,'player',JSON.stringify(game.state.bout));assert.ok(game.state.stats.combos>=2);assert.ok(game.state.stats.blocked>=1);assert.equal(events.filter(e=>e.type==='bout-finish').length,1);assert.notEqual(game.state.bout.result.reason,'abandon');}
 });
 test(`${id}: ignoring authored attacks loses through the ten-count`,()=>{const{game}=play(id,60,false);assert.equal(game.state.bout.result?.winner,'remi');assert.equal(game.state.bout.result.reason,'ko');});
 test(`${id}: full preparations and head/body choices are fixed independently of input`,()=>{
  const p=getOpponentProfile(id);assert.equal(sparringActivity({opponent:id}),'fight');
  for(const s of p.pattern)if(s.attack)assert.ok(s.tell>=.55);
  assert.deepEqual([...new Set(p.pattern.filter(s=>s.attack).map(s=>s.target))].sort(),['body','head']);
  const a=new SparringSession({opponent:id}),b=new SparringSession({opponent:id});a.start();b.start();
  for(let frame=0;frame<700;frame++){
   a.setGuard(true,a.state.remi.target);b.setGuard(frame%2===0,b.state.remi.target);if(frame%31===0)b.act(frame%62?'jab':'cross');
   a.update(1/60);b.update(1/60);
   for(const key of ['action','duration','guardLevel','target','side'])assert.equal(a._remiAction[key],b._remiAction[key],`${frame} ${key}`);
   assert.ok(Math.abs(a._remiAction.elapsed-b._remiAction.elapsed)<1e-7);
  }
 });
}
test('Le Feu rises from body to head in two then three punches, followed by time for a complete counter',()=>{
 const pattern=getOpponentProfile('lefeu').pattern,bursts=[];let current=[];
 for(const stage of pattern){if(stage.attack){current.push(stage.target);if(stage.opening>=1.7){bursts.push(current);current=[];}}}
 assert.deepEqual(bursts,[['body','head'],['body','head','head']]);
 assert.ok(pattern.filter(s=>s.attack&&s.opening>=1.7).every(s=>s.opening>=1.8));
});
test('Louisto slips and feints on both sides without scoring an imaginary punch',()=>{
 const g=new SparringSession({opponent:'louisto'});g.start();const actions=new Set(),sides=new Set();let attempts=0,misses=0;
 for(let i=0;i<1800;i++){
  g.setGuard(true,g.state.remi.target);
  const action=g.state.remi.action;actions.add(action);if(['dodge','feint'].includes(action))sides.add(g.state.remi.side);
  if(action==='dodge'&&g.state.remi.progress<.08&&g.state.player.action==='idle'){g.setGuard(false);if(g.act('jab'))attempts++;}
  const received=g.state.stats.received;g.update(1/60);
  const events=g.drainEvents();misses+=events.filter(e=>e.type==='player-missed').length;
  if(action==='feint'&&g.state.remi.action==='feint')assert.equal(g.state.stats.received,received);
  for(const e of events.filter(e=>e.type==='remi-hit'||e.type==='remi-blocked'))assert.ok(['jab','cross'].includes(e.attack));
 }
 assert.ok(actions.has('dodge')&&actions.has('feint'));assert.deepEqual([...sides].sort(),['left','right']);assert.ok(attempts>=2&&misses>=2);
});
