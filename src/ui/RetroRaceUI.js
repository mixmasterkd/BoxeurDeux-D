import {GameControls,careerMenuOpen} from './GameControls.js';
import {mountSideControls,TOUCH_PORTRAIT_QUERY} from './GameLayout.js';
import './retro-race.css';
export const raceClock=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms%1000/10)).padStart(2,'0')}`;
export class RetroRaceUI {
  constructor(callbacks){
    this.callbacks=callbacks;this.phase='ready';this.vector={x:0,y:0};this.abort=new AbortController();this.stage=document.getElementById('stage');this.portrait=matchMedia(TOUCH_PORTRAIT_QUERY);
    this.root=document.createElement('div');this.root.id='retro-race-ui';this.root.className='retro-race-ui';
    this.root.innerHTML=`<header class="race-hud"><span class="race-lap">TOUR 1 / 3</span><strong class="race-time">0:00.00</strong><span><span class="race-position">1er</span> · <span class="race-speed">0 km/h</span></span></header>
      <div class="race-countdown" aria-live="polite" hidden></div><div class="race-warning" role="status"></div>
      <div class="race-shade"></div>
      <section class="race-panel" role="dialog" aria-modal="true" aria-labelledby="race-title">
        <p class="race-eyebrow">LA CONSOLE DU SALON · 1 CONTRE 1</p><h2 id="race-title">Un dernier tour, Karl ?</h2>
        <p class="race-copy">Ta GR Corolla rouge, blanche et noire contre la Camaro jaune de Karl. Trois tours sur le circuit du parc.</p>
        <p class="race-record"></p><p class="race-help">↑ Accélérer · ↓ Freiner / reculer · ← → Braquer<br>Le gazon ralentit. Suis les flèches du circuit.</p>
        <p class="race-message" role="status"></p>
        <div class="race-actions"><button type="button" class="primary-button" data-race-action="start">Jouer contre Karl</button><button type="button" data-race-action="resume" hidden>Reprendre la course</button><button type="button" data-race-action="return">← Retour au salon</button></div>
        <div class="panel-options"></div>
      </section>
      <button type="button" class="race-pause-button" aria-label="Menu pause">☰</button><button type="button" class="gym-interact-button"><span class="control-key">A</span><span class="control-label">Accélérer</span></button>`;
    this.stage.append(this.root);this.panel=this.root.querySelector('.race-panel');
    mountSideControls(this.root,{right:['.race-pause-button','.gym-interact-button']});
    this.controls=new GameControls({root:this.root,mode:'gym',canPlay:()=>['running','countdown'].includes(this.phase),canInteract:()=>true,
      getMenu:()=>this.panel.hidden?null:this.panel,onMove:vector=>{this.vector=vector;},onInteract:()=>{},
      onPause:()=>callbacks.onPause(),onMenu:()=>this.phase==='paused'?callbacks.onResume():callbacks.onPause(),
      onBack:()=>this.phase==='paused'?callbacks.onResume():callbacks.onReturn(),
    });
    // Gym interactions are normally single presses and clear their pointer.
    // A race uses held pedals: preserve their captures in play, while keeping
    // the common A/B confirmation behaviour inside every menu.
    const menuPress=this.controls.pressAction.bind(this.controls);
    this.controls.pressAction=letter=>{if(this.controls.menu())menuPress(letter);else if(!this.controls.allowed()||!this.controls.canPlay())this.controls.clear();};
    this.controls.pad.setAttribute('aria-label','Joypad : gauche et droite pour braquer, haut pour accélérer, bas pour freiner');
    this.root.querySelector('[data-race-action="start"]').addEventListener('click',()=>callbacks.onStart(),{signal:this.abort.signal});
    this.root.querySelector('[data-race-action="resume"]').addEventListener('click',()=>callbacks.onResume(),{signal:this.abort.signal});
    this.root.querySelector('[data-race-action="return"]').addEventListener('click',()=>callbacks.onReturn(),{signal:this.abort.signal});
    const pause=()=>{this.controls.clear();callbacks.onPause();};
    window.addEventListener('blur',pause,{signal:this.abort.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();},{signal:this.abort.signal});
    this.portrait.addEventListener('change',event=>{this.stage.inert=event.matches||careerMenuOpen();if(event.matches)pause();},{signal:this.abort.signal});
    window.addEventListener('career-menu-change',event=>{this.stage.inert=this.portrait.matches||event.detail.open;if(event.detail.open)pause();},{signal:this.abort.signal});
    this.stage.inert=this.portrait.matches||careerMenuOpen();this.refreshControls();
  }
  refreshControls(){
    this.controls.refresh();
    if(this.panel.hidden){
      this.controls.b.classList.remove('is-inactive');
      for(const [button,label] of [[this.controls.a,'Accélérer'],[this.controls.b,'Freiner']]){button.querySelector('.control-label').textContent=label;button.setAttribute('aria-label',`${button.dataset.padButton.toUpperCase()} — ${label} (maintenir)`);}
    }
  }
  input(){
    if(!this.controls.allowed()||!['running','countdown'].includes(this.phase))return {};
    return {steer:this.vector.x,throttle:Math.max(0,-this.vector.y,this.controls.a.classList.contains('is-held')?1:0),brake:Math.max(0,this.vector.y,this.controls.b.classList.contains('is-held')?1:0)};
  }
  clearInputs(){this.vector={x:0,y:0};this.controls.clear();}
  message(text){this.root.querySelector('.race-message').textContent=text;}
  update(s,status){
    const q=selector=>this.root.querySelector(selector);
    q('.race-time').textContent=raceClock(Math.round(s.elapsed*1000));q('.race-lap').textContent=`TOUR ${Math.min(3,s.player.lap+1)} / 3`;
    const lead=s.player.checkpoints>s.opponent.checkpoints||(s.player.checkpoints===s.opponent.checkpoints&&s.player.distance>=s.opponent.distance);
    q('.race-position').textContent=lead?'1er':'2e';q('.race-speed').textContent=`${Math.round(Math.abs(s.player.speed)*.72)} km/h`;
    const warning=s.player.wrongWay?'Mauvais sens !':s.player.offroad?'Gazon : reviens sur la piste.':'';
    const warningText=s.phase==='running'?warning:'';if(q('.race-warning').textContent!==warningText)q('.race-warning').textContent=warningText;
    const countdown=q('.race-countdown');countdown.hidden=s.phase!=='countdown';if(!countdown.hidden&&countdown.textContent!==String(Math.ceil(s.countdown)))countdown.textContent=Math.ceil(s.countdown);
    const previousPhase=this.phase,changed=previousPhase!==s.phase;this.phase=s.phase;this.root.dataset.phase=s.phase;
    this.panel.hidden=!['ready','paused','finished'].includes(s.phase);q('.race-shade').hidden=this.panel.hidden;
    q('[data-race-action="start"]').hidden=s.phase==='paused';q('[data-race-action="resume"]').hidden=s.phase!=='paused';
    q('.panel-options').hidden=s.phase!=='paused';
    const score=status?.race??{playerWins:0,karlWins:0,bestMs:null};
    q('.race-record').textContent=`Toi ${score.playerWins} — ${score.karlWins} Karl${score.bestMs!=null?` · Record ${raceClock(score.bestMs)}`:''}`;
    if(changed||this.touchLabel!==this.controls.controlsQuery.matches){this.touchLabel=this.controls.controlsQuery.matches;q('.race-help').innerHTML=this.touchLabel?'Joypad ← → : braquer · A : accélérer · B : freiner / reculer<br>Tu peux aussi accélérer avec le joypad vers le haut.':'↑ Accélérer · ↓ Freiner / reculer · ← → Braquer<br>P : pause · E : valider dans les menus.';}
    if(s.phase==='paused'){q('#race-title').textContent='Course en pause';q('.race-copy').textContent='La grille et le chronomètre t’attendent. Quitter abandonne cette course sans changer les scores.';}
    else if(s.phase==='finished'){
      const won=s.summary.winner==='player';q('#race-title').textContent=won?'Drapeau à damier pour toi !':'Karl remporte la course !';
      q('.race-copy').textContent=`${won?'Karl : « OK, la revanche ! »':'Karl : « La Camaro avait encore du jus ! »'} · ${raceClock(s.summary.timeMs)}`;q('[data-race-action="start"]').textContent='Revanche · 3 tours';
    }
    else if(s.phase==='ready'){q('#race-title').textContent='Un dernier tour, Karl ?';}
    if(changed){if(!(previousPhase==='countdown'&&s.phase==='running'))this.controls.clear();this.refreshControls();if(!this.panel.hidden)this.controls.focusControl(this.panel.querySelector(s.phase==='paused'?'[data-race-action="resume"]':'[data-race-action="start"]'));}
  }
  destroy(){this.destroyed=true;this.controls.destroy();this.abort.abort();this.stage.inert=careerMenuOpen();this.root.remove();}
}
