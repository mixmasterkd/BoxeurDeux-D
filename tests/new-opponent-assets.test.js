import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readPng} from '../scripts/sprite-png.mjs';
const root=new URL('../public/assets/sprites/',import.meta.url);
const poses=['guard','block','jab-windup','jab','cross-windup','cross','cross-windup-body','cross-body','block-body','hit','hit-body','fall','down','rise','dodge','surrender'];
for(const id of ['dyrex','louisto'])test(`${id}: complete transparent poses preserve stance, head/body and striking glove landmarks`,()=>{
 const atlas=JSON.parse(fs.readFileSync(new URL(`opponents/${id}/fighters.json`,root)));
 assert.deepEqual(atlas.canvas,{width:640,height:640});assert.deepEqual(atlas.anchor,{x:320,y:624});assert.equal(atlas.artHeight,512);
 assert.deepEqual(Object.keys(atlas.poses).map(k=>k.slice(id.length+1)),poses);
 for(const pose of poses){
  const spec=atlas.poses[`${id}-${pose}`],image=readPng(new URL(spec.file,root));
  assert.equal(spec.physicalScale,atlas.physicalScale,`${pose} must not shrink/stretch independently`);
  assert.ok(spec.bounds.x>0&&spec.bounds.y>0&&spec.bounds.x+spec.bounds.width<640);
  assert.equal(spec.bounds.y+spec.bounds.height,624);
  let solid=0,green=0;
  for(let i=0;i<image.pixels.length;i+=4){const[r,g,b,a]=image.pixels.subarray(i,i+4);if(a>16){solid++;if(g>55&&g>r*1.25&&g>b*1.25)green++;}}
  assert.ok(solid>14000&&solid<640*640*.65,`${pose} silhouette and transparent background`);assert.equal(green,0,`${pose} chroma spill`);
  for(const name of ['head','body','glove'])if(spec[name]){const{x,y}=spec[name];assert.equal(image.pixels[(y*640+x)*4+3],255,`${pose} ${name} must point on visible art`);}
 }
 assert.ok(atlas.poses[`${id}-down`].bounds.height<atlas.poses[`${id}-guard`].bounds.height*.75);
 assert.ok(atlas.poses[`${id}-jab`].glove.x>atlas.poses[`${id}-jab`].head.x+100,'left jab projects screen right');
 assert.ok(atlas.poses[`${id}-cross`].glove.x<atlas.poses[`${id}-cross`].head.x-100,'right direct projects screen left');
 assert.ok(atlas.poses[`${id}-cross-body`].glove.y>atlas.poses[`${id}-cross`].glove.y+120,'body direct reaches lower');
});

test('Le Feu visibly bends the jab before its original extended contact without replacing his other poses',()=>{
 const atlas=JSON.parse(fs.readFileSync(new URL('opponents/lefeu/fighters.json',root)));
 assert.deepEqual(Object.keys(atlas.poses).map(k=>k.slice(6)),poses);
 const guard=atlas.poses['lefeu-guard'],prep=atlas.poses['lefeu-jab-windup'],jab=atlas.poses['lefeu-jab'];
 assert.ok(prep.sourceFile.endsWith('clean-alpha-source.png'));
 for(const[pose,spec]of Object.entries(atlas.poses)){
  if(pose!=='lefeu-jab-windup')assert.ok(spec.sourceFile.endsWith('/source.png'));
  assert.ok(spec.bounds.x>0&&spec.bounds.y>0&&spec.bounds.x+spec.bounds.width<640);assert.equal(spec.bounds.y+spec.bounds.height,624);
  const image=readPng(new URL(spec.file,root));
  if(spec.glove)assert.ok(image.pixels[(spec.glove.y*640+spec.glove.x)*4+3]>16,`${pose} contact lies on its authored glove`);
 }
 assert.ok(Math.abs(prep.bounds.height-guard.bounds.height)<15,'guard-relative scale is maintained');
 assert.ok(Math.abs(prep.glove.x-prep.head.x)<90,'preparation elbow stays bent near the face');
 assert.ok(jab.glove.x-jab.head.x>180,'the scoring glove is visibly extended');
});
