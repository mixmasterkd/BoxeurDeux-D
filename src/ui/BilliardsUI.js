import { GameControls, careerMenuOpen } from './GameControls.js';
import { mountSideControls, TOUCH_PORTRAIT_QUERY } from './GameLayout.js';
import { installCareerJournal } from './CareerJournal.js';
import { BILLIARDS_RULES, billiardsGroupLabel } from '../game/BilliardsSession.js';
import './billiards.css';

export class BilliardsUI {
  constructor(callbacks,{opponent='beton',record={}}={}){
    this.callbacks=callbacks;this.name=opponent==='kramer'?'Kramer':'Béton';this.record=record;this.abort=new AbortController();this.root=document.getElementById('gym-ui');this.stage=document.getElementById('stage');this.destroyed=false;this.paused=false;this.page=null;this.portraitQuery=matchMedia(TOUCH_PORTRAIT_QUERY);
    this.root.hidden=false;this.root.classList.add('billiards-ui');this.root.innerHTML=`
      <header class="billiards-hud"><div><span class="gym-eyebrow">LE BAR DE L’ÎLE · JEU DE 8</span><h2>Toi contre ${this.name}</h2></div><div class="billiards-groups"></div></header>
      <div class="billiards-status" role="status" aria-live="polite"></div>
      <div class="billiards-power"><label for="billiards-power">Puissance <b>70 %</b></label><input id="billiards-power" type="range" min="12" max="100" value="70" aria-label="Puissance du coup"></div>
      <p class="billiards-hint"></p>
      <button class="gym-pause-button" type="button" aria-label="Pause du billard">☰</button><button class="gym-interact-button" type="button">Jouer</button>
      <div class="gym-modal-shade" hidden></div><section class="gym-dialog billiards-panel snes-split" role="dialog" aria-modal="true" aria-labelledby="billiards-title" hidden><div class="gym-dialog-copy snes-reading"><p class="gym-eyebrow">BILLARD ENTRE AMIS</p><h2 id="billiards-title"></h2><p class="billiards-copy"></p><p class="billiards-record"></p></div><div class="gym-dialog-actions snes-choices"><button class="billiards-primary primary-button" type="button"></button><button class="commands-open-button" type="button">Règles et commandes</button><button class="billiards-return" type="button">Retour au bar</button><div class="panel-options" hidden></div></div></section>`;
    mountSideControls(this.root,{left:[],right:['.gym-pause-button','.gym-interact-button']});
    this.elements=Object.fromEntries(['billiards-groups','billiards-status','billiards-power','billiards-hint','gym-modal-shade','gym-dialog','billiards-copy','billiards-record','billiards-primary','commands-open-button','billiards-return'].map(c=>[c,this.root.querySelector(`.${c}`)]));
    this.controls=new GameControls({root:this.root,mode:'gym',canPlay:()=>this.canPlay(),canInteract:()=>this.state?.turn==='player'&&['aiming','ball-in-hand'].includes(this.state?.phase),getMenu:()=>this.journal?.isOpen?this.journal.panel:this.page?this.elements['gym-dialog']:null,onMove:v=>callbacks.onMove(v),onInteract:()=>callbacks.onAction(),onPause:()=>this.requestPause(),onMenu:()=>this.back(),onBack:()=>this.back()});
    // Le mode déplacement fournit un vecteur continu; B devient la pause du billard.
    const press=this.controls.pressAction.bind(this.controls);this.controls.pressAction=letter=>{if(letter==='b'&&!this.controls.menu()){if(this.controls.allowed())this.requestPause();}else press(letter);};
    const refresh=this.controls.refresh.bind(this.controls);this.controls.refresh=()=>{refresh();if(!this.controls.menu()){const label=this.state?.phase==='ball-in-hand'?'Placer':'Frapper';this.controls.a.querySelector('.control-label,.gym-interact-label').textContent=label;this.controls.a.setAttribute('aria-label',`A — ${label}`);this.controls.b.classList.remove('is-inactive');this.controls.b.querySelector('.control-label').textContent='Pause';this.controls.b.setAttribute('aria-label','B — Pause');}};
    installCareerJournal(this);
    this.listen(this.elements['billiards-primary'],'click',()=>{if(!this.allowed())return;if(this.page==='rules'){this.page=this.returnPage;this.renderPanel();}else if(this.page==='paused'){callbacks.onResume();}else callbacks.onStart();});
    this.listen(this.elements['commands-open-button'],'click',()=>{if(!this.allowed())return;this.returnPage=this.page;this.page='rules';this.clearInputs();this.renderPanel();});
    this.listen(this.elements['billiards-return'],'click',()=>{if(this.allowed())callbacks.onReturn();});
    this.listen(this.root.querySelector('#billiards-power'),'input',e=>{if(this.canPlay())callbacks.onPower(Number(e.target.value)/100);});
    this.listen(window,'blur',()=>this.requestPause());this.listen(document,'visibilitychange',()=>{if(document.hidden)this.requestPause();});
    this.listen(this.portraitQuery,'change',e=>{this.stage.inert=e.matches||careerMenuOpen();if(e.matches)this.requestPause();});
    this.listen(window,'career-menu-change',e=>{this.clearInputs();this.stage.inert=this.portraitQuery.matches||e.detail.open;if(e.detail.open)this.requestPause();});
    this.stage.inert=this.portraitQuery.matches||careerMenuOpen();
  }
  listen(el,type,fn){el.addEventListener(type,fn,{signal:this.abort.signal});}
  allowed(){return !this.destroyed&&!this.portraitQuery.matches&&!document.hidden&&!careerMenuOpen();}
  canPlay(){return this.allowed()&&!this.page&&!this.state?.paused&&this.state?.turn==='player'&&['aiming','ball-in-hand'].includes(this.state?.phase);}
  clearInputs(){this.controls?.clear();}
  requestPause(){this.clearInputs();this.callbacks.onPause();}
  back(){if(this.journal?.isOpen){this.journal.close();return;}if(this.page==='rules'){this.page=this.returnPage;this.renderPanel();}else if(this.page==='paused')this.callbacks.onResume();else if(!this.page)this.requestPause();}
  showMessage(message){this.elements['billiards-status'].textContent=message;}
  update(state,record=this.record){
    this.state=state;this.phase=state.phase;this.paused=state.paused;this.record=record;
    const mode=state.phase==='ready'?'ready':state.phase==='finished'?'finished':state.paused?'paused':null;
    if(mode!==this.stateMode){this.stateMode=mode;this.page=mode;this.clearInputs();this.renderPanel();}
    this.root.dataset.mode=this.page?'dialog':'walking';
    const groups=`Toi : ${billiardsGroupLabel(state.groups.player)} · ${this.name} : ${billiardsGroupLabel(state.groups.opponent)}`;
    if(this.elements['billiards-groups'].textContent!==groups)this.elements['billiards-groups'].textContent=groups;
    if(this.elements['billiards-status'].textContent!==state.message)this.elements['billiards-status'].textContent=state.message;
    const power=this.root.querySelector('#billiards-power');power.disabled=!this.canPlay()||state.phase!=='aiming';if(document.activeElement!==power)power.value=Math.round(state.power*100);this.elements['billiards-power'].querySelector('b').textContent=`${Math.round(state.power*100)} %`;
    this.elements['billiards-hint'].textContent=state.phase==='ball-in-hand'?'Blanche en main : pointe un endroit libre ou déplace-la au joypad / WASD, puis E ou A pour placer.':document.documentElement.dataset.touch==='true'?'Touche le tapis pour viser · Joypad ← → : angle · ↑ ↓ : puissance · A : frapper · B : pause':'Souris : viser · A/D ou ← → : angle · W/S ou ↑ ↓ : puissance · E : frapper · P : pause';
    this.controls.refresh();
  }
  renderPanel(){
    this.elements['gym-modal-shade'].hidden=!this.page;this.elements['gym-dialog'].hidden=!this.page;if(!this.page)return;
    const titles={ready:`Une partie avec ${this.name} ?`,paused:'Partie en pause',finished:this.state?.winner==='player'?'Bien joué !':`${this.name} gagne`,rules:'Règles et commandes'};
    this.root.querySelector('#billiards-title').textContent=titles[this.page];
    this.elements['billiards-copy'].textContent=this.page==='rules'?`${BILLIARDS_RULES} Commandes : souris ou doigt pour viser. Gauche/droite ajuste l’angle; haut/bas ajuste la puissance. E ou A frappe et confirme le placement de la blanche. P, Échap ou B ouvre la pause. Pendant la blanche en main, le joypad ou WASD déplace la bille.`:this.page==='ready'?'Une vraie table, six poches et deux groupes. Tu casses. Aucun coût, aucune énergie. Les victoires sont sauvegardées. Quitter ou recharger abandonne seulement la partie en cours.':this.page==='paused'?'Les billes et ton adversaire attendent. Reprends la partie ou retourne au bar sans résultat.':`${this.state?.message}${this.state?.resultSaved?' Le résultat est enregistré dans vos scores.':''}`;
    this.elements['billiards-record'].textContent=`Face à ${this.name} : ${this.record?.playerWins??0} victoire(s) · ${this.record?.opponentWins??0} défaite(s)`;
    this.elements['billiards-primary'].textContent=this.page==='ready'?'Commencer la partie →':this.page==='finished'?'Rejouer →':this.page==='rules'?'← Retour':'Reprendre →';this.elements['commands-open-button'].hidden=this.page==='rules';
    this.root.querySelector('.panel-options').hidden=this.page!=='paused';this.controls?.refresh();this.elements['billiards-primary'].focus({preventScroll:true});
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;this.controls.destroy();this.abort.abort();this.root.replaceChildren();this.root.classList.remove('billiards-ui');this.root.hidden=true;this.stage.inert=this.portraitQuery.matches||careerMenuOpen();}
}
