// Mechanical alpha cleanup and extraction of imagegen clothing edits only.
// Athlete geometry, shading and anatomy come entirely from generated artwork.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {readPng,writePng,extract} from './sprite-png.mjs';
const root=path.resolve(import.meta.dirname,'..'), dir=path.join(root,'public/assets/sprites/competition-v2');fs.mkdirSync(dir,{recursive:true});
const ref='references/characters/competition-v2';
const original=Object.assign({},...['sparring-v2/fighters.json','sparring-hook/fighters.json','body-training/sparring.json','knockdown/fighters.json'].map(file=>JSON.parse(fs.readFileSync(path.join(root,'public/assets/sprites',file))).poses));
// Source PNGs from imagegen may be RGB; decode without an art/editing dependency.
function sourcePng(file){const bytes=fs.readFileSync(file);if(bytes[25]===6)return readPng(file);if(bytes[24]!==8||bytes[25]!==2)throw Error('Expected RGB/RGBA source PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),parts=[];for(let at=8;at<bytes.length;){const n=bytes.readUInt32BE(at);if(bytes.toString('ascii',at+4,at+8)==='IDAT')parts.push(bytes.subarray(at+8,at+8+n));at+=n+12;}
 const raw=zlib.inflateSync(Buffer.concat(parts)),rgb=Buffer.alloc(width*height*3),pixels=Buffer.alloc(width*height*4);let at=0;
 const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[at++];for(let x=0;x<width*3;x++){const i=y*width*3+x,a=x>=3?rgb[i-3]:0,b=y?rgb[i-width*3]:0,c=y&&x>=3?rgb[i-width*3-3]:0;rgb[i]=(raw[at++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}}
 for(let i=0;i<width*height;i++){rgb.copy(pixels,i*4,i*3,i*3+3);pixels[i*4+3]=255;}return{width,height,pixels};
}
function clean(name,columns,rows){
 const image=sourcePng(path.join(root,ref,`${name}-source.png`));
 for(let i=0;i<image.pixels.length;i+=4){const r=image.pixels[i],g=image.pixels[i+1],b=image.pixels[i+2];if(g>55&&g>r*1.25&&g>b*1.25)image.pixels.fill(0,i,i+4);}
 writePng(path.join(root,ref,`${name}-alpha.png`),image.width,image.height,image.pixels);
 const seen=new Uint8Array(image.width*image.height),pieces=[];
 for(let start=0;start<seen.length;start++){if(seen[start]||image.pixels[start*4+3]<=16)continue;const stack=[start],indices=[];seen[start]=1;let x0=Infinity,y0=Infinity,x1=0,y1=0;
  while(stack.length){const i=stack.pop(),x=i%image.width,y=Math.floor(i/image.width);indices.push(i);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const n of [x?i-1:-1,x+1<image.width?i+1:-1,y?i-image.width:-1,y+1<image.height?i+image.width:-1])if(n>=0&&!seen[n]&&image.pixels[n*4+3]>16){seen[n]=1;stack.push(n);}}
  if(indices.length>1000)pieces.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,indices});
 }
 pieces.sort((a,b)=>rows===1?a.x-b.x:Math.floor((a.y+a.h/2)/(image.height/rows))-Math.floor((b.y+b.h/2)/(image.height/rows))||a.x-b.x);
 if(pieces.length!==columns*rows)throw Error(`${name}: ${pieces.length} separate silhouettes required ${columns*rows}`);
 return{image,pieces,name};
}
const groups={base:clean('base',3,2),transitions:clean('transitions',3,2),body:clean('body',4,2),floor:clean('floor',4,1),hooks:clean('hooks',3,1)};
const atlas={version:2,identity:'competition',canvas:{width:640,height:640},anchor:{x:320,y:624},artHeight:512,note:'Clothing edits of the validated sparring athlete; uniform scaling, no width distortion. Complete generated transitions and floor poses.',poses:{}};
const scales={base:512/groups.base.pieces[0].h,transitions:512/groups.transitions.pieces[0].h,body:509/groups.body.pieces[0].h,floor:512/groups.floor.pieces[0].h,hooks:512/groups.hooks.pieces[0].h};
function pose(group,index,name,points=null){const{image,pieces}=groups[group],box=pieces[index],old=original[`player-${name}`],scale=scales[group];
 const pixels=Buffer.alloc(image.pixels.length);for(const i of box.indices)image.pixels.copy(pixels,i*4,i*4,i*4+4);
 const landmarks={};for(const key of ['head','body','glove'])if(old[key]){const p=old[key],b=old.bounds;landmarks[key]=[box.x+(p.x-b.x)/b.width*box.w,box.y+(p.y-b.y)/b.height*box.h];}
 if(points)for(const[key,p]of Object.entries(points))landmarks[key]=[box.x+p[0]*box.w,box.y+p[1]*box.h];
 if(!landmarks.body)landmarks.body=[box.x+box.w*.5,box.y+box.h*.37];
 const feet=box.indices.filter(i=>Math.floor(i/image.width)>=box.y+box.h-12).map(i=>i%image.width);
 const sourceCenter=['fall','down','rise'].includes(name)?box.x+box.w/2:(Math.min(...feet)+Math.max(...feet))/2;
 const spec=extract({...image,pixels},box,`competition-v2/competition-${name}.png`,{width:640,canvasHeight:640,baseline:624,center:320,scale,sourceCenter,landmarks});
 atlas.poses[`competition-${name}`]={...spec,sourceFile:`${ref}/${group}-alpha.png`,physicalScale:scale};
}
function clone(from,to,mirror=false){fs.copyFileSync(path.join(dir,`competition-${from}.png`),path.join(dir,`competition-${to}.png`));atlas.poses[`competition-${to}`]={...atlas.poses[`competition-${from}`],file:`competition-v2/competition-${to}.png`,reusedFrom:from,...(mirror?{mirror:true}:{})};}
pose('base',0,'guard');pose('base',1,'jab');clone('jab','cross',true);pose('base',3,'block');pose('base',4,'hit');
pose('transitions',5,'dodge');pose('transitions',0,'jab-windup');pose('transitions',1,'cross-windup');pose('transitions',2,'jab-recover');clone('jab-recover','cross-recover',true);
for(const[index,name]of ['jab-windup-body','jab-body','cross-windup-body','cross-body','hook-windup-body','hook-body','block-body','hit-body'].entries())pose('body',index,name,name==='jab-body'?{glove:[.30,.15]}:null);
for(const action of ['jab','cross','hook'])clone(`${action}-windup-body`,`${action}-recover-body`);
for(const[index,name]of ['fall','down','rise'].entries())pose('floor',index+1,name);
for(const[index,name]of ['hook-windup','hook-recover','hook'].entries())pose('hooks',index,name);
fs.writeFileSync(path.join(dir,'fighters.json'),JSON.stringify(atlas,null,2)+'\n');
console.log(`Competition: ${Object.keys(atlas.poses).length} complete poses`,scales);
