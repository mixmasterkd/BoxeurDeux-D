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

export { readPng, writePng, bounds, extract };
