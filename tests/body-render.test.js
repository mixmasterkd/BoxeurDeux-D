import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SparringSession, TIMINGS } from '../src/game/SparringSession.js';
import { ShadowSession } from '../src/game/ShadowSession.js';
import { BagSession } from '../src/game/BagSession.js';
import { FighterView } from '../src/scenes/FighterView.js';
import { BagFighterView } from '../src/scenes/BagFighterView.js';
import { ShadowFighterView, MIRROR_LAYOUT } from '../src/scenes/ShadowFighterView.js';
import { transformFighterPoint } from '../src/game/FighterMotion.js';
import { readPng } from '../scripts/sprite-png.mjs';
const json=p=>JSON.parse(readFileSync(new URL(`../public/assets/sprites/${p}`,import.meta.url)));
const ring=json('sparring-v2/fighters.json'),hook=json('sparring-hook/fighters.json'),body=json('body-training/sparring.json');
const gym=json('bag-orthodox/fighters.json'),defense=json('mirror/fighters.json'),gymBody=json('body-training/gym.json');
function object(x=0,y=0,key){
 const o={x,y,rotation:0,scaleX:1,scaleY:1,flipX:false,texture:{key}};
 for(const method of ['setOrigin','setDisplaySize','setDepth','setTint','setAlpha','clear','lineStyle','strokeRoundedRect','lineBetween','fillStyle','fillRect'])o[method]=()=>o;
 o.setScale=(x,y=x)=>{o.scaleX=x;o.scaleY=y;return o;};o.setPosition=(x,y)=>{o.x=x;o.y=y;return o;};
 o.setRotation=a=>{o.rotation=a;return o;};o.setFlipX=b=>{o.flipX=b;return o;};o.setTexture=key=>{o.texture={key};return o;};return o;
}
function scene(){
 const data={fighters:ring,'fighters-hook':hook,'fighters-body':body,'bag-fighters':gym,'bag-body-data':gymBody,'bag-defense-data':defense,
  'shadow-base-data':gym,'shadow-defense-data':defense,'shadow-body-data':gymBody};
 return {cache:{json:{get:key=>data[key]}},add:{image:object,ellipse:object,graphics:()=>object()}};
}
function ringBounds(view){
 const spec=view.metadata.poses[`${view.who}-${view.pose}`];
 assert.ok(spec,`Missing rendered pose ${view.who}-${view.pose}`);
 const b=spec.bounds;
 return [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>transformFighterPoint({x,y},view.anchor,{x:view.sprite.x,y:view.sprite.y,scale:view.sprite.scaleX,flip:view.sprite.flipX,rotation:view.sprite.rotation}));
}
function inside(points,rect,label){for(const p of points)assert.ok(p.x>=rect.x-1&&p.x<=rect.x+rect.width+1&&p.y>=rect.y-1&&p.y<=rect.y+rect.height+1,`${label}: ${JSON.stringify(p)}`);}
function rectangle(b){return [{x:b.left,y:b.top},{x:b.right,y:b.bottom}];}

test('body atlases have real alpha and full authored silhouettes inside their fixed canvases',()=>{
 for(const atlas of [body,gymBody])for(const [pose,spec]of Object.entries(atlas.poses)){
  const filename=spec.file?.split('/').pop()??`${atlas===body?pose:`gym-${pose}`}.png`;
  const file=new URL(`../public/assets/sprites/body-training/${filename}`,import.meta.url);
  assert.ok(existsSync(file),filename);
  const png=readPng(file);let clear=0,solid=0;
  for(let i=3;i<png.pixels.length;i+=4){if(png.pixels[i]<=16)clear++;if(png.pixels[i]>220)solid++;}
  assert.ok(clear>png.width*png.height*.30&&solid>png.width*png.height*.05,`${pose} needs genuine transparent surroundings and visible art`);
  const b=spec.bounds;assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=png.width&&b.y+b.height<=png.height,pose);
 }
});

test('body punches reach the torso on their scored frame at 20/60 Hz and keep both fighters in the camera',()=>{
 for(const hz of [20,60]){
  const session=new SparringSession({random:()=>.5});const s=scene();
  const player=new FighterView(s,'player',640,718,390),remi=new FighterView(s,'remi',640,592,390);
  session.start();session.setGuard(true,'body');let hits=0;
  for(const [input,expected]of [['jab','jab'],['cross','cross'],['jab','hook']]){
   session.act(input);
   assert.equal(session.state.player.action,expected);
   while(session.state.player.action===expected){
    session.update(1/hz);const state=session.state;
    remi.target=player.point('guard',state.remi.target);remi.render(state.remi,state.elapsed);
    player.target=state.remi.action==='hit'?remi.point('guard','body'):remi.point(remi.pose,'body',true);
    player.render(state.player,state.elapsed);
    for(const view of [player,remi])inside(ringBounds(view).map(p=>({x:640*(1-.88)+p.x*.88,y:p.y*.88})),{x:0,y:0,width:1280,height:720},`${view.who} ${view.pose}`);
    for(const e of session.drainEvents())if(e.type==='player-hit'){
     assert.equal(e.target,'body');assert.equal(player.pose,`${expected}-body`);hits++;
     const p=player.contact(),aim=player.attackAim;assert.ok(Math.hypot(p.x-aim.x,p.y-aim.y)<1.5);
    }
   }
  }
  assert.equal(hits,3);assert.equal(session.state.stats.combos,1);
 }
});

test('body mirror poses share one clock, correct handedness and complete reflected bounds',()=>{
 for(const hz of [20,60]){
  const session=new ShadowSession(),view=new ShadowFighterView(scene());session.start();session.setGuard(true,'body');let count=0;
  for(const [input,expected]of [['jab','jab'],['cross','cross'],['jab','hook']]){
   session.act(input);
   while(session.state.player.action===expected){
    session.update(1/hz);view.render(session.state.player,session.state.elapsed);
    assert.equal(view.sprite.texture.key,view.reflection.texture.key);
    assert.ok(view.sprite.scaleX>0&&view.reflection.scaleX<0);
    inside(rectangle(view.bounds()),{x:0,y:0,width:1280,height:720},view.pose);
    inside(rectangle(view.bounds(true)),MIRROR_LAYOUT.glass,`reflected ${view.pose}`);
    for(const e of session.drainEvents()){assert.equal(view.pose,`${e.action}-body`);assert.equal(view.phase,'contact');count++;}
   }
  }
  view.render(session.state.player,session.state.elapsed);assert.equal(view.pose,'block-body');assert.equal(count,3);
 }
});

test('bag body choreography contacts match the lower swinging leather target and defenses never create hits',()=>{
 const session=new BagSession(),view=new BagFighterView(scene());session.start();let bodyHits=0;
 for(let frame=0;frame<45*120&&session.state.phase==='running';frame++){
  const state=session.state,step=state.sequence.steps.find(s=>s.status==='waiting');
  if(step&&state.player.action==='idle'&&state.elapsed>=step.inputAt-.001){session.setGuard(step.target==='body','body');session.act(step.input);session.setGuard(false);}
  session.update(1/120);view.render(session.state.player,session.state.elapsed);
  for(const e of session.drainEvents())if(e.type==='bag-hit'){
   assert.equal(e.result,'perfect');
   if(e.target==='body'){bodyHits++;assert.equal(view.pose,`${e.attack}-body`);}
   const p=view.contactPoint,aim=view.attackAim;assert.ok(Math.hypot(p.x-aim.x,p.y-aim.y)<1.5,view.pose);
   view.impact(e.attack,e.result,e.time);
  }
 }
 assert.ok(bodyHits>=3,'a complete body combination was actually played');
 session.reset();session.start();
 for(const action of ['dodgeLeft','dodgeRight']){session.act(action);for(let t=0;t<.6;t+=.02){session.update(.02);view.render(session.state.player,session.state.elapsed);}}
 session.setGuard(true,'body');view.render(session.state.player,session.state.elapsed);assert.equal(view.pose,'block-body');
 assert.equal(session.state.stats.contacts,0);
});
