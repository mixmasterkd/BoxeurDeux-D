import './decision.css';
const put = (element, value) => { if (element.textContent !== String(value)) element.textContent = value; };
const KINDS = { unanimous: 'Décision unanime', split: 'Décision partagée', majority: 'Décision majoritaire', draw: 'Match nul' };
export class DecisionHUD {
  constructor(ui) {
    this.ui = ui; this.root = document.createElement('div'); this.root.className = 'judge-cards'; this.root.hidden = true;
    this.root.innerHTML = [1,2,3].map(n=>`<article aria-label="Carte du juge ${n}"><strong>JUGE ${n}</strong><b>…</b><small></small></article>`).join('');
    ui.elements['panel-copy'].after(this.root);
    this.detail = document.createElement('div'); this.detail.className = 'judge-details'; this.detail.hidden = true;
    this.detail.innerHTML = '<button type="button" class="judge-detail-toggle" aria-expanded="false">Détail des rounds</button><p hidden></p>';
    this.root.after(this.detail);
    this.detail.querySelector('button').addEventListener('click', () => {
      const copy = this.detail.querySelector('p'); copy.hidden = !copy.hidden;
      this.detail.querySelector('button').setAttribute('aria-expanded', String(!copy.hidden));
    }, { signal: ui.abort.signal });
  }
  update(state, elapsed = 0) {
    const { ui } = this, decision = state.bout?.result?.decision;
    const active = state.phase === 'finished' && Boolean(decision);
    ui.root.dataset.decision = String(active);
    this.root.hidden = this.detail.hidden = !active;
    if (!active) { this.detail.querySelector('p').hidden = true; this.detail.querySelector('button').setAttribute('aria-expanded', 'false'); ui.elements['return-gym-button'].disabled = false; return; }
    const announced = elapsed >= 7;
    const won = decision.winner === 'player', draw = decision.winner === 'draw';
    put(ui.elements['panel-eyebrow'], announced ? KINDS[decision.kind] : 'LES JUGES ONT RENDU LEURS CARTES');
    put(ui.elements['panel-heading'], announced ? draw ? 'Match nul.' : won ? 'Victoire aux points !' : 'Votre adversaire l’emporte.' : 'La décision…');
    if (ui.root.clientWidth < 550) {
      const destination = ui.root.dataset.tournament === 'true' ? 'Salle' : ui.root.dataset.opponent === 'louisto' ? 'Plage' : 'Quartier';
      put(ui.elements['primary-button'], ui.root.dataset.tournament === 'true' && !draw ? 'Retour à la salle' : 'Revanche');
      put(ui.elements['return-gym-button'], `← ${destination}`);
    }
    this.root.setAttribute('aria-label', 'Cartes des juges : votre score à gauche, adversaire à droite');
    [...this.root.children].forEach((card,i)=>{
      const revealed = elapsed >= 1 + i * 2;
      const score = decision.cards[i];
      put(card.querySelector('b'), revealed ? `${score.player} — ${score.remi}` : '…');
      put(card.querySelector('small'), revealed ? score.winner === 'draw' ? 'ÉGALITÉ' : score.winner === 'player' ? 'VOUS' : 'ADVERSAIRE' : 'VOUS · ADV.');
      card.dataset.winner = revealed ? score.winner : 'waiting';
    });
    put(this.detail.querySelector('p'), decision.cards.map(card=>`${card.name} : ${card.rounds.map(r=>`R${r.round} ${r.player}–${r.remi}`).join(' · ')}`).join('\n'));
    this.detail.hidden = !announced;
    ui.elements['primary-button'].disabled = !announced;
    ui.elements['return-gym-button'].disabled = !announced;
    ui.elements['commands-open-button'].hidden = true;
  }
}
