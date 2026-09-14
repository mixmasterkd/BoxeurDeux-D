import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, wait, dispatch, joyPoint, buttonPoint, suppressHotReload, fit } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';

const url = process.env.SPARRING_URL ?? 'http://127.0.0.1:5173/';
const report = { date: new Date().toISOString(), url, fixture: 'Isolated Playwright contexts; valid late career created through the model test API, then seeded as the normal profile. All laptop navigation, purchases and CLI commands use keyboard or actual CDP touch.', mobileEmulated: true, cases: [], errors: [], failure: null };
const browser = await chromium.launch({ headless: true });
let activePage;
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY);
const bytes = page => page.evaluate(key => ({ normal: localStorage.getItem(key), backup: localStorage.getItem(`${key}-backup`) }), CAREER_STORAGE_KEY);
const pose = page => page.evaluate(() => ({ x: __exploration.world.state.x, y: __exploration.world.state.y, facing: __exploration.world.state.facing }));
const pageIs = (page, name) => wait(page, name => document.querySelector('.laptop-window')?.dataset.page === name, name);
const action = id => `[data-gym-action="laptop-${id}"]`;

function fixture() {
  const profile = new CareerProfile({ storage: null });
  assert.equal(profile.applyTestCommand('test mexique').ok, true);
  profile.leaveMexico();
  profile.applyTestCommand('argent 500');
  profile.setLocation({ scene: 'home', x: 255, y: 545, facing: 'left' });
  return profile.exportText();
}

async function setup(mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  await suppressHotReload(context);
  const data = fixture();
  await context.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, data);
      localStorage.setItem(`${key}-backup`, data);
    }
  }, { key: CAREER_STORAGE_KEY, data });
  const page = await context.newPage(); activePage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const tap = async selector => { await dispatch(cdp, 'touchStart', [await buttonPoint(page, selector)]); await dispatch(cdp, 'touchEnd'); await page.waitForTimeout(40); };
  const direction = async direction => {
    if (mobile) { await dispatch(cdp, 'touchStart', [await joyPoint(page, '#gym-ui', direction)]); await dispatch(cdp, 'touchEnd'); await page.waitForTimeout(45); }
    else await page.keyboard.press({ down: 'ArrowDown', up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight' }[direction]);
  };
  const confirm = () => mobile ? tap('#gym-ui [data-pad-button="a"]') : page.keyboard.press('KeyE');
  const back = () => mobile ? tap('#gym-ui [data-pad-button="b"]') : page.keyboard.press('Escape');
  const walkAxis = async (axis, target) => {
    for (let n = 0; n < 100; n++) {
      const difference = target - (await pose(page))[axis];
      if (Math.abs(difference) < 8) return;
      const direction = axis === 'x' ? difference > 0 ? 'right' : 'left' : difference > 0 ? 'down' : 'up';
      const key = { right: 'KeyD', left: 'KeyA', up: 'KeyW', down: 'KeyS' }[direction];
      if (mobile) await dispatch(cdp, 'touchStart', [await joyPoint(page, '#gym-ui', direction)]); else await page.keyboard.down(key);
      await page.waitForTimeout(Math.max(25, Math.min(220, Math.abs(difference) / 230 * 740)));
      if (mobile) await dispatch(cdp, 'touchEnd'); else await page.keyboard.up(key);
    }
    throw Error(`Walking blocked towards ${axis}=${target}: ${JSON.stringify(await pose(page))}`);
  };
  const select = async selector => {
    await page.locator(selector).waitFor({ state: 'visible' });
    for (let n = 0; n < 24; n++) {
      if (await page.evaluate(selector => document.activeElement?.matches(selector), selector)) { await confirm(); return; }
      await direction('down');
    }
    throw Error(`Joypad/keyboard could not focus ${selector}`);
  };
  await page.goto(`${url}?scene=home`);
  await wait(page, () => window.__exploration?.scene.place === 'home');
  await page.locator('#scene-loading').waitFor({ state: 'hidden' });
  await page.waitForTimeout(150);
  await confirm(); await pageIs(page, 'desktop');
  return { context, page, cdp, tap, direction, confirm, back, select, walkAxis };
}

async function capture(page, name, mobile, { field = false } = {}) {
  await page.waitForTimeout(160);
  const geometry = await fit(page, '#gym-ui', mobile, true);
  assert.ok(geometry.fits && geometry.noScroll, `${name}: canvas/document fit ${JSON.stringify(geometry)}`);
  assert.equal(geometry.controls.length === 0, !mobile);
  for (const control of geometry.controls) assert.ok(control.fits && control.outside, `${name}: control ${control.name}`);
  const layout = await page.evaluate(() => {
    const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
    const panel = document.querySelector('.laptop-window'), input = panel.querySelector('input');
    const p = rect(panel), i = input && rect(input);
    return { panel: p, input: i, panelFits: p.x >= 0 && p.y >= 0 && p.right <= innerWidth && p.bottom <= innerHeight,
      inputFits: !i || (i.x >= p.x && i.y >= p.y && i.right <= p.right && i.bottom <= p.bottom),
      columns: [...panel.querySelectorAll('.gym-dialog-copy, .gym-dialog-actions')].map(e => ({ ...rect(e), scrollWidth: e.scrollWidth, clientWidth: e.clientWidth, scrollHeight: e.scrollHeight, clientHeight: e.clientHeight })) };
  });
  assert.ok(layout.panelFits, `${name}: laptop panel fits viewport`);
  for (const column of layout.columns) assert.ok(column.scrollWidth <= column.clientWidth + 1, `${name}: no horizontal overflow`);
  if (field) assert.ok(layout.inputFits, `${name}: terminal field remains visible after long output`);
  await page.screenshot({ path: `docs/laptop-${name}.png` });
  report.cases.push({ name, geometry, layout }); console.log(`Laptop: ${name}`);
}

async function run(mobile) {
  const { context, page, cdp, tap, confirm, back, select, walkAxis } = await setup(mobile);
  const suffix = mobile ? 'mobile568' : 'desktop';
  await capture(page, `desktop-${suffix}`, mobile);
  const initialPose = await pose(page), initial = await saved(page);
  assert.equal(initial.wallet.money, 500);
  await select(action('browser')); await pageIs(page, 'browser');
  await select(action('marathon')); await pageIs(page, 'marathon');
  assert.match(await page.locator('#gym-dialog-text').textContent(), /100 \$ par inscription.*sans prix en argent/s);
  await capture(page, `marathon-${suffix}`, mobile);
  await select(action('register'));
  assert.equal((await saved(page)).wallet.money, 400);
  assert.equal((await saved(page)).marathon.entries, 1);
  assert.ok(await page.locator(action('register')).isDisabled());
  assert.match(await page.locator(action('register')).textContent(), /Déjà inscrit/);
  // A/E after refresh selects the remaining Back action, never the disabled purchase.
  await confirm(); await pageIs(page, 'browser');
  await select(action('marathon')); await back(); await pageIs(page, 'browser');
  assert.equal((await saved(page)).wallet.money, 400);
  for (const [destination, expected] of [['cuba', 240], ['mexico', 80]]) {
    await select(action('travel')); await pageIs(page, 'travel');
    await select(action(destination)); await pageIs(page, destination);
    await select(action(`reserve-${destination}`));
    const profile = await saved(page);
    assert.equal(profile.wallet.money, expected);
    assert.ok(profile[destination].reserved);
    assert.equal(profile[destination].active, null);
    assert.equal(profile.location.scene, 'home');
    assert.ok(await page.locator(action(`reserve-${destination}`)).isDisabled());
    assert.match(await page.locator(action(`reserve-${destination}`)).textContent(), /Billet déjà réservé/);
    assert.match(await page.locator('#gym-dialog-text').textContent(), /Billet réservé/);
    await capture(page, `reserved-${destination}-${suffix}`, mobile);
    await confirm(); await pageIs(page, 'travel');
    await select(action(destination)); await back();
    while (await page.locator('.laptop-window').getAttribute('data-page') !== 'browser') await back();
    assert.equal((await saved(page)).wallet.money, expected);
  }
  assert.deepEqual(await pose(page), initialPose);
  report.cases.push({ name: `purchases-${suffix}`, marathonFee: 100, travelFees: [160, 160], finalBalance: 80, duplicateCharges: false, automaticDeparture: false, worldStill: true });
  await back(); await pageIs(page, 'desktop');
  await select(action('terminal')); await pageIs(page, 'terminal');
  // Editing uses real key events and Enter. Direction keys in the field must
  // not drive the actor underneath the laptop window.
  let input = page.locator('.terminal-console input');
  if (mobile) await tap('.terminal-console input'); else await input.click();
  await wait(page, () => document.activeElement?.matches('.terminal-console input'));
  await page.keyboard.type('wasd p e j k');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1800);
  assert.deepEqual(await pose(page), initialPose);
  assert.equal(await input.inputValue(), 'wasd p e j k');
  await input.fill('liste'); await input.press('Enter');
  assert.match(await page.locator('.terminal-console pre').textContent(), /test cuba/);
  assert.match(await page.locator('.terminal-console pre').textContent(), /test mexique/);
  await capture(page, `terminal-list-${suffix}`, mobile, { field: true });
  const output = await page.locator('.terminal-console pre').boundingBox();
  if (mobile) {
    const touch = { id: 3, x: output.x + output.width / 2, y: output.y + output.height - 6 };
    await dispatch(cdp, 'touchStart', [touch]);
    for (let step = 1; step <= 5; step++) {
      await dispatch(cdp, 'touchMove', [{ ...touch, y: touch.y - step * (output.height - 12) / 5 }]);
      await page.waitForTimeout(45);
    }
    await dispatch(cdp, 'touchEnd');
  } else {
    await page.mouse.move(output.x + output.width / 2, output.y + output.height / 2);
    await page.mouse.wheel(0, 220);
  }
  await wait(page, () => document.querySelector('.terminal-console pre').scrollTop > 0);
  await capture(page, `terminal-commands-scrolled-${suffix}`, mobile, { field: true });
  if (mobile) {
    await page.setViewportSize({ width: 844, height: 390 });
    await capture(page, 'terminal-list-mobile844', true, { field: true });
    await tap('.terminal-console input');
    await page.setViewportSize({ width: 568, height: 200 });
    await capture(page, 'terminal-keyboard-mobile568x200', true, { field: true });
    await page.setViewportSize({ width: 568, height: 320 });
  }
  // Return follows the same convention even after the text field was focused.
  await back(); await pageIs(page, 'desktop');
  await select(action('terminal')); await pageIs(page, 'terminal');
  const normalBytes = await bytes(page);
  input = page.locator('.terminal-console input'); await input.fill('test maison'); await input.press('Enter');
  await wait(page, () => window.__exploration?.scene.place === 'home' && !window.__exploration.scene.laptop.opened);
  await page.locator('#scene-loading').waitFor({ state: 'hidden' });
  // Walk from the test home's entrance to its laptop using the same controls.
  await walkAxis('y', 545); await walkAxis('x', 255);
  await confirm(); await pageIs(page, 'desktop');
  assert.match(await page.locator('.gym-dialog-speaker').textContent(), /TEST/);
  assert.deepEqual(await bytes(page), normalBytes);
  await select(action('terminal'));
  input = page.locator('.terminal-console input'); await input.fill('argent 450'); await input.press('Enter');
  assert.match(await page.locator('.terminal-console pre').textContent(), /450/);
  assert.deepEqual(await bytes(page), normalBytes);
  input = page.locator('.terminal-console input'); await input.fill('retour'); await input.press('Enter');
  await wait(page, () => window.__exploration?.scene.place === 'home' && !window.__exploration.scene.laptop.opened);
  await page.locator('#scene-loading').waitFor({ state: 'hidden' });
  await page.waitForTimeout(1800);
  assert.deepEqual(await bytes(page), normalBytes);
  assert.equal((await saved(page)).wallet.money, 80);
  await confirm(); await pageIs(page, 'desktop');
  assert.ok(!/TEST/.test(await page.locator('.gym-dialog-speaker').textContent()));
  report.cases.push({ name: `terminal-isolation-${suffix}`, realEnter: true, directionalTypingDoesNotMovePlayer: true, listeFindsCommands: true, testMoney: 450, normalMoney: 80, normalBytesIntact: true, backupBytesIntact: true });
  if (mobile) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#rotate-prompt').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => __exploration.world.state.paused), true);
    await page.screenshot({ path: 'docs/laptop-portrait-mobile.png' });
    report.cases.push({ name: 'portrait-mobile', turnPhonePrompt: true, worldPaused: true });
    await page.setViewportSize({ width: 568, height: 320 });
  }
  await context.close();
}

try {
  for (const mobile of [false, true]) {
    if (process.env.LAPTOP_DEVICE && process.env.LAPTOP_DEVICE !== (mobile ? 'mobile' : 'desktop')) continue;
    await run(mobile);
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack; process.exitCode = 1; console.error(error);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: 'docs/laptop-browser-failure.png' }).catch(() => {});
} finally {
  await browser.close();
  fs.writeFileSync(`docs/laptop-${process.env.LAPTOP_DEVICE ? `${process.env.LAPTOP_DEVICE}-` : ''}browser-results.json`, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, failure: report.failure }, null, 2));
