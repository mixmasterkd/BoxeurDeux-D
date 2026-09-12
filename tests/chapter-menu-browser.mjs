import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait } from './control-helpers.mjs';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';

const browser = await chromium.launch({ headless: true }), errors = [], checks = [];
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/';
function prepared() {
  const profile = new CareerProfile({ storage: null });
  profile.recordFight({ opponent: 'beton', winner: 'player' }); profile.recordFight({ opponent: 'kramer', winner: 'player' });
  for (let i = 0; i < 8; i++) {
    if (profile.dailyStatus().energy < 30) profile.sleep();
    profile.startDelivery(); DELIVERY_STOPS.forEach(id => profile.deliverParcel(id, { tip: 2 }));
  }
  profile.buyItem('boxing-emerald'); profile.equipItem('boxing-emerald', 'gym'); profile.startTournament();
  const win = () => { const state = profile.tournamentStatus(); profile.recordTournamentFight({ opponent: state.opponent, winner: 'player', score: 15, matchId: state.currentMatchId }); };
  win(); profile.sleep(); const active = profile.exportText();
  win(); profile.sleep(); win(); profile.leaveTournament();
  profile.setLocation({ scene: 'gym', x: 640, y: 585, facing: 'down' });
  return { active, champion: profile.exportText() };
}
const seeds = prepared();
async function openContext(mobile, source) {
  const context = await browser.newContext({ viewport: mobile ? { width: 568, height: 320 } : { width: 1280, height: 720 }, isMobile: mobile, hasTouch: mobile });
  await context.routeWebSocket('**', socket => {
    const server = socket.connectToServer(); server.onMessage(message => {
      if (typeof message === 'string' && /"type":"(?:update|full-reload)"/.test(message)) return;
      socket.send(message);
    });
  });
  await context.addInitScript(({ key, source }) => localStorage.setItem(key, source), { key: CAREER_STORAGE_KEY, source });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return { context, page };
}
const activate = (locator, mobile) => mobile ? locator.tap() : locator.click();
try {
  for (const mobile of [false, true]) {
    {
      const { context, page } = await openContext(mobile, seeds.active);
      await page.goto(base); await page.locator('#career-menu:not([hidden])').waitFor();
      assert.match(await page.locator('#career-title').textContent(), /Hôtel · Chambre/);
      assert.match(await page.locator('.career-chapter').textContent(), /J2\/3 · Demi-finale/);
      assert.match(await page.locator('.career-stats').textContent(), /16 \/ 500 \$/);
      const primary = await page.locator('.career-continue').boundingBox();
      assert.ok(primary.y >= 0 && primary.y + primary.height <= (mobile ? 320 : 720));
      await page.screenshot({ path: `references/characters/outfits/career-${mobile ? 'mobile' : 'desktop'}.png` });
      checks.push({ case: 'career-resume', mobile, primary }); await context.close();
    }
    {
      const { context, page } = await openContext(mobile, seeds.champion);
      await page.goto(new URL('?scene=gym', base).href); await wait(page, () => window.__gym?.world, null, 30000);
      assert.equal(await page.locator('.gym-money').textContent(), '16 $');
      if (mobile) await page.locator('.gym-pause-button').tap(); else await page.keyboard.press('KeyP');
      await page.locator('.gym-pause-panel:not([hidden])').waitFor();
      assert.equal(await page.locator('[data-career="medals"]').textContent(), '1 médaille');
      assert.match(await page.locator('.gym-chapter').textContent(), /Gants de bronze accessibles/);
      const resume = await page.locator('.gym-resume-button').boundingBox();
      const pausePanel = await page.locator('.gym-pause-panel').boundingBox();
      assert.ok(resume.y >= pausePanel.y && resume.y + resume.height <= pausePanel.y + pausePanel.height,
        'Continue remains fully visible above secondary career information');
      await page.screenshot({ path: `references/characters/outfits/pause-${mobile ? 'mobile' : 'desktop'}.png` });
      await activate(page.locator('.gym-import-button'), mobile);
      await page.locator('.gym-import-file').setInputFiles({ name: 'tournoi.json', mimeType: 'application/json', buffer: Buffer.from(seeds.active) });
      await page.locator('.gym-import-confirm:not([hidden])').waitFor();
      const text = await page.locator('.gym-import-preview').textContent();
      assert.match(text, /Hôtel · Chambre/); assert.match(text, /16 \$/); assert.match(text, /J2\/3/);
      const before = await page.evaluate(key => localStorage.getItem(key), CAREER_STORAGE_KEY);
      await activate(page.locator('.gym-import-cancel'), mobile);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), CAREER_STORAGE_KEY), before, 'import cancellation does not replace the saved day or medal');
      await activate(page.locator('.gym-resume-button'), mobile); await wait(page, () => !window.__gym?.world.state.paused);
      checks.push({ case: 'gym-pause-and-import-preview', mobile, text }); await context.close();
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile('references/characters/outfits/menu-proof.json', JSON.stringify({ checks, errors }, null, 2) + '\n');
  console.log('Career menus: hotel/day/fees/medal state, visible Continue, gym pause and read-only tournament import preview verified on desktop and 568×320 touch.');
} catch (error) { console.error({ errors, checks }); throw error; }
finally { await browser.close(); }
