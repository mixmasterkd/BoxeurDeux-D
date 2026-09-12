import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, wait, fit, dispatch, joyPoint, buttonPoint, suppressHotReload } from './control-helpers.mjs';
import { CareerProfile } from '../src/game/CareerProfile.js';

const url = process.env.SPARRING_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true });
const report = { url, tests: [], errors: [], failure: null };
const key = 'boxeur-deux-d-career-v1';
const save = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const scene = (page, name) => wait(page, name => document.querySelector('#stage').dataset.scene === name
  && (name === 'gym' ? window.__gym?.ui : ['home','neighborhood'].includes(name) ? window.__exploration?.scene.place === name : name === 'rope' ? window.__rhythm?.ui : window.__sparring?.ui), name);
const state = page => page.evaluate(() => (window.__gym ?? window.__exploration)?.world.state);

async function controller(page, mobile) {
  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  const tap = async selector => {
    if (!mobile) { await page.locator(selector).click(); return; }
    await dispatch(cdp, 'touchStart', [await buttonPoint(page, selector)]); await dispatch(cdp, 'touchEnd');
  };
  const menu = async direction => {
    if (!mobile) await page.keyboard.press(direction === 'down' ? 'ArrowDown' : 'ArrowUp');
    else { await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',direction)]); await dispatch(cdp,'touchEnd'); }
  };
  const interact = async () => mobile ? tap('#gym-ui [data-pad-button="a"]') : page.keyboard.press('KeyE');
  const confirm = async (root = '#gym-ui') => mobile ? tap(`${root} [data-pad-button="a"]`) : page.keyboard.press('Enter');
  const back = async () => mobile ? tap('#gym-ui [data-pad-button="b"]') : page.keyboard.press('Escape');
  async function axis(axis, target, correction = 0) {
    const before = (await state(page))[axis];
    if (Math.abs(before - target) < 6) return;
    const positive = before < target, direction = axis === 'x' ? positive ? 'right' : 'left' : positive ? 'down' : 'up';
    const keyboard = { right:'ArrowRight', left:'ArrowLeft', up:'ArrowUp', down:'ArrowDown' }[direction];
    if (mobile) {
      const point = await joyPoint(page,'#gym-ui',direction);
      if (Math.abs(before - target) < 180) {
        const rect = await page.locator('#gym-ui .joypad').boundingBox();
        point.x = rect.x + rect.width/2 + (point.x - rect.x - rect.width/2) * .36;
        point.y = rect.y + rect.height/2 + (point.y - rect.y - rect.height/2) * .36;
      }
      await dispatch(cdp,'touchStart',[point]);
    }
    else await page.keyboard.down(keyboard);
    try {
      await wait(page, ({axis,target,positive}) => {
        const s=(window.__gym??window.__exploration)?.world.state;
        return s && (positive ? s[axis] >= target - 5 : s[axis] <= target + 5);
      }, {axis,target,positive}, 14000);
    } finally { if (mobile) await dispatch(cdp,'touchEnd'); else await page.keyboard.up(keyboard); }
    await page.waitForTimeout(45);
    const actual = (await state(page))[axis];
    // CDP can deliver a release a frame late on the small mobile renderer. Use
    // a new physical input to correct that overshoot, never a model position.
    if (Math.abs(actual - target) > 18 && correction < 4) return axisMove(axis, target, correction + 1);
    assert.ok(Math.abs(actual - target) < 32, `Walking ended at ${axis}=${actual}, near requested ${target}`);
  }
  const axisMove = axis;
  return { tap, menu, interact, confirm, back, axis, cdp,
    walk: async (x,y) => { await axis('x',x); await axis('y',y); } };
}

async function checkFit(page, mobile) {
  const result = await fit(page,'#gym-ui',mobile);
  assert.equal(result.noScroll,true); assert.equal(result.fits,true);
  assert.ok(Math.abs(result.ratio - 16/9) < .001);
  assert.equal(result.width,1280); assert.equal(result.height,720);
  if (mobile) { assert.ok(result.controls.length >= 4); assert.ok(result.controls.every(c=>c.outside && c.fits)); }
  else assert.equal(result.controls.length,0);
  return result;
}

try {
  for (const [mobile, viewport] of [[false,{width:1440,height:1000}],[true,{width:844,height:390}]]) {
    const context = await browser.newContext({ viewport, isMobile:mobile, hasTouch:mobile });
    await suppressHotReload(context);
    const page = await context.newPage(), c = await controller(page,mobile), label=mobile?'mobile':'desktop';
    page.on('pageerror', e=>report.errors.push(e.message));
    page.on('response', response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
    await page.goto(url); await scene(page,'home'); await page.waitForTimeout(300);
    const geometry = await checkFit(page,mobile);
    await page.screenshot({path:`docs/home-${label}.png`});
    await c.axis('y',620); await c.interact(); await scene(page,'neighborhood');
    await c.axis('x',1128); await page.waitForTimeout(250);
    const camera = await page.evaluate(()=>({x:__exploration.scene.cameras.main.scrollX,y:__exploration.scene.cameras.main.scrollY}));
    assert.ok(camera.x>400 && camera.y>50,'Camera follows across a map larger than the viewport');
    await page.screenshot({path:`docs/neighborhood-${label}.png`});
    assert.equal((await save(page)).daily.energy,100,'Walking is free');
    await c.interact(); await scene(page,'gym');
    await c.walk(210,585); await c.interact();
    await wait(page,()=>document.querySelector('.gym-dialog:not([hidden])'));
    assert.match(await page.locator('.gym-rhythm-button').innerText(),/15/);
    assert.equal((await save(page)).daily.energy,100,'Opening workshop does not charge');
    await c.confirm(); await scene(page,'rope'); await c.confirm('#rhythm-ui');
    await wait(page,()=>window.__rhythm?.session.state.phase==='running');
    assert.equal((await save(page)).daily.energy,85);
    if(mobile) await c.tap('#rhythm-ui .console-menu-button'); else await page.keyboard.press('KeyP');
    await wait(page,()=>window.__rhythm.session.state.phase==='paused');
    await c.confirm('#rhythm-ui'); await wait(page,()=>window.__rhythm.session.state.phase==='running');
    assert.equal((await save(page)).daily.energy,85,'Resume is free');
    await c.tap('#rhythm-ui .activity-exit-button'); await scene(page,'gym');
    assert.equal((await save(page)).activities.rope.sessions,0,'Abandon grants no training gain');
    await c.walk(640,630); await c.interact(); await scene(page,'neighborhood');
    await c.axis('x',408); await c.interact(); await scene(page,'home');
    await c.walk(944,365); await c.interact();
    await wait(page,()=>document.querySelector('.gym-dialog:not([hidden])'));
    await c.back(); assert.equal((await save(page)).daily.day,1,'Cancelling sleep has no effect');
    const statsBefore = (await save(page)).stats;
    await c.interact(); await c.menu('down'); await c.confirm();
    await wait(page,()=>document.querySelector('#gym-dialog-title')?.textContent==='Jour 2');
    let profile = await save(page);
    assert.deepEqual(profile.daily,{day:2,energy:100,maxEnergy:100}); assert.deepEqual(profile.stats,statsBefore);
    assert.equal(profile.location.scene,'home');
    await page.screenshot({path:`docs/morning-${label}.png`}); await c.back();
    await page.reload(); await wait(page,()=>document.querySelector('#career-menu:not([hidden])'));
    await page.locator('.career-continue').click(); await scene(page,'home'); await page.waitForTimeout(250);
    assert.equal((await save(page)).daily.day,2); assert.ok(Math.abs((await state(page)).x-944)<2);
    await c.walk(640,622); await c.interact(); await scene(page,'neighborhood');
    await c.axis('x',1900); await c.interact(); await c.confirm(); await scene(page,'sparring');
    assert.match(await page.locator('.activity-exit-button').innerText(),/Quartier/);
    await c.confirm('#sparring-ui'); await wait(page,()=>window.__sparring?.session.state.phase==='running');
    assert.equal((await save(page)).daily.energy,100,'Fight entry does not spend daily energy');
    await c.tap('#sparring-ui .activity-exit-button'); await scene(page,'neighborhood');
    assert.equal((await state(page)).nearby.id,'fight');
    // Explore southward and test a persistent camera point away from entrances.
    await c.axis('y',540); await c.axis('x',1165); await c.axis('y',1260); await page.waitForTimeout(400);
    assert.ok(await page.evaluate(()=>__exploration.scene.cameras.main.scrollY>650));
    await page.screenshot({path:`docs/neighborhood-south-${label}.png`});
    if (mobile) {
      await page.setViewportSize({width:568,height:320}); await page.waitForTimeout(350); await checkFit(page,true);
      await page.screenshot({path:'docs/neighborhood-mobile-small.png'});
      const p=await joyPoint(page,'#gym-ui','right'); await dispatch(c.cdp,'touchStart',[p]); await page.waitForTimeout(100);
      await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(200); await dispatch(c.cdp,'touchCancel');
      const frozen=await state(page); assert.equal(frozen.paused,true);
      await page.waitForTimeout(200); assert.equal((await state(page)).x,frozen.x);
      await page.screenshot({path:'docs/neighborhood-mobile-portrait.png'});
      await page.setViewportSize({width:844,height:390}); await page.waitForTimeout(250);
      assert.equal((await state(page)).paused,true); await c.confirm(); await wait(page,()=>!__exploration.world.state.paused);
      const resumed=await state(page); await page.waitForTimeout(200); assert.equal((await state(page)).x,resumed.x,'Old touch was released');
    }
    const position=await state(page); await page.reload(); await page.locator('.career-continue').click(); await scene(page,'neighborhood'); await page.waitForTimeout(100);
    assert.ok(Math.abs((await state(page)).x-position.x)<2 && Math.abs((await state(page)).y-position.y)<2,'Continue restores the last place and coordinates');
    report.tests.push({label,geometry,camera,roundTrip:true,sleepAndReload:true,freeFight:true});
    await context.close();
  }

  // A depleted, trained profile is imported through the actual UI; preview and
  // cancel must not mutate the active game. Confirmation changes the location.
  const context=await browser.newContext({viewport:{width:568,height:320},isMobile:true,hasTouch:true});
    await suppressHotReload(context);
  const page=await context.newPage(), c=await controller(page,true); page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await scene(page,'home');
  const fixture=new CareerProfile({storage:null});fixture.reward('rope',{hits:25,accuracy:90});
  const depleted=fixture.snapshot();depleted.daily={day:7,energy:0,maxEnergy:100};depleted.location={scene:'gym',x:210,y:585,facing:'up'};
  await c.tap('#gym-ui .console-menu-button'); await wait(page,()=>__exploration.ui.paused);
  await page.locator('.gym-import-file').setInputFiles({name:'partie.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(depleted))});
  await wait(page,()=>document.querySelector('.gym-import-confirm:not([hidden])')); await c.back();
  assert.equal(await page.locator('.gym-day').innerText(),'Jour 1');
  await page.locator('.gym-import-file').setInputFiles({name:'partie.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(depleted))});
  await wait(page,()=>document.querySelector('.gym-import-confirm:not([hidden])')); await c.menu('down'); await c.confirm();
  await scene(page,'gym'); assert.equal((await save(page)).daily.energy,0);
  await c.interact(); await wait(page,()=>document.querySelector('.gym-dialog:not([hidden])'));
  assert.equal(await page.locator('.gym-rhythm-button').isDisabled(),true); await c.back();
  await c.walk(640,630);await c.interact();await scene(page,'neighborhood');await c.axis('x',408);await c.interact();await scene(page,'home');
  await c.walk(944,365);await c.interact();await c.menu('down');await c.confirm();
  await wait(page,()=>document.querySelector('#gym-dialog-title')?.textContent==='Jour 8');
  const after=await save(page);assert.equal(after.daily.energy,100);assert.equal(after.stats.endurance,102);
  report.tests.push({label:'mobile-depleted-import',cancelReadOnly:true,refusal:true,freeWalkHome:true,sleepPreservesTrainedStats:true});
  await context.close();
  assert.deepEqual(report.errors,[]);
} catch(error) { report.failure=error.stack; throw error; }
finally { fs.writeFileSync('docs/exploration-browser-results.json',JSON.stringify(report,null,2)+'\n'); await browser.close(); }
console.log(JSON.stringify(report,null,2));
