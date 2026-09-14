import { GymWorld } from './GymWorld.js';
import { doorway, markDoors } from './DoorTravel.js';
import { METRO_PLACES, METRO_STATION_IDS, metroStation } from './MetroNetwork.js';
const platform = { width:1280,height:720,speed:220,actorScale:1.25,footprint:{halfWidth:16,halfHeight:8},
  bounds:{left:96,right:1184,top:326,bottom:690},spawn:{x:640,y:490,facing:'up'},
  obstacles:[{id:'bench-left',x:128,y:427,width:168,height:62},{id:'bench-right',x:975,y:427,width:173,height:62},
    {id:'stair-left',x:458,y:545,width:20,height:160},{id:'stair-right',x:805,y:545,width:20,height:160}],
  stations:[{id:'train',label:'Monter dans le train',x:640,y:336,radius:70},
    {id:'metro-exit',label:'Sortie de la station',x:640,y:544,radius:55},
    {id:'metro-map',label:'Plan du métro · Direction',x:398,y:375,radius:70}],
  doors:[doorway('train',584,328,112,38,'up'),doorway('metro-exit',580,532,120,55,'down')],
};
const hall = {width:1280,height:720,speed:220,actorScale:2,footprint:{halfWidth:20,halfHeight:10},
  bounds:{left:95,right:1185,top:235,bottom:682},spawn:{x:640,y:610,facing:'up'},
  obstacles:[{id:'bench-left',x:95,y:285,width:190,height:82},{id:'bench-right',x:1000,y:285,width:190,height:82}],
  stations:[{id:'quai-forward',label:'Quai A · Vers l’aéroport',x:340,y:275,radius:75},
    {id:'quai-backward',label:'Quai B · Vers le quartier',x:940,y:275,radius:75},
    {id:'metro-map',label:'Plan du métro',x:640,y:280,radius:78},{id:'metro-exit',label:'Sortie vers la rue',x:640,y:640,radius:65}],
  doors:[doorway('quai-forward',283,237,114,40,'up'),doorway('quai-backward',883,237,114,40,'up'),doorway('metro-exit',560,638,160,42,'down')],
};
const train = { width:1280,height:720,speed:200,actorScale:2.5,footprint:{halfWidth:24,halfHeight:12},
  bounds:{left:105,right:1175,top:326,bottom:670},spawn:{x:640,y:495,facing:'down'},
  obstacles:[{id:'left-seats',x:65,y:270,width:315,height:80},{id:'right-seats',x:894,y:270,width:324,height:80},
    {id:'pole-left',x:381,y:355,width:16,height:16},{id:'pole-right',x:884,y:355,width:16,height:16},
    {id:'pole-near-left',x:83,y:407,width:18,height:18},{id:'pole-near-right',x:1177,y:407,width:18,height:18}],
  stations:[{id:'train-exit',label:'Descendre à cette station',x:640,y:353,radius:90},{id:'metro-map',label:'Plan du métro',x:440,y:356,radius:75}],
  doors:[doorway('train-exit',583,335,114,44,'up')],
};
const airport = { width:1280,height:720,speed:215,actorScale:1.5,footprint:{halfWidth:20,halfHeight:10},
  bounds:{left:100,right:1180,top:259,bottom:640},spawn:{x:640,y:435,facing:'up'},
  obstacles:[{id:'travel-counter',x:484,y:231,width:313,height:74},{id:'left-seats',x:58,y:244,width:126,height:42},
    {id:'right-seats',x:1098,y:244,width:126,height:42},
    {id:'stair-bottom',x:499,y:535,width:282,height:160},
    {id:'stair-left',x:465,y:489,width:29,height:206},{id:'stair-right',x:789,y:489,width:29,height:206}],
  stations:[{id:'travel-counter',label:'Billets · Cuba et Mexique',x:640,y:342,radius:72},
    {id:'board-cuba',label:'Embarquement · Cuba',x:320,y:284,radius:70},
    {id:'board-mexico',label:'Embarquement · Mexique',x:966,y:284,radius:70},
    {id:'airport-metro',label:'Métro · Retour au quartier',x:640,y:490,radius:60}],
  doors:[doorway('board-cuba',269,265,102,35,'up'),doorway('board-mexico',915,265,102,35,'up'),doorway('airport-metro',570,486,140,40,'down')],
};
export const METRO_LAYOUTS = Object.freeze(Object.fromEntries(METRO_PLACES.map(place => [place,
  markDoors(structuredClone(place==='airport'?airport:place==='metro-train'?train:place.endsWith('-hall')?hall:platform))])));
export class MetroWorld extends GymWorld {
  constructor({ place='metro-station', position }={}) {
    const valid=METRO_PLACES.includes(place)?place:'metro-station';super({layout:METRO_LAYOUTS[valid]});this.place=valid;
    this.restorePosition(position ?? this.layout.spawn);
    if(valid!=='metro-train'&&valid!=='airport')this.layout.stations.find(station=>station.id==='metro-exit').label=valid.endsWith('-hall')?`Sortie · ${metroStation(valid).attraction}`:'Hall · Choisir un quai ou sortir';
  }
  location(){return {scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
  setDoorsOpen(open){
    if(this.place!=='metro-train')return;
    this.layout.bounds.top=open?326:385;
    if(!open&&this.state.y<this.layout.bounds.top+this.layout.footprint.halfHeight){this.state.y=this.layout.bounds.top+this.layout.footprint.halfHeight;this.releaseControls();}
  }
}
