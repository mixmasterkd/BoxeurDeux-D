// Technical extraction of generated art; no anatomy or pixels are painted here.
import fs from 'node:fs';
import { readPng, bounds, extract } from './sprite-png.mjs';

const source = 'references/characters/opponents/lefeu/source.png';
const image = readPng(source), names = ['guard','block','jab-windup','jab','cross-windup','cross','cross-windup-body','cross-body','block-body','hit','hit-body','fall','down','rise','dodge','surrender'];
const points = [
  [.5,.15,.5,.40], [.5,.15,.5,.40], [.43,.16,.45,.4,.88,.25], [.42,.15,.45,.4,.9,.16],
  [.46,.17,.48,.40,.47,.50], [.62,.16,.60,.4,.12,.2], [.62,.19,.48,.4,.49,.48], [.6,.16,.44,.4,.82,.5],
  [.49,.15,.5,.44], [.33,.11,.47,.4], [.6,.2,.48,.46], [.36,.2,.37,.40],
  [.4,.18,.37,.5], [.57,.14,.43,.4], [.65,.13,.5,.4], [.47,.16,.49,.4],
];
const cells = names.map((_, i) => ({x:Math.floor(i%4*image.width/4),y:Math.floor(Math.floor(i/4)*image.height/4),w:Math.floor(image.width/4),h:Math.floor(image.height/4)}));
const boxes = cells.map(cell => bounds(image,cell));
const alpha = image.pixels.filter((v,i)=>i%4===3&&v===0).length/(image.width*image.height);
if(alpha<.35)throw Error('Real transparent sprite source is required');
const scale = 512/boxes[0].h, atlas={version:1,canvas:{width:640,height:640},anchor:{x:320,y:624},artHeight:512,identity:'lefeu',sourceFile:source,physicalScale:scale,poses:{}};
fs.mkdirSync('public/assets/sprites/opponents/lefeu',{recursive:true});
names.forEach((name,i)=>{
  const b=boxes[i], feet=[];
  for(let y=b.y+b.h-10;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(image.pixels[(y*image.width+x)*4+3]>16)feet.push(x);
  const center=['down','fall','rise'].includes(name)?b.x+b.w/2:(Math.min(...feet)+Math.max(...feet))/2;
  const p=points[i], rel=(x,y)=>[b.x+b.w*x,b.y+b.h*y];
  atlas.poses[`lefeu-${name}`]={...extract(image,cells[i],`opponents/lefeu/lefeu-${name}.png`,{width:640,canvasHeight:640,baseline:624,center:320,scale,sourceCenter:center,
    landmarks:{head:rel(p[0],p[1]),body:rel(p[2],p[3]),...(p.length>4?{glove:rel(p[4],p[5])}:{})}}),sourceFile:source,physicalScale:scale};
});
// A second generated sheet provides the bent-arm jab preparation. Only this
// silhouette is used; every contact/reaction keeps the original richer pixel art.
const preparationSource='references/characters/opponents/lefeu/clean-alpha-source.png';
const preparation=readPng(preparationSource),pw=Math.floor(preparation.width/4),ph=Math.floor(preparation.height/4);
const prepCell={x:pw*2,y:0,w:pw,h:ph},prepGuard=bounds(preparation,{x:0,y:0,w:pw,h:ph}),prepBox=bounds(preparation,prepCell),prepScale=512/prepGuard.h,prepFeet=[];
for(let y=prepBox.y+prepBox.h-10;y<prepBox.y+prepBox.h;y++)for(let x=prepBox.x;x<prepBox.x+prepBox.w;x++)if(preparation.pixels[(y*preparation.width+x)*4+3]>16)prepFeet.push(x);
const relPrep=(x,y)=>[prepBox.x+prepBox.w*x,prepBox.y+prepBox.h*y];
atlas.poses['lefeu-jab-windup']={...extract(preparation,prepCell,'opponents/lefeu/lefeu-jab-windup.png',{width:640,canvasHeight:640,baseline:624,center:320,scale:prepScale,sourceCenter:(Math.min(...prepFeet)+Math.max(...prepFeet))/2,
 landmarks:{head:relPrep(.54,.18),body:relPrep(.52,.40),glove:relPrep(.75,.28)}}),sourceFile:preparationSource,physicalScale:prepScale};
fs.writeFileSync('public/assets/sprites/opponents/lefeu/fighters.json',JSON.stringify(atlas,null,2)+'\n');
console.log(`Le Feu: ${names.length} RGBA poses, feet624, common scale${scale.toFixed(3)}, alpha${alpha.toFixed(3)}`);
