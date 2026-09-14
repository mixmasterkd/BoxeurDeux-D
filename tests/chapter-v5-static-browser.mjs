// Production smoke of chapter V5, served from dist by browser interception.
// No server and no development bridge. Initial access positions/progression are
// isolated save fixtures; subsequent interactions use actual keys/CDP touch.
// CHAPTER_PUBLIC_URL=https://…/BoxeurDeux-D/ repeats against a published build.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, wait, joyPoint, buttonPoint, dispatch, fit } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY, CAREER_TEST_STORAGE_KEY } from '../src/game/CareerProfile.js';

const live = process.env.CHAPTER_PUBLIC_URL;
const base = live ?? 'https://chapter-build.invalid/BoxeurDeux-D/';
assert.ok(new URL(base).pathname.endsWith('/'), 'CHAPTER_PUBLIC_URL must end with /');
const browser = await chromium.launch({headless: true});
const report = {date: new Date().toISOString(), base, fixture: 'Isolated exported careers and initial nearby access positions; no game-state mutation or DEV bridge. Navigation, CLI, doors and pads use real UI inputs.', mobileEmulated: true, cases: [], assets: [], errors: []};
const assets = new Set(), contexts = new Set();
let activePage;
const artifact = name => `docs/chapter-v5-${live ? 'public' : 'built'}-${name}`;
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'};

function fixture(kind) {
  const profile = new CareerProfile({storage: null});
  if (kind === 'marathon') {
    assert.ok(profile.applyTestCommand('test marathon').ok);
    profile.setLocation({scene: 'marathon-island', x: 930, y: 820, facing: 'up'});
  } else if (kind === 'pablo') {
    assert.ok(profile.applyTestCommand('test mexique').ok);
    profile.setLocation({scene:'mexico-gym',x:1040,y:620,facing:'up'});
  } else if (kind === 'pads') {
    assert.ok(profile.applyTestCommand('test mexique').ok);
    profile.setLocation({scene: 'mexico-gym', x: 430, y: 515, facing: 'up'});
  } else if (kind === 'gold') {
    assert.ok(profile.applyTestCommand('test dore').ok);
    profile.setLocation({scene: 'hotel-lobby', x: 728, y: 420, facing: 'up'});
  } else if (kind === 'metro') profile.setLocation({scene: 'metro-station', x: 640, y: 490, facing: 'up'});
  else profile.setLocation({scene: 'home', x: 255, y: 545, facing: 'left'});
  return profile;
}
async function ready(page, place) {
  await wait(page, place => document.querySelector('#stage')?.dataset.scene === place, place, 45000);
  await page.locator('#scene-loading').waitFor({state: 'hidden'});
  await page.waitForTimeout(150);
  const bridges = await page.evaluate(() => ['__sparring','__hotelActivity','__mexico','__metro','__hotel','__exploration','__marathon'].filter(key => Boolean(window[key])));
  assert.deepEqual(bridges, [], 'Production must not expose gameplay test hooks');
}
async function setup(kind, mobile) {
  const profile = fixture(kind);
  const context = await browser.newContext({viewport: mobile ? {width: 568, height: 320} : {width: 1280, height: 900}, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1});
  contexts.add(context);
  if (!live) await context.route('https://chapter-build.invalid/BoxeurDeux-D/**', async route => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length)) || 'index.html';
    const file = path.resolve('dist', rel);
    if (!file.startsWith(path.resolve('dist') + path.sep)) return route.abort();
    try { await route.fulfill({status: 200, body: await fs.readFile(file), contentType: MIME[path.extname(file)] ?? 'application/octet-stream'}); }
    catch { await route.fulfill({status: 404, body: 'Missing production artifact'}); }
  });
  await context.addInitScript(({key, value}) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, {key: CAREER_STORAGE_KEY, value: profile.exportText()});
  const page = await context.newPage(); activePage = page;
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`);
    else { const url = new URL(response.url()); if (['http:', 'https:'].includes(url.protocol)) assets.add(url.pathname); }
  });
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const root = () => page.evaluate(() => ['gym','rhythm','sparring'].map(id => `#${id}-ui`).find(s => { const e = document.querySelector(s); return e && !e.hidden && e.getClientRects().length; }));
  const tap = async selector => {
    if (!mobile) return page.locator(selector).click();
    await dispatch(cdp, 'touchStart', [await buttonPoint(page, selector)]); await dispatch(cdp, 'touchEnd');
  };
  const confirm = async () => mobile ? tap(`${await root()} [data-pad-button="a"]`) : page.keyboard.press('KeyE');
  const choose = async selector => {
    await page.locator(selector).waitFor({state: 'visible'});
    if (mobile) return tap(selector);
    for (let i = 0; i < 30; i++) {
      if (await page.locator(selector).evaluate(e => e === document.activeElement)) return confirm();
      await page.keyboard.press('ArrowDown');
    }
    throw Error(`Menu action unreachable: ${selector}`);
  };
  const hold = async (direction, duration) => {
    const key = {up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD'}[direction];
    if (mobile) await dispatch(cdp, 'touchStart', [await joyPoint(page, await root(), direction)]);
    else await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    if (mobile) await dispatch(cdp, 'touchEnd'); else await page.keyboard.up(key);
    await page.waitForTimeout(60);
  };
  const controls = {root, tap, confirm, choose, hold, pause: async () => mobile ? tap(`${await root()} .console-menu-button`) : page.keyboard.press('KeyP'), back: async () => mobile ? tap(`${await root()} [data-pad-button="b"]`) : page.keyboard.press('Escape'), punch: async action => mobile ? tap(`${await root()} [data-pad-button="${action === 'jab' ? 'a' : 'b'}"]`) : page.keyboard.press(action === 'jab' ? 'KeyJ' : 'KeyK')};
  const place = profile.snapshot().location.scene;
  await page.goto(new URL(`?scene=${place}`, base).href);
  await ready(page, place);
  const continueButton = page.locator('.career-start-continue');
  if (await continueButton.isVisible()) await continueButton.click();
  return {page, context, controls, profile};
}
async function capture(page, controls, mobile, name) {
  const layout = await fit(page, await controls.root(), mobile);
  assert.ok(layout.fits && layout.noScroll, `${name}: canvas/document fit`);
  assert.ok(Math.abs(layout.ratio - 16/9) < .002);
  assert.equal(layout.controls.length === 0, !mobile);
  assert.ok(layout.controls.every(c => c.outside && c.fits));
  await page.screenshot({path: artifact(`${name}-${mobile ? 'mobile568' : 'desktop'}.png`)});
  report.cases.push({name, mobile, layout});
}
async function close(context) { await context.close(); contexts.delete(context); }
async function laptop(mobile) {
  const {page, context, controls: c} = await setup('home', mobile);
  await c.confirm(); await page.locator('.laptop-window').waitFor({state: 'visible'});
  await c.choose('[data-gym-action="laptop-terminal"]');
  const normal = await page.evaluate(key => localStorage.getItem(key), CAREER_STORAGE_KEY);
  const run = async command => { const input = page.locator('.terminal-console input'); await input.fill(command); await input.press('Enter'); };
  await run('liste'); assert.match(await page.locator('.terminal-console pre').textContent(), /test mexique/);
  await capture(page, c, mobile, 'laptop-liste');
  await run('argent 99'); assert.match(await page.locator('.terminal-console pre').textContent(), /Argent de test : 99/);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), CAREER_STORAGE_KEY), normal);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).wallet.money, CAREER_TEST_STORAGE_KEY), 99);
  await run('retour'); await ready(page, 'home');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), CAREER_STORAGE_KEY), normal);
  await c.confirm(); await c.choose('[data-gym-action="laptop-terminal"]');
  await run('test mexique'); await ready(page, 'mexico-home');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), CAREER_STORAGE_KEY), normal);
  assert.ok(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).mexico.active, CAREER_TEST_STORAGE_KEY));
  await capture(page, c, mobile, 'posada-after-cli');
  report.cases.push({name: 'laptop-production-cli', mobile, liste: true, isolatedArgent99: true, retourRestoresNormal: true, testMexiqueStartsStay: true, normalCareerUnchanged: true});
  await close(context);
}
async function pads(mobile) {
  const {page, context, controls: c, profile} = await setup('pads', mobile);
  await capture(page, c, mobile, 'mexico-gym');
  await c.confirm(); assert.match(await page.locator('.gym-dialog-speaker').textContent(), /Octopus/i);
  await c.choose('[data-gym-action="activity-pads"]'); await ready(page, 'pads');
  assert.match(await page.locator('.rhythm-heading h2').textContent(), /Octopus/);
  await c.choose('.rhythm-primary');
  await wait(page, () => document.querySelector('#rhythm-ui')?.dataset.phase === 'running');
  await c.punch('jab'); await page.waitForTimeout(450); await c.punch('cross');
  await wait(page, () => Number(document.querySelector('.rhythm-streak')?.textContent) >= 1);
  await capture(page, c, mobile, 'octopus-pads-real-hit');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY);
  assert.equal(saved.daily.energy, profile.snapshot().daily.energy - 10);
  await c.tap('#rhythm-ui .activity-exit-button'); await ready(page, 'mexico-gym');
  report.cases.push({name: 'mexico-production-pads', mobile, realGymInteraction: true, octopus: true, realPadHit: true, returnGym: true, announcedEnergyCost: 10});
  await close(context);
}
async function metro(mobile) {
  const {page, context, controls: c} = await setup('metro', mobile);
  await c.pause(); await c.choose('.metro-plan-button');
  await page.locator('.metro-network-map').waitFor({state: 'visible'});
  assert.equal(await page.locator('.metro-network-map li').count(), 5);
  assert.equal(await page.locator('.metro-network-map li[data-current="true"]').count(), 1);
  await capture(page, c, mobile, 'metro-network-map');
  await c.back(); await c.choose('.gym-resume-button');
  await wait(page, () => document.querySelector('#gym-ui')?.dataset.mode === 'walking');
  await c.hold('up', 780); await ready(page, 'metro-train');
  await wait(page, () => document.querySelector('#gym-ui')?.dataset.metroTrain === 'moving', null, 15000);
  assert.match(await page.locator('.prototype-label').textContent(), /PROCHAIN ARRÊT/);
  await capture(page, c, mobile, 'metro-train-moving');
  report.cases.push({name: 'metro-production', mobile, plan5Stops: true, physicalBoarding: true, trainMoves: true});
  await close(context);
}
async function pablo(mobile) {
  const {page,context,controls:c}=await setup('pablo',mobile);
  await c.confirm();await c.choose('[data-gym-action="pablo-sparring"]');await ready(page,'sparring');
  const named=async()=>{
    const copy=await page.locator('#sparring-ui').textContent();
    assert.ok(!/rémi/i.test(copy),'Pablo owns all shared labels, help and settings');
    assert.ok(!/rémi/i.test(await page.locator('#stage').getAttribute('aria-label')));
    assert.match(await page.locator('.opponent-info .fighter-name').textContent(),/Pablo/);
  };
  await named();await c.pause();await named();await c.back();
  await c.choose('#sparring-ui .primary-button');
  await wait(page,()=>document.querySelector('#sparring-ui').dataset.phase==='running');
  await c.punch('jab');await page.waitForTimeout(450);await c.punch('cross');
  await c.pause();await named();await capture(page,c,mobile,'pablo-pause');
  await c.back();await c.tap('#sparring-ui .activity-exit-button');await ready(page,'mexico-gym');
  report.cases.push({name:'pablo-correct-name',mobile,readyAndRunningAndPause:true,settingsAndHelpRenamed:true,returnMexico:true});
  await close(context);
}
async function restaurant(mobile) {
  const {page, context, controls: c, profile} = await setup('gold', mobile);
  assert.equal(await page.locator('.gym-heading').isVisible(),false);
  assert.equal(await page.locator('.gym-daily').isVisible(),false);
  const hint=await page.locator('.gym-nearby').boundingBox();assert.ok(hint.width<=1&&hint.height<=1);
  await capture(page,c,mobile,'hotel-clear-view');
  await c.pause();assert.equal(await page.locator('.gym-daily').isVisible(),true);
  assert.ok(await page.locator('.gym-daily').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.snes-reading').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;}),'Daily resources are immediately visible in Pause');
  await capture(page,c,mobile,'hotel-pause-daily');await c.choose('.gym-resume-button');
  await wait(page,()=>document.querySelector('#gym-ui').dataset.mode==='walking');await page.waitForTimeout(60);
  await c.hold('up', 650); await ready(page, 'hotel-restaurant');
  await capture(page, c, mobile, 'gold-restaurant');
  await c.hold('up', 1210); await c.hold('left', 725); await c.confirm();
  await c.choose('[data-gym-action="bread-baguette"]'); await c.choose('[data-gym-action="close"]');
  await c.hold('right', 1160); await c.confirm();
  await c.choose('[data-gym-action="bread-toast"]'); await c.choose('[data-gym-action="close"]');
  await c.hold('left', 580); await c.confirm();
  await c.choose('[data-gym-action="bread-herbs"]');
  assert.match(await page.locator('#gym-dialog-title').textContent(), /Bon appétit/);
  await capture(page, c, mobile, 'bread-served');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY), initial = profile.snapshot();
  for (const key of ['wallet','stats','daily']) assert.deepEqual(saved[key], initial[key]);
  assert.equal(saved.tournament.active.tier, 'gold');
  report.cases.push({name: 'gold-production-restaurant', mobile, physicalRestaurantDoor: true, breadToastedAndServed: true, noWalletOrStatsBonus: true});
  await close(context);
}
async function marathon(mobile) {
  const {page, context, controls: c} = await setup('marathon', mobile);
  await c.confirm();
  assert.match(await page.locator('#gym-dialog-title').textContent(), /Prêt pour le départ/);
  await c.choose('[data-gym-action="start-marathon"]');
  await wait(page, () => /^0:\d{2}/.test(document.querySelector('.marathon-readout')?.textContent));
  await c.hold('right', 300); await c.hold('up', 350);
  await wait(page, () => /^0:0[2-9]/.test(document.querySelector('.marathon-readout')?.textContent));
  await c.pause();
  await wait(page, () => document.querySelector('#gym-ui')?.dataset.mode === 'paused');
  // Read AFTER the pause has reached the UI; do not race the final live tick.
  const frozen = await page.locator('.marathon-readout').textContent();
  const paused = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).marathon.active, CAREER_STORAGE_KEY);
  assert.equal(paused.status, 'running');
  assert.ok(paused.checkpoint.x > 1000 && paused.checkpoint.y < 780, 'Actual right/up movement is saved beyond the launch position');
  assert.ok(paused.elapsed >= 2);
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.marathon-readout').textContent(), frozen);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).marathon.active.elapsed, CAREER_STORAGE_KEY), paused.elapsed);
  assert.equal(await page.locator('.marathon-readout').evaluate(e => getComputedStyle(e).visibility), 'hidden', 'Chrono stays behind the pause menu');
  await c.choose('.gym-resume-button');
  await wait(page, () => document.querySelector('#gym-ui')?.dataset.mode === 'walking');
  await wait(page, previous => document.querySelector('.marathon-readout')?.textContent !== previous, frozen);
  const resourcePaths = await page.evaluate(() => performance.getEntriesByType('resource').map(r => new URL(r.name).pathname));
  for (const direction of ['down','right','up','left']) for (let frame = 0; frame < 3; frame++) {
    assert.ok(resourcePaths.some(p => p.endsWith(`/assets/sprites/marathon/player-${direction}-${frame}.png`)));
  }
  const crowdAssets = resourcePaths.filter(p => /\/sprites\/marathon\/crowd-\d-/.test(p));
  assert.equal(crowdAssets.length, 24);
  await capture(page, c, mobile, 'marathon-short-run');
  const result = report.cases.at(-1);
  assert.equal(result.layout.width, 1280); assert.equal(result.layout.height, 720);
  Object.assign(result, {registeredStartFixture: true, actualStartAndMovement: true, savedCheckpoint: paused.checkpoint, pausedElapsed: paused.elapsed, pause800Stable: true, resumesClock: true, runnerDirections: 4, crowdAssets: crowdAssets.length, fullCourseClaimed: false});
  await close(context);
}
try {
  for (const mobile of [false,true]) {
    await laptop(mobile); await pads(mobile); await pablo(mobile); await metro(mobile); await restaurant(mobile); await marathon(mobile);
  }
  assert.ok([...assets].some(p => p.endsWith('/assets/sprites/octopus-pads/left.png')));
  assert.ok([...assets].some(p => p.endsWith('/assets/hotel/restaurant.png')));
  assert.ok([...assets].some(p => p.endsWith('/assets/mexico/home.png')));
  assert.ok([...assets].some(p => p.endsWith('/assets/metro/train.png')));
  assert.ok([...assets].filter(p => p.includes('/assets/')).every(p => p.startsWith(new URL(base).pathname)), 'Assets remain under the configured project subpath');
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack; process.exitCode = 1; console.error(error);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({path: artifact('failure.png')}).catch(() => {});
} finally {
  for (const context of contexts) await close(context);
  await browser.close(); report.assets = [...assets].sort();
  await fs.writeFile(artifact('results.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({base, cases: report.cases.length, assets: assets.size, errors: report.errors, failure: report.failure ?? null}, null, 2));
