import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';
import { chromium, wait, suppressHotReload, joyPoint, dispatch, fit } from './control-helpers.mjs';

// Fixture covers a finished participation and a second hotel stay. Navigation,
// opening, page changes, scrolling and returning below all use real UI input.
const profile = new CareerProfile({storage:null});
profile.recordFight({opponent:'beton',winner:'player'});profile.recordFight({opponent:'kramer',winner:'player'});
for(let i=0;i<14;i++) {if(!profile.canStartActivity('delivery').ok)profile.sleep();profile.startDelivery();for(const stop of DELIVERY_STOPS)profile.deliverParcel(stop,{tip:2});}
profile.startTournament();profile.recordTournamentFight({opponent:'bellini',winner:'remi',matchId:profile.tournamentStatus().currentMatchId});profile.leaveTournament();
profile.unlockTechnique('doubleJab',{completed:true,source:'octopus'});profile.startTournament();
const seed=profile.exportText(),base=process.env.GAME_URL??'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true}),report={cases:[],errors:[]};
const variants=[['desktop',{width:1280,height:720},false],['mobile',{width:844,height:390},true],['small-mobile',{width:568,height:320},true]];
const scenes=[['gym','gym','.gym-pause-panel'],['sparring','sparring','.round-panel'],['bag','bag','.bag-panel'],['shadow','shadow','.shadow-panel'],['rope','rhythm','.rhythm-panel'],['speedball','rhythm','.rhythm-panel'],['pads','rhythm','.rhythm-panel'],['pool','rhythm','.rhythm-panel']];
let page;
async function choose(selector,root,mobile) {
  for(let i=0;i<50;i++) {
    if(await page.locator(selector).evaluate(e=>e===document.activeElement))return;
    if(mobile){const p=await joyPoint(page,root,'down');await page.touchscreen.tap(p.x,p.y);}else await page.keyboard.press('KeyS');
  }
  assert.fail(`Cannot select ${selector}`);
}
async function confirm(root,mobile){if(mobile)await page.locator(`${root} [data-pad-button="a"]`).tap();else await page.keyboard.press('KeyE');}
async function back(root,mobile){if(mobile)await page.locator(`${root} [data-pad-button="b"]`).tap();else await page.keyboard.press('Escape');}
try{
  for(const[name,viewport,mobile]of variants.filter(([name])=>!process.env.JOURNAL_VARIANT||process.env.JOURNAL_VARIANT===name)){
    const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});await suppressHotReload(context);
    await context.addInitScript(({seed,key})=>localStorage.setItem(key,seed),{seed,key:CAREER_STORAGE_KEY});
    page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    for(const[scene,overlay,mainPanel]of scenes){
      const root=`#${overlay}-ui`;
      await page.goto(`${base}?scene=${scene}`);await page.locator(`${root} .career-journal-open`).waitFor({state:'attached',timeout:45000});
      if(scene==='gym'){if(mobile)await page.locator(`${root} .console-menu-button`).tap();else await page.keyboard.press('KeyP');}
      else{
        const primary=`${root} ${overlay==='sparring'?'.primary-button':overlay==='bag'?'.bag-start-button':overlay==='shadow'?'.shadow-start-button':'.rhythm-primary'}`;
        await choose(primary,root,mobile);await confirm(root,mobile);await wait(page,r=>document.querySelector(r).dataset.phase==='running',root);
        if(mobile)await page.locator(`${root} .console-menu-button`).tap();else await page.keyboard.press('KeyP');
        await wait(page,r=>document.querySelector(r).dataset.phase==='paused',root);
      }
      await choose(`${root} .career-journal-open`,root,mobile);await confirm(root,mobile);
      const panel=page.locator(`${root} .career-journal-panel`);await panel.waitFor({state:'visible'});
      assert.equal(await page.locator(`${root} ${mainPanel}`).isVisible(),false,'Only the journal window is visible');
      assert.match(await panel.textContent(),/Dyrex/);assert.match(await panel.textContent(),/Le Feu/);assert.match(await panel.textContent(),/Louisto/);
      const geometry=await panel.evaluate(p=>{const a=p.getBoundingClientRect(),b=document.querySelector('#stage').getBoundingClientRect();return{inside:a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom,noOverflow:p.scrollWidth<=p.clientWidth&&p.scrollHeight<=p.clientHeight};});
      assert.ok(geometry.inside&&geometry.noOverflow);const layout=await fit(page,root,mobile,true);assert.ok(layout.noScroll&&layout.fits);
      if(mobile)assert.ok(layout.controls.every(c=>c.outside&&c.fits));else assert.equal(await page.locator(`${root} .input-rail:visible`).count(),0);
      for(const id of ['record','techniques']){await choose(`${root} [data-journal-page="${id}"]`,root,mobile);await confirm(root,mobile);assert.equal(await page.locator(`${root} [data-journal-page="${id}"]`).getAttribute('aria-current'),'page');}
      assert.match(await panel.textContent(),mobile?/A → A → B/:/J → J → K/);
      if(mobile){
        const reading=page.locator(`${root} .journal-reading`),box=await reading.boundingBox();
        const extra=await reading.evaluate(e=>e.scrollHeight-e.clientHeight);
        assert.ok(extra>10);const cdp=await context.newCDPSession(page),x=box.x+box.width*.6,y=box.y+box.height*.85;
        await dispatch(cdp,'touchStart',[{id:9,x,y}]);
        for(let i=1;i<=8;i++){await dispatch(cdp,'touchMove',[{id:9,x,y:y-i*box.height*.07}]);await page.waitForTimeout(20);}
        await dispatch(cdp,'touchEnd',[]);await page.waitForTimeout(150);await cdp.detach();
        assert.ok(await reading.evaluate(e=>e.scrollTop>3),'The reading column responds to a real touch swipe');
      }
      if(scene==='gym')await page.screenshot({path:`docs/career-journal-${name}.png`});
      await back(root,mobile);assert.equal(await panel.isVisible(),false);assert.equal(await page.locator(`${root} ${mainPanel}`).isVisible(),true);
      assert.equal(await page.locator(root).getAttribute(scene==='gym'?'data-mode':'data-phase'),'paused','Closing the journal never resumes gameplay');
      await confirm(root,mobile);await panel.waitFor({state:'visible'});if(mobile)await page.locator(`${root} .console-menu-button`).tap();else await page.keyboard.press('KeyP');
      assert.equal(await panel.isVisible(),false,'The menu button also returns to the paused screen');
      report.cases.push({name,scene,...geometry});
    }
    await context.close();
  }
  assert.deepEqual(report.errors,[]);await fs.writeFile(`docs/career-journal${process.env.JOURNAL_VARIANT?`-${process.env.JOURNAL_VARIANT}`:''}-browser-results.json`,JSON.stringify(report,null,2)+'\n');
  console.log(`Career journal: ${report.cases.length} real PC/touch menu cases, keyboard E, A/B, page changes and swipe, no errors.`);
}catch(error){await page?.screenshot({path:'/tmp/career-journal-failure.png'}).catch(()=>{});throw error;}finally{await browser.close();}
