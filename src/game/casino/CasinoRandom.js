/** Serializable random stream. Its only input is the saved seed, never the
 * player's wallet, results, or playing history. Integer draws use rejection
 * sampling so roulette pockets and weighted slot entries have equal buckets. */
export function normalizeCasinoSeed(seed = 1) {
  if (!Number.isFinite(seed)) throw new TypeError('La graine du jeu doit être un nombre fini.');
  return seed >>> 0;
}

export function nextRandom(seed) {
  const nextSeed = (normalizeCasinoSeed(seed) + 0x6D2B79F5) >>> 0;
  let value = nextSeed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const integer = (value ^ (value >>> 14)) >>> 0;
  return { seed: nextSeed, value: integer / 4294967296, integer };
}

export function randomInteger(seed, maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 4294967296) {
    throw new RangeError('Le nombre de possibilités doit être un entier positif.');
  }
  const limit = Math.floor(4294967296 / maxExclusive) * maxExclusive;
  let draw;
  do { draw = nextRandom(seed); seed = draw.seed; } while (draw.integer >= limit);
  return { seed, value: draw.integer % maxExclusive };
}

export const CARD_RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
export const CARD_SUITS = Object.freeze(['♠', '♥', '♦', '♣']);

export function shuffledDeck(seed = 1) {
  const cards = CARD_SUITS.flatMap(suit => CARD_RANKS.map(rank => ({ rank, suit })));
  seed = normalizeCasinoSeed(seed);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const draw = randomInteger(seed, index + 1); seed = draw.seed;
    [cards[index], cards[draw.value]] = [cards[draw.value], cards[index]];
  }
  return { seed, cards };
}
