// Casino table coverage through real keyboard/mouse and CDP touch events.
// Exploration between floors is covered separately by casino-world-browser.mjs.
// CASINO_BUILT=1 serves dist through a local Playwright route, without dev hooks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, wait, dispatch, buttonPoint, suppressHotReload, fit } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { CASINO_LAYOUTS } from '../src/game/CasinoWorld.js';
import { createBlackjackGame, actBlackjack, blackjackActions } from '../src/game/casino/BlackjackGame.js';
import { createPokerGame, advancePokerBots, pokerActions } from '../src/game/casino/PokerGame.js';

const built = process.env.CASINO_BUILT === '1', publicSite = !built && Boolean(process.env.CASINO_URL);
const url = built ? 'https://casino-build.invalid/BoxeurDeux-D/' : process.env.CASINO_URL ?? 'http://127.0.0.1:5173/';
const output = `outputs/verification/casino/${built ? 'built' : publicSite ? 'public' : 'dev'}`;
fs.mkdirSync(output, { recursive: true });
const report = {
  date: new Date().toISOString(), url, built, publicSite, mobileEmulated: true,
  fixture: 'Valid unlocked career via model methods; seeded pending hands are created by casinoStart with a fixed fixture RNG. Browser actions use the shipped UI only. No live game state or clock is altered.',
  cases: [], layouts: [], errors: [], warnings: [], failure: null,
};
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
let activePage;
const selector = name => `[data-gym-action="${name}"]`;
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY);
const caseName = (game, mobile, detail = '') => `${game}-${mobile ? 'mobile568' : 'desktop'}${detail ? `-${detail}` : ''}`;
const gamePlace = game => game === 'slots' ? 'casino-lobby' : game === 'poker' ? 'casino-poker' : 'casino-tables';
const casinoMoney = profile => profile.wallet.money + profile.casino.chips + (profile.casino.active && !profile.casino.active.settled ? profile.casino.active.stake : 0);

function seededStart(profile, game, options, seed) {
  const original = Object.getOwnPropertyDescriptor(globalThis.crypto, 'getRandomValues');
  Object.defineProperty(globalThis.crypto, 'getRandomValues', { configurable: true, value: array => { array[0] = seed; return array; } });
  try { assert.equal(profile.casinoStart(game, options).ok, true); }
  finally { if (original) Object.defineProperty(globalThis.crypto, 'getRandomValues', original); else delete globalThis.crypto.getRandomValues; }
}

function fixture(game, { machineId = 'cerises', pending = false } = {}) {
  const profile = new CareerProfile({ storage: null });
  assert.equal(profile.applyTestCommand('combat dyrex').ok, true);
  assert.equal(profile.applyTestCommand('argent 200').ok, true);
  profile.setLocation({ scene: 'casino-lobby', x: 1440, y: 1300, facing: 'up' });
  assert.equal(profile.casinoExchange(100).ok, true);
  const place = gamePlace(game), id = game === 'slots' ? `slots-${machineId}` : game;
  const station = CASINO_LAYOUTS[place].stations.find(station => station.id === id);
  assert.ok(station, `${id} station exists`);
  profile.setLocation({ scene: place, x: station.x, y: station.y, facing: 'up' });
  if (pending && game === 'blackjack') {
    let seed = 1;
    while (seed < 10000) {
      let hand = createBlackjackGame({ bet: 1, bankroll: 100, seed });
      if (blackjackActions(hand).includes('split') && hand.hands[0].cards[0].rank !== 'A') {
        hand = actBlackjack(hand, 'split');
        if (hand.status === 'playing' && hand.activeHand === 0) {
          hand = actBlackjack(hand, 'hit');
          if (hand.status === 'playing' && hand.activeHand === 0) {
            hand = actBlackjack(hand, 'stand');
            if (hand.status === 'playing' && hand.activeHand === 1 && blackjackActions(hand).includes('double')) break;
          }
        }
      }
      seed++;
    }
    assert.ok(seed < 10000); seededStart(profile, game, { bet: 1 }, seed);
  } else if (pending && game === 'poker') {
    let seed = 1;
    while (seed < 10000) {
      const hand = advancePokerBots(createPokerGame({ buyIn: 10, seed }));
      if (hand.status === 'playing' && hand.turn === 0 && pokerActions(hand).raise) break;
      seed++;
    }
    assert.ok(seed < 10000); seededStart(profile, game, { buyIn: 10 }, seed);
    assert.equal(profile.casinoAct('bot').ok, true);
  }
  // The browser receives exactly what a real exported career would contain.
  profile.inspectImport(profile.exportText());
  return profile;
}

async function setup(game, mobile, options = {}) {
  const profile = fixture(game, options), data = profile.exportText();
  const context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  if (!built) await suppressHotReload(context);
  if (built) await context.route('https://casino-build.invalid/BoxeurDeux-D/**', async route => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length)) || 'index.html';
    const file = path.resolve('dist', relative), root = path.resolve('dist') + path.sep;
    if (!file.startsWith(root)) return route.abort();
    try {
      await route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' })[path.extname(file)] ?? 'application/octet-stream' });
    } catch { await route.fulfill({ status: 404, body: 'Missing asset' }); }
  });
  await context.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) { localStorage.setItem(key, data); localStorage.setItem(`${key}-backup`, data); }
  }, { key: CAREER_STORAGE_KEY, data });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(message.text());
    if (message.type() === 'warning' && !/GPU stall due to ReadPixels|Automatic fallback to software WebGL/.test(message.text())) report.warnings.push(message.text());
  });
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const tap = async target => {
    await page.locator(target).waitFor({ state: 'visible' });
    await page.locator(target).scrollIntoViewIfNeeded();
    if (mobile) { await dispatch(cdp, 'touchStart', [await buttonPoint(page, target)]); await dispatch(cdp, 'touchEnd'); }
    else await page.locator(target).click();
    await page.waitForTimeout(50);
  };
  const confirm = () => mobile ? tap('#gym-ui [data-pad-button="a"]') : page.keyboard.press('KeyE');
  const ready = async () => {
    await page.locator('#gym-ui').waitFor({ state: 'visible' });
    const continueButton = page.locator('.career-start-continue, .career-continue');
    if (await continueButton.first().isVisible()) await tap('.career-start-continue:visible, .career-continue:visible');
    await page.locator('#scene-loading').waitFor({ state: 'hidden' });
    await page.waitForTimeout(180);
  };
  await page.goto(`${url}?scene=${gamePlace(game)}`); await ready();
  if (!options.pending) {
    await confirm();
    if (game === 'blackjack') {
      await page.locator(selector('table-blackjack')).waitFor({ state: 'visible' });
      assert.match(await page.locator('.gym-dialog').innerText(), /KARL/);
      await tap(selector('table-blackjack'));
    }
  }
  await page.locator('.casino-window').waitFor({ state: 'visible' });
  return { context, page, cdp, tap, confirm, ready, initial: profile.snapshot() };
}

async function waitSaved(page, predicate, description, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await saved(page); if (predicate(value)) return value; await page.waitForTimeout(80); }
  throw new Error(`Timed out: ${description}; casino=${JSON.stringify((await saved(page)).casino)}`);
}

async function capture(page, name, mobile) {
  const geometry = await fit(page, '#gym-ui', mobile, true);
  assert.ok(geometry.fits && geometry.noScroll, `${name}: game/document fit the viewport`);
  for (const control of geometry.controls) assert.ok(control.fits && control.outside, `${name}: side control ${control.name} fits outside the canvas`);
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.casino-window'), rect = panel.getBoundingClientRect();
    const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const copy = panel.querySelector('.gym-dialog-copy').getBoundingClientRect();
    const essential = panel.dataset.phase === 'playing' ? [...panel.querySelectorAll(panel.dataset.game === 'poker' ? '.poker-felt > .casino-cards .casino-card, .casino-seat:first-child .casino-card' : '.casino-hand.current .casino-card')].map(element => {
      const box = element.getBoundingClientRect();
      return { label: element.getAttribute('aria-label'), top: box.top, bottom: box.bottom, fullyVisible: box.top >= copy.top - 1 && box.bottom <= copy.bottom + 1 && box.left >= copy.left - 1 && box.right <= copy.right + 1 };
    }) : [];
    return {
      essentialCards: essential,
      panel: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
      fits: rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1,
      horizontalOverflow: [...panel.querySelectorAll('.gym-dialog-copy, .gym-dialog-actions, .casino-board, .casino-content')].filter(visible).map(element => ({ class: element.className, scroll: element.scrollWidth, width: element.clientWidth })),
      buttons: [...panel.querySelectorAll('button')].filter(visible).map(element => ({ text: element.textContent, disabled: element.disabled, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
    };
  });
  await page.screenshot({ path: `${output}/${name}.png` });
  report.layouts.push({ name, geometry, layout });
  assert.ok(layout.fits, `${name}: casino panel fits the viewport`);
  if (name.endsWith('-pending') || name.endsWith('-human-turn')) for (const card of layout.essentialCards) assert.ok(card.fullyVisible, `${name}: ${card.label} is visible without scrolling`);
  for (const column of layout.horizontalOverflow) assert.ok(column.scroll <= column.width + 1, `${name}: ${column.class} has no horizontal overflow (${column.scroll}/${column.width}px)`);
}

async function reloadExact(session, name) {
  const before = await saved(session.page);
  await session.page.reload(); await session.ready();
  await session.page.locator('.casino-window').waitFor({ state: 'visible' });
  const after = await saved(session.page);
  assert.deepEqual(after.casino, before.casino, `${name}: cards, bets, chips and receipts survive a reload`);
  assert.equal(after.wallet.money, before.wallet.money); assert.equal(after.daily.energy, before.daily.energy);
}

async function challengePendingRoute(session, game) {
  const before = await saved(session.page);
  for (const requested of ['bag', 'casino-poker', gamePlace(game)]) {
    await session.page.goto(`${url}?scene=${requested}`); await session.ready();
    await session.page.locator(`.casino-window[data-game="${game}"]`).waitFor({ state: 'visible' });
    const after = await saved(session.page);
    assert.equal(after.location.scene, gamePlace(game), 'A URL cannot leave or move an engaged casino hand.');
    assert.deepEqual(after.casino, before.casino, 'Changing the requested scene preserves the exact pending cards and stake.');
    assert.equal(after.daily.energy, before.daily.energy);
  }
}

async function finishBlackjack(session) {
  for (let i = 0; i < 6; i++) {
    if ((await saved(session.page)).casino.active?.settled) return;
    await session.tap(selector('casino-bj-stand'));
  }
  throw new Error('Blackjack did not finish after standing on every hand.');
}

async function runBlackjack(mobile) {
  // A validated paired hand makes split/double UI checks reproducible.
  const session = await setup('blackjack', mobile, { pending: true });
  const { context, page, tap, initial } = session, name = caseName('blackjack', mobile); console.log(`CASINO ${name}`);
  try {
    assert.equal(await page.locator('.casino-dealer-hand .casino-card.back').count(), 1, 'Karl keeps one card face down while the hand is live.');
    await capture(page, `${name}-pending`, mobile);
    await reloadExact(session, name);
    await challengePendingRoute(session, 'blackjack');
    assert.ok(await page.locator(selector('casino-bj-split')).isEnabled());
    const chips = (await saved(page)).casino.chips;
    await tap(selector('casino-bj-split'));
    let current = await saved(page);
    assert.equal(current.casino.active.state.hands.length, 2); assert.equal(current.casino.active.stake, 2);
    assert.equal(current.casino.chips, chips - 1);
    await tap(selector('casino-bj-hit'));
    current = await saved(page); assert.equal(current.casino.active.state.hands[0].cards.length, 3);
    await tap(selector('casino-bj-stand'));
    assert.ok(await page.locator(selector('casino-bj-double')).isEnabled());
    await tap(selector('casino-bj-double'));
    current = await saved(page); assert.equal(current.casino.active.stake, 3);
    await finishBlackjack(session);
    const result = await saved(page);
    assert.equal(result.casino.rounds, 1); assert.equal(result.daily.energy, initial.daily.energy);
    assert.equal(casinoMoney(result), 200 + result.casino.active.state.profit);
    await capture(page, `${name}-result`, mobile);
    await reloadExact(session, `${name}-settled`);
    await tap(selector('casino-new'));
    await tap(selector('casino-start'));
    await waitSaved(page, value => value.casino.active?.id === 2, 'new blackjack hand');
    await finishBlackjack(session);
    assert.equal((await saved(page)).casino.rounds, 2);
    report.cases.push({ name, pendingReload: true, routeEscapeBlocked: true, split: true, double: true, hit: true, stand: true, duplicatePayout: false, energyFree: true });
  } catch (error) {
    await page.screenshot({ path: `${output}/${name}-failure.png` }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

async function runInstant(game, mobile, options = {}) {
  const session = await setup(game, mobile, options), { page, context, tap, initial } = session;
  const name = caseName(game, mobile, options.machineId); console.log(`CASINO ${name}`);
  try {
    await capture(page, `${name}-offer`, mobile);
    const beforeRules = (await saved(page)).casino;
    await tap(selector('casino-rules'));
    await page.locator('.casino-window[data-phase="rules"]').waitFor({ state: 'visible' });
    await capture(page, `${name}-rules`, mobile);
    await tap(selector('casino-resume'));
    assert.deepEqual((await saved(page)).casino, beforeRules, 'Consulting the rules never places a wager.');
    if (game === 'roulette') {
      await tap('.casino-roulette-grid button[aria-label="Ajouter 1 jeton sur 0"]');
      await tap(selector('casino-add-bet'));
    }
    await tap(selector(game === 'slots' ? 'casino-play' : 'casino-start'));
    const result = await waitSaved(page, value => value.casino.active?.settled, `${game} result saved`);
    assert.equal(result.casino.rounds, 1); assert.equal(result.daily.energy, initial.daily.energy);
    assert.equal(casinoMoney(result), 200 + result.casino.active.state.profit);
    assert.ok(result.casino.active.stake >= 1 && result.casino.active.stake <= 5);
    await page.locator('.casino-window[data-phase="complete"]').waitFor({ state: 'visible' });
    await capture(page, `${name}-result`, mobile);
    await reloadExact(session, name);
    await tap(selector('casino-new'));
    if (game === 'roulette') await tap(selector('casino-add-bet'));
    await tap(selector(game === 'slots' ? 'casino-play' : 'casino-start'));
    const second = await waitSaved(page, value => value.casino.rounds === 2, `${game} second round`);
    assert.equal(second.casino.active.id, 2); assert.equal(second.daily.energy, initial.daily.energy);
    report.cases.push({ name, independentRounds: 2, reloadExact: true, duplicatePayout: false, energyFree: true });
  } catch (error) {
    await page.screenshot({ path: `${output}/${name}-failure.png` }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

async function runPoker(mobile) {
  const session = await setup('poker', mobile, { pending: true }), { page, context, tap, initial } = session;
  const name = caseName('poker', mobile); console.log(`CASINO ${name}`);
  try {
    assert.equal(await page.locator('.casino-seat:not(:first-child) .casino-card:not(.back)').count(), 0, 'Opponents’ private cards remain hidden while the hand is live.');
    await capture(page, `${name}-human-turn`, mobile);
    await reloadExact(session, name);
    if (mobile) {
      const before = (await saved(page)).casino;
      await page.setViewportSize({ width: 320, height: 568 });
      await page.locator('.rotate-prompt').waitFor({ state: 'visible' });
      await page.waitForTimeout(1100);
      assert.deepEqual((await saved(page)).casino, before, 'Portrait suspends the hand and preserves its stake.');
      await page.screenshot({ path: `${output}/${name}-portrait.png` });
      await page.setViewportSize({ width: 568, height: 320 });
      await page.locator('.rotate-prompt').waitFor({ state: 'hidden' });
      if (await page.locator('.gym-resume-button').isVisible()) await tap('.gym-resume-button');
      await page.locator('.casino-window').waitFor({ state: 'visible' });
    }
    const beforeAllIn = (await saved(page)).casino;
    await tap(selector('casino-poker-allin'));
    await page.locator(selector('casino-poker-confirm')).waitFor({ state: 'visible' });
    assert.deepEqual((await saved(page)).casino, beforeAllIn, 'Opening all-in confirmation does not place a wager.');
    await capture(page, `${name}-allin-confirm`, mobile);
    await tap(selector('casino-poker-confirm'));
    if (!(await saved(page)).casino.active.settled) {
      if (mobile) await tap('#gym-ui .console-menu-button'); else await page.keyboard.press('KeyP');
      await page.locator('.casino-window[data-phase="pause"]').waitFor({ state: 'visible' });
      const paused = (await saved(page)).casino;
      await page.waitForTimeout(1600);
      assert.deepEqual((await saved(page)).casino, paused, 'Pause suspends bot decisions after the human all-in.');
      await capture(page, `${name}-pause`, mobile);
      await tap(selector('casino-resume'));
    }
    let result;
    for (let i = 0; i < 100; i++) {
      result = await saved(page);
      if (result.casino.active?.settled) break;
      if (result.casino.active?.state.turn === 0) {
        const legal = pokerActions(result.casino.active.state);
        await tap(selector(legal.check ? 'casino-poker-check' : legal.call ? 'casino-poker-call' : 'casino-poker-fold'));
      } else await page.waitForTimeout(120);
    }
    assert.equal(result.casino.active.settled, true); assert.equal(result.casino.rounds, 1);
    assert.equal(result.daily.energy, initial.daily.energy);
    assert.equal(casinoMoney(result), 200 + result.casino.active.state.result.net);
    if (result.casino.active.state.result.showdown) for (let index = 1; index < 4; index++) {
      const faceCards = page.locator(`.casino-seat:nth-child(${index + 1}) .casino-card:not(.back)`);
      assert.equal(await faceCards.count(), result.casino.active.state.players[index].folded ? 0 : 2);
      if (!result.casino.active.state.players[index].folded) assert.ok(await faceCards.first().isVisible(), 'The showdown reveals surviving opponents’ cards on mobile too.');
    }
    await capture(page, `${name}-result`, mobile);
    await reloadExact(session, `${name}-result`);
    report.cases.push({ name, humanTurnReload: true, allInConfirmation: true, botCompletion: true, botPause: true, portraitFrozen: mobile, energyFree: true });
  } catch (error) {
    await page.screenshot({ path: `${output}/${name}-failure.png` }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

try {
  const modes = process.env.CASINO_MOBILE === '1' ? [true] : process.env.CASINO_DESKTOP === '1' ? [false] : [false, true];
  const games = (process.env.CASINO_GAMES ?? 'blackjack,roulette,slots,poker').split(',');
  for (const mobile of modes) {
    if (games.includes('blackjack')) await runBlackjack(mobile);
    if (games.includes('roulette')) await runInstant('roulette', mobile);
    if (games.includes('slots')) for (const machineId of ['cerises', 'cloches', 'diamants', 'montreal']) await runInstant('slots', mobile, { machineId });
    if (games.includes('poker')) await runPoker(mobile);
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack; process.exitCode = 1; console.error(error);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: `${output}/failure.png` }).catch(() => {});
} finally {
  const modeSuffix = process.env.CASINO_MOBILE === '1' ? '-mobile' : process.env.CASINO_DESKTOP === '1' ? '-desktop' : '';
  await browser.close(); fs.writeFileSync(`${output}/results${modeSuffix}.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
