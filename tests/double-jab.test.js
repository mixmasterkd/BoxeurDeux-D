import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringSession, TIMINGS, COMBO_WINDOW } from '../src/game/SparringSession.js';
import { fighterMotion } from '../src/game/FighterMotion.js';
const create=(settings={})=>{const s=new SparringSession({random:()=>.5,lesson:'resistance',techniques:{doubleJab:true},...settings});s.start();return s;};
function punch(s,action,expected=action){assert.equal(s.act(action),true);assert.equal(s.state.player.action,expected);s.update(TIMINGS.player[expected].duration);}
function prepare(s){punch(s,'jab');punch(s,'jab');assert.equal(s.state.combo.type,'doubleJab');assert.equal(s.state.combo.step,2);}
const attacks=s=>s.drainEvents().filter(e=>e.type.startsWith('player-'));

test('learned J J K charges 41 and adds four resistance damage only at the visible final direct contact',()=>{
 const s=create({opponent:'dyrex'});prepare(s);assert.equal(s.state.bout.resistance.remi,92);assert.equal(s.act('cross'),true);assert.equal(s.state.player.finisher,'doubleJab');assert.equal(s.state.stamina,59);
 const contact=TIMINGS.player.cross.duration*TIMINGS.player.cross.impact;s.update(contact-.00001);assert.equal(s.state.stats.landed,2);assert.equal(s.state.bout.resistance.remi,92);
 s.update(.00001);assert.equal(fighterMotion(s.state.player,s.state.elapsed,'player').phase,'contact');assert.equal(s.state.bout.resistance.remi,70);assert.equal(s.state.stats.landed,3);assert.equal(s.state.bout.score.player,3);assert.equal(s.state.stats.doubleJabCombos,1);assert.equal(s.state.stats.combos,1);assert.equal(s.state.stats.hooks,0);
 const e=attacks(s);assert.deepEqual(e.map(x=>x.attack),['jab','jab','cross']);assert.equal(e.at(-1).comboType,'doubleJab');assert.equal(e.at(-1).combo,true);
 s.update(.5);assert.equal(s.state.stats.thrown,3);assert.equal(s.state.stats.doubleJabCombos,1);
});
test('before unlocking, including truthy malformed values, J J K remains three ordinary punches',()=>{
 for(const doubleJab of [false,undefined,1,'true']){const s=create({techniques:{doubleJab}});punch(s,'jab');punch(s,'jab');punch(s,'cross');assert.equal(s.state.stamina,63);assert.equal(s.state.bout.resistance.remi,58);assert.equal(s.state.stats.doubleJabCombos,0);assert.equal(attacks(s).at(-1).comboType,undefined);}
});
test('unlocking J J K preserves the existing J K J hook and rejects unrelated chains',()=>{
 const hook=create();punch(hook,'jab');punch(hook,'cross');assert.equal(hook.state.combo.type,'hook');punch(hook,'jab','hook');assert.equal(hook.state.stamina,52);assert.equal(hook.state.stats.combos,1);assert.equal(hook.state.stats.doubleJabCombos,0);
 for(const seq of [['jab','jab','jab','cross'],['jab','cross','cross']]){const s=create();for(const action of seq)punch(s,action);assert.equal(s.state.stats.doubleJabCombos,0);assert.equal(attacks(s).filter(e=>e.comboType).length,0);}
});
test('natural rapid J J K has identical three contacts at 20/60 Hz and never retains a fourth press',()=>{
 const outcomes=[20,60].map(hz=>{const s=create();const inputs=[[0,'jab'],[.25,'jab'],[.55,'cross']];let i=0;
 while(s.state.elapsed<1.2-1e-9){if(i<inputs.length&&s.state.elapsed>=inputs[i][0]-1e-8)assert.equal(s.act(inputs[i++][1]),true);const next=inputs[i]?.[0]??1.2;s.update(Math.min(1/hz,next-s.state.elapsed,1.2-s.state.elapsed));}
 assert.equal(s.state.stats.thrown,3);assert.equal(s.state.stats.doubleJabCombos,1);return attacks(s).map(({type,attack,time,comboType})=>({type,attack,time:Number(time.toFixed(8)),comboType}));});assert.deepEqual(...outcomes);
});
test('a finisher cannot silently fall back to a cheap direct when its stamina is insufficient',()=>{
 const s=create();s.state.stamina=40;prepare(s);assert.equal(s.state.combo.ready,false);assert.equal(s.act('cross'),false);assert.equal(s.state.stamina,20);assert.equal(s.state.stats.thrown,2);assert.equal(s.state.combo.step,0);assert.equal(s.act('cross'),true);assert.equal(s.state.player.finisher,undefined);assert.equal(s.state.stamina,3);
});
test('pause, focus loss and defense clear a prepared double jab and its pending input',()=>{
 for(const interrupt of ['pause','releaseControls','guard','dodge']){const s=create();punch(s,'jab');s.act('jab');s.update(.20);s.act('cross');
 if(interrupt==='guard')s.setGuard(true);else if(interrupt==='dodge')s.act('dodgeLeft');else s[interrupt]();
 if(interrupt==='pause'){const frozen=structuredClone(s.state);s.update(5);assert.deepEqual(s.state,frozen);s.resume();}
 s.update(.5);assert.equal(s.state.stats.thrown,2);assert.equal(s.state.stats.doubleJabCombos,0);assert.equal(s.state.combo.step,interrupt==='dodge'?2:0);}
 const accepted=create();prepare(accepted);assert.equal(accepted.act('dodgeLeft'),true);assert.equal(accepted.state.combo.step,0);
});
test('pausing a committed finisher freezes its glove then scores once without a full-chain achievement',()=>{
 const s=create();prepare(s);s.act('cross');s.update(.1);s.pause();const frozen=structuredClone(s.state);s.update(5);assert.deepEqual(s.state,frozen);s.resume();s.update(.2);
 assert.equal(s.state.stats.landed,3);assert.equal(s.state.stats.doubleJabCombos,0);assert.equal(attacks(s).at(-1).combo,false);
});
test('expiry and a blocked first jab cannot claim a successful double jab combination',()=>{
 const expired=create();prepare(expired);expired.update(COMBO_WINDOW+.00001);punch(expired,'cross');assert.equal(attacks(expired).at(-1).comboType,undefined);
 const blocked=create();while(blocked.state.remi.action!=='guard')blocked.update(.005);prepare(blocked);punch(blocked,'cross');assert.equal(attacks(blocked)[0].type,'player-blocked');assert.equal(blocked.state.stats.doubleJabCombos,0);
});
test('round reset retains learned permission but resets the technique sequence and statistics',()=>{
 const s=create();prepare(s);punch(s,'cross');assert.equal(s.state.stats.doubleJabCombos,1);s.reset();assert.equal(s.settings.techniques.doubleJab,true);assert.equal(s.state.stats.doubleJabCombos,0);assert.equal(s.state.combo.step,0);
});
