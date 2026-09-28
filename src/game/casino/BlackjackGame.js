import { normalizeCasinoSeed, shuffledDeck } from './CasinoRandom.js';

export const BLACKJACK_RULES = Object.freeze({
  minBet: 1, maxBet: 5, blackjackProfit: 1.5, dealerStandsOnSoft17: true,
  maxHands: 2, doubleAfterSplit: true, splitAcesOneCard: true,
  text: 'Mise de 1 à 5 $. Blackjack payé 3:2; victoire 1:1; égalité remboursée. Karl reste sur 17, même souple. Une séparation de deux cartes de même valeur est permise. On peut doubler sur les deux premières cartes, y compris après séparation. Les as séparés reçoivent une seule carte; leur 21 est payé 1:1. Pas d’assurance.',
});

function checkBet(bet) {
  if (!Number.isInteger(bet) || bet < 1 || bet > 5) throw new RangeError('La mise doit être de 1 à 5 $.');
  return bet;
}
const cardValue = card => card.rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(card.rank) ? 10 : Number(card.rank);

export function blackjackValue(cards) {
  let total = 0, aces = 0;
  for (const card of cards) { total += cardValue(card); if (card.rank === 'A') aces += 1; }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return { total, soft: aces > 0 };
}

/** Maximum additional cash at risk and possible profit, including a split and
 * two doubles. The caller can reserve wallet headroom before dealing. */
export function blackjackMaximumExposure(bet = 1) {
  checkBet(bet);
  return { maxStake: bet * 4, maxNetWin: bet * 4 };
}

export function blackjackActions(game) {
  if (game?.status !== 'playing') return [];
  const hand = game.hands[game.activeHand];
  if (!hand || hand.status !== 'playing') return [];
  const actions = ['hit', 'stand'];
  if (hand.cards.length === 2 && game.bankroll - game.totalBet >= hand.bet) {
    actions.push('double');
    if (game.hands.length === 1 && cardValue(hand.cards[0]) === cardValue(hand.cards[1])) actions.push('split');
  }
  return actions;
}

function takeCard(game) {
  if (!game.deck.length) throw new Error('Le paquet est épuisé.');
  return game.deck.shift();
}
function settle(game) {
  const dealerTotal = blackjackValue(game.dealer).total;
  const dealerNatural = game.dealer.length === 2 && dealerTotal === 21;
  for (const hand of game.hands) {
    const total = blackjackValue(hand.cards).total;
    const natural = !hand.split && hand.cards.length === 2 && total === 21;
    hand.payout = 0;
    if (total > 21) hand.result = 'bust';
    else if (dealerNatural) { hand.result = natural ? 'push' : 'lose'; hand.payout = natural ? hand.bet : 0; }
    else if (natural) { hand.result = 'blackjack'; hand.payout = hand.bet * 2.5; }
    else if (dealerTotal > 21 || total > dealerTotal) { hand.result = 'win'; hand.payout = hand.bet * 2; }
    else if (total === dealerTotal) { hand.result = 'push'; hand.payout = hand.bet; }
    else hand.result = 'lose';
    hand.status = 'complete';
  }
  game.payout = game.hands.reduce((sum, hand) => sum + hand.payout, 0);
  game.profit = game.payout - game.totalBet;
  game.status = 'complete'; game.dealerRevealed = true;
  return game;
}
function dealerTurn(game) {
  if (game.hands.some(hand => blackjackValue(hand.cards).total <= 21)) {
    while (blackjackValue(game.dealer).total < 17) game.dealer.push(takeCard(game));
  }
  return settle(game);
}
function advance(game) {
  while (game.activeHand < game.hands.length && game.hands[game.activeHand].status !== 'playing') game.activeHand += 1;
  if (game.activeHand >= game.hands.length) return dealerTurn(game);
  return game;
}
function hand(cards, bet, split = false) {
  return { cards, bet, split, doubled: false, status: 'playing', result: null, payout: 0 };
}

/** Money uses dollars in half-dollar increments, exact in binary arithmetic.
 * Debit totalBet changes and credit payout once on completion; no wallet is
 * mutated here. Persist the returned object before revealing each next card. */
export function createBlackjackGame({ bet = 1, seed = 1, bankroll = bet * 4 } = {}) {
  checkBet(bet);
  if (!Number.isFinite(bankroll) || bankroll < bet || !Number.isInteger(bankroll * 2)) {
    throw new RangeError('Le portefeuille doit couvrir la mise.');
  }
  const shuffled = shuffledDeck(seed);
  const game = {
    kind: 'blackjack', version: 1, status: 'playing', seed: shuffled.seed,
    initialSeed: normalizeCasinoSeed(seed), initialBet: bet, actions: [],
    deck: shuffled.cards, hands: [], dealer: [], dealerRevealed: false,
    activeHand: 0, bankroll, totalBet: bet, payout: 0, profit: null,
  };
  const first = takeCard(game); game.dealer.push(takeCard(game));
  game.hands.push(hand([first, takeCard(game)], bet)); game.dealer.push(takeCard(game));
  if (blackjackValue(game.dealer).total === 21 || blackjackValue(game.hands[0].cards).total === 21) settle(game);
  return game;
}

export function actBlackjack(previous, action) {
  if (!blackjackActions(previous).includes(action)) throw new RangeError('Cette action de blackjack est indisponible.');
  const game = structuredClone(previous);
  game.actions.push(action);
  const current = game.hands[game.activeHand];
  if (action === 'hit') {
    current.cards.push(takeCard(game));
    if (blackjackValue(current.cards).total >= 21) current.status = 'standing';
  } else if (action === 'stand') current.status = 'standing';
  else if (action === 'double') {
    game.totalBet += current.bet; current.bet *= 2; current.doubled = true;
    current.cards.push(takeCard(game)); current.status = 'standing';
  } else if (action === 'split') {
    game.totalBet += current.bet;
    const [first, second] = current.cards;
    game.hands = [hand([first, takeCard(game)], current.bet, true), hand([second, takeCard(game)], current.bet, true)];
    for (const split of game.hands) {
      if (first.rank === 'A' || blackjackValue(split.cards).total === 21) split.status = 'standing';
    }
  }
  return advance(game);
}

/** Reject forged cards, wagers, results and out-of-order action histories by
 * reconstructing the exact round from its independent random seed. */
export function validateBlackjackGame(game) {
  try {
    if (!game || !Array.isArray(game.actions) || game.actions.length > 52) return false;
    let rebuilt = createBlackjackGame({ bet: game.initialBet, seed: game.initialSeed, bankroll: game.bankroll });
    for (const action of game.actions) rebuilt = actBlackjack(rebuilt, action);
    return JSON.stringify(game) === JSON.stringify(rebuilt);
  } catch { return false; }
}
