/** Opponent identity and authored rhythm. Combat animation timings remain shared
 * with SparringSession; these values describe the gaps between those motions. */
export const OPPONENT_PROFILES = Object.freeze({
  remi: Object.freeze({ id: 'remi', name: 'Rémi le Tank', official: false }),
  beton: Object.freeze({
    id: 'beton', name: 'Béton', shortName: 'Béton', official: true, maxResistance: 100,
    eyebrow: 'VOTRE PREMIER ADVERSAIRE',
    introduction: 'Il protège bien sa tête. Observez ses épaules : son direct au corps laisse une vraie ouverture. Rémi vous a préparé; à vous de choisir la bonne réponse.',
    rhythm: Object.freeze({
      initialOpening: 1.10,
      guard: .80,
      jabTell: .70,
      crossTell: .88,
      afterJab: .65,
      afterCross: 1.85,
      afterRecovery: 1.25,
    }),
  }),
  kramer: Object.freeze({
    id: 'kramer', name: 'Kramer « The Quitter »', shortName: 'Kramer', official: true,
    maxResistance: 100, quitsAfterDowns: 2, eyebrow: 'LE DEUXIÈME DÉFI · ALLEMAGNE',
    introduction: 'Il aime casser la cadence : un mouvement d’épaule, un temps d’arrêt, puis son direct. Restez calme et observez sa véritable préparation avant de répondre.',
    advice: 'Son petit mouvement d’épaule ne promet pas toujours une frappe. Garde du souffle et attends son direct : c’est là que sa défense s’ouvre.',
    rhythm: Object.freeze({ initialOpening: 1.15, afterRecovery: 1.8 }),
    pattern: Object.freeze([
      { action: 'guard', duration: .75, guardLevel: 'head' },
      { action: 'feint', duration: .38, side: 'left' },
      { action: 'guard', duration: .42, guardLevel: 'head' },
      { attack: 'cross', target: 'head', tell: .78, opening: 1.85 },
      { action: 'guard', duration: .75, guardLevel: 'body' },
      { attack: 'jab', target: 'head', tell: .64, opening: .65 },
      { attack: 'cross', target: 'body', tell: .87, opening: 1.9 },
    ].map(Object.freeze)),
  }),
  bellini: Object.freeze({
    id: 'bellini', name: 'Marco Bellini', shortName: 'Bellini', official: true, tournament: true,
    maxResistance: 100, eyebrow: 'GANTS DE BRONZE · QUART DE FINALE',
    introduction: 'Marco bouge sur ses appuis et revient souvent à son jab. Ses deux touches rapides annoncent un direct : protégez la tête, puis profitez de son retour en garde.',
    advice: 'Ses deux jabs ont une préparation courte mais visible. Ne dépense pas tout entre les deux : sa grande ouverture vient après le direct.',
    rhythm: Object.freeze({ initialOpening: 1.1, afterRecovery: 1.8 }),
    pattern: Object.freeze([
      { action: 'dodge', duration: .6 },
      { action: 'guard', duration: .55, guardLevel: 'head' },
      { attack: 'jab', target: 'head', tell: .62, opening: .42 },
      { attack: 'jab', target: 'head', tell: .60, opening: .60 },
      { attack: 'cross', target: 'head', tell: .86, opening: 1.85 },
    ].map(Object.freeze)),
  }),
  fortin: Object.freeze({
    id: 'fortin', name: 'Louis « Le Roc » Fortin', shortName: 'Fortin', official: true, tournament: true,
    maxResistance: 110, eyebrow: 'GANTS DE BRONZE · DEMI-FINALE',
    introduction: 'Louis avance derrière une garde solide. Il alterne le jab et les directs au corps. Sa frappe basse engage tout son poids et lui laisse du chemin pour revenir.',
    advice: 'Travaille la hauteur libre pendant sa garde. Son direct au corps se prépare lentement : bloque bas, puis enchaîne pendant son long retour.',
    rhythm: Object.freeze({ initialOpening: 1.15, afterRecovery: 1.8 }),
    pattern: Object.freeze([
      { action: 'guard', duration: 1.0, guardLevel: 'head' },
      { attack: 'jab', target: 'head', tell: .70, opening: .65 },
      { action: 'guard', duration: .65, guardLevel: 'body' },
      { attack: 'cross', target: 'body', tell: .92, opening: 1.85 },
      { action: 'guard', duration: .60, guardLevel: 'head' },
      { attack: 'cross', target: 'body', tell: .76, opening: 1.95 },
    ].map(Object.freeze)),
  }),
  gagnon: Object.freeze({
    id: 'gagnon', name: 'André « Le Patron » Gagnon', shortName: 'Gagnon', official: true, tournament: true,
    maxResistance: 110, eyebrow: 'GANTS DE BRONZE · FINALE',
    introduction: 'André mélange les rythmes appris : jab, changement de hauteur et feinte. Chaque attaque reste lisible. Prenez le temps de reconnaître la séquence avant votre réponse.',
    advice: 'Il change de hauteur après son jab. Regarde ses épaules et ses genoux; protège le dernier direct avant de placer ton enchaînement.',
    rhythm: Object.freeze({ initialOpening: 1.0, afterRecovery: 1.7 }),
    pattern: Object.freeze([
      { action: 'guard', duration: .65, guardLevel: 'head' },
      { attack: 'jab', target: 'head', tell: .62, opening: .55 },
      { attack: 'cross', target: 'body', tell: .76, opening: 1.8 },
      { action: 'guard', duration: .60, guardLevel: 'body' },
      { action: 'feint', duration: .35, side: 'left' },
      { action: 'guard', duration: .32, guardLevel: 'head' },
      { attack: 'cross', target: 'head', tell: .70, opening: 1.9 },
    ].map(Object.freeze)),
  }),
});

export function getOpponentProfile(id = 'remi') {
  return Object.hasOwn(OPPONENT_PROFILES, id) ? OPPONENT_PROFILES[id] : OPPONENT_PROFILES.remi;
}

export function opponentCornerAdvice(id, round = {}) {
  const profile = getOpponentProfile(id);
  if (id === 'beton' || !profile.official) return betonCornerAdvice(round);
  const { stats = {}, fatigue = 0 } = round;
  const observation = stats.receivedBody > stats.receivedHead ? 'Tu as surtout reçu au corps : pense à la garde basse. '
    : stats.opponentBlocked > stats.landed ? 'Plusieurs coups ont rencontré sa garde. Cherche la hauteur libre. '
      : stats.combos > 0 ? 'Ton enchaînement trouve son ouverture. ' : '';
  return observation + profile.advice + (fatigue > 0 ? ' Relâche entre les échanges pour respirer.' : '');
}

/** Rémi's corner advice observes the round just finished, rather than lifetime
 * totals. It cannot alter the opponent's next move or react to a held button. */
export function betonCornerAdvice(round = {}) {
  const { stats = {}, fatigue = 0 } = round;
  let advice;
  if ((stats.receivedBody ?? 0) > (stats.receivedHead ?? 0)) {
    advice = 'Son direct vise le corps : maintiens bas jusqu’au contact, puis réponds pendant sa grande ouverture.';
  } else if ((stats.receivedHead ?? 0) > 0) {
    advice = 'Son jab vise la tête. Monte la garde avant le contact; garde le grand enchaînement pour après son direct au corps.';
  } else if ((stats.opponentBlocked ?? 0) > (stats.landed ?? 0)) {
    advice = 'Sa garde haute est solide. Vise le corps pendant sa garde, ou attends son direct pour placer ton enchaînement.';
  } else if ((stats.combos ?? 0) > 0) {
    advice = 'Ton enchaînement passe dans sa grande ouverture. Continue à protéger la bonne hauteur entre les ripostes.';
  } else if ((stats.blocked ?? 0) + (stats.dodged ?? 0) > 0 && (stats.landed ?? 0) === 0) {
    advice = 'Tu lis bien ses attaques. Après son direct au corps, relâche la garde et réponds avec jab, direct, crochet.';
  } else {
    advice = 'Observe son jab à la tête et son direct au corps. Réserve ton enchaînement à l’ouverture après le direct.';
  }
  if (fatigue > 0) advice += ' Relâche les commandes entre les échanges pour retrouver ton souffle.';
  return advice;
}
