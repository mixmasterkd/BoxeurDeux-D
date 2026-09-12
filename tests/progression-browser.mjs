import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, fit, tapContact, buttonPoint, dispatch, joyPoint } from './control-helpers.mjs';
import { CAREER_VERSION } from '../src/game/CareerProfile.js';

const base = process.env.GAME_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true });
const errors = [], reports = [], measurements = [];
let failure = null;
const report = text => { reports.push(text); console.log(text); };
const read = page => page.evaluate(() => structuredClone(window.__rhythm.session.state));
const save = page => page.evaluate(() => JSON.parse(localStorage.getItem('boxeur-deux-d-career-v1')));
const world = page => page.evaluate(() => (window.__gym ?? window.__exploration)?.world.state);
const scene = (page, place) => wait(page, place => document.querySelector('#stage').dataset.scene === place
  && (place === 'gym' ? window.__gym?.world : window.__exploration?.scene.place === place), place);
async function walkAxis(page, axis, target) {
  const start = (await world(page))[axis];
  if (Math.abs(start - target) < 4) return;
  const positive = start < target;
  const key = axis === 'x' ? positive ? 'ArrowRight' : 'ArrowLeft' : positive ? 'ArrowDown' : 'ArrowUp';
  await page.keyboard.down(key);
  try {
    await wait(page, ({ axis, target, positive }) => {
      const state = (window.__gym ?? window.__exploration)?.world.state;
      return state && (positive ? state[axis] >= target - 3 : state[axis] <= target + 3);
    }, { axis, target, positive }, 14000);
  } finally { await page.keyboard.up(key); }
  assert.ok(Math.abs((await world(page))[axis] - target) < 30, `Ordinary walking reaches ${axis}=${target}`);
}
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
};
async function layout(page, mobile) {
  const result = await fit(page, '#rhythm-ui', mobile);
  assert.ok(result.fits && result.noScroll && Math.abs(result.ratio - 16 / 9) < .003, JSON.stringify(result));
  if (mobile) assert.ok(result.controls.length >= 4 && result.controls.every(c => c.fits && c.outside), JSON.stringify(result));
  else assert.equal(result.controls.length, 0, 'desktop has no overlaid controller');
  measurements.push({ case: 'layout', ...result });
}
async function open(page, activity) {
  await page.goto(new URL('?scene=' + activity, base).href);
  await wait(page, () => window.__rhythm?.session.state.phase === 'ready');
  assert.equal((await read(page)).duration, 45);
}
async function play(page, activity, cdp = null) {
  const points = cdp ? {
    a: await buttonPoint(page, '#rhythm-ui [data-pad-button="a"]'),
    b: await buttonPoint(page, '#rhythm-ui [data-pad-button="b"]'),
  } : null;
  const started = Date.now();
  if (cdp) {
    await page.locator('.rhythm-primary').focus();
    await tapContact(page, cdp, '#rhythm-ui [data-pad-button="a"]');
  } else await page.locator('.rhythm-primary').click();
  await wait(page, () => window.__rhythm.session.state.phase === 'running');
  let last = -1;
  while (true) {
    await wait(page, previous => {
      const s = window.__rhythm.session.state;
      return s.phase === 'finished' || (s.beat.index !== previous && s.beat.inputAt !== null && s.elapsed >= s.beat.inputAt - .02);
    }, last, 5000);
    const current = await read(page);
    if (current.phase === 'finished') break;
    last = current.beat.index;
    const left = current.beat.expected === 'jab';
    if (cdp) {
      await dispatch(cdp, 'touchStart', [points[left ? 'a' : 'b']]);
      await dispatch(cdp, 'touchEnd', []);
    }
    else await page.keyboard.press(left ? 'j' : 'k');
    if (last === 2) {
      // The touch protocol may return after the brief held pose on a busy
      // renderer; the captured scored-frame geometry still proves contact.
      await wait(page, index => window.__rhythm.session.state.player.phase === 'contact'
        || window.__rhythm.impacts.some(event => event.index === index), last);
      await page.screenshot({ path: 'docs/' + activity + (cdp ? '-mobile-paysage' : '-prototype') + '.png' });
    }
  }
  const final = await read(page);
  assert.ok(Date.now() - started >= 43000, 'full 45-second session, no clock injection');
  assert.ok(final.summary.qualified && final.summary.hits >= 20 && final.summary.accuracy >= 90, JSON.stringify(final.summary));
  const impacts = await page.evaluate(() => structuredClone(window.__rhythm.impacts));
  for (const event of impacts.filter(e => e.type === 'hit')) {
    assert.ok(event.visual, 'every scored event renders a contact');
    if (activity === 'rope') assert.ok(event.visual.rope.y > event.visual.feetY + 15 && event.visual.jump >= 20, JSON.stringify(event));
    else assert.ok(Math.hypot(event.visual.hand.x - event.visual.target.x, event.visual.hand.y - event.visual.target.y) <= 5, JSON.stringify(event));
  }
  assert.equal(await page.locator('.rhythm-conductor').isVisible(), false);
  measurements.push({ case: activity + (cdp ? '-touch' : '-keyboard'), seconds: (Date.now() - started) / 1000, summary: final.summary, impactCount: impacts.length });
  report(activity + ': full 45 s, ' + final.summary.hits + ' scored contacts, complete animations and saved reward (' + (cdp ? 'CDP touch A/B' : 'Playwright J/K') + ').');
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); watch(page);
  // The full neighborhood loop has its own tests. Start this focused regression
  // at the gym, then reach each station by ordinary walking and E.
  await page.goto(new URL('?scene=gym', base).href); await scene(page, 'gym');
  await page.keyboard.down('ArrowLeft');
  try { await wait(page, () => window.__gym.world.state.x <= 245); } finally { await page.keyboard.up('ArrowLeft'); }
  await wait(page, () => window.__gym.world.state.nearby?.id === 'corde');
  const origin = await page.evaluate(() => ({ x: window.__gym.world.state.x, y: window.__gym.world.state.y }));
  await page.keyboard.press('e');
  assert.match(await page.locator('.gym-dialog').textContent(), /endurance/i);
  await page.locator('[data-gym-action="rhythm"]').click();
  await wait(page, () => window.__rhythm?.session.state.activity === 'rope');
  assert.equal((await save(page)).daily.energy, 100, 'opening a workshop does not charge daily energy');
  await layout(page, false);
  await page.locator('.commands-open-button').click();
  assert.equal(await page.locator('.rhythm-command-actions').textContent(), 'J / K');
  await page.locator('.commands-back-button').click();
  await play(page, 'rope');
  assert.equal((await save(page)).stats.endurance, 102);
  assert.equal((await save(page)).version, CAREER_VERSION);
  assert.equal((await save(page)).daily.energy, 85, 'one full rope session charges its 15 points once');
  assert.match(await page.locator('.rhythm-reward').textContent(), /Endurance max \+2/);
  await page.locator('.rhythm-primary').click();
  await wait(page, () => window.__rhythm.session.state.phase === 'running');
  assert.equal((await save(page)).daily.energy, 70, 'restarting starts a new paid session');
  await page.keyboard.down('j');
  await page.keyboard.press('p');
  await wait(page, () => window.__rhythm.session.state.phase === 'paused');
  const frozen = await read(page);
  await page.waitForTimeout(220);
  assert.equal((await read(page)).elapsed, frozen.elapsed);
  await page.keyboard.up('j');
  await page.keyboard.press('Escape');
  await wait(page, () => window.__rhythm.session.state.phase === 'running');
  assert.equal((await save(page)).daily.energy, 70, 'pause and resume do not charge again');
  await page.locator('.activity-exit-button').click();
  await wait(page, () => window.__gym?.world);
  assert.deepEqual(await page.evaluate(() => ({ x: window.__gym.world.state.x, y: window.__gym.world.state.y })), origin);
  assert.equal((await save(page)).stats.endurance, 102, 'abandon/restart never doubles a reward');
  assert.equal((await save(page)).daily.energy, 70, 'abandon keeps the already-paid start cost');
  // Walk the clear front aisle then the right side of the ring to the speed ball.
  await page.keyboard.down('ArrowRight');
  try { await wait(page, () => window.__gym.world.state.x >= 1080); } finally { await page.keyboard.up('ArrowRight'); }
  await page.keyboard.down('ArrowUp');
  try { await wait(page, () => window.__gym.world.state.y <= 295); } finally { await page.keyboard.up('ArrowUp'); }
  await wait(page, () => window.__gym.world.state.nearby?.id === 'speedball');
  await page.keyboard.press('e'); await page.locator('[data-gym-action="rhythm"]').click();
  await wait(page, () => window.__rhythm?.session.state.activity === 'speedball');
  await play(page, 'speedball');
  assert.equal((await save(page)).stats.recovery, 1.02);
  assert.equal((await save(page)).daily.energy, 55);
  await page.locator('.activity-exit-button').click(); await scene(page, 'gym');
  report('Gym: walking to both workshops, E interaction, exact return, pause/restart, daily energy 100→85→70→55 and no duplicate reward verified.');

  await page.goto(base); await wait(page, () => !document.querySelector('#career-menu').hidden && window.__gym?.world);
  const before = await page.evaluate(() => ({ x: window.__gym.world.state.x, y: window.__gym.world.state.y }));
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await page.evaluate(() => ({ x: window.__gym.world.state.x, y: window.__gym.world.state.y })), before);
  const download = page.waitForEvent('download');
  await page.locator('.career-export').click();
  const backup = await download, text = await fs.readFile(await backup.path(), 'utf8');
  assert.equal(JSON.parse(text).stats.endurance, 102);
  assert.equal(JSON.parse(text).version, CAREER_VERSION);
  assert.deepEqual(JSON.parse(text).daily, { day: 1, energy: 55, maxEnergy: 100 });
  assert.equal(JSON.parse(text).location.scene, 'gym');
  await page.locator('.career-new').click(); await page.locator('.career-cancel').click();
  assert.equal((await save(page)).stats.endurance, 102);
  await page.locator('.career-continue').click();
  await scene(page, 'gym'); await page.waitForTimeout(150);
  assert.deepEqual((await save(page)).daily, { day: 1, energy: 55, maxEnergy: 100 });
  // The former gym poster is gone. Reach Béton through the actual gym exit,
  // scrolling neighborhood and community-hall entrance, without a scene URL.
  await walkAxis(page, 'y', 585); await walkAxis(page, 'x', 640); await walkAxis(page, 'y', 630);
  await page.keyboard.press('KeyE'); await scene(page, 'neighborhood');
  await walkAxis(page, 'x', 1900);
  assert.equal((await world(page)).nearby.id, 'fight');
  await page.keyboard.press('KeyE');
  await wait(page, () => document.querySelector('[data-gym-action="enter-fight"]'));
  await page.keyboard.press('Enter');
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  assert.match(await page.locator('#sparring-ui .activity-exit-button').textContent(), /Quartier/);
  assert.equal((await save(page)).daily.energy, 55, 'walking and entering Béton cost no daily energy');
  assert.equal(await page.evaluate(() => window.__sparring.session.state.settings.maxStamina), 102);
  assert.equal(await page.evaluate(() => window.__sparring.session.state.settings.recoveryBonus), .02);
  await page.locator('#sparring-ui .primary-button').click(); await page.keyboard.press('j');
  await wait(page, () => window.__sparring.session.state.stats.landed === 1);
  assert.equal((await save(page)).daily.energy, 55, 'the actual fight is free');
  assert.equal(await page.evaluate(() => window.__sparring.session.state.bout.resistance.remi), 88);
  // Allow actual opponent blows and a real count of ten to finish this bout.
  await wait(page, () => window.__sparring.session.state.phase === 'finished', undefined, 70000);
  assert.equal((await save(page)).fights.beton.losses, 1);
  const fightPlace = (await save(page)).location;
  assert.equal(fightPlace.scene, 'neighborhood');
  await page.goto(base); await wait(page, () => !document.querySelector('#career-menu').hidden);
  assert.equal((await save(page)).stats.endurance, 102);
  assert.equal((await save(page)).fights.beton.losses, 1);
  assert.deepEqual((await save(page)).daily, { day: 1, energy: 55, maxEnergy: 100 });
  await page.locator('.career-continue').click(); await scene(page, 'neighborhood'); await page.waitForTimeout(150);
  assert.deepEqual((await save(page)).location, fightPlace, 'Continue returns to the saved neighborhood entrance');
  report(`Progression: v${CAREER_VERSION} export, Continue/New cancellation, actual walk gym→neighborhood→Béton, trained bonuses, free bout and finished defeat persist with day/energy/location after reload.`);
  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const phone = await mobile.newPage(); watch(phone); const cdp = await mobile.newCDPSession(phone);
  await open(phone, 'rope'); await layout(phone, true);
  await phone.locator('.commands-open-button').tap();
  assert.equal(await phone.locator('.rhythm-command-actions').textContent(), 'A / B');
  await phone.locator('.commands-back-button').tap();
  await play(phone, 'rope', cdp);
  assert.equal((await save(phone)).stats.endurance, 102);
  assert.equal((await save(phone)).daily.energy, 85);
  await phone.locator('.rhythm-primary').tap();
  await wait(phone, () => window.__rhythm.session.state.phase === 'running');
  assert.equal((await save(phone)).daily.energy, 70);
  const a = await buttonPoint(phone, '#rhythm-ui [data-pad-button="a"]');
  await dispatch(cdp, 'touchStart', [a]);
  await phone.waitForTimeout(950);
  assert.equal((await read(phone)).stats.attempts, 1, 'holding A produces one jump only');
  await dispatch(cdp, 'touchCancel', []);
  await tapContact(phone, cdp, '#rhythm-ui .console-menu-button');
  await wait(phone, () => window.__rhythm.session.state.phase === 'paused');
  const paused = await read(phone);
  await phone.setViewportSize({ width: 390, height: 844 });
  await wait(phone, () => document.querySelector('#stage').inert);
  assert.equal(await phone.locator('#rotate-prompt').isVisible(), true);
  await phone.waitForTimeout(200);
  assert.equal((await read(phone)).elapsed, paused.elapsed);
  await phone.screenshot({ path: 'docs/rope-mobile-portrait.png' });
  await phone.setViewportSize({ width: 568, height: 320 });
  await wait(phone, () => !document.querySelector('#stage').inert);
  await layout(phone, true);
  await tapContact(phone, cdp, '#rhythm-ui [data-pad-button="a"]');
  await wait(phone, () => window.__rhythm.session.state.phase === 'running');
  assert.equal((await save(phone)).daily.energy, 70, 'mobile resume after portrait is free');
  await phone.waitForTimeout(300);
  assert.equal((await read(phone)).stats.attempts, 1, 'old touch does not resume after orientation');
  await phone.screenshot({ path: 'docs/rope-mobile-small.png' });
  await tapContact(phone, cdp, '#rhythm-ui .activity-exit-button');
  await wait(phone, () => window.__gym?.world);
  const direction = await joyPoint(phone, '#gym-ui', 'right', 1);
  const oldX = await phone.evaluate(() => window.__gym.world.state.x);
  await dispatch(cdp, 'touchStart', [direction]); await phone.waitForTimeout(160); await dispatch(cdp, 'touchEnd', []);
  assert.ok(await phone.evaluate(x => window.__gym.world.state.x > x, oldX));
  report('Mobile simulated: full A/B session, held/cancelled touch, joypad, portrait freeze, 844×390 and 568×320 with no scroll or action overlay. Not a physical-phone test.');
  await mobile.close();
  assert.deepEqual(errors, []);
  report('Progression browser checks passed.');
} catch (error) { failure = error.stack; throw error; }
finally {
  await fs.writeFile('docs/progression-browser-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), base, reports, measurements, errors, failure }, null, 2) + '\n');
  await browser.close();
}
