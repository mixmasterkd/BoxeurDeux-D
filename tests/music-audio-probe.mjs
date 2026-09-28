// Browser-only instrumentation installed before game modules. The native Web
// Audio renderer stays intact; an unconnected analyser observes each output.
export function installAudioProbe(){
 const NativeContext=window.AudioContext||window.webkitAudioContext;
 const state={contexts:[],sources:[],nextContext:0,nextSource:0,started:0};
 const contextIds=new WeakMap(),frequencyEvents=new WeakMap();
 const nativeConnect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...args){
  const result=nativeConnect.call(this,destination,...args);
  if(destination===this.context.destination){
   const record=state.contexts.find(c=>c.context===this.context);
   if(record&&!record.outputs.some(o=>o.node===this)){
    const analyser=this.context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0;
    nativeConnect.call(this,analyser);record.outputs.push({node:this,analyser});
   }
  }
  return result;
 };
 const valueAt=AudioParam.prototype.setValueAtTime;
 AudioParam.prototype.setValueAtTime=function(value,at){
  const events=frequencyEvents.get(this)||[];events.push({value,at});frequencyEvents.set(this,events);
  return valueAt.call(this,value,at);
 };
 if(NativeContext){
  const Watched=class extends NativeContext{
   constructor(...args){super(...args);const id=++state.nextContext;contextIds.set(this,id);state.contexts.push({id,context:this,outputs:[],resumes:0,suspends:0,closes:0});}
   resume(...args){state.contexts.find(c=>c.context===this).resumes++;return super.resume(...args);}
   suspend(...args){state.contexts.find(c=>c.context===this).suspends++;return super.suspend(...args);}
   close(...args){state.contexts.find(c=>c.context===this).closes++;return super.close(...args);}
  };
  window.AudioContext=Watched;if(window.webkitAudioContext)window.webkitAudioContext=Watched;
 }
 for(const Type of [window.OscillatorNode,window.AudioBufferSourceNode].filter(Boolean)){
  const nativeStart=Type.prototype.start,nativeStop=Type.prototype.stop;
  const records=new WeakMap();
  Type.prototype.start=function(...args){
   const record={id:++state.nextSource,contextId:contextIds.get(this.context),source:this,
    kind:this instanceof OscillatorNode?'oscillator':'buffer',type:this.type??null,
    frequency:this.frequency?.value??null,frequencyEvents:frequencyEvents.get(this.frequency)||[],
    bufferDuration:this.buffer?.duration??null,startedAt:args[0]??this.context.currentTime,stops:[],ended:false};
   records.set(this,record);state.sources.push(record);state.started++;
   this.addEventListener('ended',()=>{record.ended=true;},{once:true});
   return nativeStart.apply(this,args);
  };
  Type.prototype.stop=function(...args){const record=records.get(this);if(record)record.stops.push(args[0]??this.context.currentTime);return nativeStop.apply(this,args);};
 }
 const snapshot=()=>({
  started:state.started,
  contexts:state.contexts.map(record=>({id:record.id,state:record.context.state,time:record.context.currentTime,sampleRate:record.context.sampleRate,resumes:record.resumes,suspends:record.suspends,closes:record.closes,outputs:record.outputs.length,
   starts:state.sources.filter(s=>s.contextId===record.id).length,
   activeSources:state.sources.filter(s=>s.contextId===record.id&&!s.ended&&record.context.state!=='closed'&&(s.stops.length===0||Math.min(...s.stops)>record.context.currentTime)).length})),
  recent:state.sources.slice(-50).map(({id,contextId,kind,type,frequency,frequencyEvents,bufferDuration,startedAt,stops,ended})=>({id,contextId,kind,type,frequency,frequencyEvents:frequencyEvents.slice(0,4),bufferDuration,startedAt,stops,ended})),
 });
 const measure=async(milliseconds=900)=>{
  const stats=new Map(state.contexts.map(c=>[c.id,{id:c.id,energy:0,samples:0,peak:0,nonzero:0}]));
  const until=performance.now()+milliseconds;
  while(performance.now()<until){
   for(const record of state.contexts){
    if(!stats.has(record.id))stats.set(record.id,{id:record.id,energy:0,samples:0,peak:0,nonzero:0});
    const item=stats.get(record.id);
    if(record.context.state!=='running')continue;
    for(const {analyser} of record.outputs){
     const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
     for(const value of samples){item.energy+=value*value;item.samples++;item.peak=Math.max(item.peak,Math.abs(value));if(Math.abs(value)>1e-7)item.nonzero++;}
    }
   }
   await new Promise(resolve=>setTimeout(resolve,30));
  }
  return [...stats.values()].map(v=>({...v,rms:Math.sqrt(v.energy/Math.max(1,v.samples))}));
 };
 Object.defineProperty(window,'__musicProbe',{value:{snapshot,measure},configurable:true});
}
