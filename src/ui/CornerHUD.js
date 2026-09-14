import { getOpponentProfile } from '../game/OpponentProfiles.js';
import { cornerBeat } from '../game/CornerRecovery.js';
import './corner-recovery.css';
const text = (element, value) => { if (element.textContent !== String(value)) element.textContent = value; };
export class CornerHUD {
  constructor(ui, advice) {
    this.ui = ui;
    this.root = document.createElement('div');
    this.root.className = 'corner-recovery'; this.root.hidden = true;
    this.root.innerHTML = '<div class="breath-orbit"><i></i><strong></strong></div><p class="breath-cue"></p><div class="breath-beats" aria-label="Respirations réussies">' + '<i></i>'.repeat(8) + '</div><small class="breath-feedback" aria-live="polite"></small>';
    advice.after(this.root);
  }
  update(state) {
    const active = state.phase === 'corner';
    this.root.hidden = !active;
    if (!active) return;
    const { ui } = this, corner = state.bout.corner, beat = cornerBeat(corner);
    const touch = ui.controlsQuery.matches;
    const coach = getOpponentProfile(state.settings.opponent).coach ?? 'Fredo';
    const key = beat.action === 'jab' ? touch ? 'A' : 'J' : touch ? 'B' : 'K';
    const inhale = beat.action === 'jab';
    text(ui.elements['panel-heading'], ui.root.clientWidth < 550 ? 'Soufflez.' : 'Un souffle à la fois.');
    text(ui.elements['panel-eyebrow'], `${coach.toUpperCase()} · ${Math.ceil(corner.duration - corner.elapsed)} SECONDES`);
    text(ui.elements['panel-copy'], `${touch ? 'A puis B' : 'J puis K'} quand le cercle rejoint le repère. +20 résistance garantis ; jusqu’à +8 avec ${coach}.`);
    text(ui.elements['primary-button'], touch ? 'Passer la récupération →' : 'Passer · E →');
    ui.elements['commands-open-button'].hidden = true;
    ui.elements['round-results'].hidden = true;
    ui.elements['return-gym-button'].hidden = true;
    text(this.root.querySelector('.breath-orbit strong'), key);
    text(this.root.querySelector('.breath-cue'), `${inhale ? 'Inspirez' : 'Expirez'} · ${beat.ready ? 'maintenant' : 'suivez le cercle'}`);
    text(this.root.querySelector('.breath-feedback'), corner.feedback);
    const distance = Math.min(1, Math.abs(corner.elapsed - beat.time));
    this.root.style.setProperty('--breath-scale', String(.5 + (1 - distance) * .5));
    this.root.classList.toggle('is-ready', beat.ready);
    [...this.root.querySelector('.breath-beats').children].forEach((pip, i) => pip.classList.toggle('earned', i < corner.hits));
    ui.buttons.get('jab').dataset.moveLabel = 'Inspirer';
    ui.buttons.get('cross').dataset.moveLabel = 'Expirer';
  }
}
