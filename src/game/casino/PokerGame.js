/** A serializable, one-hand, four-seat no-limit Hold'em table. Dollar chips only. */
export const POKER_PROFILES = Object.freeze([
  { id: 'human', name: 'Toi', profile: 'human', accessory: null },
  { id: 'luc', name: 'Luc', profile: 'bluffer', accessory: 'sunglasses' },
  { id: 'mireille', name: 'Mireille', profile: 'cautious', accessory: null },
  { id: 'marco', name: 'Marco', profile: 'talkative', accessory: null },
]);
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const HAND_NAMES = ['Carte haute', 'Paire', 'Deux paires', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush'];
const clone = value => JSON.parse(JSON.stringify(value));
const integer = value => Number.isSafeInteger(value);

export function cardLabel(card) {
  if (!card) return '🂠';
  return `${({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[card.rank] || card.rank}${SYMBOLS[card.suit] || card.suit}`;
}

function random(state) {
  // The random stream depends on its seed alone, never on anyone's wallet or past wins.
  state.rngState = (state.rngState + 0x6D2B79F5) >>> 0;
  let value = state.rngState;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

export function comparePokerHands(a, b) {
  const first = a.score || a, second = b.score || b;
  for (let i = 0; i < Math.max(first.length, second.length); i++) {
    const difference = (first[i] || 0) - (second[i] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function evaluateFive(cards) {
  const ranks = cards.map(card => card.rank).sort((a, b) => b - a);
  const counts = new Map();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) || 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const unique = [...counts.keys()].sort((a, b) => b - a);
  const flush = cards.every(card => card.suit === cards[0].suit);
  const straight = unique.length === 5 && unique[0] - unique[4] === 4 ? unique[0]
    : unique.join(',') === '14,5,4,3,2' ? 5 : 0;
  if (flush && straight) return [8, straight];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (flush) return [5, ...ranks];
  if (straight) return [4, straight];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map(group => group[0])];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, groups[0][0], groups[1][0], groups[2][0]];
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map(group => group[0])];
  return [0, ...ranks];
}

/** Best five of five, six or seven cards, including ace-low straights. */
export function evaluatePokerHand(cards) {
  if (!Array.isArray(cards) || cards.length < 5 || cards.length > 7
    || cards.some(card => !integer(card?.rank) || card.rank < 2 || card.rank > 14 || !SUITS.includes(card.suit))
    || new Set(cards.map(card => `${card.rank}:${card.suit}`)).size !== cards.length) {
    throw new Error('Une main de poker doit contenir de cinq à sept cartes distinctes.');
  }
  let best = null, bestCards = [];
  for (let a = 0; a < cards.length - 4; a++) for (let b = a + 1; b < cards.length - 3; b++)
    for (let c = b + 1; c < cards.length - 2; c++) for (let d = c + 1; d < cards.length - 1; d++)
      for (let e = d + 1; e < cards.length; e++) {
        const five = [cards[a], cards[b], cards[c], cards[d], cards[e]], score = evaluateFive(five);
        if (!best || comparePokerHands(score, best) > 0) { best = score; bestCards = five; }
      }
  return { category: best[0], name: HAND_NAMES[best[0]], score: best, cards: bestCards.map(card => ({ ...card })) };
}

const active = state => state.players.map((player, i) => !player.folded ? i : -1).filter(i => i >= 0);
const able = state => active(state).filter(i => state.players[i].stack > 0);
const nextAmong = (indices, after, count = 4) => {
  for (let step = 1; step <= count; step++) {
    const index = (after + step) % count;
    if (indices.includes(index)) return index;
  }
  return null;
};
const putChips = (state, index, amount) => {
  const player = state.players[index], chips = Math.min(player.stack, amount);
  player.stack -= chips; player.streetBet += chips; player.committed += chips;
  player.allIn = player.stack === 0; state.pot += chips;
  return chips;
};
const log = (state, text, extra = {}) => { state.log.push({ street: state.street, text, ...extra }); };

export function createPokerGame({ buyIn = 10, seed, button = 0 } = {}) {
  if (![10, 20].includes(buyIn)) throw new Error('La cave doit être de 10 $ ou de 20 $.');
  if (!integer(button) || button < 0 || button > 3) throw new Error('Siège du bouton invalide.');
  if (seed !== undefined && (!integer(seed) || seed < 0 || seed > 0xffffffff)) throw new Error('Graine aléatoire invalide.');
  const initialSeed = seed ?? ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
  const state = {
    version: 1, type: 'poker', status: 'playing', buyIn, button, smallBlind: 1, bigBlind: 2,
    seed: initialSeed, rngState: initialSeed, history: [],
    street: 'preflop', board: [], deck: [], cursor: 0, pot: 0, currentBet: 2, lastFullRaise: 2,
    turn: null, pending: [0, 1, 2, 3], actedAtBet: [null, null, null, null], log: [], result: null,
    players: POKER_PROFILES.map(profile => ({ ...profile, stack: buyIn, cards: [], folded: false, allIn: false, committed: 0, streetBet: 0 })),
  };
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) state.deck.push({ rank, suit });
  for (let i = state.deck.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
  }
  for (let round = 0; round < 2; round++) for (let seat = 1; seat <= 4; seat++) {
    state.players[(button + seat) % 4].cards.push({ ...state.deck[state.cursor++] });
  }
  const small = (button + 1) % 4, big = (button + 2) % 4;
  putChips(state, small, 1); putChips(state, big, 2);
  log(state, `${state.players[small].name} : petite blind 1 $.`, { player: small, type: 'blind', amount: 1 });
  log(state, `${state.players[big].name} : grosse blind 2 $.`, { player: big, type: 'blind', amount: 2 });
  state.turn = (big + 1) % 4;
  return state;
}

/** Legal actions for the current seat. Raise.amount means the total bet on this street. */
export function pokerActions(state) {
  const empty = { fold: false, check: false, call: false, callAmount: 0, raise: false, minRaiseTo: 0, maxRaiseTo: 0, allIn: false, allInAmount: 0 };
  if (state.status !== 'playing' || !integer(state.turn)) return empty;
  const player = state.players[state.turn];
  if (!player || player.folded || player.stack <= 0) return empty;
  const toCall = Math.max(0, state.currentBet - player.streetBet);
  const maxRaiseTo = player.streetBet + player.stack;
  const minRaiseTo = state.currentBet + state.lastFullRaise;
  const actedAt = state.actedAtBet[state.turn];
  // TDA reopening rule: a check is also an action; a short all-in only reopens
  // raising when the cumulative wager faced reaches a full bet/raise.
  // https://www.pokertda.com/view-poker-tda-rules/
  const rightsOpen = actedAt === null || state.currentBet - actedAt >= state.lastFullRaise;
  const opponentCanRespond = able(state).some(i => i !== state.turn);
  const canRaise = rightsOpen && opponentCanRespond;
  return {
    fold: true, check: toCall === 0, call: toCall > 0, callAmount: Math.min(toCall, player.stack),
    raise: canRaise && maxRaiseTo >= minRaiseTo, minRaiseTo, maxRaiseTo,
    allIn: maxRaiseTo <= state.currentBet || (canRaise && player.stack > toCall), allInAmount: player.stack,
  };
}

function revealNextStreet(state) {
  state.cursor++; // Burn a card before every community-card deal.
  const count = state.board.length === 0 ? 3 : 1;
  for (let i = 0; i < count; i++) state.board.push({ ...state.deck[state.cursor++] });
  state.street = ({ 3: 'flop', 4: 'turn', 5: 'river' })[state.board.length];
  for (const player of state.players) player.streetBet = 0;
  state.currentBet = 0; state.lastFullRaise = state.bigBlind; state.actedAtBet = [null, null, null, null];
  state.pending = able(state);
  state.turn = nextAmong(state.pending, state.button);
  log(state, `${({ flop: 'Flop', turn: 'Turn', river: 'River' })[state.street]} : ${state.board.map(cardLabel).join(' ')}.`);
}

function finish(state, showdown) {
  const alive = active(state), hands = {};
  if (showdown) for (const index of alive) hands[index] = evaluatePokerHand([...state.players[index].cards, ...state.board]);
  const levels = [...new Set(state.players.map(player => player.committed).filter(amount => amount > 0))].sort((a, b) => a - b);
  const pots = [], winners = new Set();
  let previous = 0;
  for (const level of levels) {
    const contributors = state.players.map((player, i) => player.committed >= level ? i : -1).filter(i => i >= 0);
    const amount = (level - previous) * contributors.length;
    previous = level;
    const eligible = contributors.filter(index => !state.players[index].folded);
    let won;
    if (contributors.length === 1) won = contributors; // Return an unmatched part of a bet.
    else if (!showdown) won = alive;
    else {
      won = [];
      for (const index of eligible) {
        const comparison = won.length ? comparePokerHands(hands[index], hands[won[0]]) : 1;
        if (comparison > 0) won = [index]; else if (comparison === 0) won.push(index);
      }
    }
    if (won.length === 0) throw new Error('Pot sans joueur admissible.');
    const order = won.slice().sort((a, b) => ((a - state.button + 3) % 4) - ((b - state.button + 3) % 4));
    const shares = {}, each = Math.floor(amount / won.length), remainder = amount % won.length;
    order.forEach((index, position) => {
      const share = each + (position < remainder ? 1 : 0);
      state.players[index].stack += share; shares[index] = share;
      if (contributors.length > 1) winners.add(index);
    });
    pots.push({ amount, eligible, winners: won, shares, kind: contributors.length === 1 ? 'uncalled' : pots.length ? 'side' : 'main' });
  }
  const totalPot = state.pot;
  state.status = 'complete'; state.turn = null; state.pending = []; state.pot = 0;
  state.result = { payout: state.players[0].stack, net: state.players[0].stack - state.buyIn, winners: [...winners], pots, hands, showdown, totalPot };
  log(state, `${[...winners].map(i => state.players[i].name).join(' et ')} remporte${winners.size > 1 ? 'nt' : ''} le pot.`);
}

function moveAfterAction(state, actor) {
  if (active(state).length === 1) { finish(state, false); return; }
  const canAct = able(state);
  state.pending = state.pending.filter(index => canAct.includes(index));
  // With no further opponent able to wager, finish the board once the last call is paid.
  if (canAct.length <= 1 && (!canAct.length || state.players[canAct[0]].streetBet >= state.currentBet)) {
    while (state.board.length < 5) revealNextStreet(state);
    finish(state, true); return;
  }
  if (state.pending.length) { state.turn = nextAmong(state.pending, actor); return; }
  if (state.board.length === 5) { finish(state, true); return; }
  revealNextStreet(state);
}

export function actPoker(original, action) {
  if (!action || typeof action.type !== 'string') throw new Error('Action de poker invalide.');
  const legal = pokerActions(original), kind = action.type === 'allIn' ? 'all-in' : action.type;
  if (!['fold', 'check', 'call', 'raise', 'all-in'].includes(kind) || !legal[kind === 'all-in' ? 'allIn' : kind]) throw new Error('Cette action n’est pas disponible.');
  if (kind === 'raise' && (!integer(action.amount) || action.amount < legal.minRaiseTo || action.amount > legal.maxRaiseTo)) {
    throw new Error(`La relance doit porter la mise à ${legal.minRaiseTo}–${legal.maxRaiseTo} $.`);
  }
  const state = clone(original), actor = state.turn, player = state.players[actor], oldBet = state.currentBet;
  let amount = 0;
  if (kind === 'fold') player.folded = true;
  else if (kind === 'call') amount = putChips(state, actor, legal.callAmount);
  else if (kind === 'raise') amount = putChips(state, actor, action.amount - player.streetBet);
  else if (kind === 'all-in') amount = putChips(state, actor, player.stack);
  state.pending = state.pending.filter(index => index !== actor);
  if (player.streetBet > oldBet) {
    const increase = player.streetBet - oldBet;
    state.currentBet = player.streetBet;
    if (increase >= state.lastFullRaise) state.lastFullRaise = increase;
    for (const index of able(state)) if (index !== actor && state.players[index].streetBet < state.currentBet && !state.pending.includes(index)) state.pending.push(index);
  }
  state.actedAtBet[actor] = state.currentBet;
  state.history.push({ source: actor === 0 ? 'human' : 'bot', type: kind, ...(kind === 'raise' ? { amount: action.amount } : {}) });
  const verb = ({ fold: 'se couche', check: 'parole', call: `suit (${amount} $)`, raise: `relance à ${player.streetBet} $`, 'all-in': `fait tapis (${amount} $)` })[kind];
  log(state, `${player.name} : ${verb}.`, { player: actor, type: kind, amount });
  moveAfterAction(state, actor);
  return state;
}

/** This is the only game information provided to bot decisions: no deck or hidden hands. */
export function pokerBotView(state) {
  const index = state.turn;
  return {
    playerIndex: index, profile: state.players[index]?.profile,
    cards: (state.players[index]?.cards || []).map(card => ({ ...card })), board: state.board.map(card => ({ ...card })),
    players: state.players.map(({ cards, ...player }) => ({ ...player })),
    pot: state.pot, currentBet: state.currentBet, bigBlind: state.bigBlind, street: state.street,
    legal: pokerActions(state),
  };
}

function handStrength(view) {
  const [first, second] = view.cards, high = Math.max(first.rank, second.rank), low = Math.min(first.rank, second.rank);
  if (!view.board.length) {
    if (high === low) return .55 + high / 40;
    return Math.min(.85, .08 + (high + low) / 43 + (first.suit === second.suit ? .07 : 0) + (high - low <= 2 ? .05 : 0));
  }
  const hand = evaluatePokerHand([...view.cards, ...view.board]);
  // A shared pair is weaker than a pair in the player's own hand.
  const pairedHoleCard = view.cards.some(card => view.board.some(board => board.rank === card.rank)) || first.rank === second.rank;
  return Math.min(.98, [0.12 + high / 80, pairedHoleCard ? .56 : .30, .67, .76, .83, .89, .94, .98, .99][hand.category]);
}

function botAction(view, draw, bluffDraw) {
  const { legal, profile } = view, strength = handStrength(view);
  const cautious = profile === 'cautious', bluffer = profile === 'bluffer';
  const bluff = bluffDraw < (bluffer ? .20 : cautious ? .035 : .08);
  const pressure = legal.callAmount / Math.max(1, view.pot + legal.callAmount);
  const willing = strength + (bluff ? .3 : 0) + (profile === 'talkative' ? .13 : 0) - (cautious ? .1 : 0);
  if (legal.call && willing < .30 + pressure * .65 && draw > .12) return { type: 'fold' };
  if (legal.raise && ((strength > .72 && draw < .65) || (bluff && draw < .6))) {
    const target = Math.max(legal.minRaiseTo, view.currentBet + Math.max(view.bigBlind, Math.floor(view.pot * (bluffer ? .6 : .4))));
    return { type: 'raise', amount: Math.min(legal.maxRaiseTo, target) };
  }
  if (legal.check) return { type: 'check' };
  if (legal.call) return { type: 'call' };
  return { type: 'fold' };
}

/** Advances exactly one bot turn. The caller saves every returned state. */
export function advancePokerBots(original) {
  if (original.status !== 'playing' || original.turn === 0) return original;
  const state = clone(original), view = pokerBotView(state);
  return actPoker(state, botAction(view, random(state), random(state)));
}

/** Safe rendering view: never reveals folded hands, the undealt deck, or future randomness. */
export function pokerPublicState(state) {
  const { deck, cursor, rngState, seed, ...visible } = clone(state);
  for (let index = 1; index < visible.players.length; index++) {
    if (!visible.result?.showdown || visible.players[index].folded) visible.players[index].cards = [null, null];
  }
  return visible;
}


function sameJson(first, second) {
  if (first === second) return true;
  if (!first || !second || typeof first !== 'object' || typeof second !== 'object' || Array.isArray(first) !== Array.isArray(second)) return false;
  const keys = Object.keys(first), otherKeys = Object.keys(second);
  return keys.length === otherKeys.length && keys.every(key => Object.hasOwn(second, key) && sameJson(first[key], second[key]));
}

/** Import validation replays the saved hand: no forged stacks, cards, results or bot choices. */
export function validatePokerGame(state) {
  try {
    if (!state || state.type !== 'poker' || state.version !== 1 || !Array.isArray(state.history) || state.history.length > 256
      || !integer(state.seed) || state.seed < 0 || state.seed > 0xffffffff) return false;
    let replay = createPokerGame({ buyIn: state.buyIn, seed: state.seed, button: state.button });
    for (const action of state.history) {
      if (!action || replay.status !== 'playing') return false;
      if (replay.turn === 0 && action.source === 'human') replay = actPoker(replay, action);
      else if (replay.turn !== 0 && action.source === 'bot') replay = advancePokerBots(replay);
      else return false;
      if (!sameJson(replay.history[replay.history.length - 1], action)) return false;
    }
    return sameJson(replay, state);
  } catch {
    return false;
  }
}
