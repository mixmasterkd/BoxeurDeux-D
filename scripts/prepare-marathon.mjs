// Reproducible technical crops/nearest sizing of imagegen sources, no hand-painted art.
import fs from 'node:fs';
import {readOpaquePng,fit,writePng} from './chapter-png.mjs';
import {extract,bounds} from './sprite-png.mjs';
fs.mkdirSync('public/assets/marathon',{recursive:true});
fs.mkdirSync('public/assets/sprites/marathon',{recursive:true});
for(const name of ['island','downtown','oldport','stadium']){
 const im=fit(readOpaquePng(`references/marathon/${name}-source.png`),1920,1080);writePng(`public/assets/marathon/${name}.png`,im.width,im.height,im.pixels);
}
const chroma='references/marathon/runner-chroma.png';
if(fs.existsSync(chroma)){
 const im=readOpaquePng(chroma),seen=new Uint8Array(im.width*im.height),queue=new Int32Array(seen.length);let end=0;
 const offer=i=>{if(i<0||i>=seen.length||seen[i])return;seen[i]=1;const p=i*4,[r,g,b]=im.pixels.subarray(p,p+3);if(g>125&&g>r*1.65&&g>b*1.65){queue[end++]=i;im.pixels[p+3]=0;}};
 for(let x=0;x<im.width;x++){offer(x);offer((im.height-1)*im.width+x);}for(let y=0;y<im.height;y++){offer(y*im.width);offer(y*im.width+im.width-1);}
 for(let q=0;q<end;q++){const i=queue[q];if(i%im.width)offer(i-1);if(i%im.width<im.width-1)offer(i+1);offer(i-im.width);offer(i+im.width);}
 writePng('references/marathon/runner-alpha.png',im.width,im.height,im.pixels);
}
const filename='references/marathon/runner-alpha.png';
if(fs.existsSync(filename)){
 const im=readOpaquePng(filename),poses={};const cellW=im.width/3,cellH=im.height/4;
 for(const [row,direction] of ['down','right','up','left'].entries())for(let col=0;col<3;col++){
  const cell={x:Math.round(col*cellW),y:Math.round(row*cellH),w:Math.floor(cellW),h:Math.floor(cellH)};
  const b=bounds(im,cell);if(b.w>cellW*.86||b.h>cellH*.98)throw new Error('Runner transparency/margins not valid');
  poses[`${direction}-${col}`]=extract(im,cell,`marathon/player-${direction}-${col}.png`,{height:88,baseline:104,center:48,width:96,canvasHeight:112});
 }
 fs.writeFileSync('public/assets/sprites/marathon/player.json',JSON.stringify({width:96,height:112,anchor:{x:48,y:104},artHeight:88,poses},null,2));
}
const crowdFile='references/marathon/crowd-chroma.png';
if(fs.existsSync(crowdFile)){
 const im=readOpaquePng(crowdFile);for(let p=0;p<im.pixels.length;p+=4){const[r,g,b]=im.pixels.subarray(p,p+3);if(g>130&&g>r*1.65&&g>b*1.65)im.pixels[p+3]=0;}
 writePng('references/marathon/crowd-alpha.png',im.width,im.height,im.pixels);
 for(let person=0;person<4;person++)for(let column=0;column<6;column++){
  const direction=['right','right','down','down','up','up'][column],frame=column%2;
  extract(im,{x:Math.round(column*im.width/6),y:Math.round(person*im.height/4),w:Math.floor(im.width/6),h:Math.floor(im.height/4)},`marathon/crowd-${person}-${direction}-${frame}.png`,{height:88,baseline:104,center:48,width:96,canvasHeight:112});
 }
}
