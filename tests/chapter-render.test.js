import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FighterView } from '../src/scenes/FighterView.js';
import { SparringSession } from '../src/game/SparringSession.js';
import { transformFighterPoint } from '../src/game/FighterMotion.js';
import { readPng } from '../scripts/sprite-png.mjs';
const json = file => JSON.parse(readFileSync(new URL(`../public/assets/sprites/${file}`,import.meta.url)));
const ids=['kramer','bellini','fortin','gagnon'];
const atlases={fighters:json('sparring-v2/fighters.json'),'fighters-hook':json('sparring-hook/fighters.json'),'fighters-body':json('body-training/sparring.json'),'fighters-knockdown':json('knockdown/fighters.json')};
for(const id of [...ids,'competition'])atlases[`fighters-${id}`]=json(`chapter-combat/${id}/fighters.json`);
function object(x,y,key){return{x,y,texture:{key},rotation:0,flipX:false,setOrigin(){return this;},setScale(s){this.scaleX=this.scaleY=s;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},setRotation(r){this.rotation=r;return this;},setFlipX(v){this.flipX=v;return this;},setAlpha(a){this.alpha=a;return this;},setTexture(key){this.texture={key};return this;}};}
const scene=()=>({cache:{json:{get:key=>atlases[key]}},add:{image:object,ellipse:object}});
function bounds(view){const b=view.metadata.poses[`${view.who}-${view.pose}`].bounds;return[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>transformFighterPoint({x,y},view.anchor,{x:view.sprite.x,y:view.sprite.y,scale:view.sprite.scaleX,rotation:view.sprite.rotation,flip:view.sprite.flipX}));}
function visible(view){for(const p of bounds(view)){const x=640*.12+p.x*.88,y=p.y*.88;assert.ok(x>=0&&x<=1280&&y>=0&&y<=720,`${view.sprite.texture.key} outside frame at ${x},${y}`);}}

test('all new boxers have genuine transparent full poses, measured glove pixels and lower floor poses',()=>{
  for(const id of [...ids,'competition']){
    const atlas=atlases[`fighters-${id}`];assert.equal(Object.keys(atlas.poses).length,id==='competition'?21:16);
    for(const [name,spec]of Object.entries(atlas.poses)){
      const png=readPng(new URL(`../public/assets/sprites/${spec.file}`,import.meta.url));let clear=0,visible=0;
      for(let i=3;i<png.pixels.length;i+=4){if(!png.pixels[i])clear++;else if(png.pixels[i]>220)visible++;}
      assert.ok(clear>png.width*png.height*.5&&visible>10000,name);
      assert.ok(spec.bounds.x>0&&spec.bounds.x+spec.bounds.width<png.width,name);assert.equal(spec.bounds.y+spec.bounds.height,atlas.anchor.y,name);
      if(spec.contact){const{x,y}=spec.contact;assert.ok(png.pixels[(y*png.width+x)*4+3]>100,`${name}: contact must sit on a drawn glove`);}
    }
    assert.ok(atlas.poses[`${id}-down`].bounds.height<atlas.poses[`${id}-guard`].bounds.height*.75);
    assert.ok(atlas.poses[`${id}-fall`].bounds.height<atlas.poses[`${id}-guard`].bounds.height*.8);
  }
});

for(const id of ids)test(`${id}: every scored glove contact renders its own identity at the promised target`,()=>{
  for(const hz of [20,60]){
    const s=new SparringSession({opponent:id}),front=new FighterView(scene(),'remi',640,592,390,{opponent:id});
    const back=new FighterView(scene(),'player',640,718,390,{tournament:id!=='kramer'});
    const contacts=new Set();s.start();
    for(let n=0;n<hz*18&&s.state.phase==='running';n++){
      s.setGuard(['jab','cross'].includes(s.state.remi.action),s.state.remi.target);
      s.update(1/hz);const state=s.state;
      front.target=back.point('guard',state.remi.target);front.render(state.remi,state.elapsed,state.bout);
      back.render(state.player,state.elapsed,state.bout);visible(front);visible(back);
      for(const event of s.drainEvents())if(['remi-hit','remi-blocked'].includes(event.type)){
        assert.equal(front.phase,'contact');assert.ok(front.sprite.texture.key.startsWith(id+'-'));
        assert.ok(Math.hypot(front.contact().x-front.attackAim.x,front.contact().y-front.attackAim.y)<1);
        contacts.add(event.attack+':'+event.target);
      }
    }
    assert.ok(contacts.has('jab:head'));assert.ok([...contacts].some(key=>key.startsWith('cross:')));
  }
});

test('competition player retains head/body JKJ contacts, correct glove points and full camera bounds',()=>{
  for(const hz of [20,60])for(const target of ['head','body']){
    const back=new FighterView(scene(),'player',640,718,390,{tournament:true});
    const front=new FighterView(scene(),'remi',640,592,390,{opponent:'gagnon'});
    back.target=front.point('guard',target);const s=new SparringSession({opponent:'gagnon'});s.start();
    const actions=['jab','cross','jab'];let landed=0;
    for(let n=0;n<hz*2&&landed<3;n++){
      s.setGuard(target==='body',target);if(actions.length&&['idle','guard'].includes(s.state.player.action))s.act(actions.shift());
      s.update(1/hz);back.render(s.state.player,s.state.elapsed);visible(back);
      for(const event of s.drainEvents())if(event.type==='player-hit'||event.type==='player-blocked'){
        landed++;assert.equal(back.phase,'contact');assert.ok(back.sprite.texture.key.startsWith('competition-'));
        assert.ok(Math.hypot(back.contact().x-back.attackAim.x,back.contact().y-back.attackAim.y)<1);
      }
    }
    assert.equal(landed,3);
  }
});
