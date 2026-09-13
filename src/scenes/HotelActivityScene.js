import Phaser from 'phaser';
import { HotelActivitySession } from '../game/HotelActivitySession.js';
import { HotelActivityUI } from '../ui/HotelActivityUI.js';
import { DailyActivityGate } from '../game/DailyActivityGate.js';
import { DailyActivityNotice } from '../ui/DailyActivityNotice.js';
import { careerProfile } from '../game/CareerProfile.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';
import { boxingTexture, prepareBoxingOutfits } from './OutfitView.js';
import { padsMotion } from '../game/PadsMotion.js';
import { careerMenuOpen } from '../ui/GameControls.js';
const PLAYER_POSES=['guard','jab','cross','jab-windup','cross-windup','jab-recover','cross-recover','block','dodge'];
const COACH_POSES=['ready','left','right','sweep'];
export class HotelActivityScene extends Phaser.Scene{
  constructor(){super('HotelActivityScene');}
  init(data={}){this.activity=(data.activity??new URLSearchParams(location.search).get('scene'))==='pool'?'pool':'pads';this.fromCuba=this.activity==='pads'&&Boolean(data.fromCuba);this.fromGym=this.activity==='pads'&&Boolean(data.fromGym);this.place=this.fromCuba?'cuba-gym':this.activity==='pool'?'hotel-pool':'hotel-gym';this.backgroundKey=`activity-${this.activity}-${this.fromCuba?'cuba':this.fromGym?'local':'hotel'}`;}
  preload(){
    const b=import.meta.env.BASE_URL;this.load.image(this.backgroundKey,this.fromCuba?`${b}assets/cuba/gym-training.png`:this.fromGym?`${b}assets/backgrounds/gym.png`:`${b}assets/hotel/${this.activity==='pool'?'pool':'gym'}.png`);
    if(this.activity==='pool'){
      this.load.json('hotel-swimmer-data',`${b}assets/hotel/swimmer.json`);
      for(let i=0;i<4;i++)this.load.image(`hotel-swimmer-${i}`,`${b}assets/hotel/swimmer-${i}.png`);
    }else{
      this.load.json('hotel-pads-coach-data',`${b}assets/sprites/fredo/coach.json`);
      for(const pose of COACH_POSES)this.load.image(`hotel-pads-coach-${pose}`,`${b}assets/sprites/fredo/${pose}.png`);
      this.load.json('hotel-pads-player-data',`${b}assets/sprites/sparring-v2/fighters.json`);
      for(const pose of PLAYER_POSES)this.load.image(`hotel-pads-player-${pose}`,`${b}assets/sprites/sparring-v2/player-${pose}.png`);
      this.load.image('hotel-pads-player-block-body',`${b}assets/sprites/body-training/player-block-body.png`);
    }
  }
  create(){
    if(this.fromCuba&&!careerProfile.cubaStatus().active){this.scene.start('ExplorationScene',{place:'riverside'});return;}
    if(!this.fromGym&&!this.fromCuba&&!careerProfile.tournamentStatus().active){this.scene.start('ExplorationScene',{place:'neighborhood',entrance:'fight'});return;}
    setSceneShell(this.activity,{fromGym:this.fromGym,fromCuba:this.fromCuba});this.session=new HotelActivitySession({activity:this.activity});this.rewarded=false;
    if(!this.fromGym&&careerProfile.snapshot().location.scene!==this.place)careerProfile.setLocation({scene:this.place,x:640,y:610,facing:'up'});
    this.add.image(0,0,this.backgroundKey).setOrigin(0).setDisplaySize(1280,720);
    this.audio=new SparringAudio();this.createActors();
    this.dailyGate=new DailyActivityGate({profile:careerProfile,getState:()=>this.session.state,activity:this.activity});
    const start=()=>this.dailyGate.start(()=>{this.session.reset();this.session.start();this.rewarded=false;this.visualDistance=0;this.audio.setActive(true);this.audio.play('round-start');});
    this.ui=new HotelActivityUI(this.activity,{
      onAction:action=>this.session.act(action),onGuard:(held,level)=>this.session.setGuard(held,level),onStart:start,
      onPause:()=>{this.session.pause();this.audio.setActive(false);},onResume:()=>{this.session.resume();this.audio.setActive(true);},
      onReturnGym:()=>{this.session.pause();this.audio.setActive(false);this.scene.start(this.fromCuba?'CubaScene':this.fromGym?'GymScene':'HotelScene',this.fromGym?{}:{place:this.place,location:careerProfile.snapshot().location});},
      onAudioGesture:()=>this.audio.unlock(),onMute:()=>{this.audio.setMuted(!this.audio.getState().muted);this.ui.setAudioState(this.audio.getState());if(!this.audio.getState().muted)this.audio.unlock();},
    },{fromGym:this.fromGym,fromCuba:this.fromCuba});
    this.dailyNotice=new DailyActivityNotice({root:this.ui.root,gate:this.dailyGate,panel:'.rhythm-actions',primary:'.rhythm-primary',restarts:['.rhythm-restart']});
    this.ui.update(this.session.state);this.dailyNotice.update(this.session.state);this.ui.setAudioState(this.audio.getState());
    this.resizeObserver=new ResizeObserver(()=>{this.scale.getParentBounds();this.scale.refresh();});this.resizeObserver.observe(document.getElementById('game'));
    let disposed=false;const cleanup=()=>{if(disposed)return;disposed=true;this.events.off('shutdown',cleanup);this.events.off('destroy',cleanup);this.ui.destroy();this.audio.dispose();this.resizeObserver.disconnect();if(import.meta.env.DEV&&window.__hotelActivity?.scene===this)delete window.__hotelActivity;};
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
    if(import.meta.env.DEV)window.__hotelActivity={scene:this,session:this.session,ui:this.ui,contacts:[]};
  }
  createActors(){
    this.effect=this.add.graphics().setDepth(5);this.visualDistance=0;this.lastHit=-1;
    if(this.activity==='pool'){
      this.swimmer=this.add.image(255,416,'hotel-swimmer-0').setScale(.68).setDepth(3);this.swimmer.setOrigin(.5,.5);
    }else{
      this.coachMeta=this.cache.json.get('hotel-pads-coach-data');this.playerMeta=this.cache.json.get('hotel-pads-player-data');
      this.coach=this.add.image(640,594,'hotel-pads-coach-ready').setOrigin(.5,624/640).setScale(.76).setDepth(2);
      this.player=this.add.image(640,660,'hotel-pads-player-guard').setOrigin(.5,624/640).setScale(.74).setAlpha(.66).setDepth(4);
      prepareBoxingOutfits(this,PLAYER_POSES.map(pose=>`hotel-pads-player-${pose}`));
      this.add.ellipse(640,597,150,26,0x071a22,.25).setDepth(1);this.add.ellipse(640,663,140,28,0x071a22,.28).setDepth(3);
    }
  }
  update(_time,delta){
    if(!this.session||!this.ui)return;
    if(careerMenuOpen())this.session.pause();
    this.session.update(Math.min((this.game.loop.rawDelta??delta)/1000,.1));const s=this.session.state;
    const events=this.session.drainEvents();
    for(const event of events){
      if(event.type==='hit'){this.lastHit=s.elapsed;this.audio.play(this.activity==='pool'?'shadow-motion':'player-blocked');}
      else if(event.type==='round-end')this.audio.play('round-end');
    }
    if(s.phase==='finished'&&!this.rewarded){this.rewarded=true;this.ui.setReward(careerProfile.reward(this.activity,s.summary));}
    this.renderActors(s);this.ui.update(s);this.dailyNotice.update(s);
    if(!this.fromGym&&this.dailyNotice.note.textContent.includes('rentre dormir à la maison'))this.dailyNotice.note.textContent=this.dailyNotice.note.textContent.replace('rentre dormir à la maison',this.fromCuba?'retrouve ton lit à la casa':'repose-toi dans ta chambre après le combat');
    if(import.meta.env.DEV)for(const e of events)if(e.type==='hit')window.__hotelActivity.contacts.push({...e,visual:this.contact??null});
  }
  renderActors(s){
    this.effect.clear();
    if(this.activity==='pool'){
      const a=s.player;const target=s.distance;
      if(s.phase==='running')this.visualDistance+=(target-this.visualDistance)*.18;
      const lap=Math.floor(this.visualDistance),fraction=this.visualDistance-lap;
      const right=lap%2===0,x=255+(right?fraction:1-fraction)*775;
      const pose=a.phase==='idle'?0:a.phase==='recover'?3:a.input==='jab'?1:2;
      this.swimmer.setTexture(`hotel-swimmer-${pose}`).setFlipX(!right).setPosition(x,414+Math.sin(s.elapsed*3)*2);
      // Fine ripples accompany the hand entering the water. They are effects,
      // not a substitute for the generated swimmer's arm and kick poses.
      const moving=a.phase!=='idle';if(moving){
        const pulse=(a.elapsed/.56);this.effect.lineStyle(2,0xdaf8ef,.48*(1-pulse)).strokeEllipse(x-(right?32:-32),420,70+pulse*40,19+pulse*10);
        this.effect.lineStyle(1,0xb9eee8,.35).strokeEllipse(x-75*(right?1:-1),414,34,10);
      }
      this.contact={x:Math.round(x),y:414,pose,distance:s.distance};return;
    }
    const layout=padsMotion(s,this.coachMeta,this.playerMeta);
    const {coachPose,coach,player,pose,aim,glove}=layout;
    this.coach.setTexture(`hotel-pads-coach-${coachPose}`).setPosition(coach.x,coach.y).setScale(coach.scale);
    this.player.setTexture(boxingTexture(this,`hotel-pads-player-${pose}`)).setFlipX(player.flip)
      .setPosition(player.x,player.y).setRotation(player.rotation).setScale(player.scale).setAlpha(layout.alpha);
    if(s.phase==='running'&&layout.raised) {
      // A small glint identifies the actual mitt, never a floating letter.
      this.effect.lineStyle(2,0xffd489,.65).strokeCircle(aim.x,aim.y,13);
    }
    if(s.elapsed-this.lastHit<.16){const fade=1-(s.elapsed-this.lastHit)/.16;this.effect.lineStyle(3,0xffe0a1,fade).strokeCircle(aim.x,aim.y,15+(1-fade)*22);}
    this.contact={x:glove.x,y:glove.y,target:aim,pose,player:{x:player.x,y:player.y},coachPose,phase:layout.phase,error:Math.hypot(glove.x-aim.x,glove.y-aim.y)};
  }
}
