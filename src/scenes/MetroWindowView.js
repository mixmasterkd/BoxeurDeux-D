import { TrainWindowMotion } from '../game/TrainWindowMotion.js';

// Glazing only. These bands leave the original curved frames, hanging grips
// and vertical pole visible and fixed in front of the moving scenery.
const SIDES=[
  [135,86,8,22],[161,86,166,22],[351,86,14,22],
  [135,108,230,73],[138,181,224,6],[143,187,214,3],
  [829,86,58,22],[901,86,29,22],[952,86,168,22],[1141,86,6,22],
  [829,108,58,74],[901,108,246,74],
  [833,182,54,6],[901,182,242,6],[838,188,49,3],[901,188,237,3],
];
function clipped(rect,left,right){const [x,y,w,h]=rect,a=Math.max(x,left),b=Math.min(x+w,right);return b>a?[a,y,b-a,h]:null;}
function doorWindows(amount){
  if(amount<=0)return [];
  const offset=96*(1-amount),otherOffset=95*(1-amount);
  const windows=[
    {x:562-offset,left:546,right:642-offset},
    {x:658+otherOffset,left:642+otherOffset,right:737},
  ];
  return windows.flatMap(({x,left,right})=>[
    [x+7,77,39,5],[x+3,82,48,6],[x,88,54,105],[x+3,193,48,8],[x+8,201,38,5],
  ].map(r=>clipped(r,left,right)).filter(Boolean));
}
// Small tiles are clipped by their own bounds. No renderer-specific masks or
// filters: the same glazing works under Phaser 4 WebGL and Canvas.
function renderTiles(tiles,rects,offset,band){
  for(let i=0;i<tiles.length;i++){
    const sprite=tiles[i],source=rects[i],r=source&&(band?clipped(source,band.left,band.right):source);
    sprite.setVisible(Boolean(r));if(!r)continue;
    const [x,y,w,h]=r;
    sprite.setPosition(x,y).setSize(w,h);
    sprite.tilePositionX=offset+x;sprite.tilePositionY=y-70;
  }
}

export class MetroWindowView {
  constructor(scene){
    this.motion=new TrainWindowMotion();this.layers=[];
    for(const [kind,depth,count]of [['sides',1,SIDES.length],['doors',351,10]]){
      const layer={kind};
      for(const [name,key,extraDepth]of [['station','metro-window-platform',0],['tunnel','metro-window-tunnel',1]]){
        layer[name]={tiles:Array.from({length:count},()=>scene.add.tileSprite(0,0,1,1,key,'__BASE').setOrigin(0).setDepth(depth+extraDepth).setVisible(false))};
      }
      this.layers.push(layer);
    }
  }
  update(train,doorAmount){
    this.frame=this.motion.update(train);
    const signature=`${this.frame.offset}:${this.frame.distance}:${this.frame.direction}:${this.frame.tunnel!==null}:${doorAmount}`;
    if(signature===this.signature)return;this.signature=signature;
    for(const layer of this.layers){
      const rects=layer.kind==='sides'?SIDES:doorWindows(doorAmount);
      renderTiles(layer.station.tiles,rects,this.frame.offset);
      renderTiles(layer.tunnel.tiles,rects,this.frame.offset,this.frame.tunnel??{left:0,right:0});
    }
  }
}
