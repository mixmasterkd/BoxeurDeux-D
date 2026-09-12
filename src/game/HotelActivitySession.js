const EPS = 1e-8;
const SEQUENCE = ['jab', 'cross', 'guardHead', 'jab', 'cross', 'dodgeLeft', 'jab', 'guardBody', 'cross', 'dodgeRight'];
export const HOTEL_CUES = Object.freeze({ jab: 'Jab gauche', cross: 'Direct droit', guardHead: 'Garde haute', guardBody: 'Garde basse', dodgeLeft: 'Esquive gauche', dodgeRight: 'Esquive droite' });
/** The coach announces each cue before the acceptance window. A new input
 * starts an animation, and its contact (not its button press) scores the cue. */
export class HotelActivitySession {
  constructor({ activity = 'pads', duration = 45 } = {}) {
    this.activity = activity === 'pool' ? 'pool' : 'pads';
    this.duration = Math.max(5, Math.min(180, Number(duration) || 45));
    this.rules = { interval: this.activity === 'pool' ? .82 : 1.5, preparation: 2,
      tolerance: this.activity === 'pool' ? .22 : .42, contact: .20, duration: .56,
      hold: .09, minimumHits: this.activity === 'pool' ? 36 : 12 };
    this.reset();
  }
  reset() {
    this.events = []; this.action = null; this.index = 0;this.heldGuard=null;
    this.beats = [];
    for (let i=0; ; i++) {
      const inputAt = this.rules.preparation + i*this.rules.interval;
      if (inputAt + this.rules.tolerance + this.rules.duration > this.duration) break;
      this.beats.push({ index:i, expected: this.activity === 'pool' ? (i%2 ? 'cross':'jab') : SEQUENCE[i%SEQUENCE.length], inputAt, targetAt: inputAt+this.rules.contact, status:'waiting' });
    }
    this.state = { activity:this.activity, duration:this.duration, phase:'ready', elapsed:0, remaining:this.duration,
      rules:{...this.rules}, stats:{hits:0,wrong:0,early:0,late:0,missed:0,streak:0,bestStreak:0}, laps:0, distance:0,
      feedback:{text:'Observe le mouvement avant de commencer.',tone:'neutral',until:0}, summary:null };
    this.refresh(); return this.state;
  }
  start(){ if(this.state.phase!=='ready')return false; this.state.phase='running'; this.emit('round-start'); return true; }
  pause(){if(this.state.phase!=='running')return false; this.state.phase='paused';this.heldGuard=null;this.state.guard=null; return true;}
  resume(){if(this.state.phase!=='paused')return false; this.state.phase='running'; return true;}
  setGuard(held,level='head'){this.heldGuard=held?(level==='body'?'guardBody':'guardHead'):null;this.state.guard=this.heldGuard;if(this.action&&!this.action.impacted&&this.action.action.startsWith('guard')&&this.action.action!==this.heldGuard)this.action.result='wrong';}
  act(input){
    const s=this.state, beat=this.beats[this.index];
    if(s.phase!=='running'||this.action||!beat||beat.status!=='waiting'||s.remaining<this.rules.duration)return false;
    if(!['jab','cross','guardHead','guardBody','dodgeLeft','dodgeRight'].includes(input))return false;
    if(this.activity==='pool'&&!['jab','cross'].includes(input))return false;
    const offset=s.elapsed-beat.inputAt, inWindow=Math.abs(offset)<=this.rules.tolerance+EPS;
    const result=inWindow?(input===beat.expected?'hit':'wrong'):offset<0?'early':'late';
    if(inWindow)beat.status='pending';
    this.action={action:input,input,startedAt:s.elapsed,elapsed:0,duration:this.rules.duration,contact:this.rules.contact,
      hold:this.rules.hold,impacted:false,reserved:inWindow,result,index:beat.index,status:'pending'};
    this.refresh(); return true;
  }
  update(dt){
    if(this.state.phase!=='running'||!Number.isFinite(dt)||dt<=0)return;
    const s=this.state, end=Math.min(this.duration,s.elapsed+dt);
    while(s.elapsed<end-EPS){
      const a=this.action,beat=this.beats[this.index];
      let next=end;
      if(a)next=Math.min(next,a.startedAt+(a.impacted?a.duration:a.contact));
      if(beat?.status==='waiting')next=Math.min(next,beat.targetAt+this.rules.tolerance);
      if(!a&&beat?.status==='waiting'&&this.heldGuard===beat.expected&&s.elapsed<=beat.inputAt+EPS)next=Math.min(next,beat.inputAt);
      s.elapsed=Math.max(s.elapsed,next);s.remaining=this.duration-s.elapsed;
      if(!a&&beat?.status==='waiting'&&this.heldGuard===beat.expected&&Math.abs(s.elapsed-beat.inputAt)<=this.rules.tolerance+EPS)this.act(this.heldGuard);
      if(a){
        a.elapsed=s.elapsed-a.startedAt;
        if(!a.impacted&&a.elapsed+EPS>=a.contact)this.contact();
        if(a.elapsed+EPS>=a.duration)this.action=null;
      }
      const pending=this.beats[this.index];
      if(pending?.status==='waiting'&&s.elapsed+EPS>=pending.targetAt+this.rules.tolerance){
        pending.status='missed';this.index++;s.stats.missed++;s.stats.streak=0;
        this.feedback('Observe le prochain mouvement.','retry');this.emit('miss',{input:null});
      }
      if(s.remaining<=EPS)this.finish();
    }
    if(s.feedback.until<s.elapsed)s.feedback.text='';
    this.refresh();
  }
  contact(){
    const a=this.action,s=this.state;a.impacted=true;a.status=a.result==='hit'?'hit':'miss';
    if(a.result==='hit'){
      s.stats.hits++;s.stats.streak++;s.stats.bestStreak=Math.max(s.stats.bestStreak,s.stats.streak);
      if(this.activity==='pool'){s.distance=s.stats.hits/12;s.laps=Math.floor(s.distance);}
      this.feedback(this.activity==='pool'?'Bien glissé.':'Bien joué !','good');
    }else{s.stats[a.result]++;s.stats.streak=0;this.feedback(a.result==='wrong'?'Observe la consigne.':a.result==='early'?'Patience…':'Prépare le suivant.','retry');}
    if(a.reserved){this.beats[a.index].status=a.status;this.index=a.index+1;}
    this.emit(a.result==='hit'?'hit':'miss',{input:a.input,result:a.result});
  }
  refresh(){
    const s=this.state, b=this.beats[this.index];
    s.beat=b?{...b,phase:b.status==='pending'?'pending':Math.abs(s.elapsed-b.inputAt)<=this.rules.tolerance?'window':'approach'}
      :{phase:'complete',expected:null,inputAt:null,targetAt:null};
    s.player=this.action?{...this.action,phase:!this.action.impacted?'windup':this.action.elapsed<this.action.contact+this.action.hold?'contact':'recover'}
      :{action:'idle',input:null,phase:'idle',elapsed:0,duration:0,impacted:false};
  }
  finish(){
    const s=this.state;if(s.phase==='finished')return;s.phase='finished';s.remaining=0;this.action=null;
    const attempts=Object.entries(s.stats).filter(([key])=>['hits','wrong','early','late','missed'].includes(key)).reduce((n,[,v])=>n+v,0);
    const accuracy=attempts?Math.round(100*s.stats.hits/attempts):0;
    s.summary={...s.stats,accuracy,laps:s.laps,completed:true,qualified:s.stats.hits>=this.rules.minimumHits&&accuracy>=60};
    this.emit('round-end');
  }
  feedback(text,tone){this.state.feedback={text,tone,until:this.state.elapsed+.85};}
  emit(type,data={}){this.events.push({type,time:this.state.elapsed,...data});}
  drainEvents(){const events=this.events;this.events=[];return events;}
}
