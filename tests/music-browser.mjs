// Native WebAudio proof alongside real keyboard/CDP-touch menu interactions.
// Seeded careers use model commands; all subsequent movement/settings use UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,wait,dispatch,joyPoint,buttonPoint,suppressHotReload,fit} from './control-helpers.mjs';
import {installAudioProbe} from './music-audio-probe.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {MUSIC_TRACKS} from '../src/audio/MusicScores.js';

const MUSIC_KEY='boxeurdeux-d:music:v1',FX_KEY='boxeurdeux-d:audio:v1';
const built=process.env.MUSIC_BUILT==='1',publicSite=!built&&Boolean(process.env.MUSIC_URL);
const url=built?'https://music-build.invalid/BoxeurDeux-D/':process.env.MUSIC_URL??process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const output=`outputs/verification/music/${built?'built':publicSite?'public':'dev'}`;
fs.mkdirSync(output,{recursive:true});
const report={date:new Date().toISOString(),url,built,publicSite,mobileEmulated:true,
 evidence:'Native AudioContext/source instrumentation and analyser RMS/peak. Valid career fixtures; real keys/CDP touch for gestures, settings and doors. Visibility loss explicitly simulated in headless Chromium; portrait uses a real viewport change. No production test hooks.',cases:[],errors:[],warnings:[],failure:null};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const probe=page=>page.evaluate(()=>window.__musicProbe.snapshot());
const measure=(page,duration=900)=>page.evaluate(ms=>window.__musicProbe.measure(ms),duration);
const settings=page=>page.evaluate(({music,fx})=>({music:localStorage.getItem(music),fx:localStorage.getItem(fx)}),{music:MUSIC_KEY,fx:FX_KEY});
const themeCases=[
 {id:'gym',place:'gym',point:[210,585]},
 {id:'shops',place:'clothing-shop',point:[640,540]},
 {id:'metro',place:'metro-station',point:[640,490]},
 {id:'island',place:'casino-island',command:'casino'},
 {id:'casino',place:'casino-lobby',command:'casino',point:[1438,1506]},
 {id:'hotel',place:'hotel-lobby',command:'bronze',point:[728,420]},
 {id:'cuba',place:'cuba-village',command:'cuba',point:[430,390]},
 {id:'mexico',place:'mexico-village',command:'mexique',point:[430,430]},
 {id:'marathon',place:'marathon-island',command:'marathon',run:true},
 {id:'bout',place:'sparring',entry:'fight',point:[210,585]},
];
function fixture(config){
 const p=new CareerProfile({storage:null});
 if(config.command)assert.ok(p.applyTestCommand(`test ${config.command}`).ok);
 else assert.ok(p.recordFight({opponent:'beton',winner:'player'}).ok);
 if(config.place==='home')p.setLocation({scene:'home',x:640,y:615,facing:'down'});
 else if(config.point)p.setLocation({scene:config.place==='sparring'?'gym':config.place,x:config.point[0],y:config.point[1],facing:'down'});
 if(config.run)assert.ok(p.startMarathon().ok);
 p.inspectImport(p.exportText());return p.exportText();
}
async function setup(config,mobile,{music={muted:false,volume:.25},fx={muted:true,volume:.35}}={}){
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 if(!built&&!publicSite)await suppressHotReload(context);
 if(built)await context.route('https://music-build.invalid/BoxeurDeux-D/**',async route=>{
  const rel=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html';
  const file=path.resolve('dist',rel);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
  try{await route.fulfill({status:200,body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream'});}
  catch{await route.fulfill({status:404,body:'Missing production asset'});}
 });
 await context.addInitScript(({career,data,musicKey,fxKey,music,fx})=>{
  if(!localStorage.getItem(career)){localStorage.setItem(career,data);localStorage.setItem(`${career}-backup`,data);}
  if(!localStorage.getItem(musicKey))localStorage.setItem(musicKey,JSON.stringify(music));
  if(!localStorage.getItem(fxKey))localStorage.setItem(fxKey,JSON.stringify(fx));
 },{career:CAREER_STORAGE_KEY,data:fixture(config),musicKey:MUSIC_KEY,fxKey:FX_KEY,music,fx});
 await context.addInitScript(installAudioProbe);
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(publicSite?60000:30000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning'&&!/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(m.text()))report.warnings.push(m.text());});
 const cdp=mobile?await context.newCDPSession(page):null;
 const root=()=>page.evaluate(()=>['gym','sparring','bag','shadow','rhythm'].map(id=>`#${id}-ui`).find(s=>{const e=document.querySelector(s);return e&&!e.hidden&&e.getClientRects().length;}));
 const tap=async selector=>{await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).scrollIntoViewIfNeeded();if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');}else await page.locator(selector).click();await page.waitForTimeout(55);};
 const direction=async direction=>{if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(page,await root(),direction)]);await dispatch(cdp,'touchEnd');}else await page.keyboard.press({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction]);await page.waitForTimeout(45);};
 const confirm=async()=>mobile?tap(`${await root()} [data-pad-button="a"]`):page.keyboard.press('KeyE');
 const focus=async selector=>{await page.locator(selector).waitFor({state:'visible'});for(let n=0;n<40;n++){if(await page.locator(selector).evaluate(e=>e===document.activeElement))return;await direction('down');}throw Error(`Menu cannot focus ${selector}`);};
 const choose=async selector=>{await focus(selector);await confirm();};
 const hold=async(direction,duration)=>{const key={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction];if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(page,await root(),direction)]);else await page.keyboard.down(key);try{await page.waitForTimeout(duration);}finally{if(mobile)await dispatch(cdp,'touchEnd');else await page.keyboard.up(key);}await page.waitForTimeout(80);};
 const ready=async(place=config.place)=>{await wait(page,place=>document.querySelector('#stage')?.dataset.scene===place,place,45000);await page.locator('#scene-loading').waitFor({state:'hidden'});await page.waitForTimeout(100);};
 const gesture=async()=>{
  for(const selector of ['.career-start-continue','.career-continue'])if(await page.locator(selector).isVisible()){await tap(selector);return;}
  if(mobile){const box=await page.locator('canvas').boundingBox();await dispatch(cdp,'touchStart',[{id:8,x:box.x+box.width/2,y:box.y+box.height/2}]);await dispatch(cdp,'touchEnd');}
  else await page.keyboard.press('KeyX');
 };
 const pause=async()=>mobile?tap(`${await root()} .console-menu-button`):page.keyboard.press('KeyP');
 const resume=async()=>{const r=await root();await choose(r==='#gym-ui'?`${r} .gym-resume-button`:`${r} .primary-button`);};
 const shot=async label=>{const geometry=await fit(page,await root(),mobile,true);assert.ok(geometry.fits&&geometry.noScroll);assert.ok(geometry.controls.every(c=>c.outside&&c.fits));const musicLayout=await page.locator(`${await root()} .music-controls`).evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,controls:[...e.querySelectorAll('button,input')].map(c=>{const r=c.getBoundingClientRect();return{width:r.width,left:r.left,right:r.right,horizontalFit:r.left>=0&&r.right<=innerWidth};})}));assert.ok(musicLayout.scrollWidth<=musicLayout.width+1&&musicLayout.controls.every(c=>c.horizontalFit),`Music controls must fit without horizontal overflow: ${JSON.stringify(musicLayout)}`);await page.screenshot({path:`${output}/${mobile?'mobile568':'desktop'}-${label}.png`});return{...geometry,musicLayout};};
 const track=async id=>{const selector=`${await root()} .music-controls`;await wait(page,({selector,id})=>document.querySelector(selector)?.dataset.track===id,{selector,id});const title=await page.locator(`${selector} .music-track`).textContent();assert.ok(title.includes(MUSIC_TRACKS[id].title),`Expected ${id}: ${title}`);return title;};
 await page.goto(new URL(config.entry?`?scene=${config.entry}`:'',url).href);await ready();
 return{context,page,cdp,root,tap,direction,confirm,focus,choose,hold,ready,gesture,pause,resume,shot,track};
}
function audioEvidence(samples,snapshot,id){
 const playing=samples.filter(s=>s.rms>1e-5);assert.ok(playing.length>0,`${id}: the native audio output must contain nonzero sound: ${JSON.stringify(samples)}`);
 assert.ok(playing.every(s=>s.peak<.99),`${id}: unclipped native output`);
 const expected=new Set(MUSIC_TRACKS[id].notes.filter(n=>!['kick','snare','hat','clap','tom'].includes(n.instrument)).flatMap(n=>[1,2,3].map(f=>Math.round(440*2**((n.midi-69)/12)*f*100))));
 const observed=snapshot.recent.filter(s=>s.kind==='oscillator').flatMap(s=>s.frequencyEvents.map(e=>Math.round(e.value*100)));
 assert.ok(observed.some(f=>expected.has(f)),`${id}: actual scheduled pitched voices agree with score notes`);
 return{contexts:snapshot.contexts.map(c=>({id:c.id,state:c.state,starts:c.starts,activeSources:c.activeSources,sampleRate:c.sampleRate})),levels:playing.map(({id,rms,peak,samples})=>({id,rms,peak,samples})),scorePitchesObserved:true};
}
async function silence(page,label){
 await page.waitForTimeout(250);const before=await probe(page);const samples=await measure(page,450);const after=await probe(page);
 assert.equal(after.started,before.started,`${label}: no new audio sources while stopped`);
 assert.ok(samples.every(s=>s.rms<1e-6),`${label}: output must be silent ${JSON.stringify(samples)}`);
 return{sources:after.started,levels:samples.map(({id,rms,peak})=>({id,rms,peak}))};
}
async function teardown(s,label){
 const before=await probe(s.page);await s.page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
 await s.page.waitForTimeout(350);const after=await probe(s.page);await s.page.waitForTimeout(200);const last=await probe(s.page);
 assert.equal(last.started,after.started,`${label}: disposal cancels the sequencing timer`);
 const used=before.contexts.filter(c=>c.starts>0).map(c=>c.id);
 assert.ok(last.contexts.filter(c=>used.includes(c.id)).every(c=>c.state==='closed'&&c.activeSources===0),`${label}: used audio contexts close and retain no active oscillators`);
 return{closedContexts:last.contexts.filter(c=>used.includes(c.id)),noPostDisposeSources:true};
}

async function theme(config,mobile){
 console.log(`MUSIC theme ${config.id} ${mobile?'mobile':'desktop'}`);const s=await setup(config,mobile);
 try{
  assert.equal((await probe(s.page)).contexts.length,0,'No AudioContext before the first real gesture.');
  await s.gesture();await s.track(config.id);await wait(s.page,()=>__musicProbe.snapshot().started>2);
  const sound=audioEvidence(await measure(s.page),await probe(s.page),config.id);
  await s.pause();await s.page.locator(`${await s.root()} .music-controls`).waitFor({state:'visible'});const geometry=await s.shot(`theme-${config.id}`);
  report.cases.push({name:`theme-${config.id}-${mobile?'mobile':'desktop'}`,place:config.place,autoplayLocked:true,gestureUnlock:true,fxMutedMusicAudible:true,sound,geometry});
 }catch(error){console.error(JSON.stringify({audio:await probe(s.page),ui:await s.page.evaluate(()=>({mode:document.querySelector('#gym-ui')?.dataset.mode,hidden:document.hidden,hotel:window.__hotel?{changing:__hotel.scene.changing,changingPlace:__hotel.scene.changingPlace,paused:__hotel.world.state.paused}:null}))},null,2));await s.page.screenshot({path:`${output}/failure-theme-${config.id}-${mobile?'mobile':'desktop'}.png`}).catch(()=>{});throw error;}finally{await s.context.close();}
}

async function lifecycle(mobile){
 console.log(`MUSIC lifecycle ${mobile?'mobile':'desktop'}`);const s=await setup({id:'home',place:'home'},mobile);const checks=[];
 try{
  assert.equal((await probe(s.page)).contexts.length,0);await s.gesture();await s.track('home');
  await wait(s.page,()=>__musicProbe.snapshot().started>2);const initialSound=audioEvidence(await measure(s.page),await probe(s.page),'home');
  const fxBefore=(await settings(s.page)).fx;
  await s.pause();await s.page.locator('#gym-ui .music-controls').waitFor({state:'visible'});await silence(s.page,'pause');checks.push('Native audio and scheduler stop on pause');
  await s.focus('#gym-ui .music-volume');const initialVolume=Number(await s.page.locator('#gym-ui .music-volume').inputValue());
  await s.direction('right');await s.direction('right');const changed=Number(await s.page.locator('#gym-ui .music-volume').inputValue());assert.ok(changed>initialVolume);
  const selectedSettings=JSON.parse((await settings(s.page)).music);assert.equal(selectedSettings.volume,changed/100);assert.equal((await settings(s.page)).fx,fxBefore);
  await s.choose('#gym-ui .music-toggle');assert.equal(JSON.parse((await settings(s.page)).music).muted,true);await s.shot('music-settings-muted');
  await s.resume();await silence(s.page,'muted exploration');checks.push('Music volume and mute use real menu navigation and leave FX preference unchanged');
  await s.page.reload();await s.ready();assert.equal((await probe(s.page)).contexts.length,0);await s.gesture();await silence(s.page,'muted reload');
  await s.pause();assert.equal(Number(await s.page.locator('#gym-ui .music-volume').inputValue()),changed);assert.equal(await s.page.locator('#gym-ui .music-toggle').getAttribute('aria-pressed'),'true');
  await s.choose('#gym-ui .music-toggle');await s.resume();await wait(s.page,()=>__musicProbe.snapshot().started>2);audioEvidence(await measure(s.page),await probe(s.page),'home');checks.push('Music preferences persist after reload and a real gesture restarts playback');
  if(mobile){
   await s.page.setViewportSize({width:390,height:844});await s.page.locator('#rotate-prompt').waitFor({state:'visible'});await silence(s.page,'portrait');await s.page.screenshot({path:`${output}/mobile-portrait-muted.png`});
   await s.page.setViewportSize({width:568,height:320});await s.resume();await wait(s.page,()=>__musicProbe.snapshot().contexts.some(c=>c.activeSources>0));audioEvidence(await measure(s.page),await probe(s.page),'home');checks.push('Real portrait viewport stops audio until explicit landscape resume');
  }
  await s.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await silence(s.page,'hidden document');
  await s.page.evaluate(()=>{delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
  await s.resume();audioEvidence(await measure(s.page),await probe(s.page),'home');checks.push('Simulated visibility loss silences native audio; explicit resume restores it');
  const contextIds=(await probe(s.page)).contexts.map(c=>c.id);
  await s.hold('down',400);await s.ready('neighborhood');await s.track('city');
  const citySound=audioEvidence(await measure(s.page),await probe(s.page),'city');assert.deepEqual((await probe(s.page)).contexts.map(c=>c.id),contextIds,'A scene change reuses the music transport, without layered contexts.');
  await s.pause();await s.shot('city-after-home');await s.resume();const destroyed=await teardown(s,'pagehide');
  checks.push('Real home→city door selects city score with the same transport');checks.push('Pagehide disposes transport, timers and oscillators');
  report.cases.push({name:`lifecycle-${mobile?'mobile':'desktop'}`,checks,initialSound,citySound,volumePersisted:changed,fxPreferenceUnchanged:true,destroyed});
 }catch(error){await s.page.screenshot({path:`${output}/failure-lifecycle-${mobile?'mobile':'desktop'}.png`}).catch(()=>{});throw error;}finally{await s.context.close();}
}

async function effects(mobile){
 console.log(`MUSIC effects ${mobile?'mobile':'desktop'}`);const s=await setup({id:'bout',place:'sparring',entry:'sparring',point:[210,585]},mobile,{music:{muted:true,volume:.25},fx:{muted:false,volume:.35}});
 try{
  await s.gesture();await s.choose('#sparring-ui .primary-button');await wait(s.page,()=>document.querySelector('#sparring-ui').dataset.phase==='running');
  const bell=await measure(s.page,550),afterBell=await probe(s.page);const fxContext=afterBell.contexts.find(c=>c.starts>0);
  assert.ok(fxContext&&bell.some(s=>s.id===fxContext.id&&s.rms>1e-5),'Muted music does not suppress the real start bell.');
  await s.pause();await s.page.locator('#sparring-ui .music-controls').waitFor({state:'visible'});
  await s.choose('#sparring-ui .audio-button');assert.equal(JSON.parse((await settings(s.page)).fx).muted,true);
  assert.equal(JSON.parse((await settings(s.page)).music).muted,true);
  await s.choose('#sparring-ui .music-toggle');assert.equal(JSON.parse((await settings(s.page)).music).muted,false);
  assert.equal(JSON.parse((await settings(s.page)).fx).muted,true);await s.shot('independent-music-fx');await s.resume();
  const music=audioEvidence(await measure(s.page),await probe(s.page),'bout');const after=await probe(s.page);
  assert.equal(after.contexts.find(c=>c.id===fxContext.id).starts,fxContext.starts,'Muted effects schedule no further sources while music plays.');
  assert.ok(music.levels.some(c=>c.id!==fxContext.id),'The musical audio remains audible independently of the muted FX context.');
  report.cases.push({name:`independent-fx-${mobile?'mobile':'desktop'}`,bellWithMusicMuted:bell.filter(s=>s.rms>1e-5),musicWithFxMuted:music,independentStorage:true});
 }catch(error){await s.page.screenshot({path:`${output}/failure-effects-${mobile?'mobile':'desktop'}.png`}).catch(()=>{});throw error;}finally{await s.context.close();}
}
try{
 const devices=process.env.MUSIC_DEVICE==='mobile'?[true]:process.env.MUSIC_DEVICE==='desktop'?[false]:[false,true];
 for(const mobile of devices){
  if(!process.env.MUSIC_CASE||process.env.MUSIC_CASE==='lifecycle')await lifecycle(mobile);
  if(!process.env.MUSIC_CASE||process.env.MUSIC_CASE==='themes')for(const config of themeCases.filter(c=>(!process.env.MUSIC_THEME||process.env.MUSIC_THEME===c.id)&&(!mobile||['gym','casino','cuba','mexico'].includes(c.id))))await theme(config,mobile);
  if(!process.env.MUSIC_CASE||process.env.MUSIC_CASE==='effects')await effects(mobile);
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await browser.close();const suffix=[process.env.MUSIC_CASE,process.env.MUSIC_DEVICE,process.env.MUSIC_THEME].filter(Boolean).map(s=>`-${s}`).join('');fs.writeFileSync(`${output}/results${suffix}.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
