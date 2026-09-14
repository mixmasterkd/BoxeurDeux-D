import { ExplorationScene } from './ExplorationScene.js';
import { MetroWorld } from '../game/MetroWorld.js';
import { TrainSession } from '../game/TrainSession.js';
import { METRO_PLACES, METRO_STATIONS, METRO_STATION_IDS, METRO_EXITS, metroStation, metroDirection, metroTerminus, metroPlatformLocation } from '../game/MetroNetwork.js';
import { careerProfile } from '../game/CareerProfile.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { resumePending } from '../game/ResumeRouting.js';
import './metro.css';
const back = { id:'close', label:'Retour' };

export class MetroScene extends ExplorationScene {
  constructor(){super('MetroScene');}
  init(data={}){
    const saved=careerProfile.snapshot().location;
    const requested=data.place??new URLSearchParams(location.search).get('scene')??saved.scene;
    const place=METRO_PLACES.includes(requested)?requested:'metro-station';
    super.init({...data,place});
    this.world=null;this.train=null;this.mapElement=null;this.mapFromPause=false;this.closedDoors=null;this.routeSign=null;this.doorAmount=0;this.windowViews=[];
    this.direction=metroDirection(place,data.direction??1);
    if(place==='metro-train')this.train=new TrainSession({station:data.station??(METRO_STATION_IDS.includes(saved.scene)?saved.scene:'metro-station'),direction:data.direction??1});
    this.assetPath=place==='metro-train'?'assets/metro/train.png':place==='airport'?'assets/metro/airport.png':'assets/world/metro-station.png';
    this.actorScale=place==='metro-train'||place==='airport'?1.5:1.25;
    this.makeWorld=()=>new MetroWorld({place:this.place,position:this.entryPosition});
    const name=place==='airport'?'Aéroport de Montréal':place==='metro-train'?'À bord du métro':metroStation(place).name;
    this.placeCopy={eyebrow:place==='airport'?'MONTRÉAL · LES VOYAGES':'MONTRÉAL · LE MÉTRO',title:name,welcome:name,
      hint:place==='airport'?'Réserve au comptoir, puis avance dans ta porte d’embarquement. Le métro est au centre.'
        :place==='metro-train'?'Descends en avançant dans la porte ouverte à la station voulue. Consulte le plan au mur ou dans le menu.'
          :'Avance dans le train. Le panneau donne le plan et permet de choisir la direction; l’escalier mène dehors.',
      pauseText:'Le trajet attend pendant la pause. Une recharge te replace sur le quai de la dernière station, sans coût.',
      commandsTitle:'Commandes · Métro et voyages',commandsHint:'WASD ou les flèches pour marcher; E pour le plan ou le comptoir. Au mobile, joypad et A. Avance dans les portes pour monter, descendre ou embarquer.'};
  }
  preload(){super.preload();if(this.train)this.load.image('metro-doors-closed',`${import.meta.env.BASE_URL}assets/metro/train-doors.png`);}
  create(){
    super.create();if(!this.world||!this.ui)return;
    const mapButton=document.createElement('button');mapButton.type='button';mapButton.className='metro-plan-button';mapButton.textContent='Plan du métro';
    this.ui.elements['gym-resume-button'].after(mapButton);
    this.ui.listenActivation(mapButton,()=>this.showMap(true));this.mapButton=mapButton;
    this.ui.callbacks.onCloseDialog=()=>this.closeDialog();
    this.ui.root.dataset.metroPlace=this.place;
    const cleanup=()=>{this.mapElement?.remove();delete this.ui.root.dataset.metroPlace;if(import.meta.env.DEV&&window.__metro?.scene===this)delete window.__metro;};
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
    if(import.meta.env.DEV)window.__metro={scene:this,world:this.world,ui:this.ui,train:this.train};
    this.updateSigns();
  }
  addForeground(){
    if(!this.train)return;
    const room=this.textures.get('world-metro-train');
    for(const [id,x,width]of [['left-window',139,225],['right-window',835,282]]){
      if(!room.has(id))room.add(id,0,x,112,width,64);
      this.windowViews.push(this.add.tileSprite(x+width/2,144,width,64,'world-metro-train',id).setDepth(1));
    }
    const texture=this.textures.get('metro-doors-closed');
    if(!texture.has('left'))texture.add('left',0,0,0,96,252);
    if(!texture.has('right'))texture.add('right',0,96,0,95,252);
    this.closedDoors=[this.add.image(546,54,'metro-doors-closed','left'),this.add.image(642,54,'metro-doors-closed','right')];
    for(const door of this.closedDoors)door.setOrigin(0).setDepth(350).setVisible(false);
    // Only existing bitmap door pixels overlay the open frame. No character art is obscured below the threshold.
  }
  addWayfinding(){
    const text=(x,y,label,size=18,color='#fff0c2')=>this.add.text(x,y,label,{fontFamily:'monospace',fontStyle:'bold',fontSize:`${size}px`,color,
      align:'center',backgroundColor:'#132a40',padding:{x:7,y:4}}).setOrigin(.5,.5).setDepth(1700);
    if(this.place==='airport'){
      text(337,100,'CUBA',20);text(984,100,'MEXIQUE',20);text(640,263,'BILLETS',16);text(640,490,'MÉTRO ↓',17);
    }else if(this.train){
      this.routeSign=text(640,26,'',17);text(445,250,'PLAN',13);
    }else{
      text(448,77,metroStation(this.place).name.toUpperCase(),this.place==='metro-island'?12:15);
      this.routeSign=text(805,136,'',17);
      text(395,334,'PLAN',14);text(640,532,'SORTIE ↓',14);
      const g=this.add.graphics().setDepth(330);g.fillStyle(0x173f68).fillRect(365,343,60,36);g.lineStyle(3,0xeebc54).lineBetween(374,360,417,360);
      for(let i=0;i<5;i++)g.fillStyle(i===METRO_STATION_IDS.indexOf(this.place)?0xfaf3d9:0x67bde0).fillCircle(375+i*10,360,3);
    }
  }
  updateSigns(){
    if(this.train){
      const s=this.train.snapshot(), station=this.train.station;
      const label=s.doorsOpen?`${station.name.toUpperCase()} · PORTES OUVERTES`:`PROCHAIN ARRÊT · ${this.train.nextStation.name.toUpperCase()}`;
      this.routeSign?.setText(label);
      const target=this.world.layout.stations.find(station=>station.id==='train-exit');
      target.label=s.doorsOpen?`Descendre · ${station.name}`:'Portes fermées · Le train roule';
      document.querySelector('.prototype-label').textContent=label;
      this.ui.root.dataset.metroStation=station.id;this.ui.root.dataset.metroTrain=s.phase;
    }else if(this.place!=='airport')this.routeSign?.setText(`DIRECTION ${metroTerminus(this.direction).name.toUpperCase()} →`);
  }
  blocked(){return this.changingPlace||this.sleeping||resumePending()||careerMenuOpen()||this.world?.state.paused||Boolean(this.ui?.dialog);}
  persistLocation(){
    if(!this.world||this.changingPlace||careerMenuOpen()||resumePending())return;
    careerProfile.setLocation(this.train?this.train.resumeLocation():this.world.location());
  }
  interact(){
    if(this.blocked())return;
    const target=this.world.getNearby();if(!target||target.autoTravel)return;
    this.world.releaseControls();this.persistLocation();
    if(target.id==='metro-map')this.showMap();
    else if(target.id==='travel-counter')this.showTickets();
  }
  show(title,text,actions=[back]){this.mapElement?.remove();this.mapElement=null;this.ui.showDialog({speaker:this.place==='airport'?'AÉROPORT · COMPTOIR':'RÉSEAU DU MÉTRO',title,text,actions});}
  showMap(fromPause=false){
    this.world.releaseControls();this.mapFromPause=fromPause;
    if(fromPause){this.world.resume();this.ui.update(this.world.state);}
    const station=this.train?.station??metroStation(this.place==='airport'?'metro-airport':this.place);
    const currentDirection=this.train?.state.direction??this.direction;
    const actions=this.train||this.place==='airport'?[back]:[
      {id:'direction-forward',label:'Vers l’aéroport',disabled:station.id==='metro-airport'},
      {id:'direction-backward',label:'Vers le quartier',disabled:station.id==='metro-station'},back];
    this.show('Le métro',`Tu es à ${station.name}. Direction ${metroTerminus(currentDirection).name}.\nReste à bord et descends par la porte à ton arrêt.`,actions);
    const map=document.createElement('ol');map.className='metro-network-map';map.setAttribute('aria-label','Les cinq stations dans l’ordre');
    for(const stop of METRO_STATIONS){const row=document.createElement('li');row.dataset.current=String(stop.id===station.id);
      const name=document.createElement('strong');name.textContent=({'metro-island':'Île','metro-stadium':'Stade'}[stop.id]??stop.name);row.setAttribute('aria-label',`${stop.name} : ${stop.attraction}`);const attraction=document.createElement('span');attraction.textContent=stop.attraction;
      row.append(name,attraction);map.append(row);}
    this.ui.root.querySelector('.gym-dialog-speaker').textContent='MONTRÉAL';
    this.ui.root.querySelector('#gym-dialog-text').before(map);this.mapElement=map;
  }
  closeDialog(){
    this.ui.closeDialog();this.mapElement?.remove();this.mapElement=null;this.world.releaseControls();
    if(this.mapFromPause){this.mapFromPause=false;this.world.pause();this.ui.update(this.world.state);this.mapButton?.focus({preventScroll:true});}
  }
  showTickets(){
    const status=['cuba','mexico'].map(id=>({id,...careerProfile.travelStatus(id)}));
    this.show('Ton prochain séjour',`Cuba et Mexique : 160 $ chacun, logement et retour compris.\nRéserve ici ou sur ton laptop. Ensuite, avance dans la porte de ta destination.`,[
      ...status.map(travel=>({id:`ticket-${travel.id}`,label:travel.reserved?`${travel.label} · Déjà réservé`:`${travel.label} · 160 $`,disabled:Boolean(travel.reserved)})),back]);
  }
  choose(id){
    if(this.changingPlace||resumePending()||this.world.state.paused||!this.ui.dialog)return;
    if(id==='close'){this.closeDialog();return;}
    if(id==='direction-forward'||id==='direction-backward'){
      this.direction=metroDirection(this.place,id==='direction-backward'?-1:1);this.closeDialog();this.updateSigns();return;
    }
    if(id.startsWith('ticket-')){
      const destination=id.slice(7);if(!['cuba','mexico'].includes(destination))return;
      const offer=careerProfile.travelOffer(destination);
      this.show(offer.ok?`Réserver ${destination==='cuba'?'Cuba':'le Mexique'} ?`:'Avant le départ',offer.message,
        offer.ok?[{id:`reserve-${destination}`,label:'Réserver · 160 $'},back]:[back]);return;
    }
    if(id.startsWith('reserve-')){
      const destination=id.slice(8);if(!['cuba','mexico'].includes(destination))return;
      const result=careerProfile.reserveTravel(destination);this.refreshProfile();this.show(result.ok?'Réservation confirmée':'Avant le départ',result.message);return;
    }
  }
  change(scene,place,location,extra={}){
    this.persistLocation();this.changingPlace=true;this.ui.clearInputs();this.world.pause();
    if(location)careerProfile.setLocation(location);
    if(scene==='MetroScene')this.scene.restart({place,location,...extra});else this.scene.start(scene,{place,location,...extra});
  }
  interactDoor(id){
    if(this.changingPlace||this.world.state.paused||this.ui.dialog||resumePending()||careerMenuOpen())return;
    if(id==='train'){
      this.change('MetroScene','metro-train',null,{station:this.place,direction:this.direction});return;
    }
    if(id==='train-exit'){
      const location=this.train?.disembark();if(location)this.change('MetroScene',location.scene,location,{direction:this.train.state.direction});return;
    }
    if(id==='metro-exit'){
      const exit=METRO_EXITS[this.place];if(exit)this.change(exit.scene,exit.place,exit.location);return;
    }
    if(id==='airport-metro'){const location={scene:'metro-airport',x:640,y:490,facing:'up'};this.change('MetroScene','metro-airport',location);return;}
    if(id==='board-cuba'||id==='board-mexico'){
      const destination=id.slice(6);this.persistLocation();const result=careerProfile.boardTravel(destination);
      if(!result.ok){this.world.releaseControls();this.show('Avant l’embarquement',result.message);return;}
      this.changingPlace=true;this.ui.clearInputs();this.world.pause();
      this.scene.start(destination==='cuba'?'CubaScene':'MexicoScene',{place:result.location.scene,location:result.location});
    }
  }
  renderWorld(){super.renderWorld();this.shadow?.setScale(this.actorScale);}
  update(time,delta){
    if(!this.world||!this.ui)return;
    if(this.train){
      if(this.blocked()||document.hidden||this.ui.portraitQuery.matches)this.train.pause();else this.train.resume();
      const events=this.train.update((this.game.loop.rawDelta??delta)/1000);
      this.world.setDoorsOpen(this.train.doorsOpen);
      if(!this.blocked())for(const window of this.windowViews)window.tilePositionX=this.train.doorsOpen?0:window.tilePositionX+Math.min(delta/1000,.1)*95*this.train.state.direction;
      const target=this.train.doorsOpen?0:1;
      if(!this.blocked())this.doorAmount+=Math.sign(target-this.doorAmount)*Math.min(Math.abs(target-this.doorAmount),Math.min(delta/1000,.1)/.3);
      if(this.closedDoors){
        const amount=this.doorAmount, offset=96*(1-amount);
        this.closedDoors[0].setVisible(amount>.001).setCrop(offset,0,96-offset,252).setX(546-offset);
        this.closedDoors[1].setVisible(amount>.001).setCrop(0,0,95*amount,252).setX(642+95*(1-amount));
      }
      if(events.some(event=>event.type==='arrive'))this.persistLocation();
    }
    super.update(time,delta);this.updateSigns();
  }
}
