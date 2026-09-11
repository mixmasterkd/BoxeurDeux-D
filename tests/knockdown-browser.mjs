import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, joyPoint, buttonPoint, dispatch, tapContact, fit } from './control-helpers.mjs';

// These checks play with actual keyboard / touchscreen events. They never
// accelerate the clock, modify resistance, or call a session action directly.
const base = process.env.KNOCKDOWN_URL ?? 'http://127.0.0.1:5173/';
const selected = process.env.KNOCKDOWN_CASE;
const cases = new Set(selected ? selected.split(',') : ['desktop', 'mobile', 'ko', 'round']);
const browser = await chromium.launch({ headless: true });
const reports = [], errors = [], measurements = [];
let activePage, failure;
const state = page => page.evaluate(() => structuredClone(window.__sparring.session.state));
const report = message => { reports.push(message); console.log(message); };
const pause = async page => { await page.keyboard.press('p'); await wait(page, () => window.__sparring.session.state.phase === 'paused'); };
const resume = async (page, expected) => { await page.keyboard.press('p'); await wait(page, phase => window.__sparring.session.state.phase === phase, expected); };
const countAccepted = value => value.bout.count.accepted;

function watch(page) {
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}

async function context(mobile = false) {
  const current = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
  if (!mobile) await current.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 10 }));
  const page = await current.newPage(); watch(page);
  return { context: current, page, cdp: mobile ? await current.newCDPSession(page) : null };
}

async function checkLayout(page, mobile) {
  const value = await fit(page, '#sparring-ui', mobile);
  assert.deepEqual([value.width, value.height], [1280, 720]);
  assert.ok(Math.abs(value.ratio - 16 / 9) < .004 && value.fits && value.noScroll, JSON.stringify(value));
  if (mobile) {
    assert.equal(value.controls.length, 4, 'joypad, A, B and menu remain in the margins');
    for (const control of value.controls) assert.ok(control.outside && control.fits && control.width >= 43 && control.height >= 43, JSON.stringify(control));
    for (const letter of ['a', 'b']) assert.equal(await page.locator(`#sparring-ui [data-pad-button="${letter}"] .control-key`).textContent(), letter.toUpperCase());
  } else assert.equal(value.controls.length, 0, 'desktop never displays live touch controls');
  measurements.push(value);
}

async function checkResistanceHUD(page) {
  await wait(page, () => ['player', 'remi'].every(who => {
    const meter = document.querySelector(`[data-resistance="${who}"]`);
    return Number(meter?.getAttribute('aria-valuenow')) === Math.ceil(window.__sparring.session.state.bout.resistance[who]);
  }));
  for (const who of ['player', 'remi']) {
    const meter = page.locator(`[data-resistance="${who}"]`);
    assert.equal(await meter.isVisible(), true, `${who} resistance stays visible during active play and knockdowns`);
    assert.equal(await meter.getAttribute('role'), 'progressbar');
    assert.equal(Number(await meter.getAttribute('aria-valuemax')), 100);
  }
}

async function checkCountGeometry(page) {
  const value = await page.evaluate(() => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const card = document.querySelector('.knockdown-panel');
    return {
      case: 'active-count-geometry', viewport: [innerWidth, innerHeight], canvas: rect(document.querySelector('canvas')), card: rect(card),
      noCardHorizontalScroll: card.scrollWidth <= card.clientWidth + 1,
      hud: [...document.querySelectorAll('.resistance-panel, .round-clock, .session-caption')].filter(visible).map(element => ({ name: element.className, ...rect(element) })),
    };
  });
  measurements.push(value);
  const { canvas, card } = value;
  assert.ok(card.x >= canvas.x - 1 && card.y >= canvas.y - 1 && card.right <= canvas.right + 1 && card.bottom <= canvas.bottom + 1,
    `the active count card fits inside the frame: ${JSON.stringify(value)}`);
  assert.ok(value.noCardHorizontalScroll, 'count instructions do not overflow horizontally');
  for (const item of value.hud) {
    const width = Math.min(card.right, item.right) - Math.max(card.x, item.x);
    const height = Math.min(card.bottom, item.bottom) - Math.max(card.y, item.y);
    assert.ok(width <= 1 || height <= 1, `count card does not cover ${item.name}: ${JSON.stringify(value)}`);
  }
}

async function checkBoutMenu(page, mobile) {
  await page.locator('.round-panel .primary-button').scrollIntoViewIfNeeded();
  const value = await page.locator('.round-panel').evaluate((panel, mobile) => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    };
    const control = panel.querySelector('.primary-button');
    const button = control.getBoundingClientRect();
    const hit = document.elementFromPoint(button.x + button.width / 2, button.y + button.height / 2);
    return { case: 'bout-menu', mobile, phase: window.__sparring.session.state.phase,
      panel: rect(panel), container: rect(document.querySelector(mobile ? '#play-area' : 'canvas')),
      noHorizontalScroll: panel.scrollWidth <= panel.clientWidth + 1,
      pageFits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
      actionable: !control.disabled && (hit === control || control.contains(hit)) };
  }, mobile);
  const { panel, container } = value;
  measurements.push(value);
  assert.ok(panel.x >= container.x - 1 && panel.y >= container.y - 1 && panel.right <= container.right + 1 && panel.bottom <= container.bottom + 1,
    `the bout menu fits its available area: ${JSON.stringify(value)}`);
  assert.ok(value.noHorizontalScroll && value.pageFits && value.actionable, JSON.stringify(value));
}

async function begin(page, { cdp = null, tempo = 'normal', fromGym = false } = {}) {
  await page.goto(new URL(fromGym ? '' : '?scene=sparring', base).href);
  if (fromGym) {
    await wait(page, () => window.__gym?.world);
    for (const [axis, target, key] of [['x', 915, 'ArrowRight'], ['y', 520, 'ArrowUp']]) {
      await page.keyboard.down(key);
      try { await wait(page, ({ axis, target, sign }) => (window.__gym.world.state[axis] - target) * sign >= 0, { axis, target, sign: key === 'ArrowUp' ? -1 : 1 }); }
      finally { await page.keyboard.up(key); }
    }
    await wait(page, () => window.__gym.world.state.nearby?.id === 'remi');
    await page.keyboard.press('e');
    await page.locator('.gym-session-button[data-lesson="resistance"]').click();
  }
  await wait(page, () => window.__sparring?.session.state.phase === 'ready');
  if (!fromGym) await page.locator('[name="lesson"]').selectOption('resistance');
  await wait(page, () => window.__sparring.session.state.settings.lesson === 'resistance');
  await page.locator('[name="tempo"]').selectOption(tempo);
  const ready = await state(page);
  assert.equal(ready.bout.round, 1); assert.equal(ready.bout.rounds, 3);
  assert.equal(ready.remaining, 60, 'the default bout round is actually sixty seconds');
  assert.deepEqual(ready.bout.resistance, { player: 100, remi: 100 });
  await checkBoutMenu(page, Boolean(cdp));
  if (cdp) await tapContact(page, cdp, '#sparring-ui [data-pad-button="a"]');
  else await page.locator('.primary-button').click();
  await wait(page, () => window.__sparring.session.state.phase === 'running');
  await checkLayout(page, Boolean(cdp));
  await checkResistanceHUD(page);
}

async function press(page, action, cdp) {
  if (cdp) await tapContact(page, cdp, `#sparring-ui [data-pad-button="${action === 'jab' ? 'a' : 'b'}"]`);
  else await page.keyboard.press(action === 'jab' ? 'j' : 'k');
}

async function awaitDown(page, who, timeout = 90000) {
  await wait(page, who => {
    const s = window.__sparring.session.state;
    return s.phase === 'knockdown' && s.bout.count?.downed[who];
  }, who, timeout);
  const down = await state(page);
  assert.equal(down.bout.resistance[who], 0);
  assert.ok(down.bout.downs[who].total >= 1);
  return down;
}

async function awaitCount(page, who) {
  await wait(page, who => {
    const s = window.__sparring.session.state;
    return s.phase === 'knockdown' && s.bout.count?.stage === 'count' && s.bout.count.downed[who];
  }, who, 15000);
  assert.equal(await page.locator('.round-panel').isVisible(), false, 'a knockdown is an active sequence, not the pause menu');
  assert.equal(await page.locator('.knockdown-panel').isVisible(), true);
  await checkResistanceHUD(page);
}

async function knockRemiDown(page, cdp = null) {
  const started = Date.now();
  for (let sequence = 0; sequence < 6; sequence++) {
    await wait(page, () => {
      const s = window.__sparring.session.state;
      return s.phase !== 'running' || (s.remi.action === 'open' && s.remi.duration * (1 - s.remi.progress) >= 1.5
        && s.player.action === 'idle' && s.stamina >= 48);
    }, undefined, 20000);
    const current = await state(page);
    if (current.phase !== 'running') break;
    for (const action of ['jab', 'cross', 'jab']) {
      await press(page, action, cdp);
      await wait(page, () => {
        const s = window.__sparring.session.state;
        return s.phase !== 'running' || s.player.action === 'idle';
      });
      if ((await state(page)).phase !== 'running') break;
    }
    if ((await state(page)).phase !== 'running') break;
  }
  const down = await awaitDown(page, 'remi', 1000);
  assert.ok(down.stats.landed >= 2, 'real scored punches reduced resistance');
  const hit = await page.evaluate(() => [...window.__sparring.impacts].reverse().find(event => event.type === 'player-hit'));
  assert.ok(hit, 'the punch that caused the knockdown is present in the actual impact log');
  assert.ok(Math.hypot(hit.contactPoint.x - hit.targetPoint.x, hit.contactPoint.y - hit.targetPoint.y) < 2.5, JSON.stringify(hit));
  assert.match(hit.playerTexture, /player-(jab|cross|hook)(-body)?$/, 'the glove remains extended on the scored contact');
  measurements.push({ case: 'opponent-knockdown', elapsedWallSeconds: (Date.now() - started) / 1000, hit, state: down });
  return down;
}

async function frozenCount(page, label, waitMs = 450) {
  const before = await state(page);
  assert.equal(before.phase, 'paused');
  await page.waitForTimeout(waitMs);
  const after = await state(page);
  assert.deepEqual(after.bout.count, before.bout.count, `${label}: count and get-up progress freeze`);
  assert.equal(after.remaining, before.remaining, `${label}: round clock freezes`);
  const held = await page.evaluate(() => {
    const c = window.__sparring.ui.controls;
    return { keys: c.keys.size, pointers: c.pointers.size, pad: c.padId, guard: c.guard };
  });
  assert.deepEqual(held, { keys: 0, pointers: 0, pad: null, guard: null });
}

async function recoverPlayer(page, cdp = null) {
  for (let attempts = 0; attempts < 8; attempts++) {
    const before = await state(page);
    if (before.phase === 'running') return before;
    assert.equal(before.phase, 'knockdown');
    if (before.bout.count.stage === 'rise') break;
    await wait(page, () => {
      const s = window.__sparring.session.state;
      return s.phase !== 'knockdown' || s.bout.count.stage === 'rise' || (s.bout.count.stage === 'count' && s.bout.count.ready);
    }, undefined, 5000);
    const ready = await state(page);
    if (ready.phase !== 'knockdown' || ready.bout.count.stage === 'rise') break;
    const action = ready.bout.count.next;
    assert.ok(['jab', 'cross'].includes(action));
    await press(page, action, cdp);
    await wait(page, accepted => {
      const s = window.__sparring.session.state;
      return s.phase !== 'knockdown' || s.bout.count.stage === 'rise' || s.bout.count.accepted > accepted;
    }, ready.bout.count.accepted, 1500);
  }
  await wait(page, () => window.__sparring.session.state.phase === 'running', undefined, 6000);
  const risen = await state(page);
  assert.ok(risen.bout.resistance.player > 0 && risen.bout.resistance.player < risen.bout.maxResistance, 'getting up restores only part of resistance');
  assert.equal(risen.bout.count, null);
  return risen;
}

async function defendRound(page) {
  let key = null;
  try {
    while ((await state(page)).phase === 'running') {
      const current = await state(page);
      const defending = current.remi.action.startsWith('tell') || ['jab', 'cross'].includes(current.remi.action);
      const next = defending ? current.remi.target === 'body' ? 'ArrowDown' : 'ArrowUp' : null;
      if (next !== key) {
        if (key) await page.keyboard.up(key);
        key = next;
        if (key) await page.keyboard.down(key);
      }
      await page.waitForTimeout(60);
    }
  } finally { if (key) await page.keyboard.up(key); }
}

try {
  await fs.mkdir('docs', { recursive: true });
  if (cases.has('desktop')) {
    const { context: current, page } = await context();
    await begin(page, { fromGym: true });
    await knockRemiDown(page);
    await awaitCount(page, 'remi');
    const frozenRound = (await state(page)).remaining;
    await page.screenshot({ path: 'docs/knockdown-remi.png' });
    await wait(page, () => window.__sparring.session.state.phase === 'running', undefined, 16000);
    const remiRisen = await state(page);
    assert.ok(remiRisen.bout.resistance.remi > 0 && remiRisen.bout.resistance.remi < 100);
    assert.ok(Math.abs(remiRisen.remaining - frozenRound) < .15, 'the round clock stays stopped during the count and rise');
    assert.equal(remiRisen.bout.downs.remi.total, 1);
    report('Desktop: actual walk to Rémi and resistance bout; played JKJ combos cause a glove-aligned knockdown, automatic count and partial opponent recovery.');

    await awaitDown(page, 'player');
    await awaitCount(page, 'player');
    await wait(page, () => window.__sparring.session.state.bout.count.ready);
    const before = await state(page);
    assert.equal(before.bout.count.needed, 6);
    const next = before.bout.count.next;
    const key = next === 'jab' ? 'j' : 'k';
    await page.keyboard.down(key);
    await page.waitForTimeout(600);
    assert.equal(countAccepted(await state(page)), countAccepted(before) + 1, 'a held get-up button contributes once');
    await page.keyboard.up(key);
    await page.keyboard.press(key);
    assert.equal(countAccepted(await state(page)), countAccepted(before) + 1, 'the same hand cannot advance alternation');
    await page.keyboard.press(key === 'j' ? 'k' : 'j');
    const afterValid = await state(page);
    await page.keyboard.press(key);
    await page.keyboard.press(key === 'j' ? 'k' : 'j');
    assert.equal(countAccepted(await state(page)), countAccepted(afterValid), 'rapid alternating spam is not a second valid effort');
    const attacks = (await state(page)).stats.thrown;
    await page.keyboard.down('ArrowUp'); await page.keyboard.press('ArrowLeft'); await page.keyboard.up('ArrowUp');
    assert.equal((await state(page)).stats.thrown, attacks);
    assert.equal((await state(page)).player.action, 'down', 'guard and dodge inputs cannot replace the downed pose');
    await pause(page); await frozenCount(page, 'keyboard pause'); await resume(page, 'knockdown');
    await page.keyboard.down(key);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    await page.keyboard.up(key);
    await frozenCount(page, 'focus loss'); await resume(page, 'knockdown');
    const risen = await recoverPlayer(page);
    assert.equal(risen.bout.downs.player.total, 1);
    await page.screenshot({ path: 'docs/knockdown-releve.png' });
    report('Desktop player: six paced alternating efforts get up; held input, repeated same hand, rapid spam and combat directions are rejected. Pause/focus freeze the count and release all controls.');
    await current.close();
  }

  if (cases.has('mobile')) {
    const { context: current, page, cdp } = await context(true);
    await begin(page, { cdp, tempo: 'fast' });
    await awaitDown(page, 'player'); await awaitCount(page, 'player');
    await wait(page, () => window.__sparring.session.state.bout.count.ready);
    const first = await state(page);
    const letter = first.bout.count.next === 'jab' ? 'a' : 'b';
    const highlight = await page.evaluate(letter => {
      const next = document.querySelector(`#sparring-ui [data-pad-button="${letter}"]`);
      const other = document.querySelector(`#sparring-ui [data-pad-button="${letter === 'a' ? 'b' : 'a'}"]`);
      return { marked: next.classList.contains('is-recovery-next'), next: getComputedStyle(next).borderColor, other: getComputedStyle(other).borderColor };
    }, letter);
    assert.ok(highlight.marked && highlight.next !== highlight.other, `the expected effort is visibly highlighted: ${JSON.stringify(highlight)}`);
    const held = await buttonPoint(page, `#sparring-ui [data-pad-button="${letter}"]`);
    await dispatch(cdp, 'touchStart', [held]);
    await page.waitForTimeout(550);
    assert.equal(countAccepted(await state(page)), countAccepted(first) + 1, 'a held touch counts once');
    await dispatch(cdp, 'touchEnd', [held]);
    await tapContact(page, cdp, `#sparring-ui [data-pad-button="${letter}"]`);
    assert.equal(countAccepted(await state(page)), countAccepted(first) + 1, 'same mobile button does not count twice');
    await tapContact(page, cdp, '#sparring-ui .console-menu-button');
    await wait(page, () => window.__sparring.session.state.phase === 'paused');
    await frozenCount(page, 'mobile menu pause');
    for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(120);
      await checkLayout(page, true);
      await tapContact(page, cdp, '#sparring-ui [data-pad-button="a"]');
      await wait(page, () => window.__sparring.session.state.phase === 'knockdown');
      await checkLayout(page, true);
      await checkResistanceHUD(page);
      await page.screenshot({ path: `docs/knockdown-mobile-${viewport.width}.png` });
      await checkCountGeometry(page);
      await tapContact(page, cdp, '#sparring-ui .console-menu-button');
      await wait(page, () => window.__sparring.session.state.phase === 'paused');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('#rotate-prompt').isVisible(), true);
    assert.equal(await page.locator('#stage').evaluate(element => element.inert), true);
    await frozenCount(page, 'portrait');
    await page.keyboard.press('p');
    assert.equal((await state(page)).phase, 'paused', 'portrait cannot resume');
    await page.screenshot({ path: 'docs/knockdown-portrait.png' });
    await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(120);
    assert.equal((await state(page)).phase, 'paused');
    await tapContact(page, cdp, '#sparring-ui [data-pad-button="a"]');
    await wait(page, () => window.__sparring.session.state.phase === 'knockdown');
    await page.screenshot({ path: 'docs/knockdown-mobile.png' });
    await recoverPlayer(page, cdp);
    report('Mobile: real A/B get-up input, no hold/same-button repetition; three landscape sizes preserve 16:9 and outside controls, portrait freezes and requires explicit resume.');
    await current.close();
  }

  if (cases.has('ko')) {
    const { context: current, page } = await context();
    await begin(page, { tempo: 'fast' });
    await awaitDown(page, 'player'); await awaitCount(page, 'player');
    const started = Date.now();
    let highestCount = 0;
    while ((await state(page)).phase === 'knockdown') {
      highestCount = Math.max(highestCount, (await state(page)).bout.count.number);
      await page.waitForTimeout(50);
    }
    const result = await state(page);
    assert.equal(result.phase, 'finished');
    assert.ok(highestCount >= 9, 'the visible count advances before the ten-count stop');
    assert.ok(Date.now() - started >= 8500, 'the ten-count is observed in real time');
    assert.deepEqual({ reason: result.bout.result?.reason, winner: result.bout.result?.winner, loser: result.bout.result?.loser },
      { reason: 'ko', winner: 'remi', loser: 'player' }, 'the report explains the sparring ten-count stop');
    assert.equal(result.bout.resistance.player, 0);
    await checkBoutMenu(page, false);
    await page.screenshot({ path: 'docs/knockdown-bilan.png' });
    await page.locator('.primary-button').click();
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    const restarted = await state(page);
    assert.equal(restarted.bout.round, 1); assert.equal(restarted.bout.count, null); assert.equal(restarted.bout.result, null);
    assert.deepEqual(restarted.bout.resistance, { player: 100, remi: 100 });
    assert.deepEqual(restarted.bout.downs, { player: { round: 0, total: 0 }, remi: { round: 0, total: 0 } });
    assert.deepEqual(restarted.bout.roundHistory, []);
    assert.equal(restarted.stats.received, 0);
    report('An unassisted player knockdown reaches the real ten-count and final report; restarting clears resistance, knockdowns, result, history and touch counters.');
    await current.close();
  }

  if (cases.has('round')) {
    const { context: current, page } = await context();
    await begin(page);
    const started = Date.now();
    await page.keyboard.down('ArrowUp');
    await wait(page, () => window.__sparring.session.state.stamina <= .01, undefined, 25000);
    const exhausted = await state(page);
    assert.equal(exhausted.phase, 'running', 'zero endurance alone is not a knockdown');
    assert.ok(exhausted.bout.resistance.player > 0);
    assert.equal(exhausted.bout.downs.player.total, 0);
    await page.keyboard.up('ArrowUp');
    await defendRound(page);
    const between = await state(page);
    assert.equal(between.phase, 'between'); assert.equal(between.remaining, 0);
    assert.equal(between.bout.round, 1); assert.equal(between.bout.roundHistory.length, 1);
    assert.ok((Date.now() - started) / 1000 >= 59, 'a full sixty-second round ran without clock shortcuts');
    assert.ok(between.stats.blocked > 0, 'matching guards defended scheduled real attacks');
    await page.waitForTimeout(300);
    assert.deepEqual((await state(page)).bout, between.bout, 'between-round state waits for the player');
    await checkBoutMenu(page, false);
    await page.screenshot({ path: 'docs/knockdown-entre-rounds.png' });
    await page.locator('.next-round-button').click();
    await wait(page, () => window.__sparring.session.state.phase === 'running' && window.__sparring.session.state.bout.round === 2);
    const second = await state(page);
    assert.ok(second.remaining > 59);
    assert.equal(second.bout.rounds, 3); assert.equal(second.bout.roundHistory.length, 1);
    assert.equal(second.bout.downs.player.round, 0); assert.equal(second.bout.downs.remi.round, 0);
    for (const who of ['player', 'remi']) {
      assert.equal(second.bout.resistance[who], Math.min(100, between.bout.resistance[who] + 20), 'the interval restores the announced twenty resistance points');
      assert.equal(second.bout.downs[who].total, between.bout.downs[who].total, 'the bout keeps total knockdowns between rounds');
    }
    report(`One actual round lasted ${((Date.now() - started) / 1000).toFixed(1)} s; zero endurance never caused a knockdown, matching guards kept the player up, the interval waited, and the explicit next-round action began round 2 of 3.`);
    await current.close();
  }
  assert.deepEqual(errors, [], 'no console, runtime or asset errors');
} catch (error) {
  failure = error.stack ?? error.message;
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: 'docs/knockdown-failure.png' }).catch(() => {});
    console.error('State at failure:', JSON.stringify(await state(activePage).catch(() => ({}))));
  }
  throw error;
} finally {
  const result = { checkedAt: new Date().toISOString(), selectedCase: selected ?? 'all', reports, measurements, errors, failure };
  let output = result;
  if (selected) {
    try {
      const previous = JSON.parse(await fs.readFile('docs/knockdown-browser-results.json', 'utf8'));
      if (previous.selectedCase === 'all') output = { ...previous, updatedAt: result.checkedAt, reruns: [...(previous.reruns ?? []), result] };
    } catch { /* A targeted first run has no earlier full report to preserve. */ }
  }
  await fs.writeFile('docs/knockdown-browser-results.json', JSON.stringify(output, null, 2) + '\n');
  await browser.close();
}
