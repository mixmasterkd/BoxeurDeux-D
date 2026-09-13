// Verify actual rendered pixels, not just the player's visible flag or position.
// The boxer must remain drawn along both side aisles and at the upper ateliers.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) {
  try { modulePath = require.resolve('playwright'); }
  catch { modulePath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'); }
}
const { chromium } = await import(pathToFileURL(modulePath));
const canvas = process.env.GYM_RENDERER === 'canvas';
const browser = await chromium.launch({ headless: true, args: canvas ? ['--disable-webgl'] : [] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /mask.*not supported/i.test(message.text())) errors.push(message.text());
  });
  await page.goto('http://127.0.0.1:5173/?scene=gym');
  await page.waitForFunction(() => window.__gym?.world);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => window.__gym.scene.game.renderer.type), canvas ? 1 : 2);
  const move = async (axis, target) => {
    const value = await page.evaluate(axis => window.__gym.world.state[axis], axis);
    if (Math.abs(value - target) < 4) return;
    const sign = Math.sign(target - value);
    const key = axis === 'x' ? sign > 0 ? 'KeyD' : 'KeyA' : sign > 0 ? 'KeyS' : 'KeyW';
    await page.keyboard.down(key);
    try { await page.waitForFunction(({ axis, sign, target }) => (window.__gym.world.state[axis] - target) * sign >= 0, { axis, sign, target }, { timeout: 10000 }); }
    catch (error) { console.error(axis, target, await page.evaluate(() => window.__gym.world.state)); throw error; }
    finally { await page.keyboard.up(key); }
  };
  for (const [name, points] of [
    ['sac', [['x', 310], ['y', 310], ['x', 265]]],
    ['miroir', [['x', 154], ['y', 245]]],
    ['speedball', [['y', 310], ['x', 300], ['y', 595], ['x', 1100], ['y', 276]]],
  ]) {
    for (const [axis, target] of points) await move(axis, target);
    const gameCanvas = page.locator('#game canvas');
    await page.screenshot({ path: `docs/gym-visible-${name}${canvas ? '-canvas' : ''}.png` });
    const shown = (await gameCanvas.screenshot()).toString('base64');
    await page.evaluate(() => window.__gym.scene.player.setVisible(false));
    await page.waitForTimeout(120);
    const hidden = (await gameCanvas.screenshot()).toString('base64');
    await page.evaluate(() => window.__gym.scene.player.setVisible(true));
    const changed = await page.evaluate(async ({ shown, hidden }) => {
      const decode = async source => {
        const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const a = await decode(shown), b = await decode(hidden);
      let count = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) count++;
      return count;
    }, { shown, hidden });
    console.log(`${canvas ? 'Canvas' : 'WebGL'} ${name}: ${changed} visible boxer pixels`);
    assert.ok(changed > 600, `the boxer must actually appear near ${name}, even when his depth is behind the ring`);
    await page.keyboard.press('e');
    await page.locator('.gym-dialog').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
