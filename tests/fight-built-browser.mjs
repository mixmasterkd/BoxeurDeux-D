import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, wait, joyPoint, buttonPoint, dispatch, fit } from './control-helpers.mjs';
const browser=await chromium.launch({headless:true}), live=process.env.FIGHT_PUBLIC_URL;
const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const base=live??'https://boxeur-build.invalid/BoxeurDeux-D/';
const errors=[],assets=new Set();
if(!live)await context.route('https://boxeur-build.invalid/BoxeurDeux-D/**',async route=>{
 const rel=decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length))||'index.html';
 const file=path.resolve('dist',rel);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
 try{const body=await fs.readFile(file),ext=path.extname(file);await route.fulfill({status:200,body,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'})[ext]??'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Absent'});}
});
const page=await context.newPage(),cdp=await context.newCDPSession(page);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);else assets.add(new URL(r.url()).pathname);});
const phase=()=>page.locator('#sparring-ui').getAttribute('data-phase');
async function tap(selector){const p=await buttonPoint(page,selector,2);await dispatch(cdp,'touchStart',[p]);await dispatch(cdp,'touchEnd',[]);}
try{
 await page.goto(new URL('?scene=fight&opponent=beton',base).href);await wait(page,()=>document.querySelector('#sparring-ui')?.dataset.phase==='ready',null,60000);assert.equal(await page.evaluate(()=>Boolean(window.__sparring)),false);
 assert.match(await page.locator('.combat-rules').textContent(),/45 s/);assert.equal(await page.locator('.round-time').textContent(),'0:45');
 await page.locator('.primary-button').focus();await tap('[data-pad-button="a"]');
 let held=null;const deadline=Date.now()+100000;
 while(await phase()==='running'&&Date.now()<deadline){
 const signal=await page.locator('.fight-signal').evaluate(e=>({hidden:e.hidden,tone:e.dataset.tone,text:e.textContent}));
 const needed=!signal.hidden&&signal.tone==='tell'?(signal.text.includes('CORPS')?'body':'head'):null;
 if(needed!==held){if(held)await dispatch(cdp,'touchEnd',[]);if(needed)await dispatch(cdp,'touchStart',[await joyPoint(page,'#sparring-ui',needed==='body'?'down':'up',1)]);held=needed;}
 await page.waitForTimeout(30);
 }
 if(held)await dispatch(cdp,'touchEnd',[]);
 assert.equal(await phase(),'corner');await tap('.console-menu-button');await wait(page,()=>document.querySelector('#sparring-ui').dataset.phase==='paused');await page.locator('.primary-button').focus();await tap('[data-pad-button="a"]');await wait(page,()=>document.querySelector('#sparring-ui').dataset.phase==='corner');
 const layouts=[];
 for(const width of [568,844]){
 await page.setViewportSize({width,height:width===568?320:390});await page.waitForTimeout(80);
 const target=await page.locator('.breath-orbit').evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit);});assert.ok(target);
 const layout=await fit(page,'#sparring-ui',true,true);assert.ok(layout.fits&&layout.noScroll);assert.ok(layout.controls.every(c=>c.outside&&c.fits));layouts.push(layout);
 }
 await page.screenshot({path:`docs/fredo-${live?'public':'built'}.png`});await tap('.primary-button');await wait(page,()=>document.querySelector('#sparring-ui').dataset.phase==='between');await page.locator('.primary-button').focus();await tap('[data-pad-button="a"]');await wait(page,()=>document.querySelector('#sparring-ui').dataset.phase==='running');assert.match(await page.locator('.round-eyebrow').textContent(),/ROUND 2/);
 const refereeAssets=[...assets].filter(p=>p.includes('/referee/'));assert.equal(refereeAssets.length,4);assert.deepEqual(errors,[]);
 const result={date:new Date().toISOString(),base,buildWithoutDevBridge:true,round45Played:true,cornerPauseSkipAndRound2:true,refereeAssets,layouts,errors};await fs.writeFile(`docs/fight-${live?'public':'built'}-results.json`,JSON.stringify(result,null,2)+'\n');console.log(`${live?'Public':'Compiled subpath'}: vrai round45s, garde tactile, Fredo, pause, passage, round2 et deux tailles vérifiés.`);
}finally{await browser.close();}
