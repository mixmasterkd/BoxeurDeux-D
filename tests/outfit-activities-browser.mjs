import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, fit, buttonPoint, dispatch } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';

const base = process.env.GAME_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true }), errors = [], checks = [];
function seed(outfit) {
  const profile = new CareerProfile({ storage: null });
  for (let i = 0; i < 3; i++) { profile.startDelivery(); DELIVERY_STOPS.forEach(id => profile.deliverParcel(id, { tip: 2 })); }
  assert.equal(profile.buyItem(outfit).ok, true); assert.equal(profile.equipItem(outfit, 'gym').ok, true);
  profile.sleep();
  return profile.exportText();
}
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
};
try {
  for (const mobile of [false, true]) for (const activity of ['bag', 'shadow', 'rope', 'speedball']) {
    const outfit = ['bag', 'shadow'].includes(activity) ? 'boxing-emerald' : 'boxing-burgundy';
    const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile });
    await context.routeWebSocket('**', socket => {
      const server = socket.connectToServer();
      server.onMessage(message => {
        if (typeof message === 'string' && /"type":"(?:update|full-reload)"/.test(message)) return;
        socket.send(message);
      });
    });
    await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: CAREER_STORAGE_KEY, value: seed(outfit) });
    const page = await context.newPage(); watch(page);
    await page.goto(new URL(`?scene=${activity}`, base).href);
    await wait(page, activity => {
      const bridge = activity === 'bag' ? window.__bag : activity === 'shadow' ? window.__shadow : window.__rhythm;
      return bridge?.session.state.phase === 'ready';
    }, activity, 30000);
    const ready = await page.evaluate(activity => {
      const bridge = activity === 'bag' ? window.__bag : activity === 'shadow' ? window.__shadow : window.__rhythm;
      const view = bridge.scene.fighter ?? bridge.scene.view;
      return { texture: view.sprite.texture.key, cached: Object.keys(bridge.scene.textures.list).filter(key => key.startsWith('outfit-')).length,
        reflected: view.reflection?.texture.key, phase: bridge.session.state.phase };
    }, activity);
    assert.ok(ready.texture.startsWith(`outfit-${outfit}-`), JSON.stringify(ready));
    assert.ok(ready.cached >= (activity === 'rope' ? 6 : activity === 'speedball' ? 4 : 14), 'all chosen poses are prepared before the first action');
    if (activity === 'shadow') assert.equal(ready.texture, ready.reflected);
    const root = activity === 'bag' ? '#bag-ui' : activity === 'shadow' ? '#shadow-ui' : '#rhythm-ui';
    const primary = activity === 'bag' ? '.bag-start-button' : activity === 'shadow' ? '.shadow-start-button' : '.rhythm-primary';
    const button = page.locator(primary);
    if (mobile) await button.tap(); else await button.click();
    await wait(page, activity => (activity === 'bag' ? window.__bag : activity === 'shadow' ? window.__shadow : window.__rhythm).session.state.phase === 'running', activity);
    const cdp = mobile ? await context.newCDPSession(page) : null;
    const contact = mobile ? await buttonPoint(page, `${root} [data-pad-button="a"]`) : null;
    if (['rope', 'speedball'].includes(activity)) await wait(page, () => window.__rhythm?.session.state.elapsed >= window.__rhythm?.session.state.beat.inputAt - .015);
    if (mobile) { await dispatch(cdp, 'touchStart', [contact]); await dispatch(cdp, 'touchEnd', []); }
    else await page.keyboard.press('KeyJ');
    await wait(page, activity => (activity === 'bag' ? window.__bag.impacts : activity === 'shadow' ? window.__shadow.motions : window.__rhythm.impacts).length > 0, activity);
    const moved = await page.evaluate(activity => {
      const bridge = activity === 'bag' ? window.__bag : activity === 'shadow' ? window.__shadow : window.__rhythm;
      const view = bridge.scene.fighter ?? bridge.scene.view;
      return { texture: view.sprite.texture.key, phase: view.phase ?? view.poseName,
        event: (bridge.impacts ?? bridge.motions).at(-1), reflected: view.reflection?.texture.key };
    }, activity);
    assert.ok(moved.texture.startsWith(`outfit-${outfit}-`));
    if (activity === 'shadow') {
      assert.ok(moved.event.texture.startsWith(`outfit-${outfit}-`)); assert.equal(moved.event.texture, moved.event.reflectedTexture);
    } else if (activity === 'bag') {
      assert.ok(Math.hypot(moved.event.contactPoint.x - moved.event.targetPoint.x, moved.event.contactPoint.y - moved.event.targetPoint.y) < 2);
    } else assert.equal(moved.event.type, 'hit', JSON.stringify(moved.event));
    const layout = await fit(page, root, mobile); assert.ok(layout.fits && layout.noScroll);
    if (mobile) assert.ok(layout.controls.every(control => control.outside));
    else assert.equal(layout.controls.length, 0);
    await page.screenshot({ path: `references/characters/outfits/${activity}-${mobile ? 'mobile' : 'desktop'}.png` });
    checks.push({ activity, mobile, outfit, ready, moved, layout });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile('references/characters/outfits/activities-proof.json', JSON.stringify({ checks, errors }, null, 2) + '\n');
  console.log('Outfits: bag, shadow/reflection, rope and speedball played with purchased equipment on desktop and real simulated touch; scored contacts and frame verified.');
} catch (error) { console.error({ errors, completed: checks.map(check => `${check.activity}-${check.mobile}`) }); throw error; }
finally { await browser.close(); }
