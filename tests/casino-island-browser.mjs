// Real exterior journeys: keyboard/CDP touch only. Position observations use the
// persisted career after an ordinary pause, so the same checks work in production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,wait,suppressHotReload,fit,dispatch,joyPoint,buttonPoint} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {casinoPoint} from '../src/game/CasinoWorld.js';

const built=process.env.CASINO_BUILT==='1',publicSite=!built&&Boolean(process.env.CASINO_URL);
const url=built?'https://casino-island-build.invalid/BoxeurDeux-D/':process.env.CASINO_URL??process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const output=`outputs/verification/casino-island/${built?'built':publicSite?'public':'dev'}`;
fs.mkdirSync(output,{recursive:true});
const report={date:new Date().toISOString(),url,built,publicSite,mobileEmulated:true,
 fixture:'Valid career methods and isolated browser contexts. Every journey, bridge collision and doorway uses real keyboard or CDP touch. Ordinary pauses flush observable position. No teleports, forced scene changes or accelerated clock.',cases:[],errors:[],warnings:[],failure:null};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
let activePage;
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
const progress=profile=>({daily:profile.daily,wallet:profile.wallet,casino:profile.casino,fights:profile.fights,tournament:profile.tournament,marathon:profile.marathon});

async function session(mobile,unlocked=true){
 const profile=new CareerProfile({storage:null});
 if(unlocked)profile._testBronze();else assert.equal(profile.recordFight({opponent:'beton',winner:'player'}).ok,true);
 profile.setLocation({scene:'marathon-island',x:428,y:1375,facing:'down'});
 profile.inspectImport(profile.exportText());
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
 if(!built&&!publicSite)await suppressHotReload(context);
 if(built)await context.route('https://casino-island-build.invalid/BoxeurDeux-D/**',async route=>{
  const relative=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html';
  const file=path.resolve('dist',relative);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
  try{await route.fulfill({status:200,body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream'});}
  catch{await route.fulfill({status:404,body:'Missing asset'});}
 });
 await context.addInitScript(({key,data})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,data);localStorage.setItem(`${key}-backup`,data);}},{key:CAREER_STORAGE_KEY,data:profile.exportText()});
 const page=await context.newPage();activePage=page;page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(publicSite?60000:30000);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
 page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());if(message.type()==='warning'&&!/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(message.text()))report.warnings.push(message.text());});
 const cdp=mobile?await context.newCDPSession(page):null;
 const tap=async selector=>{await page.locator(selector).waitFor({state:'visible'});if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');}else await page.locator(selector).click();await page.waitForTimeout(60);};
 const state=()=>page.evaluate(key=>{const location=JSON.parse(localStorage.getItem(key)).location;return{...location,place:location.scene,renderedPlace:document.querySelector('#stage')?.dataset.scene,mode:document.querySelector('#gym-ui')?.dataset.mode};},CAREER_STORAGE_KEY);
 const ready=async place=>{
  await wait(page,place=>document.querySelector('#stage')?.dataset.scene===place,place,30000);
  for(const selector of ['.career-start-continue','.career-continue'])if(await page.locator(selector).isVisible())await tap(selector);
  await page.locator('#scene-loading').waitFor({state:'hidden'});
  await wait(page,({key,place})=>JSON.parse(localStorage.getItem(key)).location.scene===place,{key:CAREER_STORAGE_KEY,place});
  await page.waitForTimeout(120);
 };
 const drive=async(direction,duration)=>{
  const before=await state();
  const key={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'}[direction];
  if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',direction)]);else await page.keyboard.down(key);
  try{await page.waitForTimeout(duration);}finally{if(mobile)await dispatch(cdp,'touchEnd');else await page.keyboard.up(key);}
  await page.waitForTimeout(75);
  const after=await state();
  // Real pause/reprise flushes the current position; releases alone need the
  // automatic 1.5-second save cadence. This also verifies pause on both maps.
  if(after.place===before.place&&after.renderedPlace===before.place&&after.mode==='walking'){
   if(mobile)await tap('#gym-ui .gym-pause-button');else await page.keyboard.press('KeyP');
   await tap('#gym-ui .gym-resume-button');
  }
 };
 const axis=async(axis,target)=>{
  const initial=await state();let previous=initial[axis],stuck=0;
  for(let step=0;step<180;step++){
   const current=await state();if(current.place!==initial.place)return;
   const delta=target-current[axis];if(Math.abs(delta)<10)return;
   const direction=axis==='x'?(delta>0?'right':'left'):(delta>0?'down':'up');
   await drive(direction,Math.min(800,Math.max(45,Math.abs(delta)/225*800)));
   const after=await state();if(after.place!==initial.place||after.mode==='dialog')return;
   if(Math.abs(after[axis]-previous)<1)stuck++;else stuck=0;
   assert.ok(stuck<7,`Blocked while walking ${initial.place} ${axis}→${target}; ${JSON.stringify(after)}`);previous=after[axis];
  }
  throw new Error(`Walk timed out ${initial.place} ${axis}→${target}`);
 };
 const move=async(x,y)=>{const initial=(await state()).place;await axis('x',x);if((await state()).place===initial)await axis('y',y);};
 const follow=async points=>{const initial=(await state()).place;for(const [x,y]of points){await move(x,y);if((await state()).place!==initial)return;}};
 const screenshot=async name=>{await page.screenshot({path:`${output}/${mobile?'mobile568':'desktop'}-${name}.png`});};
 const reload=async place=>{
  const before=await saved(page);await page.reload();await ready(place);const after=await saved(page);
  assert.deepEqual(progress(after),progress(before),'Reload preserves the progression and all balances.');
  assert.equal(after.location.scene,place);assert.ok(Math.abs(after.location.x-before.location.x)<=1&&Math.abs(after.location.y-before.location.y)<=1,'Reload preserves the exterior or interior position.');
  await page.waitForTimeout(350);assert.equal((await state()).place,place,'No automatic return trip after reloading next to a door.');
 };
 return{context,page,tap,state,ready,drive,axis,move,follow,screenshot,reload,initial:profile.snapshot()};
}

async function lockedCheck(mobile){
 const s=await session(mobile,false);console.log(`CASINO ISLAND locked ${mobile?'mobile':'desktop'}`);
 try{
  await s.page.goto(`${url}?scene=casino-lobby`);await s.ready('casino-island');
  assert.deepEqual(progress(await saved(s.page)),progress(s.initial));
  await s.move(1250,915);await s.axis('y',830);
  await s.page.locator('.gym-dialog:not([hidden])').waitFor({state:'visible'});
  assert.match(await s.page.locator('#gym-dialog-text').textContent(),/Gants de bronze/);
  assert.equal((await s.state()).place,'casino-island');
  assert.deepEqual(progress(await saved(s.page)),progress(s.initial));
  await s.screenshot('bronze-required');report.cases.push({name:`locked-${mobile?'mobile':'desktop'}`,directUrlBlocked:true,doorBlocked:true,progressionUnchanged:true});
 }catch(error){await s.screenshot('locked-failure').catch(()=>{});throw error;}finally{await s.context.close();}
}

async function journey(mobile){
 const s=await session(mobile),name=mobile?'mobile':'desktop';console.log(`CASINO ISLAND journey ${name}`);
 const checks=[];
 try{
  await s.page.goto(url);await s.ready('marathon-island');
  // The former entrance no longer opens a casino on the marathon map.
  await s.follow([[680,1375],[680,930],[420,930],[420,760]]);
  assert.equal((await s.state()).place,'marathon-island');await s.screenshot('old-island-without-casino');checks.push('Old casino doorway removed from marathon island');
  await s.follow([[420,930],[680,930],[680,1375],[125,1375],[125,1335]]);await s.screenshot('west-connection');
  await s.axis('x',40);await s.ready('casino-island');
  assert.ok((await s.state()).x>2600,'West passage arrives at the new island’s east bridge');
  await s.screenshot('bridge-arrival');await s.reload('casino-island');checks.push('Real crossing from marathon island to separate casino island, with exact reload');
  await s.move(2500,800);await s.drive('up',1200);
  const north=await s.state();assert.ok(north.y>=758&&north.y<=780,`Bridge north railing stops the player before water: ${JSON.stringify(north)}`);
  await s.drive('up',420);assert.ok(Math.abs((await s.state()).y-north.y)<2,'Holding up cannot enter the northern water');
  await s.move(2500,800);await s.drive('down',1200);
  const south=await s.state();assert.ok(south.y>=818&&south.y<=838,`Bridge south railing stops the player before water: ${JSON.stringify(south)}`);
  await s.drive('down',420);assert.ok(Math.abs((await s.state()).y-south.y)<2,'Holding down cannot enter the southern water');
  await s.move(2500,800);await s.screenshot('bridge-water-collision');checks.push('Both sides of bridge block real walking into water');
  await s.follow([[1700,800],[1700,930],[1250,930],[1250,915]]);await s.screenshot('casino-exterior');
  await s.reload('casino-island');await s.axis('y',830);await s.ready('casino-lobby');await s.screenshot('lobby-arrival');
  await s.reload('casino-lobby');checks.push('Casino entry and interior reload preserve exact position');
  await s.axis('y',casinoPoint(835,919).y);await s.ready('casino-island');
  assert.ok((await s.state()).y>880,'Casino exit lands outside its doorway');await s.reload('casino-island');
  await s.screenshot('casino-exit');checks.push('Casino exits to its own island, without doorway rebound');
  await s.follow([[1250,930],[1700,930],[1700,800],[2810,800]]);await s.ready('marathon-island');
  assert.ok((await s.state()).x<210,'Return passage arrives west of the metro');await s.reload('marathon-island');
  await s.follow([[125,1375],[428,1375],[428,1310]]);await s.ready('metro-island-hall');await s.screenshot('metro-return');
  checks.push('Same bridge returns to marathon island and original metro entrance');
  const final=await saved(s.page);assert.deepEqual(progress(final),progress(s.initial),'Journey does not alter Bronze, marathon, money, chips or daily energy.');
  new CareerProfile({storage:null}).inspectImport(JSON.stringify(final));
  const geometry=await fit(s.page,'#gym-ui',mobile);assert.ok(geometry.fits&&geometry.noScroll);for(const control of geometry.controls)assert.ok(control.fits&&control.outside);
  report.cases.push({name:`journey-${name}`,checks,progressionUnchanged:true,savedCareerValid:true,geometry});
 }catch(error){await s.screenshot('journey-failure').catch(()=>{});throw error;}finally{await s.context.close();}
}

try{
 const modes=process.env.CASINO_MOBILE==='1'?[true]:process.env.CASINO_DESKTOP==='1'?[false]:[false,true];
 for(const mobile of modes){await lockedCheck(mobile);await journey(mobile);}
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(activePage&&!activePage.isClosed())await activePage.screenshot({path:`${output}/failure.png`}).catch(()=>{});}
finally{await browser.close();const suffix=process.env.CASINO_MOBILE==='1'?'-mobile':process.env.CASINO_DESKTOP==='1'?'-desktop':'';fs.writeFileSync(`${output}/results${suffix}.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
