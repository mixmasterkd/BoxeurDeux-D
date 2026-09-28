// Technical extraction only: preserve generated RGBA, uniformly size, foot-anchor.
import fs from 'node:fs';
import path from 'node:path';
import {readPng,writePng} from './sprite-png.mjs';
const root=path.resolve(import.meta.dirname,'..');
const reference=path.join(root,'references/home-bar');
const bounds=(image,left=0,right=image.width)=>{
 let x0=right,y0=image.height,x1=left,y1=0;
 for(let y=0;y<image.height;y++)for(let x=left;x<right;x++)if(image.pixels[(y*image.width+x)*4+3]>64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 return{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};
};
function resize(image,crop,width,height,scale,offsetX,offsetY,destination){
 const pixels=Buffer.alloc(width*height*4),w=Math.round(crop.width*scale),h=Math.round(crop.height*scale);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=crop.x+Math.min(crop.width-1,Math.floor(x/scale)),sy=crop.y+Math.min(crop.height-1,Math.floor(y/scale));
  image.pixels.copy(pixels,((y+offsetY)*width+x+offsetX)*4,(sy*image.width+sx)*4,(sy*image.width+sx)*4+4);
 }
 fs.mkdirSync(path.dirname(destination),{recursive:true});writePng(destination,width,height,pixels);
 return{destination:path.relative(root,destination),crop,scale,width,height,offsetX,offsetY};
}
const people=readPng(path.join(reference,'people-alpha-source.png'));
const regions=[[0,425,'home/karl-guest'],[425,867,'home/karl-gaming'],[867,1318,'bar/beton'],[1318,1774,'bar/kramer']];
const crops=regions.map(([left,right])=>bounds(people,left,right));
const scale=Math.min(188/Math.max(...crops.map(c=>c.height)),104/Math.max(...crops.map(c=>c.width)));
const outputs=regions.map((region,i)=>{const crop=crops[i];return resize(people,crop,112,200,scale,Math.floor((112-Math.round(crop.width*scale))/2),198-Math.round(crop.height*scale),path.join(root,'public/assets/'+region[2]+'.png'));});
const exterior=readPng(path.join(reference,'exterior-source.png')),crop=bounds(exterior),facadeScale=560/crop.width;
outputs.push(resize(exterior,crop,560,Math.round(crop.height*facadeScale),facadeScale,0,0,path.join(root,'public/assets/bar/exterior.png')));
fs.writeFileSync(path.join(reference,'sprites-preparation.json'),JSON.stringify({method:'Alpha-bounds crops; uniform nearest-neighbour scale; source alpha preserved without recolouring or redraw.',outputs},null,2)+'\n');
console.log(JSON.stringify(outputs,null,2));
