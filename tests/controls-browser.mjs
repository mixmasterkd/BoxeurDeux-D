import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, wait, joyPoint, buttonPoint, dispatch, tapContact, fit } from './control-helpers.mjs';

const browser=await chromium.launch({headless:true});
const base=process.env.CONTROLS_URL??'http://127.0.0.1:5173/';
const errors=[], reports=[], measurements=[];
let current;
const report=text=>{reports.push(text);console.log(text);};
const state=(page,scene)=>page.evaluate(scene=>structuredClone(window[`__${scene}`].session.state),scene);
const settled=page=>page.waitForTimeout(100);
const idle=(page,scene)=>wait(page,scene=>['idle','guard'].includes(window[`__${scene}`].session.state.player.action),scene);
function watch(page){
  current=page;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
}
function checkFit(value){
  assert.deepEqual([value.width,value.height],[1280,720]);
  assert.ok(Math.abs(value.ratio-16/9)<.004&&value.fits&&value.noScroll,JSON.stringify(value));
  if(!value.mobile)assert.equal(value.controls.length,0,'no live PC controls even if it reports touch capacity');
  else{
    assert.ok(value.controls.length>=4,'joypad, A, B and menu exist');
    for(const c of value.controls)assert.ok(c.outside&&c.fits&&c.width>=43&&c.height>=43,JSON.stringify(c));
  }
  measurements.push(value);
}
async function moveTo(page,axis,target,cdp){
  const initial=await page.evaluate(axis=>window.__gym.world.state[axis],axis);
  const sign=target>initial?1:-1;
  const direction=axis==='x'?(sign>0?'right':'left'):(sign>0?'down':'up');
  if(cdp)await dispatch(cdp,'touchStart',[await joyPoint(page,'#gym-ui',direction)]);
  else await page.keyboard.down({right:'ArrowRight',left:'ArrowLeft',up:'ArrowUp',down:'ArrowDown'}[direction]);
  try{await wait(page,({axis,target,sign})=>(window.__gym.world.state[axis]-target)*sign>=0,{axis,target,sign});}
  catch(error){error.message+=` moving ${axis} to ${target}: ${JSON.stringify(await page.evaluate(()=>({state:window.__gym.world.state,input:window.__gym.world.input,pad:window.__gym.ui.controls.padId,direction:window.__gym.ui.controls.padDirection})))}`;throw error;}
  finally{if(cdp)await dispatch(cdp,'touchEnd');else await page.keyboard.up({right:'ArrowRight',left:'ArrowLeft',up:'ArrowUp',down:'ArrowDown'}[direction]);}
}
async function walkMirror(page,cdp){
  for(const [axis,target] of [['x',330],['y',350],['x',165],['y',245]])await moveTo(page,axis,target,cdp);
  await wait(page,()=>window.__gym.world.state.nearby?.id==='miroir');
  return page.evaluate(()=>({x:window.__gym.world.state.x,y:window.__gym.world.state.y}));
}
async function begin(page,scene,mobile=false){
  await page.goto(`${base}?scene=${scene}`);
  await wait(page,scene=>window[`__${scene}`]?.session.state.phase==='ready',scene);
  const selector={shadow:'.shadow-start-button',bag:'.bag-start-button',sparring:'.primary-button'}[scene];
  if(mobile){
    await page.locator(`#${scene}-ui .console-menu-button`).tap();
    assert.equal((await state(page,scene)).phase,'ready','menu button does not exit preparation');
    await page.locator(`#${scene}-ui [data-pad-button="a"]`).tap();
  }
  else await page.locator(`#${scene}-ui ${selector}`).click();
  await wait(page,scene=>window[`__${scene}`].session.state.phase==='running',scene);
}

try{
  if(process.env.CONTROLS_CASE!=='mobile'){
  const desktop=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:false});
  await desktop.addInitScript(()=>Object.defineProperty(Navigator.prototype,'maxTouchPoints',{configurable:true,get:()=>10}));
  const page=await desktop.newPage();watch(page);
  await page.goto(base);await wait(page,()=>window.__gym?.world);
  checkFit(await fit(page,'#gym-ui',false));
  const gymPosition=await walkMirror(page);
  await page.keyboard.press('e');
  await page.locator('.gym-shadow-button').click();
  await wait(page,()=>window.__shadow?.session.state.phase==='ready');
  await page.keyboard.press('Enter');
  await wait(page,()=>window.__shadow.session.state.phase==='running');
  await page.keyboard.press('Space');
  assert.equal((await state(page,'shadow')).player.action,'idle','Space is not a boxing guard');
  await page.keyboard.down('w');
  await wait(page,()=>window.__shadow.session.state.player.action==='guard'&&window.__shadow.session.state.player.guardLevel==='head');
  await page.keyboard.up('w');
  await page.keyboard.down('ArrowDown');
  await wait(page,()=>window.__shadow.session.state.player.guardLevel==='body');
  for(const [key,action]of [['j','jab'],['k','cross'],['j','hook']]){
    await idle(page,'shadow');await page.keyboard.press(key);
    await wait(page,action=>window.__shadow.motions.some(e=>e.action===action&&e.target==='body'),action);
  }
  assert.equal((await state(page,'shadow')).stats.combos,1,'low direction also permits the body combo');
  const bodyMotions=await page.evaluate(()=>structuredClone(window.__shadow.motions));
  assert.ok(bodyMotions.every(m=>m.texture===m.reflectedTexture&&m.pose.includes('body')));
  await idle(page,'shadow');await page.screenshot({path:'docs/commandes-miroir-garde-basse.png'});
  await page.keyboard.up('ArrowDown');
  for(const key of ['ArrowLeft','d']){await idle(page,'shadow');await page.keyboard.press(key);}
  await idle(page,'shadow');
  await page.keyboard.press('p');
  await page.locator('#shadow-ui .commands-open-button').click();
  const paused=await state(page,'shadow');
  await page.keyboard.press('ArrowUp');await page.waitForTimeout(150);
  assert.deepEqual(await state(page,'shadow'),paused,'menu input never reaches combat');
  await page.keyboard.press('Escape');
  assert.equal((await state(page,'shadow')).phase,'paused');
  await page.keyboard.press('Escape');
  await wait(page,()=>window.__shadow.session.state.phase==='running');
  await page.locator('#shadow-ui .activity-exit-button').click();
  await wait(page,()=>window.__gym?.world);
  assert.deepEqual(await page.evaluate(()=>({x:window.__gym.world.state.x,y:window.__gym.world.state.y})),gymPosition);
  report('Desktop: real walk and E interaction, Enter, WASD/arrows guards, body JKJ with synchronized reflected poses, defenses, nested Escape and direct gym exit preserve position.');

  for(const scene of ['bag','sparring']){
    await begin(page,scene);
    checkFit(await fit(page,`#${scene}-ui`,false));
    await page.keyboard.down('s');
    await wait(page,scene=>window[`__${scene}`].session.state.player.guardLevel==='body',scene);
    await page.keyboard.press('j');
    await wait(page,scene=>window[`__${scene}`].impacts.some(e=>e.target==='body'&&e.attack==='jab'),scene);
    const impact=await page.evaluate(scene=>structuredClone(window[`__${scene}`].impacts.find(e=>e.target==='body')),scene);
    assert.ok(Math.hypot(impact.contactPoint.x-impact.targetPoint.x,impact.contactPoint.y-impact.targetPoint.y)<2.5,JSON.stringify(impact));
    await page.keyboard.up('s');
    await idle(page,scene);
    await page.keyboard.down('ArrowUp');
    await wait(page,scene=>window[`__${scene}`].session.state.player.action==='guard'&&window[`__${scene}`].session.state.player.guardLevel==='head',scene);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await wait(page,scene=>window[`__${scene}`].session.state.phase==='paused',scene);
    await page.keyboard.up('ArrowUp');await page.keyboard.press('p');
    await wait(page,scene=>window[`__${scene}`].session.state.phase==='running',scene);
    assert.notEqual((await state(page,scene)).player.action,'guard','focus loss releases the held direction');
  }
  // Respond to the scheduled heights through real input, never rewriting AI state.
  for(const [target,key,result]of [['head','ArrowUp','remi-blocked'],['body','ArrowUp','remi-hit'],['head','ArrowDown','remi-hit'],['body','ArrowDown','remi-blocked']]){
    await wait(page,target=>window.__sparring.session.state.remi.action.startsWith('tell')&&window.__sparring.session.state.remi.target===target,target);
    const before=await page.evaluate(()=>window.__sparring.impacts.length);
    await page.keyboard.down(key);
    await wait(page,({before,result,target})=>window.__sparring.impacts.slice(before).some(e=>e.type===result&&e.target===target),{before,result,target});
    await page.keyboard.up(key);
    await wait(page,()=>window.__sparring.session.state.remi.action==='open');
  }
  await page.screenshot({path:'docs/commandes-sparring.png'});
  report('Bag and sparring: body gloves meet their lower target. Rémi announces head/body; matching guards block and wrong-height guards receive the hit. Focus release does not restore a held guard.');
  await desktop.close();
  }

  const mobile=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const phone=await mobile.newPage();watch(phone);
  const cdp=await mobile.newCDPSession(phone);
  await phone.goto(base);await wait(phone,()=>window.__gym?.world);
  const start=await phone.evaluate(()=>({x:window.__gym.world.state.x,y:window.__gym.world.state.y}));
  let point=await joyPoint(phone,'#gym-ui','downRight');
  await dispatch(cdp,'touchStart',[point]);await phone.waitForTimeout(220);
  let moved=await phone.evaluate(()=>({x:window.__gym.world.state.x,y:window.__gym.world.state.y}));
  assert.ok(moved.x>start.x+8&&moved.y>start.y+8,'one thumb moves diagonally');
  point=await joyPoint(phone,'#gym-ui','right');
  await dispatch(cdp,'touchMove',[point]);
  await wait(phone,()=>window.__gym.world.input.x>0&&Math.abs(window.__gym.world.input.y)<.001);
  const straightStart=await phone.evaluate(()=>({x:window.__gym.world.state.x,y:window.__gym.world.state.y}));
  await phone.waitForTimeout(160);
  const horizontal=await phone.evaluate(()=>({x:window.__gym.world.state.x,y:window.__gym.world.state.y}));
  assert.ok(horizontal.x>straightStart.x+8&&Math.abs(horizontal.y-straightStart.y)<1,JSON.stringify({straightStart,horizontal}));
  await dispatch(cdp,'touchCancel');await settled(phone);
  assert.equal(await phone.evaluate(()=>window.__gym.world.state.moving),false);
  await phone.goto(base);await wait(phone,()=>window.__gym?.world);
  const mobilePosition=await walkMirror(phone,cdp);
  await tapContact(phone,cdp,'#gym-ui [data-pad-button="a"]');
  await phone.locator('.gym-dialog').waitFor({state:'visible'});
  await tapContact(phone,cdp,'#gym-ui [data-pad-button="a"]');
  await wait(phone,()=>window.__shadow?.session.state.phase==='ready');
  await tapContact(phone,cdp,'#shadow-ui [data-pad-button="a"]');
  await wait(phone,()=>window.__shadow.session.state.phase==='running');
  report('Mobile: one-thumb diagonal/sliding movement, cancellation and actual joypad walk to mirror; A opens the activity and starts practice.');
  await phone.locator('.shadow-pause-button').tap();
  for(let attempt=0;attempt<10 && await phone.evaluate(()=>document.activeElement?.id!=='shadow-speed');attempt++){
    await dispatch(cdp,'touchStart',[await joyPoint(phone,'#shadow-ui','up')]);await dispatch(cdp,'touchEnd');
  }
  assert.equal(await phone.evaluate(()=>document.activeElement?.id),'shadow-speed');
  await dispatch(cdp,'touchStart',[await joyPoint(phone,'#shadow-ui','right')]);await dispatch(cdp,'touchEnd');
  assert.equal((await state(phone,'shadow')).speed,.65);
  await tapContact(phone,cdp,'#shadow-ui [data-pad-button="a"]');
  assert.equal((await state(phone,'shadow')).speed,.65,'A confirms the displayed setting without changing it');
  await tapContact(phone,cdp,'#shadow-ui [data-pad-button="a"]');
  await wait(phone,()=>window.__shadow.session.state.phase==='running');


  for(const scene of ['shadow','bag','sparring']){
    if(scene!=='shadow')await begin(phone,scene,true);
    const root=`#${scene}-ui`;
    checkFit(await fit(phone,root,true));
    assert.equal(await phone.locator(`${root} [data-pad-button="a"] .control-key`).textContent(),'A');
    assert.equal(await phone.locator(`${root} [data-pad-button="b"] .control-key`).textContent(),'B');
    const low=await joyPoint(phone,root,'down');
    await dispatch(cdp,'touchStart',[low]);
    await wait(phone,scene=>window[`__${scene}`].session.state.player.action==='guard'&&window[`__${scene}`].session.state.player.guardLevel==='body',scene);
    const a=await buttonPoint(phone,`${root} [data-pad-button="a"]`);
    await dispatch(cdp,'touchStart',[low,a]);
    await wait(phone,scene=>window[`__${scene}`].session.state.player.action==='jab'&&window[`__${scene}`].session.state.player.target==='body',scene);
    await phone.waitForTimeout(900);
    assert.equal((await state(phone,scene)).player.action,'guard','holding an attack never repeats it');
    await dispatch(cdp,'touchEnd',[a]);
    assert.equal((await state(phone,scene)).player.guardLevel,'body','lifting A retains the independent low guard');
    const high=await joyPoint(phone,root,'up');
    await dispatch(cdp,'touchMove',[high]);
    await wait(phone,scene=>window[`__${scene}`].session.state.player.guardLevel==='head',scene);
    await dispatch(cdp,'touchCancel');
    await idle(phone,scene);
    const left=await joyPoint(phone,root,'left');
    await dispatch(cdp,'touchStart',[left]);
    await wait(phone,scene=>window[`__${scene}`].session.state.player.action==='dodgeLeft',scene);
    await phone.waitForTimeout(1100);
    assert.notEqual((await state(phone,scene)).player.action,'dodgeLeft','one sustained tilt causes one dodge');
    await dispatch(cdp,'touchEnd');
    await phone.locator(`${root} .activity-exit-button`).tap();
    await wait(phone,()=>window.__gym?.world);
    if(scene==='shadow')assert.deepEqual(await phone.evaluate(()=>({x:window.__gym.world.state.x,y:window.__gym.world.state.y})),mobilePosition);
  }
  report('The same mobile joypad and A/B work in all three activities: lower attacks, guard height changes, independent fingers, no repeated held punch/dodge, direct return.');

  for(const scene of ['gym','shadow','bag','sparring']){
    if(scene==='gym'){
      await phone.goto(base);await wait(phone,()=>window.__gym?.world);
      if(await phone.locator('.career-continue').isVisible()) await phone.locator('.career-continue').tap();
    }
    else await begin(phone,scene,true);
    const root=`#${scene}-ui`;
    for(const viewport of [{width:844,height:390},{width:667,height:375},{width:568,height:320}]){
      await phone.setViewportSize(viewport);await settled(phone);
      checkFit(await fit(phone,root,true));
      const pause={gym:'.gym-pause-button',shadow:'.shadow-pause-button',bag:'.bag-pause-button',sparring:'.pause-button'}[scene];
      await phone.locator(`${root} ${pause}`).tap();await settled(phone);
      checkFit(await fit(phone,root,true,true));
      const focused=await phone.evaluate(()=>document.activeElement?.textContent);
      await dispatch(cdp,'touchStart',[await joyPoint(phone,root,'down')]);await dispatch(cdp,'touchEnd');
      assert.notEqual(await phone.evaluate(()=>document.activeElement?.textContent),focused,'joypad navigates a menu');
      await phone.locator(`${root} .commands-open-button`).tap();
      await phone.locator(`${root} .commands-panel`).waitFor({state:'visible'});
      await tapContact(phone,cdp,`${root} [data-pad-button="b"]`);
      await phone.locator(`${root} .commands-panel`).waitFor({state:'hidden'});
      if(scene!=='gym')assert.equal((await state(phone,scene)).phase,'paused','B backs out of help without resuming');
      await tapContact(phone,cdp,`${root} [data-pad-button="b"]`);
      if(scene==='gym')await wait(phone,()=>!window.__gym.world.state.paused);
      else await wait(phone,scene=>window[`__${scene}`].session.state.phase==='running',scene);
    }
    if(scene==='shadow')await phone.screenshot({path:'docs/commandes-mobile-joypad.png'});
    const held=await joyPoint(phone,root,'up');
    await dispatch(cdp,'touchStart',[held]);
    await phone.setViewportSize({width:390,height:844});
    await phone.locator('#rotate-prompt').waitFor({state:'visible'});
    await dispatch(cdp,'touchEnd');await settled(phone);
    await phone.setViewportSize({width:844,height:390});await settled(phone);
    if(scene==='gym')assert.equal(await phone.evaluate(()=>window.__gym.world.state.paused),true);
    else assert.equal((await state(phone,scene)).phase,'paused');
    await tapContact(phone,cdp,`${root} [data-pad-button="b"]`);await settled(phone);
    if(scene!=='gym')assert.notEqual((await state(phone,scene)).player.action,'guard','portrait drops old held guard');
  }
  report('All four scenes fit 844×390, 667×375 and 568×320, with controls outside the fixed canvas. Menu joypad/A/B, nested back, portrait pause and explicit resume passed.');
  await mobile.close();
  assert.deepEqual(errors,[]);
  report('No page, console or resource errors. These mobile checks are simulated Chromium touch viewports, not a physical phone.');
}catch(error){
  if(current&&!current.isClosed())await current.screenshot({path:'/tmp/boxeur-controls-failure.png'}).catch(()=>{});
  throw error;
}finally{
  await fs.writeFile('docs/controls-browser-results.json',JSON.stringify({checkedAt:new Date().toISOString(),reports,measurements,errors},null,2)+'\n');
  await browser.close();
}
