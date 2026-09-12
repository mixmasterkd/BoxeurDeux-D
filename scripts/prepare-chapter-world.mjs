// Reproduce the technical sizing of approved generated art. Original files and
// exact generation instructions are kept in references/world/*.
import fs from 'node:fs';
import {readOpaquePng,writePng,fit} from './chapter-png.mjs';
for(const place of ['residential','commercial'])fs.copyFileSync(`references/world/${place}/source.png`,`public/assets/world/${place}.png`);
for(const place of ['clothing-shop','boxing-shop']){
 const image=fit(readOpaquePng(`references/world/${place}/source.png`),1280,720);
 writePng(`public/assets/world/${place}.png`,image.width,image.height,image.pixels);
}
const patch=fit(readOpaquePng('references/world/neighborhood-opening/edited.png'),100,209);
writePng('public/assets/world/neighborhood-west-open.png',patch.width,patch.height,patch.pixels);
