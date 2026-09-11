// Exercise the production build through its public UI, without development hooks.
// Default: intercept HTTP requests with dist/ under a Pages-like subdirectory.
// SPARRING_URL: test an actual deployed site instead (no interception).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
const remote = process.env.SPARRING_URL;
const base = remote ?? 'http://127.0.0.1:5173/BoxeurDeux-D/';
assert.ok(base.endsWith('/'), 'SPARRING_URL must end with /');
const dist = path.resolve('dist');
const browser = await chromium.launch({ headless: true });
const errors = [];
const loaded = new Set();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

try {
  for (const entry of ['', 'index.html']) {
    const mobile = entry === 'index.html';
    const page = await browser.newPage({
      viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    // A mouse computer can report touch capacity; that must not enable phone rails.
    if (!mobile) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 10, configurable: true }));
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      else if (response.url().startsWith(base)) {
        loaded.add(new URL(response.url()).pathname.slice(new URL(base).pathname.length) || 'index.html');
      }
    });
    if (!remote) {
      await page.route('**/*', async route => {
        const url = route.request().url();
        if (!url.startsWith(base)) {
          errors.push(`Resource outside the site directory: ${url}`);
          await route.abort();
          return;
        }
        const relative = new URL(url).pathname.slice(new URL(base).pathname.length) || 'index.html';
        const file = path.resolve(dist, relative);
        assert.ok(file.startsWith(`${dist}${path.sep}`));
        try {
          const body = await readFile(file);
          loaded.add(relative);
          await route.fulfill({ status: 200, body, contentType: mime[path.extname(file)] ?? 'application/octet-stream' });
        } catch {
          await route.fulfill({ status: 404, body: 'Not found' });
        }
      });
    }
    await page.goto(`${base}${entry}`);
    await page.locator('#gym-ui').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.__sparring), undefined, 'production does not expose development hooks');
    assert.equal(await page.evaluate(() => window.__gym), undefined, 'production does not expose gym development hooks');
    const press = async selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
    assert.equal(await page.locator('[data-direction="up"]').isVisible(), mobile, 'movement buttons are reserved for touch devices');
    if (mobile) await press('.gym-pause-button');
    else await page.keyboard.press('p');
    await press('#gym-ui .commands-open-button');
    await page.locator('#gym-ui .commands-panel').waitFor({ state: 'visible' });
    if (mobile) await press('#gym-ui .commands-back-button');
    else await page.keyboard.press('Escape');
    await page.locator('.gym-pause-panel').waitFor({ state: 'visible' });
    await press('.gym-resume-button');
    await page.waitForFunction(() => document.querySelector('#gym-ui').dataset.mode === 'walking');
    if (mobile) {
      const cdp = await page.context().newCDPSession(page);
      for (const [direction, duration] of [['right', 1390], ['up', 420]]) {
        const b = await page.locator(`[data-direction="${direction}"]`).boundingBox();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }] });
        await page.waitForTimeout(duration);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
    } else {
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1390); await page.keyboard.up('ArrowRight');
      await page.keyboard.down('ArrowUp'); await page.waitForTimeout(420); await page.keyboard.up('ArrowUp');
    }
    if (mobile) await press('.gym-interact-button');
    else await page.keyboard.press('e');
    await press('.gym-session-button[data-lesson="free"]');
    await press('.primary-button');
    if (!mobile) assert.equal(await page.locator('.input-rail button:visible').count(), 0);
    if (mobile) await press('[data-action="jab"]');
    else await page.keyboard.press('j');
    await page.waitForFunction(() => document.querySelector('[data-value="landed"]')?.textContent === '1');
    await page.waitForTimeout(300); // Let the first jab return before the next deliberate press.
    if (mobile) await press('[data-action="cross"]');
    else await page.keyboard.press('k');
    await page.waitForFunction(() => document.querySelector('#sparring-ui [data-action="jab"]')?.classList.contains('is-combo-ready'));
    if (mobile) await press('[data-action="jab"]');
    else await page.keyboard.press('j');
    await page.waitForFunction(() => document.querySelector('[data-value="landed"]')?.textContent === '3');
    assert.match(await page.locator('.fight-feedback').textContent(), /Combo réussi/);
    if (mobile) await press('.pause-button');
    else await page.keyboard.press('p');
    await page.waitForFunction(() => document.querySelector('.primary-button')?.textContent.includes('Reprendre'));
    const time = await page.locator('.round-time').textContent();
    await press('#sparring-ui .commands-open-button');
    await page.locator('#sparring-ui .commands-panel').waitFor({ state: 'visible' });
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.round-time').textContent(), time, 'pause freezes the timer');
    await press('#sparring-ui .commands-back-button');
    assert.ok((await page.locator('.primary-button').textContent()).includes('Reprendre'), 'closing help keeps the round paused');
    await press('.secondary-button');
    await page.waitForFunction(() => document.querySelector('[data-value="landed"]')?.textContent === '0');
    if (mobile) await press('.pause-button');
    else await page.keyboard.press('p');
    await press('.choose-session-button');
    await page.locator('[name="lesson"]').selectOption('jab');
    await press('.primary-button');
    if (!mobile) assert.equal(await page.locator('.input-rail button:visible').count(), 0);
    if (mobile) await press('[data-action="jab"]');
    else await page.keyboard.press('j');
    await page.waitForFunction(() => document.querySelector('[data-value="training-progress"]')?.textContent === '1 / 3');
    if (mobile) await press('.audio-button');
    else await page.keyboard.press('m');
    assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'), 'true', 'mute works in the compiled game');
    if (mobile) await press('.pause-button');
    else await page.keyboard.press('p');
    await press('.return-gym-button');
    await page.locator('#gym-ui').waitFor({ state: 'visible' });
    await page.goto(`${base}?scene=bag`);
    await page.locator('#bag-ui').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.__bag), undefined, 'production does not expose bag development hooks');
    await press('.bag-start-button');
    if (!mobile) assert.equal(await page.locator('.input-rail button:visible').count(), 0);
    if (mobile) await press('#bag-ui [data-action="jab"]');
    else await page.keyboard.press('j');
    await page.waitForFunction(() => document.querySelector('[data-bag-stat="contacts"]')?.textContent === '1');
    if (mobile) await press('.bag-pause-button');
    else await page.keyboard.press('p');
    await page.waitForFunction(() => document.querySelector('#bag-ui').dataset.phase === 'paused');
    const bagTime = await page.locator('.bag-clock').textContent();
    await press('#bag-ui .commands-open-button');
    await page.locator('#bag-ui .commands-panel').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.bag-clock').textContent(), bagTime);
    await press('#bag-ui .commands-back-button');
    await press('.bag-restart-button');
    await page.waitForFunction(() => document.querySelector('[data-bag-stat="contacts"]')?.textContent === '0');
    if (mobile) await press('.bag-pause-button');
    else await page.keyboard.press('p');
    await press('.bag-return-button');
    await page.locator('#gym-ui').waitFor({ state: 'visible' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), 'no scrolling');
    if (mobile) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#rotate-prompt').waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.getElementById('stage').inert);
    }
    await page.close();
  }
  {
    assert.ok(loaded.has('assets/backgrounds/gym.png'));
    assert.ok(loaded.has('assets/backgrounds/bag-training.png'));
    assert.ok(loaded.has('assets/sprites/bag-orthodox/player-hook.png'));
    assert.ok(loaded.has('assets/backgrounds/gym-exploration.png'));
    assert.equal([...loaded].filter(name => name.startsWith('assets/sprites/exploration/player-') && name.endsWith('.png')).length, 12);
    assert.equal([...loaded].filter(name => name.startsWith('assets/sprites/sparring-v2/') && name.endsWith('.png')).length, 20);
    for (const pose of ['hook', 'hook-windup', 'hook-recover']) {
      assert.ok(loaded.has(`assets/sprites/sparring-hook/player-${pose}.png`), `new left hook pose ${pose} loads from the site directory`);
    }
  }
  assert.deepEqual(errors, []);
  console.log(`${remote ? 'Deployed site' : 'Local production build with intercepted HTTP'}: gym at directory index + index.html, keyboard + touch walk to Rémi, Commandes help in both pauses, sparring J–K–J combo, restart, guided jab, mute, return to gym, bag contact/help/restart/return, landscape and portrait passed. No browser or resource errors.`);
} finally {
  await browser.close();
}
