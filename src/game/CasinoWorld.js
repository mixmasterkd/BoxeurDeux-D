import { GymWorld } from './GymWorld.js';
import { doorway, markDoors } from './DoorTravel.js';
import { CASINO_PLACES } from './CasinoRules.js';
export { CASINO_PLACES };

export const CASINO_NAMES = Object.freeze({
  'casino-lobby':'Casino · Accueil et machines',
  'casino-tables':'Casino · Blackjack et roulette',
  'casino-poker':'Casino · Salon de poker',
});
export { CASINO_ISLAND_RETURN } from './CasinoIslandWorld.js';
// Coordinates below follow the supplied paintings' original 1672 × 941 frame.
// The exported layouts use the common, scrollable 2880 × 1620 world.
export const casinoPoint=(x,y)=>({x:Math.round(x*2880/1672),y:Math.round(y*1620/941)});
const rect=(id,x,y,width,height)=>({id,...casinoPoint(x,y),width:Math.round(width*2880/1672),height:Math.round(height*1620/941)});
const station=(id,label,x,y,radius=90,extra={})=>({id,label,...casinoPoint(x,y),radius,...extra});
export const CASINO_ENTRANCE=Object.freeze({scene:'casino-lobby',...casinoPoint(835,875),facing:'up'});
export const CASINO_LIFT_ARRIVALS=Object.freeze({
  'casino-lobby':{...casinoPoint(837,266),facing:'down'},
  'casino-tables':{...casinoPoint(837,340),facing:'down'},
  'casino-poker':{...casinoPoint(837,312),facing:'down'},
});
const common={width:2880,height:1620,speed:245,actorScale:1.5,footprint:{halfWidth:18,halfHeight:9}};
const bounds=(top,bottom=916)=>({left:155,right:2725,top:Math.round(top*1620/941),bottom:Math.round(bottom*1620/941)});
const lift=y=>station('lift','Ascenseur · Choisir un étage',837,y,110);
export const CASINO_LAYOUTS={
 'casino-lobby':{
  ...common,bounds:bounds(208,930),spawn:CASINO_ENTRANCE,
  obstacles:[rect('reception',292,155,290,108),rect('cashier',1094,155,287,108),
   rect('slot-left',289,355,255,207),rect('slot-middle',722,355,225,207),rect('slot-right',1150,355,228,207),
   rect('lounge',1455,168,200,118),rect('front-west',18,748,677,109),rect('front-east',975,748,676,109),
   rect('plant-lift-left',696,163,57,72),rect('plant-lift-right',918,163,56,72)],
  stations:[lift(212),station('reception','Réception · Découvrir le casino',435,285),station('cashier','Caisse · 1 jeton = 1 $',1230,285),
   station('slots-cerises','Machine · Les Cerises',360,584,85,{machineId:'cerises'}),station('slots-cloches','Machine · Les Cloches',442,584,85,{machineId:'cloches'}),
   station('slots-diamants','Machine · Les Diamants',800,584,85,{machineId:'diamants'}),station('slots-montreal','Machine · Nuit de Montréal',880,584,85,{machineId:'montreal'}),
   station('slots-cerises-east','Machine · Les Cerises',1230,584,85,{machineId:'cerises'}),station('slots-cloches-east','Machine · Les Cloches',1310,584,85,{machineId:'cloches'}),
   station('lounge','Coin détente · Une pause',1490,309),station('cloakroom','Vestiaire · Aile réservée',140,225,75),
   station('exit','Sortie · Petite île du casino',835,919,82)],
  doors:[{...doorway('exit',0,0,0,0,'down'),...rect('exit',732,905,202,26)}],
 },
 'casino-tables':{
  ...common,bounds:bounds(285),spawn:CASINO_LIFT_ARRIVALS['casino-tables'],
  obstacles:[rect('blackjack-table',375,348,361,220),rect('roulette-table',1030,352,380,213),
   rect('west-lounge',88,216,72,105),rect('east-lounge',1521,216,72,105),
   rect('plant-left',439,240,35,50),rect('plant-middle-left',683,236,37,53),rect('plant-middle-right',953,231,38,56),rect('plant-right',1201,237,39,52)],
  stations:[lift(285),station('blackjack','Karl · Blackjack',560,590,110),station('roulette','Roulette · Petites mises',1220,587,110),
   station('gala','Salle de spectacles · Galas à venir',233,292,100),station('future','Aile réservée · Prochainement',1436,292,100),
   station('spectator','Une habituée des tables',375,655,90)],
  doors:[],
 },
 'casino-poker':{
  ...common,bounds:bounds(260),spawn:CASINO_LIFT_ARRIVALS['casino-poker'],
  obstacles:[rect('poker-table',550,340,578,292),rect('west-couch',298,191,255,110),rect('bar',1340,186,332,221),
   rect('plant-left',91,660,45,101),rect('plant-right',1540,650,45,104)],
  stations:[lift(262),station('poker','Hold’em · Table de quatre joueurs',837,665,120),
   station('profiles','Luc, Mireille et Marco · Les habitués',440,480,105),
   station('vip','Salon privé · Prochainement',139,290,100),station('bar','Le bar · Les nouvelles du casino',1405,432,100)],
  doors:[],
 },
};
Object.values(CASINO_LAYOUTS).forEach(markDoors);

export class CasinoWorld extends GymWorld{
 constructor({place='casino-lobby',position}={}){const selected=CASINO_PLACES.includes(place)?place:'casino-lobby';super({layout:CASINO_LAYOUTS[selected]});this.place=selected;this.restorePosition(position);}
 location(){return{scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
}
export function casinoFloorDestination(place){return CASINO_PLACES.includes(place)?{scene:place,...CASINO_LIFT_ARRIVALS[place]}:null;}
export function karlGreeting(profile={}){
 const fights=profile.fights??{},medals=profile.tournament?.medals??[];
 if(medals.some(m=>m.tier==='gold'))return'Les Gants dorés ! On a suivi ça ici. Ce soir, tu peux enfin poser les gants. Une petite partie ?';
 if(fights.danielo?.wins)return'Te voilà de retour du Mexique ! Danielo, ce n’était pas rien. Installe-toi, je m’occupe des cartes.';
 if(fights.louisto?.wins)return'Alors, Cuba ? J’ai entendu parler de ton combat contre Louisto ! Ici, on se détend entre deux voyages.';
 if(fights.dyrex?.wins||fights.lefeu?.wins)return'On parle de tes derniers combats en ville ! Ça fait plaisir de te revoir. Une petite partie ?';
 return'Te voilà de retour des Gants de bronze ! Salut ! Une petite partie ? Si tu veux, je peux aussi t’expliquer le blackjack.';
}
