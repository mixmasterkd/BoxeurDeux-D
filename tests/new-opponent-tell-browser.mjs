import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,wait} from './control-helpers.mjs';
import {hotelFixture,seedContext} from './hotel-test-helpers.mjs';
const profile=hotelFixture();profile.recordTournamentFight({opponent:'bellini',winner:'remi',matchId:profile.tournamentStatus().currentMatchId});profile.leaveTournament();
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}});await seedContext(context,profile);
const page=await context.newPage(),errors=[],report={};page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/?scene=fight&opponent=lefeu');await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);await page.keyboard.press('e');
 await page.keyboard.down('ArrowDown');
 await wait(page,()=>window.__sparring?.session.state.remi.action==='tellLeft'&&window.__sparring.session.state.remi.progress>.25,null,20000);
 await page.keyboard.up('ArrowDown');await page.keyboard.down('ArrowUp');
 const prep=await page.evaluate(()=>({texture:window.__sparring.scene.remi.sprite.texture.key,phase:window.__sparring.scene.remi.phase,pose:window.__sparring.scene.remi.pose}));
 assert.equal(prep.texture,'lefeu-jab-windup');assert.equal(prep.pose,'jab-windup');await page.screenshot({path:'docs/lefeu-jab-preparation-desktop.png'});report.preparation=prep;
 await wait(page,()=>window.__sparring.impacts.some(e=>e.type==='remi-blocked'&&e.attack==='jab'));
 report.jab=await page.evaluate(()=>window.__sparring.impacts.find(e=>e.type==='remi-blocked'&&e.attack==='jab'));
 assert.equal(report.jab.remiTexture,'lefeu-jab');assert.ok(Math.hypot(report.jab.x-report.jab.targetPoint.x,report.jab.y-report.jab.targetPoint.y)<2);
 assert.deepEqual(errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}finally{await browser.close();await fs.writeFile('docs/lefeu-jab-tell-browser-results.json',JSON.stringify({...report,errors},null,2)+'\n');}
