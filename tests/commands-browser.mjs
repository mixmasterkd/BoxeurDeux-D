import assert from 'node:assert/strict';
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
const base = process.env.GYM_URL ?? 'http://127.0.0.1:5173/';
const wait = (page, predicate) => page.waitForFunction(predicate, undefined, { timeout: 10000 });

async function checkPanel(page) {
  const result = await page.locator('.commands-panel:visible').evaluate(panel => {
    const p = panel.getBoundingClientRect();
    const stage = document.getElementById('stage').getBoundingClientRect();
    const button = panel.querySelector('.commands-back-button').getBoundingClientRect();
    return { fits: p.top >= stage.top && p.bottom <= stage.bottom + 1 && p.left >= stage.left && p.right <= stage.right + 1,
      noScroll: panel.scrollHeight <= panel.clientHeight + 1,
      backVisible: button.bottom <= p.bottom && button.top >= p.top,
      pageFits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight };
  });
  assert.ok(Object.values(result).every(Boolean), JSON.stringify(result));
}

try {
  for (const options of [
    { viewport: { width: 1440, height: 1000 }, hasTouch: false },
    { viewport: { width: 568, height: 320 }, hasTouch: false },
    { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
    { viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: true },
    { viewport: { width: 568, height: 320 }, hasTouch: true, isMobile: true },
    { viewport: { width: 1024, height: 768 }, hasTouch: true },
  ]) {
    if (process.env.COMMANDS_CASE === 'desktop-small' && (options.hasTouch || options.viewport.width !== 568)) continue;
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const activate = selector => options.hasTouch ? page.locator(selector).tap() : page.locator(selector).click();
    await page.goto(base);
    await wait(page, () => window.__gym?.world && !window.__gym.world.state.paused);
    assert.equal(await page.locator('.gym-movement').isVisible(), options.hasTouch);
    assert.equal(await page.locator('.gym-interact-button').isVisible(), options.hasTouch);
    assert.equal(await page.locator('.gym-pause-button').isVisible(), options.hasTouch);
    if (!options.hasTouch) assert.equal(await page.locator('.keyboard-guide').isVisible(), true);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(120);
    if (options.hasTouch) await activate('.gym-pause-button');
    else await page.keyboard.press('p');
    await page.keyboard.up('ArrowRight');
    await wait(page, () => window.__gym.world.state.paused);
    const x = await page.evaluate(() => window.__gym.world.state.x);
    await activate('#gym-ui .commands-open-button');
    await checkPanel(page);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#gym-ui .commands-back-button').evaluate(e => e === document.activeElement), true);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.up('ArrowRight');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.locator('#gym-ui .commands-panel').isVisible(), true);
    assert.equal(await page.evaluate(() => window.__gym.world.state.x), x);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.gym-pause-panel').isVisible(), true);
    assert.equal(await page.evaluate(() => window.__gym.world.state.paused), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#gym-ui .commands-panel').isVisible(), true, 'return restores focus to Commandes');
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    assert.equal(await page.locator('.gym-pause-panel').isVisible(), true, 'held Enter cannot immediately reopen commands');
    await activate('.gym-resume-button');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__gym.world.state.x), x, 'resume does not revive movement');

    await page.goto(new URL('?scene=sparring', base).href);
    await wait(page, () => window.__sparring?.session.state.phase === 'ready');
    await activate('.primary-button');
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    assert.equal(await page.locator('.attack-dock').isVisible(), options.hasTouch);
    assert.equal(await page.locator('.defense-dock').isVisible(), options.hasTouch);
    assert.equal(await page.locator('.pause-button').isVisible(), options.hasTouch);
    if (options.hasTouch) await page.locator('[data-action="jab"]').tap();
    else await page.keyboard.press('j');
    await wait(page, () => window.__sparring.session.state.stats.thrown === 1);
    await page.keyboard.down('Space');
    if (options.hasTouch) await activate('.pause-button');
    else await page.keyboard.press('Escape');
    await page.keyboard.up('Space');
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    const remaining = await page.evaluate(() => window.__sparring.session.state.remaining);
    await activate('#sparring-ui .commands-open-button');
    await checkPanel(page);
    assert.equal(await page.locator('.fight-hud').evaluate(e => e.inert), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('#sparring-ui .commands-back-button').evaluate(e => e === document.activeElement), true);
    await page.keyboard.press('k');
    await page.waitForTimeout(200);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.locator('#sparring-ui .commands-panel').isVisible(), true);
    assert.equal(await page.evaluate(() => window.__sparring.session.state.remaining), remaining);
    assert.equal(await page.evaluate(() => window.__sparring.session.state.stats.thrown), 1);
    await page.screenshot({ path: `/tmp/boxeur-commandes-${options.viewport.width}.png` });
    await page.keyboard.press('p');
    assert.equal(await page.locator('.round-panel').isVisible(), true);
    assert.equal(await page.evaluate(() => window.__sparring.session.state.phase), 'paused');
    await activate('#sparring-ui .commands-open-button');
    await activate('#sparring-ui .commands-back-button');
    assert.equal(await page.evaluate(() => window.__sparring.session.state.phase), 'paused');
    await activate('.primary-button');
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    assert.equal(await page.evaluate(() => window.__sparring.ui.guardActive), false);
    console.log(`Commandes: ${options.viewport.width}×${options.viewport.height}, touch=${options.hasTouch}: visibility, pause, focus, input release, return and panel fitting passed.`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
