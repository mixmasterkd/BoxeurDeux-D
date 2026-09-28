import Phaser from 'phaser';
import {RetroRaceSession,RACE_TRACK,RACE_GATES,RACE_OBSTACLES,racePointAt} from '../game/RetroRaceSession.js';
import {RetroRaceUI} from '../ui/RetroRaceUI.js';
import {careerProfile} from '../game/CareerProfile.js';
import {HOME_RACE_RETURN} from '../game/HomeBarWorld.js';
import {sceneForPlace} from '../game/SceneRouting.js';
import {careerMenuOpen} from '../ui/GameControls.js';
import {setSceneShell} from '../ui/SceneShell.js';

export class RetroRaceScene extends Phaser.Scene {
  constructor(){super('RetroRaceScene');}
  init({returnLocation}={}){
    this.returnLocation=returnLocation?.scene?{...returnLocation}:{...HOME_RACE_RETURN};
    this.place=this.returnLocation.scene;this.raceId=null;this.changing=false;
  }
  create(){
    setSceneShell('gym');
    for(const id of ['gym-ui','sparring-ui','bag-ui','shadow-ui','rhythm-ui'])document.getElementById(id).hidden=true;
    const stage=document.getElementById('stage');stage.dataset.scene='retro-race';stage.setAttribute('aria-label','Course rétro : GR Corolla contre Camaro, trois tours');
    document.getElementById('game').setAttribute('aria-label','Circuit du parc vu du dessus. La GR Corolla rouge et blanche affronte la Camaro jaune de Karl.');
    document.querySelector('.gym-location').textContent='LA CONSOLE DU SALON';document.querySelector('.prototype-label').textContent='CIRCUIT DU PARC · 3 TOURS';
    document.getElementById('game-commands').innerHTML='<span><kbd>↑</kbd> Accélérer <kbd>↓</kbd> Freiner</span><span><kbd>←</kbd><kbd>→</kbd> Braquer</span><span><kbd>P</kbd> Pause</span>';
    this.session=new RetroRaceSession();this.drawCircuit();this.checkpointMarker=this.add.graphics();this.createCars();this.score=careerProfile.leisureStatus();
    this.ui=new RetroRaceUI({onStart:()=>this.startRace(),onPause:()=>{this.session.pause();this.syncUI();},onResume:()=>{this.session.resume();this.syncUI();},onReturn:()=>this.returnHome()});
    this.syncUI();
    this.resizeObserver=new ResizeObserver(()=>{this.scale.getParentBounds();this.scale.refresh();});this.resizeObserver.observe(document.getElementById('game'));
    let disposed=false;
    const cleanup=()=>{if(disposed)return;disposed=true;if(this.raceId)careerProfile.abandonLeisureGame(this.raceId);this.raceId=null;this.ui.destroy();this.resizeObserver.disconnect();if(import.meta.env.DEV&&window.__retroRace?.scene===this)delete window.__retroRace;};
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
    if(import.meta.env.DEV)window.__retroRace={scene:this,session:this.session,ui:this.ui};
  }
  startRace(){
    if(!['ready','finished'].includes(this.session.state.phase)||this.changing)return;
    const result=careerProfile.beginLeisureGame('race','karl');
    if(!result.ok){this.ui.message(result.message??'La course ne peut pas démarrer.');return;}
    this.raceId=result.id;this.session.reset();this.session.start();this.ui.message('');this.syncUI();
  }
  returnHome(){
    if(this.changing)return;this.changing=true;this.session.pause();this.ui.controls.clear();
    if(this.raceId)careerProfile.abandonLeisureGame(this.raceId);this.raceId=null;
    careerProfile.setLocation(this.returnLocation);
    this.scene.start(sceneForPlace(this.returnLocation.scene),{place:this.returnLocation.scene,location:this.returnLocation});
  }
  syncUI(){this.ui?.update(this.session.state,this.score);}
  update(_time,delta){
    if(!this.ui||this.changing)return;
    if(careerMenuOpen()||document.hidden||this.ui.portrait.matches)this.session.pause();
    this.session.setInput(this.ui.input());this.session.update(Math.min((this.game.loop.rawDelta??delta)/1000,.05));
    const s=this.session.state;
    if(s.phase==='finished'&&this.raceId){
      const id=this.raceId;this.raceId=null;
      const result=careerProfile.recordLeisureResult({id,winner:s.summary.winner,timeMs:s.summary.timeMs});
      if(!result.ok)careerProfile.abandonLeisureGame(id);
      this.score=careerProfile.leisureStatus();this.ui.message(result.message??'Résultat enregistré au salon.');
    }
    for(const [key,c] of [['player',s.player],['opponent',s.opponent]]){
      this.cars[key].setPosition(c.x,c.y).setRotation(c.angle).setTint(c.collision>0?0xffbbbb:0xffffff);
      this.carLabels[key].setPosition(c.x,c.y-23);
    }
    const gate=RACE_GATES[s.player.nextCheckpoint],nx=-Math.sin(gate.angle),ny=Math.cos(gate.angle);
    this.checkpointMarker.clear();
    if(s.phase==='running')for(const side of [-1,1])this.checkpointMarker.fillStyle(0xffe199,.85).fillCircle(gate.x+nx*side*65,gate.y+ny*side*65,5);
    this.syncUI();this.session.drainEvents();
  }
  drawCircuit(){
    const g=this.add.graphics();g.fillStyle(0x568a52).fillRect(0,0,1280,720);
    // A deliberately code-native 16-bit diorama, with a readable uninterrupted
    // road; collision geometry and the painted course share the same samples.
    for(let y=0;y<720;y+=32)for(let x=0;x<1280;x+=32)if((x/32+y/32)%2===0)g.fillStyle(0x52864e).fillRect(x,y,32,32);
    const points=[...RACE_TRACK.points,RACE_TRACK.points[0]];
    g.lineStyle(137,0x2b5a42).strokePoints(points,false);g.lineStyle(128,0xc6ba91).strokePoints(points,false);
    g.lineStyle(118,0xf1d4a0).strokePoints(points,false);g.lineStyle(RACE_TRACK.roadWidth,0x424d52).strokePoints(points,false);
    g.lineStyle(2,0x747d78,.5).strokePoints(points,false);
    for(let d=0;d<RACE_TRACK.length;d+=25){
      const p=racePointAt(d),a=p.angle,nx=-Math.sin(a),ny=Math.cos(a);
      for(const side of [-1,1]){const x=p.x+nx*side*60,y=p.y+ny*side*60;
        g.lineStyle(6,Math.floor(d/25)%2?0xe9e3c5:0xb7463a).lineBetween(x-Math.cos(a)*10,y-Math.sin(a)*10,x+Math.cos(a)*10,y+Math.sin(a)*10);}
    }
    for(let d=150;d<RACE_TRACK.length;d+=245){
      const p=racePointAt(d),a=p.angle;
      const tip={x:p.x+Math.cos(a)*14,y:p.y+Math.sin(a)*14},back={x:p.x-Math.cos(a)*8,y:p.y-Math.sin(a)*8};
      g.lineStyle(3,0xdfd8af,.7).strokePoints([{x:back.x-Math.sin(a)*9,y:back.y+Math.cos(a)*9},tip,{x:back.x+Math.sin(a)*9,y:back.y-Math.cos(a)*9}],false);
    }
    const gate=RACE_GATES[0],t={x:Math.cos(gate.angle),y:Math.sin(gate.angle)},n={x:-t.y,y:t.x};
    for(let row=0;row<2;row++)for(let col=0;col<10;col++){
      const x=gate.x+n.x*(col*10-50)+t.x*(row*9-9),y=gate.y+n.y*(col*10-50)+t.y*(row*9-9);
      g.fillStyle((row+col)%2?0x1a2228:0xfff0cd).fillPoints([{x,y},{x:x+n.x*10,y:y+n.y*10},{x:x+n.x*10+t.x*9,y:y+n.y*10+t.y*9},{x:x+t.x*9,y:y+t.y*9}],true);
    }
    // Grandstand and small pit awnings stay clear of the playable road.
    g.fillStyle(0x273c3e).fillRect(405,650,420,34);g.fillStyle(0xced0b1).fillRect(397,638,436,11);
    for(let i=0;i<35;i++){g.fillStyle([0xbfd2a3,0xe5b878,0xd66650,0x7aacc0][i%4]).fillRect(413+i*11,657,6,9);}
    g.fillStyle(0x284c3c).fillRect(515,358,142,96);g.fillStyle(0xddd0a2).fillRect(527,370,119,72);
    g.fillStyle(0x3f8890).fillRect(533,376,107,60);g.lineStyle(3,0x96c1b4).strokeRect(539,382,95,48);
    for(const o of RACE_OBSTACLES){g.fillStyle(0x284e39,.45).fillEllipse(o.x+6,o.y+15,o.radius*2.3,o.radius*1.6);g.fillStyle(0x765634).fillRect(o.x-5,o.y-2,10,28);
      g.fillStyle(0x274f3b).fillRect(o.x-o.radius,o.y-o.radius+5,o.radius*2,o.radius*1.25);g.fillStyle(0x337146).fillRect(o.x-o.radius+5,o.y-o.radius-7,o.radius*1.7,o.radius*1.5);g.fillStyle(0x64934c).fillRect(o.x-o.radius+8,o.y-o.radius-7,o.radius,o.radius*.6);}
    this.add.text(653,492,'CIRCUIT DU PARC',{fontFamily:'monospace',fontSize:'23px',fontStyle:'bold',color:'#dbe4b6',stroke:'#315c40',strokeThickness:4}).setOrigin(.5);
    this.add.text(640,689,'GR COROLLA  /  CAMARO  •  SOIRÉE AU SALON',{fontFamily:'monospace',fontSize:'12px',color:'#d0d9ac'}).setOrigin(.5);
  }
  createCars(){
    for(const [id,paint] of [['player',0xf0e5d0],['opponent',0xf2c739]]){
      const key=`retro-race-${id}`;
      if(!this.textures.exists(key)){
        const g=this.make.graphics({x:0,y:0,add:false});
        g.fillStyle(0x0e2024,.5).fillRect(6,8,38,20);g.fillStyle(0x10191d).fillRect(8,3,8,24).fillRect(30,3,8,24);
        g.fillStyle(paint).fillRect(5,6,id==='player'?37:40,18);g.fillStyle(id==='player'?0xc74339:0xa77c22).fillRect(7,22,35,3);
        if(id==='player'){g.fillStyle(0xc83b35).fillRect(27,6,15,6).fillRect(29,18,13,6);g.fillStyle(0x191e25).fillRect(16,8,13,14);g.fillStyle(0xeaead2).fillRect(3,4,5,22);}
        else{g.fillStyle(0x1c2025).fillRect(5,10,40,3).fillRect(5,17,40,3).fillRect(17,8,12,14);}
        g.fillStyle(0x80adb1).fillRect(25,9,5,12);g.fillStyle(0x456c79).fillRect(12,9,4,12);g.fillStyle(0xfff4b9).fillRect(41,7,3,4).fillRect(41,19,3,4);g.fillStyle(0xc64539).fillRect(4,7,2,4).fillRect(4,19,2,4);
        g.generateTexture(key,50,32);g.destroy();
      }
    }
    this.cars={player:this.add.image(0,0,'retro-race-player').setScale(.88),opponent:this.add.image(0,0,'retro-race-opponent').setScale(.88)};
    this.carLabels={player:this.add.text(0,0,'TOI',{fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:'#fff3d2',backgroundColor:'#192d35'}).setOrigin(.5),opponent:this.add.text(0,0,'KARL',{fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:'#ffe27b',backgroundColor:'#192d35'}).setOrigin(.5)};
  }
}
