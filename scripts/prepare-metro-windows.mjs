// Only crop and uniformly size the generated panorama strips.
import {readOpaquePng,crop,fit,writePng} from './chapter-png.mjs';
const source=readOpaquePng('references/metro-motion/panoramas-source.png');
for(const [name,y,h]of [['platform',92,340],['tunnel',490,378]]){
  const result=fit(crop(source,0,y,1536,h),Math.round(1536*144/h),144);
  writePng(`public/assets/metro/window-${name}.png`,result.width,result.height,result.pixels);
}
