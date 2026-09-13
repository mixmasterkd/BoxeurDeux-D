// Renderer fixtures, separate from the real three-round input test. They cover
// all verdicts and very small layouts without fabricating gameplay claims.
import assert from 'node:assert/strict';
import { chromium, wait, fit } from './control-helpers.mjs';
import { judgeBout } from '../src/game/BoutJudges.js';
const browser=await chromium.launch({headless:true});
try{
 for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/?scene=fight');await wait(page,()=>window.__sparring?.scene.decisionView);
 for(const winner of ['player','remi','draw']){
 const decision=judgeBout([1,2,3].map(round=>({round,stats:{landed:winner==='player'?3:1,received:winner==='remi'?3:1},downs:{player:0,remi:0}})));
 await page.evaluate(({winner,decision})=>{const {session,scene}=window.__sparring;scene.decisionView.active=false;session.state.phase='finished';session.state.bout.result={winner,reason:'points',decision};}, {winner,decision});
 await wait(page,()=>window.__sparring.scene.decisionView.active);
 await page.evaluate(()=>window.__sparring.scene.decisionView.reveal());await page.waitForTimeout(120);
 assert.ok(await page.locator('.judge-cards').isVisible());
 const readable=await page.locator('.judge-cards').evaluate(e=>[...e.querySelectorAll('b')].every(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===b||b.contains(hit);}));assert.ok(readable,'all three scores visible without scrolling');
 const info=await page.evaluate(()=>{const panel=document.querySelector('.round-panel').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect();return {top:(panel.top-c.top)/c.height*720,height:panel.height/c.height*720,hasCards:!!document.querySelector('.judge-cards').getClientRects().length,referee:window.__sparring.scene.decisionView.referee.texture.key};});
 assert.ok(info.top>=310&&info.height<400,JSON.stringify(info));assert.equal(info.referee,winner==='draw'?'referee-neutral':winner==='player'?'referee-raise-left':'referee-raise-right');
 await page.screenshot({path:`docs/decision-fixture-${mobile?'mobile':'desktop'}-${winner}.png`});
 const toggle=page.locator('.judge-detail-toggle');await toggle.focus();await page.keyboard.press('e');assert.equal(await toggle.getAttribute('aria-expanded'),'true');await page.keyboard.press('e');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 }
 await page.evaluate(async()=>{const {createCornerRecovery}=await import('/src/game/CornerRecovery.js');const {session}=window.__sparring;session.state.phase='corner';session.state.bout.corner=createCornerRecovery();});
 await wait(page,()=>document.querySelector('.corner-recovery')&&!document.querySelector('.corner-recovery').hidden);await page.waitForTimeout(100);
 const visible=await page.locator('.breath-orbit').evaluate(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===hit||e.contains(hit);});assert.ok(visible,'breathing target visible, not scrolled beneath text');
 const layout=await fit(page,'#sparring-ui',mobile,true);assert.ok(layout.fits&&layout.noScroll);await page.screenshot({path:`docs/corner-fixture-${mobile?'mobile':'desktop'}.png`});
 assert.deepEqual(errors,[]);await context.close();console.log(`${mobile?'Mobile568':'Desktop'}: all3verdicts, E card details and breathing target fit.`);
 }
}finally{await browser.close();}
