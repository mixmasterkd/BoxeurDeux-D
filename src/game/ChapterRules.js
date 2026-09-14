// The economy and tournament are local, deterministic game rules, with no service dependency.
import { NEXT_FIGHT_IDS } from './NextChapterRules.js';
export const BASE_STATS = Object.freeze({ power: 0, recovery: 1, endurance: 100, resistance: 100 });
export const TRAINING_TIERS = Object.freeze([
  Object.freeze({ power: 5, recovery: 1.10, endurance: 110, resistance: 108 }),
  Object.freeze({ power: 7, recovery: 1.14, endurance: 116, resistance: 114 }),
  Object.freeze({ power: 10, recovery: 1.20, endurance: 124, resistance: 122 }),
]);
export const SHOP_CATALOG = Object.freeze([
  { id: 'street-black', shop: 'clothing', slot: 'street', label: 'Survêtement noir', price: 0, color: 0x252c38, accent: 0xf1ede2 },
  { id: 'street-blue', shop: 'clothing', slot: 'street', label: 'Survêtement bleu roi', price: 28, color: 0x315ba7, accent: 0xf1ede2 },
  { id: 'street-burgundy', shop: 'clothing', slot: 'street', label: 'Survêtement bordeaux', price: 36, color: 0x873b52, accent: 0xf0d09c },
  { id: 'street-octopus', shop: 'clothing', slot: 'street', label: 'Chandail The Octopus · Poulin', price: 45, color: 0x252c38, accent: 0xf1ede2 },
  { id: 'boxing-blue', shop: 'boxing', slot: 'boxing', label: 'Ensemble bleu du gym', price: 0, color: 0x3776b9, accent: 0xf1ede2 },
  { id: 'boxing-emerald', shop: 'boxing', slot: 'boxing', label: 'Ensemble émeraude · gants assortis', price: 32, color: 0x2e826c, accent: 0xf1ede2 },
  { id: 'boxing-burgundy', shop: 'boxing', slot: 'boxing', label: 'Ensemble bordeaux et or · gants assortis', price: 48, color: 0x873b52, accent: 0xe5b654 },
].map(item => Object.freeze(item)));
export const DEFAULT_INVENTORY = Object.freeze({ street: 'street-black', boxing: 'boxing-blue' });
export const TOURNAMENT_OPPONENTS = Object.freeze(['bellini', 'fortin', 'gagnon']);
export const LEGACY_FIGHT_IDS = Object.freeze(['beton', 'kramer', ...TOURNAMENT_OPPONENTS]);
export const GOLD_TOURNAMENT_OPPONENTS = Object.freeze(['gold-rios', 'gold-moreau', 'gold-santos']);
export const V4_FIGHT_IDS = Object.freeze([...LEGACY_FIGHT_IDS, 'dyrex', 'lefeu', 'louisto']);
export const FIGHT_IDS = Object.freeze([...LEGACY_FIGHT_IDS, ...NEXT_FIGHT_IDS, ...GOLD_TOURNAMENT_OPPONENTS]);
export const TOURNAMENT_PARTICIPANTS = Object.freeze([
  { id: 'player', name: 'La Tuque rouge', seed: 1 },
  { id: 'bellini', name: 'Marco Bellini', seed: 2 },
  { id: 'fortin', name: 'Louis « Le Roc » Fortin', seed: 3 },
  { id: 'bouchard', name: 'Émile Bouchard', seed: 4 },
  { id: 'gagnon', name: 'André « Le Patron » Gagnon', seed: 5 },
  { id: 'roy', name: 'Maxime Roy', seed: 6 },
  { id: 'nguyen', name: 'Alex Nguyen', seed: 7 },
  { id: 'santos', name: 'David Santos', seed: 8 },
].map(participant => Object.freeze(participant)));
export const GOLD_TOURNAMENT_PARTICIPANTS = Object.freeze([
  { id: 'player', name: 'La Tuque rouge', seed: 1 },
  { id: 'gold-rios', name: 'Rafael Ríos', seed: 2 },
  { id: 'gold-moreau', name: 'Émile Moreau', seed: 3 },
  { id: 'gold-chen', name: 'Julien Chen', seed: 4 },
  { id: 'gold-santos', name: 'Thiago Santos', seed: 5 },
  { id: 'gold-dupuis', name: 'Alexis Dupuis', seed: 6 },
  { id: 'gold-belanger', name: 'Marc Bélanger', seed: 7 },
  { id: 'gold-ali', name: 'Nassim Ali', seed: 8 },
].map(participant => Object.freeze(participant)));
export const GOLD_TOURNAMENT_FEE = 240;
export const TOURNAMENT_TIERS = Object.freeze(['bronze', 'gold']);
export const tournamentOpponents = (tier = 'bronze') => tier === 'gold' ? GOLD_TOURNAMENT_OPPONENTS : TOURNAMENT_OPPONENTS;
export const tournamentLabel = (tier = 'bronze') => tier === 'gold' ? 'Gants dorés' : 'Gants de bronze';
export const goldTournamentUnlocked = profile => Boolean(profile?.tournament?.history?.some(run => (run.tier ?? 'bronze') === 'bronze' && ['champion', 'eliminated'].includes(run.status))
  && ['dyrex', 'lefeu', 'louisto', 'danielo'].every(id => profile?.fights?.[id]?.wins > 0));
export const TOURNAMENT_ROUNDS = Object.freeze(['Quart de finale', 'Demi-finale', 'Finale']);
export const TOURNAMENT_FEES = Object.freeze({ first: 120, retry: 60 });
export const MEDAL_LABELS = Object.freeze({ gold: 'Médaille d’or', silver: 'Médaille d’argent', bronze: 'Médaille de bronze', participation: 'Souvenir de participation' });
export const HOTEL_ROOM_SPAWN = Object.freeze({ scene: 'hotel-room', x: 640, y: 540, facing: 'down' });
export const TOURNAMENT_RETURN_SPAWN = Object.freeze({ scene: 'neighborhood', x: 1900, y: 562, facing: 'down' });
export const DELIVERY_STOPS = Object.freeze(['maison-12', 'depanneur-84', 'rue-nord-210']);
export const DELIVERY_PAY = 5;
export const DELIVERY_MAX_TIP = 2;
export const chapterTier = fights => fights.kramer?.wins > 0 ? 2 : fights.beton?.wins > 0 ? 1 : 0;
export const trainingCaps = fights => ({ ...TRAINING_TIERS[chapterTier(fights)] });
export const moneyCap = fights => [200, 350, 500][chapterTier(fights)];
export const freshFight = () => ({ wins: 0, losses: 0, draws: 0, attempts: 0, bestScore: null });
export function freshChapter() {
  return {
    wallet: { money: 0, totalEarned: 0 },
    inventory: { owned: Object.values(DEFAULT_INVENTORY), equipped: { ...DEFAULT_INVENTORY } },
    delivery: { nextId: 1, active: null, completedTours: 0 },
    tournament: { entries: 0, nextId: 1, active: null, history: [], medals: [] },
    fightReceipts: [],
  };
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 120 && /^[\p{L}\p{N}_: .-]+$/u.test(value);
const validScore = score => score === null || typeof score === 'number' && Number.isFinite(score) && score >= 0;
const clone = value => JSON.parse(JSON.stringify(value));
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export function cleanFight(fight) {
  requireValue(object(fight) && ['wins', 'losses', 'draws', 'attempts'].every(key => counter(fight[key]))
    && fight.attempts === fight.wins + fight.losses + fight.draws && validScore(fight.bestScore), 'L’historique des combats est invalide.');
  return { wins: fight.wins, losses: fight.losses, draws: fight.draws, attempts: fight.attempts, bestScore: fight.bestScore };
}
export function validDeliveryStops(stops) {
  return Array.isArray(stops) && stops.length === 3 && stops.every(id) && new Set(stops).size === stops.length;
}
function cleanTournamentRun(run, archived = false) {
  const tier = run?.tier ?? 'bronze';
  requireValue(TOURNAMENT_TIERS.includes(tier), 'Le niveau du tournoi est invalide.');
  const opponents = tournamentOpponents(tier);
  requireValue(object(run) && counter(run.id) && run.id > 0 && [1, 2, 3].includes(run.day)
    && ['ready', 'awaiting-sleep', 'eliminated', 'champion', ...(archived ? ['forfeited'] : [])].includes(run.status)
    && Array.isArray(run.results) && run.results.length <= 3 && (run.medal === null || Object.hasOwn(MEDAL_LABELS, run.medal)),
  'Le séjour au tournoi est invalide.');
  const results = run.results.map((result, index) => {
    requireValue(object(result) && result.day === index + 1 && result.opponent === opponents[index]
      && result.matchId === `${run.id}:${result.day}` && ['player', 'remi', 'draw'].includes(result.winner)
      && validScore(result.score) && (index === run.results.length - 1 || result.winner === 'player'), 'Le tableau du tournoi est invalide.');
    return { day: result.day, opponent: result.opponent, matchId: result.matchId, winner: result.winner, score: result.score };
  });
  const last = results.at(-1);
  const consistent = run.status === 'ready' ? results.length === run.day - 1 && results.every(r => r.winner === 'player') && run.medal === null
    : run.status === 'awaiting-sleep' ? run.day < 3 && results.length === run.day && results.every(r => r.winner === 'player') && run.medal === null
      : run.status === 'champion' ? run.day === 3 && results.length === 3 && results.every(r => r.winner === 'player') && run.medal === 'gold'
        : run.status === 'eliminated' ? results.length === run.day && last?.winner !== 'player' && run.medal === ['participation', 'bronze', 'silver'][run.day - 1]
          : results.length <= run.day && results.every(r => r.winner === 'player') && run.medal === null;
  requireValue(consistent, 'Le résultat et le jour du tournoi ne concordent pas.');
  if (archived) requireValue(['eliminated', 'champion', 'forfeited'].includes(run.status) && counter(run.returnedAtDay) && run.returnedAtDay > 0, 'Le séjour terminé est invalide.');
  return { id: run.id, day: run.day, status: run.status, results, medal: run.medal, ...(run.tier || tier === 'gold' ? { tier } : {}), ...(archived ? { returnedAtDay: run.returnedAtDay } : {}) };
}

export function normalizeChapter(raw, fights) {
  const out = freshChapter();
  requireValue(object(raw.wallet) && counter(raw.wallet.money) && counter(raw.wallet.totalEarned)
    && raw.wallet.money <= moneyCap(fights) && raw.wallet.totalEarned >= raw.wallet.money, 'Le portefeuille de cette sauvegarde est invalide.');
  out.wallet = { money: raw.wallet.money, totalEarned: raw.wallet.totalEarned };
  const inventory = raw.inventory;
  requireValue(object(inventory) && Array.isArray(inventory.owned) && object(inventory.equipped)
    && inventory.owned.every(value => SHOP_CATALOG.some(item => item.id === value))
    && new Set(inventory.owned).size === inventory.owned.length
    && Object.values(DEFAULT_INVENTORY).every(value => inventory.owned.includes(value)), 'L’inventaire de cette sauvegarde est invalide.');
  for (const slot of Object.keys(DEFAULT_INVENTORY)) requireValue(inventory.owned.includes(inventory.equipped[slot])
    && SHOP_CATALOG.some(item => item.id === inventory.equipped[slot] && item.slot === slot), 'La tenue équipée est invalide.');
  out.inventory = { owned: [...inventory.owned], equipped: { street: inventory.equipped.street, boxing: inventory.equipped.boxing } };
  const delivery = raw.delivery;
  requireValue(object(delivery) && counter(delivery.nextId) && delivery.nextId > 0 && counter(delivery.completedTours)
    && delivery.completedTours < delivery.nextId && (delivery.active === null || object(delivery.active)), 'L’historique des livraisons est invalide.');
  if (delivery.active) {
    const active = delivery.active;
    requireValue(counter(active.id) && active.id > 0 && active.id < delivery.nextId && validDeliveryStops(active.stops)
      && Array.isArray(active.completed) && active.completed.length < 3 && active.completed.every((value, index) => value === active.stops[index])
      && counter(active.earned) && active.earned <= active.completed.length * (DELIVERY_PAY + DELIVERY_MAX_TIP), 'La tournée en cours est invalide.');
    // Early v3 saves did not retain per-parcel timing. Missing fields are zero;
    // present malformed fields still invalidate an import before any mutation.
    const elapsed = active.elapsed === undefined ? 0 : active.elapsed;
    const bumps = active.bumps === undefined ? 0 : active.bumps;
    requireValue(typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed >= 0
      && elapsed <= Number.MAX_SAFE_INTEGER && counter(bumps), 'Le suivi de la livraison est invalide.');
    out.delivery.active = { id: active.id, stops: [...active.stops], completed: [...active.completed], earned: active.earned, elapsed, bumps };
  }
  out.delivery.nextId = delivery.nextId; out.delivery.completedTours = delivery.completedTours;
  const tournament = raw.tournament;
  requireValue(object(tournament) && counter(tournament.entries) && tournament.entries < Number.MAX_SAFE_INTEGER
    && tournament.nextId === tournament.entries + 1 && Array.isArray(tournament.history)
    && tournament.entries === tournament.history.length + (tournament.active === null ? 0 : 1)
    && Array.isArray(tournament.medals), 'L’historique du tournoi est invalide.');
  const history = tournament.history.map(run => cleanTournamentRun(run, true));
  const active = tournament.active === null ? null : cleanTournamentRun(tournament.active);
  const runs = [...history, ...(active ? [active] : [])];
  requireValue(new Set(runs.map(run => run.id)).size === runs.length && runs.every(run => run.id <= tournament.entries)
    && (!active || fights.kramer.wins > 0) && !(active && out.delivery.active)
    && runs.filter(run => run.tier === 'gold').every(() => goldTournamentUnlocked({ fights, tournament: { history } })), 'Les séjours de cette sauvegarde sont incohérents.');
  const earnedMedals = runs.filter(run => run.medal);
  requireValue(tournament.medals.length === earnedMedals.length && tournament.medals.every(medal => object(medal)
    && earnedMedals.some(run => run.id === medal.tournamentId && run.medal === medal.type && (run.tier ?? 'bronze') === (medal.tier ?? 'bronze')) && counter(medal.day) && medal.day > 0)
    && new Set(tournament.medals.map(medal => medal.tournamentId)).size === tournament.medals.length, 'La collection de médailles est invalide.');
  out.tournament = { entries: tournament.entries, nextId: tournament.nextId, active, history,
    medals: tournament.medals.map(medal => ({ tournamentId: medal.tournamentId, type: medal.type, day: medal.day, ...(medal.tier ? { tier: medal.tier } : {}) })) };
  requireValue(Array.isArray(raw.fightReceipts) && raw.fightReceipts.length <= 10000 && raw.fightReceipts.every(id)
    && new Set(raw.fightReceipts).size === raw.fightReceipts.length, 'Les résultats enregistrés sont invalides.');
  out.fightReceipts = clone(raw.fightReceipts);
  return out;
}
