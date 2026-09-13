import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, wait, fit, suppressHotReload, dispatch, joyPoint, buttonPoint } from './control-helpers.mjs';
import { CareerProfile } from '../src/game/CareerProfile.js';
const url = process.env.SPARRING_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true });
const report = { tests: [], errors: [], failure: null };
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('boxeur-deux-d-career-v1')));
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile });
    await suppressHotReload(context);
    const p = await context.newPage(), label = mobile ? 'mobile' : 'desktop', cdp = mobile ? await context.newCDPSession(p) : null;
    p.on('pageerror', e => report.errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
    const tap = async selector => { if (!mobile) return p.locator(selector).click(); await p.locator(selector).scrollIntoViewIfNeeded(); await dispatch(cdp, 'touchStart', [await buttonPoint(p, selector)]); await dispatch(cdp, 'touchEnd'); };
    const confirm = root => mobile ? tap(`${root} [data-pad-button="a"]`) : p.keyboard.press('KeyE');
    const back = root => mobile ? tap(`${root} [data-pad-button="b"]`) : p.keyboard.press('Escape');
    const move = async (axis, target) => {
      const before = await p.evaluate(a => __gym.world.state[a], axis); if (Math.abs(before - target) < 8) return;
      const positive = before < target, dir = axis === 'x' ? positive ? 'right' : 'left' : positive ? 'down' : 'up';
      const key = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' }[dir];
      if (mobile) await dispatch(cdp, 'touchStart', [await joyPoint(p, '#gym-ui', dir)]); else await p.keyboard.down(key);
      try { await wait(p, ({ axis, target, positive }) => positive ? __gym.world.state[axis] >= target - 3 : __gym.world.state[axis] <= target + 3, { axis, target, positive }); }
      catch (error) { console.error('Walk failure', axis, target, await p.evaluate(() => ({ state: __gym.world.state, input: __gym.world.input, dialog: Boolean(__gym.scene.ui.dialog) }))); throw error; }
      finally { if (mobile) await dispatch(cdp, 'touchEnd'); else await p.keyboard.up(key); }
    };
    await p.goto(url + '?scene=gym'); await wait(p, () => window.__gym?.scene.player); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(750);
    const f = await fit(p, '#gym-ui', mobile); assert.ok(f.fits && f.noScroll); assert.equal(f.controls.length === 0, !mobile);
    await p.screenshot({ path: `docs/friends-gym-${label}.png` });
    await move('x', 350); await move('y', 542);
    const gymEntry = await p.evaluate(() => ({ x: __gym.world.state.x, y: __gym.world.state.y }));
    await confirm('#gym-ui');
    await wait(p, () => document.querySelector('[data-gym-action="friend-pads"]'));
    assert.match(await p.locator('.gym-dialog').innerText(), /FREDO/);
    await p.screenshot({ path: `docs/friends-fredo-menu-${label}.png` });
    await tap('[data-gym-action="friend-pads"]'); await wait(p, () => window.__hotelActivity?.scene.fromGym);
    assert.equal((await saved(p)).daily.energy, 100, 'Walking and ready menus cost no energy');
    await confirm('#rhythm-ui'); await wait(p, () => __hotelActivity.session.state.phase === 'running');
    assert.equal((await saved(p)).daily.energy, 90);
    await tap('#rhythm-ui .activity-exit-button'); await wait(p, () => window.__gym?.scene.player);
    assert.deepEqual(await p.evaluate(() => ({ x: __gym.world.state.x, y: __gym.world.state.y })), gymEntry, 'Pads return to the actual entry position');
    await move('y', 610); await move('x', 1040); await move('y', 601);
    for (const drill of ['basics', 'defense', 'combo']) {
      await confirm('#gym-ui'); await wait(p, () => document.querySelector('[data-gym-action="friend-drill-basics"]'));
      if (drill === 'basics') {
        await tap('[data-gym-action="friend-octopus-advice"]'); await wait(p, () => /Avant Béton/.test(document.querySelector('#gym-dialog-title')?.textContent));
        await back('#gym-ui'); await confirm('#gym-ui');
      }
      await tap(`[data-gym-action="friend-drill-${drill}"]`); await wait(p, () => window.__shadow?.scene.drill);
      const beforeEnergy = (await saved(p)).daily.energy;
      await confirm('#shadow-ui'); await wait(p, () => __shadow.session.state.phase === 'running');
      assert.equal((await saved(p)).daily.energy, beforeEnergy - 10);
      await p.screenshot({ path: `docs/friends-${drill}-${label}.png` });
      for (let step = 0; step < 24; step++) {
        const d = await p.evaluate(() => ({ expected: __shadow.scene.drill.expected, progress: __shadow.scene.drill.progress, completed: __shadow.scene.drill.completed }));
        if (d.completed) break;
        const action = async input => {
          await wait(p, () => ['idle', 'guard'].includes(__shadow.session.state.player.action));
          if (mobile) {
            if (input.startsWith('dodge')) { await dispatch(cdp, 'touchStart', [await joyPoint(p, '#shadow-ui', input === 'dodgeLeft' ? 'left' : 'right')]); await dispatch(cdp, 'touchEnd'); }
            else await tap(`#shadow-ui [data-action="${input}"]`);
          } else await p.keyboard.press({ jab: 'KeyJ', cross: 'KeyK', dodgeLeft: 'KeyA', dodgeRight: 'KeyD' }[input]);
          await wait(p, () => __shadow.session.state.player.action !== 'idle');
          await wait(p, () => __shadow.session.state.player.action === 'idle' || __shadow.scene.drill.completed);
        };
        if (d.expected.startsWith('guard')) {
          const high = d.expected === 'guardHead';
          if (mobile) await dispatch(cdp, 'touchStart', [await joyPoint(p, '#shadow-ui', high ? 'up' : 'down')]); else await p.keyboard.down(high ? 'KeyW' : 'KeyS');
          await wait(p, n => __shadow.scene.drill.progress > n, d.progress);
          if (mobile) await dispatch(cdp, 'touchEnd'); else await p.keyboard.up(high ? 'KeyW' : 'KeyS');
        } else if (d.expected === 'combo') for (const input of ['jab', 'cross', 'jab']) await action(input);
        else await action(d.expected);
      }
      await wait(p, () => __shadow.session.state.phase === 'finished');
      assert.equal(await p.evaluate(() => __shadow.scene.drill.completed), true);
      assert.equal((await saved(p)).stats.power, 0, 'Friendly drills grant no automatic combat bonus');
      await p.screenshot({ path: `docs/friends-${drill}-done-${label}.png` });
      await tap('#shadow-ui .activity-exit-button'); await wait(p, () => window.__gym?.scene.player);
      report.tests.push({ device: label, drill, completedThroughControls: true, energy: (await saved(p)).daily.energy });
    }
    assert.equal((await saved(p)).daily.energy, 60);
    await p.goto(url); await wait(p, () => document.querySelector('.career-continue')); await tap('.career-continue'); await wait(p, () => window.__gym?.scene.player);
    assert.equal((await saved(p)).daily.energy, 60);
    await context.close();
  }
  // Funds are an isolated fixture; purchase/equip are actual UI actions.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await suppressHotReload(context);
  const fixture = new CareerProfile({ storage: null }); fixture.profile.wallet = { money: 60, totalEarned: 60 }; fixture.setLocation({ scene: 'clothing-shop', x: 640, y: 345, facing: 'up' });
  await context.addInitScript(save => { if (!localStorage.getItem('boxeur-deux-d-career-v1')) localStorage.setItem('boxeur-deux-d-career-v1', save); }, fixture.exportText());
  const p = await context.newPage(); p.on('pageerror', e => report.errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  await p.goto(url); await wait(p, () => document.querySelector('.career-continue')); await p.locator('.career-continue').click(); await wait(p, () => window.__exploration?.scene.player);
  await p.keyboard.press('KeyE'); await p.locator('[data-gym-action="buy-street-octopus"]').click();
  await p.screenshot({ path: 'docs/friends-shirt-shop.png' });
  await p.locator('[data-gym-action="confirm-buy-street-octopus"]').click(); assert.equal((await saved(p)).wallet.money, 15);
  assert.equal((await saved(p)).inventory.equipped.street, 'street-black');
  await p.goto(url + '?scene=home'); await wait(p, () => window.__exploration?.scene.place === 'home');
  async function homeMove(axis, target) {
    const value = await p.evaluate(a => __exploration.world.state[a], axis), positive = value < target;
    const key = axis === 'x' ? positive ? 'KeyD' : 'KeyA' : positive ? 'KeyS' : 'KeyW';
    await p.keyboard.down(key);
    try { await wait(p, ({ axis, target, positive }) => positive ? __exploration.world.state[axis] >= target - 3 : __exploration.world.state[axis] <= target + 3, { axis, target, positive }); }
    finally { await p.keyboard.up(key); }
  }
  await homeMove('y', 380); await homeMove('x', 164); await homeMove('y', 331); await p.keyboard.press('KeyE');
  await p.locator('[data-gym-action="equip-street-octopus"]').click(); assert.equal((await saved(p)).inventory.equipped.street, 'street-octopus');
  await p.keyboard.press('Escape'); await p.keyboard.press('KeyS');
  await wait(p, () => __exploration.scene.player.texture.key.startsWith('outfit-street-octopus-'));
  await p.screenshot({ path: 'docs/friends-shirt-home.png' });
  await p.goto(url); await wait(p, () => document.querySelector('.career-continue')); await p.locator('.career-continue').click();
  await wait(p, () => __exploration.scene.player.texture.key.startsWith('outfit-street-octopus-'));
  report.tests.push({ shirt: 'street-octopus', purchasedThroughUI: true, paid: 45, equippedSeparately: true, wardrobeThroughWalking: true, reloadedOutfit: true });
  await context.close();
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; process.exitCode = 1; console.error(error); }
finally { fs.writeFileSync('docs/gym-friends-browser-results.json', JSON.stringify(report, null, 2)); await browser.close(); }
