import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CareerProfile, CAREER_STORAGE_KEY } from '../src/game/CareerProfile.js';
import { DELIVERY_STOPS } from '../src/game/ChapterRules.js';
import {hotelFixture} from './hotel-test-helpers.mjs';
import { chromium, wait, joyPoint, buttonPoint, dispatch, tapContact, fit } from './control-helpers.mjs';

// Fixtures qualify/pay for the desired encounter through CareerProfile before
// the browser opens. Every tested fight then uses real keys or CDP fingers;
// no combat action, clock, resistance, score or outcome is manufactured.
function fixture(opponent) {
  const profile=hotelFixture();
  assert.ok(profile.recordTournamentFight({opponent:'bellini',winner:'remi',score:2,matchId:profile.tournamentStatus().currentMatchId}).ok);
  assert.ok(profile.leaveTournament().ok);
  assert.ok(profile.unlockTechnique('doubleJab',{completed:true,source:'octopus'}).ok);
  if(opponent==='louisto'){
    while(!profile.cubaOffer().ok){if(!profile.canStartActivity('delivery').ok)assert.ok(profile.sleep().ok);assert.ok(profile.startDelivery().ok);for(const stop of DELIVERY_STOPS)assert.ok(profile.deliverParcel(stop,{tip:2}).ok);}
    assert.ok(profile.startCuba().ok);profile.setLocation({scene:'cuba-beach',x:1390,y:790,facing:'down'});
  }
  assert.ok(profile.canFight(opponent).ok);return profile.exportText();
}

const browser = await chromium.launch({headless:true});
const reports=[],errors=[]; let failure=null,active;
const selected=process.env.NEW_OPPONENT_CASE?.split(',');
const small=process.env.NEW_OPPONENT_SMALL==='1', suffix=small?'-small-mobile':'';
const reportPath=process.env.NEW_OPPONENT_REPORT??'docs/new-opponents-browser-results.json';
const cases=[['dyrex',1440,1000,false],['lefeu',1440,1000,false],['louisto',568,320,true]].filter(([id])=>!selected||selected.includes(id)).map(row=>small?[row[0],568,320,true]:row);
const state = page => page.evaluate(()=>structuredClone(window.__sparring.session.state));
async function controller(page,cdp) {
  const points=cdp?{a:await buttonPoint(page,'#sparring-ui [data-pad-button="a"]',2),b:await buttonPoint(page,'#sparring-ui [data-pad-button="b"]',2),head:await joyPoint(page,'#sparring-ui','up',1),body:await joyPoint(page,'#sparring-ui','down',1)}:null;
  let held=null;
  return {
    async guard(level){if(held===level)return;if(cdp){if(level)await dispatch(cdp,held?'touchMove':'touchStart',[points[level]]);else if(held)await dispatch(cdp,'touchEnd',[points[held]]);}else{if(held)await page.keyboard.up(held==='head'?'ArrowUp':'ArrowDown');if(level)await page.keyboard.down(level==='head'?'ArrowUp':'ArrowDown');}held=level;},
    async punch(action){if(cdp){const p=points[action==='jab'?'a':'b'];await dispatch(cdp,'touchStart',[...(held?[points[held]]:[]),p]);await dispatch(cdp,'touchEnd',[p]);}else await page.keyboard.press(action==='jab'?'j':'k');},
  };
}
async function confirm(page,cdp){await page.locator('#sparring-ui .primary-button').focus();if(cdp)await tapContact(page,cdp,'#sparring-ui [data-pad-button="a"]');else await page.keyboard.press('e');}
async function geometry(page,mobile,id){
  const layout=await fit(page,'#sparring-ui',mobile);assert.ok(layout.fits&&layout.noScroll);assert.ok(Math.abs(layout.ratio-16/9)<.004);assert.equal(layout.controls.length,mobile?4:0);for(const c of layout.controls)assert.ok(c.outside&&c.fits);
  const text=await page.evaluate(()=>{
    const canvas=document.querySelector('canvas').getBoundingClientRect();
    return [...document.querySelectorAll('#sparring-ui .fight-hud,#sparring-ui .fight-feedback,#sparring-ui .fight-signal,#sparring-ui .training-coach,#sparring-ui .knockdown-panel')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).opacity!=='0').map(e=>{const r=e.getBoundingClientRect();return{selector:e.className,top:(r.top-canvas.top)/canvas.height,bottom:(r.bottom-canvas.top)/canvas.height};});
  });
  if(mobile)for(const label of text)assert.ok(label.bottom<=.25||label.top>=.91,`mobile message overlaps fighting region: ${JSON.stringify(label)}`);
  reports.push({id,layout,text});
}

try {
  if(!selected||selected.includes('locked'))for(const id of ['dyrex','lefeu','louisto']){
    const context=await browser.newContext({viewport:{width:1280,height:800}}),seed=new CareerProfile({storage:null}).exportText();
    await context.addInitScript(({key,seed})=>localStorage.setItem(key,seed),{key:CAREER_STORAGE_KEY,seed});
    const page=await context.newPage();active=page;
    page.on('pageerror',e=>errors.push(`${id}-locked: ${e.message}`));
    await page.goto(`http://127.0.0.1:5173/?scene=fight&opponent=${id}`);
    await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);
    assert.ok(await page.locator('#sparring-ui .primary-button').isDisabled());
    assert.ok(await page.locator('#sparring-ui .fight-access-note').isVisible());
    await page.keyboard.press('e');await page.keyboard.press('j');await page.waitForTimeout(100);
    assert.equal((await state(page)).phase,'ready');assert.equal((await state(page)).stats.thrown,0);
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);assert.equal(saved.fights[id].attempts,0);assert.equal(saved.techniques.doubleJab,false);
    reports.push({id,lockedLink:true,startDisabled:true});await context.close();
  }
  for(const [id,width,height,mobile] of cases){
    const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
    await context.routeWebSocket('**',ws=>{const server=ws.connectToServer();server.onMessage(message=>{if(typeof message==='string'&&/"type":"(?:update|full-reload)"/.test(message))return;ws.send(message);});});
    await context.addInitScript(({key,value})=>{localStorage.setItem(key,value);},{key:CAREER_STORAGE_KEY,value:fixture(id)});
    const page=await context.newPage();active=page;const cdp=mobile?await context.newCDPSession(page):null;
    page.on('pageerror',e=>errors.push(`${id}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`${id}: ${m.text()}`);});page.on('response',r=>{if(r.status()>=400)errors.push(`${id}: ${r.status()} ${r.url()}`);});
    await page.goto(`http://127.0.0.1:5173/?scene=fight&opponent=${id}`);await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);
    assert.equal((await state(page)).settings.opponent,id);assert.equal((await state(page)).settings.techniques.doubleJab,true);
    const input=await controller(page,cdp);
    await confirm(page,cdp);await wait(page,()=>window.__sparring.session.state.phase==='running');
    // Rapid actual input, one new press per punch; no model/clock mutation.
    await input.punch('jab');await page.waitForTimeout(250);await input.punch('jab');await page.waitForTimeout(300);await input.punch('cross');
    await wait(page,()=>window.__sparring.session.state.stats.thrown===3);
    await wait(page,()=>window.__sparring.session.state.stats.doubleJabCombos===1);
    assert.equal((await state(page)).stamina,59);
    let queue=[],used=false,shot=false,paused=false;const measuredCounts=new Set();const deadline=Date.now()+300000;
    while(Date.now()<deadline){
      const s=await state(page);if(s.phase==='finished')break;
      if(s.phase==='between'){await input.guard(null);queue=[];await page.screenshot({path:`docs/new-${id}-corner.png`});await confirm(page,cdp);await page.waitForTimeout(150);continue;}
      assert.ok(['running','knockdown'].includes(s.phase),`${id}: unexpected ${s.phase}`);
      if(s.phase==='knockdown'){
        queue=[];used=false;await input.guard(null);assert.equal(s.bout.count.downed.player,false,'counter strategy should protect player');

        if(!measuredCounts.has(s.bout.count.stage)){await geometry(page,mobile,id);measuredCounts.add(s.bout.count.stage);}await page.waitForTimeout(70);continue;
      }
      const r=s.remi,lateTell=r.action.startsWith('tell')&&r.duration*(1-r.progress)<.34;
      if(!shot&&r.action.startsWith('tell')){await page.screenshot({path:`docs/${id}-fight-${mobile?'mobile':'desktop'}.png`});await geometry(page,mobile,id);shot=true;}
      if(!paused&&s.elapsed>2){
        await input.guard('head');if(cdp)await tapContact(page,cdp,'#sparring-ui .console-menu-button');else await page.keyboard.press('p');
        await wait(page,()=>window.__sparring.session.state.phase==='paused');const frozen=await state(page);await page.waitForTimeout(200);assert.deepEqual(await state(page),frozen);await input.guard(null);await confirm(page,cdp);
        await wait(page,()=>window.__sparring.session.state.phase==='running');
        assert.equal(await page.locator('#sparring-ui .round-panel').isVisible(),false);paused=true;continue;
      }
      await input.guard((['jab','cross'].includes(r.action)||lateTell)?r.target:null);
      const opening=r.action==='open'&&r.duration>=1.7;if(!opening&&r.action!=='hit')used=false;
      if(!queue.length&&!used&&opening&&r.duration*(1-r.progress)>=1.6&&s.player.action==='idle'&&s.stamina>=48){queue=['jab','jab','cross'];used=true;}
      if(queue.length&&s.player.action==='idle'){if(['open','hit'].includes(r.action))await input.punch(queue.shift());else queue=[];}
      await page.waitForTimeout(25);
    }
    await input.guard(null);const final=await state(page);assert.equal(final.phase,'finished',id);assert.equal(final.bout.result.winner,'player',JSON.stringify(final.bout));
    assert.ok(final.stats.doubleJabCombos>=3);assert.notEqual(final.bout.result.reason,'abandon');
    const impacts=await page.evaluate(()=>window.__sparring.impacts);assert.ok(impacts.some(i=>i.type==='player-hit'));assert.ok(impacts.some(i=>i.type==='remi-blocked'));assert.ok(impacts.filter(i=>i.type==='player-hit').every(i=>i.playerTexture.startsWith('player-')));
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
    assert.equal(stored.fights[id].wins,1);assert.equal(stored.fights[id].attempts,1);assert.equal(stored.fightReceipts.filter(r=>r.startsWith(`${id}:`)).length,1);
    assert.ok(impacts.filter(i=>i.type==='player-hit').every(i=>Math.hypot(i.x-i.targetPoint.x,i.y-i.targetPoint.y)<2),'glove aligns with target at scoring contact');
    if(mobile){
      const visible=await page.evaluate(()=>{const b=document.querySelector('#sparring-ui .primary-button'),r=b.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===b||b.contains(h);});
      assert.ok(visible,'finished primary action must be directly tappable without focus or scrolling');
    }
    await page.screenshot({path:`docs/new-${id}-result${suffix}.png`});
    reports.push({id,result:final.bout.result,stats:final.stats,downs:final.bout.downs,storedFight:stored.fights[id],tournament:stored.tournament.active,impacts:impacts.length});
    console.log(`${id}: ${final.bout.result.reason}, ${final.stats.landed} touches, ${final.stats.blocked} blocks, ${final.stats.combos} combos, save verified`);
    if(id==='louisto'){
      await page.locator('#sparring-ui .return-gym-button').click();
      await wait(page,()=>!window.__sparring&&document.querySelector('#gym-ui')?.hidden===false,null,60000);
      await page.screenshot({path:'docs/louisto-return-beach-mobile.png'});
      const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),CAREER_STORAGE_KEY);
      assert.equal(after.location.scene,'cuba-beach');assert.equal(after.fights[id].wins,1);assert.ok(after.cuba.active);
      reports.push({id,returnToBeach:true,location:after.location});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);
}catch(error){failure=error.stack;console.error(error);if(active&&!active.isClosed())await active.screenshot({path:'docs/new-opponents-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await fs.writeFile(reportPath,JSON.stringify({date:new Date().toISOString(),reports,errors,failure},null,2)+'\n');}
