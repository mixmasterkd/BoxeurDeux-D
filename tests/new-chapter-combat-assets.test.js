import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readPng } from '../scripts/sprite-png.mjs';
import { FighterView } from '../src/scenes/FighterView.js';
const ids=['pablo','danielo','gold-rios','gold-moreau','gold-santos','runner','runner-player'];
test('all new fighting silhouettes have real alpha, complete canvas margins, and consistent foot anchors',()=>{
 for(const id of ids){
  const meta=JSON.parse(fs.readFileSync(`public/assets/sprites/opponents/${id}/fighters.json`));
  for(const [key,spec]of Object.entries(meta.poses)) {
   const png=readPng(`public/assets/sprites/${spec.file}`),b=spec.bounds;
   assert.ok(b.x>0&&b.x+b.width<640&&b.y>0,`${key} is clipped`);
   assert.equal(b.y+b.height,624,`${key} floor`);
   let opaque=0,clear=0,green=0;
   for(let i=0;i<png.pixels.length;i+=4){const[r,g,b,a]=png.pixels.subarray(i,i+4);if(a>220){opaque++;if(g>r*1.25&&g>b*1.25&&g>55)green++;}if(!a)clear++;}
   assert.ok(clear>640*640*.35&&opaque>5000,`${key} alpha and silhouette`);
   assert.equal(green,0,`${key} chroma fringe`);
   for(const point of [spec.head,spec.body,...(spec.contact?[spec.contact]:[])]) {assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));assert.ok(png.pixels[(point.y*png.width+point.x)*4+3]>220,`${key} visible target landmark`);}
  }
 }
});
test('front decision poses preserve one physical scale, not a smaller boxer with a raised hand',()=>{
 for(const id of ['decision-player','decision-local']){
  const m=JSON.parse(fs.readFileSync(`public/assets/sprites/${id}/fighters.json`));
  assert.ok(m.poses.winner.bounds.height>m.poses.neutral.bounds.height);
  assert.ok(Math.abs(m.poses.winner.head.y-m.poses.neutral.head.y)<4);
  assert.ok(m.poses.winner.glove.y<m.poses.winner.head.y-50);
 }
});
test('preloading each new opponent resolves real local files without unrelated opponent downloads',()=>{
 for(const opponent of ids.filter(id=>id!=='runner-player')){
  const calls=[];FighterView.preload({load:{image:(key,url)=>calls.push({key,url}),json:(key,url)=>calls.push({key,url})}},{opponent,streetFight:opponent==='runner'});
  for(const call of calls) assert.ok(fs.existsSync(`public${call.url}`),`${opponent} missing ${call.url}`);
  assert.ok(calls.some(c=>c.key===`${opponent}-guard`));
  assert.equal(calls.some(c=>c.key==='dyrex-guard'),false);
 }
});

test('Rémi head and body punches now originate from the same orthodox outside hand',()=>{
 const data={fighters:JSON.parse(fs.readFileSync('public/assets/sprites/sparring-v2/fighters.json')),
 'fighters-hook':JSON.parse(fs.readFileSync('public/assets/sprites/sparring-hook/fighters.json')),
 'fighters-body':JSON.parse(fs.readFileSync('public/assets/sprites/body-training/sparring.json')),
 'fighters-knockdown':JSON.parse(fs.readFileSync('public/assets/sprites/knockdown/fighters.json'))};
 const object=()=>({setOrigin(){return this},setScale(){return this},setAlpha(){return this}});
 const scene={cache:{json:{get:key=>data[key]}},add:{ellipse:object,image:object}};
 const view=new FighterView(scene,'remi',640,592,390);
 for(const pose of ['jab','jab-windup','jab-recover','jab-body'])assert.ok(view.point(pose,'glove').x>view.point(pose,'head').x,`${pose}: left physical fist on screen right`);
 for(const pose of ['cross','cross-windup','cross-recover','cross-body'])assert.ok(view.point(pose,'glove').x<view.point(pose,'head').x,`${pose}: right physical fist on screen left`);
});
