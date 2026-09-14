import { activityCost, DAILY_ENERGY_MAX, freshDaily, HOME_SPAWN, LEGACY_GYM_SPAWN,
  validDaily, cleanLocation } from './DayRules.js';
import { BASE_STATS, trainingCaps, moneyCap, freshFight, freshChapter, normalizeChapter, cleanFight,
  SHOP_CATALOG, FIGHT_IDS, LEGACY_FIGHT_IDS, V4_FIGHT_IDS, DELIVERY_STOPS, DELIVERY_PAY, DELIVERY_MAX_TIP, validDeliveryStops,
  TOURNAMENT_PARTICIPANTS, TOURNAMENT_ROUNDS, TOURNAMENT_FEES, MEDAL_LABELS,
  HOTEL_ROOM_SPAWN, TOURNAMENT_RETURN_SPAWN, GOLD_TOURNAMENT_PARTICIPANTS,
  GOLD_TOURNAMENT_FEE, TOURNAMENT_TIERS, tournamentOpponents, tournamentLabel, goldTournamentUnlocked } from './ChapterRules.js';
import { NEXT_FIGHT_IDS, CUBA_HOME_SPAWN, MEXICO_HOME_SPAWN, AIRPORT_SPAWN, TRAVEL_DESTINATIONS,
  postBronzeUnlocked, freshNextChapter, normalizeNextChapter } from './NextChapterRules.js';

import { MARATHON_PRICE, MARATHON_ID, MARATHON_PLACES, MARATHON_START, freshMarathon, normalizeMarathon, cleanMarathonCheckpoint } from './MarathonRules.js';

// Retain the original key so existing players are migrated automatically.
const STORAGE_KEY = 'boxeur-deux-d-career-v1';
const BACKUP_KEY = `${STORAGE_KEY}-backup`;
const VERSION = 5;
const TEST_STORAGE_KEY = `${STORAGE_KEY}-test`;
const TEST_COMMANDS = Object.freeze([
  ['liste', 'Afficher les commandes.'], ['test maison', 'Maison et laptop.'], ['test gym', 'Gym de Montréal.'],
  ['test cuba', 'Séjour de test à Cuba.'], ['test mexique', 'Séjour de test au Mexique.'], ['test aeroport', 'Aéroport avec réservations Cuba et Mexique.'],
  ['test marathon', 'Inscription et départ sur l’île.'], ['test bronze', 'Gants de bronze, jour 1.'], ['test dore', 'Gants dorés, jour 1.'],
  ['combat feu', 'Combat de test (beton, kramer, dyrex, feu, louisto, danielo).'],
  ['argent 500', 'Fixer l’argent de test, dans le plafond de carrière.'], ['energie 100', 'Fixer l’énergie quotidienne de test.'],
  ['retour', 'Revenir à la carrière normale, inchangée.'],
]);
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
    ...freshChapter(), ...freshNextChapter(), marathon: freshMarathon(),
  };
}

function normalize(raw) {
  if (!object(raw) || ![1, 2, 3, 4, VERSION].includes(raw.version)) {
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
  for (const id of raw.version < 3 ? ['beton'] : raw.version === 3 ? LEGACY_FIGHT_IDS : raw.version === 4 ? V4_FIGHT_IDS : FIGHT_IDS) profile.fights[id] = cleanFight(raw.fights[id]);
  profile.caps = trainingCaps(profile.fights);
  for (const stat of Object.keys(BASE_STATS)) {
    const value = raw.stats[stat];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < BASE_STATS[stat]
      || typeof raw.caps[stat] !== 'number' || !Number.isFinite(raw.caps[stat])) {
      throw new Error('Les capacités de cette sauvegarde sont invalides.');
    }
    profile.stats[stat] = Number(Math.min(profile.caps[stat], value).toFixed(2));
  }
  for (const id of raw.version < 3 ? LEGACY_ACTIVITIES : ACTIVITIES) {
    const activity = raw.activities[id];
    if (!object(activity) || !counter(activity.sessions) || typeof activity.best !== 'number'
      || !Number.isFinite(activity.best) || activity.best < 0) {
      throw new Error('L’historique des entraînements est invalide.');
    }
    profile.activities[id] = { sessions: activity.sessions, best: activity.best };
  }
  if (raw.version >= 3) Object.assign(profile, normalizeChapter(raw, profile.fights));
  if (raw.version >= 4) Object.assign(profile, normalizeNextChapter(raw, profile));
  profile.marathon = normalizeMarathon(raw, profile);
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
    this.mode = options.testProfile ? 'test' : 'normal';
    this.storageKey = this.mode === 'test' ? TEST_STORAGE_KEY : STORAGE_KEY;
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
    try { primary = this.storage.getItem(this.storageKey); backup = this.storage.getItem(`${this.storageKey}-backup`); }
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
          try { this.storage.setItem(`${this.storageKey}-backup`, primary); this.backupAvailable = true; }
          catch { backupFailed = true; }
          try {
            this.lastPersisted = JSON.stringify(profile);
            this.storage.setItem(this.storageKey, this.lastPersisted);
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
        try { this.storage.setItem(`${this.storageKey}-corrupt`, primary); } catch { /* Optional diagnostic copy. */ }
      }
    }
    if (backupProfile) {
      this.lastPersisted = JSON.stringify(backupProfile);
      this.status = { state: 'recovered', persisted: true, message: 'Progression récupérée depuis la dernière copie de secours.' };
      try { this.storage.setItem(this.storageKey, this.lastPersisted); }
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
    if (this._marathonRunning()) return { ok: false, activity, cost, energy, message: 'Terminez ou quittez votre course avant de commencer une autre activité.' };
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
    if (this._marathonRunning()) return this._result(false, 'Terminez ou quittez la course avant de dormir.');
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
    } else if (this.profile.mexico.active) {
      this.profile.location = { ...MEXICO_HOME_SPAWN };
    } else if (this.profile.cuba.active) {
      this.profile.location = { ...CUBA_HOME_SPAWN };
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
      try { this.storage.setItem(`${this.storageKey}-backup`, this.lastPersisted); this.backupAvailable = true; }
      catch { backupFailed = true; }
    }
    try {
      this.storage.setItem(this.storageKey, text); this.lastPersisted = text;
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
    if (this._activeTravel()) return this._result(false, 'Rentrez de voyage avant de reprendre les livraisons.');
    if (this._marathonRunning()) return this._result(false, 'Terminez ou quittez la course avant les livraisons.');
    if (this.profile.tournament.active) return this._result(false, 'Terminez votre séjour au tournoi avant de reprendre les livraisons.');
    if (this.profile.delivery.active) return this._result(false, 'Une tournée est déjà en cours. Retrouvez la prochaine adresse.');
    const offer = this.canStartActivity('delivery');
    if (!offer.ok) return this._result(false, offer.message, offer);
    if (this.profile.delivery.nextId === Number.MAX_SAFE_INTEGER) return this._result(false, 'Le nombre maximal de tournées est atteint.');
    this.profile.daily.energy -= offer.cost;
    this.profile.delivery.active = { id: this.profile.delivery.nextId++, stops: [...stops], completed: [], earned: 0, elapsed: 0, bumps: 0 };
    this._save();
    return this._result(true, `Trois colis à livrer · ${offer.cost} points d’énergie utilisés.`, this.deliveryStatus());
  }
  recordDeliveryProgress({ elapsed, bumps } = {}) {
    const active = this.profile.delivery.active;
    if (!active) return this._result(false, 'Aucune tournée en cours.');
    elapsed ??= active.elapsed; bumps ??= active.bumps;
    if (typeof elapsed !== 'number' || !Number.isFinite(elapsed) || elapsed < 0
      || elapsed > Number.MAX_SAFE_INTEGER || !counter(bumps)) return this._result(false, 'Le suivi de la livraison est invalide.');
    const nextElapsed = Math.max(active.elapsed, elapsed), nextBumps = Math.max(active.bumps, bumps);
    if (nextElapsed === active.elapsed && nextBumps === active.bumps) return this._result(true, 'Trajet déjà enregistré.', { unchanged: true });
    active.elapsed = nextElapsed; active.bumps = nextBumps;
    this._save();
    return this._result(true, 'Trajet enregistré.', { elapsed: nextElapsed, bumps: nextBumps });
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
    active.elapsed = 0; active.bumps = 0;
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
  _activeTravel() { return Object.keys(TRAVEL_DESTINATIONS).find(id => this.profile[id].active) ?? null; }
  _marathonRunning() { return this.profile.marathon.active && this.profile.marathon.active.status !== 'registered'; }
  canFight(opponent = 'beton') {
    if (opponent === 'pablo') return { ok: Boolean(this.profile.mexico.active), opponent, message: 'Pablo vous attend au gym du Mexique.' };
    const travel = this._activeTravel();
    if (this._marathonRunning()) return { ok: false, opponent, message: 'Terminez ou quittez votre course avant un combat officiel.' };
    if (travel && TRAVEL_DESTINATIONS[travel].opponent !== opponent) return { ok: false, opponent, message: 'Rentrez de voyage pour ce combat.' };
    if (NEXT_FIGHT_IDS.includes(opponent)) {
      if (!postBronzeUnlocked(this.profile)) return { ok: false, opponent, message: 'Terminez une participation aux Gants de bronze, puis rentrez à Montréal pour ouvrir ces défis.' };
      if (this.profile.tournament.active) return { ok: false, opponent, message: 'Terminez votre séjour au tournoi avant de choisir ce défi.' };
      const required = Object.values(TRAVEL_DESTINATIONS).find(destination => destination.opponent === opponent);
      if (required && !this.profile[required.id].active) return { ok: false, opponent, message: `${opponent === 'louisto' ? 'Louisto' : 'Danielo'} vous attend pendant votre séjour ${required.id === 'cuba' ? 'à Cuba' : 'au Mexique'}.` };
      return { ok: true, opponent };
    }
    if (opponent === 'beton') return { ok: true, opponent };
    if (opponent === 'kramer') return { ok: this.profile.fights.beton.wins > 0, opponent, message: 'Battez Béton pour rencontrer Kramer « The Quitter ».' };
    const active = this.profile.tournament.active;
    return { ok: active?.status === 'ready' && tournamentOpponents(active.tier)[active.day - 1] === opponent,
      opponent, message: 'Cet adversaire vous attend dans le tableau de votre tournoi.' };
  }
  canStartTournament(tier = 'bronze') {
    const fee = tier === 'gold' ? GOLD_TOURNAMENT_FEE : this.profile.tournament.entries ? TOURNAMENT_FEES.retry : TOURNAMENT_FEES.first;
    const base = { tier, fee, money: this.profile.wallet.money, label: tournamentLabel(tier) };
    if (!TOURNAMENT_TIERS.includes(tier)) return { ...base, ok: false, message: 'Ce tournoi n’existe pas.' };
    if (this._activeTravel()) return { ...base, ok: false, message: 'Rentrez de voyage avant une nouvelle inscription au tournoi.' };
    if (this.profile.tournament.active) return { ...base, ok: false, message: 'Votre séjour au tournoi est déjà en cours.' };
    if (this.profile.delivery.active || this._marathonRunning()) return { ...base, ok: false, message: 'Terminez votre tournée ou votre course avant de partir.' };
    if (!this.profile.fights.kramer.wins) return { ...base, ok: false, message: 'Battez Kramer pour vous inscrire aux Gants de bronze.' };
    if (tier === 'gold' && !goldTournamentUnlocked(this.profile)) return { ...base, ok: false,
      message: 'Gants dorés : terminez les Gants de bronze et battez Dyrex, Le Feu, Louisto et Danielo. Le marathon est facultatif.' };
    if (this.profile.wallet.money < fee) return { ...base, ok: false, message: `Inscription : ${fee} $. Quelques tournées vous aideront à réunir la somme.` };
    if (this.profile.tournament.nextId === Number.MAX_SAFE_INTEGER) return { ...base, ok: false, message: 'Le nombre maximal d’inscriptions est atteint.' };
    return { ...base, ok: true, message: `${fee} $ · tournoi, hôtel et installations compris pendant les trois jours.` };
  }
  startTournament(tier = 'bronze') {
    const offer = this.canStartTournament(tier);
    if (!offer.ok) return this._result(false, offer.message, offer);
    this.profile.wallet.money -= offer.fee;
    const tournament = this.profile.tournament;
    tournament.active = { id: tournament.nextId++, day: 1, status: 'ready', results: [], medal: null, tier };
    tournament.entries += 1;
    this.profile.location = { ...HOTEL_ROOM_SPAWN };
    this._save();
    return this._result(true, `Bienvenue aux ${tournamentLabel(tier)}. Votre quart de finale vous attend au jour 1.`, { ...this.tournamentStatus(), fee: offer.fee });
  }
  tournamentStatus() {
    const state = clone(this.profile.tournament), active = state.active, tier = active?.tier ?? 'bronze';
    const opponents = [...tournamentOpponents(tier)];
    return { ...state, tier, label: tournamentLabel(tier), judges: 5, opponents, opponent: active ? opponents[active.day - 1] : null,
      currentMatchId: active ? `${active.id}:${active.day}` : null,
      roundLabel: active ? TOURNAMENT_ROUNDS[active.day - 1] : null,
      participants: clone(tier === 'gold' ? GOLD_TOURNAMENT_PARTICIPANTS : TOURNAMENT_PARTICIPANTS), canSleep: !active || active.status !== 'ready',
      canFight: active?.status === 'ready', fee: tier === 'gold' ? GOLD_TOURNAMENT_FEE : state.entries ? TOURNAMENT_FEES.retry : TOURNAMENT_FEES.first,
      goldUnlocked: goldTournamentUnlocked(this.profile) };
  }
  travelOffer(destination = 'cuba') {
    const config = TRAVEL_DESTINATIONS[destination];
    if (!config) return { ok: false, message: 'Cette destination n’existe pas.' };
    const travel = this.profile[destination], base = { destination, label: config.label, fee: config.price, price: config.price, money: this.profile.wallet.money };
    if (travel.active || travel.reserved) return { ...base, ok: false, duplicate: true, reserved: Boolean(travel.reserved), message: `Votre séjour ${config.label} est déjà payé${travel.reserved ? ' : rendez-vous à l’aéroport pour embarquer' : ' et en cours'}.` };
    if (this._activeTravel()) return { ...base, ok: false, message: 'Rentrez de votre séjour avant de réserver le suivant.' };
    if (this.profile.tournament.active) return { ...base, ok: false, message: 'Rentrez du tournoi avant de réserver votre voyage.' };
    if (this.profile.delivery.active || this._marathonRunning()) return { ...base, ok: false, message: 'Terminez ou quittez votre tournée ou votre course avant de réserver.' };
    if (!postBronzeUnlocked(this.profile)) return { ...base, ok: false, message: 'Une participation terminée aux Gants de bronze ouvre les voyages. Une élimination compte aussi; un abandon ne suffit pas.' };
    if (this.profile.wallet.money < config.price) return { ...base, ok: false, message: `Séjour ${config.label} : ${config.price} $. Il manque ${config.price - this.profile.wallet.money} $. Le retour est compris.` };
    if (travel.nextId === Number.MAX_SAFE_INTEGER) return { ...base, ok: false, message: 'Le nombre maximal de séjours est atteint.' };
    return { ...base, ok: true, message: `${config.price} $ : logement et retour compris. Réservez ici, puis embarquez à l’aéroport. Aucun nombre de nuits imposé.` };
  }
  reserveTravel(destination = 'cuba') {
    const offer = this.travelOffer(destination);
    if (!offer.ok) return this._result(false, offer.message, offer);
    const travel = this.profile[destination];
    this.profile.wallet.money -= offer.price;
    travel.reserved = { id: travel.nextId++, startedAtDay: this.profile.daily.day, fee: offer.price };
    travel.entries++;
    this._save();
    return this._result(true, `Séjour ${offer.label} réservé. Prenez le métro vers l’aéroport, puis présentez-vous à l’embarquement.`, this.travelStatus(destination));
  }
  boardTravel(destination = 'cuba') {
    const config = TRAVEL_DESTINATIONS[destination], travel = this.profile[destination];
    if (!config || !travel?.reserved) return this._result(false, 'Réservez ce séjour avant de vous présenter à l’embarquement.');
    if (this._activeTravel() || this.profile.tournament.active || this.profile.delivery.active || this._marathonRunning()) return this._result(false, 'Terminez votre activité en cours avant d’embarquer.');
    if (this.profile.location.scene !== 'airport') return this._result(false, 'Rendez-vous à l’aéroport pour embarquer.');
    travel.active = travel.reserved; travel.reserved = null;
    this.profile.location = { ...config.home };
    this._save();
    return this._result(true, `Bienvenue ${destination === 'cuba' ? 'à Cuba' : 'au Mexique'} ! Votre logement et votre vol de retour sont compris.`,
      { ...this.travelStatus(destination), location: { ...this.profile.location } });
  }
  travelStatus(destination = 'cuba') {
    const config = TRAVEL_DESTINATIONS[destination];
    if (!config) return { ok: false, message: 'Cette destination n’existe pas.' };
    const travel = clone(this.profile[destination]);
    return { ...travel, destination, label: config.label, fee: config.price, price: config.price, unlocked: postBronzeUnlocked(this.profile),
      canBoard: Boolean(travel.reserved) && !this._activeTravel() && !this.profile.tournament.active && !this.profile.delivery.active && !this._marathonRunning(),
      canLeave: Boolean(travel.active), canFight: Boolean(travel.active), opponent: travel.active ? config.opponent : null };
  }
  leaveTravel(destination = 'cuba') {
    const config = TRAVEL_DESTINATIONS[destination], travel = this.profile[destination];
    if (!config || !travel?.active) return this._result(false, 'Aucun séjour en cours dans cette destination.');
    travel.history.push({ ...travel.active, returnedAtDay: this.profile.daily.day });
    travel.active = null;
    this.profile.location = { ...AIRPORT_SPAWN };
    this._save();
    return this._result(true, 'Retour à l’aéroport de Montréal. Le métro vous ramène au quartier; vos acquis sont conservés.',
      { ...this.travelStatus(destination), location: { ...this.profile.location } });
  }
  cubaOffer() { return this.travelOffer('cuba'); }
  startCuba() { return this.reserveTravel('cuba'); }
  cubaStatus() { return this.travelStatus('cuba'); }
  leaveCuba() { return this.leaveTravel('cuba'); }
  mexicoOffer() { return this.travelOffer('mexico'); }
  startMexico() { return this.reserveTravel('mexico'); }
  mexicoStatus() { return this.travelStatus('mexico'); }
  leaveMexico() { return this.leaveTravel('mexico'); }
  marathonOffer() {
    const base = { fee: MARATHON_PRICE, price: MARATHON_PRICE, money: this.profile.wallet.money };
    if (this.profile.marathon.active) return { ...base, ok: false, duplicate: true, message: 'Vous êtes déjà inscrit. Retrouvez le départ sur l’île.' };
    if (this._activeTravel() || this.profile.tournament.active || this.profile.delivery.active) return { ...base, ok: false, message: 'Terminez votre activité ou votre séjour avant de vous inscrire.' };
    if (this.profile.wallet.money < MARATHON_PRICE) return { ...base, ok: false, message: `Inscription : ${MARATHON_PRICE} $. Une médaille souvenir, sans prime d’argent, récompense votre première arrivée.` };
    if (this.profile.marathon.nextId === Number.MAX_SAFE_INTEGER) return { ...base, ok: false, message: 'Le nombre maximal d’inscriptions est atteint.' };
    return { ...base, ok: true, message: `${MARATHON_PRICE} $ l’inscription. Parcours libre au joypad ou aux directions; départ sur l’île, arrivée au Stade olympique. Médaille souvenir unique, aucune prime d’argent.` };
  }
  registerMarathon() {
    const offer = this.marathonOffer();
    if (!offer.ok) return this._result(false, offer.message, offer);
    const m = this.profile.marathon;
    this.profile.wallet.money -= MARATHON_PRICE;
    m.active = { id: m.nextId++, registeredAtDay: this.profile.daily.day, fee: MARATHON_PRICE, status: 'registered',
      elapsed: 0, stage: 0, routePoint: 0, checkpoint: { ...MARATHON_START }, encounterUsed: false, encounter: 'none' };
    m.entries++;
    this._save();
    return this._result(true, 'Inscription confirmée. Prenez le métro pour l’île et rejoignez le départ à votre rythme.', this.marathonStatus());
  }
  startMarathon() {
    const active = this.profile.marathon.active;
    if (!active) return this._result(false, 'Inscrivez-vous au marathon depuis le navigateur du laptop.');
    if (active.status !== 'registered') return this._result(false, 'Votre course a déjà commencé.', { duplicate: true });
    if (this.profile.location.scene !== 'marathon-island') return this._result(false, 'Rejoignez le départ sur l’île.');
    if (this._activeTravel() || this.profile.tournament.active || this.profile.delivery.active) return this._result(false, 'Terminez votre activité en cours avant le départ.');
    active.status = 'running'; active.checkpoint = { ...this.profile.location };
    this._save();
    return this._result(true, 'C’est parti ! Suivez le parcours en vous déplaçant simplement.', this.marathonStatus());
  }
  marathonStatus() {
    return { ...clone(this.profile.marathon), fee: MARATHON_PRICE, price: MARATHON_PRICE,
      registered: this.profile.marathon.active?.status === 'registered', running: Boolean(this._marathonRunning()),
      medalOwned: this.profile.marathon.medals.length > 0 };
  }
  recordMarathonProgress({ elapsed, checkpoint, routePoint } = {}) {
    const active = this.profile.marathon.active;
    if (!active || active.status !== 'running') return this._result(false, 'Aucune course en mouvement.');
    elapsed ??= active.elapsed; checkpoint ??= active.checkpoint;
    let clean;
    try { clean = cleanMarathonCheckpoint(checkpoint); } catch (error) { return this._result(false, error.message); }
    const stage = MARATHON_PLACES.indexOf(clean.scene);
    const previousPoint = active.routePoint ?? 0;
    routePoint ??= stage === active.stage ? previousPoint : 0;
    if (!counter(routePoint) || routePoint > 50 || (stage === active.stage ? routePoint < previousPoint : routePoint !== 0)) return this._result(false, 'Les points de passage doivent être suivis sans reculer dans le même secteur.');
    if (typeof elapsed !== 'number' || !Number.isFinite(elapsed) || elapsed < active.elapsed || elapsed > Number.MAX_SAFE_INTEGER
      || stage < active.stage || stage > active.stage + 1) return this._result(false, 'Le parcours doit être suivi dans l’ordre, sans reculer le chronomètre.');
    if (elapsed === active.elapsed && routePoint === previousPoint && Object.keys(clean).every(key => clean[key] === active.checkpoint[key])) return this._result(true, 'Course déjà enregistrée.', { unchanged: true });
    active.elapsed = elapsed; active.checkpoint = clean; active.stage = stage; active.routePoint = routePoint;
    this.profile.location = { ...clean };
    this._save();
    return this._result(true, 'Point de course enregistré.', this.marathonStatus());
  }
  encounterMarathon(choice = 'avoid') {
    const active = this.profile.marathon.active;
    if (!active || active.status !== 'running' || active.encounterUsed) return this._result(false, 'Cette rencontre a déjà été dépassée.', { duplicate: Boolean(active?.encounterUsed) });
    if (!['avoid', 'fight'].includes(choice)) return this._result(false, 'Choix de rencontre invalide.');
    active.encounterUsed = true; active.encounter = choice === 'avoid' ? 'avoided' : 'pending';
    if (choice === 'fight') active.status = 'encounter';
    this._save();
    return this._result(true, choice === 'avoid' ? 'Vous poursuivez tranquillement votre course.' : 'Une seule mise au sol met fin à l’altercation.',
      { ...this.marathonStatus(), location: { ...active.checkpoint } });
  }
  resolveMarathonEncounter(result = {}) {
    const active = this.profile.marathon.active;
    if (!active || active.status !== 'encounter') return this._result(false, 'Aucune altercation en cours.', { duplicate: true });
    const winner = typeof result === 'string' ? result : object(result) ? result.winner ?? (typeof result.won === 'boolean' ? result.won ? 'player' : 'remi' : null) : null;
    if (object(result) && result.elapsed !== undefined && (typeof result.elapsed !== 'number' || !Number.isFinite(result.elapsed) || result.elapsed < active.elapsed || result.elapsed > Number.MAX_SAFE_INTEGER)) return this._result(false, 'Le temps de course est invalide.');
    if (!['player', 'remi', 'runner'].includes(winner)) return this._result(false, 'Résultat de l’altercation invalide.');
    active.encounter = winner === 'player' ? 'won' : 'lost'; active.status = 'running';
    if (object(result) && result.elapsed !== undefined) active.elapsed = result.elapsed;
    // The run resumes from precisely the saved position. No money, skill or official fight reward.
    this.profile.location = { ...active.checkpoint };
    this._save();
    return this._result(true, 'L’altercation est terminée. Reprenez votre course.', { ...this.marathonStatus(), location: { ...active.checkpoint } });
  }
  finishMarathon({ elapsed } = {}) {
    const m = this.profile.marathon, active = m.active;
    if (!active || active.status !== 'running') return this._result(false, 'Aucune course à terminer.', { duplicate: !active });
    elapsed ??= active.elapsed;
    if (active.stage !== MARATHON_PLACES.length - 1 || this.profile.location.scene !== 'marathon-stadium'
      || typeof elapsed !== 'number' || !Number.isFinite(elapsed) || elapsed <= 0 || elapsed < active.elapsed || elapsed > Number.MAX_SAFE_INTEGER)
      return this._result(false, 'Suivez tout le parcours jusqu’à la ligne d’arrivée au Stade olympique.');
    active.elapsed = elapsed; active.status = 'finished'; active.finishedAtDay = this.profile.daily.day;
    const firstMedal = m.medals.length === 0, best = m.bestTime === null || elapsed < m.bestTime;
    if (firstMedal) m.medals.push({ event: MARATHON_ID, runId: active.id, day: this.profile.daily.day });
    m.bestTime = m.bestTime === null ? elapsed : Math.min(m.bestTime, elapsed);
    m.history.push(active); m.active = null;
    this._save();
    return this._result(true, `Marathon terminé !${firstMedal ? ' Votre médaille souvenir vous attend à la maison.' : ' Votre arrivée est enregistrée.'}${best ? ' Nouveau record personnel.' : ''}`,
      { ...this.marathonStatus(), firstMedal, personalBest: best, elapsed });
  }
  abandonMarathon() {
    const m = this.profile.marathon, active = m.active;
    if (!active) return this._result(false, 'Aucune inscription en cours.');
    active.status = 'abandoned'; active.finishedAtDay = this.profile.daily.day;
    m.history.push(active); m.active = null;
    this._save();
    return this._result(true, 'Participation terminée. Les frais d’inscription restent utilisés; les lieux restent accessibles.', this.marathonStatus());
  }

  unlockTechnique(id, { completed = false, source = null } = {}) {
    if (id !== 'doubleJab') return this._result(false, 'Cette technique n’existe pas.');
    if (this.profile.techniques.doubleJab) return this._result(true, 'Le double jab–direct est déjà appris.', { unchanged: true });
    if (!postBronzeUnlocked(this.profile) || this.profile.tournament.active || this._activeTravel()) return this._result(false, 'Cette technique se travaille avec The Octopus au gym de Montréal, après votre retour des Gants de bronze.');
    if (completed !== true || source !== 'octopus') return this._result(false, 'Terminez le drill du double jab avec The Octopus pour apprendre cette technique.');
    this.profile.techniques.doubleJab = true;
    this._save();
    return this._result(true, 'Double jab–direct appris : J → J → K, ou A → A → B. Retrouvez la technique dans votre carnet.', { technique: id });
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
    if (!['beton', 'kramer', ...NEXT_FIGHT_IDS].includes(opponent)) return this._result(false, 'Les résultats du tournoi sont enregistrés avec leur numéro de rencontre.');
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
      || result.opponent !== tournamentOpponents(active.tier)[active.day - 1] || !['player', 'remi', 'draw'].includes(result.winner))
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
    if (active.medal) this.profile.tournament.medals.push({ tournamentId: active.id, type: active.medal, day: this.profile.daily.day, ...(active.tier === 'gold' ? { tier: 'gold' } : {}) });
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

  testStatus() { return { active: this.mode === 'test', mode: this.mode, storageKey: this.storageKey }; }
  enterTestProfile({ reset = false } = {}) {
    if (this.mode === 'test' && !reset) return this._result(true, 'Profil de test déjà actif.', this.testStatus());
    const source = this.mode === 'test' ? null : this.snapshot();
    if (source) this.normalState = { profile: source, lastPersisted: this.lastPersisted, backupAvailable: this.backupAvailable, writeProtected: this.writeProtected, status: { ...this.status } };
    this.mode = 'test'; this.storageKey = TEST_STORAGE_KEY;
    this.lastPersisted = null; this.backupAvailable = false; this.writeProtected = false;
    let existing = false;
    try { existing = Boolean(this.storage?.getItem(TEST_STORAGE_KEY)); } catch { /* Session-only tests still isolate the normal profile. */ }
    if (source) this.normalSession = source;
    this.profile = reset ? clone(this.normalSession ?? freshProfile(this.now())) : existing ? this._load() : clone(this.normalSession ?? freshProfile(this.now()));
    this._save({ increment: false });
    return this._result(true, 'Profil de test actif. Votre carrière normale est conservée séparément. Tapez retour pour la retrouver.', this.testStatus());
  }
  leaveTestProfile() {
    if (this.mode !== 'test') return this._result(true, 'Votre carrière normale est déjà active.', { ...this.testStatus(), location: { ...this.profile.location } });
    this.mode = 'normal'; this.storageKey = STORAGE_KEY;
    this.lastPersisted = null; this.backupAvailable = false; this.writeProtected = false;
    if (this.normalState) {
      const state = this.normalState; this.profile = clone(state.profile); this.lastPersisted = state.lastPersisted;
      this.backupAvailable = state.backupAvailable; this.writeProtected = state.writeProtected; this.status = { ...state.status };
    } else if (this.storage) this.profile = this._load();
    else { this.profile = clone(this.normalSession ?? freshProfile(this.now())); this._unavailable(); }
    return this._result(true, 'Retour à votre carrière normale, inchangée.', { ...this.testStatus(), location: { ...this.profile.location } });
  }
  _testClearActivities() {
    if (this.profile.delivery.active) this.abandonDelivery();
    if (this.profile.marathon.active) this.abandonMarathon();
    if (this.profile.tournament.active) this.leaveTournament();
    const travel = this._activeTravel(); if (travel) this.leaveTravel(travel);
  }
  _testMoney() {
    this.profile.wallet.money = moneyCap(this.profile.fights);
    this.profile.wallet.totalEarned = Math.max(this.profile.wallet.totalEarned, this.profile.wallet.money);
  }
  _testBronze() {
    if (!this.profile.fights.beton.wins) this.recordFight({ opponent: 'beton', winner: 'player' });
    if (!this.profile.fights.kramer.wins) this.recordFight({ opponent: 'kramer', winner: 'player' });
    this._testMoney();
    if (!postBronzeUnlocked(this.profile)) {
      this.startTournament();
      const status = this.tournamentStatus();
      this.recordTournamentFight({ opponent: status.opponent, matchId: status.currentMatchId, winner: 'remi' });
      this.leaveTournament();
    }
    this._testMoney(); this.profile.techniques.doubleJab = true;
  }
  _testTrip(destination) {
    this._testMoney();
    if (!this.profile[destination].reserved) this.reserveTravel(destination);
    this.setLocation(AIRPORT_SPAWN);
    return this.boardTravel(destination);
  }
  applyTestCommand(input) {
    if (typeof input !== 'string' || input.length > 100) return this._result(false, 'Commande invalide. Tapez liste.');
    const [command, argument, ...extra] = input.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
    if (extra.length) return this._result(false, 'Une commande contient un ou deux mots. Tapez liste.');
    if (['liste', 'aide'].includes(command)) return this._result(true, 'Commandes du terminal · les commandes de test utilisent une sauvegarde distincte.', { commands: TEST_COMMANDS.map(([command, description]) => ({ command, description })), ...this.testStatus() });
    if (command === 'retour') return this.leaveTestProfile();
    const destinations = { maison: 'home', gym: 'gym', aeroport: 'airport', cuba: 'cuba', mexique: 'mexico', mexico: 'mexico', marathon: 'marathon', bronze: 'bronze', hotel: 'bronze', dore: 'gold', gold: 'gold' };
    const opponents = { beton: 'beton', kramer: 'kramer', dyrex: 'dyrex', feu: 'lefeu', lefeu: 'lefeu', louisto: 'louisto', danielo: 'danielo' };
    if (!(['test', 'combat', 'argent', 'energie'].includes(command))
      || command === 'test' && !destinations[argument] || command === 'combat' && !opponents[argument]
      || ['argent', 'energie'].includes(command) && !/^\d{1,6}$/.test(argument ?? '')) return this._result(false, 'Commande inconnue. Tapez liste pour les commandes disponibles.');
    this.enterTestProfile();
    if (command === 'argent' || command === 'energie') {
      const max = command === 'argent' ? moneyCap(this.profile.fights) : DAILY_ENERGY_MAX;
      const value = Math.min(Number(argument), max);
      if (command === 'argent') { this.profile.wallet.money = value; this.profile.wallet.totalEarned = Math.max(this.profile.wallet.totalEarned, value); }
      else this.profile.daily.energy = value;
      this._save();
      return this._result(true, `${command === 'argent' ? 'Argent' : 'Énergie'} de test : ${value}${Number(argument) > max ? ` · plafond ${max}` : ''}.`, this.testStatus());
    }
    this._testClearActivities();
    this.profile.daily.energy = DAILY_ENERGY_MAX;
    const target = command === 'combat' ? opponents[argument] : destinations[argument];
    if (['home', 'gym'].includes(target)) {
      this.setLocation(target === 'home' ? HOME_SPAWN : LEGACY_GYM_SPAWN);
    } else {
      this._testBronze();
      if (['cuba', 'mexico'].includes(target)) this._testTrip(target);
      else if (target === 'airport') {
        for (const destination of ['cuba', 'mexico']) { this._testMoney(); if (!this.profile[destination].reserved) this.reserveTravel(destination); }
        this.setLocation(AIRPORT_SPAWN);
      } else if (target === 'marathon') {
        this.registerMarathon(); this.setLocation(MARATHON_START);
      } else if (['bronze', 'gold'].includes(target)) {
        if (target === 'gold') {
          for (const opponent of ['dyrex', 'lefeu']) if (!this.profile.fights[opponent].wins) this.recordFight({ opponent, winner: 'player' });
          for (const destination of ['cuba', 'mexico']) {
            const opponent = TRAVEL_DESTINATIONS[destination].opponent;
            if (!this.profile.fights[opponent].wins) { this._testTrip(destination); this.recordFight({ opponent, winner: 'player' }); this.leaveTravel(destination); }
          }
          this._testMoney();
        }
        this.startTournament(target);
      } else {
        if (target === 'louisto') this._testTrip('cuba');
        else if (target === 'danielo') this._testTrip('mexico');
        else this.setLocation({ scene: 'neighborhood', x: 1900, y: 562, facing: 'down' });
      }
    }
    this._save();
    return this._result(true, `Profil de test prêt · ${argument}. Tapez retour dans le terminal pour retrouver votre carrière.`,
      { ...this.testStatus(), location: { ...this.profile.location }, ...(command === 'combat' ? { opponent: target } : {}) });
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
export { STORAGE_KEY as CAREER_STORAGE_KEY, BACKUP_KEY as CAREER_BACKUP_KEY, VERSION as CAREER_VERSION, TEST_STORAGE_KEY as CAREER_TEST_STORAGE_KEY, TEST_COMMANDS };
