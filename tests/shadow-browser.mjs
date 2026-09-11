import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { joyPoint } from './control-helpers.mjs';

const require = createRequire(import.meta.url);
let modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) {
  try { modulePath = require.resolve('playwright'); }
  catch { modulePath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'); }
}
const { chromium } = await import(pathToFileURL(modulePath));
const browser = await chromium.launch({ headless: true });
const base = process.env.SHADOW_URL ?? 'http://127.0.0.1:5173/';
const direct = new URL('?scene=shadow', base).href;
const selectedCase = process.env.SHADOW_CASE;
const errors = [], reports = [], measurements = {};
let activePage, failure;
const wait = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout });
const state = page => page.evaluate(() => structuredClone(window.__shadow.session.state));
const gymState = page => page.evaluate(() => structuredClone(window.__gym.world.state));
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const report = message => { reports.push(message); console.log(message); };

function watch(page) {
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}

async function moveTo(page, axis, target) {
  const current = (await gymState(page))[axis];
  if (Math.abs(current - target) < 3) return;
  const sign = target > current ? 1 : -1;
  const key = axis === 'x' ? sign > 0 ? 'ArrowRight' : 'ArrowLeft' : sign > 0 ? 'ArrowDown' : 'ArrowUp';
  await page.keyboard.down(key);
  try { await wait(page, ({ axis, target, sign }) => (window.__gym.world.state[axis] - target) * sign >= 0, { axis, target, sign }); }
  finally { await page.keyboard.up(key); }
}

async function walkToMirror(page) {
  await wait(page, () => window.__gym?.world && !window.__gym.world.state.paused);
  for (const [axis, target] of [['x', 300], ['y', 309], ['x', 152], ['y', 245]]) await moveTo(page, axis, target);
  await wait(page, () => window.__gym.world.state.nearby?.id === 'miroir');
  return gymState(page);
}

async function enterFromGym(page, touch = false) {
  if (touch) await page.locator('.gym-interact-button').tap();
  else await page.keyboard.press('e');
  await page.locator('.gym-shadow-button')[touch ? 'tap' : 'click']();
  await wait(page, () => window.__shadow?.session.state.phase === 'ready');
  assert.equal(await page.evaluate(() => Boolean(window.__gym)), false, 'the gym shuts down when practice opens');
}

async function layout(page, touch) {
  await settle(page);
  const value = await page.evaluate(() => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const canvas = document.querySelector('#game canvas');
    return {
      logical: [canvas.width, canvas.height], canvas: rect(canvas), area: rect(document.getElementById('play-area')),
      controls: [...document.querySelectorAll('#shadow-ui .input-rail button, #shadow-ui .joypad')].filter(visible).map(button => ({ name: button.dataset.action ?? button.className, ...rect(button) })),
      guideVisible: Boolean(visible(document.querySelector('.keyboard-guide'))), width: innerWidth, height: innerHeight,
      noScroll: document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1,
      primaryFine: matchMedia('(pointer: fine) and (hover: hover)').matches,
      touchPoints: navigator.maxTouchPoints, touchLayout: document.documentElement.dataset.touch,
    };
  });
  assert.deepEqual(value.logical, [1280, 720]);
  assert.ok(Math.abs(value.canvas.width / value.canvas.height - 16 / 9) < .003, 'the logical frame keeps its proportions');
  assert.ok(value.canvas.x >= -1 && value.canvas.y >= -1 && value.canvas.right <= value.width + 1 && value.canvas.bottom <= value.height + 1 && value.noScroll, JSON.stringify(value));
  assert.equal(value.guideVisible, false, 'commands remain in the menu');
  if (touch) {
    assert.equal(value.controls.length, 4, 'joypad, A/B and pause are available');
    assert.equal(value.touchLayout, 'true');
    for (const button of value.controls) {
      assert.ok(button.right <= value.canvas.x + 1 || button.x >= value.canvas.right - 1, `${button.name} stays outside the canvas`);
      assert.ok(button.x >= -1 && button.y >= -1 && button.right <= value.width + 1 && button.bottom <= value.height + 1, `${button.name} fits the landscape screen`);
      assert.ok(button.width >= 44 && button.height >= 44, `${button.name} has a usable touch target`);
    }
  } else {
    assert.equal(value.controls.length, 0, 'desktop does not show touch controls, including PCs advertising touch capacity');
    assert.equal(value.touchLayout, 'false');
    assert.ok(Math.abs(value.area.width - value.canvas.width) <= 2, 'desktop does not reserve hidden side margins');
  }
  return value;
}

async function menuFits(page, selector) {
  const panel = page.locator(selector);
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${selector} fits the available viewport: ${JSON.stringify(box)}`);
  const buttons = panel.locator('button:visible');
  assert.ok(await buttons.count() > 0);
  // Long Commandes pages may scroll inside their bounded panel. Every action
  // must remain reachable without scrolling or enlarging the game document.
  for (const button of await buttons.all()) {
    await button.scrollIntoViewIfNeeded();
    const r = await button.boundingBox();
    assert.ok(r.x >= box.x - 1 && r.y >= box.y - 1 && r.x + r.width <= box.x + box.width + 1 && r.y + r.height <= box.y + box.height + 1, `menu action remains reachable: ${await button.textContent()}`);
  }
}

async function idle(page) {
  await wait(page, () => window.__shadow.session.state.player.action === 'idle');
}

async function strike(page, input, expected = input, touch = false) {
  await idle(page);
  const before = await state(page);
  if (touch) await page.locator(`#shadow-ui [data-action="${input}"]`).tap();
  else await page.keyboard.press(input === 'jab' ? 'j' : 'k');
  const committed = await state(page);
  assert.equal(committed.player.action, expected);
  assert.equal(committed.stats[expected], before.stats[expected], 'pressing a button cannot count the movement before extension');
  await wait(page, ({ expected, count }) => window.__shadow.session.state.stats[expected] === count + 1, { expected, count: before.stats[expected] });
  return state(page);
}

async function freezeNextHookCapture(page) {
  await page.evaluate(() => {
    window.__shadowHookCapture = false;
    const scene = window.__shadow.scene;
    const capture = () => {
      if (scene.fighter.pose !== 'hook' || scene.fighter.phase !== 'contact') return;
      scene.events.off('postupdate', capture);
      // Freeze rendering only after the real key-driven motion reaches its peak.
      // The model is neither fast-forwarded nor given an artificial action.
      scene.scene.pause();
      window.__shadowHookCapture = true;
    };
    scene.events.on('postupdate', capture);
  });
}

async function renderedMotions(page) {
  const value = await page.evaluate(() => ({
    motions: structuredClone(window.__shadow.motions),
    glass: { ...window.__shadow.scene.fighter.layout.glass },
    facing: [window.__shadow.scene.fighter.sprite.scaleX, window.__shadow.scene.fighter.reflection.scaleX],
  }));
  assert.ok(value.facing[0] > 0 && value.facing[1] < 0, 'the mirror reverses the actual boxer');
  assert.ok(value.motions.length >= 3);
  for (const motion of value.motions) {
    assert.equal(motion.texture, motion.reflectedTexture, 'both figures use the same authored pose on the scoring frame');
    assert.equal(motion.pose, motion.action, 'the movement is counted on its recognizable peak pose');
    if (['jab', 'cross', 'hook'].includes(motion.action)) assert.equal(motion.phase, 'contact');
    const r = motion.reflectedBounds, g = value.glass;
    assert.ok(r.left >= g.x - 1 && r.right <= g.x + g.width + 1 && r.top >= g.y - 1 && r.bottom <= g.y + g.height + 1, `the complete reflection stays inside the glass: ${JSON.stringify(motion)}`);
    const b = motion.bounds;
    assert.ok(b.left >= 0 && b.top >= 0 && b.right <= 1280 && b.bottom <= 720, 'the player remains fully in the fixed frame');
  }
  return value;
}

async function assertReleased(page) {
  assert.deepEqual(await page.evaluate(() => ({
    keys: window.__shadow.ui.controls.keys.size,
    pointers: window.__shadow.ui.controls.pointers.size,
    guard: Boolean(window.__shadow.ui.controls.guard),
  })), { keys: 0, pointers: 0, guard: false }, 'all input sources release together on interruption');
}

async function touchPoint(page, action, id = 1, offset = 0) {
  if (action === 'guard') return joyPoint(page, '#shadow-ui', 'up', id);
  const box = await page.locator(`#shadow-ui [data-action="${action}"]`).boundingBox();
  return { id, x: box.x + box.width / 2 + offset, y: box.y + box.height / 2 };
}

try {
  await fs.mkdir('docs', { recursive: true });
  if (!selectedCase || selectedCase === 'desktop') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: false });
    await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 10 }));
    const page = await context.newPage(); watch(page);
    await page.goto(base);
    const gymPosition = await walkToMirror(page);
    await enterFromGym(page);
    await page.locator('.shadow-start-button').click();
    await wait(page, () => window.__shadow.session.state.phase === 'running');
    const desktop = await layout(page, false);
    assert.ok(desktop.primaryFine && desktop.touchPoints === 10, 'reproduce the actual fine-pointer PC touch-capacity regression');
    measurements.desktopLayout = desktop;
    await page.keyboard.down('ArrowUp');
    await wait(page, () => window.__shadow.session.state.player.action === 'guard' && window.__shadow.scene.fighter.pose === 'block');
    await page.waitForTimeout(200);
    assert.ok((await state(page)).stats.guardSeconds > .1);
    assert.equal(await page.evaluate(() => window.__shadow.scene.fighter.sprite.texture.key === window.__shadow.scene.fighter.reflection.texture.key), true);
    await page.screenshot({ path: 'docs/miroir-garde.png' });
    await page.keyboard.up('ArrowUp');
    await strike(page, 'jab');
    await strike(page, 'cross');
    await idle(page);
    assert.equal((await state(page)).combo.ready, true);
    await freezeNextHookCapture(page);
    await strike(page, 'jab', 'hook');
    await wait(page, () => window.__shadowHookCapture);
    assert.equal((await state(page)).stats.combos, 1);
    await page.screenshot({ path: 'docs/miroir-crochet.png' });
    await page.evaluate(() => window.__shadow.scene.scene.resume());
    for (const [key, action] of [['a', 'dodgeLeft'], ['ArrowRight', 'dodgeRight']]) {
      await idle(page);
      await page.keyboard.press(key);
      await wait(page, action => window.__shadow.session.state.stats[action] === 1, action);
    }
    await idle(page);
    measurements.desktopMotions = await renderedMotions(page);
    report('Walked from the gym entrance to the mirror; real J–K–J produced jab, right cross and left hook at extension. High guard and both dodges used matching reflected poses inside the glass.');

    await page.keyboard.press('p');
    await wait(page, () => window.__shadow.session.state.phase === 'paused');
    const frozen = await state(page);
    await page.locator('#shadow-ui .commands-open-button').click();
    assert.equal(await page.locator('#shadow-ui .commands-panel').isVisible(), true);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    assert.deepEqual(await state(page), frozen);
    await page.keyboard.press('Escape');
    assert.equal((await state(page)).phase, 'paused', 'Escape first returns from commands, without resuming the session');
    await page.locator('#shadow-speed').selectOption('0.65');
    await page.locator('.shadow-start-button').click();
    await wait(page, () => window.__shadow.session.state.phase === 'running');
    const slowBefore = await state(page);
    await page.waitForTimeout(850);
    const slowAfter = await state(page);
    const realDelta = slowAfter.seconds - slowBefore.seconds;
    const motionDelta = slowAfter.elapsed - slowBefore.elapsed;
    assert.ok(realDelta > .4, 'active practice time advances during the browser wait');
    assert.ok(Math.abs(motionDelta / realDelta - .65) < .005, 'slow playback changes movements while the summary keeps real active time');
    measurements.slowMotion = { realDelta, motionDelta, ratio: motionDelta / realDelta };
    await strike(page, 'jab');
    await idle(page);
    await page.keyboard.down('j');
    await page.waitForTimeout(1500);
    await page.keyboard.up('j');
    assert.equal((await state(page)).stats.jab, 3, 'holding the keyboard key produces one movement only');
    await idle(page);
    await page.keyboard.down('ArrowUp');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(page, () => window.__shadow.session.state.phase === 'paused');
    await assertReleased(page);
    await page.keyboard.up('ArrowUp');
    const blurred = await state(page);
    await page.waitForTimeout(150);
    assert.deepEqual(await state(page), blurred);
    await page.locator('.shadow-start-button').click();
    await page.waitForTimeout(200);
    assert.equal((await state(page)).player.action, 'idle', 'resuming does not restore an old held guard');
    await page.keyboard.press('m');
    assert.equal(await page.locator('.shadow-audio-button').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('p');
    await page.locator('.shadow-finish-button').click();
    await wait(page, () => window.__shadow.session.state.phase === 'finished');
    const finished = await state(page);
    assert.equal(await page.locator('.shadow-results').isVisible(), true);
    assert.equal(Number(await page.locator('[data-shadow-stat="punches"]').textContent()), finished.stats.jab + finished.stats.cross + finished.stats.hook);
    assert.equal(Number(await page.locator('[data-shadow-stat="combos"]').textContent()), finished.stats.combos);
    assert.equal(Number(await page.locator('[data-shadow-stat="dodges"]').textContent()), 2);
    measurements.finished = finished;
    await page.screenshot({ path: 'docs/miroir-bilan.png' });
    await page.waitForTimeout(150);
    assert.deepEqual(await state(page), finished, 'the report freezes practice until an explicit new session');
    await page.locator('.shadow-start-button').click();
    await wait(page, () => window.__shadow.session.state.phase === 'running');
    assert.equal((await state(page)).stats.jab, 0);
    assert.equal((await state(page)).stats.combos, 0);
    assert.equal((await state(page)).speed, .65, 'new practice retains the chosen playback speed');
    await page.keyboard.press('p');
    await page.locator('.shadow-reset-button').click();
    await wait(page, () => window.__shadow.session.state.phase === 'running');
    await page.keyboard.press('p');
    await page.locator('.shadow-return-button').click();
    await wait(page, () => window.__gym?.world);
    const returned = await gymState(page);
    assert.deepEqual([returned.x, returned.y, returned.moving], [gymPosition.x, gymPosition.y, false]);
    assert.equal(await page.evaluate(() => Boolean(window.__shadow)), false);
    report('Desktop with primary fine pointer and maxTouchPoints=10 shows no commands. Pause/help, true 0.65 playback, held-key protection, focus release, mute, summary, both restart paths and exact gym return passed.');
    await context.close();
  }

  if (!selectedCase || selectedCase === 'mobile') {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const page = await context.newPage(); watch(page);
    const cdp = await context.newCDPSession(page);
    const dispatch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await page.goto(direct);
    await wait(page, () => window.__shadow?.session.state.phase === 'ready');
    await page.locator('.shadow-start-button').tap();
    await wait(page, () => window.__shadow.session.state.phase === 'running');
    await layout(page, true);
    const jab = await touchPoint(page, 'jab', 1);
    await dispatch('touchStart', [jab]);
    await page.waitForTimeout(1000);
    assert.equal((await state(page)).stats.jab, 1, 'a held finger never repeats a punch');
    await dispatch('touchCancel', []);
    await assertReleased(page);

    const guard = await touchPoint(page, 'guard', 2);
    await dispatch('touchStart', [guard]);
    await wait(page, () => window.__shadow.session.state.player.action === 'guard');
    const guardBefore = (await state(page)).stats.guardSeconds;
    await dispatch('touchStart', [guard, jab]);
    await wait(page, () => window.__shadow.session.state.stats.jab === 2);
    // CDP ends the listed contact; keep the guard finger on the glass.
    await dispatch('touchEnd', [jab]);
    assert.notEqual(await page.evaluate(() => window.__shadow.ui.controls.padId), null);
    assert.equal(await page.evaluate(() => window.__shadow.ui.controls.guard), 'head');
    await wait(page, () => window.__shadow.session.state.player.action === 'guard');
    await page.waitForTimeout(160);
    assert.ok((await state(page)).stats.guardSeconds > guardBefore);
    // A keyboard direction is a separate source from the one-thumb pad.
    await page.keyboard.down('ArrowUp');
    await dispatch('touchEnd', [guard]);
    assert.equal((await state(page)).player.action, 'guard');
    await page.keyboard.up('ArrowUp');
    await assertReleased(page);
    await idle(page);

    const beforeNative = await state(page);
    await page.locator('#shadow-ui [data-action="jab"]').focus();
    await page.keyboard.press('Enter');
    await wait(page, count => window.__shadow.session.state.stats.jab === count + 1, beforeNative.stats.jab);
    await idle(page);
    await page.locator('#shadow-ui [data-action="cross"]').focus();
    await page.keyboard.press('Space');
    await wait(page, count => window.__shadow.session.state.stats.cross === count + 1, beforeNative.stats.cross);
    await idle(page);
    await page.keyboard.down('ArrowUp');
    await wait(page, () => window.__shadow.session.state.player.action === 'guard');
    await page.keyboard.up('ArrowUp');
    await idle(page);
    await assertReleased(page);
    await strike(page, 'jab', 'jab', true);
    await strike(page, 'cross', 'cross', true);
    await idle(page);
    assert.equal(await page.locator('#shadow-ui [data-action="jab"] .control-key').textContent(), 'A');
    assert.equal(await page.locator('#shadow-ui [data-action="jab"] .control-label').textContent(), 'Crochet');
    await strike(page, 'jab', 'hook', true);
    assert.equal((await state(page)).stats.combos, 1, 'the same combo is playable with two ordinary attack buttons');
    for (const action of ['dodgeLeft', 'dodgeRight']) {
      await idle(page);
      await dispatch('touchStart', [await joyPoint(page, '#shadow-ui', action === 'dodgeLeft' ? 'left' : 'right')]);
      await dispatch('touchEnd', []);
      await wait(page, action => window.__shadow.session.state.stats[action] === 1, action);
    }
    await idle(page);
    await page.screenshot({ path: 'docs/miroir-mobile.png' });
    report('Simulated touch: held attacks do not repeat; guard and attack work together, pad and attack sources release independently, cancellation clears, native Enter/Space buttons work, and J–K–J is a real touch combo.');

    measurements.mobileLayouts = [];
    for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport);
      measurements.mobileLayouts.push(await layout(page, true));
      await page.locator('.shadow-pause-button').tap();
      await wait(page, () => window.__shadow.session.state.phase === 'paused');
      await menuFits(page, '.shadow-panel');
      await page.locator('#shadow-ui .commands-open-button').tap();
      await menuFits(page, '#shadow-ui .commands-panel');
      await page.locator('#shadow-ui .commands-back-button').tap();
      await page.locator('.shadow-start-button').tap();
      await wait(page, () => window.__shadow.session.state.phase === 'running');
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await settle(page);
    const beforeBlur = await touchPoint(page, 'guard', 4);
    await dispatch('touchStart', [beforeBlur]);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(page, () => window.__shadow.session.state.phase === 'paused');
    await assertReleased(page);
    await dispatch('touchEnd', []);
    await page.waitForTimeout(120);
    assert.equal((await state(page)).phase, 'paused', 'an old held finger cannot activate the new pause menu');
    await page.locator('.shadow-start-button').tap();

    const beforePortrait = await touchPoint(page, 'guard', 5);
    await dispatch('touchStart', [beforePortrait]);
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(page, () => window.__shadow.session.state.phase === 'paused');
    await assertReleased(page);
    await dispatch('touchEnd', []);
    assert.equal(await page.locator('#rotate-prompt').isVisible(), true);
    assert.equal(await page.locator('#stage').evaluate(element => element.inert), true);
    const portrait = await state(page);
    await page.keyboard.press('p');
    await page.waitForTimeout(200);
    assert.deepEqual(await state(page), portrait);
    await page.screenshot({ path: 'docs/miroir-portrait.png' });
    await page.setViewportSize({ width: 844, height: 390 });
    await settle(page);
    assert.equal((await state(page)).phase, 'paused', 'returning to landscape requires explicit resume');
    await page.locator('.shadow-start-button').tap();
    await assertReleased(page);

    const beforeDevice = await touchPoint(page, 'guard', 6);
    await dispatch('touchStart', [beforeDevice]);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await wait(page, () => document.documentElement.dataset.touch === 'false' && window.__shadow.session.state.phase === 'paused');
    await assertReleased(page);
    await layout(page, false);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await wait(page, () => document.documentElement.dataset.touch === 'true');
    assert.equal((await state(page)).phase, 'paused');
    await page.locator('.shadow-start-button').tap();
    await assertReleased(page);
    await layout(page, true);
    await page.locator('.shadow-pause-button').tap();
    await page.locator('.shadow-finish-button').tap();
    await wait(page, () => window.__shadow.session.state.phase === 'finished');
    await menuFits(page, '.shadow-panel');
    await page.locator('.shadow-start-button').tap();
    await wait(page, () => window.__shadow.session.state.phase === 'running');
    assert.equal((await state(page)).stats.jab, 0);
    report('Simulated 844×390, 667×375 and 568×320: full fixed frame, joypad and A/B outside the image, accessible pause/help menus. Focus, portrait and primary-pointer changes clear inputs and require explicit resume; touch summary/restart passed.');
    await context.close();
  }

  if (!selectedCase || selectedCase === 'transitions') {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const page = await context.newPage(); watch(page);
    await page.goto(base);
    const saved = await walkToMirror(page);
    const counts = () => page.evaluate(() => {
      const scene = window.__gym?.scene ?? window.__shadow.scene;
      return Object.fromEntries(['GymScene', 'ShadowScene'].map(key => {
        const events = scene.scene.get(key).events;
        return [key, { shutdown: events.listenerCount('shutdown'), destroy: events.listenerCount('destroy') }];
      }));
    });
    // Warm both scene lifecycles before comparing their stable listener counts.
    await enterFromGym(page, true);
    const shadowCounts = await counts();
    await page.locator('.shadow-return-button').tap();
    await wait(page, () => window.__gym?.world);
    const gymCounts = await counts();
    for (let visit = 0; visit < 8; visit++) {
      await enterFromGym(page, true);
      assert.deepEqual(await counts(), shadowCounts, 'each mirror entry has exactly the same lifecycle listeners');
      await page.locator('.shadow-start-button').tap();
      await wait(page, () => window.__shadow.session.state.phase === 'running');
      await strike(page, 'jab', 'jab', true);
      await idle(page);
      assert.equal((await state(page)).stats.jab, 1, 're-entry does not accumulate duplicate input handlers');
      await page.locator('.shadow-pause-button').tap();
      await page.locator('.shadow-return-button').tap();
      await wait(page, () => window.__gym?.world);
      const returned = await gymState(page);
      assert.deepEqual([returned.x, returned.y, returned.moving], [saved.x, saved.y, false]);
      assert.deepEqual(await counts(), gymCounts, 'shutdown removes its paired destroy handler');
      assert.equal(await page.evaluate(() => Boolean(window.__shadow)), false);
    }
    measurements.transitions = { trips: 9, gymCounts, shadowCounts, position: { x: saved.x, y: saved.y } };
    report('Nine gym/mirror visits through real keyboard walking and touch menus preserve the exact position, stable lifecycle listeners and one punch per press after each re-entry.');
    await context.close();
  }
  assert.deepEqual(errors, []);
  report('No browser, console or asset errors. Mobile checks are Chromium viewport/touch simulation, not a physical-phone test.');
} catch (error) {
  failure = String(error.stack ?? error);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: 'docs/miroir-failure.png' }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(`docs/shadow-${selectedCase ? `${selectedCase}-` : ''}browser-results.json`, `${JSON.stringify({ checkedAt: new Date().toISOString(), passed: !failure, case: selectedCase ?? 'all', reports, measurements, errors, failure }, null, 2)}\n`);
  await browser.close();
}
