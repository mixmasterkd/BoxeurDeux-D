/** Jeu de 8 de loisir, sans enjeu. Physique à pas fixe et décisions IA déterministes. */
export const BILLIARDS_TABLE = Object.freeze({ x:120, y:185, width:1040, height:460, radius:12, pocketRadius:25 });
const T=BILLIARDS_TABLE, R=T.radius, STEP=1/180, FRICTION=155, MAX_SPEED=900;
export const BILLIARDS_POCKETS = Object.freeze([[T.x,T.y],[T.x+T.width/2,T.y],[T.x+T.width,T.y],[T.x,T.y+T.height],[T.x+T.width/2,T.y+T.height],[T.x+T.width,T.y+T.height]].map(([x,y])=>Object.freeze({x,y})));
export const BILLIARDS_RULES = 'Jeu de 8 simplifié : empoche une bille pour choisir les pleines (1–7) ou les rayées (9–15). Une bille de ton groupe empochée sans faute te laisse jouer. Touche d’abord ton groupe, puis une bande ou une poche. Blanche empochée, aucune bille touchée ou mauvais premier contact : blanche en main pour l’autre joueur. Après avoir vidé ton groupe, empoche la 8 sans faute pour gagner. La 8 trop tôt fait perdre, même à la casse. Pas de poche à annoncer. Aucun argent ni énergie en jeu.';
export const billiardsGroup = id => id>=1&&id<=7?'solids':id>=9&&id<=15?'stripes':null;
export const billiardsGroupLabel = group => group==='solids'?'Pleines 1–7':group==='stripes'?'Rayées 9–15':'Table ouverte';
const other = player => player==='player'?'opponent':'player';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function rack(){
  const balls=[{id:0,x:350,y:415,vx:0,vy:0,pocketed:false}];
  // La 8 au centre; coins arrière de groupes différents.
  const ids=[1,9,2,3,8,10,11,4,12,5,6,13,7,14,15];let i=0;
  for(let row=0;row<5;row++)for(let col=0;col<=row;col++)balls.push({id:ids[i++],x:825+row*(R*2+.18)*Math.sqrt(3)/2,y:415+(col-row/2)*(R*2+.18),vx:0,vy:0,pocketed:false});
  return balls;
}
function distanceToSegment(ball,a,b){const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;const t=den?clamp(((ball.x-a.x)*dx+(ball.y-a.y)*dy)/den,0,1):0;return Math.hypot(ball.x-a.x-t*dx,ball.y-a.y-t*dy);}
export class BilliardsSession {
  constructor({opponent='beton'}={}){this.opponent=opponent==='kramer'?'kramer':'beton';this.reset();}
  reset(){this.accumulator=0;this.events=[];this.state={phase:'ready',paused:false,turn:'player',opponent:this.opponent,balls:rack(),groups:{player:null,opponent:null},angle:0,power:.7,elapsed:0,shots:0,shot:null,restTime:0,aiTime:0,winner:null,message:'À toi de casser. Choisis une direction et la puissance.',lastShot:null};return this.state;}
  start(){if(this.state.phase!=='ready')return false;this.state.phase='aiming';return true;}
  pause(){if(this.state.paused||['ready','finished'].includes(this.state.phase))return false;this.state.paused=true;return true;}
  resume(){if(!this.state.paused)return false;this.state.paused=false;return true;}
  canAim(){return !this.state.paused&&this.state.phase==='aiming'&&this.state.turn==='player';}
  setAim(angle,power=this.state.power){if(!this.canAim()||!Number.isFinite(angle)||!Number.isFinite(power))return false;this.state.angle=angle;this.state.power=clamp(power,.12,1);return true;}
  cue(){return this.state.balls.find(b=>b.id===0);}
  targets(player=this.state.turn){const s=this.state,group=s.groups[player];const remaining=s.balls.filter(b=>!b.pocketed&&billiardsGroup(b.id)===group&&group);return group?(remaining.length?remaining:s.balls.filter(b=>!b.pocketed&&b.id===8)):s.balls.filter(b=>!b.pocketed&&billiardsGroup(b.id));}
  shoot(angle=this.state.angle,power=this.state.power){
    const s=this.state;if(s.paused||s.phase!=='aiming'||!Number.isFinite(angle)||!Number.isFinite(power)||power<.12||power>1)return false;
    s.shot={player:s.turn,firstContact:null,pocketed:[],railAfterContact:false,legalTargets:this.targets().map(b=>b.id),groupAtStart:s.groups[s.turn]};
    s.phase='rolling';s.shots++;s.restTime=0;s.aiTime=0;this.accumulator=0;
    const cue=this.cue();cue.vx=Math.cos(angle)*power*MAX_SPEED;cue.vy=Math.sin(angle)*power*MAX_SPEED;
    this.events.push({type:'shot'});s.message=s.turn==='player'?'Les billes roulent…':`${this.opponent==='kramer'?'Kramer':'Béton'} joue…`;return true;
  }
  validCuePosition(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=T.x+R&&x<=T.x+T.width-R&&y>=T.y+R&&y<=T.y+T.height-R&&!BILLIARDS_POCKETS.some(p=>Math.hypot(p.x-x,p.y-y)<T.pocketRadius+R)&&!this.state.balls.some(b=>b.id!==0&&!b.pocketed&&Math.hypot(b.x-x,b.y-y)<2*R+1);}
  findCuePosition(){for(let x=350;x<T.x+T.width-R;x+=35)for(let y=415;y<T.y+T.height-R;y+=35)if(this.validCuePosition(x,y))return{x,y};for(let x=T.x+40;x<T.x+T.width-40;x+=30)for(let y=T.y+40;y<T.y+T.height-40;y+=30)if(this.validCuePosition(x,y))return{x,y};return{x:350,y:415};}
  placeCue(x,y){if(this.state.paused||this.state.phase!=='ball-in-hand'||!this.validCuePosition(x,y))return false;Object.assign(this.cue(),{x,y,vx:0,vy:0,pocketed:false});return true;}
  confirmPlacement(){if(this.state.paused||this.state.phase!=='ball-in-hand')return false;const b=this.cue();if(!this.validCuePosition(b.x,b.y))return false;this.state.phase='aiming';this.state.aiTime=0;this.state.message='Blanche placée. Choisis ta direction.';return true;}
  update(dt){
    const s=this.state;if(s.paused||['ready','finished'].includes(s.phase)||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.1);s.elapsed+=dt;
    if(s.phase==='rolling'){this.accumulator+=dt;while(this.accumulator+1e-9>=STEP&&s.phase==='rolling'){this.step(STEP);this.accumulator-=STEP;}}
    else if(s.turn==='opponent'){
      s.aiTime+=dt;if(s.aiTime>=1.05){s.aiTime=0;if(s.phase==='ball-in-hand'){const p=this.findCuePosition();this.placeCue(p.x,p.y);this.confirmPlacement();}else{const plan=this.planAI();this.shoot(plan.angle,plan.power);}}
    }
  }
  step(dt){
    const s=this.state,live=s.balls.filter(b=>!b.pocketed);
    for(const b of live){
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      const pocket=BILLIARDS_POCKETS.find(p=>Math.hypot(b.x-p.x,b.y-p.y)<T.pocketRadius);
      if(pocket){b.pocketed=true;b.vx=b.vy=0;s.shot.pocketed.push(b.id);this.events.push({type:'pocket',id:b.id});continue;}
      let rail=false;
      if(b.x<T.x+R){b.x=T.x+R;b.vx=Math.abs(b.vx)*.86;rail=true;}else if(b.x>T.x+T.width-R){b.x=T.x+T.width-R;b.vx=-Math.abs(b.vx)*.86;rail=true;}
      if(b.y<T.y+R){b.y=T.y+R;b.vy=Math.abs(b.vy)*.86;rail=true;}else if(b.y>T.y+T.height-R){b.y=T.y+T.height-R;b.vy=-Math.abs(b.vy)*.86;rail=true;}
      if(rail&&s.shot.firstContact!==null)s.shot.railAfterContact=true;
    }
    for(let pass=0;pass<2;pass++)for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
      const a=live[i],b=live[j];if(a.pocketed||b.pocketed)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=2*R)continue;
      const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,overlap=2*R-d+.001;a.x-=nx*overlap/2;a.y-=ny*overlap/2;b.x+=nx*overlap/2;b.y+=ny*overlap/2;
      const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(relative>=0)continue;
      if(s.shot.firstContact===null&&(a.id===0||b.id===0))s.shot.firstContact=a.id===0?b.id:a.id;
      const impulse=-relative*.975;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
    }
    let moving=false;
    for(const b of live){if(b.pocketed)continue;const speed=Math.hypot(b.vx,b.vy),next=Math.max(0,speed-FRICTION*dt);if(next<4){b.vx=b.vy=0;}else{b.vx*=next/speed;b.vy*=next/speed;moving=true;}}
    s.restTime=moving?0:s.restTime+dt;if(s.restTime>.15)this.finishShot();
  }
  finishShot(){
    const s=this.state,shot=s.shot;if(s.phase!=='rolling'||!shot)return;
    const scratched=shot.pocketed.includes(0),badContact=!shot.legalTargets.includes(shot.firstContact),noRail=!shot.railAfterContact&&!shot.pocketed.length;
    const foul=scratched?'Blanche empochée':badContact?(shot.firstContact===null?'Aucune bille touchée':'Mauvais premier contact'):noRail?'Aucune bande ni poche après contact':null;
    s.lastShot={...shot,pocketed:[...shot.pocketed],foul};s.shot=null;
    if(shot.pocketed.includes(8)){
      s.winner=!foul&&shot.legalTargets.includes(8)?shot.player:other(shot.player);s.phase='finished';
      s.message=s.winner==='player'?'Tu remportes la partie !':`${this.opponent==='kramer'?'Kramer':'Béton'} remporte la partie.`;
      if(foul||!shot.legalTargets.includes(8))s.message+=' La 8 est entrée trop tôt ou avec une faute.';
      this.events.push({type:'finished',winner:s.winner});return;
    }
    if(!foul&&!s.groups[shot.player]){const first=shot.pocketed.find(id=>billiardsGroup(id));if(first){s.groups[shot.player]=billiardsGroup(first);s.groups[other(shot.player)]=s.groups[shot.player]==='solids'?'stripes':'solids';}}
    const retained=!foul&&shot.pocketed.some(id=>billiardsGroup(id)===s.groups[shot.player]&&s.groups[shot.player]);
    s.turn=retained?shot.player:other(shot.player);s.aiTime=0;
    if(foul){s.phase='ball-in-hand';const p=this.findCuePosition();Object.assign(this.cue(),p,{pocketed:false,vx:0,vy:0});s.message=`Faute : ${foul.toLowerCase()}. ${s.turn==='player'?'Place la blanche, puis valide.':'Blanche en main pour ton adversaire.'}`;}
    else{s.phase='aiming';s.message=s.turn==='player'?(retained?'Bien joué, tu continues.':'À toi de jouer.'):`Au tour de ${this.opponent==='kramer'?'Kramer':'Béton'}.`;}
    this.events.push({type:'turn',turn:s.turn,foul});
  }
  planAI(){
    const s=this.state,cue=this.cue(),targets=this.targets(),live=s.balls.filter(b=>!b.pocketed);let best=null;
    for(const target of targets)for(const pocket of BILLIARDS_POCKETS){
      const distance=Math.hypot(pocket.x-target.x,pocket.y-target.y),dx=(pocket.x-target.x)/distance,dy=(pocket.y-target.y)/distance;
      const ghost={x:target.x-dx*2*R,y:target.y-dy*2*R},travel=Math.hypot(ghost.x-cue.x,ghost.y-cue.y);
      if(ghost.x<T.x+R||ghost.x>T.x+T.width-R||ghost.y<T.y+R||ghost.y>T.y+T.height-R||travel<1)continue;
      const alignment=((ghost.x-cue.x)*dx+(ghost.y-cue.y)*dy)/travel;if(alignment<.2)continue;
      if(live.some(b=>b.id!==0&&b.id!==target.id&&(distanceToSegment(b,cue,ghost)<2*R+.5||distanceToSegment(b,target,pocket)<2*R+.5)))continue;
      const score=travel+distance*1.5+(1-alignment)*450;if(!best||score<best.score)best={score,angle:Math.atan2(ghost.y-cue.y,ghost.x-cue.x),power:clamp(Math.sqrt(2*FRICTION*(travel+distance/Math.max(.25,alignment)*1.2))/MAX_SPEED,.25,.95)};
    }
    if(!best){const target=targets.reduce((best,b)=>!best||Math.hypot(b.x-cue.x,b.y-cue.y)<Math.hypot(best.x-cue.x,best.y-cue.y)?b:best,null);best={angle:target?Math.atan2(target.y-cue.y,target.x-cue.x):0,power:s.shots===0?.85:.6};}
    // Personnalités modestes, aucune connaissance de hasard ni aide cachée.
    const error=Math.sin((s.shots+1)*12.9898)*(this.opponent==='kramer'?.009:.023);return{angle:best.angle+error,power:best.power};
  }
  drainEvents(){return this.events.splice(0);}
}
