// Extract and align generated RGBA artwork. No painting or remote calls here.
import fs from 'node:fs';
import { readPng, bounds, extract } from './sprite-png.mjs';
const dir = 'references/characters/sparring-v2/';
const r = readPng(`${dir}remi-outfit-alpha.png`);
const p = readPng(`${dir}player-outfit-alpha.png`);
const rt = readPng(`${dir}remi-transitions-alpha.png`);
const pt = readPng(`${dir}player-transitions-alpha.png`);
const cell=(x,y,w,h)=>({x,y,w,h});
const rg=cell(0,0,380,765),pg=cell(0,0,370,765);
const rs=512/bounds(r,rg).h, ps=512/bounds(p,pg).h;
const rts=512/483,pts=512/428;
const frames=[
 ['remi','guard',r,rg,rs,183,{head:[183,187]}],
 ['remi','cross',r,cell(385,0,365,765),rs,555,{head:[556,189],contact:[640,215]}],
 ['remi','block',r,cell(0,770,370,678),rs,183,{head:[180,883]}],
 ['remi','hit',r,cell(370,770,390,678),rs,556,{head:[605,899]}],
 ['remi','dodge',rt,cell(1024,512,512,512),rts,1255,{head:[1346,636]}],
 ['remi','jab-windup',rt,cell(0,0,512,512),rts,287,{head:[307,94],contact:[196,112]}],
 ['remi','cross-windup',rt,cell(512,0,512,512),rts,768,{head:[766,95],contact:[829,117]}],
 ['remi','jab-recover',rt,cell(1024,0,512,512),rts,1264,{head:[1276,96],contact:[1164,131]}],
 ['remi','cross-recover',rt,cell(0,512,512,512),rts,289,{head:[286,604],contact:[397,634]}],
 ['player','guard',p,pg,ps,188,{head:[187,169]}],
 ['player','jab',p,cell(378,0,372,765),ps,558,{head:[567,170],contact:[492,42]}],
 ['player','block',p,cell(0,768,370,680),ps,187,{head:[187,871]}],
 ['player','hit',p,cell(378,768,370,680),ps,554,{head:[486,881]}],
 ['player','dodge',pt,cell(1024,512,512,512),pts,1295,{head:[1219,676]}],
 ['player','jab-windup',pt,cell(0,0,512,512),pts,274,{head:[278,100],contact:[215,105]}],
 ['player','cross-windup',pt,cell(512,0,512,512),pts,773,{head:[777,100],contact:[829,130]}],
 ['player','jab-recover',pt,cell(1024,0,512,512),pts,1271,{head:[1282,102],contact:[1246,49]}],
];
const metadata={version:2,canvas:{width:384,height:640},anchor:{x:192,y:624},artHeight:512,poses:{}};
fs.mkdirSync('public/assets/sprites/sparring-v2',{recursive:true});
for(const[who,pose,sheet,region,scale,sourceCenter,landmarks]of frames){
 const filename=`${who}-${pose}.png`;
 const result=extract(sheet,region,`sparring-v2/${filename}`,{scale,sourceCenter,landmarks});
 result.file=filename;
 if(result.contact) result.glove=result.contact;
 metadata.poses[`${who}-${pose}`]=result;
}
// Symmetric equipment makes mirrored opposite punches exact identity matches.
// This also avoids using right-edge-clipped poses from the generated sheets.
for(const[target,source]of [['remi-jab','remi-cross'],['player-cross','player-jab'],['player-cross-recover','player-jab-recover']]){
 fs.copyFileSync(`public/assets/sprites/sparring-v2/${source}.png`,`public/assets/sprites/sparring-v2/${target}.png`);
 metadata.poses[target]={...structuredClone(metadata.poses[source]),file:`${target}.png`,mirror:true,mirroredFrom:source};
}
fs.writeFileSync('public/assets/sprites/sparring-v2/fighters.json',JSON.stringify(metadata,null,2)+'\n');
console.log(Object.entries(metadata.poses).map(([pose,p])=>({pose,bounds:p.bounds,head:p.head,contact:p.contact,mirror:p.mirror})));
