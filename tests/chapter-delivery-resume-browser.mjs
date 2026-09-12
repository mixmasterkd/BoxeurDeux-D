import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,wait} from './control-helpers.mjs';
import {CareerProfile} from '../src/game/CareerProfile.js';
const fixture=new CareerProfile({storage:null});fixture.startDelivery();fixture.recordDeliveryProgress({elapsed:42.5,bumps:1});fixture.setLocation({scene:'residential',x:1190,y:680,facing:'up'});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}}),errors=[];
await context.routeWebSocket('**',ws=>{const server=ws.connectToServer();server.onMessage(m=>{if(typeof m==='string'&&(/"type":"(?:update|full-reload)"/.test(m)))return;ws.send(m);});});
await context.addInitScript(seed=>{if(!localStorage.getItem('boxeur-deux-d-career-v1'))localStorage.setItem('boxeur-deux-d-career-v1',seed);},fixture.exportText());
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('boxeur-deux-d-career-v1')));
try{
 await page.goto('http://127.0.0.1:5173/');await page.locator('.career-continue').click();await wait(page,()=>window.__exploration?.scene.place==='residential');await page.waitForTimeout(250);
 assert.ok(await page.evaluate(()=>__exploration.scene.deliveryClock>=42.5));assert.equal(await page.evaluate(()=>__exploration.scene.deliveryBumps),1);
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(500);await page.keyboard.up('ArrowLeft');await page.keyboard.press('KeyP');
 const before=await saved();assert.ok(before.delivery.active.elapsed>42.5);assert.equal(before.daily.energy,70);await page.waitForTimeout(200);assert.equal((await saved()).delivery.active.elapsed,before.delivery.active.elapsed);
 await page.reload();await page.locator('.career-continue').click();await wait(page,()=>window.__exploration?.scene.place==='residential');await page.waitForTimeout(250);
 assert.ok(await page.evaluate(value=>__exploration.scene.deliveryClock>=value,before.delivery.active.elapsed));assert.equal((await saved()).daily.energy,70);assert.deepEqual(errors,[]);
 fs.writeFileSync('docs/chapter-delivery-resume-results.json',JSON.stringify({resumedSeconds:before.delivery.active.elapsed,bumps:before.delivery.active.bumps,energy:70,pauseFreezes:true,reloadKeepsProgress:true,errors},null,2)+'\n');
 console.log('Chrono de tournée conservé après pause et rechargement, aucun second débit.');
}finally{await browser.close();}
