import {careerProfile} from '../game/CareerProfile.js';
import { RhythmUI } from './RhythmUI.js';
import './hotel.css';
const INFO = {
  pads: {title:'Les pads avec Fredo',skill:'Puissance',invitation:'Regarde ses pads.',copy:'Fredo lève un pad. Frappe cette cible quand tu es prêt : il attend le contact avant de changer. Jab gauche vers le pad à droite; direct droit vers le pad à gauche.',commands:'J : jab gauche vers son pad à droite de l’écran. K : direct droit vers son pad à gauche. Fredo garde la cible levée; aucune cadence imposée.',left:'Jab',right:'Direct'},
  pool: {title:'Quelques longueurs',skill:'Endurance',invitation:'Trouve ta glisse.',copy:'Alterne les bras, gauche puis droite, au petit repère. Douze bonnes poussées font une longueur. La piscine entraîne l’endurance; elle ne remplit pas l’énergie de journée.',commands:'Alterne J et K au repère. Chaque bonne poussée te fait avancer. Relâche entre deux mouvements; marteler les touches fatigue le rythme.',left:'Bras gauche',right:'Bras droit'},
};
export class HotelActivityUI extends RhythmUI {
  constructor(activity, callbacks, { fromGym = false, fromCuba = false, fromMexico = false } = {}) {
    super('speedball', {...callbacks,getState:undefined});
    this.activity=activity; this.coach=fromMexico?'The Octopus':'Fredo'; this.info=Object.fromEntries(Object.entries(INFO[activity]).map(([key,value])=>[key,typeof value==='string'?value.replaceAll('Fredo',this.coach):value])); this.fromGym=fromGym||fromCuba||fromMexico; this.fromCuba=fromCuba; this.root.dataset.activity=activity;
    this.root.querySelector('.rhythm-heading h2').textContent=this.info.title;
    this.root.querySelector('.rhythm-heading .rhythm-eyebrow').textContent=fromMexico?'MEXIQUE · LE GYM':fromCuba?'CUBA · LE GYM AUX PNEUS':fromGym?'LE GYM DU QUARTIER':(careerProfile.tournamentStatus().active?.tier==='gold'?'LES GANTS DORÉS · HÔTEL':'LES GANTS DE BRONZE · HÔTEL');
    this.root.querySelector('#rhythm-commands-title').textContent=`Commandes · ${this.info.title}`;
    this.root.querySelector('.commands-notes p').textContent=this.info.commands;
    this.root.querySelector('.rhythm-panel-content>.rhythm-eyebrow').textContent=this.info.skill;
    this.root.querySelector('.rhythm-return').textContent=fromMexico?'← Retour au gym du Mexique':fromCuba?'← Retour au gym de Cuba':fromGym?'← Retour au gym':activity==='pool'?'← Retour à la piscine':'← Retour au mini-gym';
    this.controls.exit.textContent=this.fromGym?'← Gym':'← Hôtel';
    this.controls.exit.setAttribute('aria-label',this.fromGym?'Quitter les pads et retourner au gym':'Quitter l’activité et retourner dans l’hôtel');
    this.controls.a.dataset.moveLabel=this.info.left; this.controls.b.dataset.moveLabel=this.info.right;
    this.controls.pad.setAttribute('aria-label','Joypad : navigation des menus');
    this.root.querySelector('.commands-grid dt').textContent=activity==='pads'?'Jab / direct':'Bras gauche / droit';
    if(activity==='pads') this.root.querySelector('.rhythm-results dt').textContent='Pads touchés';
    this.updateCommandLabels();
  }
  updateCommandLabels() {
    super.updateCommandLabels();
    if(!INFO[this.activity]) return;
    const touch=this.controlsQuery.matches;
    this.text('rhythm-command-actions',touch?'A / B':'J / K');
    this.text('rhythm-command-sound',`Le son se règle dans le menu. « ← ${this.fromGym?'Gym':'Hôtel'} » quitte directement l’atelier.`);
    this.root.querySelector('.commands-notes p').textContent=this.activity==='pads'?(touch?`A : jab gauche vers le pad à droite de l’écran. B : direct droit vers le pad à gauche. Frappe le pad levé, à ton rythme. ${this.coach} attend ton contact avant de changer.`:this.info.commands):(touch?'Alterne A et B au repère. Douze bonnes poussées font une longueur. Relâche entre deux mouvements.':INFO.pool.commands);
  }
  update(state) {
    super.update(state);
    if(this.fromGym && this.coach==='The Octopus') { for(const el of this.root.querySelectorAll('.rhythm-panel-copy,.commands-notes p'))if(el.textContent.includes('Fredo'))el.textContent=el.textContent.replaceAll('Fredo',this.coach); }
    if(this.activity==='pads') {
      this.el['rhythm-conductor'].hidden=true;
      this.text('rhythm-streak',state.stats.hits);
      this.root.querySelector('.rhythm-score>div>span').textContent='touches';
      if(state.phase==='ready') this.text('rhythm-goal','12 pads touchés · 60 % de précision · 45 secondes');
      if(state.phase==='paused') this.text('rhythm-panel-copy',`${this.coach} garde ton exercice en mémoire. Reprends quand tu es prêt.`);
      if(state.phase==='finished') {
        this.text('rhythm-panel-title',state.summary.qualified?'Dans le bon pad !':'Observe la cible.');
        this.text('rhythm-panel-copy',state.summary.qualified?`${this.coach} : beau travail. Des coups propres, au bon endroit.`:`Prends ton temps. Jab vers son pad à droite, direct vers celui à gauche. ${this.coach} attend ton coup.`);
      }
    } else {
      this.text('rhythm-cue-name',state.beat.expected==='cross'?'Bras droit':'Bras gauche');
      if(state.phase==='ready') this.text('rhythm-goal','3 longueurs · 60 % de précision · 45 secondes');
      this.text('rhythm-streak',state.laps);
      this.root.querySelector('.rhythm-score>div>span').textContent='longueurs';
      if(state.phase==='finished') {
        this.text('result-hits',state.summary.laps);
        this.root.querySelector('.rhythm-results dt').textContent='Longueurs';
      }
    }
  }
}
