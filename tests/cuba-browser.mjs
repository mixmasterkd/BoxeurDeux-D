import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,wait,fit,dispatch,joyPoint,buttonPoint,suppressHotReload} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {DELIVERY_STOPS} from '../src/game/ChapterRules.js';
const url=process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true}),contexts=new Set();
const report={date:new Date().toISOString(),url,mobileEmulated:true,cases:[],errors:[],failure:null};
let activePage;
function fixture(){
  const p=new CareerProfile({storage:null});p.recordFight({opponent:'beton',winner:'player'});p.recordFight({opponent:'kramer',winner:'player'});
  for(let i=0;i<14;i++){if(p.dailyStatus().energy<30)p.sleep();assert.equal(p.startDelivery().ok,true);for(const id of DELIVERY_STOPS)assert.equal(p.deliverParcel(id,{tip:2}).ok,true);}
  assert.equal(p.startTournament().ok,true);const run=p.tournamentStatus();assert.equal(p.recordTournamentFight({opponent:run.opponent,matchId:run.currentMatchId,winner:'remi'}).ok,true);assert.equal(p.leaveTournament().ok,true);p.sleep();
  p.setLocation({scene:'riverside',x:1520,y:760,facing:'up'});return p;
}
const saved=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
const current=p=>p.evaluate(()=>{const active=[window.__cuba,window.__exploration].find(v=>v?.scene.sys.isActive());return active?{place:active.scene.place,...active.world.state,dialog:Boolean(active.ui.dialog)}:null;});
async function ready(p,place){
  await wait(p,place=>document.querySelector('#stage')?.dataset.scene===place,place,45000);
  await p.locator('#scene-loading').waitFor({state:'hidden'});await p.waitForTimeout(300);
}
async function controller(p,mobile){
  const cdp=mobile?await p.context().newCDPSession(p):null;
  const root=()=>p.evaluate(()=>['gym','bag','rhythm','shadow','sparring'].map(id=>`#${id}-ui`).find(id=>{const e=document.querySelector(id);return e&&!e.hidden&&e.getClientRects().length;}));
  const tap=async selector=>{if(!mobile)return p.locator(selector).click();await dispatch(cdp,'touchStart',[await buttonPoint(p,selector)]);await dispatch(cdp,'touchEnd');};
  const hold=async(direction,ms)=>{const key={left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS'}[direction];if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(p,await root(),direction)]);else await p.keyboard.down(key);await p.waitForTimeout(ms);if(mobile)await dispatch(cdp,'touchEnd');else await p.keyboard.up(key);await p.waitForTimeout(25);};
  const confirm=async()=>mobile?tap(`${await root()} [data-pad-button="a"]`):p.keyboard.press('KeyE');
  const back=async()=>mobile?tap(`${await root()} [data-pad-button="b"]`):p.keyboard.press('Escape');
  const select=async selector=>{await p.locator(selector).waitFor({state:'visible'});for(let n=0;n<28;n++){if(await p.evaluate(s=>document.activeElement?.matches(s),selector)){await confirm();return;}await hold('down',40);}throw Error(`Menu selection unreachable: ${selector}`);};
  const axis=async(axis,value)=>{
    const initial=await current(p);for(let n=0;n<160;n++){
      const state=await current(p);if(!state||state.place!==initial.place||state.dialog)return;
      const distance=value-state[axis];if(Math.abs(distance)<9)return;
      await hold(axis==='x'?distance>0?'right':'left':distance>0?'down':'up',Math.max(24,Math.min(230,Math.abs(distance)/260*800)));
    }throw Error(`Blocked ${axis}=${value} at ${JSON.stringify(await current(p))}`);
  };
  const bodyPunch=async()=>{if(mobile){const held=await joyPoint(p,await root(),'down',1),hand=await buttonPoint(p,`${await root()} [data-pad-button="b"]`,2);await dispatch(cdp,'touchStart',[held]);await dispatch(cdp,'touchStart',[held,hand]);await dispatch(cdp,'touchEnd',[held]);await dispatch(cdp,'touchEnd');}else{await p.keyboard.down('KeyS');await p.keyboard.press('KeyK');await p.keyboard.up('KeyS');}};
  return{root,tap,hold,axis,confirm,back,select,bodyPunch,pause:async()=>mobile?tap(`${await root()} .console-menu-button`):p.keyboard.press('KeyP'),
    punch:async(kind='jab')=>mobile?tap(`${await root()} [data-pad-button="${kind==='jab'?'a':'b'}"]`):p.keyboard.press(kind==='jab'?'KeyJ':'KeyK')};
}
async function capture(p,c,mobile,name,{menu=false}={}){
  const geometry=await fit(p,await c.root(),mobile,menu);assert.ok(geometry.fits&&geometry.noScroll);assert.ok(Math.abs(geometry.ratio-16/9)<.002);
  assert.equal(geometry.controls.length===0,!mobile);for(const b of geometry.controls)assert.ok(b.fits&&b.outside);
  if(menu){const boxes=await p.evaluate(()=>{const c=document.querySelector('canvas').getBoundingClientRect();return [...document.querySelectorAll('#stage [role="dialog"]')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect();return{fits:r.left>=c.left-2&&r.right<=c.right+2&&r.top>=c.top-2&&r.bottom<=c.bottom+2,noOverflow:e.scrollWidth<=e.clientWidth+2};});});assert.ok(boxes.length);for(const b of boxes)assert.ok(b.fits&&b.noOverflow);}
  await p.screenshot({path:`docs/cuba-${name}-${mobile?'mobile':'desktop'}.png`});report.cases.push({name:`${name}-${mobile?'mobile':'desktop'}`,geometry});console.log(`Cuba: ${name}-${mobile?'mobile':'desktop'}`);
}
async function run(mobile){
  const seed=fixture(),context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});contexts.add(context);await suppressHotReload(context);
  await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:CAREER_STORAGE_KEY,value:seed.exportText()});
  const p=await context.newPage();activePage=p;p.setDefaultTimeout(45000);const c=await controller(p,mobile);
  p.on('pageerror',e=>report.errors.push(e.stack??e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await p.goto(`${url}?scene=riverside`);await ready(p,'riverside');await c.confirm();await capture(p,c,mobile,'voyage-confirm',{menu:true});await c.select('[data-gym-action="confirm-cuba"]');await ready(p,'cuba-home');
  const entered=await saved(p);assert.equal(entered.wallet.money,seed.moneyStatus().money-160);assert.equal(entered.daily.energy,100);assert.equal(entered.cuba.entries,1);await capture(p,c,mobile,'casa');
  await c.axis('y',686);await ready(p,'cuba-village');await c.axis('y',390);await c.axis('x',1088);await capture(p,c,mobile,'village');await c.axis('y',325);await ready(p,'cuba-gym');
  await c.axis('y',530);await c.axis('x',780);await c.axis('y',455);await capture(p,c,mobile,'gym');if(process.env.CUBA_VISUAL_ONLY){await context.close();contexts.delete(context);return;}await c.confirm();await c.select('[data-gym-action="activity-pads"]');await ready(p,'pads');
  assert.equal((await saved(p)).daily.energy,100);await c.select('.rhythm-primary');await wait(p,()=>document.querySelector('#rhythm-ui').dataset.phase==='running');await c.punch();await wait(p,()=>Number(document.querySelector('.rhythm-streak').textContent)>=1);await capture(p,c,mobile,'pads-contact');assert.equal((await saved(p)).daily.energy,90);
  await c.pause();await c.select('.rhythm-primary');await wait(p,()=>document.querySelector('#rhythm-ui').dataset.phase==='running');assert.equal((await saved(p)).daily.energy,90);await c.pause();await c.select('.rhythm-return');await ready(p,'cuba-gym');
  await c.axis('y',480);await c.axis('x',390);await c.axis('y',300);await c.axis('x',285);await c.confirm();await c.select('[data-gym-action="activity-bag"]');await ready(p,'bag');await c.select('.bag-start-button');await wait(p,()=>document.querySelector('#bag-ui').dataset.phase==='running');await c.punch();await wait(p,()=>window.__bag?.session.state.stats.contacts>=1);const bagContact=await p.evaluate(()=>{const hit=__bag.impacts.at(-1);return{pose:hit.pose,target:hit.target,distance:Math.hypot(hit.contactPoint.x-hit.targetPoint.x,hit.contactPoint.y-hit.targetPoint.y)};});assert.ok(bagContact.distance<2);await capture(p,c,mobile,'tire-bag');report.cases.at(-1).contact=bagContact;if(process.env.CUBA_CONTACT_ONLY){await p.waitForTimeout(650);await c.bodyPunch();await wait(p,()=>__bag.impacts.length>=2);const contacts=await p.evaluate(()=>__bag.impacts.map(hit=>({pose:hit.pose,target:hit.target,distance:Math.hypot(hit.contactPoint.x-hit.targetPoint.x,hit.contactPoint.y-hit.targetPoint.y)})));assert.ok(contacts.some(h=>h.target==='head')&&contacts.some(h=>h.target==='body'));for(const hit of contacts)assert.ok(hit.distance<2);await capture(p,c,mobile,'tire-contact');report.cases.at(-1).contacts=contacts;assert.equal((await saved(p)).daily.energy,75);await context.close();contexts.delete(context);return;}assert.equal((await saved(p)).daily.energy,75);await c.pause();await c.select('.bag-return-button');await ready(p,'cuba-gym');
  await c.axis('y',525);await c.axis('x',225);await c.confirm();await c.select('[data-gym-action="activity-rope"]');await ready(p,'rope');await c.select('.rhythm-primary');await wait(p,()=>document.querySelector('#rhythm-ui').dataset.phase==='running');await c.punch();await p.waitForTimeout(650);await c.punch('cross');await wait(p,()=>window.__rhythm?.session.state.stats.attempts>=2);await capture(p,c,mobile,'rope');assert.equal((await saved(p)).daily.energy,60);await c.pause();await c.select('.rhythm-return');await ready(p,'cuba-gym');
  await c.axis('x',640);await c.axis('y',686);await ready(p,'cuba-village');await c.axis('x',430);await c.axis('y',325);await ready(p,'cuba-home');await c.axis('y',530);await c.axis('x',838);await c.axis('y',380);await c.confirm();await capture(p,c,mobile,'sleep-confirm',{menu:true});await c.select('[data-gym-action="sleep"]');await wait(p,()=>document.querySelector('#gym-dialog-title')?.textContent.includes('Bon matin'));await c.back();
  const rested=await saved(p);assert.equal(rested.daily.day,entered.daily.day+1);assert.equal(rested.daily.energy,100);assert.deepEqual(rested.stats,entered.stats);assert.deepEqual(rested.cuba,entered.cuba);assert.equal(rested.wallet.money,entered.wallet.money);
  await p.evaluate(()=>history.replaceState(null,'',location.pathname));await p.reload();if(await p.locator('.career-continue').isVisible())await p.locator('.career-continue').click();await ready(p,'cuba-home');assert.equal((await saved(p)).cuba.entries,1);assert.equal((await saved(p)).wallet.money,entered.wallet.money);
  await c.axis('y',686);await ready(p,'cuba-village');await c.axis('y',520);await c.axis('x',1885);await ready(p,'cuba-beach');await capture(p,c,mobile,'beach-arrival');const startCamera=await p.evaluate(()=>({x:__cuba.scene.cameras.main.scrollX,y:__cuba.scene.cameras.main.scrollY}));
  await c.axis('x',700);await c.axis('y',790);await c.axis('x',1390);await capture(p,c,mobile,'beach-ring-map');assert.ok(await p.evaluate(x=>__cuba.scene.cameras.main.scrollX>x+300,startCamera.x));
  await c.axis('y',725);await ready(p,'sparring');await capture(p,c,mobile,'louisto-ready',{menu:true});await c.select('#sparring-ui .primary-button');await wait(p,()=>document.querySelector('#sparring-ui').dataset.phase==='running');await c.punch();await wait(p,()=>window.__sparring?.session.state.stats.thrown>=1);await capture(p,c,mobile,'louisto-fight');assert.equal((await saved(p)).daily.energy,100);await c.pause();await c.select('.return-gym-button');await ready(p,'cuba-beach');await p.waitForTimeout(500);assert.equal((await current(p)).place,'cuba-beach');
  if(mobile){await p.setViewportSize({width:390,height:844});await p.locator('#rotate-prompt').waitFor({state:'visible'});assert.equal((await current(p)).paused,true);await p.setViewportSize({width:568,height:320});await p.locator('#rotate-prompt').waitFor({state:'hidden'});await c.select('.gym-resume-button');}
  await c.axis('x',700);await c.axis('y',525);await c.axis('x',55);await ready(p,'cuba-village');await c.axis('x',700);await c.axis('y',890);await c.axis('x',429);await c.confirm();await capture(p,c,mobile,'return-confirm',{menu:true});await c.select('[data-gym-action="leave-cuba"]');await ready(p,'riverside');
  const returned=await saved(p);assert.equal(returned.cuba.active,null);assert.equal(returned.cuba.history.length,1);assert.equal(returned.cuba.history[0].returnedAtDay,rested.daily.day);assert.equal(returned.daily.energy,100);assert.equal(returned.wallet.money,entered.wallet.money);
  await c.axis('y',1380);await c.axis('x',1200);await c.axis('y',1255);await ready(p,'metro-riverside');await c.axis('y',380);await c.confirm();await c.select('[data-gym-action="take-metro"]');await ready(p,'metro-station');await c.axis('y',550);await ready(p,'neighborhood');
  report.cases.push({name:`journey-complete-${mobile?'mobile':'desktop'}`,paidOnce:160,threeRealActivities:true,energyBeforeSleep:60,sleepRefill:100,nightDoesNotAddStats:true,reloadKeepsStay:true,cameraScroll:true,louistoRealPunch:true,automaticDoorReturn:true,flightReturnIncluded:true,metroHome:true});
  await context.close();contexts.delete(context);
}
try{for(const mobile of [false,true])if(!process.env.CUBA_DEVICE||process.env.CUBA_DEVICE===(mobile?'mobile':'desktop'))await run(mobile);assert.deepEqual(report.errors,[]);}
catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(activePage&&!activePage.isClosed())await activePage.screenshot({path:'docs/cuba-browser-failure.png'}).catch(()=>{});}
finally{for(const c of contexts)await c.close();await browser.close();fs.writeFileSync(`docs/cuba-${process.env.CUBA_VISUAL_ONLY?'visual-':process.env.CUBA_CONTACT_ONLY?'contact-':''}${process.env.CUBA_DEVICE?process.env.CUBA_DEVICE+'-':''}browser-results.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,failure:report.failure},null,2));
