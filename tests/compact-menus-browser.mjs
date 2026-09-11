import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait } from './control-helpers.mjs';

const base = process.env.CONTROLS_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true });
const report = { cases: [], errors: [] };
let context, page;
const activities = [
  ['sparring', 'sparring', '.round-panel', '.primary-button'],
  ['sparring&lesson=resistance', 'sparring', '.round-panel', '.primary-button'],
  ['fight', 'sparring', '.round-panel', '.primary-button'],
  ['bag', 'bag', '.bag-panel', '.bag-start-button'],
  ['shadow', 'shadow', '.shadow-panel', '.shadow-start-button'],
  ['rope', 'rhythm', '.rhythm-panel', '.rhythm-primary'],
  ['speedball', 'rhythm', '.rhythm-panel', '.rhythm-primary'],
];

async function checkPanel(selector) {
  const value = await page.locator(selector).evaluate(panel => {
    const r = panel.getBoundingClientRect(), c = document.querySelector('canvas').getBoundingClientRect();
    return { panel: { x: r.x, y: r.y, right: r.right, bottom: r.bottom },
      insideCamera: r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1,
      insideViewport: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
      noPageScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
      noHorizontalOverflow: panel.scrollWidth <= panel.clientWidth + 1,
      hasInternalScroll: panel.scrollHeight > panel.clientHeight + 1,
    };
  });
  assert.ok(value.insideCamera && value.insideViewport && value.noPageScroll && value.noHorizontalOverflow, `${selector}: ${JSON.stringify(value)}`);
  assert.equal(await page.locator('.input-rail button:visible').count(), 0, 'desktop never displays touch controllers');
  return value;
}

try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 600 }]) {
    context = await browser.newContext({ viewport, hasTouch: false });
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
    for (const [query, overlay, panel, primary] of activities) {
      await page.goto(`${base}?scene=${query}`);
      await wait(page, overlay => document.querySelector(`#${overlay}-ui`)?.dataset.phase === 'ready', overlay);
      const root = `#${overlay}-ui`;
      const ready = await checkPanel(`${root} ${panel}`);
      // Reach the start action by real Tab presses. The menu must scroll its
      // focused action into view, with its price visible before Enter starts.
      for (let attempt = 0; attempt < 24 && !await page.locator(`${root} ${primary}`).evaluate(button => button === document.activeElement); attempt++) await page.keyboard.press('Tab');
      assert.equal(await page.locator(`${root} ${primary}`).evaluate(button => button === document.activeElement), true);
      const startVisible = await page.locator(`${root} ${primary}`).evaluate(button => {
        const r = button.getBoundingClientRect(), p = button.closest('section').getBoundingClientRect();
        return r.top >= p.top && r.bottom <= p.bottom && r.bottom <= innerHeight;
      });
      assert.equal(startVisible, true, 'the focused start button is inside its panel and viewport');
      assert.match(await page.locator(`${root} .daily-activity-note`).textContent(), /Énergie/);
      assert.equal(await page.locator(`${root} .daily-activity-note`).evaluate(note => {
        const r = note.getBoundingClientRect(), p = note.closest('section').getBoundingClientRect();
        return r.top >= p.top && r.bottom <= p.bottom;
      }), true, 'the daily price remains visible beside the focused start action');
      if (query === 'sparring') await page.screenshot({ path: `docs/compact-menu-sparring-${viewport.width}x${viewport.height}.png` });
      await page.keyboard.press('Enter');
      await wait(page, overlay => document.querySelector(`#${overlay}-ui`)?.dataset.phase === 'running', overlay);
      await page.keyboard.press('p');
      await wait(page, overlay => document.querySelector(`#${overlay}-ui`)?.dataset.phase === 'paused', overlay);
      const paused = await checkPanel(`${root} ${panel}`);
      await page.locator(`${root} .commands-open-button`).click();
      const commands = await checkPanel(`${root} .commands-panel`);
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      await wait(page, overlay => document.querySelector(`#${overlay}-ui`)?.dataset.phase === 'running', overlay);
      report.cases.push({ viewport, query, ready, paused, commands });
    }
    for (const place of ['home', 'gym', 'neighborhood']) {
      await page.goto(`${base}?scene=${place}`);
      await wait(page, place => document.querySelector('#stage')?.dataset.scene === place && document.querySelector('#gym-ui')?.dataset.mode === 'walking', place);
      await page.keyboard.press('p');
      await page.locator('.gym-pause-panel').waitFor({ state: 'visible' });
      const paused = await checkPanel('.gym-pause-panel');
      await page.locator('#gym-ui .commands-open-button').click();
      const commands = await checkPanel('#gym-ui .commands-panel');
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      await wait(page, () => document.querySelector('#gym-ui')?.dataset.mode === 'walking');
      report.cases.push({ viewport, query: place, paused, commands });
    }
    console.log(`${viewport.width}×${viewport.height}: sept menus d’activités, trois lieux, coûts accessibles, Tab/Entrée, pause et Commandes validés.`);
    await context.close(); context = null;
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  await page?.screenshot({ path: '/tmp/boxeur-compact-menu-failure.png' }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile('docs/compact-menus-browser-results.json', JSON.stringify(report, null, 2));
  await context?.close(); await browser.close();
}
