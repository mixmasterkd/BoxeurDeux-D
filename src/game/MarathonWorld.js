import {GymWorld} from './GymWorld.js';
import {doorway,markDoors} from './DoorTravel.js';
import {MARATHON_PLACES} from './MarathonRules.js';
export {MARATHON_PLACES};
export const MARATHON_NAMES={'marathon-island':'Île Sainte-Hélène','marathon-downtown':'Le centre-ville','marathon-oldport':'Le Vieux-Port','marathon-stadium':'Le stade olympique'};
export const ROAD_Y={'marathon-island':745,'marathon-downtown':1170,'marathon-oldport':795,'marathon-stadium':970};
export const MARATHON_METRO_ARRIVALS={'marathon-island':{x:428,y:1375,facing:'down'},'marathon-stadium':{x:2370,y:1500,facing:'down'}};
const r=(id,x,y,width,height)=>({id,x,y,width,height});
const common={width:2880,height:1620,speed:225,footprint:{halfWidth:16,halfHeight:8},actorScale:1.25};
export const MARATHON_LAYOUTS={
 'marathon-island':{...common,bounds:{left:24,right:2856,top:720,bottom:1395},spawn:MARATHON_METRO_ARRIVALS['marathon-island'],obstacles:[r('metro',238,1035,340,285),r('rose',788,1075,300,184),r('grass-south',1170,866,1710,754),r('garden-left',0,820,210,400)],stations:[{id:'metro',label:'Métro · Île',x:428,y:1320,radius:84},{id:'start',label:'Marathon · Départ et parcours',x:930,y:800,radius:105}],doors:[doorway('metro',370,1307,112,28,'up')]},
 'marathon-downtown':{...common,bounds:{left:24,right:2856,top:745,bottom:1530},spawn:{x:110,y:940,facing:'right'},obstacles:[r('fountain',1170,1150,550,340),r('trees-left',0,1165,935,320),r('trees-right',2030,1165,850,325),r('lamp-west',800,1180,34,60),r('lamp-east',1970,1180,34,60)],stations:[],doors:[]},
 'marathon-oldport':{...common,bounds:{left:24,right:2856,top:660,bottom:1190},spawn:{x:110,y:795,facing:'right'},obstacles:[r('garden-1',145,935,400,190),r('garden-2',931,935,240,190),r('garden-3',1650,900,320,240),r('garden-4',2390,940,325,185)],stations:[],doors:[]},
 'marathon-stadium':{...common,bounds:{left:24,right:2856,top:760,bottom:1540},spawn:{x:110,y:970,facing:'right'},obstacles:[r('garden-upper',0,730,1980,110),r('gardens-south',0,1070,1950,310),r('metro',2180,1110,410,338),r('garden-east',2690,1060,190,340)],stations:[{id:'metro',label:'Métro · Stade · Retour au quartier',x:2370,y:1460,radius:100},{id:'finish-info',label:'Esplanade du Stade',x:2330,y:975,radius:100}],doors:[doorway('metro',2305,1435,130,35,'up')]},
};
for(const [index,place]of MARATHON_PLACES.entries()){
 const layout=MARATHON_LAYOUTS[place],y=ROAD_Y[place];
 if(index>0)layout.doors.push(doorway('previous',24,y-110,60,220,'left'));
 if(index<3)layout.doors.push(doorway('next',2798,y-110,58,220,'right'));
 markDoors(layout);
}
export class MarathonWorld extends GymWorld{
 constructor({place='marathon-island',position}={}){super({layout:MARATHON_LAYOUTS[place]});this.place=place;this.restorePosition(position);if(place==='marathon-island'&&this.state.y<720&&!onParkPath(this.state))this.restorePosition(this.layout.spawn);}
 moveAxis(axis,amount){
  const before=this.state[axis];super.moveAxis(axis,amount);
  if(this.place==='marathon-island'&&this.state.y<720&&!onParkPath(this.state))this.state[axis]=before;
 }
 location(){return{scene:this.place,x:Math.round(this.state.x),y:Math.round(this.state.y),facing:this.state.facing};}
}

// Waypoints follow actual paths and plazas; they validate passage without any
// timing input. Turning and exploring use the very same movement controller.
export const COURSE_POINTS={
 'marathon-island':[{x:1020,y:780},{x:1016,y:675},{x:862,y:565},{x:940,y:443},{x:1013,y:368},{x:994,y:277},{x:1171,y:196},{x:1378,y:198},{x:1647,y:269},{x:1865,y:362},{x:1915,y:461},{x:2005,y:549},{x:2027,y:661},{x:2170,y:740},{x:2320,y:725},{x:2480,y:725},{x:2530,y:745},{x:2800,y:745}],
 'marathon-downtown':[{x:430,y:1170},{x:880,y:1170},{x:880,y:515},{x:1420,y:515},{x:2000,y:515},{x:2000,y:1170},{x:2790,y:1170}],
 'marathon-oldport':[{x:430,y:795},{x:700,y:630},{x:1400,y:630},{x:1400,y:970},{x:1400,y:1160},{x:2060,y:1160},{x:2060,y:970},{x:2360,y:795},{x:2790,y:795}],
 'marathon-stadium':[{x:550,y:970},{x:1300,y:970},{x:2080,y:970},{x:2180,y:780},{x:2180,y:545},{x:1800,y:545},{x:1490,y:545}],
};
// Reach the north park paths rather than walking through foliage/water.
const island=MARATHON_LAYOUTS['marathon-island'];island.bounds.top=130;
island.obstacles.push(r('bridge-north',2360,0,520,705),r('bridge-south',2458,822,422,798),r('bridge-pier-front',2340,743,92,137));
const stadium=MARATHON_LAYOUTS['marathon-stadium'];stadium.bounds.top=510;
stadium.obstacles=stadium.obstacles.filter(o=>o.id!=='garden-upper');
stadium.obstacles.push(r('garden-upper-west',0,565,550,275),r('garden-upper-middle',675,575,575,250),r('garden-upper-east',1620,565,350,225));
const oldport=MARATHON_LAYOUTS['marathon-oldport'];oldport.bounds.top=565;

const PARK_PATH=COURSE_POINTS['marathon-island'].map(p=>[p.x,p.y]);
function onParkPath(p){return PARK_PATH.some((a,i)=>{const b=PARK_PATH[i+1];if(!b)return false;const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy)<49;});}

const downtown=MARATHON_LAYOUTS['marathon-downtown'];downtown.bounds={left:24,right:2856,top:385,bottom:1280};downtown.spawn={x:110,y:1170,facing:'right'};downtown.obstacles=[r('west-block',0,0,695,1010),r('east-block',2140,0,740,1010),r('north-facades',760,0,1360,371),r('fountain-square',1030,627,800,430),r('south-block',1040,1120,820,500),r('car-blue',181,1050,224,105),r('car-green',2446,1050,230,108),r('car-red',1102,379,210,100),r('car-silver',1673,380,207,100)];
