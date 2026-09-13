// The three post-Bronze challenges share an unlock, never a mandatory order.
export const NEXT_FIGHT_IDS = Object.freeze(['dyrex', 'lefeu', 'louisto']);
export const CUBA_PRICE = 160;
export const CUBA_HOME_SPAWN = Object.freeze({ scene: 'cuba-home', x: 640, y: 540, facing: 'down' });
export const CUBA_RETURN_SPAWN = Object.freeze({ scene: 'riverside', x: 1520, y: 760, facing: 'down' });
export const CUBA_PLACES = Object.freeze(['cuba-village', 'cuba-home', 'cuba-gym', 'cuba-beach']);

export function postBronzeUnlocked(profile) {
  return Boolean(profile?.tournament?.history?.some(run => ['champion', 'eliminated'].includes(run.status)));
}

export function freshNextChapter() {
  return { techniques: { doubleJab: false }, cuba: { entries: 0, nextId: 1, active: null, history: [] } };
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => counter(value) && value > 0;
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };

function cleanStay(raw, dailyDay, archived) {
  requireValue(object(raw) && positive(raw.id) && positive(raw.startedAtDay)
    && raw.startedAtDay <= dailyDay && raw.fee === CUBA_PRICE, 'Le séjour à Cuba est invalide.');
  if (archived) requireValue(positive(raw.returnedAtDay) && raw.returnedAtDay >= raw.startedAtDay
    && raw.returnedAtDay <= dailyDay, 'Le retour de Cuba est invalide.');
  return { id: raw.id, startedAtDay: raw.startedAtDay, fee: CUBA_PRICE,
    ...(archived ? { returnedAtDay: raw.returnedAtDay } : {}) };
}

export function normalizeNextChapter(raw, profile) {
  requireValue(object(raw.techniques) && typeof raw.techniques.doubleJab === 'boolean', 'Les techniques de cette sauvegarde sont invalides.');
  const cuba = raw.cuba;
  requireValue(object(cuba) && counter(cuba.entries) && cuba.entries < Number.MAX_SAFE_INTEGER
    && cuba.nextId === cuba.entries + 1 && Array.isArray(cuba.history)
    && cuba.entries === cuba.history.length + (cuba.active === null ? 0 : 1), 'L’historique de Cuba est invalide.');
  const history = cuba.history.map(stay => cleanStay(stay, profile.daily.day, true));
  const active = cuba.active === null ? null : cleanStay(cuba.active, profile.daily.day, false);
  const stays = [...history, ...(active ? [active] : [])];
  requireValue(stays.every((stay, index) => stay.id === index + 1)
    && (!active || !profile.delivery.active && !profile.tournament.active), 'Les voyages de cette sauvegarde se chevauchent.');
  requireValue((!cuba.entries && !raw.techniques.doubleJab && NEXT_FIGHT_IDS.every(id => !profile.fights[id].attempts))
    || postBronzeUnlocked(profile), 'Le chapitre après les Gants de bronze n’est pas débloqué.');
  return { techniques: { doubleJab: raw.techniques.doubleJab }, cuba: { entries: cuba.entries, nextId: cuba.nextId, active, history } };
}
