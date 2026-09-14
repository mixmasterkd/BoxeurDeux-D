import {ExplorationScene} from './ExplorationScene.js';
import {MarathonWorld,MARATHON_PLACES,MARATHON_NAMES,ROAD_Y,MARATHON_METRO_ARRIVALS,COURSE_POINTS} from '../game/MarathonWorld.js';
import {careerProfile} from '../game/CareerProfile.js';
import {careerMenuOpen} from '../ui/GameControls.js';
import {resumePending} from '../game/ResumeRouting.js';
import {startAt} from '../game/SceneRouting.js';
import '../ui/marathon.css';
const timer=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export class MarathonScene extends ExplorationScene{
 constructor(){super('MarathonScene');}
 init(data={}){
  const entry=new URLSearchParams(location.search).get('scene'),saved=careerProfile.snapshot().location;
  const place=data.place??(MARATHON_PLACES.includes(entry)?entry:MARATHON_PLACES.includes(saved.scene)?saved.scene:'marathon-island');
  super.init({...data,place});this.actorScale=1.25;this.assetPath=`assets/marathon/${place.slice(9)}.png`;
  this.placeCopy={eyebrow:'MONTRÉAL · EN LIBERTÉ',title:MARATHON_NAMES[place],welcome:MARATHON_NAMES[place],hint:'Le parcours se visite toute l’année.',pauseText:'Le temps de course s’arrête pendant la pause.',commandsTitle:'Marcher et courir',commandsHint:'Flèches ou WASD pour te déplacer. Pendant la course, ton personnage court automatiquement. Aucun bouton de cadence ou de sprint.'};
  const run=careerProfile.marathonStatus().active;this.elapsed=run?.elapsed??0;this.runners=[];this.runId=run?.status==='running'||run?.status==='encounter'?run.id:null;this.encounterShown=false;this.justFinished=false;this.routePoint=run?.checkpoint.scene===place?(run.routePoint??0):0;
 }
 makeWorld(){return new MarathonWorld({place:this.place,position:this.entryPosition});}
 preload(){super.preload();const base=import.meta.env.BASE_URL;this.load.json('marathon-player-data',`${base}assets/sprites/marathon/player.json`);for(const d of ['down','right','up','left'])for(let f=0;f<3;f++)this.load.image(`marathon-player-${d}-${f}`,`${base}assets/sprites/marathon/player-${d}-${f}.png`);for(let p=0;p<4;p++)for(const d of ['down','up','right'])for(let f=0;f<2;f++)this.load.image(`marathon-crowd-${p}-${d}-${f}`,`${base}assets/sprites/marathon/crowd-${p}-${d}-${f}.png`);}
 addForeground(){
  if(this.place!=='marathon-island')return;
  const key='marathon-bridge-foreground';
  if(!this.textures.exists(key)){
   const source=this.textures.get(`world-${this.place}`).getSourceImage(),texture=this.textures.createCanvas(key,1920,1080),ctx=texture.context;
   // The south-side steel frame is an occluding layer; its open triangles
   // remain transparent. The source painting itself is never overwritten.
   ctx.save();ctx.beginPath();[[1605,521],[1835,414],[1920,415],[1920,578],[1605,578]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(source,0,0,1920,1080);
   const data=ctx.getImageData(0,0,1920,1080);for(let i=0;i<data.data.length;i+=4){const [r,g,b]=data.data.slice(i,i+3);if(!(g>r*.97&&b<g*1.25&&r<130))data.data[i+3]=0;}ctx.putImageData(data,0,0);ctx.restore();
   ctx.save();ctx.beginPath();[[1560,490],[1579,480],[1608,490],[1621,538],[1621,587],[1560,587]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(source,0,0,1920,1080);ctx.restore();texture.refresh();
  }
  this.add.image(0,0,key).setOrigin(0).setScale(1.5).setDepth(1399);
 }
 addWayfinding(){
  const y=ROAD_Y[this.place],index=MARATHON_PLACES.indexOf(this.place);
  this.waySigns=[];const sign=(x,sy,label)=>{const t=this.add.text(x,sy,label,{fontFamily:'monospace',fontSize:'18px',fontStyle:'bold',color:'#ffdf92',backgroundColor:'#173047',padding:{x:9,y:6}}).setOrigin(.5,1).setDepth(sy);this.waySigns.push(t);};
  if(index<3)sign(2620,y-85,`${MARATHON_NAMES[MARATHON_PLACES[index+1]]} →`);
  if(index>0)sign(250,y-85,`← ${MARATHON_NAMES[MARATHON_PLACES[index-1]]}`);
  if(this.place==='marathon-island'){sign(428,1260,'MÉTRO · ÎLE');sign(930,780,'PARCOURS · DÉPART');sign(690,1240,'DÉPART ↑');}
  if(this.place==='marathon-stadium')sign(2370,1440,'MÉTRO · STADE');
 }
 create(){
  super.create();if(this.changingPlace)return;
  this.courseHud=document.createElement('div');this.courseHud.className='marathon-readout';this.courseHud.setAttribute('role','status');this.ui.root.append(this.courseHud);
  this.events.once('shutdown',()=>this.courseHud?.remove());
  this.drawEvent();this.refreshCourseHud();
  if(this.place==='marathon-stadium')this.cameras.main.setFollowOffset(0,220);
  if(import.meta.env.DEV)window.__marathon={scene:this,world:this.world,ui:this.ui};
  this.events.once('shutdown',()=>{if(window.__marathon?.scene===this)delete window.__marathon;});
  const active=careerProfile.marathonStatus().active;
  if(active?.status==='encounter')this.showEncounter(true);
 }
 isRunning(){const a=careerProfile.marathonStatus().active;return a?.status==='running'||a?.status==='encounter';}
 drawEvent(){
  this.eventLayer?.destroy(true);this.eventLayer=this.add.container(0,0).setDepth(300);this.routeMarker=this.add.graphics();this.eventLayer.add(this.routeMarker);this.runners.forEach(r=>r.sprite.destroy());this.runners=[];
  if(!this.isRunning()&&!this.justFinished)return;
  const y=ROAD_Y[this.place],g=this.add.graphics();this.eventLayer.add(g);
  // Small route chevrons and light bunting; the runners remain the focus.
  const points=COURSE_POINTS[this.place];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],distance=Math.hypot(b.x-a.x,b.y-a.y);for(let t=0;t<distance;t+=42){const k=t/distance;g.fillStyle(0xb6a1ed,.55).fillRect(a.x+(b.x-a.x)*k-2,a.y+(b.y-a.y)*k-2,4,4);}}
  for(let x=160;x<2800;x+=160){g.lineStyle(2,0xf0c899,.65).lineBetween(x,y-160,x+160,y-160);g.fillStyle(x%320?0xf2bd59:0x7569bd).fillTriangle(x+22,y-160,x+45,y-160,x+34,y-140);}
  const gate=(x,label)=>{g.fillStyle(0x554861).fillRect(x-8,y-155,12,280);g.fillStyle(0x7160a4).fillRect(x-6,y-155,170,36);const t=this.add.text(x+4,y-149,label,{fontFamily:'monospace',fontSize:'21px',fontStyle:'bold',color:'#fff1c5'});this.eventLayer.add(t);};
  if(this.place==='marathon-island')gate(930,'DÉPART');if(this.place==='marathon-stadium'){g.fillStyle(0x6855a0).fillRect(1360,375,270,45);const title=this.add.text(1490,382,'ARRIVÉE',{fontFamily:'monospace',fontSize:'28px',color:'#fff1d0'}).setOrigin(.5,0);this.eventLayer.add(title);}
  for(let i=0;i<19;i++){
   const point=COURSE_POINTS[this.place][i%COURSE_POINTS[this.place].length];const sprite=this.add.image(point.x,point.y,`marathon-crowd-${i%4}-right-0`).setOrigin(.5,104/112).setScale(1.1+(i%3)*.06);

   this.runners.push({sprite,person:i%4,x:sprite.x,y:sprite.y,speed:155+(i%6)*15,phase:i*.19,target:Math.min(i%COURSE_POINTS[this.place].length+1,COURSE_POINTS[this.place].length-1),finished:false});
  }
 }
 renderWorld(){
  super.renderWorld();if(!this.isRunning()&&!this.justFinished)return;
  const s=this.world.state,frame=s.moving&&!s.paused&&!this.ui?.dialog?[0,1,0,2][Math.floor(s.walkTime/.11)%4]:0;
  this.player.setTexture(`marathon-player-${s.facing}-${frame}`).setOrigin(.5,104/112).setScale(1.25);this.shadow.setScale(1.25);
 }
 persistLocation(){
  if(!this.world||this.changingPlace||careerMenuOpen()||resumePending())return;
  const run=careerProfile.marathonStatus().active;
  if(run&&['running','encounter'].includes(run.status))careerProfile.recordMarathonProgress({elapsed:this.elapsed,checkpoint:this.world.location(),routePoint:this.routePoint});
  careerProfile.setLocation(this.world.location());
 }
 refreshCourseHud(){
  if(!this.courseHud)return;const run=careerProfile.marathonStatus().active;
  const target=COURSE_POINTS[this.place][this.routePoint],dx=target?target.x-this.world.state.x:1,dy=target?target.y-this.world.state.y:0;const direction=Math.abs(dx)<35?(dy<0?'↑':'↓'):Math.abs(dy)<35?(dx<0?'←':'→'):dy<0?(dx<0?'↖':'↗'):(dx<0?'↙':'↘');
  this.courseHud.textContent=this.isRunning()?`${timer(this.elapsed)} · ${MARATHON_NAMES[this.place]} ${target?`· Repère ${direction}`:'· ARRIVÉE'}`:this.justFinished?`ARRIVÉE · ${timer(this.elapsed)} · Métro au sud`:run?.status==='registered'?'MARATHON · Inscrit · Départ sur l’île':'MONTRÉAL · Promenade libre';
  if(this.chapterReadout)this.chapterReadout.hidden=true;
 }
 interact(){
  if(this.world.state.paused||this.ui.dialog||this.changingPlace)return;
  const nearby=this.world.getNearby();if(!nearby)return;this.world.releaseControls();this.persistLocation();
  if(nearby.id==='start'){
   const run=careerProfile.marathonStatus().active;
   this.ui.showDialog({speaker:'MARATHON DE MONTRÉAL',title:run?.status==='registered'?'Prêt pour le départ ?':'Le parcours de Montréal',text:run?.status==='registered'?'Déplace-toi simplement. Suis les flèches jusqu’au stade, à ton rythme. La pause arrête le chrono.':'Les lieux se visitent librement. Inscription : 100 $ sur le navigateur de ton laptop à la maison. Pas de prix en argent; une médaille souvenir lors de ta première arrivée.',actions:run?.status==='registered'?[{id:'start-marathon',label:'Prendre le départ'},{id:'close',label:'Pas maintenant'}]:[{id:'close',label:'Continuer la visite'}]});
  }else if(nearby.id==='finish-info')this.ui.showDialog({speaker:'LE STADE',title:'Au pied de la tour',text:'Le métro du Stade te ramène au quartier. En course, franchis l’arrivée sur cette esplanade.',actions:[{id:'close',label:'Continuer'}]});
 }
 choose(id){
  if(!this.ui.dialog||this.world.state.paused||this.changingPlace)return;
  if(id==='start-marathon'){
   this.persistLocation();const r=careerProfile.startMarathon();if(!r.ok){this.ui.showDialog({title:'Avant le départ',text:r.message});return;}
   this.elapsed=0;this.routePoint=0;Object.assign(this.world.state,{x:960,y:790,facing:'right'});this.ui.closeDialog();this.drawEvent();this.refreshCourseHud();return;
  }
  if(id==='avoid-encounter'){careerProfile.encounterMarathon('avoid');this.ui.closeDialog();this.world.releaseControls();return;}
  if(id==='accept-encounter'){
   this.persistLocation();const a=careerProfile.marathonStatus().active;
   const r=a?.status==='encounter'?{ok:true,location:a.checkpoint}:careerProfile.encounterMarathon('fight');if(!r.ok)return;
   this.changingPlace=true;this.ui.clearInputs();this.world.pause();this.scene.start('SparringScene',{opponent:'runner',streetFight:true,returnScene:'MarathonScene',returnLocation:r.location});return;
  }
  if(id==='resume-course'){careerProfile.resolveMarathonEncounter({won:false});this.ui.closeDialog();return;}
  if(id==='abandon-course'){careerProfile.abandonMarathon();this.ui.closeDialog();this.drawEvent();this.returnMetro();return;}
 }
 showEncounter(pending=false){
  this.encounterShown=true;this.world.releaseControls();this.persistLocation();
  this.ui.showDialog({speaker:'SUR LE PARCOURS',title:'« Hé ! Regarde où tu cours ! »',text:pending?'L’altercation était en cours. Tu peux reprendre ou choisir de repartir courir.':'Un coureur te bouscule et cherche la dispute. Tu peux poursuivre tranquillement. Cette rencontre n’arrivera qu’une fois pendant ta course.',actions:[{id:pending?'resume-course':'avoid-encounter',label:'Continuer ma course'},{id:'accept-encounter',label:'Lui tenir tête'}]});
 }
 interactDoor(id){
  if(id==='metro'){
   if(this.isRunning()){this.ui.showDialog({title:'Quitter la course ?',text:'L’inscription sera utilisée. Tu pourras toujours visiter ces lieux et te réinscrire plus tard.',actions:[{id:'close',label:'Continuer la course'},{id:'abandon-course',label:'Quitter et prendre le métro'}]});return;}
   this.returnMetro();return;
  }
  const index=MARATHON_PLACES.indexOf(this.place),next=MARATHON_PLACES[index+(id==='next'?1:-1)];if(!next)return;
  // A running course always progresses forward. Free exploration remains bidirectional.
  if(this.isRunning()&&id==='previous'){this.world.releaseControls();this.ui.showDialog({title:'Le parcours continue devant',text:'Suis les flèches vers le stade. Pour visiter librement, quitte la course par le métro.',actions:[{id:'close',label:'Reprendre'}]});return;}
  if(this.isRunning()&&this.routePoint<COURSE_POINTS[this.place].length){this.world.releaseControls();this.ui.showDialog({title:'Suis les petits repères violets',text:'Le parcours passe par les attraits du quartier. Rejoins le prochain fanion avant de continuer.',actions:[{id:'close',label:'Reprendre la course'}]});return;}
  this.persistLocation();const position={scene:next,x:id==='next'?110:2740,y:ROAD_Y[next],facing:id==='next'?'right':'left'};
  if(this.isRunning()){
   const r=careerProfile.recordMarathonProgress({elapsed:this.elapsed,checkpoint:position});if(!r.ok)return;
  }
  careerProfile.setLocation(position);startAt(this,position);
 }
 returnMetro(){const station=this.place==='marathon-island'?'metro-island':'metro-stadium';const p={scene:station,x:640,y:490,facing:'up'};careerProfile.setLocation(p);startAt(this,p);}
 update(time,delta){
  const advance=this.world&&!this.world.state.paused&&!this.ui?.dialog&&!this.changingPlace&&!careerMenuOpen()&&!resumePending()&&!document.hidden;
  if(advance&&this.isRunning()){
   const dt=Math.min(delta/1000,.1);this.elapsed+=dt;
   for(const r of this.runners){
    if(r.finished)continue;
    const points=COURSE_POINTS[this.place],p=points[r.target],dx=p.x-r.x,dy=p.y-r.y,d=Math.hypot(dx,dy);
    // Runners stop at the end of this sector instead of cutting straight
    // through buildings or water to loop back to its first point.
    if(d<8){if(r.target===points.length-1){r.finished=true;continue;}r.target++;}
    else{r.x+=dx/d*Math.min(d,r.speed*dt);r.y+=dy/d*Math.min(d,r.speed*dt);}
    r.phase+=dt;const facing=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
    r.sprite.setTexture(`marathon-crowd-${r.person}-${facing==='left'?'right':facing}-${Math.floor(r.phase/.16)%2}`).setFlipX(facing==='left').setPosition(r.x,r.y).setDepth(r.y);
   }
  }
  super.update(time,delta);this.refreshCourseHud();
  if(!advance||!this.isRunning()||this.ui.dialog||this.changingPlace)return;
  const run=careerProfile.marathonStatus().active,s=this.world.state;
  const target=COURSE_POINTS[this.place][this.routePoint];this.routeMarker?.clear();
  if(target){this.routeMarker.lineStyle(3,0xd9c3fa,.85).strokeEllipse(target.x,target.y,40,17).lineBetween(target.x,target.y-9,target.x,target.y-44).fillStyle(0xc4a4e5).fillTriangle(target.x,target.y-44,target.x+24,target.y-36,target.x,target.y-27);if(Math.hypot(s.x-target.x,s.y-target.y)<63){this.routePoint++;this.persistLocation();}}
  if(this.place==='marathon-oldport'&&s.x>1380&&!run.encounterUsed&&!this.encounterShown)this.showEncounter();
  if(this.place==='marathon-stadium'&&this.routePoint>=COURSE_POINTS[this.place].length){
   this.persistLocation();const r=careerProfile.finishMarathon({elapsed:this.elapsed});if(!r.ok)return;
   this.justFinished=true;this.world.releaseControls();this.player.setScale(1.25);
   this.ui.showDialog({speaker:'MARATHON DE MONTRÉAL',title:'Tu as franchi l’arrivée !',text:`Temps : ${timer(r.elapsed)}. ${r.personalBest?'Nouveau record personnel !':''}\n${r.firstMedal?'Ta médaille souvenir est maintenant à la maison.':'Ta médaille souvenir reste dans ta collection; elle n’est attribuée qu’une fois.'}\nLe métro est au sud de l’esplanade pour rentrer.`,actions:[{id:'close',label:'Profiter de l’arrivée'}]});this.refreshProfile();
  }
 }
}
