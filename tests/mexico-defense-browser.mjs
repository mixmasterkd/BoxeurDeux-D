// Access fixture only. Reads displayed preparations and sends actual keyboard
// or CDP touch inputs; no manufactured attack, impact, guard or outcome state.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { chromium, wait, suppressHotReload, joyPoint, buttonPoint, dispatch } from './control-helpers.mjs';
const browser = await chromium.launch({ headless: true });
const reports = [];
try {
  for (const [opponent, mobile] of [['pablo', false], ['danielo', true]]) {
    const profile = new CareerProfile({ storage: null });
    assert.ok(profile.applyTestCommand('combat danielo').ok);
    const context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1280, height: 900 }, isMobile: mobile, hasTouch: mobile });
    await suppressHotReload(context);
    await context.addInitScript(({key,value}) => localStorage.setItem(key,value), { key: CAREER_STORAGE_KEY, value: profile.exportText() });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`http://127.0.0.1:5173/?scene=fight&opponent=${opponent}`);
    await wait(page, () => window.__sparring?.session.state.phase === 'ready', null, 60000);
    const cdp = mobile ? await context.newCDPSession(page) : null;
    const points = mobile ? { head: await joyPoint(page, '#sparring-ui', 'up'), body: await joyPoint(page, '#sparring-ui', 'down'), left: await joyPoint(page, '#sparring-ui', 'left'), right: await joyPoint(page, '#sparring-ui', 'right'), jab: await buttonPoint(page, '#sparring-ui [data-pad-button="a"]', 2) } : null;
    const keys = {head: 'w', body: 's', left: 'a', right: 'd'};
    let held = null;
    async function direction(next) {
      if (next === held) return;
      if (mobile) {
        if (next) await dispatch(cdp, held ? 'touchMove' : 'touchStart', [points[next]]);
        else if (held) await dispatch(cdp, 'touchEnd', [points[held]]);
      } else {
        if (held) await page.keyboard.up(keys[held]);
        if (next) await page.keyboard.down(keys[next]);
      }
      held = next;
    }
    async function jab() {
      if (mobile) {
        await dispatch(cdp, 'touchStart', [...(held ? [points[held]] : []), points.jab]);
        await dispatch(cdp, 'touchEnd', [points.jab]);
      } else await page.keyboard.press('j');
    }
    if (mobile) { await page.locator('#sparring-ui .primary-button').focus(); await jab(); }
    else await page.keyboard.press('e');
    await wait(page, () => window.__sparring.session.state.phase === 'running');
    const deadline = Date.now() + 35000;
    let didDodge = false;
    while (Date.now() < deadline) {
      const {state, impacts} = await page.evaluate(() => ({state: structuredClone(window.__sparring.session.state), impacts: window.__sparring.impacts}));
      const blocked = new Set(impacts.filter(e => e.type === 'remi-blocked').map(e => e.target));
      const dodged = new Set(impacts.filter(e => e.type === 'remi-dodged').map(e => e.attack));
      const hit = new Set(impacts.filter(e => e.type === 'player-hit').map(e => e.target));
      if (blocked.size === 2 && dodged.size === 2 && hit.size === 2) break;
      const r = state.remi;
      if (r.action.startsWith('tell')) {
        if (blocked.size < 2) await direction(r.target);
        else if (!didDodge && r.duration * (1-r.progress) < .08 && state.player.action === 'idle') {
          await direction(r.safeDodge === 'dodgeRight' ? 'right' : 'left');
          didDodge = true;
        }
      } else if (['jab','cross'].includes(r.action)) {
        // Keep the preselected defense through the actual scored contact.
      } else {
        await direction(null); didDodge = false;
        if (r.action === 'open' && state.player.action === 'idle') {
          await direction(hit.has('head') && !hit.has('body') ? 'body' : null);
          await jab();
        }
      }
      await page.waitForTimeout(25);
    }
    await direction(null);
    const impacts = await page.evaluate(() => window.__sparring.impacts);
    const outcomes = type => [...new Set(impacts.filter(e => e.type === type).map(e => type === 'remi-dodged' ? e.attack : e.target))].sort();
    assert.deepEqual(outcomes('remi-blocked'), ['body','head']);
    assert.deepEqual(outcomes('remi-dodged'), ['cross','jab']);
    assert.deepEqual(outcomes('player-hit'), ['body','head']);
    const contacts = impacts.filter(e => ['remi-blocked','player-hit'].includes(e.type));
    assert.ok(contacts.every(e => e.remiTexture.startsWith(`${opponent}-`) && Math.hypot(e.x-e.targetPoint.x,e.y-e.targetPoint.y) < 2));
    assert.deepEqual(errors, []);
    reports.push({ opponent, mobile, blocked: outcomes('remi-blocked'), exteriorDodged: outcomes('remi-dodged'), landed: outcomes('player-hit'), alignedContacts: contacts.length, errors });
    await context.close();
  }
  await fs.writeFile('docs/mexico-defense-browser-results.json', JSON.stringify({ reports }, null, 2) + '\n');
  console.log('Pablo keyboard / Danielo mobile568: both-height guards and hits, both exterior dodges, contacts aligned.');
} finally { await browser.close(); }
