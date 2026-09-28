import { GymWorld } from './GymWorld.js';
import { doorway, markDoors } from './DoorTravel.js';

export const CASINO_ISLAND_PLACE = 'casino-island';
export const CASINO_ISLAND_SPAWN = Object.freeze({scene:CASINO_ISLAND_PLACE,x:2770,y:800,facing:'left'});
export const CASINO_ISLAND_RETURN = Object.freeze({scene:CASINO_ISLAND_PLACE,x:1250,y:915,facing:'down'});
export const CASINO_MAIN_ISLAND_RETURN = Object.freeze({scene:'marathon-island',x:125,y:1335,facing:'right'});
export const CASINO_BUILDING = Object.freeze({x:1198,y:840,width:900});

// The island painting is 1672 × 941; gameplay keeps the same world scale as
// the park. The paving's outline includes the bridge but excludes the water,
// railings, planted shoreline and the steps beside the benches.
const point=([x,y])=>({x:x*2880/1672,y:y*1620/941});
export const CASINO_ISLAND_PATH = Object.freeze([
 [442,175],[838,175],[838,230],[968,230],[968,340],[1040,400],
 [1215,410],[1215,440],[1672,440],[1672,487],[1215,487],[1215,505],
 [1040,510],[1000,575],[980,635],[890,640],[890,685],[477,685],
 [477,640],[342,640],[342,580],[275,580],[275,305],[340,305],
 [340,230],[442,230],
].map(point));
const rect=(id,x,y,width,height)=>({id,x,y,width,height});
export const CASINO_ISLAND_LAYOUT=markDoors({
 width:2880,height:1620,speed:225,actorScale:1.25,
 footprint:{halfWidth:16,halfHeight:8},
 bounds:{left:24,right:2856,top:260,bottom:1240},spawn:CASINO_ISLAND_SPAWN,
 obstacles:[
  rect('casino-building',830,405,720,240),rect('casino-base',748,645,900,157),
  rect('casino-front-west',748,800,447,42),rect('casino-front-east',1305,800,343,42),
  rect('north-bench',1185,278,162,38),
 ],
 stations:[
  {id:'casino',label:'Casino de Montréal · Entrée',x:1250,y:840,radius:92},
  {id:'bridge',label:'Petit pont · Métro et parc →',x:2820,y:800,radius:100},
 ],
 doors:[doorway('casino',1195,814,110,36,'up'),doorway('bridge',2798,766,58,66,'right')],
});

function insidePath(x,y){
 let inside=false;
 for(let i=0,j=CASINO_ISLAND_PATH.length-1;i<CASINO_ISLAND_PATH.length;j=i++){
  const a=CASINO_ISLAND_PATH[i],b=CASINO_ISLAND_PATH[j];
  if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}

export class CasinoIslandWorld extends GymWorld{
 constructor({position}={}){
  super({layout:CASINO_ISLAND_LAYOUT});this.place=CASINO_ISLAND_PLACE;this.restorePosition(position);
 }
 onPaving(position){
  const foot=this.layout.footprint;
  return [-foot.halfWidth,foot.halfWidth].every(dx=>[-foot.halfHeight,foot.halfHeight].every(dy=>insidePath(position.x+dx,position.y+dy)));
 }
 restorePosition(position){
  super.restorePosition(position);
  if(!this.onPaving(this.state))super.restorePosition(this.layout.spawn);
 }
 moveAxis(axis,amount){
  const previous=this.state[axis];super.moveAxis(axis,amount);
  if(!this.onPaving(this.state))this.state[axis]=previous;
 }
 location(){return{scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
}
