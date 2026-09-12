import Phaser from 'phaser';
import { HotelActivitySession } from '../game/HotelActivitySession.js';
import { HotelActivityUI } from '../ui/HotelActivityUI.js';
import { DailyActivityGate } from '../game/DailyActivityGate.js';
import { DailyActivityNotice } from '../ui/DailyActivityNotice.js';
import { careerProfile } from '../game/CareerProfile.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';
import { boxingTexture } from './OutfitView.js';
import { careerMenuOpen } from '../ui/GameControls.js';
const PLAYER_POSES=['guard','jab','cross','jab-windup','cross-windup','jab-recover','cross-recover','block','dodge'];
const COACH_POSES=['ready','left','right','sweep'];
export class HotelActivityScene extends Phaser.Scene{
  constructor(){super('HotelActivityScene');}
  init(data={}){this.activity=(data.activity??new URLSearchParams(location.search).get('scene'))==='pool'?'pool':'pads';this.place=this.activity==='pool'?'hotel-pool':'hotel-gym';}
  preload(){
    const b=import.meta.env.BASE_URL;this.load.image(`activity-${this.activity}`,`${b}assets/hotel/${this.activity==='pool'?'pool':'gym'}.png`);
    if(this.activity==='pool'){
      this.load.json('hotel-swimmer-data',`${b}assets/hotel/swimmer.json`);
      for(let i=0;i<4;i++)this.load.image(`hotel-swimmer-${i}`,`${b}assets/hotel/swimmer-${i}.png`);
    }else{
      this.load.json('hotel-pads-coach-data',`${b}assets/hotel/coach.json`);
      for(const pose of COACH_POSES)this.load.image(`hotel-pads-coach-${pose}`,`${b}assets/hotel/coach-${pose}.png`);
      this.load.json('hotel-pads-player-data',`${b}assets/sprites/sparring-v2/fighters.json`);
      for(const pose of PLAYER_POSES)this.load.image(`hotel-pads-player-${pose}`,`${b}assets/sprites/sparring-v2/player-${pose}.png`);
      this.load.image('hotel-pads-player-block-body',`${b}assets/sprites/body-training/player-block-body.png`);
    }
  }
  create(){
    if(!careerProfile.tournamentStatus().active){this.scene.start('ExplorationScene',{place:'neighborhood',entrance:'fight'});return;}
    setSceneShell(this.activity);this.session=new HotelActivitySession({activity:this.activity});this.rewarded=false;
    if(careerProfile.snapshot().location.scene!==this.place)careerProfile.setLocation({scene:this.place,x:640,y:610,facing:'up'});
    this.add.image(0,0,`activity-${this.activity}`).setOrigin(0).setDisplaySize(1280,720);
    this.audio=new SparringAudio();this.createActors();
    this.dailyGate=new DailyActivityGate({profile:careerProfile,getState:()=>this.session.state,activity:this.activity});
    const start=()=>this.dailyGate.start(()=>{this.session.reset();this.session.start();this.rewarded=false;this.visualDistance=0;this.audio.setActive(true);this.audio.play('round-start');});
    this.ui=new HotelActivityUI(this.activity,{
      onAction:action=>this.session.act(action),onGuard:(held,level)=>this.session.setGuard(held,level),onStart:start,
      onPause:()=>{this.session.pause();this.audio.setActive(false);},onResume:()=>{this.session.resume();this.audio.setActive(true);},
      onReturnGym:()=>{this.session.pause();this.audio.setActive(false);this.scene.start('HotelScene',{place:this.place});},
      onAudioGesture:()=>this.audio.unlock(),onMute:()=>{this.audio.setMuted(!this.audio.getState().muted);this.ui.setAudioState(this.audio.getState());if(!this.audio.getState().muted)this.audio.unlock();},
    });
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
      this.coach=this.add.image(640,612,'hotel-pads-coach-ready').setOrigin(.5,624/640).setScale(.85).setDepth(2);
      this.player=this.add.image(640,660,'hotel-pads-player-guard').setOrigin(.5,624/640).setScale(.68).setAlpha(.66).setDepth(4);
      this.add.ellipse(640,615,150,26,0x071a22,.25).setDepth(1);this.add.ellipse(640,663,140,28,0x071a22,.28).setDepth(3);
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
    if(this.dailyNotice.note.textContent.includes('rentre dormir à la maison'))this.dailyNotice.note.textContent=this.dailyNotice.note.textContent.replace('rentre dormir à la maison','repose-toi dans ta chambre après le combat');
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
    const a=s.player,cue=s.beat.expected;let pose='guard';
    if(a.action==='jab'||a.action==='cross')pose=a.phase==='windup'&&a.elapsed<.12?`${a.action}-windup`:a.phase==='recover'?`${a.action}-recover`:a.action;
    else if(a.action==='guardHead'||a.action==='idle'&&s.guard==='guardHead')pose='block';else if(a.action==='guardBody'||a.action==='idle'&&s.guard==='guardBody')pose='block-body';else if(a.action.startsWith('dodge'))pose='dodge';
    const coachPose=(a.action.startsWith('dodge')||a.action.startsWith('guard'))?'sweep':cue==='jab'||a.input==='jab'?'left':cue==='cross'||a.input==='cross'?'right':'ready';
    this.coach.setTexture(`hotel-pads-coach-${coachPose}`);
    const meta=this.coachMeta.poses[coachPose],point=meta[a.input==='cross'?'rightTarget':'leftTarget']??{x:126,y:191};
    const target={x:640+(point.x-256)*.85,y:612+(point.y-624)*.85};
    this.player.setTexture(boxingTexture(this,`hotel-pads-player-${pose}`)).setFlipX(a.action==='dodgeRight'||Boolean(this.playerMeta.poses[`player-${pose}`]?.mirror));
    const contactPose=a.input==='jab'||a.input==='cross';
    const move=contactPose?Math.min(1,a.elapsed/.20)*(a.phase==='recover'?Math.max(0,1-(a.elapsed-.29)/.27):1):0;
    const offsetX=a.input==='cross'?52*.68:-52*.68,dy=-568*.68;
    const exactX=target.x-offsetX,exactY=target.y-dy;
    this.player.setPosition(640+(exactX-640)*move,660+(exactY-660)*move);
    const bob=s.phase==='running'&&a.phase==='idle'?Math.sin(s.elapsed*5)*1.3:0;this.player.y+=bob;
    if(s.phase==='running'&&['jab','cross'].includes(cue)){
      const aim=this.coachMeta.poses[coachPose][cue==='cross'?'rightTarget':'leftTarget'];
      if(aim){const tx=640+(aim.x-256)*.85,ty=612+(aim.y-624)*.85;this.effect.lineStyle(2,0xffd489,s.beat.phase==='window'?.95:.35).strokeCircle(tx,ty,15);}
    }
    if(s.elapsed-this.lastHit<.16){const fade=1-(s.elapsed-this.lastHit)/.16;this.effect.lineStyle(3,0xffe0a1,fade).strokeCircle(target.x,target.y,15+(1-fade)*22);}
    this.contact={x:target.x,y:target.y,pose,player:{x:this.player.x,y:this.player.y},coachPose};
  }
}
