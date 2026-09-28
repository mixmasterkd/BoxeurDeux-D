import Phaser from 'phaser';
import { BilliardsSession, BILLIARDS_TABLE, BILLIARDS_POCKETS } from '../game/BilliardsSession.js';
import { BilliardsUI } from '../ui/BilliardsUI.js';
import { careerProfile } from '../game/CareerProfile.js';
import { sceneForPlace } from '../game/SceneRouting.js';
import { ISLAND_BAR_RETURNS } from '../game/HomeBarWorld.js';
import { setSceneShell } from '../ui/SceneShell.js';
import { careerMenuOpen } from '../ui/GameControls.js';
const COLORS=[0xffffff,0xf5ce4f,0x4e7ecd,0xd14e49,0x7d65ac,0xe39445,0x46a985,0x91483d,0x161b21];
export class BilliardsScene extends Phaser.Scene{
  constructor(){super('BilliardsScene');}
  init({opponent='beton',returnLocation}={}){this.opponent=opponent==='kramer'?'kramer':'beton';this.returnLocation=returnLocation?.scene==='island-bar'?{...returnLocation}:{...ISLAND_BAR_RETURNS[this.opponent]};this.place='island-bar';this.sessionId=null;this.settled=false;this.changing=false;this.vector={x:0,y:0};}
  create(){
    setSceneShell('gym');document.getElementById('stage').dataset.scene='billiards';document.getElementById('stage').setAttribute('aria-label','Billard au Bar de l’Île, dans le quartier');document.getElementById('game').setAttribute('aria-label','Table de billard vue du dessus. Jeu de 8 contre un ami.');document.querySelector('.prototype-label').textContent='LE BAR DE L’ÎLE · BILLARD';document.querySelector('.gym-location').textContent='UNE PARTIE ENTRE AMIS';
    this.session=new BilliardsSession({opponent:this.opponent});this.drawTable();this.balls=this.add.graphics();this.aim=this.add.graphics();this.numbers=Array.from({length:16},(_,id)=>this.add.text(0,0,String(id),{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#172124'}).setOrigin(.5));
    this.ui=new BilliardsUI({onStart:()=>this.startGame(),onMove:v=>{this.vector=v;},onAction:()=>this.action(),onPower:p=>this.session.setAim(this.session.state.angle,p),onPause:()=>this.session.pause(),onResume:()=>{if(!this.ui.allowed())return;this.session.resume();},onReturn:()=>this.returnToBar()},{opponent:this.opponent,record:this.record()});
    this.input.on('pointerdown',this.point,this);this.input.on('pointermove',this.point,this);
    this.resizeObserver=new ResizeObserver(()=>{this.scale.getParentBounds();this.scale.refresh();});this.resizeObserver.observe(document.getElementById('game'));
    const cleanup=()=>{if(this.disposed)return;this.disposed=true;this.events.off('shutdown',cleanup);this.events.off('destroy',cleanup);if(this.sessionId&&!this.settled)careerProfile.abandonLeisureGame(this.sessionId);this.sessionId=null;this.input.off('pointerdown',this.point,this);this.input.off('pointermove',this.point,this);this.ui.destroy();this.resizeObserver.disconnect();if(import.meta.env.DEV&&window.__billiards?.scene===this)delete window.__billiards;};
    this.disposed=false;this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);if(import.meta.env.DEV)window.__billiards={scene:this,session:this.session,ui:this.ui};this.ui.update(this.session.state);this.renderBalls();
  }
  record(){return careerProfile.leisureStatus?.().billiards?.[this.opponent]??{playerWins:0,opponentWins:0};}
  startGame(){
    if(!this.ui.allowed()||!['ready','finished'].includes(this.session.state.phase))return;
    const result=careerProfile.beginLeisureGame('billiards',this.opponent);if(!result.ok){this.ui.showMessage(result.message);return;}
    this.sessionId=result.id;this.settled=false;this.session.reset();this.session.start();this.ui.update(this.session.state,this.record());
  }
  action(){if(!this.ui.canPlay())return;if(this.session.state.phase==='ball-in-hand')this.session.confirmPlacement();else this.session.shoot();this.ui.clearInputs();}
  point(pointer){
    if(!this.ui?.canPlay()||this.changing)return;if(pointer.event?.type==='pointermove'&&pointer.pointerType!=='mouse'&&!pointer.isDown)return;
    const T=BILLIARDS_TABLE,x=pointer.x,y=pointer.y;if(x<T.x||x>T.x+T.width||y<T.y||y>T.y+T.height)return;
    if(this.session.state.phase==='ball-in-hand'){if(pointer.isDown)this.session.placeCue(x,y);}else{const cue=this.session.cue();this.session.setAim(Math.atan2(y-cue.y,x-cue.x));}
  }
  returnToBar(){if(this.changing)return;this.changing=true;this.ui.clearInputs();this.session.pause();if(this.sessionId&&!this.settled)careerProfile.abandonLeisureGame(this.sessionId);this.sessionId=null;careerProfile.setLocation(this.returnLocation);this.scene.start(sceneForPlace(this.returnLocation.scene),{place:this.returnLocation.scene,location:this.returnLocation});}
  update(_time,delta){
    if(!this.ui||this.changing||this.disposed)return;
    if(careerMenuOpen()||document.hidden||this.ui.portraitQuery.matches)this.session.pause();
    const dt=Math.min((this.game.loop.rawDelta??delta)/1000,.1),s=this.session.state;
    if(this.ui.canPlay()){
      if(s.phase==='aiming')this.session.setAim(s.angle+this.vector.x*dt*.95,s.power-this.vector.y*dt*.32);
      else if(s.phase==='ball-in-hand'){const cue=this.session.cue();this.session.placeCue(cue.x+this.vector.x*dt*235,cue.y+this.vector.y*dt*235);}
    }
    this.session.update(dt);
    if(s.phase==='finished'&&!this.settled&&this.sessionId){this.settled=true;const result=careerProfile.recordLeisureResult({id:this.sessionId,winner:s.winner,timeMs:Math.round(s.elapsed*1000)});s.resultSaved=result.ok&&result.saved;if(result.ok&&!result.saved)s.message+=` ${result.message}`;if(!result.ok){s.message+=` ${result.message}`;careerProfile.abandonLeisureGame(this.sessionId);}}
    this.session.drainEvents();this.ui.update(s,this.record());this.renderBalls();
  }
  drawTable(){
    const T=BILLIARDS_TABLE,g=this.add.graphics();g.fillStyle(0x152526).fillRect(0,0,1280,720);g.fillStyle(0x0c1719).fillRoundedRect(T.x-48,T.y-49,T.width+96,T.height+99,32);g.fillStyle(0x603c2a).fillRoundedRect(T.x-38,T.y-38,T.width+76,T.height+76,27);g.lineStyle(4,0xb58243).strokeRoundedRect(T.x-32,T.y-32,T.width+64,T.height+64,22);g.fillStyle(0x164c42).fillRect(T.x-12,T.y-12,T.width+24,T.height+24);g.fillStyle(0x216653).fillRect(T.x,T.y,T.width,T.height);
    g.lineStyle(1,0x82ad8e,.3).lineBetween(T.x+T.width/4,T.y+25,T.x+T.width/4,T.y+T.height-25);g.fillStyle(0xe6d8b6,.6).fillCircle(825,415,3);
    for(const p of BILLIARDS_POCKETS){g.fillStyle(0x9d7948).fillCircle(p.x,p.y,31);g.fillStyle(0x070f10).fillCircle(p.x,p.y,26);g.lineStyle(2,0x020908).strokeCircle(p.x,p.y,23);}
    for(let i=1;i<8;i++){if(i===4)continue;g.fillStyle(0xe4c99a).fillCircle(T.x+i*T.width/8,T.y-24,3).fillCircle(T.x+i*T.width/8,T.y+T.height+24,3);}
  }
  renderBalls(){
    const s=this.session.state,g=this.balls;g.clear();this.aim.clear();
    for(const b of s.balls){const text=this.numbers[b.id];text.setVisible(!b.pocketed&&b.id!==0);if(b.pocketed)continue;g.fillStyle(0x071815,.35).fillCircle(b.x+3,b.y+4,13);const color=COLORS[b.id>8?b.id-8:b.id];g.fillStyle(b.id>8?0xf3ebd4:color).fillCircle(b.x,b.y,12);if(b.id>8){g.fillStyle(color).fillRoundedRect(b.x-11,b.y-6,22,12,4);}if(b.id!==0){g.fillStyle(0xfff5dd).fillCircle(b.x,b.y,7);text.setPosition(b.x,b.y+.5);}g.fillStyle(0xffffff,.55).fillCircle(b.x-4,b.y-5,3);}
    if(s.turn!=='player'||s.paused||!['aiming','ball-in-hand'].includes(s.phase))return;const b=this.session.cue(),a=this.aim;
    if(s.phase==='ball-in-hand'){a.lineStyle(2,0xffdb80).strokeCircle(b.x,b.y,19);return;}
    const dx=Math.cos(s.angle),dy=Math.sin(s.angle);a.lineStyle(2,0xe6f4d3,.6);for(let i=22;i<260;i+=16)a.lineBetween(b.x+dx*i,b.y+dy*i,b.x+dx*(i+7),b.y+dy*(i+7));a.lineStyle(5,0xc9a66d).lineBetween(b.x-dx*25,b.y-dy*25,b.x-dx*145,b.y-dy*145);a.lineStyle(6,0x764c32).lineBetween(b.x-dx*95,b.y-dy*95,b.x-dx*145,b.y-dy*145);a.lineStyle(5,0x8dc4c2).lineBetween(b.x-dx*21,b.y-dy*21,b.x-dx*26,b.y-dy*26);
  }
}
