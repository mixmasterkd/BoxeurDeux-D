import { DecisionHUD } from './DecisionHUD.js';
import { CornerHUD } from './CornerHUD.js';
import './opponent.css';
import { getOpponentProfile } from '../game/OpponentProfiles.js';

const put = (element, value) => { if (element.textContent !== String(value)) element.textContent = String(value); };

/** The first opponent shares the combat controls, but owns his presentation. */
export class OpponentHUD {
  constructor(ui) {
    this.ui = ui;
    this.score = document.createElement('div');
    this.score.className = 'combat-score';
    this.score.setAttribute('aria-label', 'Touches nettes du combat');
    this.score.hidden = true;
    ui.root.querySelector('.round-clock').append(this.score);
    this.rules = document.createElement('p');
    this.rules.className = 'combat-rules'; this.rules.hidden = true;
    this.rules.textContent = '3 rounds de 45 s. Chaque round a un vainqueur : 10–9, 10–8 ou 10–7 selon sa domination. Touches nettes, qualité et maîtrise technique. Aucune déduction automatique pour une chute. Majorité des juges; les cartes égales sont départagées techniquement.';
    ui.elements['panel-copy'].after(this.rules);
    this.advice = document.createElement('div');
    this.advice.className = 'corner-advice'; this.advice.hidden = true;
    this.advice.innerHTML = '<strong>FREDO DANS VOTRE COIN</strong><p></p>';
    this.adviceText = this.advice.querySelector('p');
    this.rules.after(this.advice);
    this.figure = document.createElement('figure');
    this.figure.className = 'corner-vignette'; this.figure.hidden = true;
    this.figure.innerHTML = '<img alt="Votre boxeur assis sur un tabouret écoute Fredo, son coach, une serviette sur l’épaule." width="800" height="650"><figcaption>On reprend son souffle. On prépare la suite.</figcaption>';
    ui.elements['round-panel'].append(this.figure);
    this.cornerHUD = new CornerHUD(ui, this.advice);
    this.decisionHUD = new DecisionHUD(ui);
  }

  update(state) {
    const { ui } = this;
    const profile = getOpponentProfile(state.settings?.opponent);
    const name = profile.shortName ?? profile.name;
    const coach = profile.coach ?? 'Fredo';
    put(this.advice.querySelector('strong'), `${coach.toUpperCase()} DANS VOTRE COIN`);
    const fight = profile.official;
    const tournament = Boolean(state.settings?.tournament);
    const between = Boolean(state.bout) && ['between', 'corner'].includes(state.phase);
    ui.root.dataset.opponent = profile.id;
    ui.root.dataset.official = String(Boolean(fight));
    ui.root.dataset.tournament = String(tournament);
    this.score.hidden = !fight;
    this.rules.hidden = !fight || state.phase !== 'ready';
    this.figure.hidden = this.advice.hidden = !between;
    if (between) {
      const image = this.figure.querySelector('img'), key = coach === 'Octopus' ? 'octopus-coach' : 'fredo-coach';
      if (image.dataset.coach !== key) { image.src = `${import.meta.env.BASE_URL}assets/sprites/corner/${key}.png`; image.dataset.coach = key; image.alt = `Votre boxeur écoute ${coach} dans son coin.`; }
    }
    if (profile.streetFight) { this.updateStreet(state, profile); return; }
    if (profile.id === 'pablo') {
      put(ui.root.querySelector('.opponent-info .fighter-name'), 'Pablo');
      put(ui.root.querySelector('.round-footnote'), 'Mexique · Sparring avec Pablo');
      put(ui.elements['panel-eyebrow'], profile.eyebrow);
      if (state.phase === 'ready') { put(ui.elements['panel-heading'], 'Sparring avec Pablo.'); put(ui.elements['panel-copy'], profile.introduction); }
      if (state.phase === 'finished') put(ui.elements['panel-heading'], 'Pablo vous salue.');
      for (const key of ['panel-copy', 'round-detail', 'lesson-description']) put(ui.elements[key], ui.elements[key].textContent.replaceAll('Rémi', 'Pablo'));
    }
    if (!fight) {
      if (between) {
        put(ui.elements['panel-heading'], `Écoute ${coach}.`);
        put(this.adviceText, `Prends ton souffle. ${profile.shortName ?? 'Rémi'} est ton partenaire : travaille la bonne garde, puis réponds avec deux coups propres.`);
        ui.elements['choose-session-button'].hidden = true;
      }
      if (profile.coach) for (const key of ['panel-copy', 'lesson-description', 'round-detail']) put(ui.elements[key], ui.elements[key].textContent.replaceAll('Fredo', coach));
      return;
    }
    const bout = state.bout;
    put(this.score, `TOUCHES ${state.stats.landed} · ${state.stats.received}`);
    put(ui.root.querySelector('.opponent-info .fighter-name'), name);
    put(ui.root.querySelector('.opponent-info .fighter-eyebrow'), 'VOTRE ADVERSAIRE');
    put(ui.root.querySelector('.round-footnote'), tournament ? `${profile.tournamentTier === 'gold' ? 'Gants dorés' : 'Gants de bronze'} · Tenue de compétition` : profile.id === 'danielo' ? 'Mexique · Arène de terre · Revanche gratuite' : profile.id === 'louisto' ? 'Cuba · Ring de la plage · Revanche gratuite' : 'Soirée de boxe · Revanche gratuite');
    put(ui.root.querySelector('#sparring-commands-title'), 'Commandes du combat');
    put(ui.root.querySelector('.combo-help'), 'Comme avec Rémi : J → K → J donne jab, direct, crochet. Le prochain coup peut être préparé juste avant le retour en garde. Une pression par frappe. Le combo coûte 48 d’endurance. Une garde haute, une esquive, un coup reçu ou une pause l’interrompt. Maintenez bas pour les coups au corps.');
    if (state.settings?.techniques?.doubleJab) {
      const touch = ui.controlsQuery.matches;
      put(ui.root.querySelector('.combo-help'), `${touch?'A → B → A':'J → K → J'} : jab, direct, crochet. Technique apprise : ${touch?'A → A → B':'J → J → K'}, deux jabs puis un direct appuyé (le dernier coup coûte 4 endurance de plus). Une pression par frappe. La garde haute, l’esquive, un coup reçu ou une pause coupent la série. Bas + frappe vise le corps.`);
    }
    put(ui.root.querySelector('.recovery-help'), `Au tapis : six pressions alternées J/K ou A/B, en commençant par J/A, avant dix. Relâchez et suivez le repère. Pause avec P / Échap / ☰. Au terme des trois rounds : 3 juges en local, 5 en tournoi. 10 points au vainqueur du round; aucun round nul ni déduction automatique par chute. Au coin : suivez les respirations de ${coach} avec J/K ou A/B pour récupérer jusqu’à 8 résistance supplémentaires.`);
    ui.elements['lesson-choice'].hidden = true;
    ui.elements['round-settings'].hidden = true;
    ui.elements['choose-session-button'].hidden = true;
    ui.elements['next-lesson-button'].hidden = true;
    put(ui.elements['secondary-button'], 'Recommencer le combat');
    const names = { fall: `${name} va au tapis`, down: `${name} reprend ses appuis`, rise: `${name} se relève`, surrender: 'Il abandonne !', guard: state.remi.guardLevel === 'body' ? 'Garde basse' : 'Garde haute solide', feint: 'Un mouvement d’épaule…', dodge: 'Il bouge sur ses appuis' };
    if (['running', 'knockdown'].includes(state.phase) && names[state.remi.action]) put(ui.values['remi-status'], names[state.remi.action]);
    if (state.phase === 'ready') {
      put(ui.values['remi-status'], 'Calme. Précis. Prêt.');
      put(ui.elements['panel-eyebrow'], profile.eyebrow);
      put(ui.elements['panel-heading'], `${profile.name}.`);
      put(ui.elements['panel-copy'], profile.introduction);
      put(ui.elements['primary-button'], 'Commencer le combat →');
    } else if (state.phase === 'paused') {
      put(ui.elements['panel-eyebrow'], 'COMBAT EN PAUSE');
      put(ui.elements['panel-copy'], state.pausedPhase === 'corner' ? `La respiration avec ${coach} est en pause. Le bonus acquis est conservé.` : state.pausedPhase === 'knockdown' ? 'Le compte de dix est aussi arrêté. Reprenez quand vous êtes prêt.' : 'Le combat et les points sont en pause. Reprenez à votre rythme.');
      put(ui.elements['primary-button'], state.pausedPhase === 'corner' ? `Reprendre avec ${coach} →` : state.pausedPhase === 'knockdown' ? 'Reprendre le décompte →' : 'Reprendre le combat →');
    } else if (between) {
      put(ui.values['remi-status'], 'Dans son coin');
      put(ui.elements['panel-eyebrow'], `ROUND ${bout.round} TERMINÉ · VOTRE COIN`);
      put(ui.elements['panel-heading'], `Écoute ${coach}.`);
      put(ui.elements['panel-copy'], `À la reprise : endurance ${state.settings.maxStamina} · résistance ${Math.ceil(bout.resistance.player)} → ${Math.min(state.settings.maxResistance, Math.ceil(bout.resistance.player) + 20 + (bout.corner?.bonus ?? 0))}. ${bout.corner?.bonus ? `${coach} : +${bout.corner.bonus} en bonus. ` : ''}Chutes du round remises à zéro; total conservé.`);
      put(this.adviceText, bout.coach ?? 'Observe son direct au corps. Bloque bas, puis profite de son retour en garde pour répondre.');
      const last = bout.roundHistory.at(-1);
      if (last) {
        put(ui.values['result-landed'], last.stats.landed);
        put(ui.values['result-received'], last.stats.received);
        put(ui.elements['round-detail'], `Ce round : ${last.stats.blocked} blocages · ${last.stats.dodged} esquives\nTouches du combat : vous ${state.stats.landed} · ${name} ${state.stats.received}`);
      }
    } else if (state.phase === 'finished') {
      put(ui.values['remi-status'], 'Combat terminé');
      const result = bout.result;
      const won = result?.winner === 'player';
      const draw = result?.winner === 'draw';
      const reason = result?.reason === 'abandon' ? 'VICTOIRE PAR ABANDON'
        : result?.reason === 'points' ? 'DÉCISION AUX POINTS'
        : result?.reason === 'ko' ? 'KO · COMPTE DE DIX'
          : result?.reason === 'round-limit' ? 'ARRÊT · TROIS CHUTES DANS LE ROUND'
            : result?.reason === 'total-limit' ? 'ARRÊT · QUATRE CHUTES DANS LE COMBAT' : 'DOUBLE ARRÊT';
      put(ui.elements['panel-eyebrow'], reason);
      put(ui.elements['panel-heading'], draw ? 'Match nul.' : result?.reason === 'abandon' ? '« J’arrête ! »' : won ? 'Victoire !' : `${name} l’emporte.`);
      put(ui.elements['panel-copy'], draw ? tournament ? 'Égalité : rejouez ce combat sans frais, le même jour. Le tableau reste inchangé.' : `Aucun vainqueur cette fois. Retrouvez ${name} pour la revanche.`
        : result?.reason === 'abandon' ? 'Deux fois au tapis, c’est assez pour Kramer ! Il fait signe à l’arbitre et quitte le combat. Fredo essaie de garder son sérieux.'
          : tournament ? won ? ['gagnon', 'gold-santos'].includes(profile.id) ? 'La finale est gagnée ! Retrouvez le tableau et votre médaille dans la salle.' : 'Vous passez au tour suivant. Retrouvez votre chambre et dormez pour la prochaine journée.' : 'Votre résultat est inscrit au tableau. Vous pouvez profiter du séjour ou rentrer au quartier.'
            : won ? 'Vous avez trouvé son rythme et ses ouvertures. Fredo vous attend au gym.' : 'Fredo est toujours dans votre coin. Reprenez les entraînements ou tentez une revanche à votre rythme.');
      put(ui.elements['primary-button'], tournament && !draw ? 'Retour à la salle →' : `Revanche contre ${name} →`);
      put(ui.elements['round-detail'], `Touches : vous ${state.stats.landed} · ${name} ${state.stats.received}\n${state.stats.blocked} coups bloqués · ${state.stats.dodged} esquivés\nChutes : vous ${bout.downs.player.total} · ${name} ${bout.downs.remi.total}\n${state.stats.combos} combos complets`);
    }
    if (profile.coach) for (const key of ['panel-copy', 'round-detail']) put(ui.elements[key], ui.elements[key].textContent.replaceAll('Fredo', coach));
    this.cornerHUD.update(state);
    this.decisionHUD.update(state, this.decisionElapsed ?? 0);
    // A decisive tournament result belongs to the bracket. Its next action is
    // return, never a local reset that could replay an already recorded match.
    ui.elements['secondary-button'].hidden = state.phase !== 'paused';
  }
  updateStreet(state, profile) {
    const { ui } = this;
    ui.root.dataset.streetFight = 'true';
    put(ui.root.querySelector('.opponent-info .fighter-name'), profile.shortName);
    put(ui.root.querySelector('.opponent-info .fighter-eyebrow'), 'SUR LE PARCOURS');
    put(ui.root.querySelector('.round-footnote'), 'Une chute · Puis la course reprend');
    put(ui.root.querySelector('#sparring-commands-title'), 'Commandes de l’altercation');
    put(ui.root.querySelector('.recovery-help'), 'Une seule chute met fin à l’altercation, puis le marathon reprend au même endroit. Aucun round ni compte de dix. Vous pouvez aussi repartir avec le bouton Course. Pause avec P / Échap / ☰.');
    const clock = ui.root.querySelector('.round-clock'); clock.style.visibility = 'hidden';
    this.rules.hidden = this.score.hidden = this.figure.hidden = this.advice.hidden = true;
    ui.boutHUD.rules.hidden = ui.boutHUD.benefit.hidden = ui.boutHUD.panel.hidden = true;
    for (const meter of Object.values(ui.boutHUD.meters)) meter.downs.hidden = true;
    for (const key of ['lesson-choice', 'round-settings', 'choose-session-button', 'next-lesson-button', 'secondary-button']) ui.elements[key].hidden = true;
    put(ui.elements['return-gym-button'], 'Continuer la course');
    ui.elements['primary-button'].disabled = false;
    if (state.phase === 'ready') {
      put(ui.elements['panel-eyebrow'], 'UNE ALTERCATION SUR LE PARCOURS');
      put(ui.elements['panel-heading'], 'Le coureur s’emporte.');
      put(ui.elements['panel-copy'], profile.introduction);
      put(ui.elements['primary-button'], 'Se défendre');
    } else if (state.phase === 'paused') {
      put(ui.elements['panel-heading'], 'Altercation en pause.');
      put(ui.elements['panel-copy'], 'Reprenez votre défense ou choisissez de continuer la course.');
      put(ui.elements['primary-button'], 'Reprendre');
    } else if (state.phase === 'finished') {
      const won = state.bout.result?.winner === 'player';
      put(ui.elements['panel-eyebrow'], 'LA COURSE VOUS ATTEND');
      put(ui.elements['panel-heading'], won ? 'Il a compris.' : 'On reprend la course.');
      put(ui.elements['panel-copy'], won ? 'Il se calme et vous laisse repartir. Reprenez exactement où vous étiez.' : 'Des coureurs vous séparent. Vous pouvez continuer votre marathon.');
      put(ui.elements['primary-button'], 'Continuer la course');
      put(ui.elements['round-detail'], `${state.stats.landed} touches · ${state.stats.blocked} blocages · ${state.stats.dodged} esquives`);
    }
  }

}
