import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,wait,tapContact,fit} from './control-helpers.mjs';
import {hotelFixture,seedContext} from './hotel-test-helpers.mjs';

const browser=await chromium.launch({headless:true}), reports=[],errors=[];
try {
  for(const [width,height,opponent] of [[568,320,'gagnon'],[844,390,'gagnon'],[568,320,'remi']]) {
    const p=hotelFixture();
    if(opponent==='gagnon')for(let day=1;day<3;day++){const t=p.tournamentStatus();p.recordTournamentFight({opponent:t.opponent,winner:'player',score:10,matchId:t.currentMatchId});p.sleep();}
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});await seedContext(context,p);
    const page=await context.newPage(),cdp=await context.newCDPSession(page);
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`http://127.0.0.1:5173/?scene=fight&opponent=${opponent}`);await wait(page,()=>window.__sparring?.session.state.phase==='ready',null,60000);
    for(const phase of ['ready','paused']) {
      await wait(page,phase=>window.__sparring.session.state.phase===phase,phase);
      const view=await page.evaluate(()=>{
        const root=document.querySelector('#sparring-ui'),panel=root.querySelector('.round-panel'),title=root.querySelector('.panel-heading'),button=root.querySelector('.primary-button'),read=root.querySelector('.panel-scroll');
        const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),tr=title.getBoundingClientRect(),pr=panel.getBoundingClientRect();
        return{tapHitsButton:hit===button||button.contains(hit),titleWidth:tr.width,titleInside:tr.left>=pr.left&&tr.right<=pr.right,titleAboveButton:tr.bottom<=r.top,buttonInside:r.top>=pr.top&&r.bottom<=pr.bottom,panelWidth:pr.width,scroll:read.scrollHeight>read.clientHeight};
      });
      assert.ok(view.tapHitsButton&&view.buttonInside&&view.titleInside&&view.titleAboveButton,JSON.stringify(view));assert.ok(view.titleWidth>=240);
      const layout=await fit(page,'#sparring-ui',true);assert.ok(layout.fits&&layout.noScroll&&layout.controls.every(c=>c.outside&&c.fits));
      await page.screenshot({path:`docs/chapter-${opponent}-${phase}-${width}.png`});
      // Direct physical tap, with no focus or scroll helper to mask positioning.
      await tapContact(page,cdp,'#sparring-ui .primary-button');await wait(page,()=>window.__sparring.session.state.phase==='running');
      reports.push({opponent,width,height,phase,view,layout});
      if(phase==='ready')await tapContact(page,cdp,'#sparring-ui .console-menu-button');
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);await fs.writeFile('docs/combat-menus-browser-results.json',JSON.stringify({date:new Date().toISOString(),reports,errors},null,2)+'\n');console.log('Combat menus: 6 ready/pause states, direct taps, full titles and external controls verified.');
} finally {await browser.close();}
