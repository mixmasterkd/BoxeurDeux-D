// Destinations share an unlock; neither trip requires the other.
export const LEGACY_NEXT_FIGHT_IDS = Object.freeze(['dyrex', 'lefeu', 'louisto']);
export const NEXT_FIGHT_IDS = Object.freeze([...LEGACY_NEXT_FIGHT_IDS, 'danielo']);
export const CUBA_PRICE = 160;
export const MEXICO_PRICE = 160;
export const CUBA_HOME_SPAWN = Object.freeze({ scene: 'cuba-home', x: 640, y: 540, facing: 'down' });
export const MEXICO_HOME_SPAWN = Object.freeze({ scene: 'mexico-home', x: 640, y: 540, facing: 'down' });
export const AIRPORT_SPAWN = Object.freeze({ scene: 'airport', x: 640, y: 570, facing: 'down' });
export const CUBA_RETURN_SPAWN = AIRPORT_SPAWN;
export const CUBA_PLACES = Object.freeze(['cuba-village', 'cuba-home', 'cuba-gym', 'cuba-beach']);
export const MEXICO_PLACES = Object.freeze(['mexico-village', 'mexico-home', 'mexico-gym', 'mexico-beach', 'mexico-arena']);
export const TRAVEL_DESTINATIONS = Object.freeze({
  cuba: Object.freeze({ id: 'cuba', label: 'Cuba', price: CUBA_PRICE, home: CUBA_HOME_SPAWN, opponent: 'louisto' }),
  mexico: Object.freeze({ id: 'mexico', label: 'Mexique', price: MEXICO_PRICE, home: MEXICO_HOME_SPAWN, opponent: 'danielo' }),
});
export const freshTravel = () => ({ entries: 0, nextId: 1, reserved: null, active: null, history: [] });
export function postBronzeUnlocked(profile) {
  return Boolean(profile?.tournament?.history?.some(run => (run.tier ?? 'bronze') === 'bronze' && ['champion', 'eliminated'].includes(run.status)));
}
export function freshNextChapter() {
  return { techniques: { doubleJab: false }, cuba: freshTravel(), mexico: freshTravel() };
}
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => counter(value) && value > 0;
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
function cleanStay(raw, dailyDay, archived, destination) {
  const price = TRAVEL_DESTINATIONS[destination].price;
  requireValue(object(raw) && positive(raw.id) && positive(raw.startedAtDay)
    && raw.startedAtDay <= dailyDay && raw.fee === price, 'La réservation de voyage est invalide.');
  if (archived) requireValue(positive(raw.returnedAtDay) && raw.returnedAtDay >= raw.startedAtDay
    && raw.returnedAtDay <= dailyDay, 'Le retour de voyage est invalide.');
  return { id: raw.id, startedAtDay: raw.startedAtDay, fee: price,
    ...(archived ? { returnedAtDay: raw.returnedAtDay } : {}) };
}
export function normalizeNextChapter(raw, profile) {
  requireValue(object(raw.techniques) && typeof raw.techniques.doubleJab === 'boolean', 'Les techniques de cette sauvegarde sont invalides.');
  const out = { techniques: { doubleJab: raw.techniques.doubleJab } };
  for (const destination of Object.keys(TRAVEL_DESTINATIONS)) {
    if (raw.version < 5 && destination === 'mexico') { out.mexico = freshTravel(); continue; }
    const travel = raw[destination], reservedRaw = raw.version < 5 ? null : travel?.reserved;
    requireValue(object(travel) && counter(travel.entries) && travel.entries < Number.MAX_SAFE_INTEGER
      && travel.nextId === travel.entries + 1 && Array.isArray(travel.history)
      && travel.entries === travel.history.length + (travel.active === null ? 0 : 1) + (reservedRaw === null ? 0 : 1), 'L’historique des voyages est invalide.');
    const history = travel.history.map(stay => cleanStay(stay, profile.daily.day, true, destination));
    const active = travel.active === null ? null : cleanStay(travel.active, profile.daily.day, false, destination);
    const reserved = reservedRaw === null ? null : cleanStay(reservedRaw, profile.daily.day, false, destination);
    const stays = [...history, ...(active ? [active] : []), ...(reserved ? [reserved] : [])];
    requireValue(!active || !reserved, 'Un séjour et sa réservation ne peuvent pas être actifs ensemble.');
    requireValue(stays.every((stay, index) => stay.id === index + 1), 'Les numéros des voyages sont incohérents.');
    out[destination] = { entries: travel.entries, nextId: travel.nextId, reserved, active, history };
  }
  const activeCount = Number(Boolean(out.cuba.active)) + Number(Boolean(out.mexico.active));
  requireValue(activeCount <= 1 && (!activeCount || !profile.delivery.active && !profile.tournament.active), 'Les voyages de cette sauvegarde se chevauchent.');
  requireValue((!out.cuba.entries && !out.mexico.entries && !raw.techniques.doubleJab && NEXT_FIGHT_IDS.every(id => !profile.fights[id].attempts))
    || postBronzeUnlocked(profile), 'Le chapitre après les Gants de bronze n’est pas débloqué.');
  return out;
}
