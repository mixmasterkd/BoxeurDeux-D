// Live keyboard/CDP touch against the real scene. No mutation of simulation,
// tickets or results: Karl drives all three laps and receives his real win.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,wait,dispatch,joyPoint,buttonPoint,suppressHotReload,fit} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {HOME_RACE_RETURN} from '../src/game/HomeBarWorld.js';
const built=process.env.RACE_BUILT==='1',publicSite=!built&&Boolean(process.env.RACE_URL),direct=process.env.RACE_DIRECT==='1';
const url=built?'https://retro-race-build.invalid/BoxeurDeux-D/':process.env.RACE_URL??process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const output=`outputs/verification/retro-race/${built?'built':publicSite?'public':'dev'}`;
fs.mkdirSync(output,{recursive:true});
const report={date:new Date().toISOString(),url,built,publicSite,direct,mobileEmulated:true,evidence:'Real keyboard and CDP multi-touch. Karl physically completes all 48 gates. Saved career assertions; no game state injection. Visibility/blur/career-overlay events explicitly simulated, portrait uses viewport change.',cases:[],errors:[],warnings:[],failure:null};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
const phase=(page,p)=>wait(page,p=>document.querySelector('#retro-race-ui')?.dataset.phase===p,p,65000);
function unchangedCareer(actual,before){for(const key of ['wallet','daily','stats','caps','activities','fights','casino','marathon','inventory'])assert.deepEqual(actual[key],before[key],`${key} must remain unchanged by a friendly console game.`);}
async function run(mobile){
 const name=mobile?'mobile568':'desktop';console.log(`RETRO RACE ${name}`);
 const profile=new CareerProfile({storage:null});assert.ok(profile.recordFight({opponent:'beton',winner:'player'}).ok);profile.setLocation(HOME_RACE_RETURN);
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 if(!built&&!publicSite)await suppressHotReload(context);
 if(built)await context.route('https://retro-race-build.invalid/BoxeurDeux-D/**',async route=>{
  const rel=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html';const file=path.resolve('dist',rel);
  if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
  try{await route.fulfill({status:200,body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream'});}
  catch{await route.fulfill({status:404,body:'Missing production asset'});}
 });
 await context.addInitScript(({key,data})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,data);localStorage.setItem(`${key}-backup`,data);}},{key:CAREER_STORAGE_KEY,data:profile.exportText()});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(publicSite?60000:30000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning'&&!/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(m.text()))report.warnings.push(m.text());});
 const cdp=mobile?await context.newCDPSession(page):null;
 const tap=async selector=>{await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).scrollIntoViewIfNeeded();if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');}else await page.locator(selector).click();await page.waitForTimeout(60);};
 const confirm=async(root='#retro-race-ui')=>mobile?tap(`${root} [data-pad-button="a"]`):page.keyboard.press('KeyE');
 const choose=async(selector,root='#retro-race-ui')=>{await page.locator(selector).waitFor({state:'visible'});for(let n=0;n<30;n++){if(await page.locator(selector).evaluate(e=>e===document.activeElement)){await confirm(root);return;}
   if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(page,root,'down')]);await dispatch(cdp,'touchEnd');}else await page.keyboard.press('ArrowDown');await page.waitForTimeout(35);}
   throw Error(`Cannot reach menu item ${selector}`);
 };
 const pause=()=>mobile?tap('#retro-race-ui .console-menu-button'):page.keyboard.press('KeyP');
 const resume=()=>choose('[data-race-action="resume"]');
 const shot=async label=>{const geometry=await fit(page,'#retro-race-ui',mobile,true);assert.ok(geometry.fits&&geometry.noScroll);assert.ok(geometry.controls.every(c=>c.fits&&c.outside));await page.screenshot({path:`${output}/${name}-${label}.png`});return geometry;};
 const homeReady=async()=>{await wait(page,()=>document.querySelector('#stage')?.dataset.scene==='home',null,30000);await page.locator('#scene-loading').waitFor({state:'hidden'});for(const selector of ['.career-start-continue','.career-continue'])if(await page.locator(selector).isVisible())await tap(selector);await page.waitForTimeout(200);};
 const invite=async()=>{await homeReady();await confirm('#gym-ui');if(await page.locator('[data-gym-action="invite-karl"]').isVisible())await choose('[data-gym-action="invite-karl"]','#gym-ui');await choose('[data-gym-action="race-karl"]','#gym-ui');await phase(page,'ready');};
 try{
  await page.goto(new URL(direct?'?scene=retro-race':'',url).href);
  for(const selector of ['.career-start-continue','.career-continue'])if(await page.locator(selector).isVisible())await tap(selector);
  if(direct)await phase(page,'ready');else await invite();
  const before=await saved(page);assert.equal(before.leisure.race.karlWins,0);await page.waitForTimeout(300);assert.equal(await page.locator('.race-time').textContent(),'0:00.00');
  await shot('invitation');await confirm();await phase(page,'countdown');await pause();await phase(page,'paused');
  const pausedClock=await page.locator('.race-time').textContent();await page.waitForTimeout(350);assert.equal(await page.locator('.race-time').textContent(),pausedClock);
  await resume();await phase(page,'running');
  // The held accelerator and simultaneous steering come from actual device inputs.
  if(mobile){const gas=await buttonPoint(page,'#retro-race-ui [data-pad-button="a"]',2);await dispatch(cdp,'touchStart',[gas]);await page.waitForTimeout(600);await dispatch(cdp,'touchStart',[gas,await joyPoint(page,'#retro-race-ui','left',1)]);await page.waitForTimeout(250);assert.equal(await page.locator('#retro-race-ui .joypad').evaluate(e=>e.classList.contains('is-held')),true);assert.equal(await page.locator('#retro-race-ui [data-pad-button="a"]').evaluate(e=>e.classList.contains('is-held')),true);await dispatch(cdp,'touchEnd');}
  else{await page.keyboard.down('ArrowUp');await page.waitForTimeout(600);await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowUp');}
  assert.ok(parseInt(await page.locator('.race-speed').textContent(),10)>25,'Real acceleration produces visible speed.');const trackGeometry=await shot('driving');
  const speedBeforeBrake=parseInt(await page.locator('.race-speed').textContent(),10);
  if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,'#retro-race-ui [data-pad-button="b"]')]);await page.waitForTimeout(250);await dispatch(cdp,'touchEnd');}
  else{await page.keyboard.down('ArrowDown');await page.waitForTimeout(250);await page.keyboard.up('ArrowDown');}
  assert.ok(parseInt(await page.locator('.race-speed').textContent(),10)<speedBeforeBrake,'Holding B/down brakes the moving car.');
  await pause();await phase(page,'paused');const time=await page.locator('.race-time').textContent();await page.waitForTimeout(300);assert.equal(await page.locator('.race-time').textContent(),time);await shot('pause');await resume();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await phase(page,'paused');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await resume();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await phase(page,'paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await resume();
  if(mobile){await page.setViewportSize({width:390,height:844});await page.locator('#rotate-prompt').waitFor({state:'visible'});await phase(page,'paused');await page.screenshot({path:`${output}/${name}-portrait.png`});await page.setViewportSize({width:568,height:320});await resume();}
  console.log(`RETRO RACE ${name}: waiting for Karl's real three laps`);
  await phase(page,'finished');assert.match(await page.locator('#race-title').textContent(),/Karl remporte/);
  const result=await saved(page);assert.deepEqual(result.leisure.race,{playerWins:0,karlWins:1,bestMs:null});unchangedCareer(result,before);
  await shot('result');await page.waitForTimeout(550);assert.deepEqual((await saved(page)).leisure.race,result.leisure.race,'The finish writes exactly one result.');
  await choose('[data-race-action="start"]');await phase(page,'countdown');await pause();await choose('[data-race-action="return"]');
  if(!direct){
   await homeReady();assert.deepEqual((await saved(page)).leisure.race,result.leisure.race);await invite();await confirm();await phase(page,'countdown');
   await page.reload();await homeReady();assert.deepEqual((await saved(page)).leisure.race,result.leisure.race,'Reload abandons an unfinished race and returns home.');
   await invite();await confirm();await phase(page,'countdown');await page.evaluate(()=>window.dispatchEvent(new CustomEvent('career-menu-change',{detail:{open:true}})));await phase(page,'paused');
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('career-menu-change',{detail:{open:false}})));await homeReady();assert.deepEqual((await saved(page)).leisure.race,result.leisure.race,'Career routing abandons without an extra result.');
   unchangedCareer(await saved(page),before);await page.screenshot({path:`${output}/${name}-salon-restored.png`});
  }
  report.cases.push({name,keyboard:!mobile,cdpTouch:mobile,invitationFromSalon:!direct,countdown:true,realAccelerationAndSteering:true,realBrake:true,pauseFreezesTime:true,blurAndVisibilityPause:true,portraitPause:mobile,actualKarlThreeLaps:true,idempotentSavedResult:result.leisure.race,moneyEnergyAndCareerUnchanged:true,abandonReturn:true,reloadAndCareerReturn:!direct,trackGeometry});
 }catch(error){await page.screenshot({path:`${output}/${name}-failure.png`}).catch(()=>{});throw error;}finally{await context.close();}
}
try{for(const mobile of process.env.RACE_DEVICE==='desktop'?[false]:process.env.RACE_DEVICE==='mobile'?[true]:[false,true])await run(mobile);assert.deepEqual(report.errors,[]);}
catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await browser.close();if(!report.failure)for(const item of report.cases){const file=`${output}/${item.name}-failure.png`;if(fs.existsSync(file))fs.unlinkSync(file);}fs.writeFileSync(`${output}/results${direct?'-direct':''}${process.env.RACE_DEVICE?`-${process.env.RACE_DEVICE}`:''}.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
