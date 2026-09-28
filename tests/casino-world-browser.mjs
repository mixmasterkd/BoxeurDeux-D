import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,wait,suppressHotReload,fit,dispatch,joyPoint,buttonPoint} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {casinoPoint} from '../src/game/CasinoWorld.js';

const url=process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const mobile=process.env.CASINO_MOBILE==='1';
const output='outputs/verification/casino';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const report={url,mobile,tests:[],errors:[]};
let page;
try{
 const lockedContext=await browser.newContext({viewport:{width:1280,height:900}});
 await suppressHotReload(lockedContext);
 const lockedProfile=new CareerProfile({storage:null});
 await lockedContext.addInitScript(({key,save})=>localStorage.setItem(key,save),{key:CAREER_STORAGE_KEY,save:lockedProfile.exportText()});
 const lockedPage=await lockedContext.newPage();await lockedPage.goto(`${url}?scene=casino-lobby`);
 await wait(lockedPage,()=>window.__marathon?.scene.place==='marathon-island',null,30000);
 assert.equal(await lockedPage.evaluate(()=>Boolean(window.__casino)),false,'Une URL directe ne contourne pas le déblocage des Gants de bronze');
 await lockedContext.close();report.tests.push('Accès direct avant les Gants de bronze renvoyé sur l’île');
 const profile=new CareerProfile({storage:null});profile._testBronze();
 profile.setLocation({scene:'marathon-island',x:428,y:1375,facing:'down'});
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 await suppressHotReload(context);
 await context.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:CAREER_STORAGE_KEY,save:profile.exportText()});
 page=await context.newPage();const cdp=mobile?await context.newCDPSession(page):null;
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
 const tap=async selector=>{if(!mobile)return page.locator(selector).click();await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');};
 const interact=async()=>mobile?tap('#gym-ui [data-pad-button="a"]'):page.keyboard.press('KeyE');
 const choose=id=>tap(`[data-gym-action="${id}"]`);
 const state=()=>page.evaluate(()=>{const host=window.__casino??window.__marathon;return host?{x:host.world.state.x,y:host.world.state.y,place:host.scene.place}:null;});
 const ready=place=>wait(page,place=>(window.__casino??window.__marathon)?.scene.place===place&&document.getElementById('stage').dataset.scene===place,place,30000);
 async function axis(axis,target){
  const before=await state();if(Math.abs(before[axis]-target)<10)return;
  const positive=before[axis]<target,dir=axis==='x'?(positive?'right':'left'):(positive?'down':'up');
  const key={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'}[dir];
  if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',dir)]);else await page.keyboard.down(key);
  try{await wait(page,({axis,target,positive,place})=>{const h=window.__casino??window.__marathon;return h?.scene.place!==place||h&&(positive?h.world.state[axis]>=target-7:h.world.state[axis]<=target+7);},{axis,target,positive,place:before.place},15000);}
  finally{if(mobile)await dispatch(cdp,'touchEnd');else await page.keyboard.up(key);}
  await page.waitForTimeout(65);
 }
 const move=async(x,y)=>{await axis('x',x);await axis('y',y);};
 const art=async(x,y)=>{const p=casinoPoint(x,y);await move(p.x,p.y);};
 const shot=label=>page.screenshot({path:`${output}/world-${mobile?'mobile':'desktop'}-${label}.png`});
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready('marathon-island');
 for(const selector of ['.career-start-continue','.career-continue'])if(await page.locator(selector).isVisible())await page.locator(selector).click();
 await move(680,1375);await move(680,930);await move(420,930);await shot('exterior');await axis('y',760);await ready('casino-lobby');
 report.tests.push('Métro de l’île → entrée du casino à pied');await shot('lobby');
 const initial=profile.snapshot();
 await art(835,690);await art(1040,690);await art(1040,300);await art(1230,285);await interact();
 await choose('cash-deposit-20');let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
 assert.equal(saved.casino.chips,20);assert.equal(saved.wallet.money,initial.wallet.money-20);await choose('close');
 report.tests.push('Caisse : échange de 20 dollars contre 20 jetons sauvegardés');
 await art(1040,300);await art(837,300);await art(837,266);await interact();await choose('floor-casino-tables');await ready('casino-tables');
 await art(837,655);await art(560,655);await art(560,590);await shot('karl');await interact();
 assert.match(await page.locator('#gym-dialog-title').textContent(),/petite partie/);await choose('karl-rules');assert.match(await page.locator('#gym-dialog-text').textContent(),/21/);await choose('close');
 await art(560,655);await art(837,655);await art(837,330);await art(233,330);await art(233,292);await interact();assert.match(await page.locator('#gym-dialog-title').textContent(),/Galas/);await choose('close');
 report.tests.push('Karl reconnaît les Gants de bronze; règles et future salle de gala accessibles');
 await art(233,330);await art(837,330);await interact();await choose('floor-casino-poker');await ready('casino-poker');
 await art(1200,312);await art(1200,705);await art(837,705);await shot('poker');
 await art(440,705);await art(440,480);await interact();assert.match(await page.locator('#gym-dialog-text').textContent(),/Luc.*Mireille.*Marco/s);await choose('close');
 await art(440,330);await art(837,330);await art(837,312);await interact();await choose('floor-casino-lobby');await ready('casino-lobby');
 report.tests.push('Trois étages reliés par ascenseur; trois profils au poker');
 await art(837,300);await art(1040,300);await art(1230,285);await interact();await choose('cash-withdraw-all');await choose('close');
 saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);assert.equal(saved.casino.chips,0);assert.equal(saved.wallet.money,initial.wallet.money);
 assert.deepEqual(saved.daily,initial.daily,'La promenade et les échanges ne consomment aucune énergie');
 await art(1040,300);await art(1040,690);await art(835,690);await art(835,875);await axis('y',casinoPoint(835,919).y);await ready('marathon-island');
 assert.ok((await state()).y>790,'La sortie ne rebondit pas dans l’entrée');
 report.tests.push('Récupération de tous les jetons, énergie conservée, sortie sur l’île');
 const geometry=await fit(page,'#gym-ui',mobile);assert.ok(geometry.fits&&geometry.noScroll);if(mobile)assert.ok(geometry.controls.every(control=>control.outside&&control.fits));
 assert.deepEqual(report.errors,[]);
 await fs.writeFile(`${output}/world-${mobile?'mobile':'desktop'}-results.json`,JSON.stringify({...report,geometry},null,2));
 console.log(JSON.stringify(report,null,2));
}catch(error){if(page)await page.screenshot({path:`${output}/world-failure.png`});throw error;}
finally{await browser.close();}
