import {GymWorld} from './GymWorld.js';
import {doorway,markDoors} from './DoorTravel.js';

export const MEXICO_HOME_SPAWN=Object.freeze({x:805,y:415,facing:'down'});
export const MEXICO_FIGHT_RETURN=Object.freeze({scene:'mexico-arena',x:960,y:760,facing:'up'});
export const MEXICO_SPAR_RETURN=Object.freeze({scene:'mexico-gym',x:740,y:640,facing:'up'});
export const MEXICO_PADS_RETURN=Object.freeze({scene:'mexico-gym',x:430,y:515,facing:'up'});
const obstacle=(id,x,y,width,height)=>({id,x,y,width,height});
const station=(id,label,x,y,radius=90)=>({id,label,x,y,radius});
const room=(name,extra)=>({name,width:1280,height:720,speed:225,actorScale:2,
  footprint:{halfWidth:25,halfHeight:12},bounds:{left:48,right:1232,top:220,bottom:707},
  spawn:{x:640,y:605,facing:'up'},obstacles:[],stations:[],doors:[doorway('exit',578,675,124,32,'down')],...extra});
const outdoors=(name,extra)=>({name,width:1920,height:1080,speed:260,actorScale:1.5,
  footprint:{halfWidth:20,halfHeight:10},bounds:{left:35,right:1905,top:355,bottom:1035},
  spawn:{x:430,y:430,facing:'down'},obstacles:[],stations:[],doors:[],...extra});

export const MEXICO_LAYOUTS={
  'mexico-home':room('La posada · Ton logement',{
    spawn:MEXICO_HOME_SPAWN,bounds:{left:55,right:1225,top:218,bottom:707},
    obstacles:[obstacle('bed',884,185,277,240),obstacle('wardrobe',123,174,168,85),obstacle('table',88,321,178,157),
      obstacle('nightstand',1164,216,65,95),obstacle('front-left',0,674,553,46),obstacle('front-right',730,674,550,46)],
    stations:[station('bed','Ton lit · Le prochain jour',834,374,112),station('wardrobe','Ta valise',312,253,84),station('exit','Le village',640,691,70)],
  }),
  'mexico-gym':room('Boxeo del Sol · Pablo et The Octopus',{
    actorScale:1.5,footprint:{halfWidth:20,halfHeight:10},
    obstacles:[obstacle('bag-left',145,222,76,55),obstacle('bag-right',277,222,65,55),obstacle('ring',815,200,430,275),
      obstacle('ring-step',869,469,72,28),obstacle('coach',409,417,42,24),obstacle('pablo',1018,537,45,25),
      obstacle('front-left',0,679,554,41),obstacle('front-right',730,679,550,41)],
    stations:[station('pads','The Octopus · Les pads',430,441,95),station('pablo','Pablo · Sparring',1040,565,100),station('exit','Le village',640,691,70)],
  }),
  'mexico-village':outdoors('Le village · Mexique',{
    obstacles:[obstacle('kiosk',246,651,265,190),obstacle('plaza-left',35,972,585,65),obstacle('plaza-right',1310,970,575,70)],
    stations:[station('home','La posada · Ton logement',420,360,82),station('gym','Boxeo del Sol · Pablo et The Octopus',1048,350,82),
      station('beach','La plage et les arènes',1865,550,85),station('flight','Vol retour · Montréal',390,876,108)],
    doors:[doorway('home',368,352,104,32,'up'),doorway('gym',993,340,110,32,'up'),doorway('beach',1872,471,35,160,'right')],
  }),
  'mexico-beach':outdoors('La promenade · Les arènes',{
    bounds:{left:32,right:1888,top:450,bottom:970},spawn:{x:115,y:600,facing:'right'},
    obstacles:[obstacle('north-left',222,450,415,78),obstacle('north-middle',790,450,450,86),obstacle('north-right',1490,450,398,90),obstacle('southern-left',30,902,610,78),obstacle('southern-right',1420,904,480,80)],
    stations:[station('village','Le village · La posada',55,600,86),station('arena','Les arènes · Danielo',1366,464,90)],
    doors:[doorway('village',33,526,42,150,'left'),doorway('arena',1306,452,120,35,'up')],
  }),
  'mexico-arena':outdoors('Les arènes · Le ring de Danielo',{
    bounds:{left:250,right:1670,top:315,bottom:1062},spawn:{x:960,y:966,facing:'up'},
    obstacles:[obstacle('ring',620,350,680,292),obstacle('front-left',0,863,780,217),obstacle('front-right',1140,863,780,217)],
    stations:[station('fight','Danielo · Rejoindre le ring',960,660,110),station('exit','La promenade',960,1030,90)],
    doors:[doorway('fight',885,638,150,34,'up'),doorway('exit',875,1038,170,40,'down')],
  }),
};
for(const layout of Object.values(MEXICO_LAYOUTS))markDoors(layout);
export const MEXICO_PLACES=Object.freeze(Object.keys(MEXICO_LAYOUTS));
export function mexicoDoorDestination(place,id){
  if(place==='mexico-village')return {
    home:{place:'mexico-home',location:{x:640,y:605,facing:'up'}},
    gym:{place:'mexico-gym',location:{x:640,y:605,facing:'up'}},
    beach:{place:'mexico-beach',location:{x:115,y:600,facing:'right'}},
  }[id]??null;
  if(id==='exit'&&['mexico-home','mexico-gym'].includes(place))return {place:'mexico-village',location:{x:place==='mexico-home'?420:1048,y:430,facing:'down'}};
  if(place==='mexico-beach')return {village:{place:'mexico-village',location:{x:1800,y:550,facing:'left'}},arena:{place:'mexico-arena',location:{x:960,y:966,facing:'up'}}}[id]??null;
  if(place==='mexico-arena'&&id==='exit')return {place:'mexico-beach',location:{x:1366,y:550,facing:'down'}};
  return null;
}
export class MexicoWorld extends GymWorld {
  constructor({place='mexico-home',position}={}){
    const selected=MEXICO_PLACES.includes(place)?place:'mexico-home';super({layout:structuredClone(MEXICO_LAYOUTS[selected])});this.place=selected;
    if(position)this.restorePosition(position);this.getNearby();
  }
  location(){return {scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
}
