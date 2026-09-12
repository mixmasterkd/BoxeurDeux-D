import Phaser from 'phaser';
import {hotelBoard} from '../game/HotelBoard.js';
import { HotelWorld, HOTEL_LAYOUTS, HOTEL_PLACES } from '../game/HotelWorld.js';
import { careerProfile } from '../game/CareerProfile.js';
import { MEDAL_LABELS } from '../game/ChapterRules.js';
import { resumePending } from '../game/ResumeRouting.js';
import { GymUI } from '../ui/GymUI.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { downloadCareer } from '../ui/CareerMenu.js';
import { setSceneShell } from '../ui/SceneShell.js';
import '../ui/hotel.css';
import { preloadOutfits,streetTexture,boxingTexture } from './OutfitView.js';
const close={id:'close',label:'Continuer la visite →'};
const NAMES={bellini:'Marco Bellini',fortin:'Louis « Le Roc » Fortin',gagnon:'André « Le Patron » Gagnon'};
const TALK={bellini:'Je reste léger sur les appuis. Pour me toucher, il faudra trouver mon rythme.',fortin:'Je viens pour avancer. Mais même une bonne garde a ses ouvertures.',gagnon:'Trois jours, trois combats. Économise tes gestes et observe jusqu’au dernier round.',
  bouchard:'Premiers Gants de bronze pour moi aussi. On va tout donner.',roy:'Le bruit des gradins, ça change du gym !',nguyen:'Je prends des notes entre les rencontres. Chaque boxeur a ses habitudes.',santos:'Bonne chance pour ton combat. On se croise au tableau.'};
export class HotelScene extends Phaser.Scene {
  constructor(){super('HotelScene');}
  init(data={}){
    const requested=data.place??new URLSearchParams(location.search).get('scene'),saved=careerProfile.snapshot().location;
    this.place=HOTEL_PLACES.includes(requested)?requested:HOTEL_PLACES.includes(saved.scene)?saved.scene:'hotel-room';
    this.entry=data.location??(saved.scene===this.place?saved:undefined);
    this.changing=false;this.sleeping=false;this.interrupted=false;this.persistClock=0;
  }
  preload(){
    const base=import.meta.env.BASE_URL;preloadOutfits(this,{street:true,boxing:true});
    this.load.image(this.place,`${base}assets/hotel/${this.place.replace('hotel-','')}.png`);
    for(const direction of ['down','right','up','left'])for(let step=0;step<3;step++){
      this.load.image(`hotel-player-${direction}-${step}`,`${base}assets/sprites/street/player-${direction}-${step}.png`);
      this.load.image(`hotel-boxer-${direction}-${step}`,`${base}assets/sprites/exploration/player-${direction}-${step}.png`);
    }
    this.load.json('hotel-player-data',`${base}assets/sprites/street/player.json`);
    this.load.json('hotel-boxer-data',`${base}assets/sprites/exploration/player.json`);
    this.load.image('hotel-remi',`${base}assets/sprites/exploration/remi.png`);
    this.load.json('hotel-remi-data',`${base}assets/sprites/exploration/remi.json`);
    if(this.place==='hotel-venue')for(const id of ['bellini','fortin','gagnon','kramer'])this.load.image(`hotel-participant-${id}`,`${base}assets/sprites/chapter-combat/${id}/${id}-guard.png`);
    if(this.place==='hotel-venue')for(const fighter of ['competition','bellini','fortin','gagnon']){
      this.load.json(`hotel-ambient-${fighter}-data`,`${base}assets/sprites/chapter-combat/${fighter}/fighters.json`);
      for(const pose of ['guard','jab','block'])this.load.image(`hotel-ambient-${fighter}-${pose}`,`${base}assets/sprites/chapter-combat/${fighter}/${fighter}-${pose}.png`);
    }
  }
  create(){
    if(!careerProfile.tournamentStatus().active){this.scene.start('ExplorationScene',{place:'neighborhood',entrance:'fight'});return;}
    setSceneShell(this.place);
    this.world=new HotelWorld({place:this.place,position:this.entry});const layout=this.world.layout;
    this.add.image(0,0,this.place).setOrigin(0).setDisplaySize(layout.width,layout.height);
    this.actorPrefix=this.place==='hotel-gym'?'hotel-boxer':'hotel-player';
    const meta=this.cache.json.get(this.place==='hotel-gym'?'hotel-boxer-data':'hotel-player-data');
    this.player=this.add.image(0,0,`${this.actorPrefix}-down-0`).setOrigin(meta.anchor.x/meta.width,meta.anchor.y/meta.height).setScale(layout.actorScale);
    this.shadow=this.add.ellipse(0,0,34*layout.actorScale,12*layout.actorScale,0x081924,.24).setDepth(1);
    this.marker=this.add.graphics().setDepth(2);this.addPeople();this.addRingAmbience();
    this.ui=new GymUI({
      onMove:v=>{if(!this.blocked())this.world.setInput(v);},onInteract:()=>this.interact(),
      onPause:()=>{this.persist();this.world.pause();this.refresh();},
      onResume:()=>{if(!this.blocked())this.world.resume();},
      onBlur:()=>{if(this.sleeping)this.interrupted=true;this.persist();this.world.pause();},
      onCloseDialog:()=>{this.ui.closeDialog();this.world.releaseControls();},
      onDialogAction:action=>this.choose(action.id),onExportCareer:()=>{this.persist();downloadCareer();},
      onInspectCareer:text=>careerProfile.inspectImport(text),onImportCareer:text=>{careerProfile.importText(text);this.changing=true;window.dispatchEvent(new CustomEvent('career-imported'));},
      onRefreshCareer:()=>this.refresh(),
    },{eyebrow:'LES GANTS DE BRONZE · HÔTEL',title:layout.name,welcome:layout.name,hint:this.hint(),
      pauseText:'Ton séjour est sauvegardé. Marcher et visiter ne coûtent aucune énergie.',commandsTitle:'Commandes de l’hôtel',
      commandsHint:'Marche jusqu’à une porte, l’ascenseur, Rémi ou le tableau, puis interagis. Chambre 201 pour dormir après le combat.'});
    this.refresh();this.renderWorld();this.ui.update(this.world.state);this.persist();
    this.cameras.main.setBounds(0,0,layout.width,layout.height);this.cameras.main.centerOn(this.player.x,this.player.y);
    if(layout.width>1280||layout.height>720)this.cameras.main.startFollow(this.player,true,.12,.12,0,55);
    this.abort=new AbortController();window.addEventListener('pagehide',()=>this.persist(),{signal:this.abort.signal});
    this.resizeObserver=new ResizeObserver(()=>{this.scale.getParentBounds();this.scale.refresh();});this.resizeObserver.observe(document.getElementById('game'));
    let disposed=false;const cleanup=()=>{if(disposed)return;disposed=true;this.events.off('shutdown',cleanup);this.events.off('destroy',cleanup);this.world.releaseControls();this.ui.destroy();this.abort.abort();this.resizeObserver.disconnect();if(import.meta.env.DEV&&window.__hotel?.scene===this)delete window.__hotel;};
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
    if(import.meta.env.DEV)window.__hotel={scene:this,world:this.world,ui:this.ui};
  }
  blocked(){return this.changing||this.sleeping||resumePending()||careerMenuOpen();}
  hint(){return this.place==='hotel-room'?'Chambre 201. Le lit pour dormir, la porte pour sortir.':this.place==='hotel-corridor'?'Ta chambre à gauche; l’ascenseur au bout du couloir.':this.place==='hotel-venue'?'Le tableau au centre, ton combat au ring 1.':this.place==='hotel-gym'?'Approche-toi de Rémi pour les pads.':this.place==='hotel-pool'?'Entre dans l’eau par l’échelle, à gauche.':'L’ascenseur dessert les chambres et les installations.';}
  refresh(){this.ui?.setCareer(careerProfile.snapshot(),careerProfile.saveStatus());}
  persist(){if(this.world&&!this.changing&&!careerMenuOpen()&&!resumePending())careerProfile.setLocation(this.world.location());}
  show(title,text,actions=[close],speaker='LES GANTS DE BRONZE'){this.ui.showDialog({title,text,actions,speaker});}
  interact(){
    if(this.blocked()||this.world.state.paused||this.ui.dialog)return;
    const target=this.world.getNearby();if(!target)return;
    this.world.releaseControls();this.persist();const status=careerProfile.tournamentStatus(),run=status.active;
    if(target.id==='exit'){
      if(this.place==='hotel-room')this.travel('hotel-corridor',{x:496,y:420,facing:'down'});
      else if(this.place==='hotel-lobby')this.showLeave();
      else this.showLift();
    }else if(target.id==='lift')this.showLift();
    else if(target.id==='room')this.travel('hotel-room',{x:640,y:610,facing:'up'});
    else if(target.id==='bed'){
      if(run.status==='ready')this.show('Ton combat reste à faire.',`Jour ${run.day} · ${status.roundLabel}. ${NAMES[status.opponent]} t’attend au ring 1. Le sommeil fera avancer le tournoi après ton combat.`,[close]);
      else this.show('Dormir jusqu’à demain ?',`Énergie ${careerProfile.dailyStatus().energy}/100. Une nuit remplit l’énergie quotidienne et conserve tes compétences.${run.status==='awaiting-sleep'?`\n\nVictoire enregistrée. Au réveil : jour ${run.day+1} du tournoi.`:'\n\nTon résultat est enregistré. Tu peux rester profiter de l’hôtel ou rentrer au quartier.'}`,[{id:'close',label:'Pas encore'},{id:'sleep',label:'Dormir → Le lendemain'}]);
    }else if(target.id==='board'||target.id==='notebook')this.showBoard();
    else if(target.id==='fight')this.showFight();
    else if(target.id==='pads'||target.id==='swim'){
      const activity=target.id==='pads'?'pads':'pool',offer=careerProfile.canStartActivity(activity);
      this.show(activity==='pads'?'Les pads avec Rémi':'Quelques longueurs',activity==='pads'?'Une courte séance : Rémi présente ses cibles, puis demande une garde ou une esquive. Mêmes commandes qu’en combat.\n\n45 secondes · 12 mouvements et 60 % de précision pour travailler la puissance.':'Alterne les bras pour traverser le bassin. Douze bonnes poussées font une longueur.\n\n45 secondes · 3 longueurs et 60 % de précision pour travailler l’endurance. Aucune récupération d’énergie quotidienne.',[
        {id:`activity-${activity}`,label:`Commencer · ${offer.cost} énergie →`,disabled:!offer.ok},close,
      ]);
    }else if(target.id==='coach'||target.id==='remi')this.show('Une chose à la fois.',run.status==='ready'?`Aujourd’hui : ${NAMES[status.opponent]}. ${run.day===1?'Observe son jab et réponds dans l’ouverture.':run.day===2?'Le Roc avance derrière sa garde. Ses attaques au corps le découvrent.':'Le Patron mélange les rythmes. Tu connais déjà les défenses : garde ton calme.'}\n\nTu peux travailler aux pads au mini-gym. Garde de l’énergie, mais ton combat reste toujours accessible.`:'Beau travail. Consulte le tableau et retourne à ta chambre pour la suite. Ton résultat est déjà sauvegardé.',[close],'RÉMI · TON COACH');
    else if(target.id==='reception')this.show('Bienvenue aux Gants de bronze.',`Chambre 201 · Jour ${run.day} du tournoi.\n\nL’inscription comprend la chambre, le mini-gym et la piscine. Les rencontres ont lieu dans la salle d’événement. L’ascenseur te conduit à chaque étage.\n\n${run.medal?MEDAL_LABELS[run.medal]+' enregistrée.':'Quart, demi-finale, finale : un combat par jour.'}`,[{id:'board',label:'Voir les participants'},close]);
    else if(target.id==='wardrobe')this.show('La valise du séjour','Ta tenue de ville t’accompagne à l’hôtel. Tu choisis tes tenues dans la garde-robe de ta maison; Rémi prépare l’uniforme de compétition avant le combat.',[close]);
    else if(target.id.startsWith('ring'))this.show(`Au ${target.label.split(' · ')[0].toLowerCase()}`,'Les autres catégories s’échauffent et disputent leurs rencontres. Ton parcours se joue au ring 1; le tableau central présente les huit participants de ta catégorie.',[close]);
    else {
      const id=target.id.startsWith('room-')?({'room-202':'bellini','room-203':'fortin','room-204':'gagnon'}[target.id]):target.id;
      this.show(NAMES[id]??status.participants.find(p=>p.id===id)?.name??'Un participant',TALK[id]??'Bonne chance pour le tournoi.',[close],'DANS LES COULISSES');
    }
  }
  showLift(){this.show('Ascenseur', 'Choisis ton étage, puis marche jusqu’à ta destination.',[
    {id:'travel-hotel-corridor',label:'2 · Chambres · Ta chambre 201'},
    {id:'travel-hotel-gym',label:'1 · Mini-gym · Pads avec Rémi'},
    {id:'travel-hotel-pool',label:'1 · Piscine'},
    {id:'travel-hotel-venue',label:'R · Salle d’événement · 4 rings'},
    {id:'travel-hotel-lobby',label:'R · Réception et sortie'},close,
  ]);}
  showBoard(){const status=careerProfile.tournamentStatus();this.show(`Tableau · Jour ${status.active.day}`,hotelBoard(status),[close]);}
  showFight(){const status=careerProfile.tournamentStatus(),run=status.active;
    if(run.status==='ready')this.show(`${status.roundLabel} · ${NAMES[status.opponent]}`,'Ton combat se dispute au ring 1. Rémi est dans ton coin. L’uniforme de compétition est préparé pour toi.\n\nAucun coût d’énergie quotidienne. La rencontre commence avec tes capacités entraînées.',[{id:'tournament-fight',label:'Rejoindre le ring →'},close]);
    else if(run.status==='awaiting-sleep')this.show('Victoire !',`Tu es qualifié pour ${run.day===1?'la demi-finale':'la finale'}.\n\nRetourne dans ta chambre et dors pour passer au jour ${run.day+1}.`,[{id:'board',label:'Voir le tableau'},close]);
    else this.show(run.status==='champion'?'Champion des Gants de bronze !':'Ton parcours est terminé.',`${MEDAL_LABELS[run.medal]}. Ta récompense est sauvegardée et sera exposée à la maison.\n\nTu peux continuer la visite de l’hôtel ou rentrer au quartier.`,[{id:'board',label:'Voir le tableau'},{id:'leave-confirm',label:'Rentrer au quartier'},close]);
  }
  showLeave(){const run=careerProfile.tournamentStatus().active;this.show('Rentrer au quartier ?',run.status==='ready'||run.status==='awaiting-sleep'?'Le tournoi est encore en cours. Rentrer maintenant termine ton inscription. Tu pourras revenir pour une nouvelle édition; les frais déjà payés ne sont pas remboursés.':'Ton résultat et ta récompense sont déjà sauvegardés. Retrouve ton quartier et ta maison quand tu le souhaites.',[{id:'close',label:'Rester à l’hôtel'},{id:'leave',label:'Terminer le séjour et rentrer →'}]);}
  choose(id){
    if(this.blocked()||this.world.state.paused||!this.ui.dialog)return;
    if(id.startsWith('travel-'))this.travel(id.slice(7));
    else if(id==='board')this.showBoard();
    else if(id==='leave-confirm')this.showLeave();
    else if(id==='sleep')this.sleep();
    else if(id==='leave'){
      const result=careerProfile.leaveTournament();if(!result.ok){this.show('Le séjour',result.message);return;}
      this.changing=true;this.ui.clearInputs();this.world.pause();this.scene.start('ExplorationScene',{place:'neighborhood',entrance:'fight'});
    }else if(id==='tournament-fight'){
      const status=careerProfile.tournamentStatus();if(status.active?.status!=='ready')return;
      this.persist();this.changing=true;this.ui.clearInputs();this.world.pause();
      this.scene.start('SparringScene',{opponent:status.opponent,tournament:true,matchId:status.currentMatchId});
    }else if(id.startsWith('activity-')){
      const activity=id.slice(9);if(!['pads','pool'].includes(activity))return;
      this.persist();this.changing=true;this.ui.clearInputs();this.world.pause();this.scene.start('HotelActivityScene',{activity});
    }
  }
  travel(place,position){
    if(!HOTEL_LAYOUTS[place])return;this.persist();this.changing=true;this.ui.clearInputs();this.world.pause();
    const entry=position??HOTEL_LAYOUTS[place].spawn;
    careerProfile.setLocation({scene:place,...entry});this.scene.restart({place,location:entry});
  }
  sleep(){
    const result=careerProfile.sleep();if(!result.ok){this.show('Avant de dormir',result.message);return;}
    this.sleeping=true;this.interrupted=false;this.ui.closeDialog();this.world.pause();
    Object.assign(this.world.state,{x:894,y:392,facing:'down'});this.persist();this.refresh();
    this.cameras.main.fadeOut(450,8,15,23);
    this.cameras.main.once('camerafadeoutcomplete',()=>this.time.delayedCall(250,()=>{
      this.cameras.main.fadeIn(450,8,15,23);
      this.cameras.main.once('camerafadeincomplete',()=>{
        this.sleeping=false;if(!this.interrupted&&!this.ui.portraitQuery.matches&&!document.hidden)this.world.resume();
        const status=careerProfile.tournamentStatus();this.show(`Bon matin · Jour ${status.active.day} du tournoi`,`Énergie ${careerProfile.dailyStatus().energy}/100. Tes compétences sont conservées.\n\n${status.active.status==='ready'?`${NAMES[status.opponent]} t’attend pour ${status.roundLabel.toLowerCase()}.`:'Ton résultat est enregistré. Profite de l’hôtel ou rentre au quartier.'}`);this.refresh();
      });
    }));
  }
  addPeople(){
    this.people=[];const list=this.place==='hotel-venue'?[
      {id:'coach',key:'hotel-remi',x:1150,y:672,scale:1.65},
      {id:'bellini',x:770,y:1150,tint:0xc4d6ff},{id:'fortin',x:1705,y:1150,tint:0xd1e3c8},{id:'gagnon',x:1150,y:275,tint:0xffd6ae},
      {id:'bouchard',x:311,y:1337,tint:0xd6c9f5},{id:'roy',x:1960,y:1305,tint:0xd8deed},{id:'nguyen',x:400,y:1170,tint:0xf0daa9},{id:'santos',x:1900,y:1170,tint:0xc4e1dd},
    ]:this.place==='hotel-gym'?[{id:'pads',key:'hotel-remi',x:740,y:380,scale:2}]:[];
    for(const [i,p]of list.entries()){
      const participant=({bellini:'bellini',fortin:'fortin',gagnon:'gagnon',bouchard:'kramer',roy:'fortin',nguyen:'bellini',santos:'gagnon'})[p.id];
      const key=p.key??(participant?`hotel-participant-${participant}`:'hotel-boxer-down-0'),meta=participant?{width:640,height:640,anchor:{x:320,y:624}}:this.cache.json.get(p.key?'hotel-remi-data':'hotel-boxer-data');
      this.add.ellipse(p.x,p.y,40,12,0x102021,.24).setDepth(1);
      const sprite=this.add.image(p.x,p.y,key).setOrigin(meta.anchor.x/meta.width,meta.anchor.y/meta.height).setScale(p.scale??(participant?.25:1.45)).setDepth(p.y);
      if(p.tint)sprite.setTint(p.tint);this.people.push({...p,sprite,phase:i*1.7});
      if(!this.world.layout.stations.some(s=>s.id===p.id))this.world.layout.stations.push({id:p.id,label:careerProfile.tournamentStatus().participants.find(x=>x.id===p.id)?.name??'Un participant',x:p.x,y:p.y,radius:75});
    }
  }
  addRingAmbience(){
    this.ringPeople=[];if(this.place!=='hotel-venue')return;
    for(const [i,[x,y]]of [[765,380],[1520,380],[745,824],[1550,824]].entries()){
      // Small independent exhibition bouts decorate the four physical rings.
      // Their animations never affect the player's tournament results.
      const rival=['bellini','fortin','gagnon','bellini'][i];
      const makeFighter=(id,px,py,depth)=>{
        const meta=this.cache.json.get(`hotel-ambient-${id}-data`).poses[`${id}-guard`];
        return this.add.image(px,py,`hotel-ambient-${id}-guard`).setOrigin(meta.anchor.x/meta.width,meta.anchor.y/meta.height).setScale(.23).setDepth(depth);
      };
      const back=makeFighter('competition',x-28,y+39,y+40);
      const front=makeFighter(rival,x+27,y-8,y-8);
      this.ringPeople.push({back,front,rival,x,y,phase:i*.77});
      this.add.text(x-165,y-158,`RING ${i+1}`,{fontFamily:'monospace',fontSize:'17px',fontStyle:'bold',color:'#ead9ad',backgroundColor:'#17313ccc',padding:{x:8,y:4}}).setDepth(3);
    }
  }
  update(_time,delta){
    if(!this.world||!this.ui)return;const moving=this.world.state.moving;
    if(!this.blocked()&&!this.ui.dialog)this.world.update(Math.min((this.game.loop.rawDelta??delta)/1000,.1));
    this.persistClock+=delta;if(!this.sleeping&&((moving&&!this.world.state.moving)||this.persistClock>1500)){this.persist();this.persistClock=0;}
    this.renderWorld();this.ui.update(this.world.state);
  }
  renderWorld(){
    const s=this.world.state,step=s.moving&&!s.paused&&!this.ui?.dialog?[0,1,0,2][Math.floor(s.walkTime/.14)%4]:0;
    this.player.setTexture((this.place==='hotel-gym'?boxingTexture:streetTexture)(this,`${this.actorPrefix}-${s.facing}-${step}`)).setPosition(Math.round(s.x),Math.round(s.y)).setDepth(s.y);this.shadow.setPosition(s.x,s.y+1);
    this.marker.clear();if(s.nearby&&!s.paused&&!this.ui?.dialog)this.marker.lineStyle(2,0xe9c67c,.85).strokeEllipse(s.nearby.x,s.nearby.y+8,52,16);
    if(!s.paused&&!this.ui?.dialog){
      for(const p of this.people??[])p.sprite.y=p.y+Math.sin(this.time.now/550+p.phase)*1.2;
      for(const p of this.ringPeople??[]){const t=(this.time.now/1000+p.phase)%3.1;
        p.back.setTexture(`hotel-ambient-competition-${t<.22?'jab':t>1.55&&t<1.85?'block':'guard'}`).setPosition(p.x-28+Math.sin(t*2)*5,p.y+39);
        p.front.setTexture(`hotel-ambient-${p.rival}-${t>1.55&&t<1.78?'jab':t<.3?'block':'guard'}`).setPosition(p.x+27,p.y-8+Math.sin(t*2)*4);
      }
    }
  }
}
