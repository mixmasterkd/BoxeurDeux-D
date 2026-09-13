import { fighterMotion, transformFighterPoint } from './FighterMotion.js';

export const PADS_STANCE = { coach: { x: 640, y: 594, scale: .76 }, player: { x: 640, y: 662, scale: .74 } };

/** Coach sides are anatomical: left is on the right of the screen. All glove
 * placement uses authored landmarks, including mirrored player poses. */
export function padsMotion(state, coachMeta, playerMeta) {
  const a = state.player, target = state.target;
  const raised = target.phase !== 'rest';
  const coachPose = raised ? target.side : 'ready';
  const coachSpec = coachMeta.poses[coachPose];
  const coachAnchor = coachSpec.anchor ?? coachMeta.anchor;
  const coach = { ...PADS_STANCE.coach, rotation: 0, flip: false };
  const aim = transformFighterPoint(coachSpec[`${target.side}Target`], coachAnchor, coach);
  // A wrong hand goes toward its own opposite, lowered mitt. Its glove cannot
  // visually meet the raised target and still be labelled a miss.
  const handSide = a.input === 'cross' ? 'right' : 'left';
  const handAim = transformFighterPoint(coachSpec[`${handSide}Target`], coachAnchor, coach);
  const motion = fighterMotion({ action: a.action, duration: a.duration,
    progress: a.duration ? a.elapsed / a.duration : 0,
    impact: a.duration ? a.contact / a.duration : undefined }, state.elapsed, 'player');
  const spec = playerMeta.poses[`player-${motion.pose}`];
  const anchor = spec.anchor ?? playerMeta.anchor;
  const player = { ...PADS_STANCE.player, flip: Boolean(spec.mirror) !== motion.flip, rotation: motion.rotation };
  const point = spec.contact ?? spec.glove ?? spec.head;
  const local = transformFighterPoint(point, anchor, { ...player, x: 0, y: 0 });
  player.x += (handAim.x - local.x - player.x) * motion.reach + motion.dx;
  player.y += (handAim.y - local.y - player.y) * motion.reach + motion.dy;
  const glove = transformFighterPoint(point, anchor, player);
  return { coachPose, coach, player, pose: motion.pose, alpha: motion.alpha, raised, aim, handAim, glove, phase: motion.phase };
}
