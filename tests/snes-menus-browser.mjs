import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS, TOURNAMENT_OPPONENTS } from '../src/game/ChapterRules.js';
import { chromium, wait, suppressHotReload, joyPoint, dispatch } from './control-helpers.mjs';

const base = process.env.GAME_URL ?? 'http://127.0.0.1:5173/';
const profile = new CareerProfile({storage:null});
profile.recordFight({opponent:'beton',winner:'player'}); profile.recordFight({opponent:'kramer',winner:'player'});
for(let i=0;i<6;i++) { if(!profile.canStartActivity('delivery').ok) profile.sleep(); profile.startDelivery(); for(const stop of DELIVERY_STOPS) profile.deliverParcel(stop,{tip:2}); }
profile.startTournament();
for(const opponent of TOURNAMENT_OPPONENTS.slice(0,2)) { profile.recordTournamentFight({opponent,winner:'player',matchId:profile.tournamentStatus().currentMatchId}); profile.sleep(); }
profile.setLocation({scene:'hotel-room',x:640,y:540,facing:'up'});
const seed=profile.exportText();
const browser=await chromium.launch({headless:true});
const report={cases:[],errors:[]};
const variants=[['desktop',{width:1280,height:720},false],['mobile',{width:844,height:390},true],['small-mobile',{width:568,height:320},true]];
const scenes=[['sparring','sparring','.round-panel'],['bag','bag','.bag-panel'],['shadow','shadow','.shadow-panel'],['rope','rhythm','.rhythm-panel'],['speedball','rhythm','.rhythm-panel'],['pads','rhythm','.rhythm-panel'],['pool','rhythm','.rhythm-panel'],['fight&opponent=gagnon','sparring','.round-panel']];
let page;
async function check(selector,mobile) {
  const layout=await page.locator(selector).evaluate(panel=>{
    const rect=panel.getBoundingClientRect(),camera=document.querySelector('#stage').getBoundingClientRect();
    return {inside:rect.left>=camera.left-1&&rect.top>=camera.top-1&&rect.right<=camera.right+1&&rect.bottom<=camera.bottom+1,
      noPageScroll:document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth,
      noOverflow:panel.scrollHeight<=panel.clientHeight+1&&panel.scrollWidth<=panel.clientWidth+1,
      pixelFont:getComputedStyle(panel).fontFamily.includes('Boxeur Pixel'),width:Math.round(rect.width),height:Math.round(rect.height)};
  });
  assert.ok(layout.inside&&layout.noPageScroll&&layout.noOverflow&&layout.pixelFont,`${selector}: ${JSON.stringify(layout)}`);
  if(!mobile)assert.equal(await page.locator('.input-rail:visible').count(),0);
  return layout;
}
async function choose(selector,root,mobile) {
  for(let n=0;n<45;n++) {
    if(await page.locator(selector).evaluate(e=>e===document.activeElement)) return;
    if(mobile) { const pt=await joyPoint(page,root,'down');await page.touchscreen.tap(pt.x,pt.y); }
    else await page.keyboard.press('KeyS');
  }
  assert.fail(`Cannot select ${selector} using ${mobile?'joypad':'WASD'}`);
}
async function confirm(root,mobile) { if(mobile)await page.locator(`${root} [data-pad-button="a"]`).tap();else await page.keyboard.press('KeyE'); }
async function swipeReading(root) {
  const reading=page.locator(root).first(),box=await reading.boundingBox();
  const before=await reading.evaluate(e=>({top:e.scrollTop,extra:e.scrollHeight-e.clientHeight}));
  if(before.extra<5)return false;
  const cdp=await page.context().newCDPSession(page),x=box.x+box.width*.6,y=box.y+box.height*.82;
  await dispatch(cdp,'touchStart',[{id:9,x,y}]);
  for(let i=1;i<=8;i++){await dispatch(cdp,'touchMove',[{id:9,x,y:y-i*box.height*.065}]);await page.waitForTimeout(20);}
  await dispatch(cdp,'touchEnd',[]);await page.waitForTimeout(140);await cdp.detach();
  const after=await reading.evaluate(e=>e.scrollTop);
  assert.ok(after>before.top+2,'A real touch swipe scrolls the reading column');return true;
}
try {
  for(const [name,viewport,mobile] of variants.filter(([name])=>!process.env.SNES_VARIANT||name===process.env.SNES_VARIANT)) {
    const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});await suppressHotReload(context);
    await context.addInitScript(({key,seed})=>localStorage.setItem(key,seed),{key:CAREER_STORAGE_KEY,seed});
    page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    await page.goto(base);await page.locator('#career-menu:not([hidden])').waitFor();
    const career=await check('#career-menu section',mobile);
    await choose('.career-new','#career-menu',mobile);await confirm('#career-menu',mobile);
    await page.locator('.career-confirm:not([hidden])').waitFor();
    await choose('.career-cancel','#career-menu',mobile);await confirm('#career-menu',mobile);
    assert.equal(await page.locator('.career-confirm').isVisible(),false);
    if(mobile)await page.screenshot({path:`docs/snes-career-${name}.png`});
    await choose('.career-continue','#career-menu',mobile);await confirm('#career-menu',mobile);
    await page.locator('#career-menu').waitFor({state:'hidden'});report.cases.push({name,case:'resume-new-cancel-and-continue',...career});
    await page.goto(`${base}?scene=gym`);await wait(page,()=>window.__gym?.world,null,45000);
    if(mobile)await page.locator('#gym-ui .console-menu-button').tap();else await page.keyboard.press('KeyP');
    await page.locator('.gym-pause-panel:not([hidden])').waitFor();const pause=await check('.gym-pause-panel',mobile);
    await choose('#gym-ui .commands-open-button','#gym-ui',mobile);await confirm('#gym-ui',mobile);
    const commands=await check('#gym-ui .commands-panel',mobile);
    assert.match(await page.locator('#gym-ui .commands-grid').textContent(),mobile?/Joypad/:/WASD/);
    if(mobile)await page.locator('#gym-ui [data-pad-button="b"]').tap();else await page.keyboard.press('Escape');
    await choose('#gym-ui .gym-import-button','#gym-ui',mobile);
    await page.locator('.gym-import-file').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(seed)});
    await page.locator('.gym-import-confirm:not([hidden])').waitFor();const imported=await check('.gym-import-confirm',mobile);
    await confirm('#gym-ui',mobile);assert.equal(await page.locator('.gym-import-confirm').isVisible(),false);
    await page.screenshot({path:`docs/snes-pause-${name}.png`});
    report.cases.push({name,case:'pause-commands-import-cancel',pause,commands,imported});
    for(const[scene,overlay,panel]of scenes){
      const root=`#${overlay}-ui`;
      await page.goto(`${base}?scene=${scene}`);await wait(page,r=>document.querySelector(r)?.dataset.phase==='ready',root,45000);
      const ready=await check(`${root} ${panel}`,mobile);
      await page.keyboard.press('Enter');await page.keyboard.press('Space');await page.keyboard.press('KeyJ');await page.keyboard.press('KeyK');
      assert.equal(await page.locator(root).getAttribute('data-phase'),'ready','Only E confirms a menu choice on desktop');
      if(name==='small-mobile'&&scene==='fight&opponent=gagnon')assert.ok(await swipeReading(`${root} .panel-scroll`));
      if(['sparring','pads','fight&opponent=gagnon'].includes(scene))await page.screenshot({path:`docs/snes-${scene.replaceAll('&opponent=','-')}-${name}.png`});
      // E and A choose the existing primary action without scene/model calls.
      const primary=`${root} ${overlay==='sparring'?'.primary-button':overlay==='bag'?'.bag-start-button':overlay==='shadow'?'.shadow-start-button':'.rhythm-primary'}`;
      await choose(primary,root,mobile);await confirm(root,mobile);await wait(page,r=>document.querySelector(r)?.dataset.phase==='running',root);
      assert.equal(await page.locator(`${root} ${panel}`).isVisible(),false,'The ready window must actually disappear during play');
      if(mobile)await page.locator(`${root} .console-menu-button`).tap();else await page.keyboard.press('KeyP');
      await wait(page,r=>document.querySelector(r)?.dataset.phase==='paused',root);
      await choose(`${root} .commands-open-button`,root,mobile);await confirm(root,mobile);
      const help=await check(`${root} .commands-panel`,mobile);
      if(mobile)await swipeReading(`${root} .commands-panel .snes-reading`);
      if(mobile)await page.locator(`${root} [data-pad-button="b"]`).tap();else await page.keyboard.press('Escape');
      await choose(primary,root,mobile);await confirm(root,mobile);await wait(page,r=>document.querySelector(r)?.dataset.phase==='running',root);
      assert.equal(await page.locator(`${root} ${panel}`).isVisible(),false,'Resuming must remove the pause window from the action');
      report.cases.push({name,scene,ready,help});
    }
    if(mobile){await page.setViewportSize({width:390,height:844});await page.locator('.rotate-prompt').waitFor({state:'visible'});assert.equal(await page.locator('#sparring-ui').getAttribute('data-phase'),'paused');report.cases.push({name,case:'portrait-pauses'});}
    await context.close();
  }
  assert.deepEqual(report.errors,[]);
  await fs.writeFile('docs/snes-menus-browser-results.json',JSON.stringify(report,null,2)+'\n');
  console.log(`SNES windows: ${report.cases.length} real browser cases, E/WASD and joypad/A/B, save confirmations, desktop/mobile geometry, touch scrolling, no errors.`);
}catch(error){console.error(report);await page?.screenshot({path:'/tmp/snes-menu-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
