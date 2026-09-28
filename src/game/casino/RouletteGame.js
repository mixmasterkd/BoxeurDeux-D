import { normalizeCasinoSeed, randomInteger } from './CasinoRandom.js';

export const ROULETTE_RED = Object.freeze([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const ROULETTE_RULES = 'Roulette européenne : 37 cases, de 0 à 36. Jeton de 1 $, maximum 5 $ par tour. Numéro : gain 35:1; rouge/noir ou pair/impair : 1:1; douzaine ou colonne : 2:1. Le zéro fait perdre toutes les mises extérieures. Chaque case a une chance sur 37.';
export function rouletteColor(number) { return number === 0 ? 'green' : ROULETTE_RED.includes(number) ? 'red' : 'black'; }

export function validateRouletteBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) throw new RangeError('Place au moins un jeton.');
  const clean = bets.map(({ type, value, amount = 1 }) => {
    const valid = type === 'number' ? Number.isInteger(value) && value >= 0 && value <= 36
      : type === 'color' ? ['red', 'black'].includes(value)
        : type === 'parity' ? ['even', 'odd'].includes(value)
          : ['dozen', 'column'].includes(type) && Number.isInteger(value) && value >= 1 && value <= 3;
    if (!valid || !Number.isInteger(amount) || amount < 1 || amount > 5) throw new RangeError('Mise de roulette invalide.');
    return { type, value, amount };
  });
  if (clean.reduce((sum, bet) => sum + bet.amount, 0) > 5) throw new RangeError('Maximum 5 $ par tour.');
  return clean;
}
function payoutForBets(bets, number) {
  return bets.reduce((total, { type, value, amount }) => {
    const won = type === 'number' ? number === value
      : number === 0 ? false
        : type === 'color' ? rouletteColor(number) === value
          : type === 'parity' ? (number % 2 === 0 ? 'even' : 'odd') === value
            : type === 'dozen' ? Math.ceil(number / 12) === value : ((number - 1) % 3) + 1 === value;
    return total + (won ? amount * (type === 'number' ? 36 : ['dozen', 'column'].includes(type) ? 3 : 2) : 0);
  }, 0);
}
export function roulettePayout(bets, number) {
  if (!Number.isInteger(number) || number < 0 || number > 36) throw new RangeError('Case invalide.');
  return payoutForBets(validateRouletteBets(bets), number);
}
export function rouletteMaximumExposure(bets) {
  const valid = validateRouletteBets(bets), total = valid.reduce((sum, bet) => sum + bet.amount, 0);
  return { maxStake: total, maxNetWin: Math.max(...Array.from({ length: 37 }, (_, number) => payoutForBets(valid, number))) - total };
}
export function createRouletteGame({ bets = [{ type: 'color', value: 'red', amount: 1 }], seed = 1 } = {}) {
  const valid = validateRouletteBets(bets), draw = randomInteger(seed, 37);
  const totalBet = valid.reduce((sum, bet) => sum + bet.amount, 0), payout = payoutForBets(valid, draw.value);
  return { kind: 'roulette', version: 1, status: 'complete', seed: draw.seed, initialSeed: normalizeCasinoSeed(seed), bets: valid,
    number: draw.value, color: rouletteColor(draw.value), totalBet, payout, profit: payout - totalBet };
}

export function validateRouletteGame(game) {
  try {
    if (!game || game.kind !== 'roulette') return false;
    return JSON.stringify(game) === JSON.stringify(createRouletteGame({ bets: game.bets, seed: game.initialSeed }));
  } catch { return false; }
}
