import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, joyPoint, dispatch, fit } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';

const browser = await chromium.launch({ headless: true });
const base = process.env.CONTROLS_URL ?? 'http://127.0.0.1:5173/';
const report = { cases: [], errors: [] };
let context;
try {
  for (const [mobile, width, height] of [[false, 1440, 1000], [true, 844, 390], [true, 568, 320]]) {
    const seed = new CareerProfile({ storage: null }).snapshot();
    seed.daily.energy = 4; seed.location = { scene: 'gym', x: 640, y: 585, facing: 'up' };
    context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(({ key, seed }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
    }, { key: CAREER_STORAGE_KEY, seed });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    await page.goto(`${base}?scene=gym`);
    await wait(page, () => window.__gym?.world);
    const cdp = mobile ? await context.newCDPSession(page) : null;
    const move = async (axis, target, direction, key) => {
      if (cdp) await dispatch(cdp, 'touchStart', [await joyPoint(page, '#gym-ui', direction)]);
      else await page.keyboard.down(key);
      await wait(page, ({ axis, target }) => axis === 'x' ? window.__gym.world.state.x >= target : window.__gym.world.state.y <= target, { axis, target });
      if (cdp) await dispatch(cdp, 'touchEnd'); else await page.keyboard.up(key);
      await wait(page, () => !window.__gym.world.state.moving);
    };
    await move('x', 915, 'right', 'ArrowRight'); await move('y', 545, 'up', 'ArrowUp');
    await wait(page, () => window.__gym.world.state.nearby?.id === 'remi');
    await wait(page, key => Math.abs(JSON.parse(localStorage.getItem(key)).location.x - window.__gym.world.state.x) <= 1, CAREER_STORAGE_KEY);
    assert.equal(await page.locator('.gym-energy').textContent(), 'Énergie 4/100');
    const overlap = await page.evaluate(() => {
      const a = document.querySelector('.gym-daily').getBoundingClientRect(), b = document.querySelector('.gym-nearby').getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
    assert.equal(overlap, false, 'day/energy never cover the nearby place prompt');
    await page.screenshot({ path: `docs/daily-gym-${mobile ? `mobile-${width}` : 'desktop'}.png` });
    if (mobile) await page.locator('#gym-ui [data-pad-button="a"]').tap(); else await page.keyboard.press('e');
    await page.locator('.gym-dialog').waitFor({ state: 'visible' });
    const choices = await page.locator('.gym-session-button').evaluateAll(buttons => buttons.map(button => ({ text: button.textContent, disabled: button.disabled })));
    assert.equal(choices.length, 5); assert.ok(choices.every(choice => choice.disabled));
    assert.ok(choices.slice(0, 2).every(choice => /20 énergie/.test(choice.text)));
    assert.ok(choices.slice(2).every(choice => /10 énergie/.test(choice.text)));
    assert.equal(await page.locator('.gym-close-button').isEnabled(), true);
    if (mobile) await page.locator('#gym-ui [data-pad-button="b"]').tap(); else await page.keyboard.press('Escape');
    await page.locator('.gym-dialog').waitFor({ state: 'hidden' });
    const geometry = await fit(page, '#gym-ui', mobile);
    assert.ok(geometry.fits && geometry.noScroll);
    assert.ok(mobile ? geometry.controls.every(control => control.outside && control.fits) : geometry.controls.length === 0);
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY);
    assert.equal(saved.daily.energy, 4, 'walking and looking at activities remain free');
    await page.reload(); await wait(page, () => window.__gym?.world);
    const restored = await page.evaluate(() => ({ x: window.__gym.world.state.x, y: window.__gym.world.state.y }));
    assert.deepEqual(restored, { x: saved.location.x, y: saved.location.y });
    report.cases.push({ mobile, width, height, choices, restored, geometry });
    console.log(`${mobile ? 'Mobile' : 'PC'} ${width}×${height}: marche gratuite, coûts Rémi, refus et retour, reprise à la position sauvegardée.`);
    await context.close(); context = null;
  }
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; throw error; }
finally {
  await fs.writeFile('docs/daily-gym-browser-results.json', JSON.stringify(report, null, 2));
  await context?.close(); await browser.close();
}
