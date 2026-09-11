import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, fit } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';

const browser = await chromium.launch({ headless: true });
const base = process.env.CONTROLS_URL ?? 'http://127.0.0.1:5173/';
const report = { cases: [], errors: [] };
const cases = [
  ['bag', 'bag', 'bag', '.bag-start-button', '.bag-restart-button', 15],
  ['rope', 'rhythm', 'rhythm', '.rhythm-primary', '.rhythm-restart', 15],
  ['speedball', 'rhythm', 'rhythm', '.rhythm-primary', '.rhythm-restart', 15],
  ['shadow', 'shadow', 'shadow', '.shadow-start-button', '.shadow-reset-button', 5],
  ['sparring', 'sparring', 'sparring', '.primary-button', '.secondary-button', 20],
  ['sparring&lesson=jab', 'sparring', 'sparring', '.primary-button', '.secondary-button', 10],
  ['fight', 'sparring', 'sparring', '.primary-button', '.secondary-button', 0],
];
const daily = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).daily, CAREER_STORAGE_KEY);
let context;
try {
  for (const mobile of [false, true]) for (const [query, hook, overlay, start, restart, cost] of cases) {
    const seed = new CareerProfile({ storage: null }).snapshot();
    seed.daily.energy = cost ? cost * 2 - 1 : 0;
    context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(({ key, seed }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
    }, { key: CAREER_STORAGE_KEY, seed });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${base}?scene=${query}`);
    await wait(page, hook => window[`__${hook}`]?.session.state.phase === 'ready', hook);
    const root = `#${overlay}-ui`;
    const notice = page.locator(`${root} .daily-activity-note`);
    assert.match(await notice.textContent(), cost ? new RegExp(`coûte ${cost}`) : /gratuits/);
    assert.equal((await daily(page)).energy, seed.daily.energy, 'opening the activity costs nothing');
    if (mobile) await page.locator(`${root} [data-pad-button="a"]`).tap();
    else await page.locator(`${root} ${start}`).click();
    await wait(page, hook => window[`__${hook}`].session.state.phase === 'running', hook);
    assert.equal((await daily(page)).energy, seed.daily.energy - cost);
    if (mobile) await page.locator(`${root} .console-menu-button`).tap();
    else await page.keyboard.press('p');
    await wait(page, hook => window[`__${hook}`].session.state.phase === 'paused', hook);
    assert.equal(await page.locator(`${root} ${start}`).isDisabled(), false, 'resume always remains available');
    assert.equal(await page.locator(`${root} ${restart}`).isDisabled(), cost > 0, 'an unaffordable new session is disabled');
    if (mobile) await page.locator(`${root} [data-pad-button="a"]`).tap();
    else await page.keyboard.press('Enter');
    await wait(page, hook => window[`__${hook}`].session.state.phase === 'running', hook);
    assert.equal((await daily(page)).energy, seed.daily.energy - cost, 'resume is free');
    if (mobile) await page.locator(`${root} .console-menu-button`).tap();
    else await page.keyboard.press('p');
    await wait(page, hook => window[`__${hook}`].session.state.phase === 'paused', hook);
    const geometry = await fit(page, root, mobile, true);
    assert.ok(geometry.fits && geometry.noScroll && Math.abs(geometry.ratio - 16 / 9) < .004);
    assert.ok(mobile ? geometry.controls.every(control => control.outside && control.fits) : geometry.controls.length === 0);
    if (query === 'rope') await page.screenshot({ path: `docs/daily-rope-${mobile ? 'mobile' : 'desktop'}.png` });
    if (cost) {
      await page.reload();
      await wait(page, hook => window[`__${hook}`]?.session.state.phase === 'ready', hook);
      assert.equal((await daily(page)).energy, cost - 1, 'abandon and reload retain the spent cost');
      assert.equal(await page.locator(`${root} ${start}`).isDisabled(), true);
      assert.match(await notice.textContent(), /Énergie insuffisante/);
      await page.locator(`${root} .activity-exit-button`)[mobile ? 'tap' : 'click']();
      await wait(page, () => window.__gym?.world);
      assert.equal((await daily(page)).energy, cost - 1, 'returning to the gym is free');
    } else {
      await page.locator(`${root} ${restart}`)[mobile ? 'tap' : 'click']();
      await wait(page, hook => window[`__${hook}`].session.state.phase === 'running', hook);
      assert.equal((await daily(page)).energy, 0, 'Béton rematch at zero daily energy is free');
      assert.equal(await page.locator(`${root} .activity-exit-button`).textContent(), '← Quartier');
    }
    report.cases.push({ query, mobile, cost, geometry });
    console.log(`${mobile ? 'Mobile 568×320' : 'PC'} ${query}: coût, pause/reprise, refus/revanche, sauvegarde et cadrage validés.`);
    await context.close(); context = null;
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await fs.writeFile('docs/daily-activity-browser-results.json', JSON.stringify(report, null, 2));
  await context?.close(); await browser.close();
}
