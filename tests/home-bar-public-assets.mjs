import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=process.env.HOME_URL??'https://mixmasterkd.github.io/BoxeurDeux-D/';
const output=process.env.HOME_ASSET_OUTPUT??'outputs/verification/home-bar/public';
const index=await fs.readFile('dist/index.html','utf8');
const bundles=[...index.matchAll(/(?:src|href)="\.\/([^" ]+\.(?:js|css))"/g)].map(m=>m[1]);
const files=['index.html',...bundles,'assets/world/neighborhood-east-open.png',...(await fs.readdir('dist/assets/home')).map(f=>`assets/home/${f}`),...(await fs.readdir('dist/assets/bar')).map(f=>`assets/bar/${f}`)];
const report={date:new Date().toISOString(),base,files:[],errors:[]};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(let i=0;i<files.length;i+=6)await Promise.all(files.slice(i,i+6).map(async file=>{
 try{
  const local=await fs.readFile(path.join('dist',file));
  const response=await fetch(new URL(file,base),{cache:'no-store'});
  assert.equal(response.status,200,`${file}: HTTP200 attendu`);
  const remote=Buffer.from(await response.arrayBuffer());
  assert.equal(hash(remote),hash(local),`${file}: les octets doivent correspondre à dist`);
  report.files.push({file,bytes:remote.length,sha256:hash(remote),identical:true});
 }catch(error){report.errors.push({file,message:error.message});}
}));
report.files.sort((a,b)=>a.file.localeCompare(b.file));
await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'assets.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:report.files.length,errors:report.errors},null,2));
if(report.errors.length)process.exitCode=1;
