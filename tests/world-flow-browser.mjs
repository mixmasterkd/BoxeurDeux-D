import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,wait,fit,dispatch,joyPoint,buttonPoint,suppressHotReload} from './control-helpers.mjs';
import {hotelFixture} from './hotel-test-helpers.mjs';
const url=process.env.SPARRING_URL??'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true});
const report={url,tests:[],errors:[],failure:null};
const current=p=>p.evaluate(()=>{const h=window.__hotel,e=window.__exploration,g=window.__gym;const active=[h,e,g].find(v=>v?.scene.sys.isActive());return active?{place:active.scene.place??'gym',...active.world.state,dialog:Boolean(active.ui?.dialog)}:null;});
const ready=(p,place)=>wait(p,name=>[window.__exploration,window.__hotel,window.__gym].some(v=>v?.scene.sys.isActive()&&(v.scene.place??'gym')===name&&v.scene.player),place,30000);
const reload=async p=>{await p.evaluate(()=>history.replaceState(null,'',location.pathname));await p.reload();if(await p.locator('.career-continue').isVisible())await p.locator('.career-continue').click();};
const save=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('boxeur-deux-d-career-v1')));
async function controller(p,mobile){
  const cdp=mobile?await p.context().newCDPSession(p):null;
  const tap=async selector=>{if(!mobile)return p.locator(selector).click();await dispatch(cdp,'touchStart',[await buttonPoint(p,selector)]);await dispatch(cdp,'touchEnd');};
  async function hold(direction,ms){if(mobile){await dispatch(cdp,'touchStart',[await joyPoint(p,'#gym-ui',direction)]);await p.waitForTimeout(ms);await dispatch(cdp,'touchEnd');}else{const key={left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS'}[direction];await p.keyboard.down(key);await p.waitForTimeout(ms);await p.keyboard.up(key);}}
  async function axis(axis,target){const first=await current(p);for(let tries=0;tries<160;tries++){
    const before=await current(p);if(!before||before.place!==first.place||before.dialog)return;
    const distance=target-before[axis];if(Math.abs(distance)<10)return;
    await hold(axis==='x'?distance>0?'right':'left':distance>0?'down':'up',Math.max(24,Math.min(150,Math.abs(distance)/360*800)));
  }throw Error(`Blocked toward ${axis}=${target} from ${JSON.stringify(await current(p))}`);}
  return {axis,hold,tap,interact:()=>mobile?tap('#gym-ui [data-pad-button="a"]'):p.keyboard.press('KeyE'),close:()=>mobile?tap('#gym-ui [data-pad-button="b"]'):p.keyboard.press('Escape'),action:id=>tap(`[data-gym-action="${id}"]`)};
}
async function worldRun(mobile){
  const label=mobile?'mobile':'desktop',ctx=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});await suppressHotReload(ctx);
  const p=await ctx.newPage(),c=await controller(p,mobile);p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  try{
    console.log(`${label}: nouvelle tournée`);await p.goto(url+'?scene=residential');await ready(p,'residential');
    await c.axis('x',1500);await c.axis('y',835);await c.interact();await wait(p,()=>document.querySelector('[data-gym-action="start-delivery"]'));
    await c.action('start-delivery');await wait(p,()=>__exploration.scene.player.texture.key.startsWith('cycling'));
    await p.screenshot({path:`docs/world-flow-depot-${label}.png`});assert.equal((await save(p)).daily.energy,70);
    await c.axis('y',680);await c.axis('x',441);await c.axis('y',500);await c.interact();await c.close();
    assert.equal((await save(p)).delivery.active.completed.length,1);
    await c.axis('y',680);await c.axis('x',2290);await ready(p,'neighborhood');
    assert.ok((await p.evaluate(()=>__exploration.scene.player.texture.key)).startsWith('cycling'),'Bike crosses neighborhood boundaries');
    await c.axis('x',1170);await c.axis('y',1330);await c.axis('x',1642);await c.interact();await c.close();
    assert.equal((await save(p)).delivery.active.completed.length,2);
    await reload(p);await ready(p,'neighborhood');assert.equal((await save(p)).daily.energy,70);assert.equal((await save(p)).delivery.active.completed.length,2);
    await c.axis('x',1170);await c.axis('y',715);await c.axis('x',110);await ready(p,'residential');
    await p.waitForTimeout(250);assert.equal((await current(p)).place,'residential','No arrival bounce');
    await c.axis('x',75);await ready(p,'commercial');await c.axis('x',1100);await c.axis('y',470);await c.interact();await c.close();
    const completed=await save(p);assert.equal(completed.delivery.active,null);assert.ok(completed.wallet.money>=15&&completed.wallet.money<=21);assert.equal(completed.daily.energy,70);
    console.log(`${label}: boutiques puis métro`);
    await c.axis('y',460);await c.axis('x',963);await c.axis('y',417);await ready(p,'clothing-shop');
    await c.axis('y',330);await c.interact();assert.match(await p.locator('#gym-dialog-title').innerText(),/Rue Nord/);await c.close();
    await c.axis('y',655);await ready(p,'commercial');await c.axis('x',1680);await c.axis('y',460);await c.axis('x',1522);await c.axis('y',416);await ready(p,'boxing-shop');
    await c.axis('y',540);await c.axis('y',656);await ready(p,'commercial');await c.axis('x',1680);await c.axis('y',780);await c.axis('x',2290);await ready(p,'residential');
    await c.axis('x',2290);await ready(p,'neighborhood');await c.axis('x',1170);await c.axis('y',1330);await c.axis('x',2047);await c.axis('y',1305);await ready(p,'metro-station');
    await c.axis('y',380);await c.interact();await c.action('take-metro');await ready(p,'metro-riverside');
    await p.screenshot({path:`docs/world-flow-metro-${label}.png`});assert.equal((await save(p)).daily.energy,70);
    await c.axis('y',663);await ready(p,'riverside');await c.axis('y',1380);await c.axis('x',1520);await c.axis('y',760);await c.axis('x',1200);
    await p.screenshot({path:`docs/world-flow-riverside-${label}.png`});await reload(p);await ready(p,'riverside');
    await c.axis('x',1520);await c.axis('y',1340);await c.axis('x',1200);await c.axis('y',1255);await ready(p,'metro-riverside');
    await c.axis('y',380);await c.interact();await c.action('take-metro');await ready(p,'metro-station');await c.axis('y',663);await ready(p,'neighborhood');
    const geometry=await fit(p,'#gym-ui',mobile);assert.ok(geometry.fits&&geometry.noScroll);assert.ok(Math.abs(geometry.ratio-16/9)<.001);
    if(mobile){await p.setViewportSize({width:390,height:844});await p.waitForTimeout(200);assert.equal((await current(p)).paused,true);}
    report.tests.push({label,distributedTour:true,money:completed.wallet.money,chargedOnce:true,reload:true,autoDoors:true,twoShops:true,metroReturn:true,geometry});
  }finally{await ctx.close();}
}
async function hotelRun(mobile){
  const label=mobile?'mobile':'desktop',profile=hotelFixture(),ctx=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});await suppressHotReload(ctx);
  await ctx.addInitScript(seed=>{if(!localStorage.getItem('boxeur-deux-d-career-v1'))localStorage.setItem('boxeur-deux-d-career-v1',seed);},profile.exportText());
  const p=await ctx.newPage(),c=await controller(p,mobile);p.on('pageerror',e=>report.errors.push(e.message));
  try{
    console.log(`${label}: hôtel par le RC`);await p.goto(url+'?scene=hotel-room');await ready(p,'hotel-room');const before=await save(p);
    await c.axis('y',654);await ready(p,'hotel-corridor');await c.axis('x',1710);await c.axis('y',349);await ready(p,'hotel-lobby');
    await c.axis('y',460);await c.axis('x',480);await c.axis('y',415);await c.interact();assert.match(await p.locator('#gym-dialog-text').innerText(),/rez-de-chaussée/);await c.close();
    await c.axis('y',460);await c.axis('x',945);await p.screenshot({path:`docs/world-flow-hotel-rc-${label}.png`});await c.axis('y',316);await ready(p,'hotel-gym');
    await c.axis('y',654);await ready(p,'hotel-lobby');await c.axis('x',1220);await c.axis('y',316);await ready(p,'hotel-pool');
    await c.axis('y',655);await ready(p,'hotel-lobby');await c.axis('x',1495);await c.axis('y',316);await ready(p,'hotel-venue');
    await c.axis('y',1370);await c.axis('y',1440);await ready(p,'hotel-lobby');await c.axis('x',1760);await c.axis('y',315);await ready(p,'hotel-corridor');
    await c.axis('x',496);await c.axis('y',350);await ready(p,'hotel-room');await reload(p);await ready(p,'hotel-room');
    const after=await save(p);assert.deepEqual(after.daily,before.daily);assert.deepEqual(after.tournament,before.tournament);
    report.tests.push({label:`hotel-${label}`,walkedAllAmenitiesThroughRC:true,returnToRoom:true,reload:true,noEnergyCost:true,geometry:await fit(p,'#gym-ui',mobile)});
  }finally{await ctx.close();}
}
async function entranceRun(mobile){
 const label=mobile?'mobile':'desktop',ctx=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});await suppressHotReload(ctx);
 const p=await ctx.newPage(),c=await controller(p,mobile);p.on('pageerror',e=>report.errors.push(e.message));
 try{
  await p.goto(url+'?scene=home');await ready(p,'home');await c.axis('y',655);await ready(p,'neighborhood');
  await c.axis('x',1128);await c.axis('y',516);await ready(p,'gym');await p.waitForTimeout(250);assert.equal((await current(p)).place,'gym');
  await c.axis('y',565);await c.axis('y',653);await ready(p,'neighborhood');await c.axis('x',1900);await c.axis('y',524);
  await wait(p,()=>document.querySelector('[data-gym-action="meet-beton"]'));assert.equal((await save(p)).daily.energy,100);
  report.tests.push({label:`entrances-${label}`,homeExitAutomatic:true,gymRoundTripAutomatic:true,fightEntranceAutomatic:true,noEnergyCost:true});
 }finally{await ctx.close();}
}
async function metroRun(mobile){
 const label=mobile?'mobile':'desktop',ctx=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});await suppressHotReload(ctx);
 const p=await ctx.newPage(),c=await controller(p,mobile);p.on('pageerror',e=>report.errors.push(e.message));
 try{
  await p.goto(url+'?scene=metro-station');await ready(p,'metro-station');await c.axis('y',380);await c.interact();await c.action('take-metro');await ready(p,'metro-riverside');
  await p.screenshot({path:`docs/world-flow-metro-final-${label}.png`});await c.axis('y',550);await ready(p,'riverside');await c.axis('y',1380);await reload(p);await ready(p,'riverside');
  await c.axis('y',1255);await ready(p,'metro-riverside');await c.axis('y',380);await c.interact();await c.action('take-metro');await ready(p,'metro-station');await c.axis('y',550);await ready(p,'neighborhood');
  assert.equal((await save(p)).daily.energy,100);assert.equal((await save(p)).wallet.money,0);
  report.tests.push({label:`metro-final-${label}`,trainRoundTrip:true,stairThresholds:true,riversideReload:true,noEnergyOrMoneyCost:true,geometry:await fit(p,'#gym-ui',mobile)});
 }finally{await ctx.close();}
}
try{
  const mode=process.env.WORLD_FLOW_PART;
  if(!mode||mode==='world')for(const mobile of [false,true])await worldRun(mobile);
  if(!mode||mode==='hotel')for(const mobile of [false,true])await hotelRun(mobile);
  if(!mode||mode==='metro')for(const mobile of [false,true])await metroRun(mobile);
  if(!mode||mode==='entrances')for(const mobile of [false,true])await entranceRun(mobile);
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;throw error;}finally{fs.writeFileSync(`docs/world-flow-${process.env.WORLD_FLOW_PART??'all'}-browser-results.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report,null,2));
