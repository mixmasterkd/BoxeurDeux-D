/** A small deterministic arcade racer. Simulation is independent of Phaser,
 * rendering, saved careers and wall-clock time. Positive steering turns right. */
export const RACE_STEP = 1 / 120;
export const RACE_LAPS = 3;
export const RACE_ROAD_WIDTH = 112;
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const CONTROL_POINTS = [[365,584],[815,584],[1028,532],[1110,416],[1082,270],[938,159],[735,144],[623,240],[468,284],[274,288],[160,401],[191,526]];
function catmull(a,b,c,d,t) { return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t); }
const samples = [];
for (let i=0;i<CONTROL_POINTS.length;i++) for(let j=0;j<24;j++) {
  const n=CONTROL_POINTS.length,[a,b,c,d]=[-1,0,1,2].map(k=>CONTROL_POINTS[(i+k+n)%n]);
  samples.push({x:catmull(a[0],b[0],c[0],d[0],j/24),y:catmull(a[1],b[1],c[1],d[1],j/24)});
}
let length=0;
for(let i=0;i<samples.length;i++) {
  const a=samples[i],b=samples[(i+1)%samples.length];a.distance=length;
  a.segmentLength=Math.hypot(b.x-a.x,b.y-a.y);a.angle=Math.atan2(b.y-a.y,b.x-a.x);length+=a.segmentLength;
  Object.freeze(a);
}
export const RACE_TRACK = Object.freeze({width:1280,height:720,roadWidth:RACE_ROAD_WIDTH,length,points:Object.freeze(samples),checkpoints:16});
export const RACE_OBSTACLES = Object.freeze([
  {x:485,y:420,radius:31},{x:700,y:410,radius:31},{x:865,y:357,radius:29},
  {x:75,y:246,radius:22},{x:1190,y:521,radius:23},{x:994,y:90,radius:20},
].map(Object.freeze));
export function racePointAt(distance) {
  const wrapped=((distance%length)+length)%length;
  let lo=0,hi=samples.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(samples[mid].distance<=wrapped)lo=mid;else hi=mid-1;}
  const a=samples[lo],b=samples[(lo+1)%samples.length],t=(wrapped-a.distance)/a.segmentLength;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle,distance:wrapped};
}
export function raceNearestPoint(x,y) {
  let best=null;
  for(let i=0;i<samples.length;i++){
    const a=samples[i],b=samples[(i+1)%samples.length],dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(a.segmentLength*a.segmentLength),0,1);
    const px=a.x+t*dx,py=a.y+t*dy,dist=Math.hypot(x-px,y-py);
    if(!best||dist<best.offset)best={x:px,y:py,offset:dist,angle:a.angle,distance:a.distance+t*a.segmentLength};
  }
  return best;
}
export const RACE_GATES = Object.freeze(Array.from({length:16},(_,i)=>Object.freeze(racePointAt(length*i/16))));
function car(id,offset) {
  const p=racePointAt(0),nx=-Math.sin(p.angle),ny=Math.cos(p.angle);
  return {id,x:p.x+nx*offset,y:p.y+ny*offset,angle:p.angle,speed:0,lap:0,nextCheckpoint:1,checkpoints:0,
    distance:0,offroad:false,wrongWay:false,collision:0,finishedAt:null};
}
/** The opponent follows only the public circuit with the very same physics.
 * This function is also useful to drive a deterministic test lap. */
export function raceDriverInput(vehicle,{pace=195}={}) {
  const near=raceNearestPoint(vehicle.x,vehicle.y);
  const ahead=racePointAt(near.distance+clamp(55+Math.max(0,vehicle.speed)*.30,55,118));
  const error=angleDifference(Math.atan2(ahead.y-vehicle.y,ahead.x-vehicle.x),vehicle.angle);
  const bend=Math.abs(angleDifference(ahead.angle,near.angle));
  const target=clamp(pace-bend*90-Math.abs(error)*25,100,pace);
  return {steer:clamp(error*2.7,-1,1),throttle:vehicle.speed<target?1:0,brake:vehicle.speed>target+14?.35:0};
}
export class RetroRaceSession {
  constructor(){this.reset();}
  reset(){
    this.accumulator=0;this.input={steer:0,throttle:0,brake:0};this.events=[];this.resumePhase=null;
    this.state={phase:'ready',countdown:3,elapsed:0,ticks:0,laps:RACE_LAPS,player:car('player',18),opponent:car('opponent',-18),summary:null};
    return this.state;
  }
  start(){if(this.state.phase!=='ready')return false;this.state.phase='countdown';this.events.push({type:'countdown'});return true;}
  pause(){if(!['running','countdown'].includes(this.state.phase))return false;this.resumePhase=this.state.phase;this.state.phase='paused';this.setInput({});this.accumulator=0;return true;}
  resume(){if(this.state.phase!=='paused')return false;this.state.phase=this.resumePhase;this.resumePhase=null;return true;}
  setInput({steer=0,throttle=0,brake=0}={}){this.input={steer:clamp(Number(steer)||0,-1,1),throttle:clamp(Number(throttle)||0,0,1),brake:clamp(Number(brake)||0,0,1)};}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||!['running','countdown'].includes(this.state.phase))return;
    this.accumulator+=Math.min(dt,10);
    while(this.accumulator+1e-10>=RACE_STEP&&['running','countdown'].includes(this.state.phase)){
      this.accumulator-=RACE_STEP;this.step();
    }
  }
  step(){
    const s=this.state;
    if(s.phase==='countdown'){
      s.countdown=Math.max(0,s.countdown-RACE_STEP);
      if(s.countdown<1e-8){s.countdown=0;s.phase='running';this.events.push({type:'start'});}return;
    }
    s.ticks++;s.elapsed=s.ticks*RACE_STEP;
    const previous=[s.player,s.opponent].map(c=>({x:c.x,y:c.y}));
    this.moveCar(s.player,this.input,252);
    this.moveCar(s.opponent,raceDriverInput(s.opponent),238);
    this.collideCars();
    for(const [i,c] of [s.player,s.opponent].entries())this.progress(c,previous[i]);
    const finished=[s.player,s.opponent].filter(c=>c.finishedAt!==null).sort((a,b)=>a.finishedAt-b.finishedAt||a.id.localeCompare(b.id));
    if(finished.length){
      const winner=finished[0].id;
      s.phase='finished';s.summary={winner,timeMs:Math.round(finished[0].finishedAt*1000),playerTimeMs:s.player.finishedAt===null?null:Math.round(s.player.finishedAt*1000),laps:RACE_LAPS};
      this.setInput({});this.events.push({type:'finish',...s.summary});
    }
  }
  moveCar(c,input,maximum){
    const dt=RACE_STEP,near=raceNearestPoint(c.x,c.y);
    c.offroad=near.offset>RACE_ROAD_WIDTH/2-5;
    const limit=c.offroad?78:maximum;
    const acceleration=input.throttle*146-input.brake*(c.speed>8?280:100);
    c.speed+=acceleration*dt;
    if(!input.throttle&&!input.brake)c.speed*=Math.exp(-.45*dt);
    if(c.offroad)c.speed*=Math.exp(-1.5*dt);
    c.speed=clamp(c.speed,-60,limit);
    if(Math.abs(c.speed)>.5)c.angle+=input.steer*2.75*Math.min(1,Math.abs(c.speed)/65)*Math.sign(c.speed)*dt;
    c.angle=((c.angle+Math.PI)%TAU+TAU)%TAU-Math.PI;
    c.x+=Math.cos(c.angle)*c.speed*dt;c.y+=Math.sin(c.angle)*c.speed*dt;
    c.collision=Math.max(0,c.collision-dt);
    for(const o of RACE_OBSTACLES){
      const dx=c.x-o.x,dy=c.y-o.y,d=Math.hypot(dx,dy),minimum=o.radius+13;
      if(d<minimum){const nx=d?dx/d:1,ny=d?dy/d:0;c.x=o.x+nx*minimum;c.y=o.y+ny*minimum;c.speed*=.35;c.collision=.18;}
    }
    const x=clamp(c.x,40,1240),y=clamp(c.y,86,668);
    if(x!==c.x||y!==c.y){c.speed*=.3;c.collision=.18;c.x=x;c.y=y;}
    const heading=Math.abs(angleDifference(c.angle,near.angle));
    c.wrongWay=(heading>Math.PI*.58&&c.speed>15)||(heading<Math.PI*.42&&c.speed< -15);
    c.distance=near.distance;
  }
  collideCars(){
    const a=this.state.player,b=this.state.opponent,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
    if(d>=28)return;
    const nx=d?dx/d:0,ny=d?dy/d:1,overlap=(28-d)/2;
    a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
    // Contact scrubs speed; no random boost or teleport can settle a race.
    if(a.collision<=0&&b.collision<=0){a.speed*=.70;b.speed*=.70;}
    a.collision=b.collision=.12;
  }
  progress(c,previous){
    const gate=RACE_GATES[c.nextCheckpoint],tx=Math.cos(gate.angle),ty=Math.sin(gate.angle);
    const before=(previous.x-gate.x)*tx+(previous.y-gate.y)*ty;
    const after=(c.x-gate.x)*tx+(c.y-gate.y)*ty;
    if(before>=0||after<0||after-before<=0)return;
    const fraction=-before/(after-before),x=previous.x+(c.x-previous.x)*fraction,y=previous.y+(c.y-previous.y)*fraction;
    if(Math.abs((x-gate.x)*-ty+(y-gate.y)*tx)>RACE_ROAD_WIDTH/2-3)return;
    // Only contiguous gates count. Cutting across the infield or crossing the
    // finish backward never creates a lap; the missed gate stays the target.
    c.checkpoints++;c.nextCheckpoint=(c.nextCheckpoint+1)%RACE_GATES.length;
    if(c.nextCheckpoint===1){c.lap++;this.events.push({type:'lap',car:c.id,lap:c.lap});}
    if(c.lap===RACE_LAPS)c.finishedAt=this.state.elapsed-RACE_STEP+fraction*RACE_STEP;
  }
  drainEvents(){const events=this.events;this.events=[];return events;}
}
