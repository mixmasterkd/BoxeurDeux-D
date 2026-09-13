import './opponent.css';
import { getOpponentProfile } from '../game/OpponentProfiles.js';

const put = (element, value) => { if (element.textContent !== String(value)) element.textContent = String(value); };

/** The first opponent shares the combat controls, but owns his presentation. */
export class OpponentHUD {
  constructor(ui) {
    this.ui = ui;
    this.score = document.createElement('div');
    this.score.className = 'combat-score';
    this.score.setAttribute('aria-label', 'Points du combat');
    this.score.hidden = true;
    ui.root.querySelector('.round-clock').append(this.score);
    this.rules = document.createElement('p');
    this.rules.className = 'combat-rules'; this.rules.hidden = true;
    this.rules.textContent = '3 rounds de 60 s. Une touche nette vaut 1 point; une chute adverse ajoute 3 points. À la fin, le plus haut total gagne. Égalité possible. KO à dix, arrêt à 3 chutes dans un round ou 4 dans le combat.';
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
  }

  update(state) {
    const { ui } = this;
    const profile = getOpponentProfile(state.settings?.opponent);
    const name = profile.shortName ?? profile.name;
    const fight = profile.official;
    const tournament = Boolean(state.settings?.tournament);
    const between = Boolean(state.bout) && state.phase === 'between';
    ui.root.dataset.opponent = profile.id;
    ui.root.dataset.official = String(Boolean(fight));
    ui.root.dataset.tournament = String(tournament);
    this.score.hidden = !fight;
    this.rules.hidden = !fight || state.phase !== 'ready';
    this.figure.hidden = this.advice.hidden = !between;
    if (between && !this.figure.querySelector('img').getAttribute('src')) {
      this.figure.querySelector('img').src = `${import.meta.env.BASE_URL}assets/sprites/corner/fredo-coach.png`;
    }
    if (!fight) {
      if (between) {
        put(ui.elements['panel-heading'], 'Écoute Fredo.');
        put(this.adviceText, 'Prends ton souffle. Rémi est ton partenaire : travaille la bonne garde, puis réponds avec deux coups propres.');
        ui.elements['choose-session-button'].hidden = true;
      }
      return;
    }
    const bout = state.bout;
    const scores = bout?.score ?? { player: 0, remi: 0 };
    put(this.score, `VOUS ${scores.player} · ${scores.remi} ${name.toUpperCase()}`);
    put(ui.root.querySelector('.opponent-info .fighter-name'), name);
    put(ui.root.querySelector('.opponent-info .fighter-eyebrow'), 'VOTRE ADVERSAIRE');
    put(ui.root.querySelector('.round-footnote'), tournament ? 'Gants de bronze · Tenue de compétition' : 'Soirée de boxe · Revanche gratuite');
    put(ui.root.querySelector('#sparring-commands-title'), 'Commandes du combat');
    put(ui.root.querySelector('.combo-help'), 'Comme avec Rémi : J → K → J donne jab, direct, crochet. Le prochain coup peut être préparé juste avant le retour en garde. Une pression par frappe. Le combo coûte 48 d’endurance. Une garde haute, une esquive, un coup reçu ou une pause l’interrompt. Maintenez bas pour les coups au corps.');
    put(ui.root.querySelector('.recovery-help'), 'Au tapis : six pressions alternées J/K ou A/B, en commençant par J/A, avant dix. Relâchez et suivez le repère. Pause avec P / Échap / ☰. Au terme des trois rounds : 1 point par touche nette et 3 par chute adverse; le plus haut total gagne.');
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
      put(ui.elements['panel-copy'], state.pausedPhase === 'knockdown' ? 'Le compte de dix est aussi arrêté. Reprenez quand vous êtes prêt.' : 'Le combat et les points sont en pause. Reprenez à votre rythme.');
      put(ui.elements['primary-button'], state.pausedPhase === 'knockdown' ? 'Reprendre le décompte →' : 'Reprendre le combat →');
    } else if (between) {
      put(ui.values['remi-status'], 'Dans son coin');
      put(ui.elements['panel-eyebrow'], `ROUND ${bout.round} TERMINÉ · VOTRE COIN`);
      put(ui.elements['panel-heading'], 'Écoute Fredo.');
      put(ui.elements['panel-copy'], `À la reprise : endurance ${state.settings.maxStamina} · résistance ${Math.ceil(bout.resistance.player)} → ${Math.min(state.settings.maxResistance, Math.ceil(bout.resistance.player) + 20)}. Chutes du round remises à zéro; total conservé.`);
      put(this.adviceText, bout.coach ?? 'Observe son direct au corps. Bloque bas, puis profite de son retour en garde pour répondre.');
      const last = bout.roundHistory.at(-1);
      if (last) {
        put(ui.values['result-landed'], last.stats.landed);
        put(ui.values['result-received'], last.stats.received);
        put(ui.elements['round-detail'], `Ce round : ${last.stats.blocked} blocages · ${last.stats.dodged} esquives\nPoints du combat : vous ${scores.player} · ${name} ${scores.remi}`);
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
          : tournament ? won ? profile.id === 'gagnon' ? 'La finale est gagnée ! Retrouvez le tableau et votre médaille dans la salle.' : 'Vous passez au tour suivant. Retrouvez votre chambre et dormez pour la prochaine journée.' : 'Votre résultat est inscrit au tableau. Vous pouvez profiter du séjour ou rentrer au quartier.'
            : won ? 'Vous avez trouvé son rythme et ses ouvertures. Fredo vous attend au gym.' : 'Fredo est toujours dans votre coin. Reprenez les entraînements ou tentez une revanche à votre rythme.');
      put(ui.elements['primary-button'], tournament && !draw ? 'Retour à la salle →' : `Revanche contre ${name} →`);
      put(ui.elements['round-detail'], `Points : vous ${scores.player} · ${name} ${scores.remi}\n${state.stats.blocked} coups bloqués · ${state.stats.dodged} esquivés\nChutes : vous ${bout.downs.player.total} · ${name} ${bout.downs.remi.total}\n${state.stats.combos} combos complets`);
    }
    // A decisive tournament result belongs to the bracket. Its next action is
    // return, never a local reset that could replay an already recorded match.
    ui.elements['secondary-button'].hidden = state.phase !== 'paused';
  }
}
