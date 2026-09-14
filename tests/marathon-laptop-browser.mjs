import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,wait,suppressHotReload,fit,dispatch,joyPoint,buttonPoint} from './control-helpers.mjs';
import {COURSE_POINTS,ROAD_Y} from '../src/game/MarathonWorld.js';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
const mobile=process.env.MARATHON_MOBILE==='1';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
await fs.mkdir('outputs/verification/chapter-v5',{recursive:true});
const errors=[];const results=[];
try{
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});await suppressHotReload(context);
 const profile=new CareerProfile({storage:null});profile.applyTestCommand('test maison');profile.setLocation({scene:'home',x:255,y:545,facing:'left'});
 await context.addInitScript(({key,data})=>{if(!localStorage.getItem(key))localStorage.setItem(key,data);},{key:CAREER_STORAGE_KEY,data:profile.exportText()});
 const page=await context.newPage();const cdp=mobile?await context.newCDPSession(page):null;let touchHeld=false;const tap=async selector=>{if(!mobile)return page.locator(selector).click();await dispatch(cdp,'touchStart',[await buttonPoint(page,selector)]);await dispatch(cdp,'touchEnd');};const key=async code=>mobile?tap(code==='KeyE'?'#gym-ui [data-pad-button="a"]':code==='KeyP'?'#gym-ui .console-menu-button':'#gym-ui [data-pad-button="b"]'):page.keyboard.press(code);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/?scene=home');await wait(page,()=>window.__exploration?.world);
 const career=page.locator('.career-start-continue');if(await career.isVisible())await career.click();
 await key('KeyE');await wait(page,()=>document.querySelector('.laptop-window:not([hidden])'));
 await page.screenshot({path:`outputs/verification/chapter-v5/laptop-${mobile?'mobile':'pc'}.png`});
 await tap('[data-gym-action="laptop-terminal"]');
 const normal=await page.evaluate(key=>localStorage.getItem(key),CAREER_STORAGE_KEY);
 const input=page.locator('.terminal-console input');await input.fill('liste');await input.press('Enter');assert.match(await page.locator('.terminal-console pre').textContent(),/test cuba/);
 await page.locator('.terminal-console input').fill('test marathon');await page.locator('.terminal-console input').press('Enter');
 await wait(page,()=>window.__marathon?.world);assert.equal(await page.evaluate(key=>localStorage.getItem(key),CAREER_STORAGE_KEY),normal);
 results.push('CLI liste et profil de test isolé : carrière normale inchangée');
 await page.screenshot({path:`outputs/verification/chapter-v5/island-${mobile?'mobile':'pc'}.png`});
 const release=async()=>{if(mobile){if(touchHeld)await dispatch(cdp,'touchEnd');touchHeld=false;return;}for(const key of ['KeyA','KeyD','KeyW','KeyS'])await page.keyboard.up(key);};
 const move=async(x,y,{untilChange=false}={})=>{
  const initial=await page.evaluate(()=>window.__marathon.scene.place);let stuck=0,last=null;
  for(let i=0;i<180;i++){
   const o=await page.evaluate(()=>({place:window.__marathon?.scene.place,s:window.__marathon?.world.state,dialog:window.__marathon?.ui.dialog}));
   if(o.place!==initial||!o.s){await release();return;}
   if(o.dialog){await release();if(await page.locator('[data-gym-action="avoid-encounter"]').isVisible()){await tap('[data-gym-action="avoid-encounter"]');continue;}return;}
   const dx=x-o.s.x,dy=y-o.s.y;if(Math.abs(dx)<23&&Math.abs(dy)<23){await release();return;}
   if(last&&Math.hypot(o.s.x-last.x,o.s.y-last.y)<1)stuck++;else stuck=0;
   assert.ok(stuck<14,`Movement blocked in ${o.place} at ${JSON.stringify(o.s)} towards ${x},${y}`);last={x:o.s.x,y:o.s.y};
   const held=new Set([...(Math.abs(dx)>10?[dx>0?'KeyD':'KeyA']:[]),...(Math.abs(dy)>10?[dy>0?'KeyS':'KeyW']:[])]);
   if(mobile){const rect=await page.locator('#gym-ui .joypad').boundingBox();if(!rect){await release();return;}const len=Math.hypot(dx,dy)||1,magnitude=Math.max(.28,Math.min(1,len/120));const p={id:1,x:rect.x+rect.width/2+dx/len*rect.width*.37*magnitude,y:rect.y+rect.height/2+dy/len*rect.height*.37*magnitude};await dispatch(cdp,touchHeld?'touchMove':'touchStart',[p]);touchHeld=true;}else for(const key of ['KeyA','KeyD','KeyW','KeyS'])if(held.has(key))await page.keyboard.down(key);else await page.keyboard.up(key);
   await page.waitForTimeout(85);
  }
  await release();throw Error(`Walk timed out towards ${x},${y}: ${JSON.stringify(await page.evaluate(()=>({state:window.__marathon.world.state,input:window.__marathon.world.input,point:window.__marathon.scene.routePoint})))}`);
 };
 if((await page.evaluate(()=>window.__marathon.world.state.y))>1000){await move(680,1375);await move(680,850);}await move(930,820);await key('KeyE');
 await tap('[data-gym-action="start-marathon"]');
 await wait(page,()=>window.__marathon.scene.isRunning());
 await page.screenshot({path:`outputs/verification/chapter-v5/marathon-start-${mobile?'mobile':'pc'}.png`});
 await key('KeyP');await wait(page,()=>window.__marathon.world.state.paused);const t=await page.evaluate(()=>window.__marathon.scene.elapsed);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>window.__marathon.scene.elapsed),t);if(mobile){await page.setViewportSize({width:320,height:568});await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__marathon.scene.elapsed),t);assert.ok(await page.locator('.rotate-prompt').isVisible());await page.screenshot({path:'outputs/verification/chapter-v5/marathon-portrait.png'});await page.setViewportSize({width:568,height:320});await page.waitForTimeout(150);}await key('Escape');
 // Actual full route. Observed waypoints guide keyboard input; no engine
 // mutation, fixture teleport, accelerated clock or forced result.
 for(const place of ['marathon-island','marathon-downtown','marathon-oldport','marathon-stadium']){
   await wait(page,p=>window.__marathon?.scene.place===p,place,15000);
   for(const [i,target]of COURSE_POINTS[place].entries()){if(await page.evaluate(()=>window.__marathon.scene.place)!==place)break;await move(target.x,target.y);if(place==='marathon-island'&&i===16)await page.screenshot({path:`outputs/verification/chapter-v5/bridge-${mobile?'mobile':'pc'}.png`});if(i===4)await page.screenshot({path:`outputs/verification/chapter-v5/${place}-landmark-${mobile?'mobile':'pc'}.png`});}
   await page.screenshot({path:`outputs/verification/chapter-v5/${place}-${mobile?'mobile':'pc'}.png`});
   if(place==='marathon-stadium')await page.locator('#gym-dialog-title').filter({hasText:'Tu as franchi'}).waitFor({timeout:15000});
   else {if(await page.evaluate(()=>window.__marathon.scene.place)===place)await move(2838,ROAD_Y[place],{untilChange:true});await wait(page,p=>window.__marathon?.scene.place!==p,place,15000);}
 }
 await page.screenshot({path:`outputs/verification/chapter-v5/marathon-finish-${mobile?'mobile':'pc'}.png`});
 results.push(`Course complète via ${mobile?'joypad tactile simulé':'clavier'}, pause, altercation évitée, médaille`);
 await key('KeyE');await page.screenshot({path:`outputs/verification/chapter-v5/stadium-arrival-${mobile?'mobile':'pc'}.png`});for(const [x,y]of [[2180,545],[2180,970],[2090,970],[2090,1500],[2370,1500],[2370,1420]])await move(x,y);await wait(page,()=>window.__metro?.scene.place==='metro-stadium-hall');results.push('Retour au métro du Stade à pied après l’arrivée');const layout=await fit(page,'#gym-ui',mobile);assert.ok(layout.fits&&layout.noScroll);assert.ok(layout.controls.every(c=>c.outside&&c.fits));const report={date:new Date().toISOString(),results,errors,mobileEmulated:mobile,fit:layout};await fs.writeFile(`outputs/verification/chapter-v5/marathon-${mobile?'mobile':'desktop'}-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.deepEqual(errors,[]);
 await context.close();
}catch(error){console.error(error);const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:'outputs/verification/chapter-v5/marathon-failure.png'});throw error;}finally{await browser.close();}
