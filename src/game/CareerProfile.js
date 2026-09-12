import { activityCost, DAILY_ENERGY_MAX, freshDaily, HOME_SPAWN, LEGACY_GYM_SPAWN,
  validDaily, cleanLocation } from './DayRules.js';
import { BASE_STATS, trainingCaps, moneyCap, freshFight, freshChapter, normalizeChapter, cleanFight,
  SHOP_CATALOG, FIGHT_IDS, DELIVERY_STOPS, DELIVERY_PAY, DELIVERY_MAX_TIP, validDeliveryStops,
  TOURNAMENT_OPPONENTS, TOURNAMENT_PARTICIPANTS, TOURNAMENT_ROUNDS, TOURNAMENT_FEES, MEDAL_LABELS,
  HOTEL_ROOM_SPAWN, TOURNAMENT_RETURN_SPAWN } from './ChapterRules.js';

// Retain the original key so existing players are migrated automatically.
const STORAGE_KEY = 'boxeur-deux-d-career-v1';
const BACKUP_KEY = `${STORAGE_KEY}-backup`;
const CORRUPT_KEY = `${STORAGE_KEY}-corrupt`;
const VERSION = 3;
const LEGACY_ACTIVITIES = ['bag', 'speedball', 'rope', 'sparring', 'shadow'];
const ACTIVITIES = [...LEGACY_ACTIVITIES, 'pads', 'pool'];
const clone = value => JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));

function freshProfile(now = new Date().toISOString()) {
  return {
    version: VERSION, revision: 0, createdAt: now, updatedAt: now,
    daily: freshDaily(), location: { ...HOME_SPAWN },
    stats: { ...BASE_STATS }, caps: trainingCaps({}),
    activities: Object.fromEntries(ACTIVITIES.map(id => [id, { sessions: 0, best: 0 }])),
    fights: Object.fromEntries(FIGHT_IDS.map(id => [id, freshFight()])),
    ...freshChapter(),
  };
}

function normalize(raw) {
  if (!object(raw) || ![1, 2, VERSION].includes(raw.version)) {
    if (object(raw) && typeof raw.version === 'number' && raw.version > VERSION) {
      const error = new Error('Cette sauvegarde vient d’une version plus récente du jeu.');
      error.code = 'future-version'; throw error;
    }
    throw new Error('Ce fichier n’est pas une sauvegarde BoxeurDeux-D compatible.');
  }
  if (!counter(raw.revision) || !date(raw.createdAt) || !date(raw.updatedAt)
    || !object(raw.stats) || !object(raw.caps) || !object(raw.activities) || !object(raw.fights)) {
    throw new Error('La sauvegarde est incomplète ou endommagée.');
  }
  const profile = freshProfile(raw.createdAt);
  profile.updatedAt = raw.updatedAt; profile.revision = raw.revision;
  if (raw.version === 1) profile.location = { ...LEGACY_GYM_SPAWN };
  else {
    if (!validDaily(raw.daily)) throw new Error('Le jour ou l’énergie de cette sauvegarde est invalide.');
    profile.daily = { day: raw.daily.day, energy: raw.daily.energy, maxEnergy: DAILY_ENERGY_MAX };
    profile.location = cleanLocation(raw.location);
  }
  for (const id of raw.version < VERSION ? ['beton'] : FIGHT_IDS) profile.fights[id] = cleanFight(raw.fights[id]);
  profile.caps = trainingCaps(profile.fights);
  for (const stat of Object.keys(BASE_STATS)) {
    const value = raw.stats[stat];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < BASE_STATS[stat]
      || typeof raw.caps[stat] !== 'number' || !Number.isFinite(raw.caps[stat])) {
      throw new Error('Les capacités de cette sauvegarde sont invalides.');
    }
    profile.stats[stat] = Number(Math.min(profile.caps[stat], value).toFixed(2));
  }
  for (const id of raw.version < VERSION ? LEGACY_ACTIVITIES : ACTIVITIES) {
    const activity = raw.activities[id];
    if (!object(activity) || !counter(activity.sessions) || typeof activity.best !== 'number'
      || !Number.isFinite(activity.best) || activity.best < 0) {
      throw new Error('L’historique des entraînements est invalide.');
    }
    profile.activities[id] = { sessions: activity.sessions, best: activity.best };
  }
  if (raw.version === VERSION) Object.assign(profile, normalizeChapter(raw, profile.fights));
  return profile;
}

function parseSource(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('Fichier de sauvegarde invalide ou trop volumineux.');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Ce fichier ne contient pas une sauvegarde JSON valide.'); }
  return { profile: normalize(value), migrated: value.version < VERSION };
}
const parse = text => parseSource(text).profile;

const POLICIES = {
  bag: { stat: 'power', amount: 1, metric: m => finite(m.accuracy ?? m.precision), minimum: 50, volume: m => finite(m.contacts) >= 6, label: 'Puissance' },
  speedball: { stat: 'recovery', amount: .02, metric: m => finite(m.accuracy ?? m.precision), minimum: 60, volume: m => finite(m.hits) >= 20 && m.qualified !== false, label: 'Récupération' },
  rope: { stat: 'endurance', amount: 2, metric: m => finite(m.accuracy ?? m.precision), minimum: 60, volume: m => finite(m.hits) >= 20 && m.qualified !== false, label: 'Endurance max' },
  sparring: { stat: 'resistance', amount: 2, metric: m => finite(m.rounds), minimum: 1, volume: m => m.completed === true && finite(m.actions) >= 10, label: 'Résistance' },
  pads: { stat: 'power', amount: 1, metric: m => finite(m.accuracy ?? m.precision), minimum: 60, volume: m => m.completed === true && finite(m.hits) >= 12, label: 'Puissance' },
  pool: { stat: 'endurance', amount: 2, metric: m => finite(m.accuracy ?? m.precision), minimum: 60, volume: m => m.completed === true && finite(m.laps) >= 3, label: 'Endurance max' },
};

export class CareerProfile {
  constructor(options = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.storage = null; this.lastPersisted = null; this.backupAvailable = false;
    this.status = { state: 'new', persisted: false, message: 'Votre journée sera enregistrée automatiquement pendant la partie.' };
    // Accessing localStorage itself can throw in a blocked browser context.
    try { this.storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage; }
    catch { this._unavailable(); }
    this.profile = this._load();
  }

  _unavailable() {
    this.status = { state: 'unavailable', persisted: false,
      message: 'Sauvegarde locale indisponible. Votre partie reste dans cette session : exportez-la pour la conserver.' };
  }

  _load() {
    if (!this.storage) { this._unavailable(); return freshProfile(this.now()); }
    let primary, backup;
    try { primary = this.storage.getItem(STORAGE_KEY); backup = this.storage.getItem(BACKUP_KEY); }
    catch { this._unavailable(); return freshProfile(this.now()); }
    let backupProfile = null;
    if (backup) { try { backupProfile = parse(backup); this.backupAvailable = true; } catch { /* Never restore malformed backups. */ } }
    if (primary) {
      try {
        const { profile, migrated } = parseSource(primary);
        this.lastPersisted = primary;
        this.status = { state: 'saved', persisted: true, message: `Sauvegarde locale · révision ${profile.revision}` };
        if (migrated) {
          let backupFailed = false;
          try { this.storage.setItem(BACKUP_KEY, primary); this.backupAvailable = true; }
          catch { backupFailed = true; }
          try {
            this.lastPersisted = JSON.stringify(profile);
            this.storage.setItem(STORAGE_KEY, this.lastPersisted);
            this.status.message = `Ancienne progression conservée · jour ${profile.daily.day}${backupFailed ? ' · copie de secours indisponible' : ''}`;
          } catch { this.lastPersisted = primary; this._unavailable(); }
        }
        return profile;
      } catch (error) {
        if (error.code === 'future-version') {
          this.writeProtected = true;
          this.status = { state: 'incompatible', persisted: false,
            message: 'Une sauvegarde plus récente existe. Elle est conservée; cette version ne peut pas l’enregistrer. Importez une partie compatible ou choisissez Nouvelle partie.' };
          return backupProfile ?? freshProfile(this.now());
        }
        // Keep the rejected source separate from the last valid backup.
        try { this.storage.setItem(CORRUPT_KEY, primary); } catch { /* Optional diagnostic copy. */ }
      }
    }
    if (backupProfile) {
      this.lastPersisted = JSON.stringify(backupProfile);
      this.status = { state: 'recovered', persisted: true, message: 'Progression récupérée depuis la dernière copie de secours.' };
      try { this.storage.setItem(STORAGE_KEY, this.lastPersisted); }
      catch { this.lastPersisted = backup; this._unavailable(); }
      return backupProfile;
    }
    if (primary || backup) this.status = { state: 'invalid', persisted: false,
      message: 'La sauvegarde est illisible. Une nouvelle session est ouverte; vous pouvez importer une copie valide.' };
    return freshProfile(this.now());
  }

  snapshot() { return clone(this.profile); }
  saveStatus() { return { ...this.status, revision: this.profile.revision, backupAvailable: this.backupAvailable }; }
  hasProgress() { return this.profile.revision > 0; }
  dailyStatus() { return { ...this.profile.daily }; }
  activityCost(activity) { return activityCost(activity); }
  canStartActivity(activity) {
    const cost = activityCost(activity), { energy } = this.profile.daily;
    const ok = energy >= cost;
    return { ok, activity, cost, energy,
      message: ok ? (cost ? `Cette séance coûte ${cost} points d’énergie de journée.` : 'Cette activité ne coûte pas d’énergie de journée.')
        : `Énergie insuffisante : ${cost} points nécessaires, ${energy} disponibles. Rentrez dormir pour passer au lendemain.` };
  }
  spendEnergy(activity) {
    const availability = this.canStartActivity(activity);
    if (!availability.ok || availability.cost === 0) return { ...availability, saved: this.status.persisted, saveMessage: this.status.message };
    this.profile.daily.energy -= availability.cost;
    this._save();
    const message = `Séance commencée : ${availability.cost} points d’énergie de journée utilisés.`;
    return { ...availability, energy: this.profile.daily.energy, saved: this.status.persisted, saveMessage: this.status.message,
      message: this.status.persisted ? message : `${message} ${this.status.message}` };
  }
  sleep() {
    const active = this.profile.tournament.active;
    if (this.profile.delivery.active) return this._result(false, 'Terminez ou abandonnez votre tournée avant de dormir.');
    if (active?.status === 'ready') return this._result(false, 'Votre combat du jour reste à disputer dans la salle d’événement.');
    if (this.profile.daily.day === Number.MAX_SAFE_INTEGER) {
      return { ok: false, ...this.dailyStatus(), saved: this.status.persisted,
        message: 'Le nombre maximal de journées de cette sauvegarde est atteint.' };
    }
    this.profile.daily.day += 1;
    this.profile.daily.energy = DAILY_ENERGY_MAX;
    if (active) {
      if (active.status === 'awaiting-sleep') { active.day += 1; active.status = 'ready'; }
      this.profile.location = { ...HOTEL_ROOM_SPAWN };
    } else if (this.profile.location.scene !== 'home') this.profile.location = { ...HOME_SPAWN };
    this._save();
    const message = `Jour ${this.profile.daily.day} : énergie de journée récupérée.`;
    return { ok: true, ...this.dailyStatus(), saved: this.status.persisted, saveMessage: this.status.message,
      message: this.status.persisted ? message : `${message} ${this.status.message}` };
  }
  setLocation(location) {
    const next = cleanLocation(location), previous = this.profile.location;
    if (Object.keys(next).some(key => next[key] !== previous[key])) {
      this.profile.location = next;
      this._save();
    }
    return { ok: true, location: { ...this.profile.location }, saved: this.status.persisted,
      message: this.status.message, saveMessage: this.status.message };
  }
  bonuses() {
    return { maxStamina: this.profile.stats.endurance, recoveryBonus: Number((this.profile.stats.recovery - 1).toFixed(2)),
      maxResistance: this.profile.stats.resistance, powerBonus: this.profile.stats.power };
  }

  _save({ increment = true } = {}) {
    this.profile.updatedAt = this.now();
    if (increment) this.profile.revision += 1;
    const text = JSON.stringify(this.profile);
    if (this.writeProtected) return this.snapshot();
    if (!this.storage) { this._unavailable(); return this.snapshot(); }
    let backupFailed = false;
    if (this.lastPersisted) {
      try { this.storage.setItem(BACKUP_KEY, this.lastPersisted); this.backupAvailable = true; }
      catch { backupFailed = true; }
    }
    try {
      this.storage.setItem(STORAGE_KEY, text); this.lastPersisted = text;
      this.status = { state: 'saved', persisted: true,
        message: `Sauvegarde locale · révision ${this.profile.revision}${backupFailed ? ' · copie de secours indisponible' : ''}` };
    } catch { this._unavailable(); }
    return this.snapshot();
  }

  reward(activity, metrics = {}) {
    if (!ACTIVITIES.includes(activity)) throw new Error(`Unknown activity: ${activity}`);
    const history = this.profile.activities[activity]; history.sessions += 1;
    const policy = POLICIES[activity];
    const score = policy ? policy.metric(metrics) : finite(metrics.seconds);
    history.best = Math.max(history.best, score);
    let reward = { activity, qualified: false, gained: 0, capped: false, stat: null, label: null };
    if (policy) {
      const qualified = score >= policy.minimum && policy.volume(metrics);
      const before = this.profile.stats[policy.stat], cap = this.profile.caps[policy.stat];
      const after = Number((qualified ? Math.min(cap, before + policy.amount) : before).toFixed(2));
      this.profile.stats[policy.stat] = after;
      reward = { activity, qualified, gained: Number((after - before).toFixed(2)), capped: after >= cap,
        stat: policy.stat, label: policy.label, value: after, cap, score };
    }
    this._save();
    return { ...reward, saved: this.status.persisted, saveMessage: this.status.message };
  }

  _result(ok, message, extra = {}) {
    return { ok, message, saved: this.status.persisted, saveMessage: this.status.message, ...extra };
  }
  moneyStatus() { return { ...this.profile.wallet, cap: moneyCap(this.profile.fights) }; }
  catalogue(shop) {
    return SHOP_CATALOG.filter(item => !shop || item.shop === shop).map(item => ({ ...item,
      owned: this.profile.inventory.owned.includes(item.id), equipped: this.profile.inventory.equipped[item.slot] === item.id }));
  }
  buyItem(id) {
    const item = SHOP_CATALOG.find(item => item.id === id);
    if (!item) return this._result(false, 'Cet article n’existe pas.');
    if (this.profile.inventory.owned.includes(id)) return this._result(false, 'Cet article est déjà dans votre collection.');
    if (this.profile.wallet.money < item.price) return this._result(false, `Il vous faut ${item.price} $ pour cet article.`);
    this.profile.wallet.money -= item.price;
    this.profile.inventory.owned.push(id);
    this._save();
    return this._result(true, `${item.label} acheté. Retrouvez-le ${item.slot === 'street' ? 'dans votre garde-robe à la maison' : 'au casier du gym'}.`, { item: { ...item }, money: this.profile.wallet.money });
  }
  equipItem(id, place = this.profile.location.scene) {
    const item = SHOP_CATALOG.find(item => item.id === id);
    if (!item || !this.profile.inventory.owned.includes(id)) return this._result(false, 'Vous ne possédez pas cet article.');
    if (place !== (item.slot === 'street' ? 'home' : 'gym')) return this._result(false,
      item.slot === 'street' ? 'Changez de tenue dans la garde-robe à la maison.' : 'Changez de tenue de boxe au casier du gym.');
    if (this.profile.inventory.equipped[item.slot] === id) return this._result(true, 'Cette tenue est déjà équipée.', { unchanged: true });
    this.profile.inventory.equipped[item.slot] = id;
    this._save();
    return this._result(true, `${item.label} équipé.`, { item: { ...item } });
  }
  deliveryStatus() {
    const delivery = clone(this.profile.delivery);
    return { ...delivery, nextStop: delivery.active?.stops[delivery.active.completed.length] ?? null,
      cost: activityCost('delivery'), basePay: DELIVERY_PAY, maxTip: DELIVERY_MAX_TIP };
  }
  startDelivery(stops = DELIVERY_STOPS) {
    if (!validDeliveryStops(stops)) return this._result(false, 'Une tournée doit avoir trois adresses différentes.');
    if (this.profile.tournament.active) return this._result(false, 'Terminez votre séjour au tournoi avant de reprendre les livraisons.');
    if (this.profile.delivery.active) return this._result(false, 'Une tournée est déjà en cours. Retrouvez la prochaine adresse.');
    const offer = this.canStartActivity('delivery');
    if (!offer.ok) return this._result(false, offer.message, offer);
    if (this.profile.delivery.nextId === Number.MAX_SAFE_INTEGER) return this._result(false, 'Le nombre maximal de tournées est atteint.');
    this.profile.daily.energy -= offer.cost;
    this.profile.delivery.active = { id: this.profile.delivery.nextId++, stops: [...stops], completed: [], earned: 0 };
    this._save();
    return this._result(true, `Trois colis à livrer · ${offer.cost} points d’énergie utilisés.`, this.deliveryStatus());
  }
  deliverParcel(stopId, options = {}) {
    const active = this.profile.delivery.active;
    if (!active) return this._result(false, 'Aucune tournée en cours.');
    if (active.completed.includes(stopId)) return this._result(false, 'Ce colis a déjà été livré.', { duplicate: true });
    if (active.stops[active.completed.length] !== stopId) return this._result(false, 'Ce n’est pas la prochaine adresse de votre tournée.');
    const tip = options.tip ?? 1;
    if (!Number.isInteger(tip) || tip < 0 || tip > DELIVERY_MAX_TIP) return this._result(false, 'Ce pourboire est invalide.');
    const gross = DELIVERY_PAY + tip;
    const paid = Math.min(gross, moneyCap(this.profile.fights) - this.profile.wallet.money,
      Number.MAX_SAFE_INTEGER - this.profile.wallet.totalEarned);
    this.profile.wallet.money += paid; this.profile.wallet.totalEarned += paid;
    active.completed.push(stopId); active.earned += paid;
    const completed = active.completed.length === active.stops.length, earned = active.earned;
    if (completed) { this.profile.delivery.completedTours += 1; this.profile.delivery.active = null; }
    this._save();
    return this._result(true, `Colis livré : +${paid} $${paid < gross ? ' · plafond d’épargne atteint' : `, dont ${tip} $ de pourboire`}${completed ? '. Tournée terminée !' : '.'}`,
      { paid, tip, capped: paid < gross, completed, earned, money: this.profile.wallet.money, ...this.deliveryStatus() });
  }
  abandonDelivery() {
    if (!this.profile.delivery.active) return this._result(false, 'Aucune tournée en cours.');
    this.profile.delivery.active = null;
    this._save();
    return this._result(true, 'Tournée abandonnée. Les gains déjà reçus sont conservés; l’énergie dépensée reste utilisée.');
  }
  canFight(opponent = 'beton') {
    if (opponent === 'beton') return { ok: true, opponent };
    if (opponent === 'kramer') return { ok: this.profile.fights.beton.wins > 0, opponent,
      message: 'Battez Béton pour rencontrer Kramer « The Quitter ».' };
    const active = this.profile.tournament.active;
    return { ok: active?.status === 'ready' && TOURNAMENT_OPPONENTS[active.day - 1] === opponent,
      opponent, message: 'Cet adversaire vous attend dans le tableau des Gants de bronze.' };
  }
  canStartTournament() {
    const fee = this.profile.tournament.entries ? TOURNAMENT_FEES.retry : TOURNAMENT_FEES.first;
    const base = { fee, money: this.profile.wallet.money };
    if (this.profile.tournament.active) return { ...base, ok: false, message: 'Votre séjour aux Gants de bronze est déjà en cours.' };
    if (this.profile.delivery.active) return { ...base, ok: false, message: 'Terminez ou abandonnez votre tournée avant de partir.' };
    if (!this.profile.fights.kramer.wins) return { ...base, ok: false, message: 'Battez Kramer pour vous inscrire aux Gants de bronze.' };
    if (this.profile.wallet.money < fee) return { ...base, ok: false, message: `Inscription : ${fee} $. Quelques tournées vous aideront à réunir la somme.` };
    if (this.profile.tournament.nextId === Number.MAX_SAFE_INTEGER) return { ...base, ok: false, message: 'Le nombre maximal d’inscriptions est atteint.' };
    return { ...base, ok: true, message: `${fee} $ · tournoi, hôtel et installations compris pendant les trois jours.` };
  }
  startTournament() {
    const offer = this.canStartTournament();
    if (!offer.ok) return this._result(false, offer.message, offer);
    this.profile.wallet.money -= offer.fee;
    const tournament = this.profile.tournament;
    tournament.active = { id: tournament.nextId++, day: 1, status: 'ready', results: [], medal: null };
    tournament.entries += 1;
    this.profile.location = { ...HOTEL_ROOM_SPAWN };
    this._save();
    return this._result(true, 'Bienvenue aux Gants de bronze. Votre quart de finale vous attend au jour 1.', { ...this.tournamentStatus(), fee: offer.fee });
  }
  tournamentStatus() {
    const state = clone(this.profile.tournament), active = state.active;
    return { ...state, opponent: active ? TOURNAMENT_OPPONENTS[active.day - 1] : null,
      currentMatchId: active ? `${active.id}:${active.day}` : null,
      roundLabel: active ? TOURNAMENT_ROUNDS[active.day - 1] : null,
      participants: clone(TOURNAMENT_PARTICIPANTS), canSleep: !active || active.status !== 'ready',
      canFight: active?.status === 'ready', fee: state.entries ? TOURNAMENT_FEES.retry : TOURNAMENT_FEES.first };
  }
  _updateFight(opponent, result) {
    const fight = this.profile.fights[opponent]; fight.attempts += 1;
    if (result.winner === 'player') fight.wins += 1;
    else if (result.winner === 'remi') fight.losses += 1;
    else fight.draws += 1;
    if (Number.isFinite(result.score) && result.score >= 0) fight.bestScore = Math.max(fight.bestScore ?? 0, result.score);
    this.profile.caps = trainingCaps(this.profile.fights);
  }
  recordFight(result = {}) {
    if (!['player', 'remi', 'draw'].includes(result.winner)) throw new Error('Le résultat du combat est incomplet.');
    const opponent = result.opponent ?? 'beton';
    if (!['beton', 'kramer'].includes(opponent)) return this._result(false, 'Les résultats du tournoi sont enregistrés avec leur numéro de rencontre.');
    const offer = this.canFight(opponent);
    if (!offer.ok) return this._result(false, offer.message);
    if (result.matchId != null) {
      if (typeof result.matchId !== 'string' || !/^[\p{L}\p{N}_: .-]{1,100}$/u.test(result.matchId)) return this._result(false, 'Le numéro du combat est invalide.');
      const receipt = `${opponent}:${result.matchId}`;
      if (this.profile.fightReceipts.includes(receipt)) return this._result(false, 'Ce résultat a déjà été enregistré.', { duplicate: true });
      if (this.profile.fightReceipts.length >= 10000) return this._result(false, 'Le nombre maximal de résultats est atteint.');
      this.profile.fightReceipts.push(receipt);
    }
    this._updateFight(opponent, result);
    return { ...this._save(), ok: true };
  }
  recordTournamentFight(result = {}) {
    const active = this.profile.tournament.active;
    if (!active) return this._result(false, 'Aucun séjour au tournoi en cours.');
    if (active.results.some(recorded => recorded.matchId === result.matchId)) return this._result(false, 'Ce résultat est déjà enregistré.', { duplicate: true });
    if (active.status !== 'ready' || result.matchId !== `${active.id}:${active.day}`
      || result.opponent !== TOURNAMENT_OPPONENTS[active.day - 1] || !['player', 'remi', 'draw'].includes(result.winner))
      return this._result(false, 'Ce résultat ne correspond pas au combat prévu aujourd’hui.');
    // The arcade rules can yield a points draw. A tournament needs a winner:
    // replay this match for free, without advancing the bracket or the day.
    if (result.winner === 'draw') return this._result(false, 'Égalité : rejouez ce combat sans frais.', { replay: true });
    const score = Number.isFinite(result.score) && result.score >= 0 ? result.score : null;
    active.results.push({ day: active.day, opponent: result.opponent, matchId: result.matchId, winner: result.winner, score });
    this._updateFight(result.opponent, result);
    if (result.winner === 'player') {
      active.status = active.day === 3 ? 'champion' : 'awaiting-sleep';
      if (active.day === 3) active.medal = 'gold';
    } else { active.status = 'eliminated'; active.medal = ['participation', 'bronze', 'silver'][active.day - 1]; }
    if (active.medal) this.profile.tournament.medals.push({ tournamentId: active.id, type: active.medal, day: this.profile.daily.day });
    this._save();
    const message = active.medal ? `${MEDAL_LABELS[active.medal]} ajoutée à votre collection à la maison.` : 'Victoire ! Retrouvez votre lit à l’hôtel pour passer au prochain jour.';
    return this._result(true, message, this.tournamentStatus());
  }
  leaveTournament() {
    const active = this.profile.tournament.active;
    if (!active) return this._result(false, 'Aucun séjour au tournoi en cours.');
    if (!['champion', 'eliminated'].includes(active.status)) active.status = 'forfeited';
    this.profile.tournament.history.push({ ...active, returnedAtDay: this.profile.daily.day });
    this.profile.tournament.active = null;
    this.profile.location = { ...TOURNAMENT_RETURN_SPAWN };
    this._save();
    return this._result(true, active.status === 'forfeited' ? 'Retour au quartier. Votre inscription est terminée et reste utilisée.' : 'Retour au quartier. Votre résultat et votre récompense sont sauvegardés.',
      { location: { ...this.profile.location }, medal: active.medal });
  }

  exportText() { return `${JSON.stringify(this.profile, null, 2)}\n`; }
  inspectImport(text) { return clone(parse(text)); }
  importText(text) {
    const candidate = parse(text); // Validate completely before changing active progress.
    this.profile = candidate; this.writeProtected = false;
    return this._save();
  }
  reset() { this.profile = freshProfile(this.now()); this.writeProtected = false; return this._save({ increment: false }); }
}

export const careerProfile = new CareerProfile();
export { STORAGE_KEY as CAREER_STORAGE_KEY, BACKUP_KEY as CAREER_BACKUP_KEY, VERSION as CAREER_VERSION };
