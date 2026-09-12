import { RhythmUI } from './RhythmUI.js';
import { HOTEL_CUES } from '../game/HotelActivitySession.js';
import './hotel.css';
const INFO = {
  pads: {title:'Les pads avec Rémi',skill:'Puissance',invitation:'Écoute ton coin.',copy:'Rémi présente ses cibles, puis te demande une garde ou une esquive. Observe son signal et réalise le mouvement au petit repère.',commands:'Jab et direct : J / K. Garde haute / basse : haut / bas. Esquives : gauche / droite. Les mêmes mouvements qu’en combat, annoncés par Rémi.',left:'Jab',right:'Direct'},
  pool: {title:'Quelques longueurs',skill:'Endurance',invitation:'Trouve ta glisse.',copy:'Alterne les bras, gauche puis droite, au petit repère. Douze bonnes poussées font une longueur. La piscine entraîne l’endurance; elle ne remplit pas l’énergie de journée.',commands:'Alterne J et K au repère. Chaque bonne poussée te fait avancer. Relâche entre deux mouvements; marteler les touches fatigue le rythme.',left:'Bras gauche',right:'Bras droit'},
};
export class HotelActivityUI extends RhythmUI {
  constructor(activity, callbacks){
    super('speedball', {...callbacks,getState:undefined});
    this.activity=activity;this.info=INFO[activity];this.root.dataset.activity=activity;
    this.root.querySelector('.rhythm-heading h2').textContent=this.info.title;
    this.root.querySelector('.rhythm-heading .rhythm-eyebrow').textContent='LES GANTS DE BRONZE · HÔTEL';
    this.root.querySelector('#rhythm-commands-title').textContent=`Commandes · ${this.info.title}`;
    this.root.querySelector('.commands-notes p').textContent=this.info.commands;
    this.root.querySelector('.rhythm-panel-content>.rhythm-eyebrow').textContent=this.info.skill;
    this.root.querySelector('.rhythm-return').textContent=activity==='pool'?'← Retour à la piscine':'← Retour au mini-gym';
    this.controls.exit.textContent='← Hôtel';this.controls.exit.setAttribute('aria-label','Quitter l’activité et retourner dans l’hôtel');
    this.controls.a.dataset.moveLabel=this.info.left;this.controls.b.dataset.moveLabel=this.info.right;
    this.controls.pad.setAttribute('aria-label',activity==='pads'?'Joypad : gardes et esquives, comme en combat':'Joypad : navigation des menus');
    this.updateCommandLabels();
  }
  updateCommandLabels(){
    super.updateCommandLabels();
    if(!INFO[this.activity])return;
    const touch=this.controlsQuery.matches;
    this.text('rhythm-command-actions',this.activity==='pads'?(touch?'A / B · joypad pour défenses':'J / K · flèches ou WASD pour défenses'):(touch?'A / B':'J / K'));
    this.text('rhythm-command-sound',touch?'Son dans le menu. « ← Hôtel » quitte directement l’atelier.':'M active ou coupe le son. « ← Hôtel » quitte directement l’atelier.');
    this.root.querySelector('.commands-notes p').textContent=this.activity==='pads'?(touch?'A : jab. B : direct. Joypad en haut/bas : garde haute/basse; gauche/droite : esquive. Observe la cible et la consigne de Rémi.':INFO.pads.commands):(touch?'Alterne A et B au repère. Douze bonnes poussées font une longueur. Relâche entre deux mouvements.':INFO.pool.commands);
  }
  update(state){
    super.update(state);
    const cue=state.beat.expected;
    this.text('rhythm-cue-name',this.activity==='pool'?(cue==='cross'?'Bras droit':'Bras gauche'):(HOTEL_CUES[cue]??'Souffle'));
    if(state.phase==='ready')this.text('rhythm-goal',this.activity==='pool'?'3 longueurs · 60 % de précision · 45 secondes':'12 mouvements · 60 % de précision · 45 secondes');
    if(this.activity==='pool'){
      this.text('rhythm-streak',state.laps);
      this.root.querySelector('.rhythm-score>div>span').textContent='longueurs';
      if(state.phase==='finished'){
        this.text('result-hits',state.summary.laps);
        this.root.querySelector('.rhythm-results dt').textContent='Longueurs';
      }
    }
  }
}
