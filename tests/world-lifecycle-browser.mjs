import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, wait, buttonPoint, joyPoint, dispatch } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';

const url = process.env.SPARRING_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true });
const report = { url, tests: [], errors: [], failure: null };
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY);
const world = page => page.evaluate(() => (window.__exploration ?? window.__gym)?.world.state);
const sceneReady = (page, place) => wait(page, place => document.querySelector('#stage').dataset.scene === place
  && (place === 'gym' ? window.__gym?.world : window.__exploration?.scene.place === place), place);

function fixture(place = 'home') {
  const profile = new CareerProfile({ storage: null });
  profile.reward('rope', { hits: 30, accuracy: 90 });
  const result = profile.snapshot();
  result.daily = { day: 7, energy: 25, maxEnergy: 100 };
  result.location = place === 'gym' ? { scene: 'gym', x: 210, y: 585, facing: 'up' }
    : { scene: 'home', x: 944, y: 365, facing: 'down' };
  return result;
}

async function openContext(seed, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  await context.addInitScript(({ key, seed }) => {
    // A reload must keep the state that the game actually saved, not re-seed it.
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
  }, { key: CAREER_STORAGE_KEY, seed });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  return { context, page };
}

async function delayedCareerChoice(action) {
  const old = fixture(action === 'import' ? 'home' : 'gym');
  const { context, page } = await openContext(old);
  let release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const loading = new Promise(resolve => { requested = resolve; });
  const resource = old.location.scene === 'gym' ? '**/assets/backgrounds/gym-exploration.png' : '**/assets/world/home.png';
  await page.route(resource, async route => { requested(); await gate; await route.continue(); });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await loading;
    let expected = old;
    if (action === 'new') {
      await page.locator('.career-new').click();
      await page.locator('.career-confirm-button').click();
      expected = { ...new CareerProfile({ storage: null }).snapshot() };
    } else if (action === 'import') {
      expected = fixture('gym'); expected.daily = { day: 12, energy: 0, maxEnergy: 100 };
      await page.locator('.career-file').setInputFiles({ name: 'journee.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(expected)) });
      await page.locator('.career-confirm-button').click();
    }
    await page.locator('.career-continue').click();
    assert.equal(await page.locator('#career-menu').isHidden(), true, 'the menu closes without waiting for assets');
    assert.equal(await page.evaluate(() => Boolean(window.__gym || window.__exploration)), false, 'the choice was made before the initial scene finished loading');
    assert.deepEqual((await saved(page)).location, expected.location);
    await page.locator('#scene-loading').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#scene-loading progress').evaluate(element => element.value >= 0 && element.value < 1), 'a pending image produces honest loading progress');
    if (action === 'new') await page.screenshot({ path: 'docs/loading-desktop.png' });
    release();
    await sceneReady(page, expected.location.scene);
    await page.locator('#scene-loading').waitFor({ state: 'hidden' });
    await page.waitForTimeout(120);
    const result = await saved(page);
    assert.deepEqual(result.location, expected.location, 'the old loading scene cannot overwrite the selected resume point');
    assert.deepEqual(result.daily, expected.daily);
    assert.deepEqual(result.stats, expected.stats);
    assert.ok(Math.abs((await world(page)).x - expected.location.x) < 1);
    assert.ok(Math.abs((await world(page)).y - expected.location.y) < 1);
    // The successfully routed scene also remains controllable.
    const before = await world(page);
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(120); await page.keyboard.up('ArrowLeft');
    assert.ok((await world(page)).x < before.x, 'routing does not leave movement permanently blocked');
    report.tests.push({ case: `preload-${action}`, destination: expected.location.scene, preservedDay: result.daily.day, preservedEnergy: result.daily.energy });
  } finally { release(); await context.close(); }
}

async function interruptedNight(kind) {
  const mobile = kind === 'portrait', seed = fixture(); seed.daily.energy = 0;
  const { context, page } = await openContext(seed, mobile);
  try {
    const direct = new URL(url); direct.searchParams.set('scene', 'home');
    await page.goto(direct.href); await sceneReady(page, 'home');
    const cdp = mobile ? await context.newCDPSession(page) : null;
    const touchButton = async () => {
      await dispatch(cdp, 'touchStart', [await buttonPoint(page, '#gym-ui [data-pad-button="a"]')]);
      await dispatch(cdp, 'touchEnd');
    };
    if (mobile) {
      await touchButton();
      await dispatch(cdp, 'touchStart', [await joyPoint(page, '#gym-ui', 'down')]); await dispatch(cdp, 'touchEnd');
      await touchButton();
    } else {
      await page.keyboard.press('KeyE'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    }
    await wait(page, () => window.__exploration.scene.sleeping);
    assert.deepEqual((await saved(page)).daily, { day: 8, energy: 100, maxEnergy: 100 }, 'the confirmed night is saved before the visual transition ends');
    if (kind === 'reload') {
      await page.reload(); await sceneReady(page, 'home');
      assert.equal(await page.evaluate(() => window.__exploration.scene.sleeping), false);
    } else {
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 844 });
        await wait(page, () => window.__exploration.scene.sleepInterrupted);
        await page.setViewportSize({ width: 844, height: 390 });
        assert.equal(await page.evaluate(() => window.__exploration.scene.sleeping), true, 'the phone returned to landscape before the morning fade completed');
      } else {
        // Exercise the same window-blur handler as an OS focus loss, without
        // stealing focus from another developer's browser during this test.
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.keyboard.down('Enter');
      }
      await wait(page, () => !window.__exploration.scene.sleeping);
      await page.waitForTimeout(80);
      assert.equal((await world(page)).paused, true, 'morning keeps an interruption paused until explicit resume');
      assert.equal(await page.evaluate(() => document.hidden), false);
      assert.equal(await page.locator('.gym-pause-panel').isVisible(), true);
      if (mobile) await touchButton();
      else { await page.keyboard.up('Enter'); await page.keyboard.press('Enter'); }
      await wait(page, () => !window.__exploration.world.state.paused);
      assert.equal(await page.locator('#gym-dialog-title').textContent(), 'Jour 8');
    }
    const result = await saved(page);
    assert.deepEqual(result.daily, { day: 8, energy: 100, maxEnergy: 100 });
    assert.deepEqual(result.stats, seed.stats, 'sleep and interruption never grant a skill bonus');
    assert.equal(result.location.scene, 'home');
    report.tests.push({ case: `sleep-${kind}`, dayAdvancedOnce: true, trainedStatsPreserved: true, explicitResume: kind !== 'reload' });
  } finally { await context.close(); }
}

try {
  for (const choice of ['new', 'import', 'continue']) await delayedCareerChoice(choice);
  for (const interruption of ['blur', 'portrait', 'reload']) await interruptedNight(interruption);
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; throw error; }
finally {
  fs.writeFileSync('docs/world-lifecycle-browser-results.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
