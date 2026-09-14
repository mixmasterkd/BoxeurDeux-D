import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, wait, fit, suppressHotReload } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';

// Presentation-only fixture: start the real pads scene, then finish with zero
// hits. Full real-contact sessions are covered by destinations-browser.mjs.
const report = { date: new Date().toISOString(), fixture: 'Isolated browser profile, direct pads scene entry; session.finish() with zero hits and reward disabled. Presentation check, not a completed real-time session.', cases: [], errors: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const mobile of [false, true]) for (const mexico of [true, false]) {
    const name = `${mexico ? 'octopus-mexico' : 'fredo-montreal'}-${mobile ? 'mobile' : 'desktop'}`;
    const context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile });
    await suppressHotReload(context);
    const profile = new CareerProfile({ storage: null });
    profile.applyTestCommand(mexico ? 'test mexique' : 'test maison');
    await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: CAREER_STORAGE_KEY, value: profile.exportText() });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`http://127.0.0.1:5173/?scene=${mexico ? 'mexico-home' : 'home'}`);
    await wait(page, mexico => mexico ? window.__mexico?.scene : window.__exploration?.scene, mexico, 30000);
    await page.evaluate(mexico => {
      const scene = mexico ? __mexico.scene : __exploration.scene;
      scene.scene.start('HotelActivityScene', { activity: 'pads', fromMexico: mexico, fromGym: !mexico });
    }, mexico);
    await wait(page, () => window.__hotelActivity?.session.state.phase === 'ready', undefined, 30000);
    await page.locator('#scene-loading').waitFor({ state: 'hidden' });
    await page.evaluate(() => { __hotelActivity.scene.rewarded = true; __hotelActivity.session.finish(); });
    await wait(page, () => __hotelActivity.session.state.phase === 'finished' && document.querySelector('.rhythm-panel-title')?.textContent === 'Observe la cible.');
    const expected = mexico ? 'The Octopus' : 'Fredo';
    const copy = await page.locator('.rhythm-panel-copy').textContent();
    assert.match(copy, new RegExp(`${expected} attend ton coup`));
    assert.ok(!copy.includes(mexico ? 'Fredo' : 'Octopus'));
    assert.equal(await page.evaluate(() => __hotelActivity.session.state.summary.qualified), false);
    const geometry = await fit(page, '#rhythm-ui', mobile, true);
    assert.ok(geometry.fits && geometry.noScroll);
    for (const control of geometry.controls) assert.ok(control.fits && control.outside);
    await page.screenshot({ path: `docs/pads-copy-finished-${name}.png` });
    if (mobile) await page.locator('#rhythm-ui .console-menu-button').tap(); else await page.keyboard.press('KeyP');
    const commandsButton = page.locator('#rhythm-ui .commands-open-button');
    if (mobile) await commandsButton.tap(); else await commandsButton.click();
    await page.locator('#rhythm-ui .commands-panel').waitFor({ state: 'visible' });
    const commands = await page.locator('#rhythm-ui .commands-notes p').first().textContent();
    assert.ok(commands.includes(expected));
    assert.ok(!commands.includes(mexico ? 'Fredo' : 'Octopus'));
    assert.match(commands, mobile ? /A : jab.*B : direct/ : /J : jab.*K : direct/);
    await page.screenshot({ path: `docs/pads-copy-commands-${name}.png` });
    report.cases.push({ name, expectedCoach: expected, qualified: false, copy, commands, geometry });
    console.log(`Pads coach copy: ${name}`);
    await context.close();
  }
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; process.exitCode = 1; console.error(error); }
finally { await browser.close(); fs.writeFileSync('docs/pads-coach-copy-browser-results.json', `${JSON.stringify(report, null, 2)}\n`); }
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, failure: report.failure ?? null }, null, 2));
