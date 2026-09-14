// Save fixture places a paid, running marathon immediately before its one
// encounter. Fight, one fall, result and world return use actual UI inputs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {chromium,wait,suppressHotReload} from './control-helpers.mjs';
const profile=new CareerProfile({storage:null});assert.ok(profile.applyTestCommand('test marathon').ok);assert.ok(profile.startMarathon().ok);
assert.ok(profile.recordMarathonProgress({elapsed:80,checkpoint:{scene:'marathon-downtown',x:110,y:1170,facing:'right'}}).ok);
const checkpoint={scene:'marathon-oldport',x:1475,y:970,facing:'down'};
assert.ok(profile.recordMarathonProgress({elapsed:164.25,checkpoint}).ok);assert.ok(profile.recordMarathonProgress({checkpoint,routePoint:4}).ok);assert.ok(profile.encounterMarathon('fight').ok);
const before=profile.snapshot(),b=await chromium.launch({headless:true});
try{
 const c=await b.newContext({viewport:{width:1280,height:900}});await suppressHotReload(c);await c.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:CAREER_STORAGE_KEY,value:profile.exportText()});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await p.goto('http://127.0.0.1:5173/?scene=marathon-oldport');await wait(p,()=>window.__marathon?.ui.dialog,null,60000);
 const resume=await p.getByRole('button',{name:'Lui tenir tête'});await resume.focus();await p.keyboard.press('e');await wait(p,()=>window.__sparring?.session.state.phase==='ready',null,60000);
 await p.keyboard.press('e');await wait(p,()=>window.__sparring.session.state.phase==='running');
 let held=null;const deadline=Date.now()+90000;
 const release=async()=>{if(held)await p.keyboard.up(held==='head'?'w':'s');held=null;};
 while(Date.now()<deadline){const s=await p.evaluate(()=>structuredClone(window.__sparring.session.state));if(s.phase==='finished')break;
  if(s.phase==='running'){
   const r=s.remi,level=['jab','cross'].includes(r.action)||r.action.startsWith('tell')&&r.duration*(1-r.progress)<.3?r.target:null;
   if(level!==held){await release();if(level){await p.keyboard.down(level==='head'?'w':'s');held=level;}}
   if(r.action==='open'&&s.player.action==='idle')await p.keyboard.press(s.stats.thrown%2?'k':'j');
  }else await release();
  await p.waitForTimeout(40);
 }
 await release();const fight=await p.evaluate(()=>structuredClone(window.__sparring.session.state));assert.equal(fight.phase,'finished');assert.equal(fight.bout.result.winner,'player');assert.equal(fight.bout.downs.remi.total,1);
 const savedAtBell=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
 assert.equal(savedAtBell.marathon.active.encounter,'won');assert.equal(savedAtBell.marathon.active.encounterUsed,true);assert.equal(savedAtBell.marathon.active.elapsed,164.25);assert.equal(savedAtBell.marathon.active.routePoint,4);assert.deepEqual(savedAtBell.marathon.active.checkpoint,checkpoint);
 for(const key of ['wallet','stats','fights','fightReceipts','daily'])assert.deepEqual(savedAtBell[key],before[key],`street fight changed career ${key}`);
 await p.locator('#sparring-ui .primary-button').focus();await p.keyboard.press('e');await wait(p,()=>!window.__sparring&&window.__marathon?.scene.place==='marathon-oldport',null,60000);await p.keyboard.press('p');
 const returned=await p.evaluate(()=>({location:window.__marathon.world.location(),elapsed:window.__marathon.scene.elapsed,routePoint:window.__marathon.scene.routePoint,dialog:window.__marathon.ui.dialog}));
 assert.deepEqual(returned.location,checkpoint);assert.equal(returned.routePoint,4);assert.ok(returned.elapsed>=164.25&&returned.elapsed<164.75);assert.equal(Boolean(returned.dialog),false);
 await p.screenshot({path:'docs/marathon-return-after-actual-fight.png'});
 await p.reload();await wait(p,()=>window.__marathon?.scene.place==='marathon-oldport',null,60000);assert.equal(await p.evaluate(()=>Boolean(window.__marathon.ui.dialog)),false);
 const after=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);assert.equal(after.marathon.active.encounterUsed,true);assert.equal(after.marathon.active.encounter,'won');assert.deepEqual(after.fights,before.fights);assert.deepEqual(errors,[]);
 await fs.writeFile('docs/marathon-fight-integration-results.json',JSON.stringify({fixture:'Paid running marathon saved with pending encounter',fight:{stats:fight.stats,result:fight.bout.result},returned,encounterOnceAfterReload:true,careerUnchanged:true,errors},null,2)+'\n');console.log('Marathon pending → actual fight → one fall → return checkpoint/routePoint/time preserved → reload without second encounter; no career reward.');
}finally{await b.close();}
