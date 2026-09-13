import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, joyPoint, buttonPoint, dispatch, fit, suppressHotReload } from './control-helpers.mjs';
import { hotelFixture, seedContext, CAREER_STORAGE_KEY } from './hotel-test-helpers.mjs';
const browser = await chromium.launch({headless:true});
const reports=[];
async function play(mobile){
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 if(mobile)await seedContext(context,hotelFixture());else await suppressHotReload(context);
 const page=await context.newPage(),cdp=mobile?await context.newCDPSession(page):null,errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const get=()=>page.evaluate(()=>structuredClone(window.__sparring.session.state));
 let held=null,heldPoint=null;
 async function guard(level){if(level===held)return;if(held){if(mobile)await dispatch(cdp,'touchEnd',[]);else await page.keyboard.up(held==='head'?'w':'s');}held=level;heldPoint=null;if(level){if(mobile){heldPoint=await joyPoint(page,'#sparring-ui',level==='head'?'up':'down',1);await dispatch(cdp,'touchStart',[heldPoint]);}else await page.keyboard.down(level==='head'?'w':'s');}}
 async function action(letter){if(mobile){const point=await buttonPoint(page,`#sparring-ui [data-pad-button="${letter==='j'?'a':'b'}"]`,2);await dispatch(cdp,'touchStart',[...(heldPoint?[heldPoint]:[]),point]);await dispatch(cdp,'touchEnd',heldPoint?[heldPoint]:[]);}else await page.keyboard.press(letter);}
 async function confirm(){if(mobile){await page.locator('#sparring-ui .primary-button').focus();await action('j');}else await page.keyboard.press('e');}
 try{
 await page.goto(`http://127.0.0.1:5173/?scene=fight&opponent=${mobile?'bellini':'beton'}`);await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);
 assert.equal((await get()).settings.duration,45);await confirm();await wait(page,()=>window.__sparring.session.state.phase==='running');
 let follow=false,usedOpening=false,oldRemi='',pauseTested=false,cornerShots=false;const beats=new Set(),rounds=[];const deadline=Date.now()+260000;
 while(Date.now()<deadline){const s=await get();if(s.phase==='finished')break;
 if(s.phase==='running'){
  const r=s.remi;
  const protect=['jab','cross'].includes(r.action)||(r.action.startsWith('tell')&&r.duration*(1-r.progress)<.34);
  await guard(protect?r.target:null);
  if(r.action==='open'&&oldRemi!=='open'&&oldRemi!=='hit')usedOpening=false;
  if(!protect&&s.player.action==='idle'&&s.stamina>25){
   if(follow){await action('k');follow=false;}
   else if(!usedOpening&&r.action==='open'&&r.duration>1.3&&r.progress<.16){await action('j');follow=true;usedOpening=true;}
  }
  oldRemi=r.action;
 }else if(s.phase==='knockdown'){
  await guard(null);follow=false;
  if(s.bout.count.ready)await action(s.bout.count.next==='jab'?'j':'k');
 }else if(s.phase==='corner'){
  await guard(null);follow=false;
  const c=s.bout.corner;
  for(let i=0;i<8;i++){const key=`${s.bout.round}:${i}`;if(c.elapsed>=i+.9&&c.elapsed<i+1.15&&!beats.has(key)){await action(i%2?'k':'j');beats.add(key);}}
  if(!pauseTested&&c.elapsed>1.25){
   if(mobile){await page.setViewportSize({width:320,height:568});await wait(page,()=>window.__sparring.session.state.phase==='paused');assert.match(await page.locator('body').textContent(),/tourn|paysage/i);await page.setViewportSize({width:568,height:320});}
   else await page.keyboard.press('p');
   await wait(page,()=>window.__sparring.session.state.phase==='paused');const before=await get();await page.waitForTimeout(240);assert.deepEqual((await get()).bout.corner,before.bout.corner);assert.equal(before.pausedPhase,'corner');await confirm();await wait(page,()=>window.__sparring.session.state.phase==='corner');pauseTested=true;
  }
  if(!cornerShots&&c.elapsed>3.1){await page.screenshot({path:`docs/fredo-recovery-${mobile?'mobile':'desktop'}.png`});const geometry=await fit(page,'#sparring-ui',mobile,true);assert.ok(geometry.noScroll&&geometry.fits);assert.ok(geometry.controls.every(c=>c.outside&&c.fits));reports.push({mobile,cornerLayout:geometry});cornerShots=true;}
 }else if(s.phase==='between'){
  await guard(null);const bonus=s.bout.corner.bonus;assert.ok(bonus>=6,`breaths ${bonus} round ${s.bout.round}: ${JSON.stringify(s.bout.corner)}`);assert.equal(s.bout.roundHistory.at(-1).duration,45);rounds.push({round:s.bout.round,bonus});
  const health=s.bout.resistance.player;await confirm();await wait(page,()=>window.__sparring.session.state.phase==='running');const after=await get();assert.equal(after.bout.resistance.player,Math.min(after.settings.maxResistance,health+20+bonus));assert.equal(after.player.action,'idle','breathing does not leak a punch');
 }else throw new Error(`unexpected phase ${s.phase}`);
 await page.waitForTimeout(28);
 }
 await guard(null);const end=await get();assert.equal(end.phase,'finished');assert.equal(end.bout.round,3);assert.equal(end.bout.result.reason,'points');assert.equal(end.bout.result.winner,'player');assert.equal(end.bout.result.decision.cards.length,3);assert.ok(end.bout.roundHistory.every(r=>r.duration===45));assert.equal(rounds.length,2);
 await wait(page,()=>window.__sparring.scene.decisionView.elapsed>=7,null,15000);assert.ok(await page.locator('.judge-cards').isVisible());assert.equal(await page.locator('.judge-cards article').count(),3);assert.match(await page.locator('.panel-heading').textContent(),/Victoire/);
 const layout=await fit(page,'#sparring-ui',mobile,true);assert.ok(layout.fits&&layout.noScroll);
 const panelFits=await page.locator('.round-panel').evaluate(p=>{const r=p.getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect();return r.left>=c.left-1&&r.right<=c.right+1&&r.top>=c.top-1&&r.bottom<=c.bottom+1&&p.scrollWidth<=p.clientWidth+1;});assert.ok(panelFits);
 await page.screenshot({path:`docs/judges-${mobile?'mobile':'desktop'}.png`});
 const beforeSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);await page.waitForTimeout(600);assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY),beforeSave,'result recorded once');
 if(mobile){assert.equal(beforeSave.tournament.active.results.length,1);await confirm();await wait(page,()=>!window.__sparring);}
 else {assert.equal(beforeSave.fights.beton.wins,1);await confirm();await wait(page,()=>window.__sparring.session.state.phase==='running');assert.equal((await get()).bout.round,1);assert.equal((await get()).stats.thrown,0);}
 assert.deepEqual(errors,[]);reports.push({mobile,rounds,result:end.bout.result,stats:end.stats,layout,panelFits,errors});console.log(`${mobile?'Mobile tactile':'Clavier'}: 3 rounds, Fredo, pause, juges, sauvegarde et sortie/revanche validés.`);
 }finally{await context.close();}
}
try{await Promise.all([play(false),play(true)]);await fs.writeFile('docs/fight-pacing-browser-results.json',JSON.stringify({date:new Date().toISOString(),reports},null,2)+'\n');}finally{await browser.close();}
