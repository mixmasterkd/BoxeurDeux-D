import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,wait,fit,buttonPoint,dispatch} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {DELIVERY_STOPS} from '../src/game/ChapterRules.js';
const browser=await chromium.launch({headless:true});
const url=process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const report={url,tests:[],errors:[],failure:null};
const timeout=setTimeout(()=>{report.failure='Hotel browser check exceeded 180 seconds';browser.close().catch(()=>{});},180000);
const log=(text)=>console.log(text);
function fixture(place='hotel-room'){
 const p=new CareerProfile({storage:null});p.recordFight({opponent:'beton',winner:'player',score:12});p.recordFight({opponent:'kramer',winner:'player',score:15});
 for(let i=0;i<6;i++){if(p.dailyStatus().energy<30)p.sleep();p.startDelivery();for(const id of DELIVERY_STOPS)p.deliverParcel(id,{tip:2});}
 p.sleep();assert.equal(p.startTournament().ok,true);p.setLocation({scene:place,x:640,y:540,facing:'down'});return p.snapshot();
}
const saved=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
const ready=(p,place)=>wait(p,place=>window.__hotel?.scene.place===place&&document.querySelector('#stage').dataset.scene===place,place,30000);
async function move(p,x,y){log(`walk ${x},${y} ${p.touch?'touch':'keyboard'}`);
 for(let i=0;i<90;i++){
  const s=await p.evaluate(()=>({x:window.__hotel.world.state.x,y:window.__hotel.world.state.y}));
  const dx=x-s.x,dy=y-s.y;if(Math.hypot(dx,dy)<14)return;
  const horizontal=Math.abs(dx)>Math.abs(dy),difference=horizontal?dx:dy,key=horizontal?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp');
  if(p.touch){const r=await p.locator('#gym-ui .joypad').boundingBox(),force=Math.abs(difference)<55?.45:.94;const point={id:1,x:r.x+r.width/2+(horizontal?Math.sign(dx)*r.width*.37*force:0),y:r.y+r.height/2+(!horizontal?Math.sign(dy)*r.height*.37*force:0)};await dispatch(p.touch,'touchStart',[point]);await p.waitForTimeout(Math.max(20,Math.min(120,Math.abs(difference)/250*700)));await dispatch(p.touch,'touchEnd',[]);}else{await p.keyboard.down(key);await p.waitForTimeout(Math.max(25,Math.min(130,Math.abs(difference)/250*1000*.8)));await p.keyboard.up(key);}await p.waitForTimeout(25);
 }
 throw Error(`could not walk to ${x},${y}: `+JSON.stringify(await p.evaluate(()=>window.__hotel.world.state)));
}
async function interact(p,id){
 await press(p,'KeyE');await wait(p,id=>Boolean(window.__hotel?.ui.dialog)&&(!id||document.querySelector(`[data-gym-action="${id}"]`)),id);
}
async function choose(p,id){await activate(p,`[data-gym-action="${id}"]`);}
async function activate(p,selector){log(`activate ${selector}`);if(p.touch){const point=await buttonPoint(p,selector);await dispatch(p.touch,'touchStart',[point]);await dispatch(p.touch,'touchEnd',[]);}else await p.locator(selector).click();}
async function press(p,key){if(!p.touch){await p.keyboard.press(key);return;}const root=await p.locator('#gym-ui').isVisible()?'#gym-ui':'#rhythm-ui';const selector=key==='KeyE'?`${root} [data-pad-button="a"]`:key==='KeyJ'?`${root} [data-pad-button="a"]`:key==='KeyK'?`${root} [data-pad-button="b"]`:`${root} .console-menu-button`;await activate(p,selector);}
async function lift(p,place){await interact(p,`travel-${place}`);await choose(p,`travel-${place}`);await ready(p,place);}
async function run(mobile){log(`START ${mobile?'MOBILE':'DESKTOP'}`);
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 await context.routeWebSocket('**',ws=>{const server=ws.connectToServer();server.onMessage(m=>{if(typeof m==='string'&&(/\"type\":\"(?:update|full-reload)\"/.test(m)))return;ws.send(m);});});
 const seed=fixture();await context.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));},{key:CAREER_STORAGE_KEY,seed});
 const p=await context.newPage();if(mobile)p.touch=await context.newCDPSession(p);p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 try{
  await p.goto(url,{waitUntil:'domcontentloaded'});await p.locator('.career-continue').click();await ready(p,'hotel-room');
  const initial=await saved(p);await p.screenshot({path:`docs/hotel-room-${mobile?'mobile':'desktop'}.png`});
  const layout=await fit(p,'#gym-ui',mobile);assert.ok(layout.fits&&layout.noScroll);if(mobile)assert.ok(layout.controls.every(c=>c.outside&&c.fits));else assert.equal(layout.controls.length,0);
  await move(p,895,390);await interact(p);assert.match(await p.locator('#gym-dialog-title').textContent(),/reste à faire/);await choose(p,'close');assert.deepEqual((await saved(p)).daily,initial.daily);
  await move(p,640,600);await press(p,'KeyE');await ready(p,'hotel-corridor');
  await move(p,1680,421);await p.screenshot({path:`docs/hotel-corridor-${mobile?'mobile':'desktop'}.png`});
  assert.ok(await p.evaluate(()=>window.__hotel.scene.cameras.main.scrollX>100));
  await lift(p,'hotel-gym');await move(p,726,463);await interact(p,'activity-pads');
  assert.match(await p.locator('[data-gym-action="activity-pads"]').textContent(),/10/);await choose(p,'activity-pads');
  await wait(p,()=>window.__hotelActivity?.scene.activity==='pads',null,30000);
  await p.screenshot({path:`docs/hotel-pads-ready-${mobile?'mobile':'desktop'}.png`});
  await activate(p,'.rhythm-primary');await wait(p,()=>window.__hotelActivity.session.state.phase==='running');
  assert.equal((await saved(p)).daily.energy,initial.daily.energy-10);
  await wait(p,()=>window.__hotelActivity.session.state.elapsed>=1.96);
  await press(p,'KeyJ');await p.waitForTimeout(240);
  assert.ok(await p.evaluate(()=>window.__hotelActivity.session.state.stats.hits>=1),'jab registers at target');
  await p.screenshot({path:`docs/hotel-pads-action-${mobile?'mobile':'desktop'}.png`});
  await press(p,'KeyP');const paused=await p.evaluate(()=>window.__hotelActivity.session.state.elapsed);await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>window.__hotelActivity.session.state.elapsed),paused);
  await activate(p,'.rhythm-primary');assert.equal((await saved(p)).daily.energy,initial.daily.energy-10);
  await activate(p,'.activity-exit-button');await ready(p,'hotel-gym');
  await move(p,640,606);await lift(p,'hotel-pool');await p.screenshot({path:`docs/hotel-pool-${mobile?'mobile':'desktop'}.png`});
  await move(p,62,604);await move(p,62,432);await interact(p,'activity-pool');await choose(p,'activity-pool');
  await wait(p,()=>window.__hotelActivity?.scene.activity==='pool',null,30000);await activate(p,'.rhythm-primary');
  await wait(p,()=>window.__hotelActivity.session.state.elapsed>=1.96);await press(p,'KeyJ');await p.waitForTimeout(260);
  assert.ok(await p.evaluate(()=>window.__hotelActivity.session.state.stats.hits>=1));
  await p.screenshot({path:`docs/hotel-pool-action-${mobile?'mobile':'desktop'}.png`});
  assert.equal((await saved(p)).daily.energy,initial.daily.energy-20);
  await activate(p,'.activity-exit-button');await ready(p,'hotel-pool');
  await move(p,62,604);await move(p,640,606);await lift(p,'hotel-venue');
  await p.screenshot({path:`docs/hotel-venue-entrance-${mobile?'mobile':'desktop'}.png`});
  await move(p,510,1400);await interact(p);assert.match(await p.locator('#gym-dialog-text').textContent(),/Émile Bouchard/);await choose(p,'close');
  await move(p,1152,1400);await move(p,1152,1130);await move(p,1152,500);
  await p.screenshot({path:`docs/hotel-venue-rings-${mobile?'mobile':'desktop'}.png`});
  assert.ok(await p.evaluate(()=>window.__hotel.scene.cameras.main.scrollY<350));
  await interact(p,'tournament-fight');assert.match(await p.locator('#gym-dialog-title').textContent(),/Marco Bellini/);await choose(p,'close');
  const before=await saved(p);await p.reload();await p.locator('.career-continue').click();await ready(p,'hotel-venue');assert.deepEqual((await saved(p)).location,before.location);
  if(mobile){
    await p.setViewportSize({width:390,height:844});await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>window.__hotel.world.state.paused),true);
    await p.setViewportSize({width:568,height:320});await p.waitForTimeout(250);assert.ok((await fit(p,'#gym-ui',true,true)).noScroll);
    await p.locator('.gym-resume-button').click();
    const cdp=await context.newCDPSession(p),point=await buttonPoint(p,'#gym-ui .console-menu-button');await dispatch(cdp,'touchStart',[point]);await dispatch(cdp,'touchEnd',[]);await wait(p,()=>window.__hotel.world.state.paused);
    await p.screenshot({path:'docs/hotel-menu-small-mobile.png'});
  }
  report.tests.push({mobile,layout,energy:(await saved(p)).daily.energy,rooms:['room','corridor','gym','pool','venue'],walkedWithoutEnergyCost:true});
 }finally{await context.close();}
}
try{if(process.env.HOTEL_TEST_MODE!=='mobile')await run(false);if(process.env.HOTEL_TEST_MODE!=='desktop')await run(true);assert.deepEqual(report.errors,[]);}catch(e){report.failure=e.stack;throw e;}finally{clearTimeout(timeout);fs.writeFileSync('docs/hotel-browser-results.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
