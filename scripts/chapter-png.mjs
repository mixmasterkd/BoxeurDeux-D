// Technical crop and uniform sizing of generated artwork; no painted pixels.
import fs from 'node:fs';
import { inflateSync } from 'node:zlib';
import { readPng, writePng } from './sprite-png.mjs';
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


export {readOpaquePng,writePng};
export function crop(image,x,y,width,height){const pixels=Buffer.alloc(width*height*4);for(let row=0;row<height;row++)image.pixels.copy(pixels,row*width*4,((row+y)*image.width+x)*4,((row+y)*image.width+x+width)*4);return{width,height,pixels};}
export function fit(image,width,height){const scale=Math.max(width/image.width,height/image.height),left=(image.width-width/scale)/2,top=(image.height-height/scale)/2,pixels=Buffer.alloc(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const sx=Math.floor(left+(x+.5)/scale),sy=Math.floor(top+(y+.5)/scale),at=(sy*image.width+sx)*4;image.pixels.copy(pixels,(y*width+x)*4,at,at+4);}return{width,height,pixels};}
