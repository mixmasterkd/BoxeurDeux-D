import { IMPACT_HOLD, KNOCKDOWN_RULES, TIMINGS } from './SparringSession.js';

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

/** Give a seated Rémi clear room in the fixed camera during his count.
 * This reads the model's frozen count clock, so pause cannot move the boxer.
 * A double knockdown keeps both grounded bodies in their original positions.
 */
export function knockdownSpacing(who, bout = null) {
  const count = bout?.count;
  if (who !== 'player' || !count?.downed?.remi || count.downed.player || count.hold > 0) return 0;
  const away = 260; // Full authored silhouettes retain a visible gap at rest.
  if (count.stage === 'fall') return -away * smooth(count.elapsed / KNOCKDOWN_RULES.fall);
  if (count.stage === 'rise') return -away * (1 - smooth(count.elapsed / KNOCKDOWN_RULES.rise));
  return count.stage === 'count' ? -away : 0;
}

/**
 * Visual choreography sampled from the combat clock, never a second timer.
 * The intermediate punch pose is shared by the outward and returning arm.
 * `reach` moves the stance towards the contact position without scaling it.
 */
export function fighterMotion(fighter, elapsed, who) {
  const player = who === 'player';
  const { action, progress = 0, duration = 0, hurt = 0 } = fighter;
  const p = clamp(progress);
  const breathing = Math.sin(elapsed * 4.6 + (player ? 1 : 0));
  const weight = Math.sin(elapsed * 2.3 + (player ? .6 : 2.1));
  const idle = { dx: weight * 1.8, dy: breathing * 1.8 };
  const motion = {
    pose: 'guard', phase: 'idle', reach: 0,
    dx: idle.dx, dy: idle.dy, rotation: weight * .002,
    flip: false, alpha: player ? .64 : 1,
  };

  if (action === 'jab' || action === 'cross' || action === 'hook') {
    const impact = fighter.impact ?? TIMINGS[who][action].impact;
    const age = p * duration;
    const contactAt = impact * duration;
    const releaseAt = contactAt + IMPACT_HOLD;
    const side = action === 'cross' ? 1 : -1;
    const hook = action === 'hook';
    if (age + 1e-9 < contactAt) {
      const t = clamp(age / contactAt);
      // Rémi has already wound up during his readable tell. The player first
      // settles his weight, then passes through the half-extension pose.
      motion.phase = 'preparation';
      motion.pose = t < .18 && player ? 'guard'
        : t < .64 ? `${action}-windup` : `${action}-recover`;
      motion.reach = player
        ? t < .22 ? -.04 * smooth(t / .22) : 1.04 * smooth((t - .22) / .78) - .04
        : smooth(t);
      motion.dx = player ? side * (hook ? 10 : 3) * Math.sin(Math.PI * t) : side * 8 * (1 - t);
      motion.dy = player ? 3 * Math.sin(Math.PI * t) : 2 * (1 - t);
      motion.rotation = player ? side * (hook ? .025 : .013) * Math.sin(Math.PI * t) : side * .014 * (1 - t);
      motion.alpha = player ? .64 + .20 * smooth(t / .7) : 1;
    } else if (age <= releaseAt) {
      // Only this phase uses the authored contact pose. It begins at the same
      // boundary where SparringSession scores a touch, and holds for 100 ms.
      motion.pose = action;
      motion.phase = 'contact';
      motion.reach = 1;
      motion.dx = 0;
      motion.dy = 0;
      motion.rotation = 0;
      motion.alpha = player ? .84 : 1;
    } else {
      const t = clamp((age - releaseAt) / Math.max(.001, duration - releaseAt));
      motion.pose = t < .73 ? `${action}-recover` : 'guard';
      motion.phase = 'recovery';
      motion.reach = 1 - smooth(t);
      motion.dx = idle.dx * smooth(t);
      motion.dy = idle.dy * smooth(t);
      motion.rotation = -side * .006 * Math.sin(Math.PI * t) + weight * .002 * smooth(t);
      motion.alpha = player ? .84 - .20 * smooth(t) : 1;
    }
  } else if (action === 'fall' || action === 'down' || action === 'rise') {
    // Newly drawn floor poses preserve actual bent limbs and body proportions.
    // The model already preserves the scoring hit before starting this fall.
    // Keep the ground anchor still: sitting is a pose change, never shrinking
    // the fighter or rotating an upright sprite onto the canvas.
    motion.phase = action;
    motion.pose = action === 'fall' ? (p < .76 ? 'fall' : 'down')
      : action === 'rise' ? (p < .12 ? 'down' : p < .34 ? 'fall' : p < .9 ? 'rise' : 'guard') : 'down';
    motion.dx = 0;
    motion.dy = 0;
    motion.rotation = 0;
    motion.alpha = player ? .80 : 1;
    if (action === 'rise' && p >= .9) {
      const settled = smooth((p - .9) / .1);
      motion.dx = idle.dx * settled;
      motion.dy = idle.dy * settled;
      motion.rotation = weight * .002 * settled;
      motion.alpha = player ? .8 - .16 * settled : 1;
    }
  } else if (action === 'guard') {
    motion.pose = 'block';
    motion.phase = 'defense';
    motion.dy += 3;
    motion.alpha = player ? .74 : 1;
  } else if (action === 'dodgeLeft' || action === 'dodgeRight' || action === 'dodge') {
    const timing = TIMINGS.player[action] ?? TIMINGS.player.dodgeRight;
    const age = p * (duration || timing.duration);
    const side = action === 'dodgeLeft' ? -1 : 1;
    const amount = age < timing.activeFrom ? smooth(age / timing.activeFrom)
      : age <= timing.activeUntil ? 1
        : 1 - smooth((age - timing.activeUntil) / (timing.duration - timing.activeUntil));
    motion.pose = amount > .35 ? 'dodge' : 'guard';
    motion.phase = 'dodge';
    motion.dx = side * 26 * amount + idle.dx * (1 - amount);
    motion.dy = idle.dy * (1 - amount);
    motion.rotation = side * .018 * amount;
    motion.flip = motion.pose === 'dodge' && (player ? side > 0 : side < 0);
  } else if (action === 'hit') {
    const recoil = p < .18 ? smooth(p / .18) : 1 - smooth((p - .18) / .82);
    motion.pose = p < .78 ? 'hit' : 'guard';
    motion.phase = 'reaction';
    motion.dx += (player ? -1 : 1) * 9 * recoil;
    motion.dy += (player ? 8 : -4) * recoil;
    motion.rotation += (player ? -.018 : .015) * recoil;
  } else if (action === 'tellLeft' || action === 'tellRight') {
    const side = action === 'tellLeft' ? -1 : 1;
    motion.pose = p < .2 ? 'block' : `${side < 0 ? 'jab' : 'cross'}-windup`;
    motion.phase = 'tell';
    motion.dx = -side * 8 * smooth(p);
    motion.dy = 2 * smooth(p);
    motion.rotation = -side * .014 * smooth(p);
  } else if (action === 'open') {
    // An opening is relaxed, but still an athletic guard.
    motion.dy += 2 * Math.sin(Math.PI * p);
  }

  // Preserve a committed glove's contact even when both punches land together.
  if (hurt > 0 && !['hit', 'fall', 'down', 'rise'].includes(action) && motion.phase !== 'contact') {
    motion.dx += Math.sin(hurt * Math.PI * 2) * hurt * 3;
  }

  // Body work uses newly drawn bent-knee punches and compact low defenses.
  // Retain the same contact clock; lowering a whole high-punch sprite would
  // disconnect the feet and never actually change the boxer's anatomy.
  const bodyAttack = fighter.target === 'body'
    && ['jab', 'cross', 'hook', 'tellLeft', 'tellRight', 'hit'].includes(action);
  if (bodyAttack && motion.pose !== 'guard') motion.pose += '-body';
  else if (action === 'guard' && fighter.guardLevel === 'body') motion.pose = 'block-body';
  return motion;
}

/** Local sprite coordinates, including the horizontal mirror used by dodges. */
export function transformFighterPoint(point, anchor, transform) {
  const localX = (point.x - anchor.x) * transform.scale * (transform.flip ? -1 : 1);
  const localY = (point.y - anchor.y) * transform.scale;
  const angle = transform.rotation ?? 0;
  return {
    x: transform.x + localX * Math.cos(angle) - localY * Math.sin(angle),
    y: transform.y + localX * Math.sin(angle) + localY * Math.cos(angle),
  };
}
