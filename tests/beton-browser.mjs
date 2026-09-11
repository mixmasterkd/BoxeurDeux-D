import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, joyPoint, buttonPoint, dispatch, tapContact, fit } from './control-helpers.mjs';

// Real browser input and elapsed time only. The development bridge is observed,
// never used to call model actions, change a clock, or manufacture a result.
const base = process.env.BETON_URL ?? 'http://127.0.0.1:5173/';
const selected = process.env.BETON_CASE;
const cases = new Set(selected ? selected.split(',') : ['desktop', 'defeat', 'corner', 'mobile']);
for (const name of cases) assert.ok(['desktop', 'defeat', 'corner', 'mobile'].includes(name), `Unknown BETON_CASE: ${name}`);
const reports = [], errors = [], measurements = [];
const browser = await chromium.launch({ headless: true });
let activePage, failure;
const state = page => page.evaluate(() => structuredClone(window.__sparring.session.state));
const report = message => { reports.push(message); console.log(message); };

async function context(mobile = false) {
  const current = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
  // A touchscreen-equipped PC must still hide the on-screen controller.
  if (!mobile) await current.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 10 }));
  const page = await current.newPage(); activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return { current, page, cdp: mobile ? await current.newCDPSession(page) : null };
}

async function layout(page, mobile) {
  const value = await fit(page, '#sparring-ui', mobile);
  assert.deepEqual([value.width, value.height], [1280, 720]);
  assert.ok(Math.abs(value.ratio - 16 / 9) < .004 && value.fits && value.noScroll, JSON.stringify(value));
  assert.equal(value.controls.length, mobile ? 4 : 0, 'only mobile shows the joypad, A, B and menu');
  for (const control of value.controls) assert.ok(control.outside && control.fits && control.width >= 43 && control.height >= 43, JSON.stringify(control));
  measurements.push({ case: 'layout', ...value });
}

async function menuGeometry(page, mobile) {
  await page.locator('.round-panel .primary-button').scrollIntoViewIfNeeded();
  const value = await page.locator('.round-panel').evaluate((panel, mobile) => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const button = panel.querySelector('.primary-button'), r = button.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { case: 'menu-geometry', viewport: [innerWidth, innerHeight], phase: window.__sparring.session.state.phase,
      panel: rect(panel), area: rect(document.querySelector(mobile ? '#play-area' : 'canvas')),
      noHorizontalScroll: panel.scrollWidth <= panel.clientWidth + 1,
      actionable: !button.disabled && (hit === button || button.contains(hit)) };
  }, mobile);
  const { panel, area } = value;
  assert.ok(panel.x >= area.x - 1 && panel.y >= area.y - 1 && panel.right <= area.right + 1 && panel.bottom <= area.bottom + 1, JSON.stringify(value));
  assert.ok(value.noHorizontalScroll && value.actionable, JSON.stringify(value));
  measurements.push(value);
}

async function hud(page) {
  await wait(page, () => {
    const b = window.__sparring.session.state.bout;
    return ['player', 'remi'].every(who => Number(document.querySelector(`[data-resistance="${who}"]`)?.getAttribute('aria-valuenow')) === Math.ceil(b.resistance[who]))
      && document.querySelector('.combat-score')?.textContent === `VOUS ${b.score.player} · ${b.score.remi} BÉTON`;
  });
  if (['running', 'knockdown'].includes((await state(page)).phase)) {
    assert.equal(await page.locator('.combat-score').isVisible(), true);
    for (const who of ['player', 'remi']) assert.equal(await page.locator(`[data-resistance="${who}"]`).isVisible(), true);
  }
  assert.equal(await page.locator('.opponent-info .fighter-name').textContent(), 'Béton');
}

async function ready(page, { fromGym = false, cdp = null } = {}) {
  await page.goto(new URL(fromGym ? '' : '?scene=fight', base).href);
  let origin = null;
  if (fromGym) {
    await wait(page, () => window.__gym?.world);
    // The display stand stops feet at y=585. The spawn aisle already provides
    // the correct approach; walking into its collider is unnecessary.
    await page.keyboard.down('ArrowRight');
    try { await wait(page, () => window.__gym.world.state.x >= 1010); }
    finally { await page.keyboard.up('ArrowRight'); }
    await wait(page, () => window.__gym.world.state.nearby?.id === 'combat');
    origin = await page.evaluate(() => ({ x: window.__gym.world.state.x, y: window.__gym.world.state.y }));
    await page.keyboard.press('e');
    await page.locator('.gym-fight-button[data-gym-action="fight"]').click();
    report(`Desktop: actual walk to the fight display and E interaction (${origin.x.toFixed(1)}, ${origin.y.toFixed(1)}).`);
  }
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  const current = await state(page);
  assert.equal(current.settings.opponent, 'beton');
  assert.equal(await page.evaluate(() => window.__sparring.scene.children.list.find(item => item.type === 'Image')?.texture.key), 'fight-hall', 'the official fight renders its dedicated venue');
  assert.equal(current.settings.lesson, 'resistance');
  assert.equal(current.remaining, 60);
  assert.equal(current.bout.rounds, 3);
  assert.deepEqual(current.bout.resistance, { player: 100, remi: 100 });
  assert.deepEqual(current.bout.score, { player: 0, remi: 0 });
  assert.equal(await page.locator('[name="tempo"]').isVisible(), false, 'Béton has an authored rhythm');
  assert.match(await page.locator('.combat-rules').textContent(), /3 rounds de 60 s/);
  assert.match(await page.locator('.gym-location').textContent(), /SALLE DE BOXE/);
  await layout(page, Boolean(cdp)); await menuGeometry(page, Boolean(cdp));
  return origin;
}

async function start(page, cdp = null) {
  // Explicitly focus the ordinary start button, then use the shared confirm
  // key/controller action. No session method is invoked by the test.
  await page.locator('.primary-button').focus();
  if (cdp) await tapContact(page, cdp, '#sparring-ui [data-pad-button="a"]');
  else await page.keyboard.press('Enter');
  await wait(page, () => window.__sparring.session.state.phase === 'running');
}

async function controller(page, cdp = null) {
  const points = cdp ? {
    a: await buttonPoint(page, '#sparring-ui [data-pad-button="a"]', 2),
    b: await buttonPoint(page, '#sparring-ui [data-pad-button="b"]', 2),
    head: await joyPoint(page, '#sparring-ui', 'up', 1),
    body: await joyPoint(page, '#sparring-ui', 'down', 1),
  } : null;
  let level = null;
  return {
    async guard(next) {
      if (level === next) return;
      if (cdp) {
        if (next) await dispatch(cdp, level ? 'touchMove' : 'touchStart', [points[next]]);
        else if (level) await dispatch(cdp, 'touchEnd', [points[level]]);
      } else {
        if (level) await page.keyboard.up(level === 'head' ? 'ArrowUp' : 'ArrowDown');
        if (next) await page.keyboard.down(next === 'head' ? 'ArrowUp' : 'ArrowDown');
      }
      level = next;
    },
    async punch(action) {
      if (cdp) {
        const point = points[action === 'jab' ? 'a' : 'b'];
        await dispatch(cdp, 'touchStart', [...(level ? [points[level]] : []), point]);
        await dispatch(cdp, 'touchEnd', [point]);
      } else await page.keyboard.press(action === 'jab' ? 'j' : 'k');
    },
  };
}

async function fightUntilStop(page, input, { counter = false, exposeBody = 0, timeout = 90000 } = {}) {
  const deadline = Date.now() + timeout;
  let queue = [], openingUsed = false;
  try {
    while (Date.now() < deadline) {
      const current = await state(page);
      if (['between', 'finished'].includes(current.phase)) return current;
      assert.ok(['running', 'knockdown'].includes(current.phase), `Unexpected phase: ${current.phase}`);
      if (current.phase === 'knockdown') {
        queue = []; openingUsed = false; await input.guard(null);
        assert.equal(current.bout.count.downed.player, false, 'the guard-and-counter strategy should prevent player falls');
        await page.waitForTimeout(70); continue;
      }
      const r = current.remi;
      const attack = ['jab', 'cross'].includes(r.action);
      // React to the tell before contact, then release after the committed
      // attack. Do not drain endurance throughout every preparation phase.
      const lateTell = r.action.startsWith('tell') && r.duration * (1 - r.progress) < .33;
      const deliberateOpening = r.target === 'body' && current.stats.receivedBody < exposeBody;
      await input.guard((attack || lateTell) && !deliberateOpening ? r.target : null);
      const longOpening = r.action === 'open' && r.duration >= 1.7;
      if (!longOpening) openingUsed = false;
      if (counter && !queue.length && !openingUsed && longOpening && r.duration * (1 - r.progress) >= 1.6
        && current.player.action === 'idle' && current.stamina >= 48) {
        queue = ['jab', 'cross', 'jab']; openingUsed = true;
      }
      if (queue.length && current.player.action === 'idle') {
        // Counter only in the announced opening. A delayed test driver may
        // miss an opportunity; it must never attack through a new tell.
        // A scored jab temporarily presents the opponent as `hit` while his
        // scheduled opening continues; that reaction must not cancel JKJ.
        if (r.action === 'open' || r.action === 'hit') await input.punch(queue.shift());
        else queue = [];
      }
      await page.waitForTimeout(35);
    }
    assert.fail(`Fight did not reach a round break or finish within ${timeout} ms`);
  } finally { await input.guard(null); }
}

async function resetChecks(page) {
  await wait(page, () => window.__sparring.session.state.phase === 'running');
  const restarted = await state(page);
  assert.equal(restarted.settings.opponent, 'beton');
  assert.equal(restarted.bout.round, 1);
  assert.equal(restarted.bout.result, null); assert.equal(restarted.bout.count, null);
  assert.deepEqual(restarted.bout.score, { player: 0, remi: 0 });
  assert.deepEqual(restarted.bout.resistance, { player: 100, remi: 100 });
  assert.deepEqual(restarted.bout.downs, { player: { round: 0, total: 0 }, remi: { round: 0, total: 0 } });
  assert.deepEqual(restarted.bout.roundHistory, []);
  assert.equal(restarted.stats.landed + restarted.stats.received + restarted.stats.combos, 0);
}

async function returnGym(page, origin = null, cdp = null) {
  if (cdp) await tapContact(page, cdp, '#sparring-ui .activity-exit-button');
  else await page.locator('.activity-exit-button').click();
  await wait(page, () => document.querySelector('#gym-ui') && window.__gym?.world);
  const returned = await page.evaluate(() => ({ x: window.__gym.world.state.x, y: window.__gym.world.state.y }));
  if (origin) assert.deepEqual(returned, origin, 'returning preserves the actual gym position');
  measurements.push({ case: 'return-gym', origin, returned });
}

async function cornerChecks(page, mobile) {
  const current = await state(page);
  assert.equal(current.phase, 'between'); assert.equal(current.bout.round, 1);
  assert.equal(current.bout.roundHistory.length, 1);
  assert.equal(current.bout.roundHistory[0].duration, 60);
  assert.equal(await page.locator('.corner-vignette img').isVisible(), true);
  await wait(page, () => { const image = document.querySelector('.corner-vignette img'); return image?.complete && image.naturalWidth > 0; });
  assert.equal(await page.locator('.corner-advice p').textContent(), current.bout.coach);
  assert.ok(current.bout.coach.length > 30);
  assert.match(await page.locator('.round-detail').textContent(), /Points du combat/);
  await hud(page); await layout(page, mobile); await menuGeometry(page, mobile);
  const artwork = await page.locator('.corner-vignette img').evaluate(image => {
    const r = image.getBoundingClientRect();
    return { case: 'corner-art', viewport: [innerWidth, innerHeight], source: image.getAttribute('src'), natural: [image.naturalWidth, image.naturalHeight], width: r.width, height: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom };
  });
  assert.ok(artwork.width >= 100 && artwork.height >= 80, JSON.stringify(artwork));
  assert.ok(artwork.x >= -1 && artwork.y >= -1 && artwork.right <= (await page.viewportSize()).width + 1 && artwork.bottom <= (await page.viewportSize()).height + 1, JSON.stringify(artwork));
  measurements.push(artwork, { case: 'corner-state', mobile, state: current });
  return current;
}

async function nextRoundChecks(page, before, cdp = null) {
  await page.locator('.next-round-button').focus();
  if (cdp) await tapContact(page, cdp, '#sparring-ui [data-pad-button="a"]');
  else await page.keyboard.press('Enter');
  await wait(page, () => window.__sparring.session.state.phase === 'running');
  const after = await state(page);
  assert.equal(after.bout.round, 2);
  assert.equal(after.stamina, 100);
  assert.deepEqual(after.bout.score, before.bout.score);
  for (const who of ['player', 'remi']) {
    assert.equal(after.bout.resistance[who], Math.min(100, before.bout.resistance[who] + 20));
    assert.equal(after.bout.downs[who].round, 0);
    assert.equal(after.bout.downs[who].total, before.bout.downs[who].total);
  }
  assert.equal(after.bout.roundHistory.length, 1);
  return after;
}

async function frozen(page) {
  const before = await state(page); assert.equal(before.phase, 'paused');
  await page.waitForTimeout(450);
  const after = await state(page);
  assert.equal(after.remaining, before.remaining);
  assert.deepEqual(after.bout, before.bout);
  const controls = await page.evaluate(() => {
    const c = window.__sparring.ui.controls;
    return { keys: c.keys.size, pointers: c.pointers.size, pad: c.padId, guard: c.guard };
  });
  assert.deepEqual(controls, { keys: 0, pointers: 0, pad: null, guard: null });
}

try {
  await fs.mkdir('docs', { recursive: true });
  if (cases.has('desktop')) {
    report('Desktop: walking from the gym, then reading tells and countering with real J–K–J.');
    const { current, page } = await context();
    const origin = await ready(page, { fromGym: true });
    await page.screenshot({ path: 'docs/beton-ready.png' });
    await start(page);
    await page.screenshot({ path: 'docs/beton-combat.png' });
    const input = await controller(page), began = Date.now();
    let result;
    for (let round = 1; round <= 3; round++) {
      result = await fightUntilStop(page, input, { counter: true, timeout: 105000 });
      if (result.phase === 'finished') break;
      report(`Desktop: round ${round} ended, continuing the actual fight.`);
      await page.locator('.next-round-button').click();
      await wait(page, () => window.__sparring.session.state.phase === 'running');
    }
    assert.equal(result.phase, 'finished');
    assert.equal(result.bout.result.winner, 'player');
    assert.ok(result.stats.blockedHead > 0 && result.stats.blockedBody > 0);
    assert.ok(result.stats.combos >= 2, 'the winner really used the JKJ hook combo');
    assert.equal(result.stats.received, 0);
    assert.equal(result.bout.score.player, result.stats.landed + result.bout.downs.remi.total * 3);
    assert.equal(result.bout.score.remi, 0);
    assert.match(await page.locator('.panel-heading').textContent(), /Victoire/);
    await hud(page); await menuGeometry(page, false);
    await page.screenshot({ path: 'docs/beton-victory.png' });
    measurements.push({ case: 'desktop-victory', wallSeconds: (Date.now() - began) / 1000, state: result });
    await page.locator('.primary-button').click(); await resetChecks(page);
    await returnGym(page, origin);
    report('Desktop: genuine victory, both guard heights, complete combos, score, revenge reset and exact return position verified.');
    await current.close();
  }

  if (cases.has('defeat')) {
    report('Defeat: allowing real hits and observing the full ten-count without a recovery input.');
    const { current, page } = await context(); await ready(page); await start(page);
    await wait(page, () => window.__sparring.session.state.phase === 'knockdown', undefined, 70000);
    await wait(page, () => window.__sparring.session.state.bout.count.stage === 'count');
    const down = await state(page), countStarted = Date.now();
    assert.equal(down.bout.count.downed.player, true);
    assert.equal(down.bout.resistance.player, 0);
    await page.screenshot({ path: 'docs/beton-down.png' });
    await wait(page, () => window.__sparring.session.state.phase === 'finished', undefined, 15000);
    const lost = await state(page);
    assert.ok(Date.now() - countStarted >= 8500, 'the real ten-count, without speeding the clock');
    assert.deepEqual(lost.bout.result, { reason: 'ko', winner: 'remi', loser: 'player' });
    assert.equal(lost.bout.count.number, 10);
    assert.equal(lost.bout.score.remi, lost.stats.received + 3);
    assert.match(await page.locator('.panel-heading').textContent(), /Béton l’emporte/);
    await hud(page); await menuGeometry(page, false);
    await page.screenshot({ path: 'docs/beton-defeat.png' });
    measurements.push({ case: 'defeat', state: lost });
    await page.locator('.primary-button').click(); await resetChecks(page);
    await returnGym(page);
    report('Defeat: actual KO at ten, opponent points, defeat text and a clean revenge verified.');
    await current.close();
  }

  if (cases.has('corner')) {
    report('Corner: playing a complete sixty-second round, leaving two body hits open to verify real recovery and specific advice.');
    const { current, page } = await context(); await ready(page);
    const input = await controller(page); await start(page);
    await input.punch('jab');
    await fightUntilStop(page, input, { exposeBody: 2 });
    const before = await cornerChecks(page, false);
    assert.equal(before.stats.receivedBody, 2); assert.equal(before.stats.receivedHead, 0);
    assert.equal(before.bout.resistance.player, 64);
    assert.match(before.bout.coach, /direct vise le corps/);
    assert.deepEqual(before.bout.score, { player: 1, remi: 2 });
    await page.screenshot({ path: 'docs/beton-corner-desktop.png' });
    const after = await nextRoundChecks(page, before);
    assert.equal(after.bout.resistance.player, 84, 'the break actually restores twenty points, not a reset to full');
    await returnGym(page);
    report('Corner desktop: genuine round history, loaded coach artwork, advice from body hits, score and +20 resistance/endurance reset verified.');
    await current.close();
  }

  if (cases.has('mobile')) {
    report('Mobile: actual touch A/B attacks, an unassisted fall, pause/portrait, six alternating get-up presses and joypad defense.');
    const { current, page, cdp } = await context(true); await ready(page, { cdp });
    let input = await controller(page, cdp); await start(page, cdp);
    await input.punch('jab');
    await wait(page, () => window.__sparring.session.state.player.action === 'idle');
    await input.punch('cross');
    await wait(page, () => window.__sparring.session.state.stats.landed === 2);
    assert.deepEqual((await state(page)).bout.score, { player: 2, remi: 0 });
    await page.screenshot({ path: 'docs/beton-mobile-combat.png' });
    await wait(page, () => window.__sparring.session.state.phase === 'knockdown', undefined, 70000);
    await wait(page, () => window.__sparring.session.state.bout.count.stage === 'count');
    await tapContact(page, cdp, '#sparring-ui .console-menu-button');
    await wait(page, () => window.__sparring.session.state.phase === 'paused'); await frozen(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(page, () => document.querySelector('#stage').inert);
    assert.equal(await page.locator('#rotate-prompt').isVisible(), true); await frozen(page);
    await page.keyboard.press('p'); assert.equal((await state(page)).phase, 'paused');
    await page.screenshot({ path: 'docs/beton-mobile-portrait.png' });
    await page.setViewportSize({ width: 844, height: 390 });
    await wait(page, () => !document.querySelector('#stage').inert);
    input = await controller(page, cdp);
    await tapContact(page, cdp, '#sparring-ui [data-pad-button="a"]');
    await wait(page, () => window.__sparring.session.state.phase === 'knockdown');
    for (let accepted = 0; accepted < 6; accepted++) {
      await wait(page, () => document.querySelector('#sparring-ui .is-recovery-next'));
      const letter = await page.locator('#sparring-ui .is-recovery-next').getAttribute('data-pad-button');
      assert.equal(letter, accepted % 2 ? 'b' : 'a');
      await input.punch(letter === 'a' ? 'jab' : 'cross');
      await wait(page, value => window.__sparring.session.state.bout.count.accepted === value, accepted + 1);
    }
    await page.screenshot({ path: 'docs/beton-mobile-recovery.png' });
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    const risen = await state(page);
    assert.equal(risen.bout.resistance.player, 55); assert.equal(risen.bout.downs.player.total, 1);
    await fightUntilStop(page, input);
    const before = await state(page);
    assert.equal(before.phase, 'between'); assert.equal(before.bout.resistance.player, 55);
    assert.ok(before.stats.blockedHead > 0 && before.stats.blockedBody > 0, 'joypad defended both heights after the actual get-up');
    for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(120);
      await cornerChecks(page, true);
      await page.screenshot({ path: `docs/beton-corner-mobile-${viewport.width}.png` });
    }
    const after = await nextRoundChecks(page, before, cdp);
    assert.equal(after.bout.resistance.player, 75);
    await returnGym(page, null, cdp);
    report('Mobile viewport simulation: A/B contact and get-up, joypad high/low guard, frozen portrait/count, a real round and coach corner at 844×390, 667×375 and 568×320 verified; this is not a physical-phone test.');
    await current.close();
  }
  assert.deepEqual(errors, []);
  report('Béton browser checks passed without page, console or HTTP errors.');
} catch (error) {
  failure = error.stack ?? error.message;
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: 'docs/beton-failure.png' }).catch(() => {});
    console.error('State at failure:', JSON.stringify(await state(activePage).catch(() => ({}))));
  }
  throw error;
} finally {
  await fs.mkdir('docs', { recursive: true });
  await fs.writeFile(`docs/beton-${selected ? `${selected.replaceAll(',', '-')}-` : ''}browser-results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), selectedCase: selected ?? 'all', base, reports, measurements, errors, failure }, null, 2) + '\n');
  await browser.close();
}
