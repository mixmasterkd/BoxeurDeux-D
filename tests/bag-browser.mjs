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
const baseURL = process.env.BAG_URL ?? 'http://127.0.0.1:5173/';
const bagURL = new URL('?scene=bag', baseURL).href;
const controlsOnly = process.env.BAG_CASE === 'controls';
const errors = [], reports = [];
const state = page => page.evaluate(() => structuredClone(window.__bag.session.state));
const gymState = page => page.evaluate(() => structuredClone(window.__gym.world.state));
const wait = (page, predicate, arg, timeout = 12000) => page.waitForFunction(predicate, arg, { timeout });
const report = message => { reports.push(message); console.log(message); };

function watch(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}

async function observeAudio(page) {
  // Wrap native starts to observe scheduling; the real Web Audio graph is used.
  await page.addInitScript(() => {
    window.__bagAudioProbe = { contexts: [], starts: 0 };
    const NativeContext = window.AudioContext;
    if (!NativeContext) return;
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); window.__bagAudioProbe.contexts.push(this); }
    };
    for (const Type of [window.AudioBufferSourceNode, window.OscillatorNode]) {
      const start = Type.prototype.start;
      Type.prototype.start = function (...args) { window.__bagAudioProbe.starts++; return start.apply(this, args); };
    }
  });
}

async function moveTo(page, axis, target) {
  const current = (await gymState(page))[axis];
  if (Math.abs(current - target) < 3) return;
  const sign = target > current ? 1 : -1;
  const key = axis === 'x' ? sign > 0 ? 'ArrowRight' : 'ArrowLeft' : sign > 0 ? 'ArrowDown' : 'ArrowUp';
  await page.keyboard.down(key);
  try {
    await wait(page, ({ axis, target, sign }) => (window.__gym.world.state[axis] - target) * sign >= 0, { axis, target, sign });
  } finally { await page.keyboard.up(key); }
}

async function frameFits(page, { touch = false, root = '#bag-ui' } = {}) {
  const geometry = await page.evaluate(({ touch, root }) => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const controls = [...document.querySelectorAll(`${root} .input-rail button, ${root} .joypad`)]
      .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
      .map(element => {
        const r = element.getBoundingClientRect();
        return {
          action: element.dataset.action ?? element.dataset.direction ?? element.className,
          outside: r.right <= rect.left + 1 || r.left >= rect.right - 1,
          fits: r.x >= -1 && r.y >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
          width: r.width, height: r.height,
        };
      });
    return {
      logical: [canvas.width, canvas.height], ratio: rect.width / rect.height,
      fits: rect.x >= -1 && rect.y >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1,
      noScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
      controls, touch,
    };
  }, { touch, root });
  assert.deepEqual(geometry.logical, [1280, 720]);
  assert.ok(Math.abs(geometry.ratio - 16 / 9) < .003 && geometry.fits && geometry.noScroll, JSON.stringify(geometry));
  if (touch) {
    assert.equal(geometry.controls.length, 4, 'joypad, A, B and menu are available in the side margins');
    for (const control of geometry.controls) {
      assert.ok(control.outside && control.fits, `control must occupy a side margin, outside the action: ${JSON.stringify(control)}`);
      assert.ok(control.width >= 44 && control.height >= 44, 'touch targets remain usable at small landscape sizes');
    }
  } else {
    assert.equal(geometry.controls.length, 0, 'desktop controls do not cover the game');
  }
}

async function playStep(page, sequenceIndex, stepIndex, { wrong = false } = {}) {
  await wait(page, ({ sequenceIndex, stepIndex }) => {
    const current = window.__bag.session.state;
    return current.sequence.index === sequenceIndex && current.elapsed >= current.sequence.steps[stepIndex].inputAt;
  }, { sequenceIndex, stepIndex });
  const before = await state(page);
  const step = before.sequence.steps[stepIndex];
  assert.ok(before.elapsed - step.inputAt < .17, 'the test responds inside the announced beginner window');
  const input = wrong ? step.input === 'jab' ? 'cross' : 'jab' : step.input;
  await page.keyboard.press(input === 'jab' ? 'j' : 'k');
  const committed = await state(page);
  assert.equal(committed.stats.contacts, before.stats.contacts, 'keydown itself cannot count as contact');
  assert.equal(committed.player.action, !wrong && step.action === 'hook' ? 'hook' : input);
  await wait(page, contacts => window.__bag.session.state.stats.contacts > contacts, before.stats.contacts);
  const after = await state(page);
  assert.equal(after.stats.contacts, before.stats.contacts + 1);
  assert.equal(after.sequence.steps[stepIndex].status, wrong ? 'missed' : 'hit');
  if (wrong) assert.equal(after.stats.wrong, before.stats.wrong + 1);
  else assert.equal(after.stats.accurate, before.stats.accurate + 1);
  return after;
}

async function menuFits(page, selector) {
  const panel = page.locator(selector);
  const r = await panel.boundingBox(), viewport = page.viewportSize();
  assert.ok(r && r.x >= -1 && r.y >= -1 && r.x + r.width <= viewport.width + 1 && r.y + r.height <= viewport.height + 1);
  const buttons = await panel.locator('button:visible').all();
  assert.ok(buttons.length);
  for (const button of buttons) {
    await button.scrollIntoViewIfNeeded();
    const b = await button.boundingBox();
    assert.ok(b.y >= r.y - 1 && b.y + b.height <= r.y + r.height + 1 && b.x >= r.x - 1 && b.x + b.width <= r.x + r.width + 1, 'every menu action is reachable inside its scroll panel');
  }
}

try {
  await fs.mkdir('docs', { recursive: true });
  if (!controlsOnly) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    watch(page); await observeAudio(page);
    await page.goto(baseURL);
    await wait(page, () => window.__gym?.world && !window.__gym.world.state.paused);
    await frameFits(page, { root: '#gym-ui' });
    await moveTo(page, 'x', 310);
    await moveTo(page, 'y', 306);
    await moveTo(page, 'x', 260);
    await wait(page, () => window.__gym.world.state.nearby?.id === 'sac');
    const beforeBag = await gymState(page);
    await page.keyboard.press('e');
    await page.locator('.gym-bag-button').click();
    await wait(page, () => window.__bag?.session.state.phase === 'ready');
    assert.equal(await page.evaluate(() => Boolean(window.__gym)), false);
    assert.equal(await page.evaluate(() => window.__bagAudioProbe.contexts.length), 0);
    await frameFits(page);
    await page.screenshot({ path: 'docs/sac-accueil.png' });
    const beganAt = Date.now();
    await page.locator('.bag-start-button').click();
    await wait(page, () => window.__bag.session.state.phase === 'running');
    await wait(page, () => window.__bagAudioProbe.contexts.some(context => context.state === 'running'));
    await playStep(page, 0, 0, { wrong: true });
    for (const [index, count] of [[1, 2], [2, 2], [3, 3]]) {
      for (let step = 0; step < count; step++) {
        if (index === 3 && step === 2) {
          await wait(page, () => window.__bag.session.state.sequence.comboReady);
        }
        await playStep(page, index, step);
        if (index === 3 && step === 2) await page.screenshot({ path: 'docs/sac-crochet.png' });
      }
    }
    const firstPatterns = await state(page);
    assert.equal(firstPatterns.stats.contacts, 8);
    assert.equal(firstPatterns.stats.accurate, 7);
    assert.equal(firstPatterns.stats.combosCompleted, 3);
    assert.equal(firstPatterns.stats.combosMissed, 1);
    const recorded = await page.evaluate(() => structuredClone(window.__bag.impacts));
    assert.equal(recorded.length, 8, 'every actual impact is rendered once');
    for (const impact of recorded) {
      assert.equal(impact.pose, impact.attack, 'the scoring frame selects the authored contact pose');
      assert.ok(Math.hypot(impact.contactPoint.x - impact.targetPoint.x, impact.contactPoint.y - impact.targetPoint.y) <= 2,
        `the glove must meet the leather at every scoring contact: ${JSON.stringify(impact)}`);
    }
    const hook = recorded.find(impact => impact.attack === 'hook');
    assert.ok(hook, 'JKJ reaches the authored hook, through ordinary keyboard input');
    if (hook.player) {
      assert.equal(hook.player.action, 'hook');
      assert.ok(hook.player.progress + 1e-6 >= hook.player.impact);
      assert.ok(hook.player.elapsed <= hook.player.contact + hook.player.hold + .08, 'the contact snapshot is captured while the glove is extended');
    }
    if (hook.contactPoint && hook.targetPoint) {
      assert.ok(Math.hypot(hook.contactPoint.x - hook.targetPoint.x, hook.contactPoint.y - hook.targetPoint.y) <= 5,
        'the scoring hook visibly meets the bag target');
    }
    const point = await page.evaluate(() => window.__bag.scene.fighter.contactPoint);
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y) && point.x > 0 && point.x < 1280 && point.y > 0 && point.y < 720);
    report('Walked to the bag; wrong direct, double jab, jab–direct and JKJ hook scored only on real contacts.');

    await page.keyboard.press('p');
    await wait(page, () => window.__bag.session.state.phase === 'paused');
    const frozen = await state(page);
    await page.locator('#bag-ui .commands-open-button').click();
    assert.equal(await page.locator('#bag-ui .commands-panel').isVisible(), true);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(250);
    assert.deepEqual(await state(page), frozen);
    const pausedStarts = await page.evaluate(() => window.__bagAudioProbe.starts);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__bagAudioProbe.starts), pausedStarts);
    await page.locator('#bag-ui .commands-back-button').click();
    await page.locator('.bag-start-button').click();
    await wait(page, () => window.__bag.session.state.phase === 'running');
    await page.keyboard.down('j');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(page, () => window.__bag.session.state.phase === 'paused');
    await page.keyboard.up('j');
    const focusFrozen = await state(page);
    await page.waitForTimeout(200);
    assert.deepEqual(await state(page), focusFrozen);
    await page.locator('.bag-start-button').click();
    await page.waitForTimeout(700);
    const afterFocus = await state(page);
    assert.ok(afterFocus.stats.contacts <= focusFrozen.stats.contacts + 1, 'an already committed punch may finish, but a held key cannot repeat after focus loss');
    await page.keyboard.press('m');
    assert.equal(await page.locator('#bag-ui .audio-button').getAttribute('aria-pressed'), 'true');
    const silentStarts = await page.evaluate(() => window.__bagAudioProbe.starts);
    await page.keyboard.press('k');
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => window.__bagAudioProbe.starts), silentStarts);
    await wait(page, () => window.__bag.session.state.phase === 'finished', null, 50000);
    const finished = await state(page);
    assert.equal(finished.elapsed, 45);
    assert.equal(finished.remaining, 0);
    assert.ok(Date.now() - beganAt >= 44000, 'the complete lesson uses real elapsed time');
    assert.equal(await page.locator('.bag-results').isVisible(), true);
    assert.equal(finished.summary.contacts, finished.stats.contacts);
    assert.equal(finished.summary.combosCompleted, finished.stats.combosCompleted);
    for (const stat of ['contacts', 'accurate', 'combosCompleted']) {
      assert.ok((await page.locator(`[data-bag-stat="${stat}"]`).first().textContent()).includes(String(finished.stats[stat])));
    }
    await page.screenshot({ path: 'docs/sac-bilan.png' });
    report('Full 45-second lesson, pause/Commands, focus loss, mute and final contact/precision/combo report passed.');

    await page.locator('.bag-start-button').click();
    await wait(page, () => window.__bag.session.state.phase === 'running');
    assert.equal((await state(page)).stats.contacts, 0);
    assert.equal((await state(page)).sequence.index, 0);
    await page.keyboard.press('p');
    await page.locator('.bag-return-button').click();
    await wait(page, () => window.__gym?.world);
    const returned = await gymState(page);
    assert.equal(returned.x, beforeBag.x);
    assert.equal(returned.y, beforeBag.y);
    assert.equal(returned.moving, false);
    assert.equal(await page.evaluate(() => Boolean(window.__bag)), false);
    await page.goto(bagURL);
    await wait(page, () => window.__bag?.session.state.phase === 'ready');
    assert.equal(await page.locator('#bag-ui .audio-button').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => window.__bagAudioProbe.contexts.length), 0);
    await page.locator('.bag-start-button').click();
    await page.keyboard.press('j');
    await wait(page, () => window.__bag.session.state.stats.contacts === 1);
    assert.equal(await page.evaluate(() => window.__bagAudioProbe.contexts.length), 0, 'persisted mute does not require an audio context');
    await page.keyboard.press('p');
    await page.locator('.bag-restart-button').click();
    await wait(page, () => window.__bag.session.state.phase === 'running');
    assert.equal((await state(page)).stats.contacts, 0);
    report('Retry, pause-menu restart, muted reload and return to the same gym position passed.');
    await page.close();
  }

  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const phone = await context.newPage(); watch(phone);
  await phone.goto(bagURL);
  await wait(phone, () => window.__bag?.session.state.phase === 'ready');
  await phone.locator('.bag-start-button').tap();
  await frameFits(phone, { touch: true });
  const cdp = await context.newCDPSession(phone);
  const jabBox = await phone.locator('#bag-ui [data-action="jab"]').boundingBox();
  const finger = { id: 1, x: jabBox.x + jabBox.width / 2, y: jabBox.y + jabBox.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
  await phone.waitForTimeout(850);
  assert.equal((await state(phone)).stats.contacts, 1, 'holding an attack does not repeat');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await phone.locator('#bag-ui [data-action="cross"]').tap();
  await wait(phone, () => window.__bag.session.state.stats.contacts === 2);
  await phone.waitForTimeout(450);
  assert.equal((await state(phone)).stats.contacts, 2);
  // Two fingers on the same button share its visible held state. Releasing one
  // must preserve the second finger, without introducing automatic punches.
  const otherFinger = { ...finger, id: 2, x: finger.x + 12 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger, otherFinger] });
  assert.equal(await phone.evaluate(() => window.__bag.ui.controls.pointers.size), 2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [finger] });
  assert.equal(await phone.evaluate(() => window.__bag.ui.controls.pointers.size), 1);
  assert.equal(await phone.locator('#bag-ui [data-action="jab"]').evaluate(button => button.classList.contains('is-held')), true);
  await phone.waitForTimeout(750);
  assert.equal((await state(phone)).stats.contacts, 3);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await phone.evaluate(() => window.__bag.ui.controls.pointers.size), 0);
  assert.equal(await phone.locator('#bag-ui [data-action="jab"]').evaluate(button => button.classList.contains('is-held')), false);
  // A keyboard user can activate the native touch buttons too: Enter on Jab,
  // then Space on Direct, each generating the browser's ordinary detail=0 click.
  await phone.locator('#bag-ui [data-action="jab"]').focus();
  await phone.keyboard.press('Enter');
  await wait(phone, () => window.__bag.session.state.stats.contacts === 4);
  await wait(phone, () => window.__bag.session.state.player.action === 'idle');
  await phone.locator('#bag-ui [data-action="cross"]').focus();
  await phone.keyboard.press('Space');
  await wait(phone, () => window.__bag.session.state.stats.contacts === 5);
  await wait(phone, () => window.__bag.session.state.player.action === 'idle');
  assert.equal((await state(phone)).stats.contacts, 5);
  report('Two fingers on Jab retain held styling until the last release; native Enter/Space button activation produces one punch each.');
  await phone.screenshot({ path: 'docs/sac-mobile-paysage.png' });
  for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 568, height: 320 }]) {
    await phone.setViewportSize(viewport);
    await phone.waitForTimeout(120);
    await frameFits(phone, { touch: true });
    await phone.locator('.bag-pause-button').tap();
    await wait(phone, () => window.__bag.session.state.phase === 'paused');
    await menuFits(phone, '#bag-ui .bag-panel');
    await phone.locator('#bag-ui .commands-open-button').tap();
    await menuFits(phone, '#bag-ui .commands-panel');
    await phone.locator('#bag-ui .commands-back-button').tap();
    await phone.locator('.bag-start-button').tap();
    await wait(phone, () => window.__bag.session.state.phase === 'running');
  }
  await phone.setViewportSize({ width: 390, height: 844 });
  await wait(phone, () => window.__bag.session.state.phase === 'paused');
  assert.equal(await phone.locator('#rotate-prompt').isVisible(), true);
  assert.equal(await phone.evaluate(() => document.getElementById('stage').inert), true);
  const portrait = await state(phone);
  await phone.waitForTimeout(300);
  assert.deepEqual(await state(phone), portrait);
  await phone.screenshot({ path: 'docs/sac-mobile-portrait.png' });
  await phone.setViewportSize({ width: 844, height: 390 });
  await phone.locator('.bag-start-button').tap();
  await wait(phone, () => window.__bag.session.state.phase === 'running');
  await phone.waitForTimeout(600);
  assert.equal((await state(phone)).stats.contacts, portrait.stats.contacts);
  await phone.locator('.bag-pause-button').tap();
  await phone.locator('.bag-return-button').tap();
  await wait(phone, () => window.__gym?.world);
  await frameFits(phone, { touch: true, root: '#gym-ui' });
  report('Touch holds/cancel/new presses, landscape side margins at 844×390, 667×375 and 568×320, portrait pause and gym return passed (simulated phone).');
  await moveTo(phone, 'x', 310);
  await moveTo(phone, 'y', 306);
  await moveTo(phone, 'x', 260);
  await wait(phone, () => window.__gym.world.state.nearby?.id === 'sac');
  const savedPosition = await gymState(phone);
  const listenerCounts = page => page.evaluate(() => {
    const scene = window.__gym?.scene ?? window.__bag.scene;
    return Object.fromEntries(['GymScene', 'BagScene'].map(key => {
      const events = scene.scene.get(key).events;
      return [key, { destroy: events.listenerCount('destroy'), shutdown: events.listenerCount('shutdown') }];
    }));
  });
  const gymListeners = await listenerCounts(phone);
  let bagListeners;
  for (let visit = 0; visit < 10; visit++) {
    await phone.locator('.gym-interact-button').tap();
    await phone.locator('.gym-bag-button').tap();
    await wait(phone, () => window.__bag?.session.state.phase === 'ready');
    const activeBagListeners = await listenerCounts(phone);
    if (visit === 0) bagListeners = activeBagListeners;
    else assert.deepEqual(activeBagListeners, bagListeners, 'scene listeners must not accumulate on repeated entries');
    await phone.locator('.bag-return-button').tap();
    await wait(phone, () => window.__gym?.world);
    const position = await gymState(phone);
    assert.equal(position.x, savedPosition.x);
    assert.equal(position.y, savedPosition.y);
    assert.equal(position.moving, false);
    assert.deepEqual(await listenerCounts(phone), gymListeners, 'shutdown removes its paired destroy handler after every return');
  }
  report('Ten gym/bag round trips through real touch buttons preserve position and stable destroy/shutdown listener counts.');
  assert.deepEqual(errors, []);
  report('No browser, console or asset errors. Logical canvas remains 1280×720.');
} finally {
  await fs.writeFile(`docs/bag-${controlsOnly ? 'controls-' : ''}browser-results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), reports, errors }, null, 2) + '\n');
  await browser.close();
}
