import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,wait,dispatch,buttonPoint,joyPoint,fit,suppressHotReload,tapContact} from './control-helpers.mjs';
import {hotelFixture,seedContext,CAREER_STORAGE_KEY} from './hotel-test-helpers.mjs';
const browser=await chromium.launch({headless:true});const reports=[],errors=[];
const state=(p,type)=>p.evaluate(type=>structuredClone(window[type].session.state),type);
const input=async(p,cdp,root,action)=>cdp?tapContact(p,cdp,`${root} [data-pad-button="${action==='jab'?'a':'b'}"]`):p.keyboard.press(action==='jab'?'j':'k');
async function setup(mobile){const c=await browser.newContext({viewport:mobile?{width:568,height:320}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});await seedContext(c,hotelFixture());const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});return{c,p,cdp:mobile?await c.newCDPSession(p):null};}
async function open(p,cdp,scene,type,primary){await p.goto(`http://127.0.0.1:5173/?scene=${scene}`);await wait(p,type=>window[type]?.session.state.phase==='ready',type,60000);await p.locator(primary).focus();if(cdp)await tapContact(p,cdp,primary);else await p.keyboard.press('e');await wait(p,type=>window[type].session.state.phase==='running'&&window[type].session.state.elapsed>.06,type);}
try {
 for(const mobile of process.env.REFINED_CASE==='mobile'?[true]:process.env.REFINED_CASE==='desktop'?[false]:[false,true]) {
  const {c,p,cdp}=await setup(mobile);
  await open(p,cdp,'sparring','__sparring','#sparring-ui .primary-button');
  assert.equal(await p.locator('#sparring-ui .round-panel').isVisible(),false,'The ready menu cannot cover a running fight');
  await input(p,cdp,'#sparring-ui','jab');
  await wait(p,()=>window.__sparring.session.state.player.action==='jab'&&window.__sparring.session.state.player.progress*window.__sparring.session.state.player.duration>=.20);
  await input(p,cdp,'#sparring-ui','cross');
  await wait(p,()=>window.__sparring.session.state.player.action==='cross'&&window.__sparring.session.state.player.progress*window.__sparring.session.state.player.duration>=.29);
  await input(p,cdp,'#sparring-ui','jab');
  await wait(p,()=>window.__sparring.session.state.stats.hooks===1);
  let s=await state(p,'__sparring');assert.equal(s.stats.thrown,3);assert.equal(s.stats.combos,1);assert.equal(s.stamina,52);
  await p.screenshot({path:`docs/refined-combo-${mobile?'mobile':'desktop'}.png`});
  if(cdp){const high=await joyPoint(p,'#sparring-ui','up',1);await dispatch(cdp,'touchStart',[high]);await tapContact(p,cdp,'#sparring-ui .console-menu-button',[high]);await dispatch(cdp,'touchEnd',[]);}else{await p.keyboard.down('ArrowUp');await p.keyboard.press('p');await p.keyboard.up('ArrowUp');}
  await wait(p,()=>window.__sparring.session.state.phase==='paused');const frozen=await state(p,'__sparring');await p.waitForTimeout(200);assert.deepEqual(await state(p,'__sparring'),frozen);
  if(cdp)await tapContact(p,cdp,'#sparring-ui .primary-button');else await p.keyboard.press('e');
  await wait(p,()=>window.__sparring.session.state.phase==='running');await p.waitForTimeout(400);assert.notEqual((await state(p,'__sparring')).player.action,'guard');
  reports.push({activity:'combat',mobile,stats:s.stats,layout:await fit(p,'#sparring-ui',mobile)});
  console.log('COMBAT',mobile,'3 actual contacts');
  if(process.env.REFINED_ACTIVITY==='combat'){await c.close();continue;}
  await open(p,cdp,'pads','__hotelActivity','#rhythm-ui .rhythm-primary');
  const energyBefore=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).daily.energy,CAREER_STORAGE_KEY);
  await p.waitForTimeout(1200);s=await state(p,'__hotelActivity');assert.equal(s.target.index,0);assert.equal(s.stats.missed,0);
  await input(p,cdp,'#rhythm-ui','cross');await wait(p,()=>window.__hotelActivity.session.state.stats.wrong===1);assert.equal((await state(p,'__hotelActivity')).target.index,0);
  await wait(p,()=>window.__hotelActivity.session.state.player.action==='idle');
  let paused=false,captured=false;const deadline=Date.now()+150000;
  while(Date.now()<deadline){s=await state(p,'__hotelActivity');if(s.phase==='finished')break;
   if(!paused&&s.stats.hits>=4){paused=true;if(cdp)await tapContact(p,cdp,'#rhythm-ui .console-menu-button');else await p.keyboard.press('p');await wait(p,()=>window.__hotelActivity.session.state.phase==='paused');const frozen=await state(p,'__hotelActivity');await p.waitForTimeout(200);assert.deepEqual(await state(p,'__hotelActivity'),frozen);if(cdp)await tapContact(p,cdp,'#rhythm-ui .rhythm-primary');else await p.keyboard.press('e');continue;}
   if(s.target.phase==='waiting'&&s.player.action==='idle')await input(p,cdp,'#rhythm-ui',s.target.expected);
   if(!captured&&s.stats.hits>=2){captured=true;await p.screenshot({path:`docs/refined-pads-${mobile?'mobile':'desktop'}.png`});}
   await p.waitForTimeout(25);
  }
  s=await state(p,'__hotelActivity');assert.equal(s.phase,'finished');assert.equal(s.summary.qualified,true);assert.equal(s.stats.wrong,1);assert.equal(s.stats.missed,0);
  const contacts=await p.evaluate(()=>window.__hotelActivity.contacts);assert.ok(contacts.some(e=>e.input==='jab')&&contacts.some(e=>e.input==='cross'));for(const e of contacts){assert.equal(e.visual.phase,'contact');assert.ok(e.visual.error<.001);assert.equal(e.visual.coachPose,e.input==='jab'?'left':'right');}
  assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).daily.energy,CAREER_STORAGE_KEY),energyBefore);
  console.log('PADS',mobile,s.summary);
  const layout=await fit(p,'#rhythm-ui',mobile);assert.ok(layout.fits&&layout.noScroll);assert.ok(layout.controls.every(c=>c.outside&&c.fits));
  reports.push({activity:'pads',mobile,summary:s.summary,contacts:contacts.length,layout});
  if(cdp)await tapContact(p,cdp,'#rhythm-ui .activity-exit-button');else await p.locator('#rhythm-ui .activity-exit-button').click();await wait(p,()=>window.__hotel?.world?.place==='hotel-gym'||window.__hotel?.scene?.place==='hotel-gym',null,30000);
  await c.close();
 }
 assert.deepEqual(errors,[]);
} finally {await fs.writeFile(process.env.REFINED_ACTIVITY==='combat'?'docs/refined-combat-visible-results.json':'docs/refined-combat-pads-results.json',JSON.stringify({reports,errors},null,2)+'\n');await browser.close();}
console.log(JSON.stringify({cases:reports.length,errors},null,2));
