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
const output = path.join(os.tmpdir(), 'boxeur-input-device');
await fs.mkdir(output, { recursive: true });
const errors = [], reports = [];
let activePage, failure;
const scenes = [
  { id: 'gym', entry: '', start: null, pause: '.gym-pause-button', resume: '.gym-resume-button', held: '[data-direction="right"]', buttonCount: 6 },
  { id: 'sparring', entry: '?scene=sparring', start: '.primary-button', pause: '.pause-button', resume: '.primary-button', held: '[data-action="guard"]', buttonCount: 7 },
  { id: 'bag', entry: '?scene=bag', start: '.bag-start-button', pause: '.bag-pause-button', resume: '.bag-start-button', held: '[data-action="jab"]', buttonCount: 4 },
];
const wait = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 15000 });
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const state = (page, scene) => page.evaluate(id => {
  if (id === 'gym') return structuredClone(window.__gym.world.state);
  return structuredClone(window[id === 'bag' ? '__bag' : '__sparring'].session.state);
}, scene.id);
const watch = page => {
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
};
const device = page => page.evaluate(() => ({
  fine: matchMedia('(pointer: fine)').matches,
  coarse: matchMedia('(pointer: coarse)').matches,
  hover: matchMedia('(hover: hover)').matches,
  noHover: matchMedia('(hover: none)').matches,
  maxTouchPoints: navigator.maxTouchPoints,
  layout: document.documentElement.dataset.touch,
}));

async function enter(page, scene, touch) {
  await page.goto(new URL(scene.entry, base).href);
  await wait(page, id => Boolean(window[id === 'gym' ? '__gym' : id === 'bag' ? '__bag' : '__sparring']), scene.id);
  if (scene.start) {
    if (touch) await page.locator(scene.start).tap();
    else await page.locator(scene.start).click();
    await wait(page, id => window[id === 'bag' ? '__bag' : '__sparring'].session.state.phase === 'running', scene.id);
  }
  await settle(page);
}

async function checkLayout(page, scene, touch) {
  await settle(page);
  const value = await page.evaluate(id => {
    const rectangle = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const canvas = document.querySelector('#game canvas');
    const root = document.getElementById(`${id}-ui`);
    const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    return {
      canvas: rectangle(canvas), logical: [canvas.width, canvas.height], area: rectangle(document.getElementById('play-area')),
      controls: [...root.querySelectorAll('.input-rail button')].filter(visible).map(element => ({ name: element.dataset.action ?? element.dataset.direction ?? element.className, ...rectangle(element) })),
      guideVisible: Boolean(visible(document.querySelector('.keyboard-guide'))),
      width: innerWidth, height: innerHeight,
      pageFits: document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1,
    };
  }, scene.id);
  assert.deepEqual(value.logical, [1280, 720]);
  assert.ok(Math.abs(value.canvas.width / value.canvas.height - 16 / 9) < .005, 'same 16:9 frame');
  assert.ok(value.canvas.x >= -1 && value.canvas.y >= -1 && value.canvas.right <= value.width + 1 && value.canvas.bottom <= value.height + 1 && value.pageFits, JSON.stringify(value));
  if (touch) {
    assert.equal(value.controls.length, scene.buttonCount, `${scene.id}: phone gets its playable buttons`);
    assert.ok(value.area.width - value.canvas.width >= 190, 'phone reserves side margins');
    for (const button of value.controls) {
      assert.ok(button.right <= value.canvas.x + 1 || button.x >= value.canvas.right - 1, `${scene.id}: ${button.name} outside canvas`);
      assert.ok(button.x >= -1 && button.y >= -1 && button.right <= value.width + 1 && button.bottom <= value.height + 1, `${scene.id}: ${button.name} inside viewport`);
    }
  } else {
    assert.equal(value.controls.length, 0, `${scene.id}: a mouse PC must not display touch controls, even with maxTouchPoints=10`);
    assert.equal(value.guideVisible, false, 'desktop keyboard help stays in the Commandes menu');
    assert.ok(Math.abs(value.area.width - value.canvas.width) <= 2, `desktop must not reserve hidden side rails: ${JSON.stringify(value)}`);
  }
}

async function heldPoint(page, scene) {
  const r = await page.locator(`#${scene.id}-ui ${scene.held}`).boundingBox();
  return { id: 1, x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

async function assertReleased(page, scene) {
  const value = await page.evaluate(id => {
    const ui = window[id === 'gym' ? '__gym' : id === 'bag' ? '__bag' : '__sparring'].ui;
    return { keys: ui.keys.size, pointers: ui.pointers.size, guard: ui.guardActive ?? false };
  }, scene.id);
  assert.deepEqual(value, { keys: 0, pointers: 0, guard: false }, `${scene.id}: no input stays held`);
}

try {
  if (!process.env.INPUT_CASE || process.env.INPUT_CASE === 'desktop') {
    // Keep Chromium's actual mouse/fine media features. Only reproduce the
    // capability advertised by the user's desktop touchscreen/driver.
    const context = await browser.newContext({ viewport: { width: 935, height: 695 }, hasTouch: false, isMobile: false });
    await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 10 }));
    const page = await context.newPage(); watch(page);
    for (const scene of scenes) {
      await page.setViewportSize({ width: 935, height: 695 });
      await enter(page, scene, false);
      const input = await device(page);
      assert.ok(input.fine && input.hover && !input.coarse && !input.noHover && input.maxTouchPoints === 10, `real desktop media must remain fine: ${JSON.stringify(input)}`);
      await checkLayout(page, scene, false);
      assert.equal(input.layout, 'false');
      await page.screenshot({ path: path.join(output, `desktop-${scene.id}-935.png`) });
      // A touch-looking event does not change the primary pointing device.
      await page.evaluate(() => {
        window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 77 }));
        window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 77 }));
      });
      await checkLayout(page, scene, false);
      await page.setViewportSize({ width: 600, height: 850 });
      await settle(page);
      assert.equal(await page.locator('#rotate-prompt').isVisible(), false, 'a narrow portrait desktop window is still playable');
      assert.equal(await page.locator('#stage').evaluate(element => element.inert), false);
      const before = await state(page, scene);
      if (scene.id === 'gym') {
        assert.equal(before.paused, false);
        await page.keyboard.down('ArrowRight'); await page.waitForTimeout(180); await page.keyboard.up('ArrowRight');
        assert.ok((await state(page, scene)).x > before.x + 10);
      } else {
        assert.equal(before.phase, 'running');
        await page.keyboard.press('j');
        await wait(page, id => window[id === 'bag' ? '__bag' : '__sparring'].session.state.stats[id === 'bag' ? 'contacts' : 'thrown'] > 0, scene.id);
      }
      await checkLayout(page, scene, false);
      await page.keyboard.press('p');
      await page.locator(`#${scene.id}-ui .commands-open-button`).click();
      assert.equal(await page.locator(`#${scene.id}-ui .commands-panel`).isVisible(), true);
      await page.keyboard.press('Escape');
      const paused = await state(page, scene);
      assert.equal(scene.id === 'gym' ? paused.paused : paused.phase === 'paused', true);
      await page.screenshot({ path: path.join(output, `desktop-${scene.id}-portrait.png`) });
      const message = `Desktop ${scene.id}: real fine/hover pointer with maxTouchPoints=10, no rails/guide, full frame, narrow portrait play and pause/Commands passed.`;
      reports.push(message); console.log(message);
    }
    await context.close();
  }

  if (!process.env.INPUT_CASE || process.env.INPUT_CASE === 'phone') {
    for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
      const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
      const page = await context.newPage(); watch(page);
      const cdp = await context.newCDPSession(page);
      for (const scene of scenes) {
        await page.setViewportSize(viewport);
        await enter(page, scene, true);
        const input = await device(page);
        assert.ok(input.coarse && input.noHover && !input.fine && input.layout === 'true', JSON.stringify(input));
        await checkLayout(page, scene, true);
        const point = await heldPoint(page, scene);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await page.waitForTimeout(120);
        await page.setViewportSize({ width: 390, height: 844 });
        await wait(page, id => id === 'gym' ? window.__gym.world.state.paused : window[id === 'bag' ? '__bag' : '__sparring'].session.state.phase === 'paused', scene.id);
        await assertReleased(page, scene);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.equal(await page.locator('#rotate-prompt').isVisible(), true);
        assert.equal(await page.locator('#stage').evaluate(element => element.inert), true);
        const frozen = await state(page, scene);
        await page.keyboard.press('p'); await page.waitForTimeout(160);
        assert.deepEqual(await state(page, scene), frozen, 'phone portrait blocks input and freezes play');
        await page.setViewportSize(viewport);
        await settle(page);
        assert.equal(await page.locator('#rotate-prompt').isVisible(), false);
        const portraitEnded = await state(page, scene);
        assert.equal(scene.id === 'gym' ? portraitEnded.paused : portraitEnded.phase === 'paused', true, 'landscape does not auto-resume');
        await page.locator(scene.resume).tap();
        await assertReleased(page, scene);
        await checkLayout(page, scene, true);

        // Change Chromium's actual primary pointer media features at runtime,
        // without replacing matchMedia or mutating any application state.
        if (viewport.width === 844) {
          const held = await heldPoint(page, scene);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [held] });
          await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
          // With a mobile context Chromium reports pointer:none when touch
          // emulation is disabled; the primary device is no longer coarse.
          await wait(page, () => !matchMedia('(pointer: coarse)').matches && document.documentElement.dataset.touch === 'false');
          await assertReleased(page, scene);
          await checkLayout(page, scene, false);
          await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
          await wait(page, () => matchMedia('(pointer: coarse) and (hover: none)').matches && document.documentElement.dataset.touch === 'true');
          const restored = await state(page, scene);
          if (scene.id === 'gym' ? restored.paused : restored.phase === 'paused') await page.locator(scene.resume).tap();
          await assertReleased(page, scene);
          await checkLayout(page, scene, true);
        }
        await page.screenshot({ path: path.join(output, `phone-${scene.id}-${viewport.width}.png`) });
        const message = `Phone ${viewport.width}×${viewport.height} ${scene.id}: outside rails, portrait freeze/release, explicit landscape resume${viewport.width === 844 ? ' and actual primary-pointer changes' : ''} passed.`;
        reports.push(message); console.log(message);
      }
      await context.close();
    }
  }
  assert.deepEqual(errors, [], 'no runtime, console or asset errors');
} catch (error) {
  failure = error.message;
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    console.error('Device at failure:', await device(activePage).catch(() => ({})));
  }
  throw error;
} finally {
  await fs.writeFile(path.join(output, `results-${process.env.INPUT_CASE ?? 'all'}.json`), JSON.stringify({ checkedAt: new Date().toISOString(), reports, errors, failure }, null, 2) + '\n');
  await browser.close();
}
