// Technical extraction and equal-foot normalization only. Artwork and alpha are generated.
import fs from 'node:fs';
import {readPng,writePng} from './sprite-png.mjs';
function cellBounds(image,cell){
 let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
 for(let y=cell.y;y<cell.y+cell.h;y++)for(let x=cell.x;x<cell.x+cell.w;x++)if(image.pixels[(y*image.width+x)*4+3]>48){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 if(maxX<0)throw Error('Empty sprite cell');return{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
}
if(fs.existsSync('references/hotel/coach-sheet.png')){
 const im=readPng('references/hotel/coach-sheet.png'),cw=Math.floor(im.width/2),ch=Math.floor(im.height/2);
 const names=['ready','left','right','sweep'],targets=[[[280,125],[420,125]],[[804,124],[982,125]],[[298,748],[468,749]],[[721,755],[1037,805]]];
 const meta={width:512,height:640,anchor:{x:256,y:624},artHeight:512,poses:{},method:'Generated alpha preserved. Four cells extracted, uniform height and foot-anchor normalization, nearest-neighbor.'};
 for(let i=0;i<4;i++){
   const b=cellBounds(im,{x:i%2*cw,y:Math.floor(i/2)*ch,w:cw,h:ch}),scale=512/b.h;
   let fl=Infinity,fr=-1;
   for(let y=b.y+b.h-35;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(im.pixels[(y*im.width+x)*4+3]>96){fl=Math.min(fl,x);fr=Math.max(fr,x);}
   const foot=(fl+fr)/2,out=Buffer.alloc(512*640*4);
   for(let y=112;y<624;y++)for(let x=0;x<512;x++){
     const sx=Math.floor(foot+(x-256+.5)/scale),sy=Math.floor(b.y+(y-112+.5)/scale);
     if(sx<b.x||sx>=b.x+b.w||sy<b.y||sy>=b.y+b.h)continue;
     im.pixels.copy(out,(y*512+x)*4,(sy*im.width+sx)*4,(sy*im.width+sx)*4+4);
   }
   const target=([x,y])=>({x:256+(x-foot)*scale,y:112+(y-b.y)*scale});
   meta.poses[names[i]]={sourceBounds:b,scale,foot,leftTarget:target(targets[i][0]),rightTarget:target(targets[i][1])};
   writePng(`public/assets/hotel/coach-${names[i]}.png`,512,640,out);
 }
 fs.writeFileSync('public/assets/hotel/coach.json',JSON.stringify(meta,null,2)+'\n');console.log('coach: four normalized alpha poses');
}
if(fs.existsSync('references/hotel/swimmer-sheet.png')){
 const im=readPng('references/hotel/swimmer-sheet.png'),cw=Math.floor(im.width/2),ch=Math.floor(im.height/2),meta={width:320,height:160,poses:[]};
 for(let i=0;i<4;i++){
   const b=cellBounds(im,{x:i%2*cw,y:Math.floor(i/2)*ch,w:cw,h:ch}),scale=Math.min(292/b.w,132/b.h),out=Buffer.alloc(320*160*4),w=b.w*scale,h=b.h*scale;
   for(let y=0;y<160;y++)for(let x=0;x<320;x++){
     const sx=Math.floor(b.x+(x-(320-w)/2)/scale),sy=Math.floor(b.y+(y-(160-h)/2)/scale);
     if(sx<b.x||sx>=b.x+b.w||sy<b.y||sy>=b.y+b.h)continue;
     im.pixels.copy(out,(y*320+x)*4,(sy*im.width+sx)*4,(sy*im.width+sx)*4+4);
   }
   writePng(`public/assets/hotel/swimmer-${i}.png`,320,160,out);meta.poses.push({sourceBounds:b,scale});
 }
 fs.writeFileSync('public/assets/hotel/swimmer.json',JSON.stringify(meta,null,2)+'\n');console.log('swimmer: four horizontal alpha poses');
}
