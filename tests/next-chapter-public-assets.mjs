// Verify the deployed bytes independently of browser state and Vite's cache.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import https from 'node:https';
import {createHash} from 'node:crypto';

const base=process.env.SPARRING_URL??'https://mixmasterkd.github.io/BoxeurDeux-D/';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={date:new Date().toISOString(),url:base,files:[],errors:[]};
const get=url=>new Promise((resolve,reject)=>{
  const request=https.get(url,{family:4,headers:{'User-Agent':'BoxeurDeux-D deployment check'}},response=>{
    const chunks=[];response.on('data',chunk=>chunks.push(chunk));
    response.on('error',reject);response.on('end',()=>resolve({status:response.statusCode,bytes:Buffer.concat(chunks)}));
  });
  request.on('error',reject);request.setTimeout(30000,()=>request.destroy(new Error(`Timed out: ${url}`)));
});
const index=await fs.readFile('dist/index.html','utf8');
const bundles=[...index.matchAll(/(?:src|href)="[^"]*?(assets\/[^" ]+\.(?:js|css))"/g)].map(match=>match[1]);
const files=['index.html',...bundles];
for(const folder of ['assets/cuba','assets/sprites/opponents'])
  for(const file of await fs.readdir(`dist/${folder}`,{recursive:true}))if(/\.(png|json)$/.test(file))files.push(`${folder}/${file}`);
for(let at=0;at<files.length;at+=4)await Promise.all(files.slice(at,at+4).map(async file=>{
  try{
    const [local,remote]=await Promise.all([fs.readFile(`dist/${file}`),get(new URL(file,base))]);
    const result={file,status:remote.status,bytes:remote.bytes.length,sha256:hash(remote.bytes),identical:local.equals(remote.bytes)};
    report.files.push(result);if(result.status!==200||!result.identical)report.errors.push(file);
  }catch(error){report.errors.push(`${file}: ${error.message}`);}
}));
report.files.sort((a,b)=>a.file.localeCompare(b.file));
await fs.writeFile('docs/next-public-assets-results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:report.files.length,errors:report.errors},null,2));
assert.deepEqual(report.errors,[]);
