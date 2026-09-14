// Access fixture only; the actual 45-second round and two breaths use keyboard.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { chromium, wait, suppressHotReload } from './control-helpers.mjs';
const profile=new CareerProfile({storage:null});assert.ok(profile.applyTestCommand('combat danielo').ok);
const b=await chromium.launch({headless:true});
try {
 const c=await b.newContext({viewport:{width:1280,height:900}});await suppressHotReload(c);
 await c.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:CAREER_STORAGE_KEY,value:profile.exportText()});
 const page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto('http://127.0.0.1:5173/?scene=fight&opponent=danielo');await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);await page.keyboard.press('e');await wait(page,()=>window.__sparring.session.state.phase==='running');
 let held=null;const deadline=Date.now()+55000;
 while(Date.now()<deadline){const s=await page.evaluate(()=>structuredClone(window.__sparring.session.state));if(s.phase==='corner')break;
  const r=s.remi,level=['jab','cross'].includes(r.action)?r.target:null;
  if(level!==held){if(held)await page.keyboard.up(held==='head'?'w':'s');if(level)await page.keyboard.down(level==='head'?'w':'s');held=level;}
  await page.waitForTimeout(30);
 }
 if(held)await page.keyboard.up(held==='head'?'w':'s');
 await wait(page,()=>window.__sparring.session.state.phase==='corner');
 await wait(page,()=>document.querySelector('.corner-vignette img')?.complete&&document.querySelector('.corner-vignette img').naturalWidth>0);
 for(const [time,key]of[[1,'j'],[2,'k']]) { await wait(page,t=>window.__sparring.session.state.bout.corner.elapsed>=t-.03,time);await page.keyboard.press(key); }
 assert.match(await page.locator('.corner-vignette img').getAttribute('src'),/octopus-coach\.png$/);
 assert.match(await page.locator('.corner-advice strong').innerText(),/OCTOPUS/);
 assert.match(await page.locator('.panel-copy').innerText(),/Octopus/);
 const corner=await page.evaluate(()=>structuredClone(window.__sparring.session.state.bout.corner));assert.ok(corner.bonus>=1);
 await page.screenshot({path:'docs/mexico-octopus-corner-desktop.png'});
 await page.keyboard.press('e');await wait(page,()=>window.__sparring.session.state.phase==='between');await page.keyboard.press('e');await wait(page,()=>window.__sparring.session.state.phase==='running');assert.equal(await page.evaluate(()=>window.__sparring.session.state.bout.round),2);
 assert.deepEqual(errors,[]);await fs.writeFile('docs/mexico-octopus-corner-results.json',JSON.stringify({actualRoundSeconds:45,corner,round2:true,errors},null,2)+'\n');console.log('Danielo: actual round45, Octopus art/text, two keyboard breaths, skip and round2.');
} finally {await b.close();}
