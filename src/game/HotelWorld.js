import { GymWorld } from './GymWorld.js';
import { doorway, markDoors } from './DoorTravel.js';
const obstacle=(id,x,y,width,height)=>({id,x,y,width,height});
const station=(id,label,x,y,radius=90)=>({id,label,x,y,radius});
const room=(name,overrides)=>({name,width:1280,height:720,speed:220,actorScale:2,footprint:{halfWidth:25,halfHeight:12},bounds:{left:38,right:1242,top:234,bottom:658},spawn:{x:640,y:540,facing:'up'},obstacles:[],stations:[],...overrides});
export const HOTEL_LAYOUTS = {
  'hotel-room': room('Chambre 201',{
    obstacles:[obstacle('wardrobe',96,180,178,83),obstacle('bed',950,190,275,165),obstacle('desk',30,370,143,221),obstacle('suitcase',870,220,64,52)],
    stations:[station('bed','Ton lit · Le prochain jour',924,324,105),station('exit','Couloir · Chambre 201',640,650,80),station('notebook','Carnet du tournoi',186,453,92),station('wardrobe','Ta valise · Tenue de ville',208,287,90)],
  }),
  'hotel-corridor': room('Étage des chambres',{
    width:1920,height:1080,speed:260,actorScale:2,bounds:{left:52,right:1868,top:330,bottom:1030},spawn:{x:500,y:440,facing:'down'},
    obstacles:[obstacle('side-table',54,276,231,67),obstacle('plant',326,285,67,72)],
    stations:[station('room','Chambre 201 · Ta chambre',496,352,90),station('room-202','Chambre 202 · Marco Bellini',714,350,90),station('room-203','Chambre 203 · Louis Fortin',1054,350,90),station('room-204','Chambre 204 · André Gagnon',1416,350,90),station('lift','Ascenseur',1710,350,100)],
  }),
  'hotel-lobby': room('Rez-de-chaussée',{
    width:1920,height:1080,speed:260,actorScale:2,bounds:{left:50,right:1870,top:300,bottom:1045},spawn:{x:1760,y:420,facing:'down'},
    obstacles:[obstacle('reception',196,170,570,205),obstacle('couch-left',30,407,130,354),obstacle('couch-right',1810,407,88,354),obstacle('plant-bottom-left',548,875,143,149),obstacle('plant-bottom-right',1225,875,139,149),obstacle('front-left',20,989,731,30),obstacle('front-right',1176,989,724,30),obstacle('plant-gym',780,295,77,33),obstacle('plant-pool',1040,295,85,32),obstacle('plant-venue',1330,295,65,32),obstacle('plant-lift',1600,295,81,33)],
    stations:[station('reception','Accueil · Ton séjour',483,409,110),station('lift','Ascenseur · Chambres au 2e',1760,320,93),station('gym-door','Mini-gym · Fredo et les pads',945,320,88),station('pool-door','Piscine',1220,320,88),station('venue-door','Salle de boxe · Les Gants de bronze',1495,320,88),station('exit','Retour au quartier',960,1010,90)],
  }),
  'hotel-gym': room('Le mini-gym',{
    bounds:{left:38,right:1242,top:284,bottom:658},
    stations:[station('pads','Fredo · Travail aux pads',728,386,115),station('exit','Rez-de-chaussée',640,650,80),station('remi','Fredo · Un conseil',915,432,90)],
    obstacles:[obstacle('weights',980,223,230,75),obstacle('bag',18,275,122,120)],
  }),
  'hotel-pool': room('La piscine',{
    bounds:{left:35,right:1245,top:220,bottom:675},spawn:{x:640,y:610,facing:'up'},
    obstacles:[obstacle('water-top',184,270,911,64),obstacle('water-upper',163,334,952,64),obstacle('water-middle',139,398,998,65),obstacle('water-bottom',111,463,1050,76)],
    stations:[station('swim','Piscine · Quelques longueurs',112,430,95),station('exit','Rez-de-chaussée',640,652,80)],
  }),
  'hotel-restaurant':room('La Croûte dorée · Bar à pain',{
    bounds:{left:55,right:1225,top:280,bottom:707},spawn:{x:640,y:610,facing:'up'},
    obstacles:[obstacle('bread-bar',425,190,430,76),obstacle('left-table',0,215,222,355),obstacle('right-table',1055,215,225,355),
      obstacle('front-left',0,595,520,85),obstacle('front-right',760,595,520,85)],
    stations:[station('bread','Bar à pain · Ton choix',480,320,66),station('toast','Le grille-pain',735,320,66),
      station('spread','Les garnitures',607,320,60),station('exit','Rez-de-chaussée',640,691,75)],
  }),
  'hotel-venue': room('Les Gants de bronze',{
    width:2304,height:1536,speed:265,actorScale:1.5,footprint:{halfWidth:20,halfHeight:10},bounds:{left:58,right:2246,top:255,bottom:1460},spawn:{x:1152,y:1415,facing:'up'},
    obstacles:[obstacle('ring1',476,202,590,382),obstacle('ring2',1240,202,590,382),obstacle('ring3',436,616,630,435),obstacle('ring4',1258,616,592,435),obstacle('seats-left',35,245,319,989),obstacle('seats-right',1940,245,320,989),obstacle('entry-wall-left',35,1235,985,71),obstacle('entry-wall-right',1290,1235,970,71),obstacle('board',402,1250,216,110)],
    stations:[station('exit','Rez-de-chaussée · Retour à l’hôtel',1152,1455,110),station('board','Tableau · Participants et résultats',510,1380,112),station('fight','Ring 1 · Ton combat',1108,480,95),station('ring2','Ring 2 · Les autres rencontres',1200,405,95),station('ring3','Ring 3 · Échauffement',1108,1000,90),station('ring4','Ring 4 · Les autres rencontres',1216,902,90),station('coach','Fredo · Dans ton coin',1150,672,68),station('bellini','Marco Bellini',770,1150,75),station('fortin','Louis « Le Roc » Fortin',1705,1150,75),station('gagnon','André « Le Patron » Gagnon',1150,275,75)],
  }),
};
HOTEL_LAYOUTS['hotel-room'].doors=[doorway('exit',582,640,116,42,'down')];
HOTEL_LAYOUTS['hotel-corridor'].doors=[doorway('room',437,335,118,32,'up'),doorway('lift',1640,335,140,32,'up')];
HOTEL_LAYOUTS['hotel-lobby'].doors=[doorway('lift',1690,303,140,34,'up'),doorway('gym-door',880,303,130,34,'up'),doorway('pool-door',1155,303,130,34,'up'),doorway('venue-door',1430,303,130,34,'up'),doorway('exit',890,1004,140,42,'down')];
for(const place of ['hotel-gym','hotel-pool','hotel-restaurant'])HOTEL_LAYOUTS[place].doors=[doorway('exit',580,640,120,48,'down')];
HOTEL_LAYOUTS['hotel-venue'].doors=[doorway('exit',1070,1426,164,45,'down')];
for(const layout of Object.values(HOTEL_LAYOUTS))markDoors(layout);
export const HOTEL_PLACES=Object.keys(HOTEL_LAYOUTS);
export class HotelWorld extends GymWorld {
  constructor({place='hotel-room',position,tier='bronze',participants=[]}={}){
    const selected=HOTEL_LAYOUTS[place]?place:'hotel-room';super({layout:structuredClone(HOTEL_LAYOUTS[selected])});this.place=selected;this.tier=tier;
    if(tier==='gold'){
      if(selected==='hotel-lobby'){
        this.layout.obstacles.find(o=>o.id==='reception').width=355;
        this.layout.stations.find(s=>s.id==='reception').x=374;
        this.layout.stations.push(station('restaurant-door','La Croûte dorée · Bar à pain',728,320,86));
        this.layout.doors.push(doorway('restaurant-door',665,303,126,34,'up'));
        this.layout.stations.find(s=>s.id==='venue-door').label='Salle de boxe · Les Gants dorés';
      }
      if(selected==='hotel-venue')this.layout.name='Les Gants dorés';
      const ids=['gold-rios','gold-moreau','gold-santos'];
      this.layout.stations=this.layout.stations.map(s=>{
        const i=['bellini','fortin','gagnon'].indexOf(s.id),roomIndex=['room-202','room-203','room-204'].indexOf(s.id);
        const slot=i>=0?i:roomIndex;
        return slot<0?s:{...s,id:i>=0?ids[slot]:s.id,label:`${roomIndex>=0?`Chambre ${202+slot} · `:''}${participants.find(p=>p.id===ids[slot])?.name??['Rafael Ríos','Émile Moreau','Thiago Santos'][slot]}`};
      });
      markDoors(this.layout);
    }
    if(position)this.restorePosition(position);this.getNearby();
  }
  location(){return {scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
}
