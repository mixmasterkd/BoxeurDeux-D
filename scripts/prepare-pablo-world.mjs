// Only technical extraction/alignment; the two poses are original imagegen art.
import fs from 'node:fs';
import {readPng,extract,bounds} from './sprite-png.mjs';
const source='references/mexico/pablo-world-source.png',image=readPng(source),half=Math.floor(image.width/2);
fs.mkdirSync('public/assets/sprites/mexico-pablo',{recursive:true});
const cells=[{x:0,y:0,w:half,h:image.height},{x:half,y:0,w:image.width-half,h:image.height}];
const scale=88/Math.max(...cells.map(c=>bounds(image,c).h));
const poses={};
for(const [i,name]of ['idle','ready'].entries())poses[name]=extract(image,cells[i],`mexico-pablo/${name}.png`,{scale,baseline:104,center:48,width:96,canvasHeight:112});
fs.writeFileSync('public/assets/sprites/mexico-pablo/fighters.json',JSON.stringify({width:96,height:112,anchor:{x:48,y:104},artHeight:88,source,poses},null,2)+'\n');
console.log(JSON.stringify(poses));
