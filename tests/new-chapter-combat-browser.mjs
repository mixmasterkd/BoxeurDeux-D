// Real keyboard/CDP-touch street fights and exterior dodges. No manufactured
// clocks, hits, resistance, actions or outcomes. Only save/access fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,wait,fit,suppressHotReload,buttonPoint,joyPoint,dispatch} from './control-helpers.mjs';
const browser=await chromium.launch({headless:true}),reports=[];
try {
 for(const mobile of [false,true]) {
  const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});await suppressHotReload(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.goto('http://127.0.0.1:5173/?scene=fight&opponent=runner');await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);
  const cdp=mobile?await context.newCDPSession(page):null;
  const points=mobile?{jab:await buttonPoint(page,'#sparring-ui [data-pad-button="a"]',2),cross:await buttonPoint(page,'#sparring-ui [data-pad-button="b"]',2),head:await joyPoint(page,'#sparring-ui','up'),body:await joyPoint(page,'#sparring-ui','down')}:null;
  let held=null;
  const guard=async level=>{if(level===held)return;if(mobile){if(level)await dispatch(cdp,held?'touchMove':'touchStart',[points[level]]);else if(held)await dispatch(cdp,'touchEnd',[points[held]]);}else{if(held)await page.keyboard.up(held==='head'?'w':'s');if(level)await page.keyboard.down(level==='head'?'w':'s');}held=level;};
  const punch=async action=>{if(mobile){await dispatch(cdp,'touchStart',[...(held?[points[held]]:[]),points[action]]);await dispatch(cdp,'touchEnd',[points[action]]);}else await page.keyboard.press(action==='jab'?'j':'k');};
  if(mobile){await page.locator('#sparring-ui .primary-button').focus();await punch('jab');}else await page.keyboard.press('e');
  await wait(page,()=>window.__sparring.session.state.phase==='running');
  await punch('jab');await page.waitForTimeout(280);await punch('cross');await page.waitForTimeout(350);await punch('jab');
  await wait(page,()=>window.__sparring.session.state.stats.thrown===3);
  const layout=await fit(page,'#sparring-ui',mobile);assert.ok(layout.fits&&layout.noScroll);assert.equal(layout.controls.length,mobile?4:0);assert.ok(layout.controls.every(c=>c.outside&&c.fits));
  assert.equal(await page.locator('.round-clock').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  let paused=false;const deadline=Date.now()+90000;
  while(Date.now()<deadline){
   const s=await page.evaluate(()=>structuredClone(window.__sparring.session.state));if(s.phase==='finished')break;
   if(!paused&&s.elapsed>2){await guard(null);if(mobile)await page.locator('#sparring-ui .console-menu-button').tap();else await page.keyboard.press('p');await wait(page,()=>window.__sparring.session.state.phase==='paused');const before=await page.evaluate(()=>window.__sparring.session.state.elapsed);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__sparring.session.state.elapsed),before);await page.locator('#sparring-ui .primary-button').click();await wait(page,()=>window.__sparring.session.state.phase==='running');paused=true;}
   if(s.phase==='running'){
    const r=s.remi,lateTell=r.action.startsWith('tell')&&r.duration*(1-r.progress)<.35;
    await guard(lateTell||['jab','cross'].includes(r.action)?r.target:null);
    if(r.action==='open'&&s.player.action==='idle')await punch(s.stats.thrown%2?'cross':'jab');
   } else await guard(null);
   await page.waitForTimeout(35);
  }
  await guard(null);const state=await page.evaluate(()=>structuredClone(window.__sparring.session.state));
  assert.equal(state.phase,'finished');assert.equal(state.bout.result.reason,'street-stop');assert.equal(state.bout.result.winner,'player');assert.equal(state.bout.downs.remi.total,1);assert.equal(state.bout.result.decision,undefined);assert.ok(state.stats.blocked>0);
  const impacts=await page.evaluate(()=>window.__sparring.impacts);assert.ok(impacts.filter(e=>e.type==='player-hit').every(e=>e.playerTexture.startsWith('runner-player-')&&Math.hypot(e.x-e.targetPoint.x,e.y-e.targetPoint.y)<2));
  assert.equal(await page.locator('#sparring-ui .primary-button').innerText(),'Continuer la course');
  await page.screenshot({path:`docs/street-fight-${mobile?'mobile':'desktop'}-result.png`});
  assert.deepEqual(errors,[]);reports.push({mobile,layout,stats:state.stats,result:state.bout.result,impacts:impacts.length});await context.close();
 }
 // Actual orthodox jab/cross timing accepts the visible outside side. Each
 // attack direction is read only from the opponent's displayed preparation.
 const context=await browser.newContext({viewport:{width:1280,height:900}});await suppressHotReload(context);const page=await context.newPage();await page.goto('http://127.0.0.1:5173/?scene=sparring&lesson=free');await wait(page,()=>window.__sparring?.session.state.phase==='ready');await page.keyboard.press('e');const seen=new Set(),deadline=Date.now()+18000;
 while(seen.size<2&&Date.now()<deadline){const s=await page.evaluate(()=>structuredClone(window.__sparring.session.state));if(s.remi.action.startsWith('tell')&&s.remi.duration*(1-s.remi.progress)<.08&&s.player.action==='idle'){await page.keyboard.press(s.remi.safeDodge==='dodgeRight'?'d':'a');await page.waitForTimeout(350);for(const e of await page.evaluate(()=>window.__sparring.impacts))if(e.type==='remi-dodged')seen.add(e.attack);}await page.waitForTimeout(25);}
 assert.deepEqual([...seen].sort(),['cross','jab']);reports.push({exteriorDodges:[...seen]});await context.close();
 await fs.writeFile('docs/new-chapter-combat-browser-results.json',JSON.stringify({reports},null,2)+'\n');console.log('Keyboard and mobile568: real one-knockdown fight, guard+attack, pause, contacts and result; Rémi jab/cross exterior dodges.');
}finally{await browser.close();}
