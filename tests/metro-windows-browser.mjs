// Read-only observations of real-time journeys. No accelerated clock or forced movement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,wait,dispatch,joyPoint,buttonPoint,suppressHotReload,fit} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {readOpaquePng} from '../scripts/chapter-png.mjs';
const built=process.env.WINDOW_BUILT==='1',url=built?'https://metro-build.invalid/BoxeurDeux-D/':process.env.WINDOW_PUBLIC_URL??'http://127.0.0.1:5173/',live=built||Boolean(process.env.WINDOW_PUBLIC_URL);
const report={date:new Date().toISOString(),url,mobileEmulated:true,cases:[],errors:[],warnings:[],captureWarnings:[]};
const browser=await chromium.launch({headless:true});let page;
const prefix=`docs/metro-motion-${built?'built':live?'public':'local'}`;
const place=async expected=>{await wait(page,p=>document.querySelector('#gym-ui')?.dataset.metroPlace===p,expected,45000);await page.locator('#scene-loading').waitFor({state:'hidden'});await page.waitForTimeout(180);};
const sample=file=>{const im=readOpaquePng(file),pixel=(x,y)=>{const at=(Math.floor(y*im.height/720)*im.width+Math.floor(x*im.width/1280))*4;return [...im.pixels.subarray(at,at+4)];};return{fixed:[[270,260],[400,40],[950,500],[894,138],[149,95]].map(p=>pixel(...p)),glass:[[270,150],[990,155],[350,155]].map(p=>pixel(...p))};};
try{
 for(const mobile of [false,true]){
  const suffix=mobile?'mobile568':'desktop',profile=new CareerProfile({storage:null});profile.setLocation({scene:'metro-station',x:640,y:490,facing:'up'});
  const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});if(!live)await suppressHotReload(context);
  if(built)await context.route('https://metro-build.invalid/BoxeurDeux-D/**',async route=>{
    const rel=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html';
    const file=path.resolve('dist',rel);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
    try{await route.fulfill({status:200,body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]??'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Missing asset'});}
  });
  await context.addInitScript(({key,text})=>{if(!localStorage.getItem(key))localStorage.setItem(key,text);},{key:CAREER_STORAGE_KEY,text:profile.exportText()});
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')(/GPU stall due to ReadPixels/.test(m.text())?report.captureWarnings:report.warnings).push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  const cdp=mobile?await context.newCDPSession(page):null;
  const tap=async selector=>{if(!mobile)return page.locator(selector).click();await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');};
  const up=async ms=>{if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui','up')]);else await page.keyboard.down('KeyW');await page.waitForTimeout(ms);if(mobile)await dispatch(cdp,'touchEnd');else await page.keyboard.up('KeyW');await page.waitForTimeout(80);};
  const capture=async name=>{const file=`${prefix}-${name}-${suffix}.png`;await page.locator('#game canvas').screenshot({path:file});return sample(file);};
  await page.goto(`${url}?scene=metro-station`);await place('metro-station');await up(850);await place('metro-train');
  const base=await capture('station');
  if(!mobile&&!live)await page.evaluate(()=>{const chunks=[],stream=document.querySelector('#game canvas').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:1800000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();window.__motionRecording={recorder,chunks,stream};});
  await wait(page,()=>document.querySelector('#gym-ui').dataset.metroTrain==='moving',null,15000);
  const departureAt=Date.now(),at=async ms=>page.waitForTimeout(Math.max(0,ms-(Date.now()-departureAt)));
  const closing=await capture('closing');assert.deepEqual(closing.fixed,base.fixed,'Closing preserves cabin, grips and pole');
  await at(1100);const departure=await capture('departure');assert.deepEqual(departure.fixed,base.fixed);
  await at(1900);const tunnel=await capture('tunnel');assert.deepEqual(tunnel.fixed,base.fixed);assert.notDeepEqual(tunnel.glass,base.glass);assert.notDeepEqual(tunnel.glass,closing.glass);
  await at(2700);const arrival=await capture('arrival');assert.deepEqual(arrival.fixed,base.fixed);
  await wait(page,()=>document.querySelector('#gym-ui').dataset.metroTrain==='stopped'&&document.querySelector('#gym-ui').dataset.metroStation==='metro-riverside',null,8000);
  const atNext=await capture('next-station');assert.deepEqual(atNext.fixed,base.fixed);
  if(!mobile&&!live){const data=await page.evaluate(async()=>{const r=window.__motionRecording;await new Promise(resolve=>{r.recorder.onstop=resolve;r.recorder.stop();});const bytes=new Uint8Array(await new Blob(r.chunks).arrayBuffer());r.stream.getTracks().forEach(t=>t.stop());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));delete window.__motionRecording;return btoa(binary);});fs.writeFileSync(`${prefix}-journey.webm`,Buffer.from(data,'base64'));}
  // Reuse exactly the same Phaser texture cache for two more boardings.
  for(let visit=2;visit<=3;visit++){
    await up(950);await place('metro-riverside');await up(750);await place('metro-train');
    const again=await capture(`boarding-${visit}`);assert.deepEqual(again.fixed,base.fixed,'A cached window crop must never replace the full carriage');
    if(!live)assert.deepEqual(await page.evaluate(()=>{const b=__metro.scene.background;return[b.frame.name,b.frame.realWidth,b.frame.realHeight,b.displayWidth,b.displayHeight];}),['__BASE',1280,720,1280,720]);
  }
  await wait(page,()=>document.querySelector('#gym-ui').dataset.metroTrain==='moving',null,15000);await page.waitForTimeout(1100);
  if(mobile)await tap('#gym-ui .console-menu-button');else await page.keyboard.press('KeyP');await wait(page,()=>document.querySelector('#gym-ui').dataset.mode==='paused');
  const paused=await page.locator('#game canvas').screenshot();await page.waitForTimeout(750);assert.deepEqual(await page.locator('#game canvas').screenshot(),paused,'Pause freezes all scenery pixels');
  const layout=await fit(page,'#gym-ui',mobile);assert.ok(layout.fits&&layout.noScroll&&layout.controls.every(c=>c.fits&&c.outside));
  report.cases.push({mobile,threeBoardings:true,cabinAndGripsAndPoleUnchanged:true,platformDuringClosing:true,spatialDepartureAndArrivalCaptured:true,sceneryPaused:true,layout});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.warnings,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(page&&!page.isClosed())await page.screenshot({path:`${prefix}-failure.png`});}
finally{await browser.close();fs.writeFileSync(`${prefix}-results.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
