/** Opponent identity and authored rhythm. Combat animation timings remain shared
 * with SparringSession; these values describe the gaps between those motions. */
export const OPPONENT_PROFILES = Object.freeze({
  remi: Object.freeze({ id: 'remi', name: 'Rémi le Tank', official: false }),
  beton: Object.freeze({
    id: 'beton', name: 'Béton', official: true, maxResistance: 100,
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
});

export function getOpponentProfile(id = 'remi') {
  return Object.hasOwn(OPPONENT_PROFILES, id) ? OPPONENT_PROFILES[id] : OPPONENT_PROFILES.remi;
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
