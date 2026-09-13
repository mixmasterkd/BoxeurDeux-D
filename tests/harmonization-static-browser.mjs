// Compiled-game checks only. With no SPARRING_URL, intercept dist/ beneath the
// GitHub Pages subdirectory; never create a server or expose development hooks.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium,wait,fit,buttonPoint,joyPoint,dispatch} from './control-helpers.mjs';
import {CareerProfile,CAREER_STORAGE_KEY} from '../src/game/CareerProfile.js';
import {readOpaquePng} from '../scripts/chapter-png.mjs';
import {DELIVERY_STOPS} from '../src/game/ChapterRules.js';
const remote=process.env.SPARRING_URL,base=remote??'http://harmonization.local/BoxeurDeux-D/',dist=path.resolve('dist');
assert.ok(base.endsWith('/'));
const browser=await chromium.launch({headless:true}),contexts=new Set(),resources=new Set();
const report={date:new Date().toISOString(),url:base,production:true,emulatedMobile:true,cases:[],errors:[],failure:null};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
let currentPage;await mkdir('docs',{recursive:true});
const saved=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
function fixture(place,position,{tournament=false,funded=false}={}){
  const p=new CareerProfile({storage:null});
  if(tournament){p.recordFight({opponent:'beton',winner:'player'});p.recordFight({opponent:'kramer',winner:'player'});}
  if(tournament||funded)for(let i=0;i<6;i++){if(!p.canStartActivity('delivery').ok)p.sleep();assert.equal(p.startDelivery().ok,true);for(const id of DELIVERY_STOPS)assert.equal(p.deliverParcel(id,{tip:2}).ok,true);}
  if(tournament||funded)p.sleep();if(tournament)assert.equal(p.startTournament().ok,true);
  p.setLocation({scene:place,...position,facing:position.facing??'up'});return p;
}
async function open(seed,place,mobile){
  const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});contexts.add(context);
  await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:CAREER_STORAGE_KEY,value:seed.exportText()});
  const p=await context.newPage();currentPage=p;p.setDefaultTimeout(remote?90000:30000);
  p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  p.on('requestfailed',r=>report.errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);else if(r.url().startsWith(base))resources.add(new URL(r.url()).pathname.slice(new URL(base).pathname.length)||'index.html');});
  if(!remote)await p.route('**/*',async route=>{
    const u=new URL(route.request().url()),b=new URL(base);if(u.origin!==b.origin||!u.pathname.startsWith(b.pathname)){report.errors.push(`Outside deployed directory: ${u}`);await route.abort();return;}
    const file=path.resolve(dist,decodeURIComponent(u.pathname.slice(b.pathname.length))||'index.html');assert.ok(file.startsWith(dist+path.sep));
    try{await route.fulfill({status:200,body:await readFile(file),contentType:mime[path.extname(file)]??'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Not found'});}
  });
  const cdp=mobile?await context.newCDPSession(p):null;
  const root=async()=>p.evaluate(()=>['gym','rhythm','shadow','sparring'].map(id=>`#${id}-ui`).find(id=>{const e=document.querySelector(id);return e&&!e.hidden&&e.getClientRects().length;}));
  const tap=async selector=>{if(!mobile)return p.locator(selector).click();const point=await buttonPoint(p,selector);assert.ok(point.x>=0&&point.y>=0&&point.x<p.viewportSize().width&&point.y<p.viewportSize().height);await dispatch(cdp,'touchStart',[point]);await dispatch(cdp,'touchEnd');};
  const confirm=async()=>mobile?tap(`${await root()} [data-pad-button="a"]`):p.keyboard.press('KeyE');
  const back=async()=>mobile?tap(`${await root()} [data-pad-button="b"]`):p.keyboard.press('Escape');
  const move=async(direction,duration=70)=>{const key={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'}[direction];if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(p,await root(),direction)]);else await p.keyboard.down(key);await p.waitForTimeout(duration);if(mobile)await dispatch(cdp,'touchEnd');else await p.keyboard.up(key);await p.waitForTimeout(30);};
  const select=async selector=>{for(let i=0;i<30;i++){if(await p.evaluate(selector=>document.activeElement?.matches(selector),selector)){await confirm();return;}await move('down',35);}throw Error(`Could not select menu choice: ${selector}`);};
  const walkUntil=async(direction,predicate,arg)=>{const key={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'}[direction];if(mobile)await dispatch(cdp,'touchStart',[await joyPoint(p,await root(),direction)]);else await p.keyboard.down(key);try{await wait(p,predicate,arg,15000);}finally{if(mobile)await dispatch(cdp,'touchEnd');else await p.keyboard.up(key);}await p.waitForTimeout(100);};
  const walkScene=(direction,place)=>walkUntil(direction,place=>document.querySelector('#stage')?.dataset.scene===place,place);
  const walkLabel=(direction,text)=>walkUntil(direction,text=>document.querySelector('.gym-nearby-label')?.textContent.includes(text),text);
  const punch=async kind=>mobile?tap(`${await root()} [data-pad-button="${kind==='jab'?'a':'b'}"]`):p.keyboard.press(kind==='jab'?'KeyJ':'KeyK');
  const pause=async()=>mobile?tap(`${await root()} .console-menu-button`):p.keyboard.press('KeyP');
  const close=async()=>{await context.close();contexts.delete(context);};
  await p.goto(`${base}?scene=${place}`);
  return{p,context,mobile,cdp,root,tap,confirm,back,move,select,walkScene,walkLabel,punch,pause,close};
}
async function ready(c,place,ui='gym'){
  await wait(c.p,({place,ui})=>document.querySelector('#stage')?.dataset.scene===place&&document.querySelector(`#${ui}-ui .console-menu-button`),{place,ui},remote?90000:30000);
  await c.p.locator('#scene-loading').waitFor({state:'hidden'});await c.p.waitForTimeout(180);
  assert.equal(await c.p.evaluate(()=>['__gym','__exploration','__hotel','__hotelActivity','__shadow','__sparring'].some(k=>window[k]!==undefined)),false,'Compiled build exposes no DEV hooks');
}
async function capture(c,name,{menu=false}={}){
  const root=await c.root(),geometry=await fit(c.p,root,c.mobile);
  assert.ok(geometry.noScroll&&geometry.fits);assert.ok(Math.abs(geometry.ratio-16/9)<.002);assert.equal(geometry.controls.length===0,!c.mobile);
  for(const control of geometry.controls)assert.ok(control.outside&&control.fits,`${name}: ${control.name} clears the canvas`);
  let windows=[];
  if(menu){windows=await c.p.evaluate(()=>{const canvas=document.querySelector('canvas').getBoundingClientRect();return [...document.querySelectorAll('#stage [role="dialog"]')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect(),style=getComputedStyle(e);return{id:e.id||e.className,fits:r.left>=canvas.left-2&&r.right<=canvas.right+2&&r.top>=canvas.top-2&&r.bottom<=canvas.bottom+2,font:style.fontFamily,radius:style.borderRadius,horizontalOverflow:e.scrollWidth>e.clientWidth+2};});});
    assert.ok(windows.length,'An actual menu is visible');for(const w of windows){assert.ok(w.fits&&!w.horizontalOverflow,`${name}: menu fits ${JSON.stringify(w)}`);assert.equal(w.radius,'0px');assert.match(w.font,/Boxeur Pixel/);}
  }
  await c.p.evaluate(()=>document.fonts.ready);assert.equal(await c.p.evaluate(()=>document.fonts.check('16px "Boxeur Pixel"')),true);
  await c.p.screenshot({path:`docs/harmonization-static-${remote?'public-':''}${name}.png`});report.cases.push({name,geometry,windows});console.log(`Production: ${name}`);
}
// Measure rendered bodies against the unchanged background, using only a
// browser screenshot. Nearby reference pixels tolerate nearest-neighbor scaling.
async function silhouette(c,name,background,{x,y,halfWidth=72,scanHeight=210}){
 const shot=readOpaquePng(`docs/harmonization-static-${remote?'public-':''}${name}.png`),bg=readOpaquePng(background),r=await c.p.locator('canvas').boundingBox();
 const rows=[],pixelsPerRow=Math.max(2,Math.round(r.width/1280*4));
 for(let sy=Math.floor(r.y+(y-scanHeight)*r.height/720);sy<=Math.ceil(r.y+(y+5)*r.height/720);sy++){
  let changes=0;
  for(let sx=Math.floor(r.x+(x-halfWidth)*r.width/1280);sx<=Math.ceil(r.x+(x+halfWidth)*r.width/1280);sx++){
   const wx=Math.floor((sx+.5-r.x)/r.width*1280),wy=Math.floor((sy+.5-r.y)/r.height*720),at=(sy*shot.width+sx)*4;let delta=Infinity;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const bx=Math.max(0,Math.min(bg.width-1,Math.floor(wx*bg.width/1280)+dx)),by=Math.max(0,Math.min(bg.height-1,Math.floor(wy*bg.height/720)+dy)),b=(by*bg.width+bx)*4;delta=Math.min(delta,Math.abs(shot.pixels[at]-bg.pixels[b])+Math.abs(shot.pixels[at+1]-bg.pixels[b+1])+Math.abs(shot.pixels[at+2]-bg.pixels[b+2]));}
   if(delta>115)changes++;
  }
  if(changes>=pixelsPerRow)rows.push(sy);
 }
 const height=rows.length?(Math.max(...rows)-Math.min(...rows)+1)/r.height*720:0;
 return {method:'Screenshot body pixels compared with the unchanged background',heightInGamePixels:Math.round(height*10)/10,visibleRows:rows.length};
}
async function actors(mobile){
 const label=mobile?'mobile':'desktop',c=await open(fixture('gym',{x:640,y:585,facing:'down'}),'gym',mobile);await ready(c,'gym');const name=`gym-actors-${label}`;await capture(c,name);
 const metrics={};for(const [id,x,y]of [['player',640,585],['fredo',350,493],['octopus',1040,555],['remi',915,470]]){
  metrics[id]=await silhouette(c,name,'public/assets/backgrounds/gym-exploration.png',{x,y,scanHeight:id==='remi'?122:150,halfWidth:44});assert.ok(metrics[id].heightInGamePixels>=75&&metrics[id].heightInGamePixels<=140,`${id}: visible, proportionate gym silhouette ${JSON.stringify(metrics[id])}`);
 }
 report.cases.at(-1).actors=metrics;await c.close();
}

async function pads(mobile){
  const label=mobile?'mobile':'desktop',seed=fixture('gym',{x:360,y:552}),c=await open(seed,'gym',mobile);await ready(c,'gym');await c.confirm();
  await c.p.locator('[data-gym-action="friend-pads"]').waitFor();await capture(c,`fredo-dialog-${label}`,{menu:true});await c.select('[data-gym-action="friend-pads"]');await ready(c,'pads','rhythm');
  assert.equal((await saved(c.p)).daily.energy,100);await capture(c,`pads-ready-${label}`,{menu:true});await c.select('.rhythm-primary');await wait(c.p,()=>document.querySelector('#rhythm-ui').dataset.phase==='running');
  assert.equal((await saved(c.p)).daily.energy,90);
  // Fredo begins by showing his left mitt. A wrong right-hand punch cannot
  // consume that target; the correct left jab then scores at its real contact.
  await c.punch('cross');await wait(c.p,()=>document.querySelector('.rhythm-feedback')?.dataset.tone==='retry');assert.equal(await c.p.locator('.rhythm-streak').innerText(),'0');
  await c.p.waitForTimeout(650);await c.punch('jab');await wait(c.p,()=>Number(document.querySelector('.rhythm-streak')?.textContent)>=1);await capture(c,`pads-contact-${label}`);
  await c.pause();await wait(c.p,()=>document.querySelector('#rhythm-ui').dataset.phase==='paused');const time=await c.p.locator('.rhythm-time').innerText();await c.p.waitForTimeout(250);assert.equal(await c.p.locator('.rhythm-time').innerText(),time);
  await c.select('.commands-open-button');await capture(c,`pads-commandes-${label}`,{menu:true});await c.back();
  if(mobile){await c.p.setViewportSize({width:390,height:844});await c.p.locator('#rotate-prompt').waitFor({state:'visible'});assert.equal(await c.p.locator('#stage').evaluate(e=>e.inert),true);await c.p.setViewportSize({width:568,height:320});await c.p.locator('#rotate-prompt').waitFor({state:'hidden'});assert.equal(await c.p.locator('#rhythm-ui').getAttribute('data-phase'),'paused');}
  await c.select('.rhythm-primary');await wait(c.p,()=>document.querySelector('#rhythm-ui').dataset.phase==='running');assert.equal((await saved(c.p)).daily.energy,90);
  await c.pause();await c.select('.rhythm-return');await ready(c,'gym');assert.equal((await saved(c.p)).daily.energy,90);
  report.cases.push({name:`pads-real-input-${label}`,wrongHandUnscored:true,correctJabScored:true,chargeOnce:10,pause:true,returnToGym:true});await c.close();
}
async function octopus(mobile){
  const label=mobile?'mobile':'desktop',seed=fixture('gym',{x:1038,y:618}),c=await open(seed,'gym',mobile);await ready(c,'gym');await c.confirm();await c.p.locator('[data-gym-action="friend-drill-basics"]').waitFor();
  await capture(c,`octopus-dialog-${label}`,{menu:true});await c.select('[data-gym-action="friend-drill-basics"]');await ready(c,'shadow','shadow');await c.select('.shadow-start-button');
  await wait(c.p,()=>document.querySelector('#shadow-ui').dataset.phase==='running');assert.equal((await saved(c.p)).daily.energy,90);
  const progress=n=>wait(c.p,n=>document.querySelector('.shadow-mentor-progress')?.textContent.includes(`${n} / 5`),n);
  await c.punch('jab');await progress(1);await c.p.waitForTimeout(650);await c.punch('cross');await progress(2);await c.p.waitForTimeout(650);
  await c.move('up',750);await progress(3);await c.punch('jab');await progress(4);await c.p.waitForTimeout(650);await c.punch('cross');await progress(5);
  await wait(c.p,()=>document.querySelector('#shadow-ui').dataset.phase==='finished');assert.match(await c.p.locator('#shadow-title').innerText(),/Drill réussi/);
  assert.equal(await c.p.locator('[data-shadow-stat="punches"]').innerText(),'4');assert.deepEqual((await saved(c.p)).stats,seed.snapshot().stats,'Drill never invents stat bonuses');
  await capture(c,`octopus-drill-complete-${label}`,{menu:true});await c.select('.shadow-return-button');await ready(c,'gym');await c.close();
}
async function shirt(mobile){
  const label=mobile?'mobile':'desktop',seed=fixture('clothing-shop',{x:640,y:330},{funded:true}),c=await open(seed,'clothing-shop',mobile);await ready(c,'clothing-shop');await c.confirm();await c.select('[data-gym-action="buy-street-octopus"]');
  await c.p.locator('img[src$="/street-octopus/preview.png"]').waitFor();await capture(c,`shirt-confirm-${label}`,{menu:true});await c.select('[data-gym-action="confirm-buy-street-octopus"]');
  let p=await saved(c.p);assert.equal(p.wallet.money,seed.moneyStatus().money-45);assert.ok(p.inventory.owned.includes('street-octopus'));assert.equal(p.inventory.equipped.street,'street-black');await c.back();
  // The home URL is an independent fixture location; the money and inventory
  // come from the real preceding purchase and remain in the same browser save.
  await c.p.goto(`${base}?scene=home`);await ready(c,'home');await c.move('up',mobile?1120:1040);await c.move('left',mobile?2390:2250);await c.confirm();
  await c.p.locator('[data-gym-action="equip-street-octopus"]').waitFor();await c.select('[data-gym-action="equip-street-octopus"]');await c.back();
  assert.equal((await saved(c.p)).inventory.equipped.street,'street-octopus');await capture(c,`shirt-equipped-${label}`);await c.p.reload();await ready(c,'home');
  assert.equal((await saved(c.p)).inventory.equipped.street,'street-octopus');assert.equal((await saved(c.p)).wallet.money,p.wallet.money);assert.equal((await saved(c.p)).daily.energy,100);await c.close();
}
async function metro(mobile){
  const label=mobile?'mobile':'desktop',seed=fixture('metro-station',{x:640,y:490}),c=await open(seed,'metro-station',mobile);await ready(c,'metro-station');await capture(c,`metro-proportions-${label}`);const body=await silhouette(c,`metro-proportions-${label}`,'public/assets/world/metro-station.png',{x:640,y:490});assert.ok(body.heightInGamePixels>=80&&body.heightInGamePixels<=126,`The player fits beneath the train door: ${JSON.stringify(body)}`);report.cases.at(-1).playerBody=body;report.cases.at(-1).doorOpeningGamePixels=126;
  await c.walkLabel('up','Train');await c.confirm();await c.select('[data-gym-action="take-metro"]');await ready(c,'metro-riverside');await capture(c,`metro-rives-${label}`);
  await c.walkScene('down','riverside');await ready(c,'riverside');await capture(c,`des-rives-${label}`);await c.walkScene('up','metro-riverside');await ready(c,'metro-riverside');
  await c.walkLabel('up','Train');await c.confirm();await c.select('[data-gym-action="take-metro"]');await ready(c,'metro-station');await c.walkScene('down','neighborhood');await ready(c,'neighborhood');
  assert.equal((await saved(c.p)).daily.energy,100);assert.equal((await saved(c.p)).wallet.money,0);report.cases.push({name:`metro-round-trip-${label}`,automaticStairs:true,realTrainConfirm:true,noCharge:true});await c.close();
}
async function hotel(mobile){
  const label=mobile?'mobile':'desktop',seed=fixture('hotel-lobby',{x:945,y:405},{tournament:true}),c=await open(seed,'hotel-lobby',mobile);await ready(c,'hotel-lobby');await capture(c,`hotel-rc-${label}`);
  await c.walkScene('up','hotel-gym');await ready(c,'hotel-gym');await c.walkScene('down','hotel-lobby');await ready(c,'hotel-lobby');
  await c.move('right',1060);await c.walkScene('up','hotel-pool');await ready(c,'hotel-pool');await c.walkScene('down','hotel-lobby');await ready(c,'hotel-lobby');
  await c.move('right',1060);await c.walkScene('up','hotel-venue');await ready(c,'hotel-venue');await capture(c,`hotel-rings-${label}`);
  assert.deepEqual((await saved(c.p)).daily,seed.snapshot().daily);assert.deepEqual((await saved(c.p)).tournament,seed.snapshot().tournament);await c.close();
}
try{
  for(const mobile of [false,true])for(const [id,run]of Object.entries({actors,pads,octopus,shirt,metro,hotel}))if(!process.env.HARMONIZATION_STATIC_CASE||process.env.HARMONIZATION_STATIC_CASE===id)await run(mobile);
  assert.ok([...resources].some(r=>/PixelifySans.*\.ttf$/.test(r)),'Locally hosted pixel font was loaded');assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:`docs/harmonization-static-${remote?'public-':''}failure.png`}).catch(()=>{});}
finally{for(const c of contexts)await c.close();await browser.close();report.loadedResources=resources.size;report.resources=[...resources].sort();await writeFile(`docs/harmonization-static-${remote?'public-':''}${process.env.HARMONIZATION_STATIC_CASE?process.env.HARMONIZATION_STATIC_CASE+'-':''}results.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors,failure:report.failure,loadedResources:report.loadedResources},null,2));
