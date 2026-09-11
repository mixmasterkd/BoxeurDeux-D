import './bout.css';

const text = (element, value) => { const next = String(value); if (element.textContent !== next) element.textContent = next; };

/** Presentation of the resistance drill. The session owns damage, counting and recovery. */
export class BoutHUD {
  constructor(ui) {
    this.ui = ui;
    this.meters = {};
    for (const who of ['player', 'remi']) {
      const info = ui.root.querySelector(who === 'player' ? '.fighter-info:not(.opponent-info)' : '.opponent-info');
      const meter = document.createElement('div');
      meter.className = `resistance-panel resistance-${who}`;
      meter.hidden = true;
      meter.innerHTML = `<div class="resistance-label"><span>RÉSISTANCE</span><strong>100</strong></div>
        <div class="resistance-track" data-resistance="${who}" role="progressbar" aria-label="${who === 'player' ? 'Votre résistance' : 'Résistance de Rémi'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="resistance-fill"></div></div>
        <div class="bout-downs" aria-label="Chutes dans le round et dans la séance"></div>`;
      info.append(meter);
      this.meters[who] = { root: meter, value: meter.querySelector('strong'), track: meter.querySelector('.resistance-track'), fill: meter.querySelector('.resistance-fill'), downs: meter.querySelector('.bout-downs') };
    }
    this.rules = document.createElement('p');
    this.rules.className = 'bout-rules'; this.rules.hidden = true;
    this.rules.textContent = 'Trois rounds de 60 s. À zéro résistance, vous allez au tapis. Pour vous relever avant dix : faites six pressions alternées sur J et K, ou A et B, sans vous précipiter. Trois chutes dans un round ou quatre dans la séance entraînent l’arrêt.';
    ui.elements['lesson-description'].after(this.rules);
    this.panel = document.createElement('section');
    this.panel.className = 'knockdown-panel'; this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'Décompte et relevé');
    this.panel.innerHTML = `<p class="knockdown-title"></p><div class="knockdown-reading"><strong class="knockdown-count" aria-live="polite" aria-atomic="true">—</strong><div class="knockdown-instructions"><span class="knockdown-message"></span><div class="knockdown-progress" role="progressbar" aria-label="Relevé" aria-valuemin="0" aria-valuemax="6" aria-valuenow="0">${'<i></i>'.repeat(6)}</div><span class="knockdown-next"></span></div></div>`;
    ui.root.append(this.panel);
    this.title = this.panel.querySelector('.knockdown-title');
    this.number = this.panel.querySelector('.knockdown-count');
    this.message = this.panel.querySelector('.knockdown-message');
    this.progress = this.panel.querySelector('.knockdown-progress');
    this.next = this.panel.querySelector('.knockdown-next');
  }

  update(state) {
    const { ui } = this;
    const bout = state.bout;
    const enabled = Boolean(bout);
    const active = state.phase === 'running' || state.phase === 'knockdown';
    ui.root.dataset.bout = String(enabled);
    ui.root.classList.toggle('is-counting', active && state.phase === 'knockdown');
    ui.elements['primary-button'].classList.toggle('next-round-button', state.phase === 'between');
    this.rules.hidden = !enabled || state.phase !== 'ready';
    for (const who of ['player', 'remi']) {
      const meter = this.meters[who]; meter.root.hidden = !enabled;
      if (!enabled) continue;
      const value = Math.max(0, Math.min(bout.maxResistance, bout.resistance[who]));
      text(meter.value, Math.ceil(value));
      meter.track.setAttribute('aria-valuemax', bout.maxResistance);
      meter.track.setAttribute('aria-valuenow', Math.ceil(value));
      meter.fill.style.transform = `scaleX(${value / bout.maxResistance})`;
      meter.track.classList.toggle('is-low', value <= bout.maxResistance * .25);
      text(meter.downs, `${bout.downs[who].round}/3 ROUND · ${bout.downs[who].total}/4 SÉANCE`);
    }
    text(ui.root.querySelector('.round-eyebrow'), enabled ? `ROUND ${bout.round} / ${bout.rounds}` : 'ROUND 01');
    this.panel.hidden = state.phase !== 'knockdown' || !bout?.count;
    const count = bout?.count;
    const recovering = state.phase === 'knockdown' && count?.downed.player && !count.eliminated.player && !count.recovered.player && count.stage === 'count' && count.accepted < count.needed;
    for (const [action, button] of ui.buttons) {
      const next = !count?.next || count.next === action;
      button.classList.toggle('is-recovery-next', Boolean(recovering && next && count.ready));
      button.classList.toggle('is-recovery-wait', Boolean(recovering && (!next || !count.ready)));
      if (action === 'jab') button.dataset.moveLabel = state.phase === 'knockdown' ? recovering ? 'Relever' : 'Attendre' : ui.hookSelected ? 'Crochet' : 'Jab';
      if (action === 'cross') button.dataset.moveLabel = state.phase === 'knockdown' ? recovering ? 'Relever' : 'Attendre' : 'Direct';
    }
    if (!enabled) return;
    if (!this.panel.hidden) {
      const playerDown = count.downed.player;
      text(this.title, count.downed.player && count.downed.remi ? 'LES DEUX AU TAPIS' : playerDown ? 'REPRENEZ APPUI' : 'RÉMI AU TAPIS');
      text(this.number, count.stage === 'fall' ? '↓' : count.stage === 'rise' ? '↑' : count.number || '…');
      const complete = count.accepted >= count.needed;
      const message = count.stage === 'fall' ? 'Le décompte va commencer'
        : count.stage === 'rise' ? playerDown ? 'Relevez-vous, puis reprenez votre garde' : 'Rémi se relève et reprend sa garde'
          : !playerDown ? 'Rémi reprend ses appuis'
            : complete ? 'Appuis retrouvés · relevez-vous' : 'Alternez les deux frappes';
      text(this.message, message);
      this.progress.hidden = !playerDown || count.stage === 'fall';
      this.progress.setAttribute('aria-valuenow', count.accepted);
      this.progress.dataset.accepted = count.accepted;
      [...this.progress.children].forEach((pip, i) => pip.classList.toggle('is-complete', i < count.accepted));
      const next = count.next === 'jab' ? 'Gauche' : count.next === 'cross' ? 'Droite' : 'Gauche ou droite';
      text(this.next, recovering ? count.ready ? `${next} · maintenant` : 'Doucement…' : 'Le temps du round est arrêté');
      this.panel.classList.toggle('is-ready', Boolean(recovering && count.ready));
    }
    text(ui.elements['secondary-button'], 'Recommencer la séance');
    ui.elements['panel-copy'].hidden = false;
    if (state.phase === 'ready') {
      text(ui.elements['panel-eyebrow'], 'TROIS ROUNDS POUR APPRENDRE');
      text(ui.elements['panel-heading'], 'Résistance\net relevés.');
      text(ui.elements['panel-copy'], 'Rémi vous aide à apprendre les chutes et le relevé. L’endurance sert aux gestes; la résistance encaisse les coups.');
      text(ui.elements['primary-button'], 'Commencer la séance →');
    } else if (state.phase === 'paused') {
      text(ui.elements['panel-copy'], state.pausedPhase === 'knockdown' ? 'Le décompte est aussi en pause. Reprenez quand vous êtes prêt, avec de nouveaux appuis.' : 'Toute la séance est en pause. Reprenez à votre rythme.');
      text(ui.elements['primary-button'], state.pausedPhase === 'knockdown' ? 'Reprendre le décompte →' : 'Reprendre la séance →');
    } else if (state.phase === 'between') {
      text(ui.elements['panel-eyebrow'], `ROUND ${bout.round} TERMINÉ`);
      text(ui.elements['panel-heading'], 'Au coin.\nSoufflez.');
      text(ui.elements['panel-copy'], 'Au prochain round : endurance pleine et 20 points de résistance récupérés. Les chutes du round repartent à zéro; le total reste conservé.');
      text(ui.elements['primary-button'], `Commencer le round ${bout.round + 1} →`);
    } else if (state.phase === 'finished') {
      const result = bout.result;
      const player = result?.loser === 'player' || result?.winner === 'remi';
      const both = result?.reason === 'double-ko' || result?.winner === 'draw';
      const title = result?.reason === 'time' ? 'Séance terminée.' : both ? 'Séance arrêtée.' : player ? 'On reprend\nà votre rythme.' : 'Rémi fait\nune pause.';
      const reason = result?.reason === 'ko' ? 'KO · LE COMPTE DE DIX'
        : result?.reason === 'round-limit' ? 'ARRÊT · TROIS CHUTES DANS LE ROUND'
          : result?.reason === 'total-limit' ? 'ARRÊT · QUATRE CHUTES DANS LA SÉANCE'
            : result?.reason === 'double-ko' ? 'ARRÊT · LES DEUX BOXEURS' : 'LES TROIS ROUNDS SONT TERMINÉS';
      text(ui.elements['panel-eyebrow'], reason);
      text(ui.elements['panel-heading'], title);
      text(ui.elements['panel-copy'], result?.reason === 'time' ? 'Les trois rounds sont au bilan. Rémi reste votre partenaire : il n’y a pas de classement ni de combat officiel.' : player ? 'Protégez la bonne hauteur et gardez du souffle. Au tapis, alternez les deux frappes calmement avant dix.' : 'Vous avez trouvé ses ouvertures. Recommencez pour travailler votre défense et vos relevés.');
      text(ui.elements['primary-button'], 'Refaire la séance →');
    }
    if (state.phase === 'finished' || state.phase === 'between') {
      ui.elements['round-results'].hidden = false;
      text(ui.values['result-landed'], state.stats.landed);
      text(ui.values['result-received'], state.stats.received);
      text(ui.elements['round-detail'], `${state.stats.blocked} coups bloqués · ${state.stats.dodged} esquivés\nChutes : vous ${bout.downs.player.total} · Rémi ${bout.downs.remi.total}\n${state.stats.combos} combos complets · ${bout.round} round${bout.round > 1 ? 's' : ''} joué${bout.round > 1 ? 's' : ''}`);
    }
  }
}
