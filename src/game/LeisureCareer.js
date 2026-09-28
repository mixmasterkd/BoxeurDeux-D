// Friendly games track memories, never money, energy or boxing attributes.
// A ticket belongs to one in-memory career object. Reload, import and reset
// cannot turn an abandoned game into a result for a different save.
const tickets = new WeakMap();
const serials = new WeakMap();
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0 && value < 1_000_000_000;
const time = value => Number.isInteger(value) && value > 0 && value <= 3_600_000;

export function freshLeisure() {
  return { race: { playerWins: 0, karlWins: 0, bestMs: null },
    billiards: { beton: { playerWins: 0, opponentWins: 0 }, kramer: { playerWins: 0, opponentWins: 0 } } };
}

export function normalizeLeisure(raw) {
  if (raw.version < 7) return freshLeisure();
  const value = raw.leisure;
  if (!object(value) || !object(value.race) || !object(value.billiards)
    || !counter(value.race.playerWins) || !counter(value.race.karlWins)
    || !(value.race.bestMs === null || (time(value.race.bestMs) && value.race.playerWins > 0))) {
    throw new Error('L’historique des parties entre amis est invalide.');
  }
  const result = freshLeisure();
  result.race = { playerWins: value.race.playerWins, karlWins: value.race.karlWins, bestMs: value.race.bestMs };
  for (const opponent of ['beton', 'kramer']) {
    const score = value.billiards[opponent];
    if (!object(score) || !counter(score.playerWins) || !counter(score.opponentWins)) throw new Error('Le score de pool est invalide.');
    result.billiards[opponent] = { playerWins: score.playerWins, opponentWins: score.opponentWins };
  }
  return result;
}

export const leisureMethods = {
  leisureStatus() { return structuredClone(this.profile.leisure); },
  beginLeisureGame(kind, opponent) {
    if (this.writeProtected) return this._result(false, 'Cette carrière est protégée. Choisissez une partie compatible.');
    const place = this.profile.location.scene;
    if (!((kind === 'race' && opponent === 'karl' && place === 'home')
      || (kind === 'billiards' && ['beton', 'kramer'].includes(opponent) && place === 'island-bar'))) {
      return this._result(false, kind === 'race' ? 'Retrouvez Karl et la console dans le salon.' : 'Retrouvez la table de pool au bar de l’île.');
    }
    if (this._casinoPending() || this._marathonRunning()) return this._result(false, 'Terminez votre activité en cours avant de jouer.');
    const active = tickets.get(this);
    if (active?.profile === this.profile) return this._result(false, 'Une partie est déjà en cours.');
    const id = (serials.get(this) ?? 0) + 1;
    serials.set(this, id); tickets.set(this, { id, kind, opponent, profile: this.profile });
    return this._result(true, 'Partie amicale : amusez-vous !', { id });
  },
  recordLeisureResult({ id, winner, timeMs } = {}) {
    const ticket = tickets.get(this);
    if (!ticket || ticket.id !== id || ticket.profile !== this.profile || !['player', 'opponent'].includes(winner)
      || this.writeProtected || (ticket.kind === 'race' && !time(Math.round(timeMs)))) {
      return this._result(false, 'Cette partie ne peut pas être enregistrée.', { duplicate: !ticket || ticket?.id !== id });
    }
    const score = ticket.kind === 'race' ? this.profile.leisure.race : this.profile.leisure.billiards[ticket.opponent];
    const key = winner === 'player' ? 'playerWins' : ticket.kind === 'race' ? 'karlWins' : 'opponentWins';
    if (!counter(score[key] + 1)) return this._result(false, 'Le nombre maximal de parties est atteint.');
    score[key]++;
    if (ticket.kind === 'race' && winner === 'player') score.bestMs = Math.min(score.bestMs ?? Infinity, Math.round(timeMs));
    tickets.delete(this); this._save();
    return this._result(true, this.status.persisted ? 'Le score de votre partie a été conservé.'
      : 'Score conservé pour cette session. Le navigateur refuse la sauvegarde : exportez votre carrière avant de fermer.', { score: structuredClone(score) });
  },
  abandonLeisureGame(id) {
    const ticket = tickets.get(this);
    if (!ticket || ticket.id !== id) return this._result(false, 'Aucune partie à quitter.');
    tickets.delete(this);
    return this._result(true, 'Partie quittée, sans résultat ajouté.');
  },
};
