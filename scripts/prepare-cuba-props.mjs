// Technical crops and nearest-neighbour scaling of preserved generated art.
import fs from 'node:fs';
import { readPng, bounds, writePng } from './sprite-png.mjs';

function prepare(source, destination, width, height, artHeight, baseline) {
  const image=readPng(source), box=bounds(image,{x:0,y:0,w:image.width,h:image.height});
  const scale=artHeight/box.h, w=Math.round(box.w*scale), h=Math.round(box.h*scale);
  const x0=Math.round((width-w)/2), y0=baseline-h;
  if(x0<0 || y0<0 || y0+h>height)throw Error(`Asset does not fit: ${source}`);
  const pixels=Buffer.alloc(width*height*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const from=((box.y+Math.min(box.h-1,Math.floor(y/scale)))*image.width+box.x+Math.min(box.w-1,Math.floor(x/scale)))*4;
    if(image.pixels[from+3]>16)image.pixels.copy(pixels,((y+y0)*width+x+x0)*4,from,from+4);
  }
  writePng(destination,width,height,pixels);
  console.log(destination,{width,height,bounds:{x:x0,y:y0,w,h}});
}
fs.mkdirSync('public/assets/cuba',{recursive:true});
prepare('references/cuba/travel-kiosk-source.png','public/assets/cuba/travel-kiosk.png',196,224,220,222);
if(fs.existsSync('references/cuba/tire-bag-clean-source.png'))
  prepare('references/cuba/tire-bag-clean-source.png','public/assets/cuba/tire-bag.png',160,530,510,520);
