import test from 'node:test';
import assert from 'node:assert/strict';
import { HotelActivitySession } from '../src/game/HotelActivitySession.js';
function until(session,time){session.update(Math.max(0,time-session.state.elapsed));}
for(const activity of ['pads','pool']){
  test(`${activity}: the full session is playable at its announced pace, each contact scores once`,()=>{
    const s=new HotelActivitySession({activity});s.start();let contacts=0;
    while(s.state.beat.expected){
      until(s,s.state.beat.inputAt);
      const before=s.state.stats.hits;
      assert.equal(s.act(s.state.beat.expected),true);
      assert.equal(s.state.stats.hits,before,'no point on press');
      s.update(.20);assert.equal(s.state.stats.hits,before+1,'point on visual contact');contacts++;
      assert.equal(s.act('jab'),false,'cannot double-count during recovery');s.update(.37);
    }
    until(s,45);assert.equal(s.state.phase,'finished');assert.equal(s.state.summary.accuracy,100);
    assert.equal(s.state.summary.hits,contacts);assert.equal(s.state.summary.qualified,true);
    if(activity==='pool')assert.ok(s.state.summary.laps>=3);
  });
  test(`${activity}: pause preserves a pending contact and timer`,()=>{
    const s=new HotelActivitySession({activity});s.start();until(s,2);s.act('jab');s.update(.10);s.pause();
    const time=s.state.elapsed;s.update(10);assert.equal(s.state.elapsed,time);assert.equal(s.state.stats.hits,0);
    s.resume();s.update(.10);assert.equal(s.state.stats.hits,1);s.update(.01);assert.equal(s.state.stats.hits,1);
  });
}
test('pads: cue sequences require guards and dodges, wrong input is not accepted as a punch',()=>{
  const s=new HotelActivitySession();s.start();s.update(5);
  assert.equal(s.state.beat.expected,'guardHead');s.act('jab');s.update(.20);assert.equal(s.state.stats.wrong,1);assert.equal(s.state.stats.hits,0);
  assert.equal(s.state.stats.missed,2);
});
test('pool: random mashing does not grant lengths or qualification',()=>{
  const s=new HotelActivitySession({activity:'pool'});s.start();
  for(let i=0;i<450;i++){s.act('jab');s.update(.1);}
  assert.equal(s.state.phase,'finished');assert.equal(s.state.summary.qualified,false);
  assert.ok(s.state.summary.accuracy<60);
});
test('empty session ends without reward, reset discards all old scoring',()=>{
  const s=new HotelActivitySession();s.start();s.update(45);assert.equal(s.state.phase,'finished');assert.equal(s.state.summary.qualified,false);
  s.reset();assert.equal(s.state.phase,'ready');assert.equal(s.state.stats.missed,0);assert.equal(s.state.summary,null);
});
test('pads: held high/low guard follows combat convention and releases on pause',()=>{
 const s=new HotelActivitySession();s.start();s.setGuard(true,'head');s.update(5.21);
 assert.equal(s.state.stats.hits,1,'high guard held before the coach cue blocks at its contact');
 assert.equal(s.state.stats.missed,2,'holding guard cannot perform the two punches');
 s.pause();assert.equal(s.state.guard,null);s.resume();s.update(6);assert.equal(s.state.stats.hits,1);
});
test('pads: releasing a guard before its contact does not count as a block',()=>{
 const s=new HotelActivitySession();s.start();s.setGuard(true,'head');s.update(5.1);s.setGuard(false);s.update(.11);
 assert.equal(s.state.stats.hits,0);assert.equal(s.state.stats.wrong,1);
});
