import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, wait, fit, dispatch, joyPoint, buttonPoint, suppressHotReload } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';
const url=process.env.GAME_URL??'http://127.0.0.1:5173/';
const report={date:new Date().toISOString(),url,mobileEmulated:true,cases:[],errors:[]};
const browser=await chromium.launch({headless:true});let page;
function fixture(place){const p=new CareerProfile({storage:null});p.recordFight({opponent:'beton',winner:'player'});p.recordFight({opponent:'kramer',winner:'player'});
  for(let i=0;i<24;i++){if(p.dailyStatus().energy<30)p.sleep();p.startDelivery();for(const stop of DELIVERY_STOPS)p.deliverParcel(stop,{tip:2});}
  p.startTournament();const t=p.tournamentStatus();p.recordTournamentFight({opponent:t.opponent,matchId:t.currentMatchId,winner:'remi'});p.leaveTournament();
  p.setLocation({scene:place,x:640,y:place==='airport'?435:490,facing:'up'});return p;}
const state=page=>page.evaluate(()=>{const m=window.__metro;if(!m?.scene.sys.isActive())return null;return{place:m.scene.place,x:m.world.state.x,y:m.world.state.y,paused:m.world.state.paused,dialog:Boolean(m.ui.dialog),train:m.train?.snapshot(),doorAmount:m.scene.doorAmount};});
async function ready(place){await wait(page,place=>window.__metro?.scene.sys.isActive()&&window.__metro.scene.place===place,place,45000);await page.locator('#scene-loading').waitFor({state:'hidden'});}
async function controls(mobile){const cdp=mobile?await page.context().newCDPSession(page):null;
  const tap=async selector=>{if(!mobile)return page.locator(selector).click();await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');};
  const hold=async(direction,ms)=>{const code={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'}[direction];if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',direction)]);else await page.keyboard.down(code);await page.waitForTimeout(ms);if(mobile)await dispatch(cdp,'touchEnd');else await page.keyboard.up(code);await page.waitForTimeout(35);};
  const confirm=async()=>mobile?tap('#gym-ui [data-pad-button=a]'):page.keyboard.press('KeyE');
  const choose=async selector=>{await page.locator(selector).waitFor({state:'visible'});for(let i=0;i<30;i++){if(await page.locator(selector).evaluate(e=>e===document.activeElement)){await confirm();await page.waitForTimeout(90);return;}await hold('down',40);}throw Error(`Could not select ${selector}`);};
  const axis=async(axis,target)=>{const place=(await state(page))?.place;for(let i=0;i<70;i++){const s=await state(page);if(!s||s.place!==place||s.dialog)return;const d=target-s[axis];if(Math.abs(d)<8)return;await hold(axis==='x'?(d>0?'right':'left'):(d>0?'down':'up'),Math.min(250,Math.max(30,Math.abs(d)/220*850)));}throw Error(`Stuck moving ${axis} ${target}: ${JSON.stringify(await state(page))}`);};
  return{hold,confirm,choose,axis,tap,pause:()=>mobile?tap('#gym-ui .console-menu-button'):page.keyboard.press('KeyP'),back:()=>mobile?tap('#gym-ui [data-pad-button=b]'):page.keyboard.press('Escape')};}
async function capture(name,mobile){const layout=await fit(page,'#gym-ui',mobile);assert.ok(layout.fits&&layout.noScroll);assert.ok(Math.abs(layout.ratio-16/9)<.002);assert.equal(layout.controls.length===0,!mobile);for(const c of layout.controls)assert.ok(c.fits&&c.outside);await page.screenshot({path:`docs/metro-${name}-${mobile?'mobile':'desktop'}.png`});report.cases.push({name,mobile,layout,state:await state(page)});}
async function contextFor(mobile,place){const seed=fixture(place);const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});await suppressHotReload(context);
  await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:CAREER_STORAGE_KEY,value:seed.exportText()});
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});await page.goto(`${url}?scene=${place}`);await ready(place);return{context,seed};}
try{
  for(const mobile of [false,true].filter(mobile=>!process.env.METRO_DEVICE||process.env.METRO_DEVICE===(mobile?'mobile':'desktop'))){
    const {context,seed}=await contextFor(mobile,'metro-station'),c=await controls(mobile);
    await capture('platform',mobile);await c.pause();await c.choose('.metro-plan-button');await page.locator('.metro-network-map').waitFor({state:'visible'});
    assert.equal(await page.locator('.metro-network-map li').count(),5);await capture('network-map',mobile);await c.back();assert.equal((await state(page)).paused,true);await c.choose('.gym-resume-button');
    await c.hold('up',780);await ready('metro-train');await capture('train-open',mobile);
    await wait(page,()=>__metro.train.state.phase==='moving',null,15000);await c.pause();const frozen=await state(page);await page.waitForTimeout(1100);assert.deepEqual((await state(page)).train,frozen.train);
    await c.choose('.gym-resume-button');await page.waitForTimeout(450);await capture('train-moving',mobile);
    await wait(page,()=>__metro.train.station.id==='metro-riverside'&&__metro.train.doorsOpen,null,10000);
    // Deliberately stay aboard at Des Rives. There is no automatic destination teleport.
    await wait(page,()=>__metro.train.station.id==='metro-island'&&__metro.train.doorsOpen,null,15000);
    await c.hold('up',850);await ready('metro-island');assert.equal((await state(page)).place,'metro-island');
    await c.pause();await c.choose('.metro-plan-button');await c.choose('[data-gym-action=direction-backward]');assert.equal((await state(page)).paused,true);await c.choose('.gym-resume-button');
    await c.hold('up',650);await ready('metro-train');assert.equal((await state(page)).train.direction,-1);
    await wait(page,()=>__metro.train.state.phase==='moving',null,15000);
    if(mobile){await page.setViewportSize({width:390,height:844});await page.locator('#rotate-prompt').waitFor({state:'visible'});const portrait=(await state(page)).train;await page.waitForTimeout(600);assert.deepEqual((await state(page)).train,portrait);await page.setViewportSize({width:568,height:320});await page.locator('#rotate-prompt').waitFor({state:'hidden'});await c.choose('.gym-resume-button');}
    await page.evaluate(()=>history.replaceState(null,'',location.pathname));await page.reload();if(await page.locator('.career-continue').isVisible())await page.locator('.career-continue').click();await ready('metro-island');
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);assert.equal(saved.wallet.money,seed.moneyStatus().money);assert.deepEqual(saved.daily,seed.dailyStatus());
    report.cases.push({name:'route-choice-pause-reload',mobile,passedStop:'metro-riverside',chosenStop:'metro-island',oppositeDirection:true,reloadOnLastPlatform:true,free:true});await context.close();
    const airport=await contextFor(mobile,'airport'),a=await controls(mobile),startMoney=airport.seed.moneyStatus().money;
    await capture('airport',mobile);await a.axis('y',344);await a.confirm();await a.choose('[data-gym-action=ticket-cuba]');await a.choose('[data-gym-action=reserve-cuba]');await a.back();
    await a.confirm();await a.choose('[data-gym-action=ticket-mexico]');await a.choose('[data-gym-action=reserve-mexico]');await a.back();
    let paid=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);assert.equal(paid.wallet.money,startMoney-320);assert.ok(paid.cuba.reserved&&paid.mexico.reserved);assert.equal(paid.cuba.active,null);assert.equal(paid.mexico.active,null);
    await a.axis('y',420);await a.axis('x',320);await a.hold('up',900);await wait(page,()=>document.querySelector('#stage').dataset.scene==='cuba-home',null,45000);await page.locator('#scene-loading').waitFor({state:'hidden'});
    paid=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);assert.ok(paid.cuba.active);assert.ok(paid.mexico.reserved);assert.equal(paid.wallet.money,startMoney-320);
    report.cases.push({name:'airport-reserves-both-physical-boarding',mobile,paid:320,boardingFree:true,destination:'cuba-home'});await airport.context.close();
  }
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);await page?.screenshot({path:'docs/metro-browser-failure.png'}).catch(()=>{});}
finally{await browser.close();fs.writeFileSync(`docs/metro-${process.env.METRO_DEVICE?process.env.METRO_DEVICE+'-':''}browser-results.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,failure:report.failure},null,2));
