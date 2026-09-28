import { normalizeCasinoSeed, randomInteger } from './CasinoRandom.js';

function machine(id, name, theme, entries) {
  const outcomes = entries.map(([payout, weight, symbols]) => Object.freeze({ payout, weight, symbols: Object.freeze(symbols) }));
  const totalWeight = outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
  return Object.freeze({ id, name, theme, bet: 1, totalWeight,
    rtp: outcomes.reduce((sum, outcome) => sum + outcome.payout * outcome.weight, 0) / totalWeight,
    maxPayout: Math.max(...outcomes.map(outcome => outcome.payout)), outcomes: Object.freeze(outcomes) });
}
export const SLOT_MACHINES = Object.freeze([
  machine('cerises', 'Les Cerises', 'cherry', [
    [0, 6200, ['citron', 'cerise', 'cloche']], [1, 1900, ['cerise', 'citron', 'citron']],
    [2, 1200, ['cerise', 'cerise', 'citron']], [5, 500, ['cerise', 'cerise', 'cerise']],
    [10, 180, ['cloche', 'cloche', 'cloche']], [25, 20, ['sept', 'sept', 'sept']],
  ]),
  machine('cloches', 'Les Cloches', 'bell', [
    [0, 7250, ['cloche', 'citron', 'cerise']], [1, 1400, ['citron', 'citron', 'cloche']],
    [3, 1000, ['cerise', 'cerise', 'cerise']], [8, 250, ['cloche', 'cloche', 'cloche']],
    [20, 90, ['diamant', 'diamant', 'diamant']], [40, 10, ['sept', 'sept', 'sept']],
  ]),
  machine('diamants', 'Les Diamants', 'diamond', [
    [0, 7800, ['diamant', 'cerise', 'cloche']], [1, 1100, ['cerise', 'cerise', 'cloche']],
    [5, 800, ['cloche', 'cloche', 'cloche']], [10, 240, ['diamant', 'diamant', 'cloche']],
    [25, 50, ['diamant', 'diamant', 'diamant']], [50, 10, ['sept', 'sept', 'sept']],
  ]),
  machine('montreal', 'Nuit de Montréal', 'city', [
    [0, 6700, ['metro', 'etoile', 'lune']], [1, 1800, ['metro', 'metro', 'lune']],
    [2, 1000, ['metro', 'metro', 'metro']], [8, 400, ['lune', 'lune', 'lune']],
    [15, 80, ['etoile', 'etoile', 'etoile']], [30, 20, ['sept', 'sept', 'sept']],
  ]),
]);
export const SLOTS_RULES = 'Un tour coûte 1 $. Les lots affichés incluent le retour de la mise. Chaque tour est indépendant. Les combinaisons sont tirées selon leurs probabilités affichées; les rouleaux illustrent le résultat. Aucun lot n’est garanti.';
export function getSlotMachine(id = 'cerises') {
  const selected = SLOT_MACHINES.find(item => item.id === id);
  if (!selected) throw new RangeError('Machine inconnue.');
  return selected;
}
export function slotOutcomeAt(machineId, ticket) {
  const selected = getSlotMachine(machineId);
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= selected.totalWeight) throw new RangeError('Tirage invalide.');
  let cumulative = 0;
  for (const outcome of selected.outcomes) {
    cumulative += outcome.weight;
    if (ticket < cumulative) return { payout: outcome.payout, symbols: [...outcome.symbols], weight: outcome.weight };
  }
  throw new Error('Table de lots incomplète.');
}
export function slotsMaximumExposure(machineId = 'cerises') {
  return { maxStake: 1, maxNetWin: getSlotMachine(machineId).maxPayout - 1 };
}
export function createSlotsGame({ machineId = 'cerises', seed = 1 } = {}) {
  const selected = getSlotMachine(machineId), draw = randomInteger(seed, selected.totalWeight);
  const outcome = slotOutcomeAt(machineId, draw.value);
  return { kind: 'slots', version: 1, status: 'complete', seed: draw.seed, initialSeed: normalizeCasinoSeed(seed), machineId,
    symbols: outcome.symbols, totalBet: 1, payout: outcome.payout, profit: outcome.payout - 1 };
}

export function validateSlotsGame(game) {
  try {
    if (!game || game.kind !== 'slots') return false;
    return JSON.stringify(game) === JSON.stringify(createSlotsGame({ machineId: game.machineId, seed: game.initialSeed }));
  } catch { return false; }
}
