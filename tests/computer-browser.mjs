// Native menus and controls against an imported valid career, never direct UI callbacks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,wait,dispatch,joyPoint,buttonPoint,suppressHotReload,fit} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {HOME_BAR_LAYOUTS} from '../src/game/HomeBarWorld.js';
const built=process.env.COMPUTER_BUILT==='1',publicSite=!built&&Boolean(process.env.COMPUTER_URL);
const url=built?'https://computer-build.invalid/BoxeurDeux-D/':process.env.COMPUTER_URL??'http://127.0.0.1:5173/';
const output=`outputs/verification/computer/${built?'built':publicSite?'public':'dev'}`;fs.mkdirSync(output,{recursive:true});
const report={date:new Date().toISOString(),url,built,publicSite,mobileEmulated:true,fixture:'Valid career beside the office computer. Every app, purchase, back action and terminal command uses real keys or CDP touches. Read-only pages preserve normal save and backup bytes.',cases:[],errors:[],failure:null};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
function fixture(unlocked){
 const p=new CareerProfile({storage:null});if(unlocked){assert.ok(p.applyTestCommand('test casino').ok);assert.ok(p.applyTestCommand('argent 700').ok);}else assert.ok(p.recordFight({opponent:'beton',winner:'player'}).ok);
 p.setLocation({scene:'home',x:770,y:580,facing:'up'});let game=p.beginLeisureGame('race','karl');assert.ok(game.ok);assert.ok(p.recordLeisureResult({id:game.id,winner:'player',timeMs:92340}).ok);
 p.setLocation({scene:'island-bar',x:440,y:535,facing:'up'});game=p.beginLeisureGame('billiards','beton');assert.ok(game.ok);assert.ok(p.recordLeisureResult({id:game.id,winner:'opponent'}).ok);
 const point=HOME_BAR_LAYOUTS['home-office'].stations.find(s=>s.id==='laptop');p.setLocation({scene:'home-office',x:point.x,y:point.y+38,facing:'up'});const text=p.exportText();p.inspectImport(text);return text;
}
async function run(mobile,unlocked){
 const name=`${mobile?'mobile568':'desktop'}-${unlocked?'unlocked':'locked'}`;console.log(`COMPUTER ${name}`);
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});if(!built&&!publicSite)await suppressHotReload(context);
 if(built)await context.route('https://computer-build.invalid/BoxeurDeux-D/**',async route=>{
  const relative=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html',file=path.resolve('dist',relative);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
  try{await route.fulfill({status:200,body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Missing production asset'});}
 });
 await context.addInitScript(({key,data})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,data);localStorage.setItem(`${key}-backup`,data);}},{key:CAREER_STORAGE_KEY,data:fixture(unlocked)});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(publicSite?60000:30000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 const cdp=mobile?await context.newCDPSession(page):null;
 const tap=async selector=>{await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).scrollIntoViewIfNeeded();if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');}else await page.locator(selector).click();await page.waitForTimeout(45);};
 const confirm=()=>mobile?tap('#gym-ui [data-pad-button="a"]'):page.keyboard.press('KeyE');
 const direction=async direction=>{if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',direction)]);await dispatch(cdp,'touchEnd');}else await page.keyboard.press({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[direction]);await page.waitForTimeout(20);};
 const choose=async selector=>{await page.locator(selector).waitFor({state:'visible'});for(let i=0;i<35;i++){if(await page.locator(selector).evaluate(e=>e===document.activeElement)){await confirm();return;}await direction('down');}throw Error(`Cannot navigate to ${selector}`);};
 const action=id=>choose(`[data-gym-action="laptop-${id}"]`);
 const nav=id=>choose(`[data-computer-nav="${id}"]`);
 const back=async()=>{if(mobile)await tap('#gym-ui [data-pad-button="b"]');else await page.keyboard.press('Escape');await page.waitForTimeout(70);};
 const pageIs=name=>wait(page,name=>document.querySelector('.laptop-window')?.dataset.page===name,name);
 const bytes=()=>page.evaluate(key=>({normal:localStorage.getItem(key),backup:localStorage.getItem(`${key}-backup`)}),CAREER_STORAGE_KEY);
 const state=async()=>JSON.parse((await bytes()).normal);
 const text=()=>page.locator('#gym-dialog-text').textContent();
 const shot=async label=>{
  const geometry=await fit(page,'#gym-ui',mobile,true);assert.ok(geometry.fits&&geometry.noScroll);assert.ok(geometry.controls.every(c=>c.outside&&c.fits));
  const window=await page.locator('.laptop-window').evaluate(e=>{const r=e.getBoundingClientRect(),canvas=document.querySelector('canvas').getBoundingClientRect(),toolbar=e.querySelector('.computer-toolbar'),screen=e.querySelector('.laptop-screen');const visibleControls=[...e.querySelectorAll('button,input')].filter(b=>!b.disabled&&b.getClientRects().length&&!b.closest('[hidden]')).map(b=>{const p=b.getBoundingClientRect();return{label:b.getAttribute('aria-label')??b.textContent.trim(),width:p.width,height:p.height,contentFits:b.scrollHeight<=b.clientHeight+1};});return{inside:r.left>=canvas.left-1&&r.top>=canvas.top-1&&r.right<=canvas.right+1&&r.bottom<=canvas.bottom+1,screenNoHorizontalOverflow:screen.scrollWidth<=screen.clientWidth+1,toolbarNoHorizontalOverflow:toolbar.scrollWidth<=toolbar.clientWidth+1,controls:visibleControls};});
  assert.ok(window.inside,`Computer frame must fit inside canvas: ${JSON.stringify(window)}`);assert.ok(window.screenNoHorizontalOverflow&&window.toolbarNoHorizontalOverflow);assert.ok(window.controls.every(c=>c.width>20&&c.height>20&&c.contentFits));await page.screenshot({path:`${output}/${name}-${label}.png`});return{geometry,window};
 };
 try{
  await page.goto(url);await wait(page,()=>document.querySelector('#stage')?.dataset.scene==='home-office');await page.locator('#scene-loading').waitFor({state:'hidden'});
  if(await page.locator('.career-continue').isVisible())await tap('.career-continue');await wait(page,()=>document.querySelector('#gym-ui')?.dataset.mode==='walking');await page.waitForTimeout(180);
  await confirm();await pageIs('desktop');const baseline=await bytes();assert.equal(await page.locator('.laptop-window [data-app-icon]').count(),5);const geometry=await shot('desktop');
  await action('messages');await pageIs('messages');await action('messages-karl');await pageIs('messages-karl');assert.match(await text(),/avance/);assert.match(await text(),/Toi 1 — 0 Karl/);await shot('karl');await back();await pageIs('messages');await action('messages-fredo');await pageIs('messages-fredo');assert.match(await text(),/prochain objectif/);await nav('back');await pageIs('messages');await nav('desktop');await pageIs('desktop');
  for(const app of ['career','garage','scores']){await action(app);await pageIs(app);if(app==='scores'){assert.match(await text(),/1:32.34/);assert.match(await text(),/Béton : toi 0 — 1 lui/);}await shot(app);await back();await pageIs('desktop');}
  assert.deepEqual(await bytes(),baseline,'Read-only applications preserve normal profile and backup byte-for-byte');
  await action('browser');await action('news');await pageIs('news');if(unlocked)assert.doesNotMatch(await text(),/Les Gants de bronze t’attendent/);await back();await pageIs('browser');await action('travel');await action('cuba');await pageIs('cuba');
  assert.equal(await page.locator('[data-gym-action="laptop-reserve-cuba"]').isDisabled(),!unlocked);await shot('cuba-offer');await back();await pageIs('travel');await action('mexico');await pageIs('mexico');assert.equal(await page.locator('[data-gym-action="laptop-reserve-mexico"]').isDisabled(),!unlocked);await nav('desktop');await pageIs('desktop');
  await action('browser');await action('marathon');await pageIs('marathon');assert.equal(await page.locator('[data-gym-action="laptop-register"]').isDisabled(),!unlocked);assert.deepEqual(await bytes(),baseline,'Reading locked/unlocked offers spends nothing');
  if(unlocked){
   const before=await state();await action('register');await pageIs('marathon');let after=await state();assert.equal(after.wallet.money,before.wallet.money-100);assert.equal(after.marathon.active.status,'registered');assert.ok(await page.locator('[data-gym-action="laptop-register"]').isDisabled());
   await nav('desktop');await action('browser');await action('travel');
   for(const dest of ['cuba','mexico']){await action(dest);const before=await state();await action(`reserve-${dest}`);const after=await state();assert.equal(after.wallet.money,before.wallet.money-160);assert.ok(after[dest].reserved);assert.equal(after[dest].active,null);assert.ok(await page.locator(`[data-gym-action="laptop-reserve-${dest}"]`).isDisabled());await shot(`${dest}-reserved`);await action('travel');}
   const done=await state();assert.equal(done.daily.energy,before.daily.energy);assert.equal(done.location.scene,'home-office');assert.equal(done.leisure.race.playerWins,1);
  }
  await nav('desktop');await pageIs('desktop');await action('messages');await action('messages-karl');const pausedPage='messages-karl';
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await wait(page,()=>document.querySelector('#gym-ui')?.dataset.mode==='paused');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100);assert.equal(await page.locator('#gym-ui').getAttribute('data-mode'),'paused');await choose('#gym-ui .gym-resume-button');await pageIs(pausedPage);
  if(mobile){await page.setViewportSize({width:320,height:568});await page.waitForTimeout(100);assert.equal(await page.locator('#stage').evaluate(e=>e.inert),true);await page.setViewportSize({width:568,height:320});await page.waitForTimeout(120);assert.equal(await page.locator('#gym-ui').getAttribute('data-mode'),'paused');await choose('#gym-ui .gym-resume-button');await pageIs(pausedPage);}
  await nav('desktop');await action('terminal');await pageIs('terminal');const terminalBaseline=await bytes();await tap('.terminal-console input');await page.keyboard.type('liste');await tap('[data-gym-action="laptop-run"]');assert.match(await page.locator('.terminal-console pre').textContent(),/test casino/);assert.deepEqual(await bytes(),terminalBaseline);await shot('terminal');await back();await pageIs('desktop');await nav('close');await wait(page,()=>!document.querySelector('.laptop-window'));await confirm();await pageIs('desktop');assert.equal(await page.locator('.computer-toolbar').count(),1);await back();await wait(page,()=>!document.querySelector('.laptop-window'));
  report.cases.push({name,appsReadOnly:true,scoreData:true,historyBackDesktopClose:true,keyboardOrJoypadMenu:true,offersReflectCareer:true,reservationsAndMarathon:unlocked,focusPause:true,portraitPause:mobile,terminalReadOnly:true,geometry});
 }catch(error){await page.screenshot({path:`${output}/${name}-failure.png`}).catch(()=>{});throw error;}finally{await context.close();}
}
try{for(const mobile of [false,true])for(const unlocked of [false,true])await run(mobile,unlocked);assert.deepEqual(report.errors,[]);}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}finally{await browser.close();fs.writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
