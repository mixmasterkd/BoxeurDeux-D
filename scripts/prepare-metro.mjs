// Technical resizing/cropping only. Artwork is preserved from built-in image generation.
import fs from 'node:fs';
import path from 'node:path';
import { readOpaquePng, writePng, fit, crop } from './chapter-png.mjs';
const root=path.resolve(import.meta.dirname,'..'), source=path.join(root,'references/world/metro'), output=path.join(root,'public/assets/metro');
fs.mkdirSync(output,{recursive:true});
for(const name of ['train','airport','train-closed']){
  let image=fit(readOpaquePng(path.join(source,`${name}-source.png`)),1280,720);
  if(name==='train-closed')image=crop(image,546,54,191,252);
  writePng(path.join(output,name==='train-closed'?'train-doors.png':`${name}.png`),image.width,image.height,image.pixels);
}
