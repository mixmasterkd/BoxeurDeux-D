import {moneyCap} from './ChapterRules.js';
import {freshCasino, casinoUnlocked, validCasinoMoney, CASINO_PLACES} from './CasinoRules.js';
import {createBlackjackGame, actBlackjack, blackjackMaximumExposure} from './casino/BlackjackGame.js';
import {createRouletteGame, rouletteMaximumExposure} from './casino/RouletteGame.js';
import {createSlotsGame, slotsMaximumExposure} from './casino/SlotsGame.js';
import {createPokerGame, actPoker, advancePokerBots} from './casino/PokerGame.js';

const copy = value => structuredClone(value);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const requireValue = (ok, message = 'La sauvegarde du casino est invalide.') => {if (!ok) throw new Error(message);};
const integer = n => Number.isSafeInteger(n) && n >= 0;
const canonical = v => JSON.stringify(v, (_, x) => object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const randomSeed = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] || 1;
const cap = p => moneyCap(p.fights, p.tournament);

function optionsFor(game, options, bankroll) {
  if (game === 'blackjack') return {bet: options.bet ?? 1, bankroll};
  if (game === 'roulette') return {bets: copy(options.bets ?? [{type: 'color', value: 'red', amount: 1}])};
  if (game === 'slots') return {machineId: options.machineId ?? 'cerises'};
  if (game === 'poker') return {buyIn: options.buyIn ?? 10, button: options.button ?? 0};
  throw new Error('Cette table n’existe pas.');
}
function exposure(game, options) {
  if (game === 'blackjack') return blackjackMaximumExposure(options.bet);
  if (game === 'roulette') return rouletteMaximumExposure(options.bets);
  if (game === 'slots') return slotsMaximumExposure(options.machineId);
  requireValue(game === 'poker' && [10, 20].includes(options.buyIn), 'La cave du poker est de 10 ou 20 $.');
  return {maxStake: options.buyIn, maxNetWin: 3 * options.buyIn};
}
function initial(game, options, seed) {
  return ({blackjack: createBlackjackGame, roulette: createRouletteGame, slots: createSlotsGame, poker: createPokerGame})[game]({...options, seed});
}
function next(game, state, action) {
  if (game === 'blackjack') return actBlackjack(state, action);
  if (game === 'poker') {
    requireValue(action === 'bot' ? state.turn !== 0 : state.turn === 0, 'Attends ton tour.');
    return action === 'bot' ? advancePokerBots(state) : actPoker(state, action);
  }
  throw new Error('Le tour est déjà terminé.');
}
const stakeOf = a => a.game === 'poker' ? a.options.buyIn : a.state.totalBet;
const payoutOf = a => a.game === 'poker' ? a.state.result?.payout : a.state.payout;

/** Rebuild pending deals from their initial seed and recorded legal actions.
 * Imported cards, balances or payouts are never trusted independently. */
export function normalizeCasino(raw, profile) {
  if (raw.version < 6) return freshCasino();
  const c = raw.casino;
  requireValue(object(c) && validCasinoMoney(c.chips) && integer(c.nextId) && c.nextId > 0
    && integer(c.rounds) && validCasinoMoney(c.won) && validCasinoMoney(c.wagered));
  const out = {chips: c.chips, nextId: c.nextId, rounds: c.rounds, won: c.won, wagered: c.wagered, active: null};
  if (c.active !== null) {
    const a = c.active;
    requireValue(object(a) && ['blackjack', 'roulette', 'slots', 'poker'].includes(a.game)
      && integer(a.id) && a.id === c.nextId - 1 && integer(a.seed) && a.seed > 0 && a.seed <= 0xffffffff
      && object(a.options) && Array.isArray(a.actions) && a.actions.length <= 500);
    const options = optionsFor(a.game, a.options, a.options.bankroll), risk = exposure(a.game, options);
    let state = initial(a.game, options, a.seed);
    for (const action of a.actions) state = next(a.game, state, action);
    requireValue(canonical(state) === canonical(a.state));
    requireValue(a.stake === stakeOf({game: a.game, options, state}) && a.maxNetWin === risk.maxNetWin
      && a.settled === (state.status === 'complete') && validCasinoMoney(a.stake));
    out.active = {id: a.id, game: a.game, seed: a.seed, options, actions: copy(a.actions), state, stake: a.stake,
      maxNetWin: risk.maxNetWin, settled: a.settled};
  }
  requireValue(c.nextId === c.rounds + 1 + (out.active && !out.active.settled ? 1 : 0));
  requireValue(profile.wallet.money + c.chips + (out.active && !out.active.settled ? out.active.stake + out.active.maxNetWin : 0) <= cap(profile));
  if (out.active?.game === 'blackjack' && !out.active.settled) requireValue(out.active.options.bankroll === c.chips + out.active.stake);
  requireValue((!c.rounds && !c.chips && !out.active && !c.wagered && !c.won) || casinoUnlocked(profile));
  if (out.active && !out.active.settled) requireValue(CASINO_PLACES.includes(profile.location.scene)
    && !profile.delivery.active && !profile.tournament.active && !profile.cuba.active && !profile.mexico.active
    && !['running', 'encounter'].includes(profile.marathon.active?.status));
  return out;
}

function settle(profile) {
  const c = profile.casino, a = c.active;
  if (a.state.status !== 'complete' || a.settled) return;
  const payout = payoutOf(a);
  requireValue(validCasinoMoney(payout) && payout <= a.stake + a.maxNetWin, 'Résultat de table incohérent.');
  requireValue(profile.wallet.money + c.chips + payout <= cap(profile), 'Le gain réservé dépasse le plafond.');
  c.chips += payout; c.rounds += 1; c.won += payout;
  profile.wallet.totalEarned += Math.max(0, payout - a.stake);
  a.settled = true;
}

export const casinoMethods = {
  casinoStatus() {
    const p = this.profile, unlocked = casinoUnlocked(p);
    const available = unlocked && !p.tournament.active && !p.cuba.active && !p.mexico.active && !p.delivery.active && !this._marathonRunning();
    return {unlocked, available, message: !unlocked ? 'Reviens après avoir terminé les Gants de bronze et quitté l’hôtel.'
      : !available ? 'Termine ton activité ou ton séjour avant de t’installer à une table.' : 'Bienvenue ! Entrée gratuite, aucune énergie dépensée.',
      chips: p.casino.chips, money: p.wallet.money, cap: cap(p), active: copy(p.casino.active), rounds: p.casino.rounds};
  },
  casinoExchange(amount) {
    const p = this.profile, status = this.casinoStatus();
    if (!status.available || p.location.scene !== 'casino-lobby') return this._result(false, status.available ? 'Rends-toi à la caisse du casino.' : status.message);
    if (p.casino.active && !p.casino.active.settled) return this._result(false, 'Termine ta main avant de passer à la caisse.');
    if (typeof amount !== 'number' || !validCasinoMoney(Math.abs(amount)) || !amount || amount > p.wallet.money || -amount > p.casino.chips) return this._result(false, 'Le solde ne couvre pas cet échange.');
    p.wallet.money -= amount; p.casino.chips += amount; this._save();
    return this._result(true, amount > 0 ? `${amount} $ échangés contre ${amount} jetons.` : `${-amount} $ remis dans ton portefeuille.`, this.casinoStatus());
  },
  casinoOffer(game, options = {}) {
    const p = this.profile, status = this.casinoStatus();
    if (!status.available) return {ok: false, message: status.message};
    const required = {blackjack: 'casino-tables', roulette: 'casino-tables', poker: 'casino-poker', slots: 'casino-lobby'}[game];
    if (required !== p.location.scene) return {ok: false, message: 'Rejoins la salle de ce jeu.'};
    if (p.casino.active && !p.casino.active.settled) return {ok: false, message: 'Une main est déjà engagée. Reprends-la avant de rejouer.'};
    try {
      const settings = optionsFor(game, options, p.casino.chips), risk = exposure(game, settings);
      const minimum = game === 'blackjack' ? settings.bet : risk.maxStake;
      if (p.casino.chips < minimum) return {ok: false, message: `Il te faut ${minimum} jetons. La caisse est au rez-de-chaussée.`};
      if (p.wallet.money + p.casino.chips + risk.maxNetWin > cap(p)) return {ok: false, message: `Gain maximal possible : +${risk.maxNetWin} $. Garde cette place sous le plafond de ${cap(p)} $ (argent et jetons ensemble), ou choisis une mise plus petite.`};
      return {ok: true, options: settings, ...risk};
    } catch (error) {return {ok: false, message: error.message};}
  },
  casinoStart(game, options = {}) {
    const offer = this.casinoOffer(game, options);
    if (!offer.ok) return this._result(false, offer.message);
    const before = copy(this.profile);
    try {
      const p = this.profile, c = p.casino, seed = randomSeed();
      const state = initial(game, offer.options, seed);
      const a = {id: c.nextId++, game, seed, options: offer.options, actions: [], state, stake: 0, maxNetWin: offer.maxNetWin, settled: false};
      a.stake = stakeOf(a); c.chips -= a.stake; c.wagered += a.stake; c.active = a;
      settle(p); this._save(); return this._result(true, 'Mise engagée.', this.casinoStatus());
    } catch (error) {this.profile = before; return this._result(false, error.message);}
  },
  casinoAct(action) {
    const a = this.profile.casino.active;
    if (!a || a.settled) return this._result(false, 'Cette main est déjà terminée.');
    const before = copy(this.profile);
    try {
      const state = next(a.game, a.state, action);
      if (canonical(state) === canonical(a.state)) return this._result(false, 'Ce n’est pas encore ton tour.');
      a.state = state; a.actions.push(copy(action));
      const stake = stakeOf(a), additional = stake - a.stake;
      if (additional > this.profile.casino.chips) throw new Error('Jetons insuffisants.');
      this.profile.casino.chips -= additional; this.profile.casino.wagered += additional; a.stake = stake;
      settle(this.profile); this._save(); return this._result(true, 'Main enregistrée.', this.casinoStatus());
    } catch (error) {this.profile = before; return this._result(false, error.message);}
  },
  casinoDismiss() {
    const c = this.profile.casino;
    if (c.active && !c.active.settled) return this._result(false, 'La main engagée attend ta reprise.');
    if (c.active) {c.active = null; this._save();}
    return this._result(true, 'À bientôt !');
  },
};
