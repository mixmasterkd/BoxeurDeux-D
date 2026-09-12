import fs from 'node:fs';import assert from 'node:assert/strict';
import {chromium,wait,buttonPoint,dispatch} from './control-helpers.mjs';
import {CareerProfile} from '../src/game/CareerProfile.js';
import {hotelFixture,seedContext,CAREER_STORAGE_KEY} from './hotel-test-helpers.mjs';
const browser=await chromium.launch({headless:true}),url=process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const report={url,cases:[],errors:[],failure:null};const timer=setTimeout(()=>browser.close(),150000);
const saved=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),CAREER_STORAGE_KEY);
const ready=(p,place)=>wait(p,place=>window.__hotel?.scene.place===place,place,30000);
function result(p,winner='player'){const s=p.tournamentStatus();assert.equal(p.recordTournamentFight({opponent:s.opponent,matchId:s.currentMatchId,winner,score:10}).ok,true);}
async function tap(p,selector){if(!p.cdp)return p.locator(selector).click();const q=await buttonPoint(p,selector);await dispatch(p.cdp,'touchStart',[q]);await dispatch(p.cdp,'touchEnd',[]);}
async function interact(p){if(p.cdp)await tap(p,'#gym-ui [data-pad-button="a"]');else await p.keyboard.press('KeyE');await wait(p,()=>Boolean(window.__hotel.ui.dialog));}
async function choose(p,id){await tap(p,`[data-gym-action="${id}"]`);}
async function open(seed,mobile=false){
 const c=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile});await seedContext(c,seed);const p=await c.newPage();if(mobile)p.cdp=await c.newCDPSession(p);
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});await p.goto(url,{waitUntil:'domcontentloaded'});await tap(p,'.career-continue');await p.waitForTimeout(150);await ready(p,seed.snapshot().location.scene);await p.locator('#gym-ui .joypad').waitFor({state:mobile?'visible':'hidden'});return{c,p};
}
async function importBetweenFights(p,fixture){
 // Results are fixtures owned by combat tests; import them through the actual
 // save UI, then exercise physical bed/night/return controls here.
 if(p.cdp)await tap(p,'#gym-ui .console-menu-button');else await p.keyboard.press('KeyP');
 await wait(p,()=>window.__hotel.world.state.paused);
 await p.locator('.gym-import-file').setInputFiles({name:'resultat-tournoi.json',mimeType:'application/json',buffer:Buffer.from(fixture.exportText())});
 await p.locator('.gym-import-replace').waitFor({state:'visible'});await tap(p,'.gym-import-replace');
 await ready(p,fixture.snapshot().location.scene);await wait(p,()=>!window.__hotel.world.state.paused&&!window.__hotel.ui.dialog);
}
async function winStay(mobile){
 const fixture=hotelFixture();result(fixture);fixture.setLocation({scene:'hotel-room',x:894,y:392,facing:'up'});
 const{c,p}=await open(fixture,mobile);try{
 let before=await saved(p);await interact(p);await choose(p,'close');assert.deepEqual((await saved(p)).daily,before.daily);
 await interact(p);await choose(p,'sleep');await wait(p,()=>!window.__hotel.scene.sleeping&&window.__hotel.ui.dialog?.speaker==='LES GANTS DE BRONZE');
 let after=await saved(p);assert.equal(after.daily.day,before.daily.day+1);assert.equal(after.tournament.active.day,2);assert.equal(after.daily.energy,100);assert.deepEqual(after.stats,before.stats);await choose(p,'close');
 await p.reload();await tap(p,'.career-continue');await ready(p,'hotel-room');assert.equal((await saved(p)).tournament.active.day,2);
 const second=new CareerProfile({storage:null});second.importText(JSON.stringify(await saved(p)));result(second);second.setLocation({scene:'hotel-room',x:894,y:392,facing:'up'});await importBetweenFights(p,second);
 before=await saved(p);await interact(p);await choose(p,'sleep');
 if(mobile){await p.setViewportSize({width:390,height:844});await p.waitForTimeout(100);await p.setViewportSize({width:844,height:390});}else await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await wait(p,()=>!window.__hotel.scene.sleeping);assert.equal(await p.evaluate(()=>window.__hotel.world.state.paused),true,'focus/orientation loss during the night requires explicit resume');
 after=await saved(p);assert.equal(after.daily.day,before.daily.day+1);assert.equal(after.tournament.active.day,3);assert.deepEqual(after.stats,before.stats);
 await tap(p,'.gym-resume-button');await choose(p,'close');await p.screenshot({path:`docs/hotel-day3-${mobile?'mobile':'desktop'}.png`});
 const champion=new CareerProfile({storage:null});champion.importText(JSON.stringify(after));result(champion);champion.setLocation({scene:'hotel-lobby',x:640,y:609,facing:'down'});await importBetweenFights(p,champion);
 await p.screenshot({path:`docs/hotel-lobby-${mobile?'mobile':'desktop'}.png`});await interact(p);await choose(p,'close');assert.equal((await saved(p)).tournament.active.status,'champion');
 await interact(p);await choose(p,'leave');await wait(p,()=>window.__exploration?.scene.place==='neighborhood',null,30000);
 const returned=await saved(p);assert.equal(returned.tournament.active,null);assert.equal(returned.tournament.medals.length,1);assert.equal(returned.tournament.medals[0].type,'gold');assert.equal(returned.location.scene,'neighborhood');
 await p.reload();await tap(p,'.career-continue');await wait(p,()=>window.__exploration?.scene.place==='neighborhood',null,30000);assert.equal((await saved(p)).tournament.medals.length,1);
 report.cases.push({case:'three-day-stay-and-gold-return',mobile,day:returned.daily.day,medals:returned.tournament.medals,history:returned.tournament.history});
 }finally{await c.close();}
}
async function elimination(){
 const seed=hotelFixture();result(seed);seed.sleep();result(seed,'remi');seed.setLocation({scene:'hotel-venue',x:1152,y:500,facing:'up'});
 const{c,p}=await open(seed,true);try{await interact(p);assert.match(await p.locator('#gym-dialog-title').textContent(),/terminé/);assert.match(await p.locator('#gym-dialog-text').textContent(),/bronze/);
 await choose(p,'close');assert.equal((await saved(p)).tournament.active.status,'eliminated');
 await interact(p);await choose(p,'leave-confirm');await choose(p,'leave');await wait(p,()=>window.__exploration?.scene.place==='neighborhood',null,30000);
 const after=await saved(p);assert.equal(after.tournament.active,null);assert.equal(after.tournament.medals[0].type,'bronze');report.cases.push({case:'elimination-stay-or-return',medals:after.tournament.medals});
 }finally{await c.close();}
}
try{await winStay(false);await winStay(true);await elimination();assert.deepEqual(report.errors,[]);}catch(e){report.failure=e.stack;throw e;}finally{clearTimeout(timer);fs.writeFileSync('docs/hotel-stay-browser-results.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
