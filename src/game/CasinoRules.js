// All balances are game dollars. Half-dollars preserve a natural blackjack's 3:2 payout.
import {postBronzeUnlocked} from './NextChapterRules.js';

export const CASINO_PLACES = Object.freeze(['casino-lobby', 'casino-tables', 'casino-poker']);
export const CASINO_CAP = 1000;
export const validCasinoMoney = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && Number.isSafeInteger(n * 2);
export const freshCasino = () => ({chips: 0, nextId: 1, rounds: 0, won: 0, wagered: 0, active: null});
export const casinoUnlocked = profile => postBronzeUnlocked(profile);
export const formatCasinoMoney = n => `${Number(n).toLocaleString('fr-CA', {maximumFractionDigits: 2})} $`;
