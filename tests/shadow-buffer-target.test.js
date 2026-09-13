import test from 'node:test';
import assert from 'node:assert/strict';
import {ShadowSession} from '../src/game/ShadowSession.js';
import {SparringSession,TIMINGS} from '../src/game/SparringSession.js';
const make=Model=>{const s=new Model({techniques:{doubleJab:true}});s.start();return s;};
const contacts=s=>s.drainEvents().filter(e=>e.type==='motion'||e.type==='player-hit');
for(const target of ['body','head'])test(`shadow and sparring remember the queued ${target} target after the guard changes`,()=>{
 for(const Model of [ShadowSession,SparringSession]){
  const s=make(Model);s.act('jab');s.update(.20);
  if(target==='body')s.setGuard(true,'body');
  assert.equal(s.act('cross'),true);
  if(target==='body')s.setGuard(false);else s.setGuard(true,'body');
  s.update(.14);assert.equal(s.state.player.action,'cross');assert.equal(s.state.player.target,target);
  s.update(.20);assert.equal(contacts(s).at(-1).target,target);
 }
});
test('a buffered double-jab finisher keeps the body choice and the successful sequence',()=>{
 for(const Model of [ShadowSession,SparringSession]){
  const s=make(Model);s.act('jab');s.update(TIMINGS.player.jab.duration);s.act('jab');s.update(.20);
  s.setGuard(true,'body');assert.equal(s.act('cross'),true);s.setGuard(false);s.update(.14);s.update(.20);
  const final=contacts(s).at(-1);assert.equal(final.target,'body');assert.equal(final.comboType,'doubleJab');assert.equal(final.combo,true);assert.equal(s.state.stats.doubleJabCombos,1);
 }
});
test('pause cancels a queued body choice without leaking it into a later deliberate head punch',()=>{
 for(const Model of [ShadowSession,SparringSession]){
  const s=make(Model);s.act('jab');s.update(.20);s.setGuard(true,'body');s.act('cross');s.pause();s.resume();s.update(.20);
  assert.equal(s.state.player.action,'idle');assert.equal(contacts(s).length,1);
  assert.equal(s.act('cross'),true);s.update(.20);assert.equal(contacts(s).at(-1).target,'head');
 }
});
