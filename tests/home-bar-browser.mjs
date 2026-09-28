// Whole-room journeys use real keyboard/CDP touch and ordinary persisted saves.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, wait, suppressHotReload, fit, dispatch, joyPoint, buttonPoint } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { HOME_BAR_LAYOUTS, ISLAND_BAR_RETURN } from '../src/game/HomeBarWorld.js';

const built = process.env.HOME_BUILT === '1', publicSite = !built && Boolean(process.env.HOME_URL);
const url = built ? 'https://home-build.invalid/BoxeurDeux-D/' : process.env.HOME_URL ?? process.env.SPARRING_URL ?? 'http://127.0.0.1:5173/';
const scope = process.env.HOME_SCOPE ?? 'all';
const output = `outputs/verification/${scope === 'bar' ? 'bar-street' : 'home-bar'}/${built ? 'built' : publicSite ? 'public' : 'dev'}`;
fs.mkdirSync(output, { recursive: true });
const report = { date: new Date().toISOString(), url, built, publicSite, scope, mobileEmulated: true, cases: [], errors: [], failure: null };
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
const progress = profile => ({ stats: profile.stats, caps: profile.caps, wallet: profile.wallet, inventory: profile.inventory, fights: profile.fights, tournament: profile.tournament, marathon: profile.marathon, casino: profile.casino, leisure: profile.leisure });
let activePage;

async function session(mobile, location, { legacyBar = false } = {}) {
  const profile = new CareerProfile({ storage: null }); profile.setLocation(location);
  if (legacyBar) {
    // This is the existing version-7 bar save format: no new street fields,
    // imported as-is with previously completed games against both opponents.
    for (const [opponent, winner] of [['beton', 'player'], ['kramer', 'opponent']]) {
      const game = profile.beginLeisureGame('billiards', opponent); assert.ok(game.ok);
      assert.ok(profile.recordLeisureResult({ id: game.id, winner }).ok);
    }
  }
  profile.inspectImport(profile.exportText());
  const context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
  if (!built && !publicSite) await suppressHotReload(context);
  if (built) await context.route('https://home-build.invalid/BoxeurDeux-D/**', async route => {
    const file = path.resolve('dist', decodeURIComponent(new URL(route.request().url()).pathname.slice('/BoxeurDeux-D/'.length)) || 'index.html');
    if (!file.startsWith(path.resolve('dist') + path.sep)) return route.abort();
    try { await route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' })[path.extname(file)] ?? 'application/octet-stream' }); }
    catch { await route.fulfill({ status: 404, body: 'Missing asset' }); }
  });
  await context.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) { localStorage.setItem(key, data); localStorage.setItem(`${key}-backup`, data); } }, { key: CAREER_STORAGE_KEY, data: profile.exportText() });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(publicSite ? 60000 : 30000);
  const requests = []; page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  const cdp = mobile ? await context.newCDPSession(page) : null;
  const tap = async selector => {
    await page.locator(selector).waitFor({ state: 'visible' });
    if (mobile) { await page.locator(selector).scrollIntoViewIfNeeded(); await dispatch(cdp, 'touchStart', [await buttonPoint(page, selector)]); await dispatch(cdp, 'touchEnd'); }
    else await page.locator(selector).click();
    await page.waitForTimeout(80);
  };
  const save = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CAREER_STORAGE_KEY);
  const state = async () => ({ ...(await save()).location, rendered: await page.locator('#stage').getAttribute('data-scene'), mode: await page.locator('#gym-ui').getAttribute('data-mode') });
  const ready = async place => {
    await wait(page, place => document.querySelector('#stage')?.dataset.scene === place, place, 40000);
    for (const selector of ['.career-start-continue', '.career-continue']) if (await page.locator(selector).isVisible()) await tap(selector);
    await page.locator('#scene-loading').waitFor({ state: 'hidden' });
    await wait(page, ({ key, place }) => JSON.parse(localStorage.getItem(key)).location.scene === place, { key: CAREER_STORAGE_KEY, place });
    await page.waitForTimeout(140);
  };
  const drive = async (direction, duration, flush = true) => {
    const before = await state(), key = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[direction];
    if (mobile) await dispatch(cdp, 'touchStart', [await joyPoint(page, '#gym-ui', direction)]); else await page.keyboard.down(key);
    try { await page.waitForTimeout(duration); } finally { if (mobile) await dispatch(cdp, 'touchEnd'); else await page.keyboard.up(key); }
    await page.waitForTimeout(80);
    const after = await state();
    if (flush && after.scene === before.scene && after.rendered === before.scene && after.mode === 'walking') {
      if (mobile) await tap('#gym-ui .gym-pause-button'); else await page.keyboard.press('KeyP');
      await tap('#gym-ui .gym-resume-button');
    }
  };
  const axis = async (axis, target) => {
    const first = await state(); let previous = first[axis], stuck = 0;
    for (let step = 0; step < 100; step++) {
      const current = await state(); if (process.env.HOME_TRACE === '1') console.log('WALK',axis,target,JSON.stringify(current)); if (current.scene !== first.scene) return;
      // CDP touch delivery advances a whole frame before release; allow that
      // gesture-sized margin at waypoints. Reload assertions remain exact.
      const delta = target - current[axis]; if (Math.abs(delta) <= (mobile ? 12 : 7)) return;
      await drive(axis === 'x' ? delta > 0 ? 'right' : 'left' : delta > 0 ? 'down' : 'up', Math.min(800, Math.max(35, Math.abs(delta) / 225 * 850)));
      const after = await state(); if (after.scene !== first.scene || after.mode === 'dialog') return;
      stuck = Math.abs(after[axis] - previous) < 1 ? stuck + 1 : 0;
      assert.ok(stuck < 6, `Blocked ${first.scene} ${axis}→${target} at ${JSON.stringify(after)}`); previous = after[axis];
    }
    throw new Error(`Walk timed out ${first.scene} ${axis}→${target}`);
  };
  const move = async (x, y) => { const place = (await state()).scene; await axis('x', x); if ((await state()).scene === place) await axis('y', y); };
  const follow = async points => { const place = (await state()).scene; for (const [x, y] of points) { await move(x, y); if ((await state()).scene !== place) return; } };
  const interact = async () => { if (mobile) await tap('#gym-ui [data-pad-button="a"]'); else await page.keyboard.press('KeyE'); await page.locator('.gym-dialog:not([hidden])').waitFor({ state: 'visible' }); };
  const choose = id => tap(`[data-gym-action="${id}"]`);
  const shot = name => page.screenshot({ path: `${output}/${mobile ? 'mobile568' : 'desktop'}-${name}.png` });
  const reload = async place => { const before = await save(); await page.reload(); await ready(place); const after = await save(); assert.deepEqual(progress(after), progress(before)); assert.deepEqual(after.daily, before.daily); assert.deepEqual(after.location, before.location); };
  return { context, page, requests, initial: profile.snapshot(), save, state, tap, ready, drive, axis, move, follow, interact, choose, shot, reload };
}

async function house(mobile) {
  const s = await session(mobile, { scene: 'home', x: 640, y: 610, facing: 'up' }); const checks = [];
  console.log(`HOME tour ${mobile ? 'mobile' : 'desktop'}`);
  try {
    await s.page.goto(url); await s.ready('home'); await s.shot('living');
    await s.follow([[374,610],[374,290],[374,220]]); await s.ready('home-office');
    const computer = HOME_BAR_LAYOUTS['home-office'].stations.find(station => station.id === 'laptop');
    await s.move(computer.x, computer.y); await s.interact();
    await s.page.locator('.laptop-window[data-page="desktop"]').waitFor({ state: 'visible' });
    await s.shot('desktop-computer'); await s.choose('laptop-close');
    await s.follow([[640,610],[640,675]]); await s.ready('home'); checks.push('Physical living room / computer room with working desktop');
    await s.follow([[374,335],[130,335],[80,330]]); await s.ready('home-garage');
    await s.follow([[800,610],[800,460]]); await s.interact(); assert.match(await s.page.locator('#gym-dialog-text').textContent(), /GR Corolla/);
    await s.shot('corolla-dialogue'); await s.choose('close'); await s.shot('garage');
    await s.follow([[800,610],[640,610],[640,675]]); await s.ready('home'); checks.push('Parked GR Corolla and return door');
    await s.follow([[135,460],[980,460],[980,235]]); await s.ready('home-landing'); await s.shot('landing');
    await s.follow([[640,470],[940,470],[940,292]]); await s.ready('home-karl');
    const gaming = HOME_BAR_LAYOUTS['home-karl'].stations.find(station => station.id === 'gaming-laptop');
    await s.follow([[640,530],[gaming.x,530],[gaming.x,gaming.y]]); await s.shot('karl-gaming'); await s.interact();
    assert.match(await s.page.locator('#gym-dialog-text').textContent(), /Karl est installé/);
    await s.choose('invite-karl'); assert.match(await s.page.locator('#gym-dialog-text').textContent(), /descend au salon/); await s.choose('close');
    await s.shot('karl-left-bedroom'); await s.follow([[640,610],[640,675]]); await s.ready('home-landing');
    await s.follow([[640,345],[640,470],[345,470],[345,292]]); await s.ready('home-bedroom');
    const bed = HOME_BAR_LAYOUTS['home-bedroom'].stations.find(station => station.id === 'bed');
    await s.follow([[560,550],[bed.x,550],[bed.x,bed.y]]); await s.interact(); await s.choose('sleep');
    await wait(s.page, () => document.querySelector('#gym-dialog-title')?.textContent.startsWith('Jour '), null, 15000);
    await s.choose('close'); const morning = await s.save(); assert.equal(morning.location.scene, 'home-bedroom'); assert.equal(morning.daily.day, s.initial.daily.day + 1); assert.equal(morning.daily.energy,100);
    await s.reload('home-bedroom'); await s.shot('bedroom-morning');
    const wardrobe = HOME_BAR_LAYOUTS['home-bedroom'].stations.find(station => station.id === 'wardrobe');
    await s.follow([[600,510],[wardrobe.x,510],[wardrobe.x,wardrobe.y]]); await s.interact(); await s.shot('wardrobe'); await s.choose('close');
    const medals = HOME_BAR_LAYOUTS['home-bedroom'].stations.find(station => station.id === 'medals');
    await s.follow([[900,360],[medals.x,medals.y]]); await s.interact(); assert.match(await s.page.locator('#gym-dialog-title').textContent(),/collection/); await s.choose('close');
    await s.follow([[640,610],[640,675]]); await s.ready('home-landing'); await s.follow([[640,345],[640,660]]); await s.ready('home');
    // Reload resets the visit's NPC placement. Invite Karl from the console too.
    await s.follow([[980,580],[770,580]]); await s.interact();
    if (await s.page.locator('[data-gym-action="invite-karl"]').isVisible()) await s.choose('invite-karl');
    assert.ok(await s.page.locator('[data-gym-action="race-karl"]').isVisible()); await s.choose('close'); await s.shot('karl-at-xbox');
    checks.push('Upstairs, Karl gaming / invitation, sleep once, wardrobe, medals, exact reload and Xbox invitation');
    await s.follow([[640,610],[640,675]]); await s.ready('neighborhood'); await s.shot('house-street');
    await s.move(408,508); await s.ready('home'); await s.shot('house-return');
    checks.push('Original house door still joins the neighborhood in both directions');
    const final = await s.save(); assert.deepEqual(progress(final),progress(s.initial)); assert.equal(final.daily.day,s.initial.daily.day+1);
    new CareerProfile({storage:null}).inspectImport(JSON.stringify(final));
    const geometry = await fit(s.page,'#gym-ui',mobile); assert.ok(geometry.fits&&geometry.noScroll&&geometry.controls.every(control=>control.outside&&control.fits));
    report.cases.push({name:`house-${mobile?'mobile':'desktop'}`,checks,geometry});
  } catch(error) { await s.shot('house-failure').catch(()=>{}); throw error; } finally { await s.context.close(); }
}

async function bar(mobile) {
  const s = await session(mobile,{scene:'neighborhood',x:2150,y:716,facing:'right'}); console.log(`BAR street tour ${mobile?'mobile':'desktop'}`);
  try {
    await s.page.goto(url); await s.ready('neighborhood'); await s.shot('neighborhood-east');
    await s.axis('x',2350); await s.ready('bar-street'); await s.reload('bar-street'); await s.shot('street-west-arrival');
    await s.follow([[1450,760],[1450,710]]); await s.shot('street-bar-exterior');
    await s.axis('y',630); await s.ready('island-bar'); await s.reload('island-bar');
    if (scope !== 'bar') {
      await s.page.waitForTimeout(7700); await s.shot('beton-banter'); const before = await s.state();
      await s.drive('left',300,false); await s.page.waitForTimeout(2700); const after = await s.state();
      assert.equal(after.mode,'walking'); assert.ok(after.x<before.x-20,'Silent banter never blocks movement'); await s.shot('kramer-banter');
    }
    for (const opponent of ['beton','kramer']) {
      const npc = HOME_BAR_LAYOUTS['island-bar'].stations.find(station=>station.id===opponent);
      await s.follow([[640,530],[npc.x,530],[npc.x,npc.y+65]]); await s.shot(`${opponent}-walking`); await s.interact();
      const text = await s.page.locator('#gym-dialog-text').textContent(); assert.match(text,/Yo tu cé pas chui qui man !/); assert.match(text,/Non TOI tu cé pas chui qui man !/);
      assert.ok(await s.page.locator(`[data-gym-action="pool-${opponent}"]`).isVisible()); await s.shot(`${opponent}-invitation`); await s.choose('close'); await s.shot(`${opponent}-after-dialogue`);
    }
    await s.follow([[1030,530],[640,530],[640,675]]); await s.ready('bar-street');
    assert.deepEqual((await s.save()).location,ISLAND_BAR_RETURN); await s.shot('bar-street-return');
    await s.follow([[1450,760],[110,760],[40,760]]); await s.ready('neighborhood'); await s.shot('neighborhood-return');
    const final = await s.save(); assert.deepEqual(progress(final),progress(s.initial)); assert.deepEqual(final.daily,s.initial.daily);
    new CareerProfile({storage:null}).inspectImport(JSON.stringify(final));
    const geometry=await fit(s.page,'#gym-ui',mobile); assert.ok(geometry.fits&&geometry.noScroll&&geometry.controls.every(control=>control.outside&&control.fits));
    report.cases.push({name:`bar-street-${mobile?'mobile':'desktop'}`,freeBeforeBronze:true,bothOpponents:true,...(scope!=='bar'?{silentBanterNonblocking:true}:{}),neighborhoodStreetBarRoundTrip:true,exactReload:true,progressionUnchanged:true,geometry});
  } catch(error) { await s.shot('bar-failure').catch(()=>{}); throw error; } finally { await s.context.close(); }
}

async function legacyBar(mobile) {
  const s=await session(mobile,{scene:'island-bar',x:640,y:610,facing:'down'},{legacyBar:true}); console.log(`BAR legacy save ${mobile?'mobile':'desktop'}`);
  try {
    await s.page.goto(url); await s.ready('island-bar'); await s.reload('island-bar');
    assert.deepEqual((await s.save()).leisure,s.initial.leisure); await s.shot('legacy-bar-loaded');
    await s.axis('y',675); await s.ready('bar-street');
    assert.deepEqual((await s.save()).location,ISLAND_BAR_RETURN,'An existing island-bar save now exits into the new city street.');
    await s.reload('bar-street'); await s.shot('legacy-bar-new-exit');
    await s.follow([[1450,760],[110,760],[40,760]]); await s.ready('neighborhood');
    const after=await s.save(); assert.deepEqual(progress(after),progress(s.initial)); assert.deepEqual(after.daily,s.initial.daily);
    assert.deepEqual(after.leisure.billiards,{beton:{playerWins:1,opponentWins:0},kramer:{playerWins:0,opponentWins:1}});
    report.cases.push({name:`legacy-bar-${mobile?'mobile':'desktop'}`,originalInteriorId:'island-bar',savedVersion:s.initial.version,oldScoresPreserved:true,exitToNewStreet:true,newStreetSaveReload:true,returnToNeighborhood:true,moneyEnergyProgressUnchanged:true});
  } catch(error) { await s.shot('legacy-bar-failure').catch(()=>{}); throw error; } finally { await s.context.close(); }
}

async function formerIslandBar(mobile) {
  const s=await session(mobile,{scene:'marathon-island',x:440,y:800,facing:'up'}); console.log(`BAR former island site ${mobile?'mobile':'desktop'}`);
  try {
    await s.page.goto(url); await s.ready('marathon-island'); assert.deepEqual((await s.save()).location,s.initial.location); await s.axis('y',738); await s.drive('up',500);
    assert.equal((await s.state()).scene,'marathon-island'); assert.equal((await s.state()).mode,'walking');
    assert.doesNotMatch(await s.page.locator('.gym-nearby-label').textContent(),/bar|billard/i);
    if(!mobile)await s.page.keyboard.press('KeyE');
    assert.equal(await s.page.locator('.gym-dialog:not([hidden])').count(),0,'The removed island doorway offers no ghost interaction.');
    assert.ok(!s.requests.some(url=>new URL(url).pathname.endsWith('/assets/bar/exterior.png')),'The old island no longer loads the removed bar facade.');
    await s.shot('island-former-bar'); await s.reload('marathon-island');
    const after=await s.save(); assert.deepEqual(progress(after),progress(s.initial)); assert.deepEqual(after.daily,s.initial.daily);
    report.cases.push({name:`former-island-bar-${mobile?'mobile':'desktop'}`,oldPositionStillValid:true,noPhantomDoor:true,noBarInteraction:true,noBarFacadeAsset:true,reloadSafe:true,progressionUnchanged:true});
  } catch(error) { await s.shot('former-island-bar-failure').catch(()=>{}); throw error; } finally { await s.context.close(); }
}

try {
  const modes=process.env.HOME_MOBILE==='1'?[true]:process.env.HOME_DESKTOP==='1'?[false]:[false,true];
  for(const mobile of modes){if(scope!=='bar')await house(mobile);await bar(mobile);await legacyBar(mobile);await formerIslandBar(mobile);} assert.deepEqual(report.errors,[]);
} catch(error) { report.failure=error.stack;process.exitCode=1;console.error(error);if(activePage&&!activePage.isClosed())await activePage.screenshot({path:`${output}/failure.png`}).catch(()=>{}); }
finally { await browser.close();fs.writeFileSync(`${output}/results${process.env.HOME_MOBILE==='1'?'-mobile':process.env.HOME_DESKTOP==='1'?'-desktop':''}.json`,JSON.stringify(report,null,2)+'\n'); }
console.log(JSON.stringify(report,null,2));
