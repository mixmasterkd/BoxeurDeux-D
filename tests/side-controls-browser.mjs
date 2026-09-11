import { joyPoint } from './control-helpers.mjs';
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
const base = process.env.GYM_URL ?? 'http://127.0.0.1:5173/';
const captureDir = process.env.SIDE_CAPTURE_DIR ?? path.join(os.tmpdir(), 'boxeur-side-controls');
await fs.mkdir(captureDir, { recursive: true });
const errors = [], reports = [];
let activePage, failure;
const wait = (page, predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 12000 });
const gymState = page => page.evaluate(() => structuredClone(window.__gym.world.state));
const roundState = page => page.evaluate(() => structuredClone(window.__sparring.session.state));
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const gymButtons = '#gym-ui .joypad, #gym-ui .input-rail button';
const ringButtons = '#sparring-ui .joypad, #sparring-ui .input-rail button';
const watch = page => {
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
};

async function checkRails(page, scene, expected) {
  await settle(page);
  const value = await page.evaluate(selector => {
    const rect = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const canvas = document.querySelector('#game canvas');
    return {
      canvas: rect(canvas), logical: [canvas.width, canvas.height], viewport: { width: innerWidth, height: innerHeight },
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      controls: [...document.querySelectorAll(selector)].filter(visible).map(node => ({
        name: node.dataset.direction ?? node.dataset.action ?? node.className,
        rect: rect(node),
        hit: (() => {
          const r = rect(node);
          const topmost = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
          return topmost === node || node.contains(topmost);
        })(),
      })),
    };
  }, scene === 'gym' ? gymButtons : ringButtons);
  const { canvas, viewport, controls } = value;
  assert.deepEqual(value.logical, [1280, 720], 'logical game resolution stays fixed');
  assert.ok(Math.abs(canvas.width / canvas.height - 16 / 9) < .005, 'canvas keeps the same 16:9 framing');
  assert.ok(canvas.left >= -1 && canvas.top >= -1 && canvas.right <= viewport.width + 1 && canvas.bottom <= viewport.height + 1, 'whole canvas fits viewport');
  assert.ok(value.scroll[0] <= viewport.width + 1 && value.scroll[1] <= viewport.height + 1, 'no page overflow');
  assert.equal(controls.length, expected, `${scene}: expected visible side buttons`);
  for (const { name, rect: r, hit } of controls) {
    assert.ok(r.left >= -1 && r.top >= -1 && r.right <= viewport.width + 1 && r.bottom <= viewport.height + 1,
      `${scene}: ${name} entirely on screen: ${JSON.stringify(r)}`);
    assert.ok(r.right <= canvas.left + 1 || r.left >= canvas.right - 1,
      `${scene}: ${name} belongs in a side band outside canvas: ${JSON.stringify({ button: r, canvas })}`);
    assert.ok(hit, `${scene}: ${name} is not covered by another element`);
  }
  for (let a = 0; a < controls.length; a++) {
    for (let b = a + 1; b < controls.length; b++) {
      const one = controls[a], two = controls[b];
      const width = Math.min(one.rect.right, two.rect.right) - Math.max(one.rect.left, two.rect.left);
      const height = Math.min(one.rect.bottom, two.rect.bottom) - Math.max(one.rect.top, two.rect.top);
      assert.ok(width <= 1 || height <= 1, `${scene}: ${one.name} overlaps ${two.name}`);
    }
  }
  return value;
}

async function checkMenu(page, selector) {
  const value = await page.locator(selector).evaluate(panel => {
    const p = panel.getBoundingClientRect();
    const buttons = [...panel.querySelectorAll('button, select, input')].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
    return {
      fits: p.left >= 0 && p.top >= 0 && p.right <= innerWidth + 1 && p.bottom <= innerHeight + 1,
      noHorizontalScroll: panel.scrollWidth <= panel.clientWidth + 1,
      controlsFit: buttons.every(node => {
        const r = node.getBoundingClientRect();
        return r.left >= p.left && r.right <= p.right + 1;
      }),
      pageFits: document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1,
    };
  });
  assert.ok(Object.values(value).every(Boolean), `${selector}: ${JSON.stringify(value)}`);
}

async function contact(page, selector, id) {
  const rect = await page.locator(selector).boundingBox();
  assert.ok(rect, `${selector} visible for touch`);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id };
}

async function touchMoveTo(page, cdp, axis, target, tolerance = 3) {
  const current = (await gymState(page))[axis];
  if (Math.abs(current - target) < tolerance) return;
  const sign = target > current ? 1 : -1;
  const direction = axis === 'x' ? sign > 0 ? 'right' : 'left' : sign > 0 ? 'down' : 'up';
  const point = await joyPoint(page, '#gym-ui', direction, 21);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  try { await wait(page, ({ axis, target, sign }) => (window.__gym.world.state[axis] - target) * sign >= 0, { axis, target, sign }); }
  finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
}

async function commands(page, scene) {
  const root = scene === 'gym' ? '#gym-ui' : '#sparring-ui';
  const paused = () => scene === 'gym' ? gymState(page).then(s => s.paused) : roundState(page).then(s => s.phase === 'paused');
  await page.locator(`${root} .commands-open-button`).tap();
  await checkMenu(page, `${root} .commands-panel`);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(`${root} .commands-back-button`).evaluate(node => node === document.activeElement), true, 'focus stays in Commandes');
  await page.keyboard.press('Escape');
  assert.equal(await paused(), true, 'leaving Commandes does not resume the game');
  await page.locator(`${root} .commands-open-button`).tap();
  await page.locator(`${root} .commands-back-button`).tap();
  assert.equal(await paused(), true);
}

try {
  for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 568, height: 320 }, { width: 1280, height: 720 }]) {
    if (process.env.SIDE_CASE && process.env.SIDE_CASE !== String(viewport.width)) continue;
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const page = await context.newPage(); watch(page);
    const cdp = await context.newCDPSession(page);
    await page.goto(base);
    await wait(page, () => window.__gym?.world && !window.__gym.world.state.paused);
    await checkRails(page, 'gym', 4);
    const before = await gymState(page);
    const right = await joyPoint(page, '#gym-ui', 'right', 1);
    const diagonalPoint = await joyPoint(page, '#gym-ui', 'upRight', 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [diagonalPoint] });
    await page.waitForTimeout(200);
    const diagonal = await gymState(page);
    assert.ok(diagonal.x > before.x + 10 && diagonal.y < before.y - 10, 'one thumb moves diagonally on the joypad');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [right] });
    const horizontal = await gymState(page);
    await page.waitForTimeout(200);
    const moved = await gymState(page);
    assert.ok(moved.x > horizontal.x + 10 && Math.abs(moved.y - horizontal.y) < 5, 'dragging the same thumb changes direction without lifting');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    const canceled = await gymState(page);
    await page.waitForTimeout(150);
    assert.equal((await gymState(page)).x, canceled.x, 'cancel releases walking');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right] });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(page, () => window.__gym.world.state.paused);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const frozen = await gymState(page);
    await checkMenu(page, '.gym-pause-panel');
    await commands(page, 'gym');
    await page.locator('.gym-resume-button').tap();
    await page.waitForTimeout(150);
    assert.equal((await gymState(page)).x, frozen.x, 'return from pause does not restore an old finger');

    // Interaction needs proximity, not an exact coordinate. Avoid tiny
    // corrective holds which overshoot on a slow full-size software renderer.
    await touchMoveTo(page, cdp, 'x', 915, 50);
    await touchMoveTo(page, cdp, 'y', 520, 12);
    await wait(page, () => window.__gym.world.state.nearby?.id === 'remi');
    const entry = await gymState(page);
    await page.screenshot({ path: path.join(captureDir, `gym-${viewport.width}.png`) });
    await page.locator('.gym-interact-button').tap();
    await checkMenu(page, '.gym-dialog');
    await page.locator('.gym-session-button[data-lesson="free"]').tap();
    await wait(page, () => window.__sparring?.session.state.phase === 'ready');
    await checkMenu(page, '.round-panel');
    await page.locator('[name="tempo"]').selectOption('calm');
    await page.locator('.primary-button').tap();
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    await checkRails(page, 'sparring', 4);
    const guard = await joyPoint(page, '#sparring-ui', 'up', 3);
    const jab = await contact(page, '[data-action="jab"]', 4);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [guard] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [guard, jab] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [jab] });
    await wait(page, () => window.__sparring.session.state.stats.thrown === 1 && window.__sparring.session.state.player.action === 'guard');
    assert.equal(await page.evaluate(() => Boolean(window.__sparring.ui.controls.guard)), true, 'lifting jab preserves held guard');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await wait(page, () => window.__sparring.session.state.player.action === 'idle');
    assert.equal(await page.evaluate(() => Boolean(window.__sparring.ui.controls.guard)), false, 'cancel releases guard');
    await page.locator('[data-action="cross"]').tap();
    await wait(page, () => window.__sparring.session.state.stats.thrown === 2);
    await page.screenshot({ path: path.join(captureDir, `sparring-${viewport.width}.png`) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [guard] });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const stopped = await roundState(page);
    await page.waitForTimeout(150);
    assert.equal((await roundState(page)).phase, 'paused', 'old guard finger cannot resume the menu');
    await checkMenu(page, '.round-panel');
    const muted = await page.locator('.audio-button').getAttribute('aria-pressed');
    await page.locator('.audio-button').tap();
    assert.notEqual(await page.locator('.audio-button').getAttribute('aria-pressed'), muted, 'pause sound control works');
    await commands(page, 'sparring');
    assert.equal((await roundState(page)).remaining, stopped.remaining, 'round clock stays frozen through commands');
    await page.locator('.primary-button').tap();
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    assert.equal(await page.evaluate(() => Boolean(window.__sparring.ui.controls.guard)), false);

    await page.setViewportSize({ width: 390, height: 844 });
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    assert.equal(await page.locator('#rotate-prompt').isVisible(), true);
    assert.equal(await page.evaluate(() => document.getElementById('stage').inert), true);
    const portraitTime = (await roundState(page)).remaining;
    await page.keyboard.press('p');
    await page.waitForTimeout(100);
    assert.equal((await roundState(page)).remaining, portraitTime, 'portrait cannot resume using keyboard');
    await page.setViewportSize(viewport);
    await settle(page);
    assert.equal((await roundState(page)).phase, 'paused', 'landscape requires explicit resume');
    await page.locator('.primary-button').tap();
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    await checkRails(page, 'sparring', 4);
    await page.locator('.pause-button').tap();
    await page.locator('.return-gym-button').tap();
    await wait(page, () => window.__gym?.world);
    const returned = await gymState(page);
    assert.equal(returned.x, entry.x);
    assert.equal(returned.y, entry.y);
    await checkRails(page, 'gym', 4);
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(page, () => window.__gym.world.state.paused);
    assert.equal(await page.locator('#rotate-prompt').isVisible(), true);
    await page.setViewportSize(viewport);
    await page.locator('.gym-resume-button').tap();
    await checkRails(page, 'gym', 4);
    const report = `Touch ${viewport.width}×${viewport.height}: side buttons outside canvas, no overlaps, multi-touch, cancel/focus, Rémi transition, menus/commands and portrait return passed.`;
    reports.push(report); console.log(report);
    await context.close();
  }

  if (!process.env.SIDE_CASE || process.env.SIDE_CASE === 'desktop') {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 568, height: 320 }]) {
      const page = await browser.newPage({ viewport, hasTouch: false }); watch(page);
      await page.goto(base);
      await wait(page, () => window.__gym?.world && !window.__gym.world.state.paused);
      await checkRails(page, 'gym', 0);
      assert.equal(await page.locator('.keyboard-guide').isVisible(), false, 'desktop keeps key reminders inside Commandes');
      const x = (await gymState(page)).x;
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(150); await page.keyboard.up('ArrowRight');
      assert.ok((await gymState(page)).x > x + 10);
      await page.keyboard.press('p');
      await checkMenu(page, '.gym-pause-panel');
      await page.keyboard.press('Escape');
      await page.goto(new URL('?scene=sparring', base).href);
      await wait(page, () => window.__sparring?.session.state.phase === 'ready');
      await page.locator('.primary-button').click();
      await wait(page, () => window.__sparring.session.state.phase === 'running');
      assert.equal(await page.locator('.control-button:visible').count(), 0);
      assert.equal(await page.locator('.pause-button').isVisible(), false);
      assert.equal(await page.locator('.audio-button').isVisible(), false);
      assert.equal(await page.locator('.keyboard-guide').isVisible(), false);
      await checkRails(page, 'sparring', 0);
      await page.keyboard.press('j');
      await wait(page, () => window.__sparring.session.state.stats.thrown === 1);
      await page.keyboard.press('p');
      await checkMenu(page, '.round-panel');
      const report = `Desktop ${viewport.width}×${viewport.height}: no control overlay or keyboard guide, movement/jab/pause remain usable by keyboard.`;
      reports.push(report); console.log(report);
      await page.close();
    }
  }
  assert.deepEqual(errors, [], 'no console, runtime or asset errors');
} catch (error) {
  failure = error.message;
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: path.join(captureDir, 'failure.png') }).catch(() => {});
    const state = await activePage.evaluate(() => ({ gym: window.__gym?.world.state, round: window.__sparring?.session.state })).catch(() => ({}));
    console.error('Failure state:', JSON.stringify(state));
  }
  throw error;
} finally {
  await fs.writeFile(path.join(captureDir, 'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), reports, errors, failure }, null, 2) + '\n');
  await browser.close();
}
