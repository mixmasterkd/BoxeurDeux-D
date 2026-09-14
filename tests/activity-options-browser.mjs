import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';
import { chromium, wait, suppressHotReload, joyPoint, fit } from './control-helpers.mjs';

const profile = new CareerProfile({ storage:null });
profile.recordFight({ opponent:'beton', winner:'player' }); profile.recordFight({ opponent:'kramer', winner:'player' });
for (let i=0;i<8;i++) { if(!profile.canStartActivity('delivery').ok) profile.sleep(); profile.startDelivery(); for(const stop of DELIVERY_STOPS) profile.deliverParcel(stop,{tip:2}); }
profile.sleep(); profile.startTournament();
const seed=profile.exportText(), base=process.env.GAME_URL ?? 'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true}), report={cases:[],errors:[],note:'All navigation/start/pause/help/replay uses real keyboard or touch. To inspect every result promptly, timed activities are advanced through their public simulation update; shadow ends through its real pause button. Mobile is a browser viewport, not a physical phone.'};
const variants=[['desktop',{width:1280,height:720},false],['mobile568',{width:568,height:320},true]];
const activities=[['sparring','sparring','.round-panel','__sparring'],['bag','bag','.bag-panel','__bag'],['shadow','shadow','.shadow-panel','__shadow'],['rope','rhythm','.rhythm-panel','__rhythm'],['speedball','rhythm','.rhythm-panel','__rhythm'],['pads','rhythm','.rhythm-panel','__hotelActivity'],['pool','rhythm','.rhythm-panel','__hotelActivity']];
let page;
async function choose(selector,root,mobile) {
  for(let i=0;i<50;i++) {
    if(await page.locator(selector).evaluate(e=>e===document.activeElement))return;
    if(mobile){const p=await joyPoint(page,root,'down');await page.touchscreen.tap(p.x,p.y);}else await page.keyboard.press('KeyS');
  }
  throw Error(`Cannot navigate to ${selector}`);
}
async function confirm(root,mobile){if(mobile)await page.locator(`${root} [data-pad-button="a"]`).tap();else await page.keyboard.press('KeyE');}
async function back(root,mobile){if(mobile)await page.locator(`${root} [data-pad-button="b"]`).tap();else await page.keyboard.press('Escape');}
async function menu(root,mobile){if(mobile)await page.locator(`${root} .console-menu-button`).tap();else await page.keyboard.press('KeyP');}
async function geometry(root,panel,mobile){
  const layout=await fit(page,root,mobile,true);assert.ok(layout.fits&&layout.noScroll);assert.equal(Math.round(layout.ratio*1000),1778);
  if(mobile)assert.ok(layout.controls.every(c=>c.outside&&c.fits));else assert.equal(layout.controls.length,0);
  const windowFit=await page.locator(`${root} ${panel}`).evaluate(p=>{const a=p.getBoundingClientRect(),b=document.querySelector('#stage').getBoundingClientRect();return{inside:a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1,noOverflow:p.scrollWidth<=p.clientWidth+1&&p.scrollHeight<=p.clientHeight+1};});
  assert.ok(windowFit.inside&&windowFit.noOverflow,JSON.stringify(windowFit));return windowFit;
}
async function choices(root,panel){return page.locator(`${root} ${panel}`).evaluate(p=>[...p.querySelectorAll('button,select,input')].filter(e=>e.getClientRects().length&&!e.closest('[hidden],[inert]')&&getComputedStyle(e).visibility!=='hidden').map(e=>e.textContent.trim()));}
try{
 for(const[name,viewport,mobile] of variants.filter(([name])=>!process.env.ACTIVITY_VARIANT||process.env.ACTIVITY_VARIANT===name)){
  const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});await suppressHotReload(context);
  await context.addInitScript(({key,seed})=>localStorage.setItem(key,seed),{key:CAREER_STORAGE_KEY,seed});
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  for(const[activity,overlay,panel,hook]of activities){
   const root=`#${overlay}-ui`;
   await page.goto(`${base}?scene=${activity}`);await wait(page,hook=>window[hook]?.ui?.root?.dataset.phase==='ready',hook,45000);
   await page.locator('#scene-loading').waitFor({state:'hidden'});
   const initial=await page.evaluate(async()=>{const {careerProfile}=await import(performance.getEntriesByType('resource').find(e=>/\/src\/game\/CareerProfile\.js(?:\?|$)/.test(e.name)).name);return{energy:careerProfile.snapshot().daily.energy,test:careerProfile.testStatus().active};});
   assert.equal(initial.test,false);assert.equal(await page.locator(`${root} .test-profile-indicator`).isVisible(),false);
   const ready=await choices(root,panel);assert.equal(ready.length,2,`${activity}: ${ready}`);await geometry(root,panel,mobile);
   await menu(root,mobile);await wait(page,r=>document.querySelector(r).dataset.optionsOpen==='true',root);
   await geometry(root,panel,mobile);
   const options=await choices(root,panel);assert.ok(options.includes('Commandes')&&options.includes('Carnet'));
   if(activity==='sparring')assert.equal(await page.locator(`${root} [name="lesson"]`).isVisible(),true,'Rémi’s lessons remain accessible before starting');
   await choose(`${root} .commands-open-button`,root,mobile);await confirm(root,mobile);await geometry(root,'.commands-panel',mobile);await back(root,mobile);
   assert.equal(await page.locator(root).getAttribute('data-options-open'),'true');
   await choose(`${root} .career-journal-open`,root,mobile);await confirm(root,mobile);await geometry(root,'.career-journal-panel',mobile);await back(root,mobile);
   await back(root,mobile);assert.equal(await page.locator(root).getAttribute('data-options-open'),'false');
   assert.equal(await page.evaluate(async()=>{const{careerProfile}=await import(performance.getEntriesByType('resource').find(e=>/\/src\/game\/CareerProfile\.js(?:\?|$)/.test(e.name)).name);return careerProfile.snapshot().daily.energy;}),initial.energy,'Options never consume energy');
   assert.equal(await page.locator(root).getAttribute('data-phase'),'ready');
   await choose(`${root} ${panel} .primary-button`,root,mobile);await confirm(root,mobile);await wait(page,r=>document.querySelector(r).dataset.phase==='running',root);
   assert.equal(await page.locator(`${root} ${panel}`).isVisible(),false);
   await page.waitForTimeout(100);
   if(mobile)await page.locator(`${root} [data-pad-button="a"]`).tap();else await page.keyboard.press('KeyJ');
   await menu(root,mobile);await wait(page,r=>document.querySelector(r).dataset.phase==='paused',root);await geometry(root,panel,mobile);
   assert.equal(await page.locator(`${root} .commands-open-button`).isVisible(),true);assert.equal(await page.locator(`${root} .career-journal-open`).isVisible(),true);
   if(activity==='shadow'){
    await choose(`${root} .shadow-finish-button`,root,mobile);await confirm(root,mobile);
   }else{
    await choose(`${root} ${panel} .primary-button`,root,mobile);await confirm(root,mobile);await wait(page,r=>document.querySelector(r).dataset.phase==='running',root);
    await page.evaluate(hook=>{const session=window[hook].session;for(let i=0;i<120*80&&session.state.phase==='running';i++)session.update(1/120);},hook);
   }
   await wait(page,r=>document.querySelector(r).dataset.phase==='finished',root);
   const finished=await choices(root,panel);assert.equal(finished.length,2,`${activity} finished: ${finished}`);await geometry(root,panel,mobile);
   if(['sparring','rope','pool'].includes(activity))await page.screenshot({path:`docs/activity-options-${activity}-${name}.png`});
   await menu(root,mobile);await geometry(root,panel,mobile);await back(root,mobile);
   await choose(`${root} ${panel} .primary-button`,root,mobile);await confirm(root,mobile);
   await wait(page,r=>['running','ready'].includes(document.querySelector(r).dataset.phase),root);
   if(activity==='shadow'){await confirm(root,mobile);await wait(page,r=>document.querySelector(r).dataset.phase==='running',root);}
   report.cases.push({name,activity,ready,finished,options,pause:true,replay:true});
  }
  // Explicit isolated fixture enters test mode. The UI itself only observes it.
  await page.goto(`${base}?scene=gym`);await wait(page,()=>window.__gym?.ui,null,45000);
  const normal=await page.evaluate(async()=>{const{careerProfile}=await import(performance.getEntriesByType('resource').find(e=>/\/src\/game\/CareerProfile\.js(?:\?|$)/.test(e.name)).name);const snapshot=careerProfile.exportText();careerProfile.enterTestProfile();careerProfile.applyTestCommand('argent 500');return snapshot;});
  await menu('#gym-ui',mobile);await page.locator('#gym-ui .test-profile-indicator').waitFor({state:'visible'});
  await choose('#gym-ui .test-profile-exit','#gym-ui',mobile);await confirm('#gym-ui',mobile);
  await wait(page,()=>document.querySelector('#gym-ui')?.dataset.profileTest==='false');
  const restored=await page.evaluate(async()=>{const{careerProfile}=await import(performance.getEntriesByType('resource').find(e=>/\/src\/game\/CareerProfile\.js(?:\?|$)/.test(e.name)).name);return{test:careerProfile.testStatus().active,profile:careerProfile.exportText()};});
  assert.equal(restored.test,false);
  const before=JSON.parse(normal),after=JSON.parse(restored.profile);
  assert.equal(after.wallet.money,before.wallet.money);assert.deepEqual(after.fights,before.fights);
  report.cases.push({name,activity:'test-profile-return',normalMoneyRestored:true,normalFightsRestored:true});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(`docs/activity-options${process.env.ACTIVITY_VARIANT?`-${process.env.ACTIVITY_VARIANT}`:''}-browser-results.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Activity options: ${report.cases.length} cases passed, no browser errors.`);
}catch(error){console.error(JSON.stringify(report,null,2));await page?.screenshot({path:'/tmp/activity-options-failure.png'}).catch(()=>{});throw error;}finally{await browser.close();}
