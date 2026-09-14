import Phaser from 'phaser';
import {MexicoWorld,MEXICO_LAYOUTS,MEXICO_PLACES,MEXICO_FIGHT_RETURN,mexicoDoorDestination} from '../game/MexicoWorld.js';
import {MEXICO_HOME_SPAWN,MEXICO_SPAR_RETURN,MEXICO_PADS_RETURN} from '../game/MexicoWorld.js';
const MEXICO_RETURN_SPAWN={scene:'airport',x:640,y:590,facing:'down'};
import {DoorTravel} from '../game/DoorTravel.js';
import {careerProfile} from '../game/CareerProfile.js';
import {resumePending} from '../game/ResumeRouting.js';
import {GymUI} from '../ui/GymUI.js';
import {careerMenuOpen} from '../ui/GameControls.js';
import {downloadCareer} from '../ui/CareerMenu.js';
import {setSceneShell} from '../ui/SceneShell.js';
import {preloadOutfits,streetTexture,boxingTexture} from './OutfitView.js';

const close={id:'close',label:'Retour'};
const HINTS={
  'mexico-home':'Le lit pour passer au lendemain. La porte mène au village.',
  'mexico-village':'La posada, le gym de Pablo et, à l’est, la promenade vers les arènes. VUELOS pour rentrer à Montréal.',
  'mexico-gym':'The Octopus aux pads et Pablo pour le sparring. Les arènes de Danielo sont au bout de la promenade.',
  'mexico-beach':'Le village à l’ouest; les arènes par la grande porte, au nord-est.',
  'mexico-arena':'Avance vers la porte du ring pour rencontrer Danielo. La promenade est au sud.',
};

export class MexicoScene extends Phaser.Scene {
  constructor(){super('MexicoScene');}
  init(data={}){
    const query=new URLSearchParams(location.search).get('scene'),saved=careerProfile.snapshot().location;
    const requested=data.place??query;
    this.place=MEXICO_PLACES.includes(requested)?requested:MEXICO_PLACES.includes(saved.scene)?saved.scene:'mexico-home';
    this.entry=data.location??(saved.scene===this.place?saved:undefined);
    this.changing=false;this.sleeping=false;this.interrupted=false;this.persistClock=0;
    // Phaser restarts this scene instance between places. A previous gym's
    // destroyed coach must not be animated during the next village frame.
    this.octopus=null;this.pablo=null;
  }
  preload(){
    const base=import.meta.env.BASE_URL,boxing=this.place==='mexico-gym';
    preloadOutfits(this,{street:!boxing,boxing});
    this.load.image(this.place,`${base}assets/mexico/${this.place.replace('mexico-','')}.png`);
    const kind=boxing?'exploration':'street';
    this.load.json('mexico-player-data',`${base}assets/sprites/${kind}/player.json`);
    for(const direction of ['down','right','up','left'])for(let step=0;step<3;step++){
      this.load.image(`mexico-${kind}-${direction}-${step}`,`${base}assets/sprites/${kind}/player-${direction}-${step}.png`);
    }
    if(boxing)for(const pose of ['idle','ready'])this.load.image(`mexico-pablo-${pose}`,`${base}assets/sprites/mexico-pablo/${pose}.png`);
    if(boxing)for(const pose of ['idle','ready'])this.load.image(`mexico-octopus-${pose}`,`${base}assets/sprites/friends/octopus-${pose}.png`);
  }
  create(){
    if(!careerProfile.mexicoStatus().active){
      this.scene.start('MetroScene',{place:MEXICO_RETURN_SPAWN.scene,location:MEXICO_RETURN_SPAWN});return;
    }
    setSceneShell(this.place);
    this.world=new MexicoWorld({place:this.place,position:this.entry});
    const layout=this.world.layout;
    this.doorTravel=new DoorTravel(layout.doors,this.world.state);
    this.add.image(0,0,this.place).setOrigin(0).setDisplaySize(layout.width,layout.height);
    this.addForeground();
    this.actorPrefix=this.place==='mexico-gym'?'mexico-exploration':'mexico-street';
    const meta=this.cache.json.get('mexico-player-data');
    this.shadow=this.add.ellipse(0,0,33,11,0x172323,.24).setScale(layout.actorScale).setDepth(1);
    this.player=this.add.image(0,0,`${this.actorPrefix}-down-0`).setOrigin(meta.anchor.x/meta.width,meta.anchor.y/meta.height).setScale(layout.actorScale);
    this.marker=this.add.graphics().setDepth(2);
    if(this.place==='mexico-gym'){
      this.add.ellipse(430,444,40,12,0x102323,.25).setScale(layout.actorScale).setDepth(1);
      this.octopus=this.add.image(430,441,'mexico-octopus-idle').setOrigin(.5,104/112).setScale(layout.actorScale).setDepth(441);
      this.add.ellipse(1040,565,42,12,0x102323,.25).setDepth(1);
      this.pablo=this.add.image(1040,565,'mexico-pablo-idle').setOrigin(.5,104/112).setScale(layout.actorScale).setDepth(565);
    }
    this.ui=new GymUI({
      onMove:v=>{if(!this.blocked())this.world.setInput(v);},onInteract:()=>this.interact(),
      onPause:()=>{this.persist();this.world.pause();this.refresh();},
      onResume:()=>{if(!this.blocked())this.world.resume();},
      onBlur:()=>{if(this.sleeping)this.interrupted=true;this.persist();this.world.pause();},
      onCloseDialog:()=>{this.ui.closeDialog();this.world.releaseControls();},onDialogAction:action=>this.choose(action.id),
      onExportCareer:()=>{this.persist();downloadCareer();},onInspectCareer:text=>careerProfile.inspectImport(text),
      onImportCareer:text=>{careerProfile.importText(text);this.changing=true;window.dispatchEvent(new CustomEvent('career-imported'));},
      onRefreshCareer:()=>this.refresh(),
    },{eyebrow:'LE CAMP DE BOXE · MEXIQUE',title:layout.name,welcome:layout.name,hint:HINTS[this.place],
      pauseText:'Ton séjour est sauvegardé. La promenade est gratuite, et le vol retour est compris.',
      commandsTitle:'Commandes du séjour',commandsHint:'Avance dans les portes et les passages. E pour parler, utiliser le lit ou choisir le retour. Le ring de Danielo se rejoint par sa porte.'});
    this.refresh();this.renderWorld();this.ui.update(this.world.state);this.persist();
    const camera=this.cameras.main;camera.setBounds(0,0,layout.width,layout.height);camera.centerOn(this.player.x,this.player.y);
    if(layout.width>1280||layout.height>720)camera.startFollow(this.player,true,.12,.12,0,55);
    this.abort=new AbortController();window.addEventListener('pagehide',()=>this.persist(),{signal:this.abort.signal});
    this.resizeObserver=new ResizeObserver(()=>{this.scale.getParentBounds();this.scale.refresh();});this.resizeObserver.observe(document.getElementById('game'));
    let disposed=false;const cleanup=()=>{
      if(disposed)return;disposed=true;this.events.off('shutdown',cleanup);this.events.off('destroy',cleanup);
      this.world.releaseControls();this.ui.destroy();this.abort.abort();this.resizeObserver.disconnect();
      if(import.meta.env.DEV&&window.__mexico?.scene===this)delete window.__mexico;
    };
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
    if(import.meta.env.DEV)window.__mexico={scene:this,world:this.world,ui:this.ui};
  }
  blocked(){return this.changing||this.sleeping||resumePending()||careerMenuOpen();}
  persist(){if(this.world&&!this.changing&&!this.sleeping&&!careerMenuOpen()&&!resumePending())careerProfile.setLocation(this.world.location());}
  refresh(){this.ui?.setCareer(careerProfile.snapshot(),careerProfile.saveStatus());}
  show(title,text,actions=[close],extra={}){this.ui.showDialog({speaker:'LE SÉJOUR AU MEXIQUE',title,text,actions,...extra});}
  interact(){
    if(this.blocked()||this.world.state.paused||this.ui.dialog)return;
    const target=this.world.getNearby();if(!target||target.autoTravel)return;
    this.world.releaseControls();this.persist();
    if(target.id==='bed')this.show('Dormir ?',`Énergie ${careerProfile.dailyStatus().energy}/100. Passer au lendemain et remplir l’énergie de journée. Compétences et séjour conservés.`,[{id:'close',label:'Pas encore'},{id:'sleep',label:'Dormir · Le lendemain'}]);
    else if(target.id==='flight')this.show('Rentrer à Montréal ?',
      'Ton billet de retour est compris dans le séjour. Tu retrouveras l’aéroport de Montréal et sa station de métro. Tes compétences et tes résultats restent sauvegardés. Un prochain séjour demandera un nouveau billet.',
      [{id:'close',label:'Rester au Mexique'},{id:'leave-mexico',label:'Prendre le vol retour · Inclus'}]);
    else if(target.id==='pads'){
      const offer=careerProfile.canStartActivity('pads');
      this.show('Les pads',`Jab dans son pad gauche, direct dans son droit.\n\n45 s · ${offer.cost} énergie.`,
        [{id:'activity-pads',label:'Commencer',disabled:!offer.ok},{id:'close',label:'Retour'}],
        {speaker:'THE OCTOPUS · AUX PADS',image:'assets/sprites/friends/octopus-portrait.png',imageAlt:'The Octopus, barbe et chandail au poulpe blanc'});
    }else if(target.id==='pablo'){
      this.show('Un round avec Pablo ?', 'Observe ses gants et réponds dans l’ouverture.\n\n60 s · 20 énergie.',
        [{id:'pablo-sparring',label:'Commencer',disabled:!careerProfile.canFight('pablo').ok||!careerProfile.canStartActivity('sparring').ok},{id:'close',label:'Retour'}],{speaker:'PABLO · PARTENAIRE DE SPARRING'});
    }else if(target.id==='wardrobe')this.show('Ta valise pour le séjour','Ta tenue de ville et tes vêtements de boxe t’accompagnent. Tu changes automatiquement de tenue en entrant au gym. La garde-robe de la maison et les casiers de Montréal gardent tes autres choix.');
  }
  choose(id){
    if(this.blocked()||this.world.state.paused||!this.ui.dialog)return;
    if(id==='sleep'){this.sleep();return;}
    if(id==='pablo-sparring'){
      if(!careerProfile.canFight('pablo').ok)return;
      careerProfile.setLocation(MEXICO_SPAR_RETURN);this.changing=true;this.ui.clearInputs();this.world.pause();
      this.scene.start('SparringScene',{opponent:'pablo',lesson:'resistance',returnScene:'MexicoScene',returnLocation:MEXICO_SPAR_RETURN});return;
    }
    if(id==='leave-mexico'){
      const result=careerProfile.leaveMexico();if(!result.ok){this.show('Le retour',result.message);return;}
      this.changing=true;this.ui.clearInputs();this.world.pause();
      this.scene.start('MetroScene',{place:result.location.scene,location:result.location});return;
    }
    if(id.startsWith('activity-')){
      const activity=id.slice(9);if(activity!=='pads'||!careerProfile.canStartActivity(activity).ok)return;
      this.persist();this.changing=true;this.ui.clearInputs();this.world.pause();
      careerProfile.setLocation(MEXICO_PADS_RETURN);this.scene.start('HotelActivityScene',{activity:'pads',fromMexico:true});
    }
  }
  crossDoor(id){
    if(this.place==='mexico-arena'&&id==='fight'){
      const offer=careerProfile.canFight('danielo');if(!offer.ok){this.show('Le ring de Danielo',offer.message);return;}
      careerProfile.setLocation(MEXICO_FIGHT_RETURN);this.changing=true;this.ui.clearInputs();this.world.pause();
      this.scene.start('SparringScene',{opponent:'danielo',lesson:'resistance',returnScene:'MexicoScene',returnLocation:MEXICO_FIGHT_RETURN});return;
    }
    const target=mexicoDoorDestination(this.place,id);if(target)this.travel(target.place,target.location);
  }
  travel(place,location){
    if(!MEXICO_LAYOUTS[place])return;
    this.persist();this.changing=true;this.ui.clearInputs();this.world.pause();
    const entry=location??MEXICO_LAYOUTS[place].spawn;careerProfile.setLocation({scene:place,...entry});this.scene.restart({place,location:entry});
  }
  sleep(){
    const result=careerProfile.sleep();if(!result.ok){this.show('Avant de dormir',result.message);return;}
    this.sleeping=true;this.interrupted=false;this.ui.closeDialog();this.world.pause();this.refresh();
    this.cameras.main.fadeOut(400,8,15,23);
    this.cameras.main.once('camerafadeoutcomplete',()=>{
      this.world.restorePosition(MEXICO_HOME_SPAWN);this.world.pause();this.renderWorld();
      this.time.delayedCall(180,()=>{
        this.cameras.main.fadeIn(400,8,15,23);this.cameras.main.once('camerafadeincomplete',()=>{
          this.sleeping=false;if(!this.interrupted&&!this.ui.portraitQuery.matches&&!document.hidden)this.world.resume();
          this.show(`Bon matin · Jour ${careerProfile.dailyStatus().day}`,'Énergie de journée 100/100. Tes compétences sont conservées. Le village, Pablo et le ring de Danielo t’attendent.');this.persist();this.refresh();
        });
      });
    });
  }
  addForeground(){
    // Tall furniture only occludes feet at its actual footprint; the walking
    // character is never hidden behind a full-screen foreground bitmap.
    const regions=this.place==='mexico-village'?[[240,641,280,204,841]]:[];
    for(const [x,y,width,height,depth]of regions)this.add.image(0,0,this.place).setOrigin(0).setCrop(x,y,width,height).setDepth(depth);
  }
  update(_time,delta){
    if(!this.world||!this.ui)return;const wasMoving=this.world.state.moving;
    if(!this.blocked()&&!this.ui.dialog)this.world.update(Math.min((this.game.loop.rawDelta??delta)/1000,.1));
    const door=this.doorTravel.update(this.world.state,this.world.input,this.blocked()||this.world.state.paused||Boolean(this.ui.dialog));if(door)this.crossDoor(door);
    this.persistClock+=delta;if(!this.sleeping&&((wasMoving&&!this.world.state.moving)||this.persistClock>1500)){this.persist();this.persistClock=0;}
    this.renderWorld();this.ui.update(this.world.state);
  }
  renderWorld(){
    const state=this.world.state,step=state.moving&&!state.paused&&!this.ui?.dialog?[0,1,0,2][Math.floor(state.walkTime/.14)%4]:0;
    this.player.setTexture((this.place==='mexico-gym'?boxingTexture:streetTexture)(this,`${this.actorPrefix}-${state.facing}-${step}`)).setPosition(Math.round(state.x),Math.round(state.y)).setDepth(state.y);
    this.shadow.setPosition(state.x,state.y+2);this.marker.clear();
    if(state.nearby&&!state.paused&&!this.ui?.dialog)this.marker.lineStyle(2,0xf0d394,.8).strokeEllipse(state.nearby.x,state.nearby.y+6,48,13);
    if(this.pablo)this.pablo.setTexture(`mexico-pablo-${state.nearby?.id==='pablo'?'ready':'idle'}`);
    if(this.octopus){this.octopus.setTexture(`mexico-octopus-${state.nearby?.id==='pads'?'ready':'idle'}`);this.octopus.y=441+(state.paused||this.ui?.dialog?0:Math.sin(this.time.now/680)*.6);}
  }
}
