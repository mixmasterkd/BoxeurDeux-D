import { TRAIN_TRAVEL_SECONDS } from './TrainSession.js';

const DISTANCE=3200, WIDTH=1280, TUNNEL_START=1500, TUNNEL_END=3000;
// Doors finish closing before acceleration; braking finishes before opening.
const CLOSE_SECONDS=.36, SETTLE_SECONDS=.4;
export function trainTravelDistance(elapsed) {
  const p=Math.max(0,Math.min(1,(elapsed-CLOSE_SECONDS)/(TRAIN_TRAVEL_SECONDS-CLOSE_SECONDS-SETTLE_SECONDS)));
  return DISTANCE*p*p*(3-2*p);
}

/** A continuous exterior position, independent of the player's walk and FPS.
 * Keep the completed journey's direction when reversing at a terminus. */
export class TrainWindowMotion {
  constructor(){this.origin=0;this.offset=0;this.moving=false;this.direction=1;}
  update(train) {
    const moving=train.phase==='moving';
    if(moving&&!this.moving){this.origin=this.offset;this.direction=train.direction;}
    if(!moving&&this.moving)this.offset=this.origin+this.direction*DISTANCE;
    const distance=moving?trainTravelDistance(train.elapsed):0;
    if(moving)this.offset=this.origin+this.direction*distance;
    this.moving=moving;
    const left=TUNNEL_START-distance,right=TUNNEL_END-distance;
    return {offset:this.offset,distance,direction:this.direction,
      tunnel:moving?(this.direction===1?{left,right}:{left:WIDTH-right,right:WIDTH-left}):null};
  }
}
