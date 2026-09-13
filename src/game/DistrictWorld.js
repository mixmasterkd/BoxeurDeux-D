import { GymWorld } from './GymWorld.js';
import { canStand } from './ExplorationWorld.js';
import { doorway, markDoors } from './DoorTravel.js';

export const DISTRICT_PLACES = ['residential', 'commercial', 'clothing-shop', 'boxing-shop', 'metro-station', 'metro-riverside', 'riverside'];
const scale = 1.5;
const r = (id,x,y,width,height) => ({id,x:x*scale,y:y*scale,width:width*scale,height:height*scale});
const s = (id,label,x,y,radius=62) => ({id,label,x:x*scale,y:y*scale,radius:radius*scale});
const outdoor = {width:2379,height:1488,speed:230,footprint:{halfWidth:16,halfHeight:8},bounds:{left:24,right:2355,top:230,bottom:1450}};
export const DISTRICT_LAYOUTS = {
  residential: {...outdoor,spawn:{x:2265,y:680,facing:'left'},obstacles:[
    r('maison-12',130,0,320,310),r('maison-24',594,0,380,310),r('maison-36',1100,0,398,310),
    r('travaux-nord',462,55,131,105),r('cloture-nord',974,70,124,62),
    r('depot',638,527,310,280),r('pickup-kiosk',984,631,58,112),r('maisons-sud',1063,524,485,348),
    r('parc-ouest',0,554,590,345),r('travaux-sud',708,877,150,115),
    r('arbre-12',344,345,65,28),r('arbre-24',928,345,63,28),r('arbre-36',1450,342,68,28),
    r('lampadaire-gauche',70,350,31,25),r('lampadaire-milieu',460,350,31,25),r('lampadaire-est',1010,348,31,25),
  ],stations:[s('return-neighborhood','Retour · Maison et gym',1510,451,78),s('to-commercial','Place commerçante',48,451,78),
    s('depot','DÉPÔT · Départ des livraisons',1012,632,90),s('maison-12','Livraison · 12',294,319),s('maison-24','Livraison · 24',793,319),s('maison-36','Livraison · 36',1295,319),
    s('works-delivery','Prochaine rue · Travaux',788,895,55)],
  },
  commercial: {...outdoor,spawn:{x:2265,y:780,facing:'left'},obstacles:[
    r('cafe',100,0,300,270),r('vetements',485,0,310,268),r('boxe',850,0,320,268),r('local-ferme',1230,0,310,270),
    r('voiture-1',215,337,95,109),r('voiture-2',545,332,95,114),r('voiture-3',959,332,90,114),r('voiture-4',1395,332,90,114),
    r('jardin-1',385,337,66,108),r('jardin-2',792,337,70,108),r('jardin-3',1220,337,65,108),
    r('voiture-5',183,590,93,123),r('voiture-6',510,590,91,123),r('voiture-7',1152,590,98,123),r('voiture-8',1321,590,92,123),
    r('jardin-sud-1',622,593,91,122),r('jardin-sud-2',900,593,83,122),r('travaux-sud',711,710,184,68),
    r('promenade-gauche',0,780,686,132),r('promenade-droite',907,780,660,132),
  ],stations:[s('return-residential','Rue des livreurs',1514,518,85),s('clothing-store','Rue Nord · Vêtements',642,281),s('boxing-store','Le Coin Bleu · Boxe',1015,281),
    s('rue-nord-210','210, promenade du Nord · Réception des colis',731,310,55),s('closed-cafe','Café · Bientôt',250,280),s('closed-shop','Local · Bientôt',1380,280),s('works-commercial','Extension · Travaux',799,703,65)],
  },
};
for(const place of ['clothing-shop','boxing-shop']) DISTRICT_LAYOUTS[place]={width:1280,height:720,speed:200,footprint:{halfWidth:28,halfHeight:14},
  bounds:{left:65,right:1215,top:210,bottom:670},spawn:{x:640,y:615,facing:'up'},
  obstacles:[{id:'comptoir',x:465,y:170,width:380,height:place==='boxing-shop'?108:92},
    {id:'etageres-gauche',x:65,y:230,width:115,height:345},{id:'etageres-droite',x:1100,y:220,width:115,height:390}],
  stations:[{id:'counter',label:place==='clothing-shop'?'Rue Nord · Collection':'Le Coin Bleu · Équipements',x:650,y:300,radius:96},
    {id:'shop-exit',label:'Retour à la place commerçante',x:640,y:660,radius:55}],
};
for(const place of ['metro-station','metro-riverside']) DISTRICT_LAYOUTS[place]={width:1280,height:720,speed:220,actorScale:1.25,footprint:{halfWidth:16,halfHeight:8},bounds:{left:96,right:1184,top:326,bottom:690},spawn:{x:640,y:490,facing:'up'},obstacles:[
  {id:'bench-left',x:128,y:427,width:168,height:62},{id:'bench-right',x:975,y:427,width:173,height:62},
  {id:'stair-left',x:458,y:545,width:20,height:160},{id:'stair-right',x:805,y:545,width:20,height:160}],
  stations:[{id:'train',label:place==='metro-station'?'Train · Direction Des Rives':'Train · Direction du Quartier',x:640,y:336,radius:85},{id:'metro-exit',label:'Sortie · Le quartier',x:640,y:544,radius:55}],
  doors:[doorway('metro-exit',580,532,120,55,'down')]};
DISTRICT_LAYOUTS.riverside={...outdoor,spawn:{x:1200,y:1320,facing:'down'},obstacles:[
 r('facades-left',125,0,615,330),r('facades-right',900,0,611,330),r('north-works',791,244,84,68),
 r('west-works',0,404,69,154),r('east-works',1510,402,76,154),
 r('station',640,548,323,275),r('garden-left',0,610,507,280),r('garden-right',1090,609,496,280),
 r('tree-west',65,330,64,59),r('tree-middle',705,340,80,50),r('tree-east',1120,340,55,51),
 {id:'travel-kiosk',x:1450,y:657,width:140,height:43},
 ],stations:[s('to-metro','Métro · Station Des Rives',800,832,65),{id:'cuba-travel',label:'VOYAGES · Camp de Cuba',x:1520,y:730,radius:90},s('works-north','La suite du quartier · Travaux',835,360,60),s('closed-riverside','Les commerces ouvriront plus tard',590,348,60)],
 doors:[doorway('to-metro',1110,1235,180,36,'up')]};
DISTRICT_LAYOUTS.residential.doors=[doorway('return-neighborhood',2240,575,115,220,'right'),doorway('to-commercial',24,575,100,220,'left')];
DISTRICT_LAYOUTS.commercial.doors=[doorway('return-residential',2240,665,115,220,'right'),doorway('clothing-store',905,411,116,25,'up'),doorway('boxing-store',1464,411,116,25,'up')];
for(const place of ['clothing-shop','boxing-shop'])DISTRICT_LAYOUTS[place].doors=[doorway('shop-exit',584,643,112,40,'down')];
for(const layout of Object.values(DISTRICT_LAYOUTS))markDoors(layout);
export const OUTDOOR_PLACES=['neighborhood','residential','commercial','riverside'];
export const DISTRICT_ARRIVALS = {
  residential:{neighborhood:{x:2265,y:680,facing:'left'},commercial:{x:120,y:680,facing:'right'}},
  'metro-station':{neighborhood:{x:640,y:490,facing:'up'},'metro-riverside':{x:640,y:410,facing:'down'}},
  'metro-riverside':{riverside:{x:640,y:490,facing:'up'},'metro-station':{x:640,y:410,facing:'down'}},
  riverside:{'metro-riverside':{x:1200,y:1320,facing:'down'}},
  commercial:{residential:{x:2265,y:780,facing:'left'},'clothing-shop':{x:963,y:440,facing:'down'},'boxing-shop':{x:1522,y:440,facing:'down'}},
};
export class DistrictWorld extends GymWorld {
  constructor({place,position}={}){const layout=structuredClone(DISTRICT_LAYOUTS[place]);super({layout});this.place=place;
    if(canStand(layout,position))Object.assign(this.state,{x:position.x,y:position.y,facing:position.facing??'down'});this.getNearby();}
  location(){return{scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
}
