// Technical cropping/resizing only; all art is generated with built-in ImageGen.
import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { readPng, writePng } from './sprite-png.mjs';
const root = path.resolve(import.meta.dirname, '..');
function readOpaquePng(filename) {
  const bytes = fs.readFileSync(filename);
  if (bytes[25] === 6) return readPng(filename);
  if (bytes[24] !== 8 || bytes[25] !== 2 || bytes[28] !== 0) throw new Error('Expected an 8-bit RGB or RGBA non-interlaced PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), parts = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') parts.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(parts)), stride = width * 3;
  const rgb = Buffer.alloc(width * height * 3), pixels = Buffer.alloc(width * height * 4, 255);
  let cursor = 0;
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++];
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x, a = x >= 3 ? rgb[index - 3] : 0, b = y ? rgb[index - stride] : 0, c = y && x >= 3 ? rgb[index - stride - 3] : 0;
      rgb[index] = (raw[cursor++] + (filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c))) & 255;
    }
  }
  for (let i = 0; i < width * height; i++) rgb.copy(pixels, i * 4, i * 3, i * 3 + 3);
  return { width, height, pixels };
}


const reference = path.join(root,'references/bar-street');
const outputs=[];
function exportCrop(source,destination,width,height,crop) {
 const image=readOpaquePng(path.join(reference,source));
 const scale=Math.max(width/crop.width,height/crop.height);
 const pixels=Buffer.alloc(width*height*4);
 for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
  const sx=Math.min(image.width-1,Math.floor(crop.x+(x+.5)/scale));
  const sy=Math.min(image.height-1,Math.floor(crop.y+(y+.5)/scale));
  image.pixels.copy(pixels,(y*width+x)*4,(sy*image.width+sx)*4,(sy*image.width+sx)*4+4);
 }
 writePng(path.join(root,destination),width,height,pixels);
 outputs.push({source,destination,width,height,sourceWidth:image.width,sourceHeight:image.height,crop,scale});
}
const street=readOpaquePng(path.join(reference,'street-source.png'));
const scale=Math.max(1920/street.width,1080/street.height);
exportCrop('street-source.png','public/assets/bar/street.png',1920,1080,{x:(street.width-1920/scale)/2,y:(street.height-1080/scale)/2,width:1920/scale,height:1080/scale});
exportCrop('east-open-source.png','public/assets/world/neighborhood-east-open.png',146,240,{x:1440,y:350,width:146,height:240});
fs.writeFileSync(path.join(reference,'world-preparation.json'),JSON.stringify({method:'Uniform nearest-neighbor resizing and exact crop; no painting or stretching.',outputs},null,2)+'\n');
console.log(JSON.stringify(outputs,null,2));
