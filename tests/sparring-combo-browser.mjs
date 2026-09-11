// Real keyboard/touch coverage for the two-button sparring combination.
// Uses the existing Vite server. Run browser suites sequentially, without HMR edits.
// SPARRING_COMBO_CASE=desktop|mobile|round selects one part; default runs all three.
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
const url = new URL('?scene=sparring', process.env.SPARRING_URL ?? 'http://127.0.0.1:5173/').href;
const selected = process.env.SPARRING_COMBO_CASE;
assert.ok(!selected || ['desktop', 'mobile', 'round'].includes(selected), 'unknown SPARRING_COMBO_CASE');
const errors = [], reports = [], contacts = [];
const state = page => page.evaluate(() => structuredClone(window.__sparring.session.state));
const wait = (page, predicate, arg, timeout = 9000) => page.waitForFunction(predicate, arg, { timeout });
const idle = page => wait(page, () => window.__sparring.session.state.player.action === 'idle');
const report = message => { reports.push(message); console.log(message); };

function watch(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}

async function enter(page, touch = false) {
  await page.goto(url);
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  await page.locator('#sparring-ui .primary-button')[touch ? 'tap' : 'click']();
  await wait(page, () => window.__sparring.session.state.phase === 'running');
}

async function restart(page, touch = false) {
  if ((await state(page)).phase === 'running') {
    if (touch) await page.locator('#sparring-ui .pause-button').tap();
    else await page.keyboard.press('p');
  }
  await wait(page, () => window.__sparring.session.state.phase === 'paused');
  await page.locator('#sparring-ui .secondary-button')[touch ? 'tap' : 'click']();
  await wait(page, () => window.__sparring.session.state.phase === 'running');
  const fresh = await state(page);
  assert.equal(fresh.stats.thrown, 0);
  assert.equal(fresh.stats.hooks, 0);
  assert.equal(fresh.stats.combos, 0);
  assert.equal(fresh.combo.step, 0);
  assert.equal(fresh.stamina, 100);
}

async function geometry(page, touch) {
  const fit = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const r = canvas.getBoundingClientRect();
    const buttons = [...document.querySelectorAll('#sparring-ui .input-rail button, #sparring-ui .joypad')]
      .filter(button => button.getClientRects().length && getComputedStyle(button).visibility !== 'hidden')
      .map(button => {
        const b = button.getBoundingClientRect();
        return { action: button.dataset.action ?? button.className,
          outside: b.right <= r.left + 1 || b.left >= r.right - 1,
          fits: b.x >= -1 && b.y >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1,
          width: b.width, height: b.height };
      });
    return { logical: [canvas.width, canvas.height], ratio: r.width / r.height,
      fits: r.x >= -1 && r.y >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      noScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
      buttons, mode: document.documentElement.dataset.touch,
      keyboardGuide: document.getElementById('game-commands').getClientRects().length };
  });
  assert.deepEqual(fit.logical, [1280, 720]);
  assert.ok(Math.abs(fit.ratio - 16 / 9) < .003 && fit.fits && fit.noScroll, JSON.stringify(fit));
  assert.equal(fit.keyboardGuide, 0, 'live key reminders remain hidden');
  assert.equal(fit.mode, String(touch));
  if (!touch) assert.equal(fit.buttons.length, 0, 'a desktop reporting touch capacity still has no live controls');
  else {
    assert.ok(fit.buttons.length === 4, 'two attacks, directional joypad and menu remain available');
    for (const button of fit.buttons) {
      assert.ok(button.outside && button.fits, `touch control remains in a side margin: ${JSON.stringify(button)}`);
      assert.ok(button.width >= 35 && button.height >= 35, 'usable touch targets');
    }
  }
  return fit;
}

async function keyPunch(page, key, action) {
  await idle(page);
  const before = await state(page);
  await page.keyboard.press(key);
  const accepted = await state(page);
  assert.equal(accepted.player.action, action, `${key} selects ${action}`);
  assert.equal(accepted.stats.thrown, before.stats.thrown + 1);
  assert.equal(accepted.stats.landed, before.stats.landed, 'keydown does not score contact');
  return accepted;
}

async function prefix(page) {
  await keyPunch(page, 'j', 'jab');
  await keyPunch(page, 'k', 'cross');
  await idle(page);
  const ready = await state(page);
  assert.equal(ready.combo.ready, true, 'jab then direct prepares the contextual left hook');
  assert.ok(ready.combo.remaining > 0 && ready.combo.remaining <= .5 + 1e-6);
  return ready;
}

async function captureHook(page, startIndex, screenshot) {
  // Observes a real scored impact. Pausing only the renderer preserves the actual
  // contact pose for inspection; no session actions, clocks or stats are changed.
  await wait(page, index => {
    const debug = window.__sparring;
    const impact = debug.impacts.slice(index).find(event => event.type.startsWith('player-') && event.attack === 'hook');
    if (impact && debug.scene.player.pose === 'hook') {
      debug.scene.scene.pause();
      return true;
    }
    return false;
  }, startIndex);
  try {
    const frozen = await page.evaluate(index => {
      const debug = window.__sparring;
      return { state: structuredClone(debug.session.state),
        impact: structuredClone(debug.impacts.slice(index).find(event => event.type.startsWith('player-') && event.attack === 'hook')),
        contact: debug.scene.player.contact(), target: { ...debug.scene.player.target } };
    }, startIndex);
    assert.equal(frozen.impact.type, 'player-hit');
    assert.equal(frozen.impact.playerTexture, 'player-hook');
    assert.equal(frozen.state.player.action, 'hook');
    assert.ok(frozen.state.player.progress >= frozen.state.player.impact,
      'the hook has reached contact when the touch is scored');
    for (const [contact, target] of [[frozen.impact.contactPoint, frozen.impact.targetPoint], [frozen.contact, frozen.target]]) {
      assert.ok(contact && target, 'contact snapshots include both glove and target');
      assert.ok(Math.hypot(contact.x - target.x, contact.y - target.y) <= 2,
        `authored hook glove meets the rendered target: ${JSON.stringify({ contact, target })}`);
    }
    assert.equal(frozen.state.stats.thrown, 3);
    assert.equal(frozen.state.stats.landed, 3);
    assert.equal(frozen.state.stats.hooks, 1);
    assert.equal(frozen.state.stats.combos, 1, 'all three actual touches complete one combination');
    assert.ok(Math.abs(frozen.state.stamina - 52) < 1,
      `three prompt punches spend about 48 stamina, got ${100 - frozen.state.stamina}`);
    contacts.push({ screenshot, impact: frozen.impact, stamina: frozen.state.stamina });
    if (screenshot) await page.screenshot({ path: screenshot });
  } finally { await page.evaluate(() => window.__sparring.scene.scene.resume()); }
}

async function checkAllPlayerContacts(page, startIndex) {
  const impacts = await page.evaluate(index => structuredClone(window.__sparring.impacts.slice(index)
    .filter(event => event.type.startsWith('player-'))), startIndex);
  assert.deepEqual(impacts.map(impact => impact.attack), ['jab', 'cross', 'hook']);
  for (const impact of impacts) {
    assert.equal(impact.playerTexture, `player-${impact.attack}`);
    assert.equal(impact.type, 'player-hit');
    assert.ok(Math.hypot(impact.contactPoint.x - impact.targetPoint.x, impact.contactPoint.y - impact.targetPoint.y) <= 2,
      `every counted punch has a matching glove contact: ${JSON.stringify(impact)}`);
  }
}

try {
  await fs.mkdir('docs', { recursive: true });
  if (!selected || selected === 'desktop') {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    watch(page);
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 10 }));
    await enter(page);
    await geometry(page, false);
    const startIndex = await page.evaluate(() => window.__sparring.impacts.length);
    await page.keyboard.down('j');
    await wait(page, () => window.__sparring.session.state.stats.landed === 1);
    await idle(page);
    await page.waitForTimeout(80);
    assert.equal((await state(page)).stats.thrown, 1, 'holding jab does not repeat');
    await page.keyboard.up('j');
    await keyPunch(page, 'k', 'cross');
    await idle(page);
    assert.equal((await state(page)).combo.ready, true);
    await page.keyboard.down('j');
    await captureHook(page, startIndex, 'docs/sparring-combo-crochet.png');
    await idle(page);
    await page.waitForTimeout(250);
    assert.equal((await state(page)).stats.thrown, 3, 'holding the contextual hook does not emit another jab');
    await page.keyboard.up('j');
    await checkAllPlayerContacts(page, startIndex);
    report('Desktop primary mouse + maxTouchPoints 10: no visible controls; real J–K–J gives three aligned contact poses, one left hook, one combination and about 48 stamina spent. Held keys do not repeat.');

    await restart(page);
    await keyPunch(page, 'k', 'cross');
    await keyPunch(page, 'j', 'jab');
    assert.equal((await state(page)).stats.hooks, 0);
    await restart(page);
    await prefix(page);
    await wait(page, () => !window.__sparring.session.state.combo.ready && window.__sparring.session.state.combo.step === 0);
    await keyPunch(page, 'j', 'jab');
    assert.equal((await state(page)).stats.hooks, 0);
    report('Wrong order K–J and an expired follow-up window both give an ordinary jab, never a free hook.');

    await restart(page);
    await prefix(page);
    await page.keyboard.press('p');
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    assert.equal((await state(page)).combo.step, 0);
    await page.locator('#sparring-ui .commands-open-button').click();
    assert.match(await page.locator('#sparring-ui .commands-panel').textContent(), /crochet/i);
    const paused = await state(page);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    assert.deepEqual(await state(page), paused, 'commands menu freezes combat');
    await page.locator('#sparring-ui .commands-back-button').click();
    await page.locator('#sparring-ui .primary-button').click();
    await keyPunch(page, 'j', 'jab');
    await restart(page);
    await page.keyboard.down('j');
    await idle(page);
    assert.equal((await state(page)).combo.step, 1);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    const blur = await page.evaluate(() => ({ state: structuredClone(window.__sparring.session.state),
      keys: window.__sparring.ui.controls.keys.size, pointers: window.__sparring.ui.controls.pointers.size, guard: Boolean(window.__sparring.ui.controls.guard) }));
    assert.equal(blur.state.combo.step, 0);
    assert.equal(blur.keys, 0); assert.equal(blur.pointers, 0); assert.equal(blur.guard, false);
    await page.keyboard.up('j');
    await page.locator('#sparring-ui .primary-button').click();
    await page.waitForTimeout(800);
    assert.equal((await state(page)).stats.thrown, 1, 'focus loss cannot leave a repeating punch');
    await geometry(page, false);
    report('Pause/Commands and focus loss clear pending combinations and held inputs; resume needs a fresh jab.');
    await page.close();
  }

  if (!selected || selected === 'mobile') {
    const mobile = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const page = await mobile.newPage(); watch(page);
    await page.goto(url);
    await wait(page, () => window.__sparring?.session.state.phase === 'ready');
    await geometry(page, true);
    const cdp = await mobile.newCDPSession(page);
    let nextTouchId = 1;
    const touchBoxes = {};
    const measureButtons = async () => {
      for (const action of ['jab', 'cross']) touchBoxes[action] = await page.locator(`#sparring-ui [data-action="${action}"]`).boundingBox();
    };
    await measureButtons();
    const down = async action => {
      const box = touchBoxes[action];
      assert.ok(box, `visible ${action} touch button`);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: nextTouchId++, x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    };
    const up = (cancel = false) => cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    const touchPunch = async (input, expected, hold = false) => {
      await idle(page);
      const before = await state(page);
      await down(input);
      const accepted = await state(page);
      assert.equal(accepted.player.action, expected);
      assert.equal(accepted.stats.thrown, before.stats.thrown + 1);
      assert.equal(accepted.stats.landed, before.stats.landed, 'touchstart does not score contact');
      if (!hold) await up();
    };
    // Prepare geometry and the touch driver before the round. A starts the
    // menu directly, without Playwright's delayed compatibility-click wait.
    await down('jab'); await up();
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    const startIndex = await page.evaluate(() => window.__sparring.impacts.length);
    await touchPunch('jab', 'jab');
    await touchPunch('cross', 'cross');
    await idle(page);
    assert.equal((await state(page)).combo.ready, true);
    assert.match(await page.locator('#sparring-ui [data-action="jab"] .control-label').textContent(), /crochet/i);
    await touchPunch('jab', 'hook', true);
    await captureHook(page, startIndex, 'docs/sparring-combo-mobile.png');
    await idle(page);
    await page.waitForTimeout(180);
    assert.equal((await state(page)).stats.thrown, 3, 'holding a touch cannot repeat the combination');
    await up(true);
    assert.equal(await page.evaluate(() => window.__sparring.ui.controls.pointers.size), 0);
    await checkAllPlayerContacts(page, startIndex);
    await page.setViewportSize({ width: 667, height: 375 });
    await geometry(page, true);
    await measureButtons();
    await restart(page, true);
    await touchPunch('jab', 'jab');
    await touchPunch('cross', 'cross', true);
    await idle(page);
    assert.equal((await state(page)).combo.ready, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    assert.equal((await state(page)).combo.step, 0);
    assert.equal(await page.evaluate(() => window.__sparring.ui.controls.pointers.size), 0);
    assert.equal(await page.locator('#rotate-prompt').isVisible(), true);
    assert.equal(await page.evaluate(() => document.getElementById('stage').inert), true);
    await up();
    const portrait = await state(page);
    await page.waitForTimeout(200);
    assert.deepEqual(await state(page), portrait, 'the old finger release cannot resume under the orientation prompt');
    await page.setViewportSize({ width: 667, height: 375 });
    assert.equal((await state(page)).phase, 'paused');
    await page.locator('#sparring-ui .commands-open-button').tap();
    assert.match(await page.locator('#sparring-ui .commands-panel').textContent(), /crochet/i);
    await page.locator('#sparring-ui .commands-back-button').tap();
    await page.locator('#sparring-ui .primary-button').tap();
    await page.waitForTimeout(700);
    assert.equal((await state(page)).stats.thrown, 2);
    await geometry(page, true);
    report('Simulated mobile 844×390 / 667×375: native CDP J–K–J contacts, contextual Crochet button, hold/cancel, side margins, portrait clearing and explicit resume passed. This is not a physical-phone test.');
    await mobile.close();
  }

  if (!selected || selected === 'round') {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); watch(page);
    await enter(page);
    const begun = Date.now();
    await prefix(page);
    await keyPunch(page, 'j', 'hook');
    await wait(page, () => window.__sparring.session.state.stats.combos === 1);
    report('Waiting for the real default 60-second round to finish, with a successful combination in its report…');
    await wait(page, () => window.__sparring.session.state.phase === 'finished', null, 75000);
    const finished = await state(page), wallSeconds = (Date.now() - begun) / 1000;
    assert.equal(finished.remaining, 0);
    assert.equal(finished.stats.hooks, 1);
    assert.equal(finished.stats.combos, 1);
    assert.ok(wallSeconds >= 58 && wallSeconds < 75, `real round duration: ${wallSeconds.toFixed(2)}s`);
    assert.equal(await page.locator('#sparring-ui .round-results').isVisible(), true);
    const resultText = await page.locator('#sparring-ui .round-results').textContent();
    assert.match(resultText, /crochet/i);
    assert.match(resultText, /combo|encha[iî]nement/i);
    await page.locator('#sparring-ui .primary-button').click();
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    const restarted = await state(page);
    for (const stat of ['landed', 'received', 'thrown', 'hooks', 'combos']) assert.equal(restarted.stats[stat], 0, `${stat} resets after the result screen`);
    assert.equal(restarted.combo.step, 0);
    assert.equal(restarted.stamina, 100);
    report(`Real ${wallSeconds.toFixed(1)}s round: hook/combination report and clean restart passed.`);
    await page.close();
  }

  assert.deepEqual(errors, [], 'no browser console/page/resource errors');
  report('No browser errors or failed resources.');
  const suffix = selected ? `-${selected}` : '';
  await fs.writeFile(`docs/sparring-combo-browser${suffix}.json`, JSON.stringify({ checkedAt: new Date().toISOString(), reports, contacts, errors }, null, 2) + '\n');
} finally { await browser.close(); }
