// Technical extraction and identical-scale alignment; all anatomy is imagegen.
import fs from 'node:fs';
import path from 'node:path';
import { clean } from './prepare-new-chapter-combat.mjs';
import { extract } from './sprite-png.mjs';
const root = path.resolve(import.meta.dirname,'..');
for (const id of ['decision-player', 'decision-local']) {
 const { image, pieces } = clean(id,3,1), scale=512/pieces[0].h;
 const dir=path.join(root,'public/assets/sprites',id);fs.mkdirSync(dir,{recursive:true});
 const meta={version:1,canvas:{width:640,height:640},anchor:{x:320,y:624},artHeight:512,poses:{}};
 pieces.forEach((box,i)=>{
  const name=['neutral','winner','loser'][i], pixels=Buffer.alloc(image.pixels.length);
  for(const at of box.indices)image.pixels.copy(pixels,at*4,at*4,at*4+4);
  const sourceCenter=[273,767,1265][i];
  meta.poses[name]=extract({...image,pixels},box,`${id}/${name}.png`,{scale,width:640,canvasHeight:640,center:320,baseline:624,sourceCenter,landmarks:{head:[sourceCenter,204],glove:i===1?[956,76]:[sourceCenter-166,581]}});
 });
 fs.writeFileSync(path.join(dir,'fighters.json'),JSON.stringify(meta,null,2)+'\n');
 console.log(`${id}: 3 complete front-facing poses`);
}

// Uniform nearest-neighbour sizing of the two complete authored backgrounds.
const {readOpaquePng,fit,writePng}=await import('./chapter-png.mjs');
for(const [source,target,width,height]of [
 ['street-background-source.png','public/assets/marathon/street-fight.png',1280,720],
 ['octopus-corner-source.png','public/assets/sprites/corner/octopus-coach.png',800,650],
]) {
 const im=fit(readOpaquePng(path.join(root,'references/characters/new-chapter-combat',source)),width,height);
 fs.mkdirSync(path.dirname(path.join(root,target)),{recursive:true});
 writePng(path.join(root,target),im.width,im.height,im.pixels);
}
