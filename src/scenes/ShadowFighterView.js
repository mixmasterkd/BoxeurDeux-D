import { fighterMotion, transformFighterPoint } from '../game/FighterMotion.js';
import { boxingTexture, prepareBoxingOutfits } from './OutfitView.js';

const BASE_POSES = ['guard', 'windup', 'jab', 'cross', 'hook-windup', 'hook'];
const DEFENSE_POSES = { block: 'player-block', dodgeLeft: 'player-dodge-left', dodgeRight: 'player-dodge-right' };
const BODY_POSES = ['windup-body', 'jab-body', 'cross-body', 'hook-windup-body', 'hook-body', 'block-body'];

// The reflected figure samples the exact same pose and clock as the boxer.
// Its smaller size represents distance behind the mirror, never another actor.
export const MIRROR_LAYOUT = {
  glass: { x: 688, y: 58, width: 510, height: 458 },
  player: { x: 440, feet: 640, scale: 1.10 },
  reflection: { x: 965, feet: 499, scale: .90 },
};

export function shadowMotion(player, elapsed) {
  const motion = fighterMotion(player, elapsed, 'player');
  const action = player.action;
  const pose = motion.pose === 'dodge' ? action
    : /^(jab|cross)-(windup|recover)(-body)?$/.test(motion.pose) ? `windup${player.target === 'body' ? '-body' : ''}`
      : /^hook-recover(-body)?$/.test(motion.pose) ? `hook-windup${player.target === 'body' ? '-body' : ''}` : motion.pose;
  return {
    ...motion, pose,
    // Shadow boxing stops in the air; no target tracking or contact lunge.
    dx: motion.dx + motion.reach * (action === 'cross' ? 22 : 14),
  };
}

export class ShadowFighterView {
  static preload(scene) {
    const base = import.meta.env.BASE_URL;
    scene.load.image('mirror-room', `${base}assets/backgrounds/mirror-training.png`);
    scene.load.json('shadow-base-data', `${base}assets/sprites/bag-orthodox/fighters.json`);
    scene.load.json('shadow-defense-data', `${base}assets/sprites/mirror/fighters.json`);
    scene.load.json('shadow-body-data', `${base}assets/sprites/body-training/gym.json`);
    for (const pose of BASE_POSES) scene.load.image(`shadow-${pose}`, `${base}assets/sprites/bag-orthodox/player-${pose}.png`);
    for (const [pose, file] of Object.entries(DEFENSE_POSES)) scene.load.image(`shadow-${pose}`, `${base}assets/sprites/mirror/${file}.png`);
    for (const pose of BODY_POSES) scene.load.image(`shadow-${pose}`, `${base}assets/sprites/body-training/gym-${pose}.png`);
  }

  constructor(scene, { mentor = false } = {}) {
    this.scene = scene;
    prepareBoxingOutfits(scene, [...BASE_POSES, ...BODY_POSES, ...Object.keys(DEFENSE_POSES)].map(pose => `shadow-${pose}`));
    const base = scene.cache.json.get('shadow-base-data');
    this.metadata = { ...base, poses: { ...base.poses, ...scene.cache.json.get('shadow-defense-data').poses, ...scene.cache.json.get('shadow-body-data').poses } };
    this.anchor = this.metadata.anchor;
    this.layout = mentor ? { ...MIRROR_LAYOUT, player: { x: 535, feet: 645, scale: .95 }, reflection: { x: 1010, feet: 499, scale: .76 } } : MIRROR_LAYOUT;
    scene.add.image(640, 360, 'mirror-room').setDisplaySize(1280, 720);
    const { player, reflection } = this.layout;
    this.reflectionShadow = scene.add.ellipse(reflection.x, reflection.feet - 2, 174, 16, 0x182b36, .17);
    this.reflection = scene.add.image(reflection.x, reflection.feet, boxingTexture(scene, 'shadow-guard'));
    this.playerShadow = scene.add.ellipse(player.x, player.feet - 2, 254, 25, 0x0a1822, .24);
    this.sprite = scene.add.image(player.x, player.feet, boxingTexture(scene, 'shadow-guard'));
    for (const sprite of [this.sprite, this.reflection]) sprite.setOrigin(
      this.anchor.x / this.metadata.canvas.width, this.anchor.y / this.metadata.canvas.height);
    this.reflection.setTint(0xc4d9dd).setAlpha(.83);
    this.pose = 'guard';
    this.phase = 'idle';
  }

  render(player, elapsed) {
    const motion = shadowMotion(player, elapsed);
    const { player: actual, reflection: reflected } = this.layout;
    const texture = boxingTexture(this.scene, `shadow-${motion.pose}`);
    this.sprite.setTexture(texture).setScale(actual.scale)
      .setPosition(actual.x + motion.dx * actual.scale, actual.feet + motion.dy * actual.scale)
      .setRotation(motion.rotation);
    // A negative X scale reflects both the art and its asymmetric foot anchor.
    this.reflection.setTexture(texture).setScale(-reflected.scale, reflected.scale)
      .setPosition(reflected.x - motion.dx * reflected.scale, reflected.feet + motion.dy * reflected.scale)
      .setRotation(-motion.rotation);
    this.playerShadow.setPosition(this.sprite.x, actual.feet - 2 + motion.dy * .2);
    this.reflectionShadow.setPosition(this.reflection.x, reflected.feet - 2 + motion.dy * .2);
    this.pose = motion.pose;
    this.phase = motion.phase;
  }

  point(local, reflection = false) {
    const sprite = reflection ? this.reflection : this.sprite;
    return transformFighterPoint(local, this.anchor, {
      x: sprite.x, y: sprite.y, scale: Math.abs(sprite.scaleX),
      flip: reflection, rotation: sprite.rotation,
    });
  }

  bounds(reflection = false) {
    const b = this.metadata.poses[this.pose].bounds;
    const points = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
      .map(([x, y]) => this.point({ x, y }, reflection));
    return {
      left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
      top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)),
    };
  }
}
