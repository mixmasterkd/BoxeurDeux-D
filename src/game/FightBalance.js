/** Official bouts use longer exchanges than the teaching sparring session.
 * actor is the fighter RECEIVING the hit (the engine calls opponents `remi`).
 * Career saves keep their existing 0–10 power stat: its effect is proportional,
 * so a trained jab cannot become stronger than an untrained finishing hook.
 */
export const OFFICIAL_ROUND_DURATION = 45;

const PLAYER_DAMAGE = Object.freeze({ jab: 5, cross: 7, hook: 9 });
const OPPONENT_DAMAGE = Object.freeze({ jab: 9, cross: 13, hook: 16 });
const RISE_FRACTIONS = Object.freeze([.80, .72, .65]);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function officialDamage(profile, actor, attack, power = 0, extra = 0) {
  if (actor === 'remi') {
    const base = PLAYER_DAMAGE[attack] ?? 0;
    if (!base) return 0;
    const training = 1 + clamp(finite(power), 0, 10) * .02;
    // The learned J–J–K retains a modest advantage and its extra stamina cost.
    const finisher = clamp(finite(extra), 0, 4) * .375;
    return Math.round((base + finisher) * training * 100) / 100;
  }
  if (actor !== 'player') return 0;
  const multiplier = clamp(finite(profile?.attackPower, 1), .5, 2);
  return Math.round((OPPONENT_DAMAGE[attack] ?? 0) * multiplier * 100) / 100;
}

export function officialRestoredResistance(maximum, totalDowns) {
  const maximumResistance = Math.max(0, finite(maximum));
  const index = clamp(Math.floor(finite(totalDowns, 1)) - 1, 0, RISE_FRACTIONS.length - 1);
  return Math.round(maximumResistance * RISE_FRACTIONS[index] * 10) / 10;
}
