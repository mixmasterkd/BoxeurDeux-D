// Technical nearest-neighbor fit of original integrated-imagegen artwork.
// No painted/retouched pixels. Original source files remain reproducible.
import fs from 'node:fs';
import path from 'node:path';
import {readOpaquePng,fit,writePng} from './chapter-png.mjs';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'references/mexico/asset-manifest.json'),'utf8'));
for(const item of manifest){
  const directory=item.group==='mexico'?'references/mexico':'references/hotel-gold';
  const source=path.join(root,directory,`${item.name}-source.png`);
  fs.mkdirSync(path.dirname(source),{recursive:true});
  if(!fs.existsSync(source))fs.copyFileSync(item.path,source);
  const image=fit(readOpaquePng(source),item.w,item.h);
  const output=path.join(root,`public/assets/${item.group}/${item.name}.png`);
  fs.mkdirSync(path.dirname(output),{recursive:true});writePng(output,image.width,image.height,image.pixels);
  console.log(`${item.group}/${item.name}: ${image.width} × ${image.height}`);
}
