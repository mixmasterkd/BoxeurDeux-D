import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
const reports = [];
const state = page => page.evaluate(() => structuredClone(window.__sparring.session.state));
const wait = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 12000 });
const report = text => { reports.push(text); console.log(text); };
await fs.mkdir('docs', { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  // Observe real browser audio source scheduling without replacing its sound engine.
  await page.addInitScript(() => {
    window.__audioProbe = { contexts: [], starts: 0 };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); window.__audioProbe.contexts.push(this); }
    };
    for (const Type of [window.AudioBufferSourceNode, window.OscillatorNode]) {
      const start = Type.prototype.start;
      Type.prototype.start = function (...args) { window.__audioProbe.starts++; return start.apply(this, args); };
    }
  });
  await page.goto('http://127.0.0.1:5173/');
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  assert.equal(await page.evaluate(() => window.__audioProbe.contexts.length), 0, 'no audio context before any user gesture');
  await page.locator('[name="lesson"]').selectOption('jab');
  await wait(page, () => window.__sparring.session.state.training?.id === 'jab');
  await page.screenshot({ path: 'docs/lecons-accueil.png' });
  await page.locator('.primary-button').click();
  await wait(page, () => window.__audioProbe.contexts.some(c => c.state === 'running'));
  assert.ok(await page.evaluate(() => window.__audioProbe.starts > 0), 'the start gesture unlocks and plays the bell');

  for (const lesson of ['jab', 'guard', 'counter']) {
    if (lesson !== 'jab') {
      await page.locator('.next-lesson-button').click();
      await wait(page, id => window.__sparring.session.state.training?.id === id && window.__sparring.session.state.phase === 'running', lesson);
    }
    for (let repetition = 0; repetition < 3; repetition++) {
      if (lesson === 'jab') {
        if (repetition > 0) await wait(page, () => window.__sparring.session.state.remi.action === 'guard');
        await wait(page, () => window.__sparring.session.state.remi.action === 'open');
        await page.keyboard.press('j');
      } else {
        await wait(page, () => ['jab', 'cross'].includes(window.__sparring.session.state.remi.action) && window.__sparring.session.state.remi.progress < .1);
        const before = await state(page);
        if (lesson === 'guard') {
          await page.keyboard.down('Space');
          await wait(page, count => window.__sparring.session.state.stats.blocked > count, before.stats.blocked);
          assert.equal((await state(page)).training.progress, repetition, 'blocking alone does not complete a recovery cycle');
          if (repetition === 0) {
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
            await wait(page, () => window.__sparring.session.state.phase === 'paused');
            await page.keyboard.up('Space');
            await page.keyboard.press('p');
            await page.waitForTimeout(900);
            assert.equal((await state(page)).training.progress, 0, 'automatic release on focus loss is not a successful recovery exercise');
            await wait(page, () => ['jab', 'cross'].includes(window.__sparring.session.state.remi.action) && window.__sparring.session.state.remi.progress < .1);
            const blocked = (await state(page)).stats.blocked;
            await page.keyboard.down('Space');
            await wait(page, count => window.__sparring.session.state.stats.blocked > count, blocked);
          }
          await page.keyboard.up('Space');
        } else {
          await page.keyboard.press(before.remi.safeDodge === 'dodgeRight' ? 'ArrowRight' : 'ArrowLeft');
          await wait(page, count => window.__sparring.session.state.stats.dodged > count, before.stats.dodged);
          assert.equal((await state(page)).training.progress, repetition, 'dodging alone does not complete a counter');
          await wait(page, () => window.__sparring.session.state.remi.action === 'open' && window.__sparring.session.state.player.action === 'idle');
          await page.keyboard.press('j');
        }
      }
      await wait(page, count => window.__sparring.session.state.training.progress === count, repetition + 1);
      if (repetition === 0) {
        if (lesson === 'counter') await page.screenshot({ path: 'docs/lecon-riposte.png' });
        await page.keyboard.press('p');
        const frozen = (await state(page)).training;
        await page.waitForTimeout(450);
        assert.deepEqual((await state(page)).training, frozen, 'pausing freezes lesson state');
        const starts = await page.evaluate(() => window.__audioProbe.starts);
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => window.__audioProbe.starts), starts, 'no queued sounds during pause');
        await page.keyboard.press('p');
      }
    }
    await wait(page, () => window.__sparring.session.state.phase === 'finished');
    const finished = await state(page);
    assert.equal(finished.training.completed, true);
    assert.equal(finished.training.progress, 3);
    assert.ok(finished.elapsed < 60, 'a completed exercise ends before the time limit');
    assert.ok(finished.training.summary.positive && finished.training.summary.improve);
    await page.screenshot({ path: `docs/lecon-${lesson}-bilan.png` });
    report(`${lesson}: three real repetitions, pause/resume, completion and coaching report passed.`);
  }
  await page.locator('.primary-button').click();
  await wait(page, () => window.__sparring.session.state.phase === 'running');
  assert.equal((await state(page)).training.progress, 0, 'retry resets the current exercise');
  await page.keyboard.press('p');
  await page.locator('.choose-session-button').click();
  await page.locator('[name="lesson"]').selectOption('free');
  await page.locator('.primary-button').click();
  await wait(page, () => window.__sparring.session.state.phase === 'running');
  assert.equal((await state(page)).training, null, 'return to free sparring');
  report('Retry and return to free sparring passed; audio starts on gesture and stops on pause.');
  await page.keyboard.press('m');
  assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => window.__sparring.audio.sources.size), 0, 'mute cancels current sound sources');
  const mutedStarts = await page.evaluate(() => window.__audioProbe.starts);
  await page.keyboard.press('j');
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.__audioProbe.starts), mutedStarts, 'muted impacts stay silent');
  await page.keyboard.press('p');
  await page.locator('[name="volume"]').focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowRight');
  await page.reload();
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  assert.equal(await page.evaluate(() => window.__audioProbe.contexts.length), 0);
  assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[name="volume"]').inputValue(), '20');
  await page.locator('.primary-button').click();
  assert.equal(await page.evaluate(() => window.__audioProbe.contexts.length), 0, 'muted start does not need an audio device');
  await page.keyboard.press('m');
  await wait(page, () => window.__audioProbe.contexts.some(c => c.state === 'running'));
  report('Mute, volume persistence, silent reload and gesture-based reactivation passed.');

  const silent = await browser.newPage();
  silent.on('pageerror', e => errors.push(e.message));
  await silent.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await silent.goto('http://127.0.0.1:5173/');
  await wait(silent, () => window.__sparring?.session.state.phase === 'ready');
  assert.equal(await silent.locator('.audio-button').isDisabled(), true);
  await silent.locator('.primary-button').click();
  await silent.keyboard.press('j');
  await wait(silent, () => window.__sparring.session.state.stats.landed === 1);
  report('Without Web Audio, the unavailable sound control is disabled and sparring remains playable.');
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile('docs/training-browser-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), reports, errors }, null, 2) + '\n');
  await browser.close();
}
