import fs from 'node:fs';import assert from 'node:assert/strict';
import {chromium,wait,dispatch,buttonPoint,joyPoint,fit} from './control-helpers.mjs';
import {hotelFixture,seedContext,CAREER_STORAGE_KEY} from './hotel-test-helpers.mjs';
const browser=await chromium.launch({headless:true}),url=process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const report={url,sessions:[],errors:[],failure:null};
const timer=setTimeout(()=>browser.close(),300000);
const state=p=>p.evaluate(()=>window.__hotelActivity.session.state);
const profile=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),CAREER_STORAGE_KEY);
async function tap(p,cdp,selector){if(!cdp)return p.locator(selector).click();const point=p.punchPoints?.[selector]??await buttonPoint(p,selector);await dispatch(cdp,'touchStart',[point]);await dispatch(cdp,'touchEnd',[]);}
async function action(p,cdp,expected){
 const key={jab:'KeyJ',cross:'KeyK',guardHead:'ArrowUp',guardBody:'ArrowDown',dodgeLeft:'ArrowLeft',dodgeRight:'ArrowRight'}[expected];
 if(!cdp){await p.keyboard.down(key);if(expected.startsWith('guard'))await p.waitForTimeout(300);await p.keyboard.up(key);return;}
 if(expected==='jab'||expected==='cross')return tap(p,cdp,`#rhythm-ui [data-pad-button="${expected==='jab'?'a':'b'}"]`);
 const direction={guardHead:'up',guardBody:'down',dodgeLeft:'left',dodgeRight:'right'}[expected],point=await joyPoint(p,'#rhythm-ui',direction);
 await dispatch(cdp,'touchStart',[point]);await p.waitForTimeout(expected.startsWith('guard')?320:70);await dispatch(cdp,'touchEnd',[]);
}
async function run(activity,mobile){
 console.log(`SESSION ${activity} ${mobile?'touch':'keyboard'}`);
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile});await seedContext(context,hotelFixture());
 const p=await context.newPage(),cdp=mobile?await context.newCDPSession(p):null;
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 try{
 await p.goto(url+'?scene='+activity,{waitUntil:'domcontentloaded'});if(await p.locator('.career-continue').isVisible())await p.locator('.career-continue').click();
 await wait(p,a=>window.__hotelActivity?.scene.activity===a,activity,30000);
 const initial=await profile(p);await tap(p,cdp,'.rhythm-primary');await wait(p,()=>window.__hotelActivity.session.state.phase==='running');
 assert.equal((await profile(p)).daily.energy,initial.daily.energy-10);
 p.punchPoints=cdp?Object.fromEntries(await Promise.all(['a','b'].map(async b=>{const selector=`#rhythm-ui [data-pad-button=\"${b}\"]`;return[selector,await buttonPoint(p,selector)];}))):null;
 const started=Date.now();let paused=false,seen=new Set;
 while((await state(p)).phase!=='finished'){
   const s=await state(p);
   if(!paused&&s.elapsed>13){
     paused=true;if(cdp)await tap(p,cdp,'#rhythm-ui .console-menu-button');else await p.keyboard.press('KeyP');
     const stopped=(await state(p)).elapsed;await p.waitForTimeout(180);assert.equal((await state(p)).elapsed,stopped);
     await tap(p,cdp,'.rhythm-primary');assert.equal((await profile(p)).daily.energy,initial.daily.energy-10);continue;
   }
   if(s.beat.expected&&!seen.has(s.beat.index)){
     await wait(p,time=>window.__hotelActivity.session.state.elapsed>=time,s.beat.inputAt-(mobile?.09:.018),4000);
     seen.add(s.beat.index);if(s.beat.index%8===0)console.log(activity,mobile?'touch':'PC','cue',s.beat.index,s.beat.expected);await action(p,cdp,s.beat.expected);
   }else await p.waitForTimeout(25);
 }
 const ended=Date.now(),s=await state(p),after=await profile(p);
 console.log('SUMMARY',activity,mobile,s.summary);assert.equal(s.summary.completed,true);assert.ok(s.summary.qualified);assert.ok(s.summary.accuracy>=90);
 assert.equal(after.activities[activity].sessions,initial.activities[activity].sessions+1);
 assert.equal(after.stats[activity==='pads'?'power':'endurance'],initial.stats[activity==='pads'?'power':'endurance']+(activity==='pads'?1:2));
 assert.equal(after.daily.energy,initial.daily.energy-10);assert.equal(after.tournament.active.status,'ready');
 const contacts=await p.evaluate(()=>window.__hotelActivity.contacts);
 if(activity==='pads')for(const e of contacts.filter(e=>['jab','cross'].includes(e.input))){
   const gloveX=e.visual.player.x+(e.input==='cross'?52:-52)*.68,gloveY=e.visual.player.y-568*.68;
   assert.ok(Math.hypot(gloveX-e.visual.x,gloveY-e.visual.y)<.1,'actual pose glove coincides with mitt when the hit is counted');
 }
 else assert.ok(s.summary.laps>=3);
 await p.screenshot({path:`docs/hotel-${activity}-complete-${mobile?'mobile':'desktop'}.png`});
 const layout=await fit(p,'#rhythm-ui',mobile,true);assert.ok(layout.noScroll&&layout.fits);if(mobile)assert.ok(layout.controls.every(c=>c.outside&&c.fits));
 report.sessions.push({activity,mobile,elapsedWallMs:ended-started,summary:s.summary,energy:after.daily.energy,stats:after.stats,contacts:contacts.length,layout});
 await p.reload();if(await p.locator('.career-continue').isVisible())await p.locator('.career-continue').click();await wait(p,a=>window.__hotelActivity?.scene.activity===a,activity,30000);
 const reload=await profile(p);assert.deepEqual(reload.stats,after.stats);assert.deepEqual(reload.daily,after.daily);
 }catch(e){console.log('SESSION FAILURE',e.message);report.failure=e.stack;throw e;}finally{await context.close().catch(()=>{});}
}
try{for(const mobile of process.env.HOTEL_TEST_MODE==='mobile'?[true]:[false,true])for(const activity of ['pads','pool'])await run(activity,mobile);assert.deepEqual(report.errors,[]);}
catch(e){report.failure=e.stack;throw e;}finally{clearTimeout(timer);fs.writeFileSync('docs/hotel-sessions-browser-results.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
