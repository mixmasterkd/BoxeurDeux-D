// Non-creative extraction and proportional nearest-neighbour sizing of ImageGen artwork.
import fs from 'node:fs';
import {readOpaquePng, crop, fit, writePng} from './chapter-png.mjs';
import {bounds} from './sprite-png.mjs';
fs.mkdirSync('public/assets/casino', {recursive:true});
const source=readOpaquePng('references/casino/karl-source.png');
for(let pose=0;pose<4;pose++){
  const b=bounds(source,{x:pose*source.width/4,y:0,w:source.width/4,h:source.height});
  const sprite=crop(source,b.x,b.y,b.w,b.h), height=192,width=Math.round(b.w*height/b.h);
  const scaled=fit(sprite,width,height),canvas=Buffer.alloc(112*200*4),left=Math.floor((112-width)/2);
  for(let y=0;y<height;y++)scaled.pixels.copy(canvas,((y+4)*112+left)*4,y*width*4,(y+1)*width*4);
  writePng(`public/assets/casino/karl-${pose}.png`,112,200,canvas);
}
fs.copyFileSync('public/assets/casino/karl-0.png','public/assets/casino/karl.png');
for(const name of ['lobby','tables','poker']){
  fs.copyFileSync(`references/casino/${name}-source.png`,`public/assets/casino/${name}.png`);
}
const exterior=readOpaquePng('references/casino/exterior-source.png');
const b=bounds(exterior,{x:0,y:0,w:exterior.width,h:exterior.height});
const building=crop(exterior,b.x,b.y,b.w,b.h);
writePng('public/assets/casino/exterior.png',building.width,building.height,building.pixels);
console.log('Casino: three rooms, building and four Karl poses extracted.');

const guests=readOpaquePng('references/casino/guests-source.png');
for(let row=0;row<2;row++)for(let person=0;person<4;person++){
 const x=Math.floor(person*guests.width/4),y=Math.floor(row*guests.height/2),w=Math.floor((person+1)*guests.width/4)-x,h=Math.floor((row+1)*guests.height/2)-y;
 const b=bounds(guests,{x,y,w,h}),height=192,width=Math.round(b.w*height/b.h),small=fit(crop(guests,b.x,b.y,b.w,b.h),width,height),canvas=Buffer.alloc(112*200*4),left=Math.floor((112-width)/2);
 if(left<0)throw new Error('Guest sprite does not fit');
 for(let sy=0;sy<height;sy++)small.pixels.copy(canvas,((sy+4)*112+left)*4,sy*width*4,(sy+1)*width*4);
 for(let i=3;i<canvas.length;i+=4)if(canvas[i]<=16)canvas[i]=0;
 writePng('public/assets/casino/guest-'+person+(row?'-talk':'')+'.png',112,200,canvas);
}
