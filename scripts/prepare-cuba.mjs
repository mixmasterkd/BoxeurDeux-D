// Technical sizing only. Original art generated with the built-in image tool.
// Do not paint/reconstruct sprites or change the approved Montréal resources.
import {mkdirSync} from 'node:fs';
import {readOpaquePng,fit,writePng} from './chapter-png.mjs';
mkdirSync('public/assets/cuba',{recursive:true});
for(const name of ['village','home','gym','gym-training','beach','beach-ring']){
  const source=readOpaquePng(`references/cuba/${name}-source.png`);
  const [width,height]=['village','beach'].includes(name)?[1920,1080]:[1280,720];
  const final=fit(source,width,height);
  for(let at=3;at<final.pixels.length;at+=4)if(final.pixels[at]!==255)throw new Error(`${name}: backdrop must be opaque`);
  writePng(`public/assets/cuba/${name}.png`,width,height,final.pixels);
  console.log(`${name}: ${source.width}×${source.height} → ${width}×${height}, opaque, uniform nearest-neighbor sizing`);
}
