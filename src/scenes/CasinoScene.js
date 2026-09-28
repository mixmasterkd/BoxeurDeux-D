import { ExplorationScene } from './ExplorationScene.js';
import { CasinoWorld, CASINO_PLACES, CASINO_NAMES, CASINO_ISLAND_RETURN, casinoFloorDestination, karlGreeting, casinoPoint } from '../game/CasinoWorld.js';
import { careerProfile } from '../game/CareerProfile.js';
import { startAt } from '../game/SceneRouting.js';
import { resumePending } from '../game/ResumeRouting.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { CasinoTableUI } from '../ui/CasinoTableUI.js';

const close = {id:'close',label:'Continuer la visite'};
const floors = ['Rez-de-chaussée · Accueil et machines','1er étage · Blackjack et roulette','2e étage · Salon de poker'];

export class CasinoScene extends ExplorationScene {
  constructor(){super('CasinoScene');}
  init(data={}) {
    const entry=new URLSearchParams(location.search).get('scene'),profile=careerProfile.snapshot(),saved=profile.location;
    const requested=profile.casino?.active&&!profile.casino.active.settled?saved.scene:data.place??entry;
    const place=CASINO_PLACES.includes(requested)?requested:CASINO_PLACES.includes(saved.scene)?saved.scene:'casino-lobby';
    super.init({...data,place});
    this.actorScale=1.5;this.tableUi=null;this.karl=null;this.crowd=[];this.audioContext=null;this.ambienceClock=0;this.ambienceMuted=false;this.ambienceVolume=.35;
    this.assetPath=`assets/casino/${place.slice(7)==='tables'?'tables':place.slice(7)}.png`;
    this.placeCopy={
      eyebrow:'MONTRÉAL · UNE SOIRÉE AU CASINO',title:CASINO_NAMES[place],welcome:CASINO_NAMES[place],
      hint:'Ascenseur au fond. Approche-toi d’une table pour jouer ou discuter.',
      pauseText:'Aucune énergie dépensée ici. Tes jetons et ta partie sont sauvegardés.',
      commandsTitle:'Une soirée au casino',
      commandsHint:'Flèches ou WASD pour marcher. E pour parler, utiliser l’ascenseur ou choisir une table. Les parties se jouent aussi au tactile.',
    };
  }
  makeWorld(){return new CasinoWorld({place:this.place,position:this.entryPosition});}
  preload() {
    super.preload();const base=import.meta.env.BASE_URL;
    this.load.image('casino-karl',`${base}assets/casino/karl.png`);
    for(let pose=0;pose<4;pose++)this.load.image(`casino-karl-${pose}`,`${base}assets/casino/karl-${pose}.png`);
    for(let person=0;person<4;person++)for(const pose of ['','-talk'])
      this.load.image(`casino-guest-${person}${pose}`,`${base}assets/casino/guest-${person}${pose}.png`);
  }
  create() {
    if(!careerProfile.casinoStatus().unlocked){
      careerProfile.setLocation(CASINO_ISLAND_RETURN);this.changingPlace=true;
      this.scene.start('CasinoIslandScene',{place:CASINO_ISLAND_RETURN.scene,location:CASINO_ISLAND_RETURN});return;
    }
    super.create();if(this.changingPlace)return;
    this.tableUi=new CasinoTableUI({scene:this,onClose:()=>{
      this.ui.closeDialog();this.world.releaseControls();this.refreshProfile();this.persistLocation();
    }});
    this.ui.callbacks.onCloseDialog=()=>{
      if(this.tableUi?.opened)this.tableUi.back();
      else this.ui.closeDialog();
      this.world.releaseControls();
    };
    this.addGuests();this.cameras.main.setFollowOffset(0,this.place==='casino-poker'?320:240);
    try{const audio=JSON.parse(localStorage.getItem('boxeurdeux-d:audio:v1')??'null');this.ambienceMuted=Boolean(audio?.muted);this.ambienceVolume=typeof audio?.volume==='number'?Math.max(0,Math.min(1,audio.volume)):.35;}catch{}
    const soundButton=document.createElement('button');soundButton.type='button';soundButton.className='casino-ambience-toggle gym-dialog-button';soundButton.style.cssText='font:inherit;margin-top:8px;padding:10px;cursor:pointer';
    const refreshSound=()=>{soundButton.textContent=`Ambiance du casino : ${this.ambienceMuted?'coupée':'activée'}`;soundButton.setAttribute('aria-pressed',String(!this.ambienceMuted));};
    refreshSound();soundButton.addEventListener('click',()=>{this.ambienceMuted=!this.ambienceMuted;try{localStorage.setItem('boxeurdeux-d:audio:v1',JSON.stringify({muted:this.ambienceMuted,volume:this.ambienceVolume}));}catch{}refreshSound();});
    this.ui.elements['gym-pause-panel'].querySelector('.snes-choices').append(soundButton);
    const unlockAudio=()=>this.unlockAmbience();
    window.addEventListener('pointerdown',unlockAudio,{signal:this.abort.signal});
    window.addEventListener('keydown',unlockAudio,{signal:this.abort.signal});
    this.casinoReadout=document.createElement('div');this.casinoReadout.className='sr-only';
    this.casinoReadout.setAttribute('role','status');this.ui.root.append(this.casinoReadout);
    this.refreshCasinoReadout();
    this.events.once('shutdown',()=>{
      this.tableUi?.destroy();this.casinoReadout?.remove();this.audioContext?.close().catch(()=>{});
      if(window.__casino?.scene===this)delete window.__casino;
    });
    if(import.meta.env.DEV)window.__casino={scene:this,world:this.world,ui:this.ui,table:this.tableUi};
    const active=careerProfile.casinoStatus().active;
    if(active)this.time.delayedCall(100,()=>{if(!this.changingPlace)this.enterTable(active.game,active.options??{});});
  }
  addForeground() {
    const regions=this.place==='casino-tables'?[[405,383,310,125,880],[1040,387,360,125,880]]
      :this.place==='casino-lobby'?[[292,176,292,88,465],[1094,176,288,88,465]]
      :[[550,393,578,211,1085]];
    const key=`world-${this.place}`,source=this.textures.get(key).getSourceImage();
    for(const [x,y,width,height,depth]of regions){
      this.add.image(0,0,key,'__BASE').setOrigin(0).setDisplaySize(2880,1620)
        .setCrop(x*source.width/1672,y*source.height/941,width*source.width/1672,height*source.height/941).setDepth(depth);
    }
  }
  addWayfinding() {
    const sign=(x,y,label,size=17)=>{const at=casinoPoint(x,y);return this.add.text(at.x,at.y,label,{fontFamily:'monospace',fontStyle:'bold',fontSize:`${size}px`,color:'#ffe2a2',backgroundColor:'#241c36',padding:{x:10,y:7},align:'center'}).setOrigin(.5,1).setDepth(at.y-1);};
    if(this.place==='casino-lobby'){
      sign(837,65,'ASCENSEUR');sign(435,145,'ACCUEIL');sign(1230,145,'CAISSE · 1 JETON = 1 $');
      sign(400,612,'CERISES / CLOCHES',15);sign(840,612,'DIAMANTS / MONTRÉAL',15);sign(1270,612,'CERISES / CLOCHES',15);
      sign(835,914,'SORTIE · L’ÎLE ↓');sign(140,90,'VESTIAIRE\nPROCHAINEMENT',14);
    }else if(this.place==='casino-tables'){
      sign(837,96,'ASCENSEUR');sign(560,625,'KARL · BLACKJACK');sign(1220,625,'ROULETTE');
      sign(233,127,'GALAS DE BOXE\nPROCHAINEMENT',14);sign(1436,127,'AILE RÉSERVÉE\nPROCHAINEMENT',14);
    }else{
      sign(837,52,'ASCENSEUR');sign(837,705,'HOLD’EM · 4 JOUEURS');sign(139,117,'SALON PRIVÉ\nPROCHAINEMENT',14);
    }
  }
  addGuests() {
    const guest=(person,x,y)=>{
      const point=casinoPoint(x,y),sprite=this.add.image(point.x,point.y,`casino-guest-${person}`).setOrigin(.5,1).setScale(.8).setDepth(point.y);
      this.crowd.push({sprite,x:point.x,y:point.y,person});return sprite;
    };
    if(this.place==='casino-lobby'){
      guest(3,420,195);guest(3,1230,195);guest(0,512,592);guest(1,1510,283);guest(2,1040,650);
    }else if(this.place==='casino-tables'){
      const k=casinoPoint(560,392);this.karl=this.add.image(k.x,k.y,'casino-karl').setOrigin(.5,1).setScale(.9).setDepth(k.y);
      this.karlBaseY=k.y;guest(3,1200,392);guest(1,375,655);guest(2,712,592);guest(0,1375,605);
    }else{
      guest(0,837,400);guest(1,615,630).setDepth(1120);guest(2,1060,630).setDepth(1120);guest(3,1390,341);
    }
  }
  animateKarl(action){
    if(!this.karl)return;this.karl.setTexture(`casino-karl-${{deal:1,turn:2,pay:3}[action]??0}`);
    this.karlAnimation?.remove();this.karlAnimation=this.time.delayedCall(700,()=>this.karl?.setTexture('casino-karl'));
  }
  blocked(){return this.changingPlace||this.world?.state.paused||resumePending()||careerMenuOpen();}
  show(title,text,actions=[close],extra={}){
    this.ui.showDialog({speaker:'CASINO DE MONTRÉAL',title,text,actions,...extra});
  }
  interact() {
    if(this.blocked()||this.ui.dialog)return;
    const station=this.world.getNearby();if(!station||station.autoTravel)return;
    this.world.releaseControls();this.persistLocation();
    const id=station.id;
    if(id==='lift'){this.showLift();return;}
    if(id==='cashier'){this.showCashier();return;}
    if(id.startsWith('slots-')){this.enterTable('slots',{machineId:station.machineId??id.slice(6)});return;}
    if(id==='roulette'||id==='poker'){this.enterTable(id);return;}
    if(id==='blackjack'){
      this.show('Salut ! Une petite partie ?',karlGreeting(careerProfile.snapshot()),[
        {id:'table-blackjack',label:'M’installer · Blackjack'},
        {id:'karl-rules',label:'Karl, explique-moi les règles'},close,
      ],{speaker:'KARL · CROUPIER',image:'assets/casino/karl.png',imageAlt:'Karl, cheveux noirs bouclés, chemise blanche, gilet noir et nœud papillon'});return;
    }
    if(id==='reception')this.show('Bienvenue au Casino de Montréal',
      'Entrée gratuite et aucune énergie dépensée. Au rez-de-chaussée : la caisse, les machines et le coin détente. Au premier : Karl au blackjack et la roulette. Au deuxième : le Hold’em.\n\nÀ la caisse, 1 $ vaut 1 jeton. Les jetons restent dans ta sauvegarde. Tu peux jouer seulement ce que tu possèdes; les gains ne sont jamais garantis.',
      [{id:'visit-cashier',label:'Comment obtenir des jetons ?'},close]);
    else if(id==='bar')this.show('Les nouvelles du casino','« On prépare une salle pour les galas de boxe. Peut-être qu’un jour, on viendra ici pour te voir sur le ring ! »\n\nLa salle de spectacles est encore fermée, au premier étage.');
    else if(id==='lounge')this.show('Prendre son temps','Les lumières se reflètent sur les tables. Tu peux passer la soirée ici sans miser et sans dépenser d’énergie.\n\nKarl est au premier étage si tu veux lui parler.');
    else if(id==='spectator')this.show('Une habituée','« Moi, j’aime les petites mises. Parfois je repars avec un peu plus, parfois un peu moins. L’important, c’est de garder de quoi rentrer et poursuivre ses projets. »');
    else if(id==='profiles')this.show('Trois habitués, trois styles','Luc, le joueur à lunettes, reste calme et sait bluffer. Mireille, l’habituée prudente, choisit ses mains. Marco, le bavard, a tendance à suivre souvent.\n\nLeurs cartes restent cachées; ils ne connaissent pas les tiennes. Chaque main peut te surprendre.');
    else if(id==='gala')this.show('Galas de boxe · Prochainement','Une affiche annonce de futures soirées de boxe professionnelle. Derrière cette porte : une salle de spectacles, puis peut-être un ring, des vestiaires et des coulisses.\n\nL’accès ouvrira dans un futur chapitre.');
    else this.show('Une prochaine visite','Cette partie du casino n’est pas encore ouverte. L’espace est réservé à de nouvelles salles et à de futurs événements.');
  }
  showLift() {
    this.show('Choisir un étage','Les trois niveaux sont ouverts. Les ailes réservées ouvriront plus tard.',[
      ...CASINO_PLACES.map((place,index)=>({id:`floor-${place}`,label:floors[index],disabled:this.place===place})),close,
    ],{speaker:'ASCENSEUR'});
  }
  showCashier(message='') {
    const status=careerProfile.casinoStatus();
    const money=status.money??careerProfile.snapshot().money;
    const pending=Boolean(status.active&&!status.active.settled);
    this.show('La caisse',`${message?`${message}\n\n`:''}Portefeuille : ${money} $ · Jetons : ${status.chips}.\n1 jeton = 1 $. Tu peux récupérer tes jetons en dollars sans frais. Les jetons conservés restent sauvegardés.`,[
      ...[1,5,10,20,50].map(amount=>({id:`cash-deposit-${amount}`,label:`Échanger ${amount} $ → ${amount} jetons`,disabled:money<amount||pending})),
      {id:'cash-withdraw-all',label:`Récupérer mes ${status.chips} jetons en dollars`,disabled:status.chips<=0||pending},close,
    ],{speaker:'CAISSE · AUCUN CRÉDIT'});
  }
  enterTable(game,options={}) {
    if(this.blocked()||!this.tableUi)return;
    this.world.releaseControls();this.persistLocation();
    this.tableUi.open(game,options);this.refreshProfile();this.refreshCasinoReadout();
  }
  choose(id) {
    if(this.blocked()||!this.ui.dialog)return;
    if(this.tableUi?.opened&&this.tableUi.choose(id))return;
    if(id.startsWith('floor-')){
      const destination=casinoFloorDestination(id.slice(6));
      if(destination){this.persistLocation();careerProfile.setLocation(destination);startAt(this,destination);}return;
    }
    if(id==='table-blackjack'){this.enterTable('blackjack');return;}
    if(id==='karl-rules'){
      this.show('Le blackjack avec Karl',
        'Approche-toi de 21 sans dépasser. Les figures valent 10; l’as vaut 1 ou 11. Tire une carte ou reste. Tu peux doubler ta première mise pour recevoir une dernière carte, ou séparer deux cartes de même valeur en deux mains.\n\nKarl tire jusqu’à 17 et reste à 17. Le blackjack naturel paie 3 pour 2. Les mises, règles complètes et gains sont affichés à la table.',
        [{id:'table-blackjack',label:'Voir la table'},close],{speaker:'KARL · LES RÈGLES'});return;
    }
    if(id==='visit-cashier'){this.showCashier();return;}
    if(id.startsWith('cash-deposit-')||id==='cash-withdraw-all'){
      const amount=id==='cash-withdraw-all'?-careerProfile.casinoStatus().chips:Number(id.slice(13));
      const result=careerProfile.casinoExchange(amount);this.refreshProfile();this.refreshCasinoReadout();
      this.showCashier(result.message??(result.ok?'Échange effectué.':'Cet échange est indisponible.'));return;
    }
  }
  interactDoor(id) {
    if(this.blocked()||id!=='exit')return;
    this.persistLocation();careerProfile.setLocation(CASINO_ISLAND_RETURN);startAt(this,CASINO_ISLAND_RETURN);
  }
  refreshCasinoReadout() {
    if(!this.casinoReadout)return;
    const status=careerProfile.casinoStatus();
    const label=`${floors[CASINO_PLACES.indexOf(this.place)]} · ${status.chips} jetons · Aucun coût d’énergie`;
    if(this.casinoReadout.textContent!==label)this.casinoReadout.textContent=label;
    if(this.chapterReadout)this.chapterReadout.hidden=true;
  }
  unlockAmbience() {
    if(this.audioContext||this.blocked()||this.ambienceMuted||!this.ambienceVolume)return;
    const Audio=window.AudioContext??window.webkitAudioContext;if(!Audio)return;
    try{this.audioContext=new Audio();this.audioContext.resume().catch(()=>{});}catch{}
  }
  playAmbience() {
    const context=this.audioContext;if(!context||context.state!=='running'||document.hidden||this.blocked()||this.ui.dialog||this.ambienceMuted||!this.ambienceVolume)return;
    const lobby=this.place==='casino-lobby',frequency=lobby?660: this.place==='casino-tables'?310:220;
    for(let index=0;index<(lobby?2:1);index++){
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+index*.13;
      oscillator.type='sine';oscillator.frequency.value=frequency*(index?1.5:1);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime((lobby?.009:.005)*this.ambienceVolume/.35,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.22);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.25);
    }
  }
  update(time,delta) {
    super.update(time,delta);if(!this.world||this.changingPlace)return;
    this.refreshCasinoReadout();this.ambienceClock+=delta;
    if(this.ambienceClock>6500){this.ambienceClock=0;this.playAmbience();}
    if(this.karl&&!this.blocked()&&!this.ui?.dialog)this.karl.y=this.karlBaseY+Math.sin(time/830)*1.5;
    for(const guest of this.crowd){
      const nearby=Math.hypot(this.world.state.x-guest.x,this.world.state.y-guest.y)<270;
      const talking=!this.blocked()&&nearby&&Math.floor(time/700+guest.person)%4===0;
      guest.sprite.setTexture(`casino-guest-${guest.person}${talking?'-talk':''}`);
    }
  }
}
