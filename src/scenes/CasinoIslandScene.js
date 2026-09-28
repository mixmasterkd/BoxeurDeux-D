import { ExplorationScene } from './ExplorationScene.js';
import { CasinoIslandWorld,CASINO_ISLAND_PLACE,CASINO_MAIN_ISLAND_RETURN,CASINO_BUILDING } from '../game/CasinoIslandWorld.js';
import { CASINO_ENTRANCE } from '../game/CasinoWorld.js';
import { careerProfile } from '../game/CareerProfile.js';
import { startAt } from '../game/SceneRouting.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { resumePending } from '../game/ResumeRouting.js';

export class CasinoIslandScene extends ExplorationScene{
 constructor(){super('CasinoIslandScene');}
 init(data={}){
  super.init({...data,place:CASINO_ISLAND_PLACE});
  this.actorScale=1.25;this.assetPath='assets/casino/island.png';
  this.placeCopy={eyebrow:'MONTRÉAL · LE CASINO',title:'La petite île du casino',welcome:'La petite île du casino',
   hint:'Le casino au centre de l’île. Le petit pont à droite ramène au métro et au parc.',
   pauseText:'La promenade est sauvegardée et ne coûte aucune énergie.',
   commandsTitle:'La petite île du casino',commandsHint:'Marche jusqu’à l’entrée du casino. Le petit pont à droite rejoint l’île du métro. Les portes et les passages se franchissent en avançant.'};
 }
 makeWorld(){return new CasinoIslandWorld({position:this.entryPosition});}
 preload(){super.preload();this.load.image('casino-exterior',`${import.meta.env.BASE_URL}assets/casino/exterior.png`);}
 create(){
  // A direct URL must not freeze a race by relocating the runner outside it.
  const run=careerProfile.marathonStatus().active;
  if(['running','encounter'].includes(run?.status)){
   const checkpoint=run.checkpoint;careerProfile.setLocation(checkpoint);startAt(this,checkpoint);return;
  }
  super.create();if(this.changingPlace)return;
  this.cameras.main.setFollowOffset(0,200);
  if(import.meta.env.DEV)window.__casinoIsland={scene:this,world:this.world,ui:this.ui};
  this.events.once('shutdown',()=>{if(window.__casinoIsland?.scene===this)delete window.__casinoIsland;});
 }
 addForeground(){
  const facade=this.add.image(CASINO_BUILDING.x,CASINO_BUILDING.y,'casino-exterior').setOrigin(.5,1).setDepth(CASINO_BUILDING.y);
  facade.setDisplaySize(CASINO_BUILDING.width,CASINO_BUILDING.width*facade.height/facade.width);
  // The near railing and its posts cover feet only at the edge of the deck.
  const key=`world-${CASINO_ISLAND_PLACE}`,source=this.textures.get(key).getSourceImage();
  this.add.image(0,0,key,'__BASE').setOrigin(0).setDisplaySize(2880,1620)
   .setCrop(1240*source.width/1672,478*source.height/941,432*source.width/1672,45*source.height/941).setDepth(902);
 }
 addWayfinding(){
  const sign=(x,y,label)=>this.add.text(x,y,label,{fontFamily:'monospace',fontSize:'18px',fontStyle:'bold',color:'#ffdf92',backgroundColor:'#173047',padding:{x:9,y:6}}).setOrigin(.5,1).setDepth(y-1);
  sign(1940,870,'MÉTRO ET PARC →');sign(1860,716,'← CASINO');
 }
 interact(){}
 choose(){}
 interactDoor(id){
  if(this.changingPlace||this.world.state.paused||this.ui.dialog||careerMenuOpen()||resumePending())return;
  this.world.releaseControls();this.persistLocation();
  if(id==='bridge'){
   careerProfile.setLocation(CASINO_MAIN_ISLAND_RETURN);startAt(this,CASINO_MAIN_ISLAND_RETURN);return;
  }
  if(id!=='casino')return;
  const run=careerProfile.marathonStatus().active;
  if(['running','encounter'].includes(run?.status)){
   this.ui.showDialog({speaker:'CASINO DE MONTRÉAL',title:'Après la course',text:'Termine ta course ou quitte-la par le métro avant de venir te détendre au casino.',actions:[{id:'close',label:'Continuer'}]});return;
  }
  if(!careerProfile.casinoStatus().unlocked){
   this.ui.showDialog({speaker:'CASINO DE MONTRÉAL',title:'Une prochaine soirée',text:'Termine une participation aux Gants de bronze, puis reviens à Montréal pour découvrir le casino. Pas besoin de remporter l’or.',actions:[{id:'close',label:'Continuer la promenade'}]});return;
  }
  careerProfile.setLocation(CASINO_ENTRANCE);startAt(this,CASINO_ENTRANCE);
 }
}
