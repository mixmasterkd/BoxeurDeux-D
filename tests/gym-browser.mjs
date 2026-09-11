import assert from 'node:assert/strict';
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
const errors = [], reports = [];
const wait = (page, predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 10000 });
const state = page => page.evaluate(() => structuredClone(window.__gym.world.state));
const log = message => { reports.push(message); console.log(message); };
function watch(page) {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
}
async function moveTo(page, axis, target) {
  const current = (await state(page))[axis];
  if (Math.abs(current - target) < 3) return;
  const sign = target > current ? 1 : -1;
  const key = axis === 'x' ? sign > 0 ? 'ArrowRight' : 'ArrowLeft' : sign > 0 ? 'ArrowDown' : 'ArrowUp';
  await page.keyboard.down(key);
  try { await wait(page, ({ axis, target, sign }) => (window.__gym.world.state[axis] - target) * sign >= 0, { axis, target, sign }); }
  finally { await page.keyboard.up(key); }
}
async function fit(page) {
  const value = await page.evaluate(() => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    const stage = document.getElementById('stage').getBoundingClientRect();
    return { ratio: r.width / r.height, width: document.querySelector('canvas').width, height: document.querySelector('canvas').height,
      fits: stage.right <= innerWidth + 1 && stage.bottom <= innerHeight + 1,
      noScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight };
  });
  assert.deepEqual([value.width, value.height], [1280, 720]);
  assert.ok(Math.abs(value.ratio - 16 / 9) < .003 && value.fits && value.noScroll);
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); watch(page);
  await page.goto('http://127.0.0.1:5173/');
  await wait(page, () => window.__gym?.world && !window.__gym.world.state.paused);
  await fit(page);
  const start = await state(page);
  await page.keyboard.down('ArrowUp');
  const poses = new Set();
  for (let step = 0; step < 12; step++) {
    await page.waitForTimeout(80);
    poses.add(await page.evaluate(() => window.__gym.scene.player.texture.key));
  }
  await page.keyboard.up('ArrowUp');
  const blocked = await state(page);
  assert.ok(blocked.y < start.y - 100 && blocked.y >= 445, 'feet stop in front of the ring apron');
  assert.equal(blocked.moving, false);
  assert.ok(poses.size >= 3, 'walking cycles through the authored poses');
  await moveTo(page, 'y', 520);
  await moveTo(page, 'x', 915);
  await wait(page, () => window.__gym.world.state.nearby?.id === 'remi');
  const beforeRound = await state(page);
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.gym-dialog').isVisible(), true, 'held Enter does not immediately choose a lesson');
  assert.equal(await page.evaluate(() => Boolean(window.__sparring)), false);
  await page.keyboard.up('Enter');
  await page.screenshot({ path: 'docs/gym-dialogue-remi.png' });
  await page.locator('.gym-session-button[data-lesson="jab"]').click();
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  assert.equal(await page.evaluate(() => window.__sparring.session.state.training.id), 'jab');
  assert.equal(await page.evaluate(() => Boolean(window.__gym)), false, 'gym controls are removed in the ring');
  await page.locator('.primary-button').click();
  for (let repetition = 0; repetition < 3; repetition++) {
    if (repetition) await wait(page, () => window.__sparring.session.state.remi.action === 'guard');
    await wait(page, () => window.__sparring.session.state.remi.action === 'open');
    await page.keyboard.press('j');
    await wait(page, count => window.__sparring.session.state.training.progress === count, repetition + 1);
  }
  await wait(page, () => window.__sparring.session.state.phase === 'finished');
  await page.locator('.return-gym-button').click();
  await wait(page, () => window.__gym?.world);
  const afterRound = await state(page);
  assert.equal(afterRound.x, beforeRound.x);
  assert.equal(afterRound.y, beforeRound.y);
  assert.equal(afterRound.moving, false);
  assert.equal(await page.evaluate(() => Boolean(window.__sparring)), false);
  log('Desktop: walking poses, ring collision, held Enter, Rémi conversation, complete jab lesson and return at the same position passed.');

  // Each atelier is reached by movement, not by teleporting the model.
  await moveTo(page, 'y', 540);
  await moveTo(page, 'x', 230);
  for (const [id, waypoints, text] of [
    ['corde', [], 'corde'],
    ['sac', [['x', 310], ['y', 306], ['x', 260]], 'sac'],
    ['miroir', [['y', 309], ['x', 152], ['y', 245]], 'miroir'],
    ['speedball', [['y', 309], ['x', 320], ['y', 515], ['x', 1065], ['y', 276]], 'speed ball'],
  ]) {
    for (const [axis, target] of waypoints) await moveTo(page, axis, target);
    await wait(page, id => window.__gym.world.state.nearby?.id === id, id);
    await page.keyboard.press('e');
    assert.ok((await page.locator('#gym-dialog-title').textContent()).toLowerCase().includes(text));
    await page.keyboard.press('Escape');
  }
  await page.keyboard.down('ArrowDown');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await wait(page, () => window.__gym.world.state.paused);
  const frozen = await state(page);
  await page.waitForTimeout(350);
  assert.equal((await state(page)).y, frozen.y);
  await page.keyboard.up('ArrowDown');
  await page.locator('.gym-resume-button').click();
  await page.waitForTimeout(200);
  assert.equal((await state(page)).y, frozen.y, 'resume never revives a held direction');
  log('All four atelier descriptions reached on foot; focus loss freezes movement and releases held keys.');
  await page.close();

  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const phone = await context.newPage(); watch(phone);
  await phone.goto('http://127.0.0.1:5173/index.html');
  await wait(phone, () => window.__gym?.world);
  await fit(phone);
  const cdp = await context.newCDPSession(phone);
  const contact = async (direction, id) => {
    const b = await phone.locator(`[data-direction="${direction}"]`).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, id };
  };
  const right = await contact('right', 1), up = await contact('up', 2);
  const initial = await state(phone);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, up] });
  await phone.waitForTimeout(240);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [up] });
  const diagonal = await state(phone);
  assert.ok(diagonal.x > initial.x + 10 && diagonal.y < initial.y - 10);
  await phone.waitForTimeout(200);
  assert.ok((await state(phone)).x > diagonal.x + 10);
  assert.ok(Math.abs((await state(phone)).y - diagonal.y) < 5, 'lifting up finger keeps only horizontal movement');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  const canceled = await state(phone);
  await phone.waitForTimeout(200);
  assert.equal((await state(phone)).x, canceled.x);
  // Complete the approach using touch holds, observing positions only.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right] });
  await wait(phone, () => window.__gym.world.state.x >= 915);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [up] });
  await wait(phone, () => window.__gym.world.state.nearby?.id === 'remi');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await phone.locator('.gym-interact-button').tap();
  await phone.locator('.gym-session-button[data-lesson="free"]').tap();
  await phone.locator('.primary-button').tap();
  await phone.locator('[data-action="jab"]').tap();
  await wait(phone, () => window.__sparring.session.state.stats.landed === 1);
  await phone.locator('.pause-button').tap();
  await phone.locator('.return-gym-button').tap();
  await wait(phone, () => window.__gym?.world);
  await phone.screenshot({ path: 'docs/gym-mobile-paysage.png' });
  for (const viewport of [{ width: 667, height: 375 }, { width: 568, height: 320 }]) {
    await phone.setViewportSize(viewport); await fit(phone);
    await phone.locator('.gym-interact-button').tap();
    const r = await phone.locator('.gym-dialog').boundingBox();
    assert.ok(r.y >= 0 && r.y + r.height <= viewport.height && r.x >= 0 && r.x + r.width <= viewport.width);
    await phone.locator('.gym-close-button').tap();
  }
  await phone.setViewportSize({ width: 390, height: 844 });
  await wait(phone, () => window.__gym.world.state.paused);
  assert.equal(await phone.locator('#rotate-prompt').isVisible(), true);
  assert.equal(await phone.evaluate(() => document.getElementById('stage').inert), true);
  await phone.screenshot({ path: 'docs/gym-mobile-portrait.png' });
  await phone.setViewportSize({ width: 844, height: 390 });
  await phone.locator('.gym-resume-button').tap();
  assert.equal((await state(phone)).paused, false);
  log('Touch: simultaneous directions, independent release/cancel, walk to Rémi, sparring jab, pause/return, three landscape sizes and portrait passed (simulated viewports).');
  assert.deepEqual(errors, []);
  log('No console, page or asset errors; logical canvas stays 1280×720.');
} finally {
  await fs.writeFile('docs/gym-browser-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), reports, errors }, null, 2) + '\n');
  await browser.close();
}
