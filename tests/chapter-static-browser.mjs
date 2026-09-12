// Production-only public UI checks. Default: dist/ intercepted below a Pages-like
// subdirectory, with no extra server. SPARRING_URL=https://host/project/ tests
// an actual site. All career fixtures are isolated from the user's browser.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, wait, joyPoint, buttonPoint, dispatch, fit } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';

const remote = process.env.SPARRING_URL;
const base = remote ?? 'http://chapter.local/BoxeurDeux-D/';
assert.ok(base.endsWith('/'), 'SPARRING_URL must end with /');
const dist = path.resolve('dist');
const browser = await chromium.launch({ headless: true });
const report = { date: new Date().toISOString(), url: base, production: true, emulatedMobile: true, cases: [], errors: [], failure: null };
const loaded = new Set(), contexts = new Set();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
let currentPage;
await mkdir('docs', { recursive: true });
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY);
function profile({ qualification = 'kramer', tournamentDay = 0, trained = false } = {}) {
  const p = new CareerProfile({ storage: null });
  if (trained) for (let i = 0; i < 30; i++) {
    p.reward('bag', { contacts: 12, accuracy: 100 }); p.reward('rope', { hits: 30, accuracy: 100 });
    p.reward('speedball', { hits: 30, accuracy: 100 }); p.reward('sparring', { completed: true, rounds: 1, actions: 20 });
  }
  if (qualification !== 'none') p.recordFight({ opponent: 'beton', winner: 'player' });
  if (qualification === 'tournament' || tournamentDay) p.recordFight({ opponent: 'kramer', winner: 'player' });
  // Real model transactions fund the fixture; no balances or progress flags
  // are manually invented in the production browser.
  for (let i = 0; i < 10; i++) {
    if (!p.canStartActivity('delivery').ok) p.sleep();
    assert.equal(p.startDelivery().ok, true);
    for (const stop of DELIVERY_STOPS) p.deliverParcel(stop, { tip: 2 });
  }
  p.sleep();
  if (tournamentDay) {
    assert.equal(p.startTournament().ok, true);
    for (let day = 1; day < tournamentDay; day++) {
      const status = p.tournamentStatus();
      p.recordTournamentFight({ opponent: status.opponent, winner: 'player', matchId: status.currentMatchId, score: 10 }); p.sleep();
    }
  }
  return p;
}
async function open(seed, query, { mobile = false, small = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: small ? 568 : 844, height: small ? 320 : 390 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  contexts.add(context);
  await context.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: CAREER_STORAGE_KEY, value: seed.exportText() });
  const page = await context.newPage(); currentPage = page;
  page.setDefaultTimeout(remote ? 90000 : 30000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('requestfailed', request => report.errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); else if (response.url().startsWith(base)) loaded.add(new URL(response.url()).pathname.slice(new URL(base).pathname.length) || 'index.html'); });
  if (!remote) await page.route('**/*', async route => {
    const url = new URL(route.request().url()), baseUrl = new URL(base);
    if (url.origin !== baseUrl.origin || !url.pathname.startsWith(baseUrl.pathname)) {
      report.errors.push(`Resource outside the deployed directory: ${url}`); await route.abort(); return;
    }
    const relative = decodeURIComponent(url.pathname.slice(baseUrl.pathname.length)) || 'index.html';
    const file = path.resolve(dist, relative); assert.ok(file.startsWith(`${dist}${path.sep}`));
    try { await route.fulfill({ status: 200, body: await readFile(file), contentType: mime[path.extname(file)] ?? 'application/octet-stream' }); }
    catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const tap = async selector => {
    if (!mobile) return page.locator(selector).click();
    await page.locator(selector).scrollIntoViewIfNeeded();
    const point = await buttonPoint(page, selector);
    assert.ok(point.x >= 0 && point.y >= 0 && point.x < page.viewportSize().width && point.y < page.viewportSize().height, `Tap target is visible: ${selector}`);
    await dispatch(cdp, 'touchStart', [point]); await dispatch(cdp, 'touchEnd');
  };
  const interact = () => mobile ? tap('#gym-ui [data-pad-button="a"]') : page.keyboard.press('e');
  const closeDialog = () => mobile ? tap('#gym-ui [data-pad-button="b"]') : page.keyboard.press('Escape');
  const action = id => tap(`[data-gym-action="${id}"]`);
  const walkUntil = async (direction, label) => {
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[direction];
    if (mobile) await dispatch(cdp, 'touchStart', [await joyPoint(page, '#gym-ui', direction)]); else await page.keyboard.down(key);
    try { await wait(page, label => document.querySelector('.gym-nearby-label')?.textContent === label, label, 18000); }
    finally { if (mobile) await dispatch(cdp, 'touchEnd'); else await page.keyboard.up(key); }
  };
  const leave = async () => { await context.close(); contexts.delete(context); };
  await page.goto(`${base}?${query}`);
  return { context, page, mobile, cdp, tap, interact, closeDialog, action, walkUntil, leave };
}
async function ready(page, place, root = '#gym-ui') {
  await wait(page, ({ place, root }) => document.querySelector('#stage')?.dataset.scene === place && document.querySelector(`${root} .console-menu-button`), { place, root }, remote ? 90000 : 30000);
  await page.locator('#scene-loading').waitFor({ state: 'hidden' });
  await page.waitForTimeout(160);
  assert.equal(await page.evaluate(() => ['__gym','__exploration','__hotel','__hotelActivity','__sparring','__bag','__shadow'].some(key => window[key] !== undefined)), false, 'No development hooks in the compiled game');
}
async function geometry(c, label, root = '#gym-ui') {
  const layout = await fit(c.page, root, c.mobile);
  assert.ok(layout.noScroll && layout.fits, `${label}: scene fits available width and height`);
  assert.ok(Math.abs(layout.ratio - 16 / 9) < .004, `${label}: fixed 16:9 frame`);
  assert.equal(layout.controls.length === 0, !c.mobile, `${label}: touch controls only on phones`);
  for (const control of layout.controls) assert.ok(control.outside && control.fits, `${label}: ${control.name} is in a margin`);
  await c.page.screenshot({ path: `docs/chapter-static-${remote ? 'public-' : ''}${label}.png` });
  report.cases.push({ case: label, layout }); console.log(`Production chapter: ${label}`);
}
function requireAssets(names) { for (const name of names) assert.ok(loaded.has(name), `Production resource loaded: ${name}`); }
async function shopAndStreet() {
  const seed = profile(); seed.setLocation({ scene: 'residential', x: 1192, y: 1250, facing: 'up' });
  const c = await open(seed, 'scene=residential'); const { page } = c;
  await ready(page, 'residential'); await c.interact(); await c.action('start-delivery');
  assert.equal((await saved(page)).daily.energy, 70); assert.ok((await saved(page)).delivery.active);
  await geometry(c, 'cycling-desktop');
  await page.reload(); await ready(page, 'residential'); assert.ok((await saved(page)).delivery.active, 'Reload preserves the route');
  await c.interact(); await c.action('abandon-delivery'); await c.action('confirm-abandon'); await c.closeDialog();
  assert.equal((await saved(page)).delivery.active, null); assert.equal((await saved(page)).daily.energy, 70);
  requireAssets(['assets/world/residential.png', 'assets/sprites/cycling/player-down-0.png']); await c.leave();

  const shopping = profile(); shopping.setLocation({ scene: 'commercial', x: 963, y: 440, facing: 'down' });
  const d = await open(shopping, 'scene=commercial'); await ready(d.page, 'commercial'); await geometry(d, 'commercial-desktop');
  await d.interact(); await ready(d.page, 'clothing-shop'); await d.walkUntil('up', 'Rue Nord · Collection'); await d.interact();
  const before = await saved(d.page); await d.action('buy-street-blue'); await d.action('confirm-buy-street-blue');
  let after = await saved(d.page); assert.equal(after.wallet.money, before.wallet.money - 28); assert.ok(after.inventory.owned.includes('street-blue')); assert.equal(after.inventory.equipped.street, 'street-black');
  await d.closeDialog(); await geometry(d, 'clothing-shop-desktop');
  await d.walkUntil('down', 'Retour à la place commerçante'); await d.interact(); await ready(d.page, 'commercial');
  await d.walkUntil('right', 'Le Coin Bleu · Boxe'); await d.interact(); await ready(d.page, 'boxing-shop');
  await d.walkUntil('up', 'Le Coin Bleu · Équipements'); await d.interact(); await d.action('buy-boxing-emerald'); await d.action('confirm-buy-boxing-emerald');
  after = await saved(d.page); assert.equal(after.wallet.money, before.wallet.money - 60); assert.ok(after.inventory.owned.includes('boxing-emerald')); assert.equal(after.inventory.equipped.boxing, 'boxing-blue');
  await d.closeDialog(); await geometry(d, 'boxing-shop-desktop');
  assert.equal(after.daily.energy, before.daily.energy, 'Shopping and travel cost no daily energy');
  requireAssets(['assets/world/commercial.png', 'assets/world/clothing-shop.png', 'assets/world/boxing-shop.png']);
  report.cases.push({ case: 'real-doors-and-purchases', spent: 60, ownershipSaved: true, noAutomaticEquip: true }); await d.leave();
}
async function hotelTour() {
  const seed = profile({ tournamentDay: 1 }); seed.setLocation({ scene: 'hotel-room', x: 640, y: 540, facing: 'up' });
  const c = await open(seed, 'scene=hotel-room', { mobile: true }); await ready(c.page, 'hotel-room'); await geometry(c, 'hotel-room-mobile');
  await c.walkUntil('down', 'Couloir · Chambre 201'); await c.interact(); await ready(c.page, 'hotel-corridor'); await geometry(c, 'hotel-corridor-mobile');
  await c.walkUntil('right', 'Ascenseur'); await c.interact(); await c.action('travel-hotel-venue'); await ready(c.page, 'hotel-venue');
  await c.walkUntil('up', 'Rémi · Dans ton coin'); await geometry(c, 'hotel-venue-mobile'); await c.interact(); assert.match(await c.page.locator('#gym-dialog-title').textContent(), /Une chose/); await c.closeDialog();
  await c.page.goto(`${base}?scene=hotel-lobby`); await ready(c.page, 'hotel-lobby'); await geometry(c, 'hotel-lobby-mobile');
  assert.equal((await saved(c.page)).tournament.active.day, 1); assert.equal((await saved(c.page)).daily.energy, 100);
  requireAssets(['assets/hotel/room.png', 'assets/hotel/corridor.png', 'assets/hotel/venue.png', 'assets/hotel/lobby.png']); await c.leave();
}
async function activity(activity, mobile) {
  const seed = profile({ tournamentDay: 1 }); const place = activity === 'pads' ? 'hotel-gym' : 'hotel-pool';
  seed.setLocation(activity === 'pads' ? { scene: place, x: 700, y: 455, facing: 'up' } : { scene: place, x: 80, y: 500, facing: 'up' });
  const c = await open(seed, `scene=${place}`, { mobile, small: mobile }); await ready(c.page, place); await geometry(c, `${place}-${mobile ? 'small-mobile' : 'desktop'}`);
  await c.interact(); await c.action(`activity-${activity}`); await ready(c.page, activity, '#rhythm-ui');
  assert.equal((await saved(c.page)).daily.energy, 100, 'Preparing an activity does not charge');
  const a = mobile ? await buttonPoint(c.page, '#rhythm-ui [data-pad-button="a"]') : null;
  await c.tap('.rhythm-primary'); await wait(c.page, () => document.querySelector('#rhythm-ui').dataset.phase === 'running');
  assert.equal((await saved(c.page)).daily.energy, 90, 'Start charges ten energy once');
  await wait(c.page, () => document.querySelector('.rhythm-conductor')?.dataset.now === 'true');
  if (mobile) { await dispatch(c.cdp, 'touchStart', [a]); await dispatch(c.cdp, 'touchEnd'); } else await c.page.keyboard.press('j');
  await wait(c.page, () => document.querySelector('.rhythm-feedback')?.dataset.tone === 'good');
  await geometry(c, `${activity}-contact-${mobile ? 'small-mobile' : 'desktop'}`, '#rhythm-ui');
  if (mobile) await c.tap('#rhythm-ui .console-menu-button'); else await c.page.keyboard.press('p');
  await wait(c.page, () => document.querySelector('#rhythm-ui').dataset.phase === 'paused');
  const time = await c.page.locator('.rhythm-time').textContent(); await c.page.waitForTimeout(250); assert.equal(await c.page.locator('.rhythm-time').textContent(), time);
  if (mobile) {
    await c.page.setViewportSize({ width: 390, height: 844 }); await c.page.locator('#rotate-prompt').waitFor({ state: 'visible' });
    assert.equal(await c.page.locator('#stage').evaluate(e => e.inert), true); await c.page.screenshot({ path: 'docs/chapter-static-portrait.png' });
    await c.page.setViewportSize({ width: 568, height: 320 }); await c.page.locator('#rotate-prompt').waitFor({ state: 'hidden' });
    assert.equal(await c.page.locator('#rhythm-ui').getAttribute('data-phase'), 'paused', 'Orientation restoration keeps an explicit pause');
  }
  await c.tap('.rhythm-return'); await ready(c.page, place); assert.equal((await saved(c.page)).daily.energy, 90);
  requireAssets(activity === 'pads' ? ['assets/hotel/gym.png', 'assets/hotel/coach-left.png', 'assets/hotel/coach-right.png'] : ['assets/hotel/pool.png', 'assets/hotel/swimmer-0.png', 'assets/hotel/swimmer-1.png']);
  report.cases.push({ case: `${activity}-production-input`, contactScored: true, cost: 10, pausedAndReturned: true }); await c.leave();
}
async function fight(opponent, { locked = false, mobile = false } = {}) {
  const seed = locked ? profile(opponent === 'kramer' ? { qualification: 'none', trained: true } : { tournamentDay: 1 }) : profile(opponent === 'kramer' ? {} : { tournamentDay: 3 });
  const c = await open(seed, `scene=fight&opponent=${opponent}`, { mobile, small: mobile && !locked });
  await ready(c.page, 'sparring', '#sparring-ui'); const root = c.page.locator('#sparring-ui');
  assert.equal(await root.getAttribute('data-opponent'), opponent);
  if (mobile) {
    const panel = await c.page.locator('#sparring-ui .round-panel').evaluate(element => ({
      width: element.getBoundingClientRect().width, contentWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      titleWidth: element.querySelector('.panel-heading').getBoundingClientRect().width,
    }));
    assert.ok(panel.titleWidth >= Math.min(160, panel.width * .6), `The ready opponent title is readable rather than squeezed by an implicit grid column: ${JSON.stringify(panel)}`);
    assert.ok(panel.scrollWidth <= panel.contentWidth + 1, 'The ready menu has no sideways overflow');
  }
  if (locked) {
    await c.page.locator('.fight-access-note').waitFor({ state: 'visible' }); assert.equal(await c.page.locator('#sparring-ui .primary-button').isDisabled(), true);
    assert.match(await c.page.locator('.fight-access-note').textContent(), opponent === 'kramer' ? /Battez Béton/ : /tableau/);
    const before = await saved(c.page);
    // The only usable progression is returning to the place; the unavailable
    // rival cannot grant a result just by opening its direct URL.
    if (mobile) await c.tap('#sparring-ui [data-pad-button="b"]'); else await c.tap('#sparring-ui .return-gym-button');
    await ready(c.page, opponent === 'kramer' ? 'neighborhood' : 'hotel-venue');
    const after = await saved(c.page); assert.deepEqual(after.fights, before.fights); assert.deepEqual(after.wallet, before.wallet);
    report.cases.push({ case: `locked-url-${opponent}`, startDisabled: true, unchangedProgress: true });
  } else {
    if (mobile) {
      await c.page.screenshot({ path: 'docs/chapter-static-gagnon-ready-small-mobile.png' });
      const button = await c.page.locator('#sparring-ui .primary-button').boundingBox();
      const panel = await c.page.locator('#sparring-ui .round-panel').boundingBox();
      assert.ok(button && panel && button.x >= panel.x && button.x + button.width <= panel.x + panel.width + 1
        && button.y >= panel.y && button.y + button.height <= panel.y + panel.height + 1,
      'The ready start button is initially visible within the menu, before focus or scrolling');
      const reading=c.page.locator('#sparring-ui .panel-scroll'), box=await reading.boundingBox();
      assert.ok(box.y+box.height<=button.y,'The scrollable text cannot cover the action footer');
      const overflow=await reading.evaluate(e=>e.scrollHeight>e.clientHeight);
      if(overflow){
        const x=box.x+box.width/2,startY=box.y+box.height-12;
        await dispatch(c.cdp,'touchStart',[{id:3,x,y:startY}]);
        for(let i=1;i<=6;i++){await dispatch(c.cdp,'touchMove',[{id:3,x,y:startY-i*(box.height-24)/6}]);await c.page.waitForTimeout(25);}
        await dispatch(c.cdp,'touchEnd');await c.page.waitForTimeout(150);
        assert.ok(await reading.evaluate(e=>e.scrollTop>0),'The ready details can be scrolled with a real touch swipe');
        await reading.evaluate(e=>{e.scrollTop=0;});
      }
      await c.tap('#sparring-ui [data-pad-button="a"]');
    } else await c.tap('#sparring-ui .primary-button');
    await wait(c.page, () => document.querySelector('#sparring-ui').dataset.phase === 'running');
    assert.equal(await root.getAttribute('data-tournament'), String(opponent !== 'kramer'));
    await geometry(c, `${opponent}-${mobile ? 'small-mobile' : 'desktop'}`, '#sparring-ui');
    if (mobile) {
      const text = await c.page.evaluate(() => {
        const canvas = document.querySelector('canvas').getBoundingClientRect();
        return [...document.querySelectorAll('#sparring-ui .fight-hud, #sparring-ui .fight-feedback, #sparring-ui .fight-signal, #sparring-ui .training-coach')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0').map(e => { const r = e.getBoundingClientRect(); return { name: e.className, top: (r.top - canvas.top) / canvas.height, bottom: (r.bottom - canvas.top) / canvas.height }; });
      });
      for (const label of text) assert.ok(label.bottom <= .25 || label.top >= .91, `Mobile ring text clears the fighters: ${JSON.stringify(label)}`);
    }
    if (mobile) await c.tap('#sparring-ui .console-menu-button'); else await c.page.keyboard.press('p');
    await wait(c.page, () => document.querySelector('#sparring-ui').dataset.phase === 'paused');
    const time = await c.page.locator('.round-time').textContent(); await c.page.waitForTimeout(250); assert.equal(await c.page.locator('.round-time').textContent(), time);
    requireAssets([`assets/sprites/chapter-combat/${opponent}/${opponent}-guard.png`]);
    if (opponent === 'gagnon') requireAssets(['assets/sprites/chapter-combat/competition/competition-guard.png']);
  }
  await c.leave();
}
try {
  const part = process.env.CHAPTER_STATIC_CASE;
  if (!part || part === 'world') { await shopAndStreet(); await hotelTour(); await activity('pads', true); await activity('pool', false); }
  if (!part || part === 'fights') {
    await fight('kramer'); await fight('gagnon', { mobile: true });
    await fight('kramer', { locked: true }); await fight('gagnon', { locked: true, mobile: true });
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack; process.exitCode = 1; console.error(error);
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: 'docs/chapter-static-failure.png' }).catch(() => {});
} finally {
  for (const context of contexts) await context.close(); await browser.close();
  report.loadedResources = loaded.size;
  await writeFile(`docs/chapter-static-${remote ? 'public-' : ''}results.json`, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, failure: report.failure, loadedResources: report.loadedResources }, null, 2));
