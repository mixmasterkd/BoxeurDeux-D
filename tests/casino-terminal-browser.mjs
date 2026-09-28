// Focused terminal smoke. Fixture placement is beside the home-office computer; every
// command, transition and mode switch then uses visible UI and real controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,wait,dispatch,joyPoint,buttonPoint,suppressHotReload,fit} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY,CAREER_TEST_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {CASINO_ISLAND_RETURN} from '../src/game/CasinoIslandWorld.js';
import {HOME_BAR_LAYOUTS} from '../src/game/HomeBarWorld.js';

const built=process.env.CASINO_BUILT==='1',publicSite=!built&&Boolean(process.env.CASINO_URL);
const url=built?'https://casino-terminal-build.invalid/BoxeurDeux-D/':process.env.CASINO_URL??process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const output=process.env.CASINO_TERMINAL_OUTPUT??`outputs/verification/casino-terminal/${built?'built':publicSite?'public':'dev'}`;
fs.mkdirSync(output,{recursive:true});
const report={date:new Date().toISOString(),url,built,publicSite,mobileEmulated:true,
 fixture:'Isolated valid normal career beside the office computer. Real terminal commands, keyboard/CDP touch, doorway and pause exit. No gameplay hooks or test-state injection.',cases:[],errors:[],warnings:[],failure:null};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const bytes=page=>page.evaluate(key=>({normal:localStorage.getItem(key),backup:localStorage.getItem(`${key}-backup`)}),CAREER_STORAGE_KEY);
const testSave=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_TEST_STORAGE_KEY);
const pageIs=(page,name)=>wait(page,name=>document.querySelector('.laptop-window')?.dataset.page===name,name);

async function run(mobile){
 const name=mobile?'mobile568':'desktop';console.log(`CASINO TERMINAL ${name}`);
 const profile=new CareerProfile({storage:null});
 assert.ok(profile.recordFight({opponent:'beton',winner:'player'}).ok);
 const computer=HOME_BAR_LAYOUTS['home-office'].stations.find(station=>station.id==='laptop');
 profile.setLocation({scene:'home-office',x:computer.x,y:computer.y+38,facing:'up'});
 assert.equal(profile.casinoStatus().unlocked,false);
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 if(!built&&!publicSite)await suppressHotReload(context);
 if(built)await context.route('https://casino-terminal-build.invalid/BoxeurDeux-D/**',async route=>{
  const relative=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html';
  const file=path.resolve('dist',relative);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
  try{await route.fulfill({status:200,body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream'});}
  catch{await route.fulfill({status:404,body:'Missing production asset'});}
 });
 await context.addInitScript(({key,data})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,data);localStorage.setItem(`${key}-backup`,data);}},{key:CAREER_STORAGE_KEY,data:profile.exportText()});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(publicSite?60000:30000);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
 page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());if(message.type()==='warning'&&!/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(message.text()))report.warnings.push(message.text());});
 const cdp=mobile?await context.newCDPSession(page):null;
 const tap=async selector=>{await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).scrollIntoViewIfNeeded();if(mobile){await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');}else await page.locator(selector).click();await page.waitForTimeout(60);};
 const confirm=()=>mobile?tap('#gym-ui [data-pad-button="a"]'):page.keyboard.press('KeyE');
 const choose=async selector=>{
  await page.locator(selector).waitFor({state:'visible'});if(mobile)return tap(selector);
  for(let step=0;step<30;step++){
   if(await page.locator(selector).evaluate(e=>e===document.activeElement)){await confirm();return;}
   await page.keyboard.press('ArrowDown');
  }
  throw new Error(`Keyboard cannot focus ${selector}`);
 };
 const ready=async(place,test)=>{
  await wait(page,place=>document.querySelector('#stage')?.dataset.scene===place,place,30000);
  await page.locator('#scene-loading').waitFor({state:'hidden'});
  for(const selector of ['.career-start-continue','.career-continue'])if(await page.locator(selector).isVisible())await tap(selector);
  await wait(page,test=>document.querySelector('#gym-ui')?.dataset.profileTest===String(test),test);
  await page.waitForTimeout(150);
 };
 const screenshot=async label=>{const geometry=await fit(page,'#gym-ui',mobile);assert.ok(geometry.fits&&geometry.noScroll);assert.ok(geometry.controls.every(c=>c.outside&&c.fits));await page.screenshot({path:`${output}/${name}-${label}.png`});return geometry;};
 const command=async text=>{
  const selector='.terminal-console input';await tap(selector);
  await page.keyboard.type(text);
  if(mobile)await tap('[data-gym-action="laptop-run"]');else await page.keyboard.press('Enter');
 };
 try{
  await page.goto(url);await ready('home-office',false);
  await confirm();await pageIs(page,'desktop');
  await choose('[data-gym-action="laptop-terminal"]');await pageIs(page,'terminal');
  const normal=await bytes(page);
  await command('liste');assert.match(await page.locator('.terminal-console pre').textContent(),/test casino/);
  assert.deepEqual(await bytes(page),normal,'Listing commands does not alter the normal career or backup.');
  await screenshot('liste');
  await command('test casino');await ready('casino-island',true);
  const outside=await testSave(page);
  assert.deepEqual(outside.location,CASINO_ISLAND_RETURN,'The shortcut arrives in front of the separate island casino.');
  assert.equal(outside.wallet.money,400);assert.equal(outside.casino.chips,100);
  const testProfile=new CareerProfile({storage:null});testProfile.importText(JSON.stringify(outside));assert.equal(testProfile.casinoStatus().unlocked,true);
  assert.equal(outside.casino.active,null);assert.equal(outside.marathon.active,null);assert.equal(outside.tournament.active,null);
  await page.locator('#gym-ui .test-profile-indicator').waitFor({state:'visible'});
  assert.deepEqual(await bytes(page),normal,'The casino test cannot write the normal career or backup.');
  await screenshot('island-test');
  if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui','up')]);else await page.keyboard.down('ArrowUp');
  try{await page.waitForTimeout(450);}finally{if(mobile)await dispatch(cdp,'touchEnd');else await page.keyboard.up('ArrowUp');}
  await ready('casino-lobby',true);
  const inside=await testSave(page);assert.equal(inside.location.scene,'casino-lobby');assert.equal(inside.wallet.money,400);assert.equal(inside.casino.chips,100);
  assert.deepEqual(await bytes(page),normal);
  const geometry=await screenshot('lobby-test');
  if(mobile)await tap('#gym-ui .gym-pause-button');else await page.keyboard.press('KeyP');
  await choose('#gym-ui .test-profile-exit');await ready('home-office',false);await page.waitForTimeout(1700);
  assert.deepEqual(await bytes(page),normal,'Leaving test mode keeps normal career and backup byte-for-byte, even after autosave.');
  const restored=new CareerProfile({storage:null});restored.importText((await bytes(page)).normal);assert.equal(restored.casinoStatus().unlocked,false);
  assert.equal(await page.locator('#gym-ui .test-profile-indicator').isVisible(),false);
  await screenshot('normal-restored');
  report.cases.push({name,listeCasino:true,actualCasinoCommand:true,testModeVisible:true,spawn:outside.location,testMoney:400,testChips:100,testBronzeUnlocked:true,realCasinoDoorway:true,normalBronzeLocked:true,normalBytesIntact:true,backupBytesIntact:true,pauseExitRestoresNormal:true,geometry});
 }catch(error){await page.screenshot({path:`${output}/${name}-failure.png`}).catch(()=>{});throw error;}finally{await context.close();}
}
try{
 const modes=process.env.CASINO_MOBILE==='1'?[true]:process.env.CASINO_DESKTOP==='1'?[false]:[false,true];
 for(const mobile of modes)await run(mobile);
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await browser.close();const suffix=process.env.CASINO_MOBILE==='1'?'-mobile':process.env.CASINO_DESKTOP==='1'?'-desktop':'';fs.writeFileSync(`${output}/results${suffix}.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
