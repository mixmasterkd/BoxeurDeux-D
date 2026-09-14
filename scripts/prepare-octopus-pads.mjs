// Technical chroma extraction and common-scale atlas alignment only.
// The authored targets correspond to the GOLD CIRCLES, never a guessed hand.
import fs from 'node:fs';
import {readOpaquePng,writePng} from './chapter-png.mjs';
import {bounds,extract} from './sprite-png.mjs';
const source='references/characters/octopus-pads/atlas-chroma.png',image=readOpaquePng(source);
for(let i=0;i<image.pixels.length;i+=4){const [r,g,b]=image.pixels.subarray(i,i+3);if(g>r+18&&g>b+18)image.pixels.fill(0,i,i+4);}
const specs=[
  {name:'ready',cell:{x:0,y:0,w:561,h:701},center:310,left:[384,257],right:[238,256]},
  {name:'left',cell:{x:561,y:0,w:561,h:701},center:837,left:[897,145],right:[753,388]},
  {name:'right',cell:{x:0,y:701,w:561,h:701},center:305,left:[372,1045],right:[239,832]},
  {name:'sweep',cell:{x:561,y:701,w:561,h:701},center:889,left:[956,940],right:[613,837]},
];
const scale=512/Math.max(...specs.map(s=>bounds(image,s.cell).h));
const metadata={width:640,height:640,anchor:{x:320,y:624},artHeight:512,source,scale,identity:'The Octopus · tresses, barbe, tatouages et chandail au poulpe blanc; coach au Mexique.',poses:{}};
fs.mkdirSync('public/assets/sprites/octopus-pads',{recursive:true});
for(const spec of specs)metadata.poses[spec.name]=extract(image,spec.cell,`octopus-pads/${spec.name}.png`,{scale,baseline:624,center:320,width:640,canvasHeight:640,sourceCenter:spec.center,landmarks:{leftTarget:spec.left,rightTarget:spec.right}});
writePng('references/characters/octopus-pads/atlas-alpha.png',image.width,image.height,image.pixels);
fs.writeFileSync('public/assets/sprites/octopus-pads/coach.json',JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata,null,2));
