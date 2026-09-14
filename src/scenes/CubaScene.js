import {sceneForPlace} from '../game/SceneRouting.js';
import Phaser from 'phaser';
import {CubaWorld,CUBA_LAYOUTS,CUBA_PLACES,CUBA_FIGHT_RETURN,cubaDoorDestination} from '../game/CubaWorld.js';
import {CUBA_HOME_SPAWN,CUBA_RETURN_SPAWN} from '../game/NextChapterRules.js';
import {DoorTravel} from '../game/DoorTravel.js';
import {careerProfile} from '../game/CareerProfile.js';
import {resumePending} from '../game/ResumeRouting.js';
import {GymUI} from '../ui/GymUI.js';
import {careerMenuOpen} from '../ui/GameControls.js';
import {downloadCareer} from '../ui/CareerMenu.js';
import {setSceneShell} from '../ui/SceneShell.js';
import {preloadOutfits,streetTexture,boxingTexture} from './OutfitView.js';

const close={id:'close',label:'Continuer la visite'};
const HINTS={
  'cuba-home':'Le lit pour passer au lendemain. La porte mène au village.',
  'cuba-village':'La casa, le gym et, à l’est, le sentier de la plage. Kiosque VIAJES pour rentrer à Montréal.',
  'cuba-gym':'Fredo aux pads, les sacs en pneus et la corde à danser. Les séances utilisent l’énergie de journée.',
  'cuba-beach':'Longe le sable jusqu’aux marches du ring de Louisto. Le village est à l’ouest.',
};

export class CubaScene extends Phaser.Scene {
  constructor(){super('CubaScene');}
  init(data={}){
    const query=new URLSearchParams(location.search).get('scene'),saved=careerProfile.snapshot().location;
    const requested=data.place??query;
    this.place=CUBA_PLACES.includes(requested)?requested:CUBA_PLACES.includes(saved.scene)?saved.scene:'cuba-home';
    this.entry=data.location??(saved.scene===this.place?saved:undefined);
    this.changing=false;this.sleeping=false;this.interrupted=false;this.persistClock=0;
    // Phaser restarts this scene instance between places. A previous gym's
    // destroyed coach must not be animated during the next village frame.
    this.fredo=null;
  }
  preload(){
    const base=import.meta.env.BASE_URL,boxing=this.place==='cuba-gym';
    preloadOutfits(this,{street:!boxing,boxing});
    this.load.image(this.place,`${base}assets/cuba/${this.place.replace('cuba-','')}.png`);
    const kind=boxing?'exploration':'street';
    this.load.json('cuba-player-data',`${base}assets/sprites/${kind}/player.json`);
    for(const direction of ['down','right','up','left'])for(let step=0;step<3;step++){
      this.load.image(`cuba-${kind}-${direction}-${step}`,`${base}assets/sprites/${kind}/player-${direction}-${step}.png`);
    }
    if(boxing)for(const pose of ['idle','ready'])this.load.image(`cuba-fredo-${pose}`,`${base}assets/sprites/friends/fredo-${pose}.png`);
  }
  create(){
    if(!careerProfile.cubaStatus().active){
      this.scene.start(sceneForPlace(CUBA_RETURN_SPAWN.scene),{place:CUBA_RETURN_SPAWN.scene,location:CUBA_RETURN_SPAWN});return;
    }
    setSceneShell(this.place);
    this.world=new CubaWorld({place:this.place,position:this.entry});
    const layout=this.world.layout;
    this.doorTravel=new DoorTravel(layout.doors,this.world.state);
    this.add.image(0,0,this.place).setOrigin(0);
    this.addForeground();
    this.actorPrefix=this.place==='cuba-gym'?'cuba-exploration':'cuba-street';
    const meta=this.cache.json.get('cuba-player-data');
    this.shadow=this.add.ellipse(0,0,33,11,0x172323,.24).setScale(layout.actorScale).setDepth(1);
    this.player=this.add.image(0,0,`${this.actorPrefix}-down-0`).setOrigin(meta.anchor.x/meta.width,meta.anchor.y/meta.height).setScale(layout.actorScale);
    this.marker=this.add.graphics().setDepth(2);
    if(this.place==='cuba-gym'){
      this.add.ellipse(780,402,40,12,0x102323,.25).setScale(layout.actorScale).setDepth(1);
      this.fredo=this.add.image(780,400,'cuba-fredo-idle').setOrigin(.5,104/112).setScale(layout.actorScale).setDepth(400);
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
    },{eyebrow:'LE CAMP DE BOXE · CUBA',title:layout.name,welcome:layout.name,hint:HINTS[this.place],
      pauseText:'Ton séjour est sauvegardé. Se promener reste gratuit; le retour à Montréal est déjà compris.',
      commandsTitle:'Commandes du séjour',commandsHint:'Avance dans les portes et les passages. E pour parler, utiliser le lit ou choisir le retour. Le ring se rejoint par ses marches.'});
    this.refresh();this.renderWorld();this.ui.update(this.world.state);this.persist();
    const camera=this.cameras.main;camera.setBounds(0,0,layout.width,layout.height);camera.centerOn(this.player.x,this.player.y);
    if(layout.width>1280||layout.height>720)camera.startFollow(this.player,true,.12,.12,0,55);
    this.abort=new AbortController();window.addEventListener('pagehide',()=>this.persist(),{signal:this.abort.signal});
    this.resizeObserver=new ResizeObserver(()=>{this.scale.getParentBounds();this.scale.refresh();});this.resizeObserver.observe(document.getElementById('game'));
    let disposed=false;const cleanup=()=>{
      if(disposed)return;disposed=true;this.events.off('shutdown',cleanup);this.events.off('destroy',cleanup);
      this.world.releaseControls();this.ui.destroy();this.abort.abort();this.resizeObserver.disconnect();
      if(import.meta.env.DEV&&window.__cuba?.scene===this)delete window.__cuba;
    };
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
    if(import.meta.env.DEV)window.__cuba={scene:this,world:this.world,ui:this.ui};
  }
  blocked(){return this.changing||this.sleeping||resumePending()||careerMenuOpen();}
  persist(){if(this.world&&!this.changing&&!this.sleeping&&!careerMenuOpen()&&!resumePending())careerProfile.setLocation(this.world.location());}
  refresh(){this.ui?.setCareer(careerProfile.snapshot(),careerProfile.saveStatus());}
  show(title,text,actions=[close],extra={}){this.ui.showDialog({speaker:'LE SÉJOUR À CUBA',title,text,actions,...extra});}
  interact(){
    if(this.blocked()||this.world.state.paused||this.ui.dialog)return;
    const target=this.world.getNearby();if(!target||target.autoTravel)return;
    this.world.releaseControls();this.persist();
    if(target.id==='bed')this.show('Dormir jusqu’à demain ?',`Énergie ${careerProfile.dailyStatus().energy}/100. Une nuit passe au jour suivant et remplit l’énergie de journée. Tes compétences, ton argent et ton séjour sont conservés; aucun bonus supplémentaire.`,[{id:'close',label:'Pas encore'},{id:'sleep',label:'Dormir · Le lendemain'}]);
    else if(target.id==='flight')this.show('Rentrer à Montréal ?',
      'Ton billet de retour est compris dans le séjour. Tu retrouveras Des Rives, près de la station de métro. Tes compétences et tes résultats restent sauvegardés. Un prochain séjour demandera un nouveau billet.',
      [{id:'close',label:'Rester à Cuba'},{id:'leave-cuba',label:'Prendre le vol retour · Inclus'}]);
    else if(target.id==='pads'){
      const offer=careerProfile.canStartActivity('pads');
      this.show('On fait quelques pads ?',
        'Même boxe, nouvel endroit. Observe le pad que je présente : ton jab croise vers ma main gauche; ton direct vers ma droite. La cible reste présentée jusqu’au bon coup.\n\n45 secondes · 10 énergie au démarrage. Une bonne séance travaille ta puissance jusqu’à ton plafond.',
        [{id:'activity-pads',label:'Les pads · 10 énergie',disabled:!offer.ok},{id:'fredo-advice',label:'Un conseil sur Louisto'},close],
        {speaker:'FREDO · TON COACH',image:'assets/sprites/friends/fredo-portrait.png',imageAlt:'Fredo en survêtement bleu marine'});
    }else if(target.id==='bag'||target.id==='rope'){
      const activity=target.id,offer=careerProfile.canStartActivity(activity);
      this.show(activity==='bag'?'Au sac en pneus':'La corde à danser',
        activity==='bag'?'Les pneus servent de sac de frappe. Travaille tes enchaînements avec les mêmes jabs et directs, puis replace ta garde. La séance reprend les règles de l’atelier du gym.\n\n15 énergie au démarrage; résultats et compétences restent sauvegardés.'
          :'Sur le béton du gym, alterne les appuis au passage de la corde. La séance conserve les mêmes commandes et objectifs que chez toi.\n\n15 énergie au démarrage; une séance réussie travaille l’endurance jusqu’à ton plafond.',
        [{id:`activity-${activity}`,label:'Commencer · 15 énergie',disabled:!offer.ok},close]);
    }else if(target.id==='wardrobe')this.show('Ta valise pour le séjour','Ta tenue de ville et tes vêtements de boxe t’accompagnent. Tu changes automatiquement de tenue en entrant au gym. La garde-robe de la maison et les casiers de Montréal gardent tes autres choix.');
  }
  choose(id){
    if(this.blocked()||this.world.state.paused||!this.ui.dialog)return;
    if(id==='sleep'){this.sleep();return;}
    if(id==='fredo-advice'){
      this.show('Avant le ring de la plage',
        'Louisto a son propre rythme. Regarde ses épaules et ses gants avant de répondre. Garde de l’endurance pour te défendre, puis vise les ouvertures. Le combat ne coûte pas d’énergie de journée : entraîne-toi et rejoins les marches du ring quand tu veux.',[close],{speaker:'FREDO · DANS TON COIN'});return;
    }
    if(id==='leave-cuba'){
      const result=careerProfile.leaveCuba();if(!result.ok){this.show('Le retour',result.message);return;}
      this.changing=true;this.ui.clearInputs();this.world.pause();
      this.scene.start(sceneForPlace(result.location.scene),{place:result.location.scene,location:result.location});return;
    }
    if(id.startsWith('activity-')){
      const activity=id.slice(9);if(!['bag','rope','pads'].includes(activity)||!careerProfile.canStartActivity(activity).ok)return;
      this.persist();this.changing=true;this.ui.clearInputs();this.world.pause();
      this.scene.start({bag:'BagScene',rope:'RhythmScene',pads:'HotelActivityScene'}[activity],{activity,fromCuba:true});
    }
  }
  crossDoor(id){
    if(this.place==='cuba-beach'&&id==='fight'){
      const offer=careerProfile.canFight('louisto');if(!offer.ok){this.show('Le ring de Louisto',offer.message);return;}
      careerProfile.setLocation(CUBA_FIGHT_RETURN);this.changing=true;this.ui.clearInputs();this.world.pause();
      this.scene.start('SparringScene',{opponent:'louisto',lesson:'resistance',fromCuba:true});return;
    }
    const target=cubaDoorDestination(this.place,id);if(target)this.travel(target.place,target.location);
  }
  travel(place,location){
    if(!CUBA_LAYOUTS[place])return;
    this.persist();this.changing=true;this.ui.clearInputs();this.world.pause();
    const entry=location??CUBA_LAYOUTS[place].spawn;careerProfile.setLocation({scene:place,...entry});this.scene.restart({place,location:entry});
  }
  sleep(){
    const result=careerProfile.sleep();if(!result.ok){this.show('Avant de dormir',result.message);return;}
    this.sleeping=true;this.interrupted=false;this.ui.closeDialog();this.world.pause();this.refresh();
    this.cameras.main.fadeOut(400,8,15,23);
    this.cameras.main.once('camerafadeoutcomplete',()=>{
      this.world.restorePosition(CUBA_HOME_SPAWN);this.world.pause();this.renderWorld();
      this.time.delayedCall(180,()=>{
        this.cameras.main.fadeIn(400,8,15,23);this.cameras.main.once('camerafadeincomplete',()=>{
          this.sleeping=false;if(!this.interrupted&&!this.ui.portraitQuery.matches&&!document.hidden)this.world.resume();
          this.show(`Bon matin · Jour ${careerProfile.dailyStatus().day}`,'Énergie de journée 100/100. Tes compétences sont conservées. Le village, le gym et le ring de la plage t’attendent.');this.persist();this.refresh();
        });
      });
    });
  }
  addForeground(){
    const regions=this.place==='cuba-village'?[[280,588,330,265,852]]:
      this.place==='cuba-home'?[[0,568,555,140,705],[727,568,553,140,705]]:
        this.place==='cuba-gym'?[[0,558,558,151,705],[727,558,553,151,705]]:[];
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
    this.player.setTexture((this.place==='cuba-gym'?boxingTexture:streetTexture)(this,`${this.actorPrefix}-${state.facing}-${step}`)).setPosition(Math.round(state.x),Math.round(state.y)).setDepth(state.y);
    this.shadow.setPosition(state.x,state.y+2);this.marker.clear();
    if(state.nearby&&!state.paused&&!this.ui?.dialog)this.marker.lineStyle(2,0xf0d394,.8).strokeEllipse(state.nearby.x,state.nearby.y+6,48,13);
    if(this.fredo){this.fredo.setTexture(`cuba-fredo-${state.nearby?.id==='pads'?'ready':'idle'}`);this.fredo.y=400+(state.paused||this.ui?.dialog?0:Math.sin(this.time.now/680)*.6);}
  }
}
