import {GymWorld} from './GymWorld.js';
import {doorway,markDoors} from './DoorTravel.js';
import {CUBA_PLACES,CUBA_HOME_SPAWN} from './NextChapterRules.js';

export {CUBA_PLACES};
export const CUBA_FIGHT_RETURN=Object.freeze({scene:'cuba-beach',x:1390,y:790,facing:'down'});
export const CUBA_ACTIVITY_RETURNS=Object.freeze({
  pads:{scene:'cuba-gym',x:780,y:455,facing:'up'},
  bag:{scene:'cuba-gym',x:285,y:300,facing:'up'},
  rope:{scene:'cuba-gym',x:225,y:525,facing:'up'},
});
const obstacle=(id,x,y,width,height)=>({id,x,y,width,height});
const station=(id,label,x,y,radius=85)=>({id,label,x,y,radius});
const interior=(name,extra)=>({name,width:1280,height:720,speed:225,actorScale:1.5,
  footprint:{halfWidth:20,halfHeight:10},bounds:{left:45,right:1235,top:205,bottom:707},
  spawn:{x:640,y:540,facing:'up'},obstacles:[],stations:[],doors:[doorway('exit',578,670,124,35,'down')],...extra});
const outdoor=(name,extra)=>({name,width:1920,height:1080,speed:260,actorScale:1.5,
  footprint:{halfWidth:20,halfHeight:10},bounds:{left:35,right:1905,top:303,bottom:1035},
  obstacles:[],stations:[],doors:[],...extra});

// The colliders follow the feet of furniture, rather than their tall artwork.
// Walkable door thresholds and arrivals remain independent from interaction E/A.
export const CUBA_LAYOUTS={
  'cuba-home':interior('La casa · Ton logement',{
    actorScale:2,footprint:{halfWidth:25,halfHeight:12},spawn:{...CUBA_HOME_SPAWN},
    bounds:{left:68,right:1212,top:195,bottom:707},
    obstacles:[obstacle('bed',888,175,231,267),obstacle('wardrobe',116,184,151,48),
      obstacle('table',89,315,174,159),obstacle('luggage',1120,204,62,128),
      obstacle('plant-left',51,498,101,79),obstacle('plant-right',1120,505,107,72),
      obstacle('front-left',25,583,529,120),obstacle('front-right',728,583,527,120)],
    stations:[station('bed','Ton lit · Le prochain jour',848,365,110),station('exit','Le village',640,675,65),
      station('wardrobe','Ta valise · Le séjour',291,260,85)],
  }),
  'cuba-gym':interior('Le gym · Boxeo',{
    obstacles:[obstacle('tire-left',150,218,69,27),obstacle('tire-bag',255,218,70,27),
      obstacle('tire-right',1065,198,70,26),obstacle('bench',45,273,50,129),
      obstacle('weights',840,180,146,30),obstacle('fredo',758,384,44,28),
      obstacle('front-left',20,570,538,135),obstacle('front-right',727,570,535,135)],
    stations:[station('pads','Fredo · Les pads',780,400,90),station('bag','Sac en pneus · Enchaînements',291,245,88),
      station('rope','Corde à danser',174,466,92),station('exit','Le village',640,675,65)],
  }),
  'cuba-village':outdoor('Le village · Cuba',{
    spawn:{x:430,y:390,facing:'down'},
    obstacles:[obstacle('bench-casa',210,305,118,27),obstacle('bench-gym',847,305,123,27),
      obstacle('travel-kiosk',287,620,280,232),obstacle('kiosk-plant',568,689,76,53),
      obstacle('arbor',36,605,235,181),obstacle('plaza-bottom-left',35,971,539,90),
      obstacle('plaza-bottom-right',1240,971,653,90),obstacle('palm-right',1490,853,55,180),
      obstacle('plaza-lamp',460,926,40,105),obstacle('east-wall-top',1800,303,105,100),
      obstacle('east-wall-bottom',1700,595,220,178)],
    stations:[station('home','La casa · Ton logement',430,323,80),station('gym','Le gym · Boxeo',1088,323,80),
      station('beach','La plage · Ring de Louisto',1878,520,85),station('flight','Retour à Montréal · Billet inclus',429,862,105)],
    doors:[doorway('home',382,307,98,35,'up'),doorway('gym',1033,307,110,35,'up'),doorway('beach',1870,425,35,157,'right')],
  }),
  'cuba-beach':outdoor('La plage · Le ring de Louisto',{
    bounds:{left:32,right:1888,top:285,bottom:1035},spawn:{x:115,y:525,facing:'right'},
    obstacles:[obstacle('rocks-west-top',0,270,230,200),obstacle('rocks-west-bottom',0,570,315,465),
      obstacle('boat',120,275,252,45),obstacle('chairs-north',450,274,211,34),
      obstacle('ring',1121,315,558,340),obstacle('ring-stairs',1345,650,100,70),
      obstacle('seats-left',1010,367,95,247),obstacle('seats-right',1684,369,100,248),
      obstacle('ring-bench',1540,625,126,68),obstacle('palm-bottom-left',345,954,384,90),
      obstacle('palm-bottom-right',1420,922,470,120)],
    stations:[station('village','Le village · La casa et le gym',58,525,95),station('fight','Ring · Louisto',1390,723,100)],
    doors:[doorway('village',38,472,45,112,'left'),doorway('fight',1328,716,142,27,'up')],
  }),
};
for(const layout of Object.values(CUBA_LAYOUTS))markDoors(layout);

export function cubaDoorDestination(place,id){
  if(place==='cuba-village')return {
    home:{place:'cuba-home',location:{x:640,y:610,facing:'up'}},
    gym:{place:'cuba-gym',location:{x:640,y:610,facing:'up'}},
    beach:{place:'cuba-beach',location:{x:115,y:525,facing:'right'}},
  }[id]??null;
  if(id==='exit'&&['cuba-home','cuba-gym'].includes(place))return {place:'cuba-village',location:{x:place==='cuba-home'?430:1088,y:395,facing:'down'}};
  if(place==='cuba-beach'&&id==='village')return {place:'cuba-village',location:{x:1800,y:520,facing:'left'}};
  return null;
}

export class CubaWorld extends GymWorld {
  constructor({place='cuba-home',position}={}){
    const selected=Object.hasOwn(CUBA_LAYOUTS,place)?place:'cuba-home';
    super({layout:CUBA_LAYOUTS[selected]});this.place=selected;
    if(position)this.restorePosition(position);this.getNearby();
  }
  location(){return {scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
}
