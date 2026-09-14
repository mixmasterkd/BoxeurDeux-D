// Reproducible uniform sizing of imagegen originals; original art stays intact.
import {readOpaquePng,writePng,fit} from './chapter-png.mjs';
import fs from 'node:fs';
const assets=[['laptop','laptop/device'],['platform','metro/platform'],['station','metro/train-at-station'],['hall','metro/concourse']];
for(const [source,target] of assets){
  fs.mkdirSync(`public/assets/${target.split('/')[0]}`,{recursive:true});
  const image=fit(readOpaquePng(`references/confort/comfort-${source}.png`),1280,720);
  writePng(`public/assets/${target}.png`,image.width,image.height,image.pixels);
}
