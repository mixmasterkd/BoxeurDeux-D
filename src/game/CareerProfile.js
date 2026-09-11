const STORAGE_KEY = 'boxeur-deux-d-career-v1';
const BACKUP_KEY = `${STORAGE_KEY}-backup`;
const CORRUPT_KEY = `${STORAGE_KEY}-corrupt`;
const VERSION = 1;
const ACTIVITIES = ['bag', 'speedball', 'rope', 'sparring', 'shadow'];
// This is the Béton tier. A file cannot raise its own training ceilings.
const CAPS = Object.freeze({ power: 5, recovery: 1.10, endurance: 110, resistance: 108 });
const BASE_STATS = Object.freeze({ power: 0, recovery: 1, endurance: 100, resistance: 100 });
const clone = value => JSON.parse(JSON.stringify(value));
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));

function freshProfile(now = new Date().toISOString()) {
  return {
    version: VERSION, revision: 0, createdAt: now, updatedAt: now,
    stats: { ...BASE_STATS }, caps: { ...CAPS },
    activities: Object.fromEntries(ACTIVITIES.map(id => [id, { sessions: 0, best: 0 }])),
    fights: { beton: { wins: 0, losses: 0, draws: 0, attempts: 0, bestScore: null } },
  };
}

function normalize(raw) {
  if (!object(raw) || raw.version !== VERSION) {
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
  for (const stat of Object.keys(BASE_STATS)) {
    const value = raw.stats[stat];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < BASE_STATS[stat]
      || typeof raw.caps[stat] !== 'number' || !Number.isFinite(raw.caps[stat])) {
      throw new Error('Les capacités de cette sauvegarde sont invalides.');
    }
    profile.stats[stat] = Number(Math.min(CAPS[stat], value).toFixed(2));
  }
  for (const id of ACTIVITIES) {
    const activity = raw.activities[id];
    if (!object(activity) || !counter(activity.sessions) || typeof activity.best !== 'number'
      || !Number.isFinite(activity.best) || activity.best < 0) {
      throw new Error('L’historique des entraînements est invalide.');
    }
    profile.activities[id] = { sessions: activity.sessions, best: activity.best };
  }
  const fight = raw.fights.beton;
  if (!object(fight) || !['wins', 'losses', 'draws', 'attempts'].every(key => counter(fight[key]))
    || fight.attempts !== fight.wins + fight.losses + fight.draws
    || !(fight.bestScore === null || typeof fight.bestScore === 'number' && Number.isFinite(fight.bestScore) && fight.bestScore >= 0)) {
    throw new Error('L’historique des combats est invalide.');
  }
  profile.fights.beton = { wins: fight.wins, losses: fight.losses, draws: fight.draws,
    attempts: fight.attempts, bestScore: fight.bestScore };
  return profile;
}

function parse(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('Fichier de sauvegarde invalide ou trop volumineux.');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Ce fichier ne contient pas une sauvegarde JSON valide.'); }
  return normalize(value);
}

const POLICIES = {
  bag: { stat: 'power', amount: 1, metric: m => finite(m.accuracy ?? m.precision), minimum: 50, volume: m => finite(m.contacts) >= 6, label: 'Puissance' },
  speedball: { stat: 'recovery', amount: .02, metric: m => finite(m.accuracy ?? m.precision), minimum: 60, volume: m => finite(m.hits) >= 20 && m.qualified !== false, label: 'Récupération' },
  rope: { stat: 'endurance', amount: 2, metric: m => finite(m.accuracy ?? m.precision), minimum: 60, volume: m => finite(m.hits) >= 20 && m.qualified !== false, label: 'Endurance max' },
  sparring: { stat: 'resistance', amount: 2, metric: m => finite(m.rounds), minimum: 1, volume: m => m.completed === true && finite(m.actions) >= 10, label: 'Résistance' },
};

export class CareerProfile {
  constructor(options = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.storage = null; this.lastPersisted = null; this.backupAvailable = false;
    this.status = { state: 'new', persisted: false, message: 'La progression sera enregistrée après une séance terminée.' };
    // Accessing localStorage itself can throw in a blocked browser context.
    try { this.storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage; }
    catch { this._unavailable(); }
    this.profile = this._load();
  }

  _unavailable() {
    this.status = { state: 'unavailable', persisted: false,
      message: 'Sauvegarde locale indisponible. Les acquis restent dans cette session : exportez votre partie pour les conserver.' };
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
        const profile = parse(primary); this.lastPersisted = JSON.stringify(profile);
        this.status = { state: 'saved', persisted: true, message: `Sauvegarde locale · révision ${profile.revision}` };
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
      catch { this.status.message += ' Exportez-la : le stockage est actuellement bloqué.'; }
      return backupProfile;
    }
    if (primary || backup) this.status = { state: 'invalid', persisted: false,
      message: 'La sauvegarde est illisible. Une nouvelle session est ouverte; vous pouvez importer une copie valide.' };
    return freshProfile(this.now());
  }

  snapshot() { return clone(this.profile); }
  saveStatus() { return { ...this.status, revision: this.profile.revision, backupAvailable: this.backupAvailable }; }
  hasProgress() { return this.profile.revision > 0; }
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
      const before = this.profile.stats[policy.stat], cap = CAPS[policy.stat];
      const after = Number((qualified ? Math.min(cap, before + policy.amount) : before).toFixed(2));
      this.profile.stats[policy.stat] = after;
      reward = { activity, qualified, gained: Number((after - before).toFixed(2)), capped: after >= cap,
        stat: policy.stat, label: policy.label, value: after, cap, score };
    }
    this._save();
    return { ...reward, saved: this.status.persisted, saveMessage: this.status.message };
  }

  recordFight(result = {}) {
    if (!['player', 'remi', 'draw'].includes(result.winner)) throw new Error('Le résultat du combat est incomplet.');
    const fight = this.profile.fights.beton; fight.attempts += 1;
    if (result.winner === 'player') fight.wins += 1;
    else if (result.winner === 'remi') fight.losses += 1;
    else fight.draws += 1;
    if (Number.isFinite(result.score) && result.score >= 0) fight.bestScore = Math.max(fight.bestScore ?? 0, result.score);
    return this._save();
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
export { STORAGE_KEY as CAREER_STORAGE_KEY, BACKUP_KEY as CAREER_BACKUP_KEY };
