// Exercise the production build through its public UI, without development hooks.
// Default: intercept HTTP requests with dist/ under a Pages-like subdirectory.
// SPARRING_URL: test an actual deployed site instead (no interception).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
const remote = process.env.SPARRING_URL;
const base = remote ?? 'http://127.0.0.1:5173/BoxeurDeux-D/';
assert.ok(base.endsWith('/'), 'SPARRING_URL must end with /');
const dist = path.resolve('dist');
const browser = await chromium.launch({ headless: true });
const errors = [];
const loaded = new Set();
let currentPage;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

try {
  for (const entry of ['', 'index.html']) {
    const mobile = entry === 'index.html';
    console.log(`Production UI: ${mobile ? 'touch' : 'desktop'} entry ${entry || '/'}`);
    const page = await browser.newPage({
      viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    currentPage = page;
    // Public image loading can outlast a local 30-second UI wait. Explicit
    // punch/combo/recovery timing limits below remain unchanged.
    if (remote) page.setDefaultTimeout(90000);
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
    await page.waitForFunction(() => document.getElementById('stage')?.dataset.scene === 'home');
    if (remote) await page.screenshot({ path: `docs/home-public-${mobile ? 'mobile' : 'desktop'}.png` });
    assert.equal(await page.evaluate(() => window.__exploration), undefined, 'production does not expose world development hooks');
    assert.equal(await page.evaluate(() => window.__sparring), undefined, 'production does not expose development hooks');
    assert.equal(await page.evaluate(() => window.__gym), undefined, 'production does not expose gym development hooks');
    const press = async selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
    const touch = mobile ? await page.context().newCDPSession(page) : null;
    const punchBoxes = {};
    const punch = async action => {
      if (!mobile) return page.keyboard.press(action === 'jab' ? 'j' : 'k');
      const r = punchBoxes[action];
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: r.x + r.width / 2, y: r.y + r.height / 2 }] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const walkUntil = async (direction, label, timeout = 7000) => {
      const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[direction];
      if (mobile) await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await joyPoint(page, '#gym-ui', direction)] });
      else await page.keyboard.down(key);
      try { await page.waitForFunction(label => document.querySelector('.gym-nearby-label')?.textContent === label, label, { timeout }); }
      finally {
        if (mobile) await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        else await page.keyboard.up(key);
      }
    };
    const interact = async () => mobile ? press('#gym-ui [data-pad-button="a"]') : page.keyboard.press('e');
    const walkFor = async (direction, duration) => {
      const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[direction];
      if (mobile) await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await joyPoint(page, '#gym-ui', direction)] });
      else await page.keyboard.down(key);
      await page.waitForTimeout(duration);
      if (mobile) await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.keyboard.up(key);
    };
    await walkUntil('down', 'Sortir dans le quartier');
    await interact();
    await page.waitForFunction(() => document.getElementById('stage')?.dataset.scene === 'neighborhood');
    await walkUntil('right', 'Le gym du quartier');
    if (remote) await page.screenshot({ path: `docs/neighborhood-public-${mobile ? 'mobile' : 'desktop'}.png` });
    await interact();
    await page.waitForFunction(() => document.getElementById('stage')?.dataset.scene === 'gym');
    assert.equal(await page.locator('.gym-energy').textContent(), 'Énergie 100/100', 'walking between home, neighborhood and gym is free');
    console.log(`Production world: ${mobile ? 'touch' : 'desktop'} fresh home, real exit, scrolling neighborhood walk and gym door passed`);
    assert.equal(await page.locator('#gym-ui .joypad').isVisible(), mobile, 'the joypad is reserved for touch devices');
    if (mobile) await press('.gym-pause-button');
    else await page.keyboard.press('p');
    await press('#gym-ui .commands-open-button');
    await page.locator('#gym-ui .commands-panel').waitFor({ state: 'visible' });
    if (mobile) await press('#gym-ui .commands-panel .commands-back-button');
    else await page.keyboard.press('Escape');
    await page.locator('.gym-pause-panel').waitFor({ state: 'visible' });
    await press('.gym-resume-button');
    await page.waitForFunction(() => document.querySelector('#gym-ui').dataset.mode === 'walking');
    if (mobile) {
      const cdp = await page.context().newCDPSession(page);
      for (const [direction, duration] of [['right', 1470], ['up', 445]]) {
        const point = await joyPoint(page, '#gym-ui', direction);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
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
    await page.locator('#sparring-ui').waitFor({ state: 'visible' });
    // Measure controls before starting: geometry protocol round trips and the
    // emulated compatibility click must not consume the first opening.
    if (mobile) {
      for (const action of ['jab', 'cross']) punchBoxes[action] = await page.locator(`#sparring-ui [data-action="${action}"]`).boundingBox();
      await punch('jab'); // A confirms the ready menu.
    } else await press('.primary-button');
    if (!mobile) assert.equal(await page.locator('.input-rail button:visible').count(), 0);
    await punch('jab');
    await page.waitForFunction(() => document.querySelector('[data-value="landed"]')?.textContent === '1');
    await page.waitForTimeout(260); // Remaining jab recovery after its observed contact.
    await punch('cross');
    await page.waitForFunction(() => document.querySelector('#sparring-ui [data-action="jab"]')?.classList.contains('is-combo-ready'));
    await punch('jab');
    await page.waitForFunction(() => document.querySelector('[data-value="landed"]')?.textContent === '3', null, { timeout: 4000 }).catch(async error => {
      console.error({ mobile, feedback: await page.locator('.fight-feedback').textContent(), time: await page.locator('.round-time').textContent(), landed: await page.locator('[data-value=landed]').textContent() });
      await page.screenshot({ path: '/tmp/boxeur-static-failure.png' });
      throw error;
    });
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
    if (mobile) await press('.pause-button');
    else await page.keyboard.press('p');
    if (mobile) await press('.audio-button');
    else await page.keyboard.press('m');
    assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'), 'true', 'mute works in the compiled game');
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
    await page.goto(`${base}?scene=shadow`);
    await page.locator('#shadow-ui').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.__shadow), undefined, 'production does not expose mirror development hooks');
    await press('.shadow-start-button');
    if (!mobile) assert.equal(await page.locator('.input-rail button:visible').count(), 0);
    if (mobile) await press('#shadow-ui [data-action="jab"]');
    else await page.keyboard.press('j');
    await page.waitForFunction(() => document.querySelector('.shadow-movement')?.textContent === 'Jab gauche');
    await page.waitForFunction(() => document.querySelector('.shadow-movement')?.textContent === 'En garde, à votre rythme');
    if (mobile) await press('#shadow-ui [data-action="cross"]');
    else await page.keyboard.press('k');
    await page.waitForFunction(() => document.querySelector('#shadow-ui [data-action="jab"]')?.classList.contains('is-combo-ready'));
    if (mobile) await press('#shadow-ui [data-action="jab"]');
    else await page.keyboard.press('j');
    await page.waitForFunction(() => document.querySelector('.shadow-movement')?.textContent === 'Crochet gauche');
    await page.waitForTimeout(400);
    if (mobile) await press('.shadow-pause-button');
    else await page.keyboard.press('p');
    await press('#shadow-ui .commands-open-button');
    await page.locator('#shadow-ui .commands-panel').waitFor({ state: 'visible' });
    await press('#shadow-ui .commands-back-button');
    await page.locator('#shadow-speed').selectOption('0.65');
    await press('.shadow-finish-button');
    await page.waitForFunction(() => document.querySelector('#shadow-ui').dataset.phase === 'finished');
    assert.equal(await page.locator('[data-shadow-stat="punches"]').textContent(), '3');
    assert.equal(await page.locator('[data-shadow-stat="combos"]').textContent(), '1');
    await press('.shadow-start-button');
    await page.waitForFunction(() => document.querySelector('#shadow-ui').dataset.phase === 'running');
    assert.equal(await page.locator('.shadow-speed-label').isVisible(), true);
    await press('#shadow-ui .activity-exit-button');
    await page.locator('#gym-ui').waitFor({ state: 'visible' });

    // These independent regression exercises spend a full day's energy.
    // Refill through the actual bed instead of bypassing the new start gate.
    await page.goto(`${base}?scene=home`);
    await page.waitForFunction(() => document.getElementById('stage')?.dataset.scene === 'home');
    await walkFor('right', 1400);
    await walkUntil('up', 'Ton lit · Passer au lendemain');
    await interact();
    await page.locator('[data-gym-action="sleep"]').waitFor({ state: 'visible' });
    assert.match(await page.locator('#gym-dialog-text').textContent(), /dormir ne donne aucun bonus/);
    await press('[data-gym-action="sleep"]');
    await page.waitForFunction(() => document.querySelector('.gym-day')?.textContent === 'Jour 2'
      && document.querySelector('.gym-energy')?.textContent === 'Énergie 100/100');
    console.log(`Production day: ${mobile ? 'touch' : 'desktop'} actual bed confirmation advances the day and restores energy`);

    console.log(`Production resistance: ${mobile ? 'touch' : 'desktop'} direct entry, three-round rules and full resistance`);
    await page.goto(`${base}?scene=sparring&lesson=resistance`);
    await page.waitForFunction(() => {
      const ui = document.querySelector('#sparring-ui');
      return ui?.dataset.lesson === 'resistance' && ui.dataset.phase === 'ready';
    });
    assert.equal(await page.evaluate(() => window.__sparring), undefined, 'the resistance test also uses only the production UI');
    assert.match(await page.locator('.panel-heading').textContent(), /Résistance/);
    assert.match(await page.locator('.bout-rules').textContent(), /Trois rounds de 60 s/);
    assert.equal(await page.locator('.round-eyebrow').textContent(), 'ROUND 1 / 3');
    for (const who of ['player', 'remi']) {
      assert.equal(await page.locator(`[data-resistance="${who}"]`).getAttribute('aria-valuenow'), '100');
      assert.equal(await page.locator(`[data-resistance="${who}"]`).getAttribute('aria-valuemax'), '100');
    }
    if (mobile) {
      // Geometry is read while the session is still stopped. These same A/B
      // rectangles are used for actual punches and the six recovery gestures.
      for (const action of ['jab', 'cross']) {
        punchBoxes[action] = await page.locator(`#sparring-ui [data-action="${action}"]`).boundingBox();
        assert.ok(punchBoxes[action], `Resistance ${action} button is present`);
      }
      await punch('jab'); // A confirms the ready screen.
    } else await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'running');
    if (!mobile) assert.equal(await page.locator('#sparring-ui .input-rail button:visible').count(), 0);
    await punch('jab');
    await page.waitForFunction(() => document.querySelector('[data-value="landed"]')?.textContent === '1');
    assert.equal(await page.locator('[data-resistance="remi"]').getAttribute('aria-valuenow'), '88', 'the real jab removes twelve resistance at its scored contact');
    assert.equal(await page.locator('[data-resistance="player"]').getAttribute('aria-valuenow'), '100');
    if (mobile) await press('.pause-button');
    else await page.keyboard.press('p');
    await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'paused');
    const stoppedResistance = await page.evaluate(() => ({
      clock: document.querySelector('.round-time').textContent,
      player: document.querySelector('[data-resistance="player"]').getAttribute('aria-valuenow'),
      remi: document.querySelector('[data-resistance="remi"]').getAttribute('aria-valuenow'),
      touches: document.querySelector('[data-value="landed"]').textContent,
    }));
    await page.waitForTimeout(1100);
    assert.deepEqual(await page.evaluate(() => ({
      clock: document.querySelector('.round-time').textContent,
      player: document.querySelector('[data-resistance="player"]').getAttribute('aria-valuenow'),
      remi: document.querySelector('[data-resistance="remi"]').getAttribute('aria-valuenow'),
      touches: document.querySelector('[data-value="landed"]').textContent,
    })), stoppedResistance, 'pause freezes the actual production resistance and round clock');
    console.log(`Production resistance: ${mobile ? 'touch' : 'desktop'} contact at 88 and pause passed`);
    if (mobile) {
      await page.locator('[name="tempo"]').selectOption('fast');
      await press('.secondary-button');
      await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'running');
      assert.equal(await page.locator('[data-resistance="player"]').getAttribute('aria-valuenow'), '100');
      assert.equal(await page.locator('[data-resistance="remi"]').getAttribute('aria-valuenow'), '100');
      console.log('Production resistance: waiting for Rémi to cause a real player knockdown at the selected fast rhythm…');
      await page.waitForFunction(() => {
        const ui = document.querySelector('#sparring-ui');
        return ui?.dataset.phase === 'knockdown'
          && ui.querySelector('[data-resistance="player"]')?.getAttribute('aria-valuenow') === '0';
      }, null, { timeout: 45000 });
      assert.match(await page.locator('.resistance-player .bout-downs').textContent(), /1\/3 ROUND.*1\/4 SÉANCE/);
      const countClock = await page.locator('.round-time').textContent();
      console.log('Production resistance: player at zero; following the six highlighted A/B recovery gestures');
      for (let accepted = 1; accepted <= 6; accepted++) {
        await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'knockdown'
          && Boolean(document.querySelector('#sparring-ui .is-recovery-next[data-action]')), null, { timeout: 5000 });
        const action = await page.locator('#sparring-ui .is-recovery-next[data-action]').getAttribute('data-action');
        assert.equal(action, accepted % 2 ? 'jab' : 'cross', 'the production prompt alternates A and B');
        await punch(action);
        await page.waitForFunction(expected => document.querySelector('.knockdown-progress')?.getAttribute('aria-valuenow') === String(expected), accepted, { timeout: 1500 });
      }
      assert.equal(await page.locator('.round-time').textContent(), countClock, 'the recovery count does not consume round time');
      await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'running', null, { timeout: 5000 });
      assert.equal(await page.locator('[data-resistance="player"]').getAttribute('aria-valuenow'), '55', 'the first real recovery restores partial resistance');
      assert.equal(await page.locator('.knockdown-panel').isVisible(), false);
      assert.equal(await page.locator('[data-value="landed"]').textContent(), '0', 'recovery presses are not extra punches');
      console.log('Production resistance: six real touchscreen gestures, return to play at 55, and no recovery punches passed');
    }
    await press('#sparring-ui .activity-exit-button');
    await page.locator('#gym-ui').waitFor({ state: 'visible' });
    console.log(`Production resistance: ${mobile ? 'touch' : 'desktop'} return to gym passed`);

    console.log(`Production Béton: ${mobile ? 'touch' : 'desktop'} direct entry, points and three-round rules`);
    await page.goto(`${base}?scene=fight`);
    await page.waitForFunction(() => {
      const ui = document.querySelector('#sparring-ui');
      return ui?.dataset.opponent === 'beton' && ui.dataset.phase === 'ready';
    });
    assert.equal(await page.evaluate(() => window.__sparring), undefined, 'Béton is exercised without a development hook');
    assert.match(await page.locator('.panel-heading').textContent(), /Béton/);
    assert.equal(await page.locator('.opponent-info .fighter-name').textContent(), 'Béton');
    assert.match(await page.locator('#game').getAttribute('aria-label'), /Salle de boxe/);
    assert.match(await page.locator('.gym-location').textContent(), /SALLE DE BOXE/);
    assert.match(await page.locator('.combat-rules').textContent(), /3 rounds de 60 s/);
    assert.match(await page.locator('.combat-rules').textContent(), /touche nette vaut 1 point.*chute adverse ajoute 3 points/);
    assert.equal(await page.locator('.round-eyebrow').textContent(), 'ROUND 1 / 3');
    assert.equal(await page.locator('.combat-score').textContent(), 'VOUS 0 · 0 BÉTON');
    for (const who of ['player', 'remi']) {
      assert.equal(await page.locator(`[data-resistance="${who}"]`).getAttribute('aria-valuenow'), '100');
    }
    // Measure both phone buttons BEFORE starting. The first real jab must
    // reach the initial opening rather than spend it on protocol geometry.
    if (mobile) {
      for (const action of ['jab', 'cross']) {
        punchBoxes[action] = await page.locator(`#sparring-ui [data-action="${action}"]`).boundingBox();
        assert.ok(punchBoxes[action], `Béton ${action} button is present`);
      }
      await punch('jab'); // A validates the ready screen; this is not a punch.
    } else await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'running');
    if (!mobile) assert.equal(await page.locator('#sparring-ui .input-rail button:visible').count(), 0);
    await punch('jab');
    await page.waitForFunction(() => document.querySelector('.combat-score')?.textContent === 'VOUS 1 · 0 BÉTON');
    assert.equal(await page.locator('[data-value="landed"]').textContent(), '1', 'one real scored jab gives one combat point');
    assert.equal(await page.locator('[data-resistance="remi"]').getAttribute('aria-valuenow'), '88', 'the same jab contact removes twelve Béton resistance');
    assert.equal(await page.locator('[data-resistance="player"]').getAttribute('aria-valuenow'), '100');
    if (mobile) await press('.pause-button');
    else await page.keyboard.press('p');
    await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'paused');
    const readCombat = () => page.evaluate(() => ({
      phase: document.querySelector('#sparring-ui').dataset.phase,
      clock: document.querySelector('.round-time').textContent,
      round: document.querySelector('.round-eyebrow').textContent,
      score: document.querySelector('.combat-score').textContent,
      landed: document.querySelector('[data-value="landed"]').textContent,
      received: document.querySelector('[data-value="received"]').textContent,
      player: document.querySelector('[data-resistance="player"]').getAttribute('aria-valuenow'),
      opponent: document.querySelector('[data-resistance="remi"]').getAttribute('aria-valuenow'),
    }));
    const pausedCombat = await readCombat();
    await page.waitForTimeout(1100);
    assert.deepEqual(await readCombat(), pausedCombat, 'pause freezes public combat points, resistance and timer');
    await press('.secondary-button');
    await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.phase === 'running'
      && document.querySelector('.combat-score')?.textContent === 'VOUS 0 · 0 BÉTON');
    assert.deepEqual(await readCombat(), {
      phase: 'running', clock: '1:00', round: 'ROUND 1 / 3', score: 'VOUS 0 · 0 BÉTON',
      landed: '0', received: '0', player: '100', opponent: '100',
    }, 'restarting clears the previous contact and combat score');
    for (const who of ['player', 'remi']) {
      assert.match(await page.locator(`.resistance-${who} .bout-downs`).textContent(), /0\/3 ROUND.*0\/4 COMBAT/);
    }
    await press('#sparring-ui .activity-exit-button');
    await page.waitForFunction(() => document.getElementById('stage')?.dataset.scene === 'neighborhood');

    // The combat facade replaces the former gym poster. Return to its street
    // door and use the public interaction to enter another clean encounter.
    await page.waitForFunction(() => document.querySelector('.gym-nearby-label')?.textContent === 'Salle de boxe · Les rencontres');
    await interact();
    await page.locator('.gym-dialog [data-gym-action="meet-beton"]').waitFor({ state: 'visible' });
    assert.match(await page.locator('#gym-dialog-text').textContent(), /Prochain défi : Béton/);
    if (mobile) await press('#gym-ui [data-pad-button="a"]');
    else await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#sparring-ui')?.dataset.opponent === 'beton'
      && document.querySelector('#sparring-ui')?.dataset.phase === 'ready');
    assert.equal(await page.locator('.combat-score').textContent(), 'VOUS 0 · 0 BÉTON', 'the neighborhood door enters a clean new combat');
    await press('#sparring-ui .activity-exit-button');
    await page.waitForFunction(() => document.getElementById('stage')?.dataset.scene === 'neighborhood');
    console.log(`Production Béton: ${mobile ? 'touch' : 'desktop'} real jab, pause, restart, neighborhood venue entry and return passed`);
    for (const activity of ['rope', 'speedball']) {
      await page.goto(`${base}?scene=${activity}`);
      await page.waitForFunction(() => document.querySelector('#rhythm-ui')?.dataset.phase === 'ready');
      assert.equal(await page.evaluate(() => window.__rhythm), undefined, 'production keeps rhythm debug hooks private');
      await press('#rhythm-ui .commands-open-button');
      assert.equal(await page.locator('.rhythm-command-actions').textContent(), mobile ? 'A / B' : 'J / K');
      await press('#rhythm-ui .commands-back-button');
      const r = mobile ? await page.locator('#rhythm-ui [data-pad-button="a"]').boundingBox() : null;
      await press('.rhythm-primary');
      // Read only the visible timing guide; the production bundle exposes no model.
      await page.waitForFunction(() => Number(document.querySelector('.rhythm-track').style.getPropertyValue('--beat')) >= .47);
      if (mobile) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: r.x + r.width / 2, y: r.y + r.height / 2 }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else await page.keyboard.press('j');
      await page.waitForFunction(() => document.querySelector('.rhythm-streak')?.textContent === '1', null, { timeout: 2500 });
      await page.screenshot({ path: `docs/${activity}-${remote ? 'public' : 'production'}-${mobile ? 'mobile' : 'desktop'}.png` });
      if (mobile) await press('#rhythm-ui .console-menu-button'); else await page.keyboard.press('p');
      await page.locator('.rhythm-panel').waitFor({ state: 'visible' });
      const clock = await page.locator('.rhythm-time').textContent();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.rhythm-time').textContent(), clock);
      await press('.rhythm-restart');
      await page.waitForFunction(() => document.querySelector('.rhythm-streak').textContent === '0');
      await press('#rhythm-ui .activity-exit-button');
      await page.locator('#gym-ui').waitFor({ state: 'visible' });
    }
    console.log(`Production rhythm: ${mobile ? 'touch' : 'desktop'} rope and speed ball contact, device help, pause, restart and gym return passed.`);
    assert.match(await page.locator('.gym-location').textContent(), /AU GYM/, 'returning from the venue restores the gym location');
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
    assert.ok(loaded.has('assets/world/home.png'), 'the home interior loads below the site directory');
    assert.ok(loaded.has('assets/world/neighborhood.png'), 'the scrolling Montreal neighborhood loads below the site directory');
    assert.ok(loaded.has('assets/sprites/street/player.json'), 'the tracksuit character metadata loads in production');
    assert.equal([...loaded].filter(name => name.startsWith('assets/sprites/street/player-') && name.endsWith('.png')).length, 12);
    assert.ok(loaded.has('assets/backgrounds/fight-hall.png'), 'the combat venue loads from the production site directory');
    for (const file of ['gym-block-body.png', 'gym-jab-body.png', 'player-block-body.png', 'player-jab-body.png', 'remi-block-body.png', 'remi-jab-body.png']) {
      assert.ok(loaded.has(`assets/sprites/body-training/${file}`), `body pose ${file} loads from the site directory`);
    }
    assert.ok(loaded.has('assets/backgrounds/bag-training.png'));
    assert.ok(loaded.has('assets/sprites/bag-orthodox/player-hook.png'));
    assert.ok(loaded.has('assets/backgrounds/gym-exploration.png'));
    assert.ok(loaded.has('assets/backgrounds/mirror-training.png'));
    for (const pose of ['block', 'dodge-left', 'dodge-right']) assert.ok(loaded.has(`assets/sprites/mirror/player-${pose}.png`));
    assert.equal([...loaded].filter(name => name.startsWith('assets/sprites/exploration/player-') && name.endsWith('.png')).length, 12);
    assert.equal([...loaded].filter(name => name.startsWith('assets/sprites/sparring-v2/') && name.endsWith('.png')).length, 20);
    for (const pose of ['hook', 'hook-windup', 'hook-recover']) {
      assert.ok(loaded.has(`assets/sprites/sparring-hook/player-${pose}.png`), `new left hook pose ${pose} loads from the site directory`);
    }
    assert.ok(loaded.has('assets/sprites/knockdown/fighters.json'), 'the knockdown atlas loads from the site directory');
    for (const who of ['player', 'remi']) {
      for (const pose of ['fall', 'down', 'rise']) {
        assert.ok(loaded.has(`assets/sprites/knockdown/${who}-${pose}.png`), `knockdown pose ${who}-${pose} loads from the site directory`);
      }
    }
    assert.ok(loaded.has('assets/sprites/beton/fighters.json'), 'the Béton atlas loads from the production site directory');
    for (const pose of ['guard', 'jab', 'cross-body', 'fall', 'down', 'rise']) {
      assert.ok(loaded.has(`assets/sprites/beton/beton-${pose}.png`), `Béton ${pose} pose loads from the site directory`);
    }
    assert.ok(loaded.has('assets/sprites/corner/remi-coach.png'), 'the original between-round coach vignette loads from the site directory');
    for (const [activity, poses] of Object.entries({ rope: ['ready', 'load', 'left', 'right', 'land', 'stumble'], speedball: ['left-contact', 'left-return', 'right-contact', 'right-return'] })) {
      assert.ok(loaded.has(`assets/backgrounds/${activity}-training.png`));
      assert.ok(loaded.has(`assets/sprites/${activity}/player.json`));
      for (const pose of poses) assert.ok(loaded.has(`assets/sprites/${activity}/player-${pose}.png`));
    }
    assert.ok(loaded.has('assets/sprites/speedball/ball.png'));
  }
  assert.deepEqual(errors, []);
  console.log(`${remote ? 'Deployed site' : 'Local production build with intercepted HTTP'}: fresh home via directory + index.html, keyboard/touch walks through neighborhood to gym and Rémi, actual sleep to restore day energy, sparring combo/help/restart/lesson/mute, bag contact/help/restart, mirror combo/help/slow speed/report/restart, resistance contact/pause plus a real touchscreen knockdown/recovery, Béton direct/neighborhood door entry with real contact/score/pause/restart and art loading, activity returns to gym and fight returns to neighborhood, landscape/portrait passed. No browser or resource errors.`);
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: '/tmp/boxeur-static-failure.png' }).catch(() => {});
    console.error(await currentPage.evaluate(() => ({ scene: document.getElementById('stage')?.dataset.scene,
      phase: document.querySelector('#sparring-ui')?.dataset.phase,
      prompt: document.querySelector('.gym-nearby-label')?.textContent,
      energy: document.querySelector('.daily-activity-note')?.textContent,
    })).catch(() => null));
  }
  throw error;
} finally {
  await browser.close();
}
