import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,wait,fit,dispatch,joyPoint,buttonPoint} from './control-helpers.mjs';
import {CareerProfile} from '../src/game/CareerProfile.js';
const url=process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true});
const report={tests:[],errors:[],failure:null};
const save=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('boxeur-deux-d-career-v1')));
const state=p=>p.evaluate(()=>__exploration.world.state);
const scene=async(p,name)=>{await wait(p,n=>window.__exploration?.scene.place===n&&window.__exploration.scene.player,name);await p.waitForTimeout(180);};
async function controls(p,mobile){
 const cdp=mobile?await p.context().newCDPSession(p):null;
 const tap=async selector=>{if(!mobile)return p.locator(selector).click();await dispatch(cdp,'touchStart',[await buttonPoint(p,selector)]);await dispatch(cdp,'touchEnd');};
 const interact=()=>mobile?tap('#gym-ui [data-pad-button="a"]'):p.keyboard.press('KeyE');
 const close=()=>mobile?tap('#gym-ui [data-pad-button="b"]'):p.keyboard.press('Escape');
 async function axis(axis,target,attempt=0){const before=(await state(p))[axis];if(Math.abs(before-target)<9)return;
 const positive=before<target,dir=axis==='x'?positive?'right':'left':positive?'down':'up',key={right:'ArrowRight',left:'ArrowLeft',up:'ArrowUp',down:'ArrowDown'}[dir];
 if(mobile){const point=await joyPoint(p,'#gym-ui',dir);if(Math.abs(before-target)<180){const r=await p.locator('#gym-ui .joypad').boundingBox();point.x=r.x+r.width/2+(point.x-r.x-r.width/2)*.36;point.y=r.y+r.height/2+(point.y-r.y-r.height/2)*.36;}await dispatch(cdp,'touchStart',[point]);}else await p.keyboard.down(key);
 try{await wait(p,({axis,target,positive})=>window.__exploration&&(positive?__exploration.world.state[axis]>=target-4:__exploration.world.state[axis]<=target+4),{axis,target,positive},14000);}
 finally{if(mobile)await dispatch(cdp,'touchEnd');else await p.keyboard.up(key);}
 const after=(await state(p))[axis];if(Math.abs(after-target)>22&&attempt<3)return axisMove(axis,target,attempt+1);
 assert.ok(Math.abs(after-target)<40,`${axis} reached ${after} expected ${target}`);
 }
 const axisMove=axis;
 return {axis,interact,close,tap,cdp,action:id=>tap(`[data-gym-action="${id}"]`)};
}
async function check(p,mobile){const f=await fit(p,'#gym-ui',mobile);assert.ok(f.noScroll&&f.fits);assert.ok(Math.abs(f.ratio-16/9)<.001);assert.equal(f.controls.length===0,!mobile);if(mobile)assert.ok(f.controls.every(c=>c.outside&&c.fits));return f;}
try{
 for(const mobile of process.env.CHAPTER_WORLD_PART==='purchase'?[]:[false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
 await ctx.routeWebSocket('**',ws=>{const server=ws.connectToServer();server.onMessage(m=>{if(typeof m==='string'&&(/"type":"(?:update|full-reload)"/.test(m)))return;ws.send(m);});});
 const p=await ctx.newPage(),c=await controls(p,mobile),label=mobile?'mobile':'desktop';
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 console.log(`${label}: livraison et boutiques`);await p.goto(url+'?scene=residential');await scene(p,'residential');await check(p,mobile);
 // Full real delivery route; no injected positions or rewards.
 await c.axis('x',1500);await c.axis('y',1255);await c.axis('x',1192);await c.interact();
 await wait(p,()=>document.querySelector('[data-gym-action="start-delivery"]'));
 assert.match(await p.locator('#gym-dialog-text').innerText(),/30 énergie/);assert.equal((await save(p)).daily.energy,100);
 await c.action('start-delivery');await wait(p,()=>__exploration.scene.player.texture.key.startsWith('cycling-'));
 assert.equal((await save(p)).daily.energy,70);await p.screenshot({path:`docs/chapter-cycling-${label}.png`});
 await c.axis('x',1500);await c.axis('y',680);await c.axis('x',441);await c.axis('y',500);await c.interact();
 assert.match(await p.locator('#gym-dialog-title').innerText(),/Merci/);await c.close();
 assert.equal((await save(p)).delivery.active.completed.length,1);
 // Pause stops the tip clock, and releasing a held direction does not leave it active.
 if(mobile)await c.tap('#gym-ui .console-menu-button');else await p.keyboard.press('KeyP');
 const frozen=await p.evaluate(()=>({clock:__exploration.scene.deliveryClock,x:__exploration.world.state.x}));await p.waitForTimeout(200);
 assert.equal(await p.evaluate(()=>__exploration.scene.deliveryClock),frozen.clock);if(mobile)await c.tap('#gym-ui [data-pad-button="a"]');else await p.keyboard.press('Enter');
 await c.axis('y',680);await c.axis('x',1190);await c.axis('y',500);await c.interact();await c.close();
 await c.axis('y',680);await c.axis('x',1942);await c.axis('y',500);await c.interact();
 let profile=await save(p);assert.equal(profile.delivery.active,null);assert.equal(profile.delivery.completedTours,1);assert.ok(profile.wallet.money>=15&&profile.wallet.money<=21);assert.equal(profile.daily.energy,70);await c.close();
 const deliveryMoney=profile.wallet.money;
 // Doorways in the larger adjoining district: route around parked cars.
 await c.axis('y',680);await c.axis('x',110);await c.interact();await scene(p,'commercial');
 await c.axis('x',1030);await c.axis('y',440);await c.axis('x',963);await c.interact();await scene(p,'clothing-shop');
 await c.axis('y',325);await c.interact();assert.match(await p.locator('#gym-dialog-title').innerText(),/Rue Nord/);
 assert.equal(await p.locator('[data-gym-action="buy-street-blue"]').isDisabled(),true,'One short tour cannot buy every outfit');await c.close();
 await c.axis('y',630);await c.interact();await scene(p,'commercial');
 await c.axis('x',1680);await c.axis('y',440);await c.axis('x',1522);await c.interact();await scene(p,'boxing-shop');
 await c.axis('y',325);await c.interact();assert.match(await p.locator('#gym-dialog-title').innerText(),/Coin Bleu/);await c.close();
 await p.screenshot({path:`docs/chapter-boxing-shop-${label}.png`});assert.equal((await save(p)).wallet.money,deliveryMoney);
 if(mobile){await p.setViewportSize({width:568,height:320});await p.waitForTimeout(300);await check(p,true);await p.screenshot({path:'docs/chapter-shop-mobile-small.png'});
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(150);assert.equal((await state(p)).paused,true);await p.screenshot({path:'docs/chapter-shop-portrait.png'});}
 console.log(`${label}: tournée et boutiques réussies`);report.tests.push({label,deliveryMoney,actualRoute:true,bothShopInteriors:true,geometry:true});await ctx.close();
 }
 // Purchases/equipment use a qualified fixture with honestly earned model funds;
 // actual transaction and equip occur through the UI, preserving the user's save.
 console.log('Achat, garde-robe et reprise');
 const fixture=new CareerProfile({storage:null});for(let i=0;i<5;i++){if(fixture.dailyStatus().energy<30)fixture.sleep();fixture.startDelivery();for(const stop of ['maison-12','maison-24','maison-36'])fixture.deliverParcel(stop,{tip:2});}
 fixture.setLocation({scene:'clothing-shop',x:640,y:325,facing:'up'});
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});await ctx.addInitScript(({value})=>{if(!localStorage.getItem('boxeur-deux-d-career-v1'))localStorage.setItem('boxeur-deux-d-career-v1',value);},{value:fixture.exportText()});
 await ctx.routeWebSocket('**',ws=>{const server=ws.connectToServer();server.onMessage(m=>{if(typeof m==='string'&&(/"type":"(?:update|full-reload)"/.test(m)))return;ws.send(m);});});
 const p=await ctx.newPage(),c=await controls(p,false);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.locator('.career-continue').click();await scene(p,'clothing-shop');await c.interact();
 await c.action('buy-street-blue');await c.action('confirm-buy-street-blue');assert.equal((await save(p)).wallet.money,77);assert.equal((await save(p)).inventory.equipped.street,'street-black');
 await c.close();await p.reload();await p.locator('.career-continue').click();
 // Continue restores the shop; reach home through actual doors and streets.
 await scene(p,'clothing-shop');await c.axis('y',630);await c.interact();await scene(p,'commercial');await c.axis('x',1050);await c.axis('y',780);await c.axis('x',2265);await c.interact();await scene(p,'residential');
 await c.axis('x',2265);await c.interact();await scene(p,'neighborhood');await c.axis('x',408);await c.axis('y',550);await c.interact();await scene(p,'home');await c.axis('y',350);await c.axis('x',180);await c.axis('y',320);await c.interact();await c.action('equip-street-blue');await c.close();
 assert.equal((await save(p)).inventory.equipped.street,'street-blue');assert.match(await p.evaluate(()=>__exploration.scene.player.texture.key),/street-blue/);await p.screenshot({path:'docs/chapter-home-outfit.png'});
 await p.reload();await p.locator('.career-continue').click();await scene(p,'home');assert.equal((await save(p)).inventory.equipped.street,'street-blue');assert.equal((await save(p)).wallet.money,77);
 report.tests.push({label:'purchase-equip',purchaseSeparateFromEquip:true,walkedHome:true,reload:true});await ctx.close();assert.deepEqual(report.errors,[]);
}catch(e){report.failure=e.stack;throw e;}finally{fs.writeFileSync(process.env.CHAPTER_WORLD_PART==='purchase'?'docs/chapter-purchase-browser-results.json':'docs/chapter-world-browser-results.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report,null,2));
