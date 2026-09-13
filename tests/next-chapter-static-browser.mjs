// Exercise the compiled game beneath the GitHub Pages subdirectory, without
// another HTTP server or DEV hooks. Fixtures supply past progress, never the
// technique, travel payment, sleep or return exercised below.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, wait, fit, joyPoint, buttonPoint, dispatch } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';
import { NEXT_FIGHT_IDS, CUBA_RETURN_SPAWN } from '../src/game/NextChapterRules.js';

const remote=Boolean(process.env.SPARRING_URL),base=process.env.SPARRING_URL??'http://next-chapter.local/BoxeurDeux-D/',dist=path.resolve('dist');
const outputPrefix=remote?'next-static-public':'next-static';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
const browser=await chromium.launch({headless:true}),contexts=new Set(),resources=new Set();
const report={date:new Date().toISOString(),url:base,production:true,remote,emulatedMobile:true,cases:[],errors:[],failure:null};
let currentPage;
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
function fixture(location){
  const p=new CareerProfile({storage:null});
  p.recordFight({opponent:'beton',winner:'player'});p.recordFight({opponent:'kramer',winner:'player'});
  for(let i=0;i<14;i++){if(!p.canStartActivity('delivery').ok)p.sleep();p.startDelivery();for(const id of DELIVERY_STOPS)p.deliverParcel(id,{tip:2});}
  p.startTournament();p.recordTournamentFight({opponent:'bellini',matchId:p.tournamentStatus().currentMatchId,winner:'remi'});p.leaveTournament();
  p.sleep();p.spendEnergy('sparring');p.setLocation(location);
  return p;
}
function legacyText(profile){
  const p=profile.snapshot();p.version=3;delete p.cuba;delete p.techniques;for(const id of NEXT_FIGHT_IDS)delete p.fights[id];
  return JSON.stringify(p);
}
async function open(profile,scene,mobile){
  const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile});contexts.add(context);
  await context.addInitScript(({key,text})=>{if(!localStorage.getItem(key))localStorage.setItem(key,text);},{key:CAREER_STORAGE_KEY,text:legacyText(profile)});
  const page=await context.newPage();currentPage=page;page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('requestfailed',r=>report.errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  if(remote)page.on('response',response=>{
    const u=new URL(response.url()),b=new URL(base);
    if(u.origin===b.origin&&u.pathname.startsWith(b.pathname)){resources.add(decodeURIComponent(u.pathname.slice(b.pathname.length))||'index.html');if(response.status()>=400)report.errors.push(`${response.status()}: ${u}`);}
  });
  else await page.route('**/*',async route=>{
    const u=new URL(route.request().url()),b=new URL(base);
    if(u.origin!==b.origin||!u.pathname.startsWith(b.pathname)){report.errors.push(`Outside deployed directory: ${u}`);await route.abort();return;}
    const name=decodeURIComponent(u.pathname.slice(b.pathname.length))||'index.html',file=path.resolve(dist,name);assert.ok(file.startsWith(dist+path.sep));
    try{await route.fulfill({status:200,body:await readFile(file),contentType:mime[path.extname(file)]??'application/octet-stream'});resources.add(name);}
    catch{report.errors.push(`Missing compiled resource: ${name}`);await route.fulfill({status:404,body:'Not found'});}
  });
  const cdp=mobile?await context.newCDPSession(page):null;
  const root=()=>page.evaluate(()=>['gym','shadow','sparring','bag','rhythm'].map(id=>`#${id}-ui`).find(id=>{const e=document.querySelector(id);return e&&!e.hidden&&e.getClientRects().length;}));
  const tap=async selector=>{const point=await buttonPoint(page,selector);assert.ok(point.x>=0&&point.y>=0&&point.x<page.viewportSize().width&&point.y<page.viewportSize().height);await dispatch(cdp,'touchStart',[point]);await dispatch(cdp,'touchEnd');};
  const confirm=async()=>mobile?tap(`${await root()} [data-pad-button="a"]`):page.keyboard.press('KeyE');
  const back=async()=>mobile?tap(`${await root()} [data-pad-button="b"]`):page.keyboard.press('Escape');
  const press=async direction=>mobile?dispatch(cdp,'touchStart',[await joyPoint(page,await root(),direction)]):page.keyboard.down({up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'}[direction]);
  const release=async direction=>mobile?dispatch(cdp,'touchEnd'):page.keyboard.up({up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'}[direction]);
  const move=async(direction,ms)=>{await press(direction);await page.waitForTimeout(ms);await release(direction);await page.waitForTimeout(90);};
  const select=async(selector,{activate=true}={})=>{for(let i=0;i<45;i++){if(await page.locator(selector).evaluate(e=>e===document.activeElement)){if(activate)await confirm();return;}await move('down',25);}assert.fail(`Cannot select ${selector}`);};
  const walkScene=async(direction,scene)=>{await press(direction);try{await wait(page,scene=>document.querySelector('#stage').dataset.scene===scene,scene,18000);}finally{await release(direction);}await page.waitForTimeout(100);};
  // Follow movement through the normal pause save (the autosave is periodic),
  // never write a position or rely on a DEV scene object. Routes are clear waypoints.
  const walkAxis=async(axis,target)=>{
    let previous=null,stalled=0;
    for(let i=0;i<65;i++){
      const p=(await saved(page)).location,value=p[axis],distance=target-value;if(Math.abs(distance)<=18)return;
      if(previous!==null&&Math.abs(previous-value)<2)stalled++;else stalled=0;
      assert.ok(stalled<5,`Walk blocked at ${JSON.stringify(p)} towards ${axis}=${target}`);previous=value;
      const direction=axis==='x'?(distance>0?'right':'left'):(distance>0?'down':'up');
      await move(direction,Math.max(60,Math.min(240,Math.abs(distance)/260*1000)));
      await pause();await wait(page,()=>document.querySelector('#gym-ui').dataset.mode==='paused');
      await back();await wait(page,()=>document.querySelector('#gym-ui').dataset.mode==='walking');
    }
    assert.fail(`Did not reach ${axis}=${target}`);
  };
  const punch=async kind=>mobile?tap(`#shadow-ui [data-pad-button="${kind==='jab'?'a':'b'}"]`):page.keyboard.press(kind==='jab'?'KeyJ':'KeyK');
  const pause=async()=>mobile?tap(`${await root()} .console-menu-button`):page.keyboard.press('KeyP');
  const close=async()=>{await context.close();contexts.delete(context);};
  await page.goto(`${base}?scene=${scene}`);
  return {page,context,mobile,cdp,root,tap,confirm,back,move,select,walkScene,walkAxis,punch,pause,close};
}
async function ready(c,scene,overlay='gym'){
  await wait(c.page,({scene,overlay})=>document.querySelector('#stage')?.dataset.scene===scene&&document.querySelector(`#${overlay}-ui .console-menu-button`),{scene,overlay},45000);
  await c.page.locator('#scene-loading').waitFor({state:'hidden'});await c.page.waitForTimeout(120);
  assert.equal(await c.page.evaluate(()=>['__gym','__exploration','__hotel','__hotelActivity','__shadow','__sparring','__cuba'].some(key=>window[key]!==undefined)),false,'Production must not expose scene hooks');
}
async function capture(c,name,{menu=false}={}){
  const root=await c.root(),geometry=await fit(c.page,root,c.mobile,menu);assert.ok(geometry.noScroll&&geometry.fits);assert.ok(Math.abs(geometry.ratio-16/9)<.002);
  if(c.mobile)assert.ok(geometry.controls.every(button=>button.outside&&button.fits));else assert.equal(geometry.controls.length,0);
  if(menu){const panels=await c.page.evaluate(()=>{const c=document.querySelector('#stage').getBoundingClientRect();return [...document.querySelectorAll('#stage [role="dialog"]')].filter(e=>!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return{fits:r.left>=c.left-1&&r.top>=c.top-1&&r.right<=c.right+1&&r.bottom<=c.bottom+1,overflow:e.scrollWidth>e.clientWidth+1};});});assert.ok(panels.length&&panels.every(p=>p.fits&&!p.overflow),`Dialog geometry: ${JSON.stringify(panels)}`);}
  await c.page.screenshot({path:`docs/${outputPrefix}-${name}.png`});return geometry;
}
async function learn(mobile){
  const label=mobile?'mobile':'desktop',seed=fixture({scene:'gym',x:1038,y:618,facing:'up'}),c=await open(seed,'gym',mobile);await ready(c,'gym');
  assert.equal((await saved(c.page)).version,4);assert.equal((await saved(c.page)).techniques.doubleJab,false);
  await c.confirm();await c.page.locator('[data-gym-action="friend-drill-doubleJab"]').waitFor();await c.select('[data-gym-action="friend-drill-doubleJab"]');await ready(c,'shadow','shadow');
  assert.equal((await saved(c.page)).daily.energy,seed.dailyStatus().energy);await c.select('.shadow-start-button');
  await wait(c.page,()=>document.querySelector('#shadow-ui').dataset.phase==='running');assert.equal((await saved(c.page)).daily.energy,seed.dailyStatus().energy-10);
  const idle=()=>wait(c.page,()=>['En garde, à votre rythme','Crochet prêt','Direct prêt'].includes(document.querySelector('.shadow-movement')?.textContent));
  for(let series=1;series<=3;series++){
    for(const kind of ['jab','jab','cross']){
      await idle();await c.punch(kind);
      await wait(c.page,word=>document.querySelector('.shadow-movement')?.textContent===word,kind==='jab'?'Jab gauche':'Direct droit');
    }
    await wait(c.page,n=>document.querySelector('.shadow-mentor-progress')?.textContent.includes(`${n} / 3`),series);
    if(series<3)assert.equal((await saved(c.page)).techniques.doubleJab,false,'An unfinished drill does not teach the permanent technique');
    if(series===2){await idle();await c.pause();await wait(c.page,()=>document.querySelector('#shadow-ui').dataset.phase==='paused');const note=await c.page.locator('.shadow-mentor-progress').textContent();await c.page.waitForTimeout(250);assert.equal(await c.page.locator('.shadow-mentor-progress').textContent(),note);await c.select('.shadow-start-button');}
    else if(series<3)await c.page.waitForTimeout(1050); // Separate complete series; no accidental fourth jab.
    if(series===3&&mobile){
      await c.pause();await wait(c.page,()=>document.querySelector('#shadow-ui').dataset.phase==='paused',null,1000);
      assert.equal((await saved(c.page)).techniques.doubleJab,true,'Third contact must already be saved');
      await c.select('.career-journal-open');await c.select('[data-journal-page="techniques"]');
      assert.match(await c.page.locator('.journal-entries').textContent(),/Double jab · direct — appris/);
      await capture(c,'third-contact-paused-mobile',{menu:true});
    }
  }
  if(!mobile){
    await wait(c.page,()=>document.querySelector('#shadow-ui').dataset.phase==='finished');
    assert.equal(await c.page.locator('[data-shadow-stat="punches"]').innerText(),'9');assert.equal(await c.page.locator('[data-shadow-stat="combos"]').innerText(),'3');
    await capture(c,`octopus-double-jab-${label}`,{menu:true});await c.select('.shadow-return-button');await ready(c,'gym');
  }
  let p=await saved(c.page);assert.equal(p.techniques.doubleJab,true);assert.deepEqual(p.stats,seed.snapshot().stats);assert.equal(p.daily.energy,seed.dailyStatus().energy-10);
  await c.page.reload();await ready(c,'gym');
  p=await saved(c.page);assert.equal(p.techniques.doubleJab,true);assert.equal(p.daily.energy,seed.dailyStatus().energy-10);
  await c.pause();await c.select('.career-journal-open');await c.select('[data-journal-page="techniques"]');
  assert.match(await c.page.locator('.journal-entries').textContent(),/Double jab · direct — appris/);assert.match(await c.page.locator('.journal-entries').textContent(),mobile?/A → A → B/:/J → J → K/);
  await capture(c,`learned-journal-${label}`,{menu:true});await c.back();
  report.cases.push({name:`learn-double-jab-${label}`,v3Migrated:true,actualPunches:9,actualSeries:3,firstTwoUnlearned:true,cost:10,pausedBetweenSeries:true,pausedAtThirdContact:mobile,reloadedBeforeCelebrationFinished:mobile,reloadPreserved:true,statsUnchanged:true});
  await c.close();
}
async function voyage(mobile){
  const label=mobile?'mobile':'desktop',seed=fixture({...CUBA_RETURN_SPAWN,facing:'up'}),c=await open(seed,'riverside',mobile);await ready(c,'riverside');
  await c.confirm();await c.page.locator('[data-gym-action="confirm-cuba"]').waitFor();await capture(c,`agency-offer-${label}`,{menu:true});
  await c.select('[data-gym-action="confirm-cuba"]',{activate:false});
  if(mobile){const p=await buttonPoint(c.page,'#gym-ui [data-pad-button="a"]');await dispatch(c.cdp,'touchStart',[p]);await c.page.waitForTimeout(600);await dispatch(c.cdp,'touchEnd');}
  else{await c.page.keyboard.down('KeyE');await c.page.waitForTimeout(300);await c.page.keyboard.down('KeyE');await c.page.waitForTimeout(300);await c.page.keyboard.up('KeyE');}
  await ready(c,'cuba-home');let p=await saved(c.page);const feeMoney=seed.moneyStatus().money-160;
  assert.equal(p.wallet.money,feeMoney);assert.equal(p.cuba.entries,1);assert.equal(p.cuba.active.id,1);assert.deepEqual(p.daily,seed.snapshot().daily);assert.deepEqual(p.stats,seed.snapshot().stats);
  await c.page.reload();await ready(c,'cuba-home');p=await saved(c.page);assert.equal(p.wallet.money,feeMoney);assert.equal(p.cuba.entries,1);
  await c.walkAxis('x',805);await c.walkAxis('y',400);await c.confirm();await c.page.locator('[data-gym-action="sleep"]').waitFor();await c.select('[data-gym-action="sleep"]');
  await wait(c.page,()=>document.querySelector('#gym-dialog-title')?.textContent.startsWith('Bon matin'));p=await saved(c.page);
  assert.equal(p.daily.day,seed.dailyStatus().day+1);assert.equal(p.daily.energy,100);assert.equal(p.wallet.money,feeMoney);assert.equal(p.cuba.active.id,1);assert.deepEqual(p.stats,seed.snapshot().stats);
  await capture(c,`cuba-morning-${label}`,{menu:true});await c.back();await c.page.reload();await ready(c,'cuba-home');
  await c.walkScene('down','cuba-village');await ready(c,'cuba-village');
  await c.walkAxis('x',690);await c.walkAxis('y',885);await c.walkAxis('x',440);await c.confirm();
  await c.page.locator('[data-gym-action="leave-cuba"]').waitFor();await capture(c,`included-return-${label}`,{menu:true});await c.select('[data-gym-action="leave-cuba"]');await ready(c,'riverside');
  p=await saved(c.page);assert.equal(p.cuba.active,null);assert.equal(p.cuba.history.length,1);assert.equal(p.wallet.money,feeMoney);assert.equal(p.daily.energy,100);assert.equal(p.fights.louisto.attempts,0,'Returning does not require fighting or winning');
  await c.page.reload();await ready(c,'riverside');assert.equal((await saved(c.page)).cuba.history.length,1);assert.equal((await saved(c.page)).wallet.money,feeMoney);
  // Direct game URLs exercise the same production access gates. Physical
  // Montreal routes are independently covered by world-flow/static suites.
  for(const opponent of ['lefeu','dyrex']){
    await c.page.goto(`${base}?scene=fight&opponent=${opponent}`);await ready(c,'sparring','sparring');
    await wait(c.page,()=>document.querySelector('#sparring-ui').dataset.phase==='ready');
    assert.equal(await c.page.locator('#sparring-ui .primary-button').isDisabled(),false);
    assert.match(await c.page.locator('.round-panel').textContent(),opponent==='dyrex'?/Dyrex/:/Le Feu/);
    await capture(c,`free-${opponent}-${label}`,{menu:true});
    const after=await saved(c.page);assert.equal(after.wallet.money,feeMoney);assert.equal(after.daily.energy,100);assert.equal(after.fights.dyrex.wins,0);assert.equal(after.fights.lefeu.wins,0);
  }
  report.cases.push({name:`cuba-paid-sleep-return-${label}`,v3Migrated:true,fee:160,heldConfirmationChargedOnce:true,reloadPreserved:true,sleepOnlyEnergyAndDay:true,returnIncluded:true,noLouistoPrerequisite:true,lefeuThenDyrexAvailable:true});
  await c.close();
}
try{
  for(const mobile of (process.env.NEXT_STATIC_MOBILE==='1'?[true]:process.env.NEXT_STATIC_MOBILE==='0'?[false]:[false,true]))for(const [id,run]of Object.entries({learn,voyage}))if(!process.env.NEXT_STATIC_CASE||process.env.NEXT_STATIC_CASE===id)await run(mobile);
  assert.ok([...resources].some(p=>/PixelifySans.*\.ttf$/.test(p)));assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:`docs/${outputPrefix}-failure.png`}).catch(()=>{});}
finally{
  for(const context of contexts)await context.close();await browser.close();report.resources=[...resources].sort();report.loadedResources=resources.size;
  await writeFile(`docs/${outputPrefix}-${process.env.NEXT_STATIC_CASE?`${process.env.NEXT_STATIC_CASE}-`:''}${process.env.NEXT_STATIC_MOBILE==='1'?'mobile-':process.env.NEXT_STATIC_MOBILE==='0'?'desktop-':''}results.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,failure:report.failure,loadedResources:resources.size},null,2));
