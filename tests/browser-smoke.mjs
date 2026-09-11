// Optional browser integration checks. Uses an existing local Playwright install.
// npm run test:browser; override PLAYWRIGHT_MODULE_PATH if needed.
import assert from 'node:assert/strict';
import { joyPoint, buttonPoint, dispatch, tapContact } from './control-helpers.mjs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
let modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) {
  try { modulePath = require.resolve('playwright'); }
  catch { modulePath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'); }
}
const { chromium } = await import(pathToFileURL(modulePath));
const browser = await chromium.launch({ headless: true });
const errors = [];
const reports = [];
const base = 'http://127.0.0.1:5173/?scene=sparring';
await fs.mkdir('docs', { recursive: true });
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
};
const state = (page) => page.evaluate(() => structuredClone(window.__sparring.session.state));
const wait = (page, expression, arg) => page.waitForFunction(expression, arg, { timeout: 7000 });
const log = (text) => { reports.push(text); console.log(text); };
async function geometry(page) {
  // The menu can scroll internally on a short landscape viewport. The page
  // cannot scroll, and the chosen action must become visible and clickable.
  await page.locator('.primary-button').scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom };
    };
    const panel = document.querySelector('.round-panel');
    const button = document.querySelector('.primary-button');
    const start = rect('.primary-button');
    const hit = document.elementFromPoint(start.x + start.width / 2, start.y + start.height / 2);
    return { width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, scrollHeight:document.documentElement.scrollHeight,
      stage:rect('#stage'), canvas:rect('canvas'), panel:rect('.round-panel'), start,
      noMenuHorizontalScroll:panel.scrollWidth <= panel.clientWidth + 1,
      startActionable:!button.disabled && (hit === button || button.contains(hit)) };
  });
}
function checkFit(g) {
  assert.ok(Math.abs(g.stage.width / g.stage.height - 16 / 9) < .005, 'stage keeps 16:9');
  assert.ok(Math.abs(g.canvas.width / g.canvas.height - 16 / 9) < .005, 'canvas keeps 16:9');
  assert.ok(g.stage.bottom <= g.height + 1 && g.stage.right <= g.width + 1, 'stage fits viewport');
  assert.ok(g.scrollHeight <= g.height + 1 && g.scrollWidth <= g.width + 1, 'no page scroll');
  assert.ok(g.panel.x >= -1 && g.panel.y >= -1 && g.panel.right <= g.width + 1 && g.panel.bottom <= g.height + 1, 'menu fits viewport');
  assert.ok(g.noMenuHorizontalScroll, 'menu has no horizontal scroll');
  assert.ok(g.start.bottom <= g.panel.bottom + 1 && g.start.y >= g.panel.y - 1 && g.start.x >= g.panel.x - 1 && g.start.right <= g.panel.right + 1,
    'start button is visible inside its menu after scrolling');
  assert.ok(g.startActionable, 'start button is enabled and its hit area is uncovered');
}
try {
  const page = await browser.newPage({ viewport:{width:1440,height:1000} });
  watch(page);
  await page.goto(base);
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  checkFit(await geometry(page));
  await page.screenshot({path:'docs/sparring-accueil.png'});
  await page.locator('.primary-button').click();
  await page.keyboard.down('j');
  await wait(page, () => {
    const { session, scene } = window.__sparring;
    if (session.state.stats.landed === 1 && scene.player.pose === 'jab') { scene.scene.pause(); return true; }
    return false;
  });
  const impact = await page.evaluate(() => window.__sparring.impacts.at(-1));
  assert.equal(impact.type, 'player-hit');
  assert.equal(impact.playerTexture, 'player-jab');
  assert.ok(impact.playerProgress >= .45 && impact.playerProgress < .57, 'contact counted on jab impact frame');
  const gloveError = await page.evaluate(() => {
    const { player } = window.__sparring.scene;
    const contact = player.contact();
    return Math.hypot(contact.x-player.target.x, contact.y-player.target.y);
  });
  assert.ok(gloveError < 2, 'glove aligns with target at impact');
  await page.screenshot({path:'docs/sparring-jab.png'});
  await page.evaluate(() => window.__sparring.scene.scene.resume());
  await page.waitForTimeout(650);
  assert.equal((await state(page)).stats.thrown, 1, 'holding J must not repeat');
  await page.keyboard.up('j');
  await page.keyboard.press('k');
  await wait(page, () => window.__sparring.session.state.stats.thrown === 2 && window.__sparring.session.state.player.action === 'idle');
  await page.keyboard.down('ArrowUp');
  await wait(page, () => window.__sparring.session.state.stats.blocked >= 1);
  const drained = (await state(page)).stamina;
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(850);
  assert.ok((await state(page)).stamina > drained, 'rest recovers stamina');
  await page.keyboard.down('ArrowUp');
  await page.keyboard.press('p');
  const paused = await state(page);
  assert.equal(paused.phase, 'paused');
  assert.notEqual(paused.player.action, 'guard');
  await page.waitForTimeout(300);
  assert.equal((await state(page)).remaining, paused.remaining);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Escape');
  await wait(page, () => window.__sparring.session.state.phase === 'running');
  await wait(page, () => ['jab','cross'].includes(window.__sparring.session.state.remi.action) && window.__sparring.session.state.remi.progress < .10);
  const safe = (await state(page)).remi.safeDodge;
  await page.keyboard.press(safe === 'dodgeLeft' ? 'ArrowLeft' : 'ArrowRight');
  await wait(page, () => window.__sparring.session.state.stats.dodged >= 1);
  await page.keyboard.down('ArrowUp');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await wait(page, () => window.__sparring.session.state.phase === 'paused');
  assert.equal(await page.evaluate(() => window.__sparring.ui.controls.guard !== null), false);
  assert.equal(await page.evaluate(() => window.__sparring.ui.controls.keys.size), 0);
  await page.keyboard.up('ArrowUp');
  await page.locator('[name="tempo"]').selectOption('fast');
  await page.locator('[name="recovery"]').selectOption('1.5');
  await page.locator('.secondary-button').click();
  const restarted = await state(page);
  assert.equal(restarted.phase, 'running');
  assert.equal(restarted.settings.tempo, 'fast');
  assert.equal(restarted.settings.recovery, 1.5);
  assert.equal(restarted.stats.thrown, 0);
  assert.equal(restarted.stamina, 100);
  log('Desktop: start, jab/contact alignment, no hold repeat, direct, block, recovery, directional dodge, pause, focus release, settings and restart passed.');
  await page.close();

  const mobile = await browser.newContext({ viewport:{width:844,height:390}, hasTouch:true, isMobile:true, deviceScaleFactor:1 });
  const phone = await mobile.newPage(); watch(phone);
  await phone.goto(base); await wait(phone, () => window.__sparring);
  checkFit(await geometry(phone));
  await phone.locator('.primary-button').tap();
  await wait(phone, () => window.__sparring.session.state.phase === 'running');
  const cdp = await mobile.newCDPSession(phone);
  const guard = await joyPoint(phone, '#sparring-ui', 'up', 1);
  const jab = await buttonPoint(phone, '[data-action="jab"]', 2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[guard]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[guard,jab]});
  // Chromium CDP ends the listed contact here; end the jab finger only.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[jab]});
  await wait(phone, () => window.__sparring.session.state.stats.thrown === 1 && window.__sparring.session.state.player.action === 'guard');
  assert.equal(await phone.evaluate(() => window.__sparring.ui.controls.guard !== null),true);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(phone, () => window.__sparring.session.state.player.action === 'idle');
  const cross = await buttonPoint(phone, '[data-action="cross"]', 3);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[cross]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(phone, () => window.__sparring.session.state.stats.thrown === 2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[guard]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.equal(await phone.evaluate(() => window.__sparring.ui.controls.guard !== null),false);
  await wait(phone, () => ['jab','cross'].includes(window.__sparring.session.state.remi.action) && window.__sparring.session.state.remi.progress < .10);
  const safeTouch = (await state(phone)).remi.safeDodge;
  const dodge = await joyPoint(phone, '#sparring-ui', safeTouch === 'dodgeLeft' ? 'left' : 'right', 4);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[dodge]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(phone, () => window.__sparring.session.state.stats.dodged >= 1);
  // A finger still held when focus is lost must never activate the menu
  // which appears beneath it, even on the smallest supported landscape.
  await phone.setViewportSize({width:568,height:320});
  const heldGuard = await joyPoint(phone, '#sparring-ui', 'up', 5);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[heldGuard]});
  await phone.evaluate(() => window.dispatchEvent(new Event('blur')));
  await wait(phone, () => window.__sparring.session.state.phase === 'paused');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForTimeout(150);
  assert.equal((await state(phone)).phase,'paused','release of an old touch cannot resume the round');
  await tapContact(phone, cdp, '#sparring-ui [data-pad-button="a"]');
  await phone.setViewportSize({width:844,height:390});
  await phone.screenshot({path:'docs/sparring-mobile-paysage.png'});
  await phone.setViewportSize({width:390,height:844});
  await wait(phone, () => window.__sparring.session.state.phase === 'paused');
  assert.equal(await phone.locator('#rotate-prompt').isVisible(),true);
  assert.equal(await phone.evaluate(() => document.getElementById('stage').inert),true);
  await phone.screenshot({path:'docs/sparring-mobile-portrait.png'});
  await phone.setViewportSize({width:844,height:390});
  await phone.locator('.primary-button').tap();
  await wait(phone, () => window.__sparring.session.state.phase === 'running');
  log('Mobile viewports 844×390 and 568×320: joypad guard + A simultaneously, B direct, joypad dodge, release/cancel, no accidental resume after focus loss, portrait and explicit resume passed (no physical phone test).');
  await mobile.close();

  const roundPage=await browser.newPage({viewport:{width:1280,height:900}}); watch(roundPage);
  await roundPage.goto(base); await wait(roundPage,()=>window.__sparring);
  await roundPage.locator('.primary-button').click();
  const begun=Date.now();
  log('Running one complete default 60-second round in the browser…');
  await roundPage.waitForFunction(()=>window.__sparring.session.state.phase==='finished',null,{timeout:75000});
  const duration=(Date.now()-begun)/1000;
  const complete=await state(roundPage);
  assert.equal(complete.remaining,0);
  assert.ok(duration>=59 && duration<72, `round wall duration ${duration}s`);
  assert.ok(complete.stats.received>=10);
  assert.equal(await roundPage.locator('.round-results').isVisible(),true);
  await roundPage.screenshot({path:'docs/sparring-bilan.png'});
  await roundPage.locator('.primary-button').click();
  await wait(roundPage,()=>window.__sparring.session.state.phase==='running');
  assert.equal((await state(roundPage)).stats.received,0);
  log(`Complete round finished after ${duration.toFixed(1)} real seconds; report and next round passed.`);
  assert.deepEqual(errors,[], 'no browser console/page/resource errors');
  log('No browser errors or failed assets.');
  await fs.writeFile('docs/browser-results.json',JSON.stringify({checkedAt:new Date().toISOString(),reports,errors},null,2)+'\n');
} finally { await browser.close(); }
