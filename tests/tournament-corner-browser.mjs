import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, joyPoint, dispatch, tapContact, fit } from './control-helpers.mjs';
import { hotelFixture, seedContext, CAREER_STORAGE_KEY } from './hotel-test-helpers.mjs';

// Qualification is a fixture; the full 60-second round and all defenses below
// use real CDP touches. This covers the inter-round path that early TKOs skip.
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:568,height:320},isMobile:true,hasTouch:true,deviceScaleFactor:1});
await seedContext(context,hotelFixture());
const page = await context.newPage(), cdp = await context.newCDPSession(page), errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try {
  // Even a conflicting URL cannot strip a bracket opponent's official uniform.
  await page.goto('http://127.0.0.1:5173/?scene=fight&opponent=bellini&tournament=false');
  await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);
  assert.equal(await page.evaluate(()=>window.__sparring.session.state.settings.tournament),true);
  await page.locator('#sparring-ui .primary-button').focus();
  await tapContact(page,cdp,'#sparring-ui [data-pad-button="a"]');
  await wait(page,()=>window.__sparring.session.state.phase==='running');
  assert.equal(await page.locator('.round-panel').isVisible(),false,'The introductory window disappears when round one starts');
  const high = await joyPoint(page,'#sparring-ui','up',1);
  let held=false;
  const deadline=Date.now()+180000;
  while(Date.now()<deadline) {
    const state=await page.evaluate(()=>structuredClone(window.__sparring.session.state));
    if(state.phase==='between')break;
    assert.equal(state.phase,'running');
    const r=state.remi;
    const protect=['jab','cross'].includes(r.action)||(r.action.startsWith('tell')&&r.duration*(1-r.progress)<.40);
    if(protect!==held){await dispatch(cdp,protect?'touchStart':'touchEnd',[high]);held=protect;}
    await page.waitForTimeout(35);
  }
  if(held)await dispatch(cdp,'touchEnd',[high]);
  const before=await page.evaluate(()=>structuredClone(window.__sparring.session.state));
  assert.equal(before.phase,'between');assert.equal(before.bout.round,1);assert.ok(before.stats.blocked>=20);assert.equal(before.bout.downs.player.total,0);
  const corner=page.locator('#sparring-ui .corner-vignette img');
  await wait(page,()=>document.querySelector('.corner-vignette img')?.naturalWidth>0);
  assert.match(await corner.getAttribute('src'),/fredo-coach\.png$/);
  assert.ok(await corner.isVisible());
  assert.match(await page.locator('.corner-advice').textContent(), /FREDO/);
  const menuFits = await page.locator('.round-panel').evaluate(panel => { const r=panel.getBoundingClientRect(), c=document.querySelector('canvas').getBoundingClientRect(); return r.left>=c.left && r.right<=c.right && r.top>=c.top && r.bottom<=c.bottom && panel.scrollWidth<=panel.clientWidth && panel.scrollHeight<=panel.clientHeight; });
  assert.ok(menuFits, 'Fredo and the next-round menu remain inside the small 16:9 camera');
  assert.match(await page.locator('.corner-advice').textContent(),/jabs|direct/i);
  const layout=await fit(page,'#sparring-ui',true);assert.ok(layout.fits&&layout.noScroll);assert.ok(layout.controls.every(c=>c.outside&&c.fits));
  await page.screenshot({path:'docs/snes-bellini-corner-mobile.png'});
  await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>structuredClone(window.__sparring.session.state)),before,'corner freezes combat until player is ready');
  await page.locator('#sparring-ui .primary-button').focus();await tapContact(page,cdp,'#sparring-ui [data-pad-button="a"]');
  await wait(page,()=>window.__sparring.session.state.phase==='running');
  assert.equal(await page.locator('.round-panel').isVisible(),false,'The corner window disappears when round two starts');
  const after=await page.evaluate(()=>structuredClone(window.__sparring.session.state));
  assert.equal(after.bout.round,2);assert.equal(after.stamina,after.settings.maxStamina);assert.equal(after.bout.resistance.player,Math.min(after.settings.maxResistance,before.bout.resistance.player+20));assert.equal(after.bout.downs.player.total,0);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);assert.equal(saved.tournament.active.results.length,0,'a round is not prematurely recorded as a tournament result');
  await page.reload();await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);assert.equal(await page.evaluate(()=>window.__sparring.session.state.settings.tournament),true);
  assert.deepEqual(errors,[]);
  await fs.writeFile('docs/snes-corner-browser-results.json',JSON.stringify({date:new Date().toISOString(),blocks:before.stats.blocked,received:before.stats.received,round2:true,fredoCoach:true,officialUniform:true,menuFits,noPrematureResult:true,layout,errors},null,2)+'\n');
  console.log(`Tournament corner: ${before.stats.blocked} real defenses, coach uniform, pause, round two, save and hostile URL verified.`);
} finally {await browser.close();}
