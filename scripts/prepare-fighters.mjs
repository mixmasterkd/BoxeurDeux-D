// Technical PNG atlas extraction only; all artwork comes from the preserved imagegen sources.
// No image library, remote service, or build-time dependency is required.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const paeth = (a,b,c) => { const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c); return pa<=pb && pa<=pc?a:pb<=pc?b:c; };
function readPng(filename) {
  const bytes=fs.readFileSync(filename); const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(bytes[24]!==8 || bytes[25]!==6) throw new Error('Expected 8-bit RGBA PNG');
  let offset=8; const parts=[];
  while(offset<bytes.length) { const n=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8); if(type==='IDAT')parts.push(bytes.subarray(offset+8,offset+8+n)); offset+=12+n; }
  const raw=zlib.inflateSync(Buffer.concat(parts)); const pixels=Buffer.alloc(width*height*4); let i=0;
  for(let y=0;y<height;y++){const filter=raw[i++];for(let x=0;x<width*4;x++){const at=y*width*4+x,a=x>=4?pixels[at-4]:0,b=y?pixels[at-width*4]:0,c=y&&x>=4?pixels[at-width*4-4]:0;pixels[at]=(raw[i++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}}
  return {width,height,pixels};
}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){const name=Buffer.from(type);const content=Buffer.concat([name,data]);let crc=0xffffffff;for(const byte of content)crc=crcTable[(crc^byte)&255]^(crc>>>8);const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);content.copy(out,4);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
function writePng(filename,width,height,pixels){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);fs.writeFileSync(filename,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]));}
function bounds(image,cell){let x0=Infinity,y0=Infinity,x1=-1,y1=-1;for(let y=cell.y;y<cell.y+cell.h;y++)for(let x=cell.x;x<cell.x+cell.w;x++){if(image.pixels[(y*image.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
function extract(image,cell,filename,{height=512,scale:fixedScale,baseline=624,center=192,width=384,canvasHeight=640,sourceCenter,landmarks={}}={}){
  const box=bounds(image,cell);const scale=fixedScale??height/box.h;const w=Math.round(box.w*scale),h=Math.round(box.h*scale);const x0=Math.round(sourceCenter===undefined?center-w/2:center+(box.x-sourceCenter)*scale),y0=baseline-h;const pixels=Buffer.alloc(width*canvasHeight*4);
  if(x0<0||y0<0||x0+w>width||baseline>canvasHeight)throw new Error(`Sprite does not fit ${filename}: ${w}x${h}`);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=box.x+Math.min(box.w-1,Math.floor(x/scale)),sy=box.y+Math.min(box.h-1,Math.floor(y/scale));const from=(sy*image.width+sx)*4,to=((y+y0)*width+x+x0)*4;
    // Drop alpha <= 16 matte residues (source red segmentation pixels are alpha 1/2).
    // Preserve visible generated colors and alpha; no character artwork is redrawn.
    if(image.pixels[from+3]>16)image.pixels.copy(pixels,to,from,from+4);
  }
  writePng(path.join(root,'public/assets/sprites',filename),width,canvasHeight,pixels);
  const points=Object.fromEntries(Object.entries(landmarks).map(([key,p])=>[key,{x:Math.round(x0+(p[0]-box.x)*scale),y:Math.round(y0+(p[1]-box.y)*scale)}]));
  return {file:filename,width,height:canvasHeight,anchor:{x:center,y:baseline},bounds:{x:x0,y:y0,width:w,height:h},sourceBounds:box,...points,...(points.glove?{contact:points.glove}:{})};
}
const source=readPng(path.join(root,'references/characters/fighters-guards-source.png'));
const remi=extract(source,{x:0,y:0,w:627,h:1254},'remi-guard.png');
const player=extract(source,{x:627,y:0,w:627,h:1254},'player-guard.png');
const metadata={canvas:{width:384,height:640},anchor:{x:192,y:624},artHeight:512,poses:{'remi-guard':remi,'player-guard':player}};
// Animation source sheets were separately checked and alpha-corrected through imagegen.
// Preserve each actor's fixed anatomical scale; raised fists must not shrink the entire body.
const remiSheet=readPng(path.join(root,'references/characters/remi-poses-alpha.png'));
const playerSheet=readPng(path.join(root,'references/characters/player-poses-alpha.png'));
const remiScale=512/bounds(remiSheet,{x:0,y:0,w:360,h:740}).h;
const playerScale=512/bounds(playerSheet,{x:0,y:0,w:360,h:740}).h;
const poses=[
  ['remi','cross',remiSheet,{x:376,y:0,w:344,h:740},remiScale,550,{glove:[628,207],head:[548,149]}],
  ['remi','jab',remiSheet,{x:730,y:0,w:356,h:740},remiScale,913,{glove:[860,224],head:[928,152]}],
  ['remi','block',remiSheet,{x:0,y:746,w:354,h:702},remiScale,183,{head:[178,822]}],
  ['remi','hit',remiSheet,{x:354,y:746,w:381,h:702},remiScale,547,{head:[595,839]}],
  ['remi','dodge',remiSheet,{x:737,y:746,w:349,h:702},remiScale,913,{head:[993,888]}],
  ['player','jab',playerSheet,{x:369,y:0,w:351,h:740},playerScale,541,{glove:[475,40],head:[552,160]}],
  ['player','cross',playerSheet,{x:730,y:0,w:356,h:740},playerScale,905,{glove:[943,40],head:[885,160]}],
  ['player','block',playerSheet,{x:0,y:746,w:360,h:702},playerScale,180,{head:[180,830]}],
  ['player','hit',playerSheet,{x:367,y:746,w:353,h:702},playerScale,541,{head:[474,860]}],
  ['player','dodge',playerSheet,{x:730,y:746,w:356,h:702},playerScale,905,{head:[810,900]}],
];
for(const [actor,pose,sheet,cell,scale,sourceCenter,landmarks] of poses)metadata.poses[`${actor}-${pose}`]=extract(sheet,cell,`${actor}-${pose}.png`,{scale,sourceCenter,landmarks});
metadata.poses['remi-guard'].head={x:187,y:160};
metadata.poses['player-guard'].head={x:191,y:151};
fs.writeFileSync(path.join(root,'public/assets/sprites/fighters.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata,null,2));
