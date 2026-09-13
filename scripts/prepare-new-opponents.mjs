// Technical chroma removal and connected silhouette extraction of original imagegen art.
// No fighter anatomy is drawn here. Source artwork remains preserved in references.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {readPng,writePng,extract} from './sprite-png.mjs';
const root=path.resolve(import.meta.dirname,'..');
const ref='references/characters/opponents';
function sourcePng(file){const bytes=fs.readFileSync(file);if(bytes[25]===6)return readPng(file);if(bytes[24]!==8||bytes[25]!==2)throw Error('Expected RGB/RGBA source PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),parts=[];for(let at=8;at<bytes.length;){const n=bytes.readUInt32BE(at);if(bytes.toString('ascii',at+4,at+8)==='IDAT')parts.push(bytes.subarray(at+8,at+8+n));at+=n+12;}
 const raw=zlib.inflateSync(Buffer.concat(parts)),rgb=Buffer.alloc(width*height*3),pixels=Buffer.alloc(width*height*4);let at=0;
 const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[at++];for(let x=0;x<width*3;x++){const i=y*width*3+x,a=x>=3?rgb[i-3]:0,b=y?rgb[i-width*3]:0,c=y&&x>=3?rgb[i-width*3-3]:0;rgb[i]=(raw[at++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}}
 for(let i=0;i<width*height;i++){rgb.copy(pixels,i*4,i*3,i*3+3);pixels[i*4+3]=255;}return{width,height,pixels};
}
function clean(name,columns,rows){
 const image=sourcePng(path.join(root,ref,`${name}-source.png`));
 for(let i=0;i<image.pixels.length;i+=4){const r=image.pixels[i],g=image.pixels[i+1],b=image.pixels[i+2];if(g>55&&g>r*1.25&&g>b*1.25)image.pixels.fill(0,i,i+4);}
 writePng(path.join(root,ref,`${name}-alpha.png`),image.width,image.height,image.pixels);
 const seen=new Uint8Array(image.width*image.height),pieces=[];
 for(let start=0;start<seen.length;start++){if(seen[start]||image.pixels[start*4+3]<=16)continue;const stack=[start],indices=[];seen[start]=1;let x0=Infinity,y0=Infinity,x1=0,y1=0;
  while(stack.length){const i=stack.pop(),x=i%image.width,y=Math.floor(i/image.width);indices.push(i);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const n of [x?i-1:-1,x+1<image.width?i+1:-1,y?i-image.width:-1,y+1<image.height?i+image.width:-1])if(n>=0&&!seen[n]&&image.pixels[n*4+3]>16){seen[n]=1;stack.push(n);}}
  if(indices.length>1000)pieces.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,indices});
 }
 pieces.sort((a,b)=>rows===1?a.x-b.x:Math.floor((a.y+a.h/2)/(image.height/rows))-Math.floor((b.y+b.h/2)/(image.height/rows))||a.x-b.x);
 if(pieces.length!==columns*rows)throw Error(`${name}: ${pieces.length} separate silhouettes required ${columns*rows}`);
 return{image,pieces,name};
}

const names=['guard','block','jab-windup','jab','cross-windup','cross','cross-windup-body','cross-body','block-body','hit','hit-body','fall','down','rise','dodge','surrender'];
// Measured anatomical landmarks per silhouette; glove is its visible striking knuckle.
const points=[
 [.50,.17,.50,.37], [.50,.17,.50,.39], [.43,.17,.48,.39,.88,.26], [.37,.17,.44,.40,.88,.18],
 [.61,.17,.55,.41,.26,.22], [.53,.17,.52,.42,.13,.23], [.66,.24,.55,.43,.50,.52], [.59,.21,.52,.43,.68,.56],
 [.50,.17,.50,.43], [.45,.17,.52,.39], [.59,.24,.53,.45], [.45,.21,.48,.42],
 [.40,.21,.47,.46], [.40,.21,.48,.43], [.29,.18,.44,.37], [.51,.17,.52,.42],
];
for(const id of ['dyrex','louisto']){
 const {image,pieces}=clean(id,4,4),scale=512/pieces[0].h;
 const dir=path.join(root,'public/assets/sprites/opponents',id);fs.mkdirSync(dir,{recursive:true});
 const atlas={version:1,identity:id,canvas:{width:640,height:640},anchor:{x:320,y:624},artHeight:512,physicalScale:scale,poses:{}};
 pieces.forEach((box,index)=>{
  const name=names[index],p=points[index],pixels=Buffer.alloc(image.pixels.length);
  for(const i of box.indices)image.pixels.copy(pixels,i*4,i*4,i*4+4);
  const relative=(x,y)=>[box.x+x*box.w,box.y+y*box.h];
  const feet=box.indices.filter(i=>Math.floor(i/image.width)>=box.y+box.h-12).map(i=>i%image.width);
  const sourceCenter=['down','fall','rise'].includes(name)?box.x+box.w/2:(Math.min(...feet)+Math.max(...feet))/2;
  atlas.poses[`${id}-${name}`]={...extract({...image,pixels},box,`opponents/${id}/${id}-${name}.png`,{width:640,canvasHeight:640,baseline:624,center:320,scale,sourceCenter,landmarks:{head:relative(p[0],p[1]),body:relative(p[2],p[3]),...(p.length>4?{glove:relative(p[4],p[5])}:{})}}),sourceFile:`${ref}/${id}-alpha.png`,physicalScale:scale};
 });
 fs.writeFileSync(path.join(dir,'fighters.json'),JSON.stringify(atlas,null,2)+'\n');
 console.log(`${id}: ${pieces.length} complete RGBA poses, standing scale ${scale.toFixed(4)}`);
}
