import { fighterMotion, transformFighterPoint } from '../game/FighterMotion.js';

const POSES = ['guard', 'jab', 'cross', 'block', 'hit', 'dodge',
  'jab-windup', 'cross-windup', 'jab-recover', 'cross-recover'];
const ASSETS = 'assets/sprites/sparring-v2/';
const HOOK_ASSETS = 'assets/sprites/sparring-hook/';
const BODY_ASSETS = 'assets/sprites/body-training/';
const BODY_POSES = ['jab-body', 'cross-body', 'jab-windup-body', 'cross-windup-body',
  'jab-recover-body', 'cross-recover-body', 'block-body', 'hit-body'];

/** Rendering only. The session owns every timer and every scored contact. */
export class FighterView {
  static preload(scene) {
    scene.load.json('fighters', `${import.meta.env.BASE_URL}${ASSETS}fighters.json`);
    for (const who of ['remi', 'player']) {
      for (const pose of POSES) {
        scene.load.image(`${who}-${pose}`, `${import.meta.env.BASE_URL}${ASSETS}${who}-${pose}.png`);
      }
    }
    scene.load.json('fighters-hook', `${import.meta.env.BASE_URL}${HOOK_ASSETS}fighters.json`);
    for (const pose of ['hook-windup', 'hook-recover', 'hook']) {
      scene.load.image(`player-${pose}`, `${import.meta.env.BASE_URL}${HOOK_ASSETS}player-${pose}.png`);
    }
    scene.load.json('fighters-body', `${import.meta.env.BASE_URL}${BODY_ASSETS}sparring.json`);
    for (const who of ['player', 'remi']) {
      const poses = who === 'player' ? [...BODY_POSES, 'hook-body', 'hook-windup-body', 'hook-recover-body'] : BODY_POSES;
      for (const pose of poses) scene.load.image(`${who}-${pose}`, `${import.meta.env.BASE_URL}${BODY_ASSETS}${who}-${pose}.png`);
    }
  }

  constructor(scene, who, x, feet, height) {
    this.who = who;
    this.x = x;
    this.feet = feet;
    this.height = height;
    const original = scene.cache.json.get('fighters');
    this.metadata = { ...original, poses: { ...original.poses, ...scene.cache.json.get('fighters-hook')?.poses, ...scene.cache.json.get('fighters-body')?.poses } };
    this.anchor = this.metadata.anchor;
    this.shadow = scene.add.ellipse(x, feet - 3, who === 'remi' ? 228 : 250, 30, 0x0b1523, .3);
    this.sprite = scene.add.image(x, feet, `${who}-guard`).setOrigin(
      this.anchor.x / this.metadata.canvas.width,
      this.anchor.y / this.metadata.canvas.height,
    );
    this.baseScale = height / this.metadata.artHeight;
    this.sprite.setScale(this.baseScale);
    if (who === 'player') this.sprite.setAlpha(.64);
    this.target = { x: 640, y: who === 'player' ? 240 : 357 };
    this.pose = 'guard';
    this.lastAction = 'idle';
    this.lastProgress = 0;
  }

  point(pose, name, actual = false) {
    const spec = this.metadata.poses[`${this.who}-${pose}`] ?? this.metadata.poses[`${this.who}-guard`];
    // The original head-only atlas remains untouched. Its torso landmark is
    // measured between the head and the fixed foot anchor; new art is explicit.
    const point = name === 'body' ? spec.body ?? {
      x: (spec.head.x + this.anchor.x) / 2,
      y: spec.head.y + (this.anchor.y - spec.head.y) * .32,
    } : spec[name] ?? spec.glove ?? spec.head;
    return transformFighterPoint(point, this.anchor, {
      x: actual ? this.sprite.x : this.x,
      y: actual ? this.sprite.y : this.feet,
      scale: actual ? this.sprite.scaleX : this.baseScale,
      rotation: actual ? this.sprite.rotation : 0,
      flip: actual ? this.sprite.flipX : Boolean(spec.mirror),
    });
  }

  contact() {
    if (!/^(jab|cross|hook)(-body)?$/.test(this.pose)) return this.target;
    return this.point(this.pose, 'contact', true);
  }

  render(fighter, elapsed) {
    const { action, progress = 0 } = fighter;
    const player = this.who === 'player';
    const motion = fighterMotion(fighter, elapsed, this.who);
    let { dx, dy } = motion;
    if (action === 'jab' || action === 'cross' || action === 'hook') {
      if (this.lastAction !== action || progress < this.lastProgress) this.attackAim = null;
      const target = { ...this.target };
      if (!player) {
        target.x += action === 'jab' ? -36 : 36;
        if (fighter.target !== 'body') target.y += 18;
      }
      // Track the visible target during preparation, then freeze the aim while
      // the defender recoils. A reaction must not drag an extended arm around.
      if (motion.phase === 'contact' && !this.attackAim) this.attackAim = target;
      const aim = this.attackAim ?? target;
      const contactPose = `${action}${fighter.target === 'body' ? '-body' : ''}`;
      const contact = this.point(contactPose, 'contact');
      dx += (aim.x - contact.x) * motion.reach;
      dy += (aim.y - contact.y) * motion.reach;
    } else {
      this.attackAim = null;
    }
    const poseSpec = this.metadata.poses[`${this.who}-${motion.pose}`] ?? this.metadata.poses[`${this.who}-guard`];
    // Some symmetric uniforms reuse an authored pose in mirror. Combine this
    // asset correction with the directional dodge, rather than applying twice.
    const flip = Boolean(poseSpec.mirror) !== motion.flip;
    this.sprite.setTexture(`${this.who}-${motion.pose}`)
      .setScale(this.baseScale)
      .setPosition(Math.round(this.x + dx), Math.round(this.feet + dy))
      .setRotation(motion.rotation).setFlipX(flip).setAlpha(motion.alpha);
    this.pose = motion.pose;
    this.lastAction = action;
    this.lastProgress = progress;
    this.shadow.setPosition(this.x + dx * .7, this.feet + dy * .8 - 3);
    this.shadow.setAlpha(player ? .18 : .3);
  }
}

/** Small, short-lived impact marks; all outcomes have a distinct shape/color. */
export function drawImpact(scene, event, x, y) {
  const blocked = event.type.includes('blocked');
  const dodged = event.type.includes('dodged') || event.type.includes('missed');
  const color = blocked ? 0x8acbd6 : dodged ? 0xaac8ae : 0xffdb8c;
  const mark = scene.add.graphics().setDepth(20);
  mark.lineStyle(blocked ? 5 : 3, color, 1);
  if (blocked) {
    mark.strokePoints([{x: -21,y: -17},{x: 0,y: -26},{x:21,y:-17},{x:17,y:12},{x:0,y:27},{x:-17,y:12}], true);
  } else if (dodged) {
    for (let i = 0; i < 3; i++) mark.lineBetween(-25, -12 + i * 12, 25 - i * 8, -12 + i * 12);
  } else {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      mark.lineBetween(Math.cos(angle) * 13, Math.sin(angle) * 13, Math.cos(angle) * 30, Math.sin(angle) * 30);
    }
    mark.fillStyle(0xfff2c2).fillRect(-6, -6, 12, 12);
  }
  mark.setPosition(x, y);
  scene.tweens.add({targets: mark, alpha: 0, scale: 1.45, duration: 240, onComplete: () => mark.destroy()});
  return mark;
}
