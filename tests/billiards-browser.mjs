import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {HOME_BAR_LAYOUTS} from '../src/game/HomeBarWorld.js';
import {chromium,wait,dispatch,buttonPoint,joyPoint,fit,suppressHotReload} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
const built=process.env.BILLIARDS_BUILT==='1',publicSite=!built&&Boolean(process.env.BILLIARDS_URL),production=built||publicSite;
const url=built?'https://billiards-build.invalid/BoxeurDeux-D/':process.env.BILLIARDS_URL??'http://127.0.0.1:5173/';
const output=process.env.BILLIARDS_OUTPUT??`outputs/verification/billiards/${built?'built':publicSite?'public':'dev'}`;fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const report={date:new Date().toISOString(),url,built,publicSite,mobileEmulated:true,evidence:production?'Real bar choices, keyboard/CDP touch, break, AI, pause, abandon and reload. No development globals or gameplay injection.':'Development fixture for the last8 and ball-in-hand; a real input and physics finish the shot, without bypassing settlement.',limitation:production?'Complete matches are covered by model tests and the development final8 test. This production smoke deliberately abandons its live matches and does not claim a complete browser win.':null,cases:[],errors:[],failure:null};
const data=new CareerProfile({storage:null});assert.ok(data.setLocation({scene:'island-bar',x:440,y:550,facing:'up'}).ok);const fixture=data.exportText();data.inspectImport(fixture);
async function run(mobile){
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});await suppressHotReload(context);
 await context.addInitScript(({key,fixture})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,fixture);localStorage.setItem(`${key}-backup`,fixture);}},{key:CAREER_STORAGE_KEY,fixture});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));const cdp=mobile?await context.newCDPSession(page):null;
 const tap=async selector=>{await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).scrollIntoViewIfNeeded();if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');}else await page.locator(selector).click();await page.waitForTimeout(70);};
 const launch=async()=>{await wait(page,()=>window.__homeBar?.scene);await page.evaluate(()=>{__homeBar.scene.scene.start('BilliardsScene',{opponent:'beton',returnLocation:{scene:'island-bar',x:440,y:550,facing:'up'}});});await wait(page,()=>window.__billiards?.session.state.phase==='ready');await page.locator('#scene-loading').waitFor({state:'hidden'});};
 const snapshot=()=>page.evaluate(()=>({state:structuredClone(__billiards.session.state),id:__billiards.scene.sessionId,vector:{...__billiards.scene.vector}}));
 const confirm=async()=>mobile?tap('#gym-ui [data-pad-button="a"]'):page.keyboard.press('KeyE');
 const pause=async()=>mobile?tap('#gym-ui [data-pad-button="b"]'):page.keyboard.press('KeyP');
 try{
  await page.goto(url);await wait(page,()=>window.__homeBar?.scene);
  for(const selector of ['.career-start-continue','.career-continue'])if(await page.locator(selector).isVisible()){await tap(selector);break;}
  await page.waitForTimeout(100);await launch();
  assert.equal((await snapshot()).id,null,'Visiting the table does not begin a career game');
  const geometry=await fit(page,'#gym-ui',mobile,true);assert.ok(geometry.fits&&geometry.noScroll);assert.ok(geometry.controls.every(c=>c.outside&&c.fits));await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-ready.png`});
  await tap('#gym-ui .commands-open-button');assert.match(await page.locator('#gym-ui .billiards-copy').textContent(),/8 trop tôt/);await confirm();await confirm();await wait(page,()=>__billiards.session.state.phase==='aiming');
  const before=await snapshot();assert.ok(before.id>0);
  if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui','right')]);await page.waitForTimeout(220);await dispatch(cdp,'touchEnd');}else{await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');}
  assert.ok((await snapshot()).state.angle>before.state.angle+.05,'Continuous keyboard/joypad aiming');
  if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui','up')]);await page.waitForTimeout(220);await dispatch(cdp,'touchEnd');}else{await page.keyboard.down('ArrowUp');await page.waitForTimeout(220);await page.keyboard.up('ArrowUp');}
  assert.ok((await snapshot()).state.power>before.state.power+.02,'Continuous power control');
  const canvas=await page.locator('canvas').boundingBox(),point={id:7,x:canvas.x+canvas.width*.75,y:canvas.y+canvas.height*.58};
  if(mobile){await dispatch(cdp,'touchStart',[point]);await dispatch(cdp,'touchEnd');}else await page.mouse.click(point.x,point.y);
  await page.waitForTimeout(70);assert.ok(Math.abs((await snapshot()).state.angle)<.06,'Mouse/touch on the cloth selects the aim direction');
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-table.png`});
  await confirm();await wait(page,()=>__billiards.session.state.phase==='rolling');await pause();await wait(page,()=>__billiards.session.state.paused);await page.locator('#gym-ui .music-controls').waitFor({state:'visible'});const paused=await snapshot();await page.waitForTimeout(450);assert.deepEqual((await snapshot()).state,paused.state,'Pause freezes physical motion and elapsed time');await confirm();await wait(page,()=>!__billiards.session.state.paused);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await wait(page,()=>__billiards.session.state.paused);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(150);assert.ok((await snapshot()).state.paused,'Focus alone does not resume');await confirm();
  if(mobile){await page.setViewportSize({width:320,height:568});await wait(page,()=>__billiards.session.state.paused);await page.setViewportSize({width:568,height:320});await page.waitForTimeout(150);assert.ok((await snapshot()).state.paused,'Landscape alone does not resume');await confirm();}
  // A foul allows an accessible free placement, confirmed separately from the shot.
  await page.evaluate(()=>{const g=__billiards.session;Object.assign(g.state,{phase:'ball-in-hand',paused:false,turn:'player',shot:null});for(const b of g.state.balls)b.vx=b.vy=0;Object.assign(g.cue(),{x:350,y:415,pocketed:false});});
  await wait(page,()=>document.querySelector('#gym-ui [data-pad-button="a"]').getAttribute('aria-label')==='A — Placer');
  if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui','right')]);await page.waitForTimeout(220);await dispatch(cdp,'touchEnd');}else{await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');}
  assert.ok((await snapshot()).state.balls.find(b=>b.id===0).x>370,'Joypad and keyboard move the ball in hand');await confirm();await wait(page,()=>__billiards.session.state.phase==='aiming');
  // A physically played final ball makes scoring deterministic without bypassing settlement.
  const moneyBefore=await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));return{money:p.wallet.money,energy:p.daily.energy,score:p.leisure.billiards.beton};},CAREER_STORAGE_KEY);
  await page.evaluate(()=>{const g=__billiards.session,s=g.state;for(const b of s.balls)Object.assign(b,{pocketed:true,vx:0,vy:0});Object.assign(g.cue(),{x:640,y:500,pocketed:false});Object.assign(s.balls.find(b=>b.id===8),{x:640,y:300,pocketed:false});Object.assign(s,{phase:'aiming',paused:false,turn:'player',groups:{player:'solids',opponent:'stripes'},angle:-Math.PI/2,power:.6,shot:null,aiTime:0});});
  await wait(page,()=>document.querySelector('#gym-ui').dataset.controlMode==='play');await confirm();await wait(page,()=>__billiards.session.state.phase==='finished',null,10000);assert.equal((await snapshot()).state.winner,'player');
  await page.waitForTimeout(500);const won=await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));return{money:p.wallet.money,energy:p.daily.energy,score:p.leisure.billiards.beton};},CAREER_STORAGE_KEY);
  assert.equal(won.score.playerWins,moneyBefore.score.playerWins+1);assert.equal(won.score.opponentWins,moneyBefore.score.opponentWins);assert.equal(won.money,moneyBefore.money);assert.equal(won.energy,moneyBefore.energy);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-result.png`});
  await confirm();await wait(page,()=>__billiards.session.state.phase==='aiming');await pause();await tap('#gym-ui .billiards-return');await wait(page,()=>document.querySelector('#stage').dataset.scene==='island-bar');assert.equal(await page.evaluate(()=>Boolean(window.__billiards)),false,'Scene shutdown removes debug handle');
  const afterExit=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).leisure.billiards.beton,CAREER_STORAGE_KEY);assert.deepEqual(afterExit,won.score,'Abandon adds no result');
  await launch();await confirm();await wait(page,()=>__billiards.session.state.phase==='aiming');await page.reload();await wait(page,()=>document.querySelector('#stage').dataset.scene==='island-bar');const loaded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).leisure.billiards.beton,CAREER_STORAGE_KEY);assert.deepEqual(loaded,won.score,'Reload abandons current table and preserves the sole completed win');report.cases.push({mobile,geometry,checks:['ready ticket deferred','rules','aim','power','mouse/touch aim','rolling pause','focus pause',...(mobile?['portrait pause']:[]),'ball in hand placement','physical 8 win','single score','money and energy unchanged','abandon','reload']});
 }catch(error){await page.screenshot({path:`${output}/failure-${mobile?'mobile':'desktop'}.png`}).catch(()=>{});throw error;}finally{await context.close();}
}
async function runProduction(mobile){
 const name=mobile?'mobile568':'desktop',context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const p=new CareerProfile({storage:null}),table=HOME_BAR_LAYOUTS['island-bar'].stations.find(s=>s.id==='billiards');p.setLocation({scene:'island-bar',x:table.x,y:table.y+35,facing:'up'});p.inspectImport(p.exportText());
 await context.addInitScript(({key,fixture})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,fixture);localStorage.setItem(`${key}-backup`,fixture);}},{key:CAREER_STORAGE_KEY,fixture:p.exportText()});
 if(built)await context.route('https://billiards-build.invalid/BoxeurDeux-D/**',async route=>{
  const relative=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html',file=path.resolve('dist',relative);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
  try{await route.fulfill({status:200,body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Missing production asset'});}
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(publicSite?60000:30000);page.on('pageerror',error=>report.errors.push(error.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 const cdp=mobile?await context.newCDPSession(page):null;
 const tap=async selector=>{await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).scrollIntoViewIfNeeded();if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');}else await page.locator(selector).click();await page.waitForTimeout(70);};
 const confirm=()=>mobile?tap('#gym-ui [data-pad-button="a"]'):page.keyboard.press('KeyE');
 const direction=async direction=>{if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',direction)]);await dispatch(cdp,'touchEnd');}else await page.keyboard.press({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction]);};
 const choose=async selector=>{await page.locator(selector).waitFor({state:'visible'});for(let i=0;i<30;i++){if(await page.locator(selector).evaluate(e=>e===document.activeElement)){await confirm();return;}await direction('down');}throw Error(`Unreachable choice: ${selector}`);};
 const pause=()=>mobile?tap('#gym-ui [data-pad-button="b"]'):page.keyboard.press('KeyP');
 const hold=async(direction,duration)=>{const key={right:'ArrowRight',up:'ArrowUp'}[direction];if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',direction)]);else await page.keyboard.down(key);await page.waitForTimeout(duration);if(mobile)await dispatch(cdp,'touchEnd');else await page.keyboard.up(key);await page.waitForTimeout(80);};
 const saved=()=>page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));return{money:p.wallet.money,energy:p.daily.energy,leisure:p.leisure,location:p.location};},CAREER_STORAGE_KEY);
 const unchanged=async before=>{const after=await saved();assert.equal(after.money,before.money);assert.equal(after.energy,before.energy);assert.deepEqual(after.leisure,before.leisure);return after;};
 const readyBar=async()=>{await wait(page,()=>document.querySelector('#stage')?.dataset.scene==='island-bar',null,45000);await page.locator('#scene-loading').waitFor({state:'hidden'});if(await page.locator('.career-continue').isVisible())await tap('.career-continue');await wait(page,()=>document.querySelector('#gym-ui')?.dataset.mode==='walking'&&!document.querySelector('#gym-ui .gym-interact-button')?.disabled);};
 const launch=async opponent=>{await confirm();await choose(`[data-gym-action="pool-${opponent}"]`);await wait(page,()=>document.querySelector('#stage')?.dataset.scene==='billiards');await page.locator('#scene-loading').waitFor({state:'hidden'});await page.locator('.billiards-primary').waitFor({state:'visible'});assert.match(await page.locator('#billiards-title').textContent(),new RegExp(opponent==='beton'?'Béton':'Kramer'));};
 const shot=async label=>{const geometry=await fit(page,'#gym-ui',mobile,true);assert.ok(geometry.fits&&geometry.noScroll&&geometry.controls.every(c=>c.outside&&c.fits));await page.screenshot({path:`${output}/${name}-${label}.png`});return geometry;};
 try{
  await page.goto(url);await readyBar();assert.equal(await page.evaluate(()=>Boolean(window.__billiards||window.__homeBar)),false,'Production exposes no development game handles');const before=await saved();
  for(const opponent of ['beton','kramer']){
   console.log(`BILLIARDS ${built?'built':'public'} ${name} ${opponent}`);await launch(opponent);const geometry=await shot(`${opponent}-ready`);await choose('#gym-ui .commands-open-button');assert.match(await page.locator('.billiards-copy').textContent(),/8 trop tôt/);await confirm();await confirm();await wait(page,()=>document.querySelector('#gym-ui')?.dataset.controlMode==='play');
   const beforeAim=await page.locator('canvas').screenshot();await hold('right',220);const afterAim=await page.locator('canvas').screenshot();assert.notDeepEqual(afterAim,beforeAim,'A real direction input changes the rendered aiming guide');const power=Number(await page.locator('#billiards-power').inputValue());await hold('up',220);assert.ok(Number(await page.locator('#billiards-power').inputValue())>power);
   const canvas=await page.locator('canvas').boundingBox(),point={id:7,x:canvas.x+canvas.width*900/1280,y:canvas.y+canvas.height*415/720};if(mobile){await dispatch(cdp,'touchStart',[point]);await dispatch(cdp,'touchEnd');}else await page.mouse.click(point.x,point.y);await page.waitForTimeout(80);await shot(`${opponent}-aim`);
   await confirm();await wait(page,()=>document.querySelector('.billiards-status')?.textContent==='Les billes roulent…');await pause();await page.locator('.billiards-panel:not([hidden])').waitFor({state:'visible'});assert.equal(await page.locator('#billiards-title').textContent(),'Partie en pause');await page.locator('.music-controls').waitFor({state:'visible'});await shot(`${opponent}-pause`);const frozen=await page.locator('canvas').screenshot();await page.waitForTimeout(300);assert.deepEqual(await page.locator('canvas').screenshot(),frozen,'Rendered balls stay frozen behind the pause panel');await confirm();
   const who=opponent==='beton'?'Béton':'Kramer';await wait(page,who=>document.querySelector('.billiards-status')?.textContent===`${who} joue…`,who,15000);await shot(`${opponent}-ai`);
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.locator('.billiards-panel:not([hidden])').waitFor({state:'visible'});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(150);assert.equal(await page.locator('#billiards-title').textContent(),'Partie en pause');await confirm();
   // Resume changes the model first; wait for its next rendered frame before P.
   await page.locator('.billiards-panel').waitFor({state:'hidden'});
   if(mobile){await page.setViewportSize({width:320,height:568});await wait(page,()=>document.querySelector('#stage').inert);await page.setViewportSize({width:568,height:320});await page.waitForTimeout(150);assert.equal(await page.locator('#billiards-title').textContent(),'Partie en pause');}else await pause();
   await choose('.billiards-return');await readyBar();assert.equal(await page.locator('.billiards-ui').count(),0);await unchanged(before);await shot(`${opponent}-returned-bar`);
   await launch(opponent);await confirm();await wait(page,()=>document.querySelector('#gym-ui')?.dataset.controlMode==='play');await page.reload();await readyBar();const after=await unchanged(before);assert.equal(after.location.scene,'island-bar');await shot(`${opponent}-reloaded-bar`);
   report.cases.push({name,opponent,realBarEntry:true,actualAimAndBreak:true,aiShot:true,pauseFrozenScreenshot:true,focusPause:true,portraitPause:mobile,abandonReturns:true,reloadReturns:true,scoresMoneyEnergyUnchanged:true,noDebugHandles:true,geometry});
  }
 }catch(error){await page.screenshot({path:`${output}/${name}-failure.png`}).catch(()=>{});throw error;}finally{await context.close();}
}
try{for(const mobile of [false,true])await (production?runProduction(mobile):run(mobile));assert.deepEqual(report.errors,[]);}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}finally{await browser.close();fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));
