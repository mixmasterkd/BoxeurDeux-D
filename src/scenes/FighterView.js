import { fighterMotion, knockdownSpacing, transformFighterPoint } from '../game/FighterMotion.js';
import { boxingTexture, prepareBoxingOutfits } from './OutfitView.js';

const POSES = ['guard', 'jab', 'cross', 'block', 'hit', 'dodge',
  'jab-windup', 'cross-windup', 'jab-recover', 'cross-recover'];
const ASSETS = 'assets/sprites/sparring-v2/';
const HOOK_ASSETS = 'assets/sprites/sparring-hook/';
const BODY_ASSETS = 'assets/sprites/body-training/';
const KNOCKDOWN_ASSETS = 'assets/sprites/knockdown/';
const BETON_ASSETS = 'assets/sprites/beton/';
const BETON_POSES = ['guard', 'block', 'jab-windup', 'jab-recover', 'jab',
  'cross-windup-body', 'cross-recover-body', 'cross-body', 'block-body',
  'hit', 'hit-body', 'fall', 'down', 'rise'];
const CHAPTER_OPPONENTS = ['kramer', 'bellini', 'fortin', 'gagnon'];
const CHAPTER_ASSETS = 'assets/sprites/chapter-combat/';
const CHAPTER_POSES = ['guard', 'block', 'jab-windup', 'jab', 'cross-windup', 'cross',
  'cross-windup-body', 'cross-body', 'block-body', 'hit', 'hit-body', 'fall', 'down', 'rise', 'dodge', 'surrender'];
const COMPETITION_ASSETS = 'assets/sprites/competition-v2/';
const COMPETITION_POSES = ['jab-recover','cross-recover','hook-recover','jab-recover-body','cross-recover-body','hook-recover-body','guard', 'block', 'jab-windup', 'jab', 'cross-windup', 'cross', 'hook-windup', 'hook',
  'jab-windup-body', 'jab-body', 'cross-windup-body', 'cross-body', 'hook-windup-body', 'hook-body', 'block-body', 'hit-body', 'hit', 'dodge', 'fall', 'down', 'rise'];
const CHAPTER_FALLBACKS = {
  'jab-recover': 'jab-windup', 'cross-recover': 'cross-windup', 'cross-recover-body': 'cross-windup-body',
  'jab-body': 'cross-body', 'jab-windup-body': 'cross-windup-body', 'jab-recover-body': 'cross-windup-body',
  'hook': 'jab', 'hook-windup': 'jab-windup', 'hook-recover': 'jab-windup',
  'hook-body': 'cross-body', 'hook-windup-body': 'cross-windup-body', 'hook-recover-body': 'cross-windup-body',
};
// Béton's first repertoire is a head jab and a body cross. Generic renderer
// states still resolve to his own art; none can accidentally display Rémi.
const BETON_FALLBACKS = {
  cross: 'cross-body', 'cross-windup': 'cross-windup-body', 'cross-recover': 'cross-recover-body',
  'jab-body': 'jab', 'jab-windup-body': 'jab-windup', 'jab-recover-body': 'jab-recover',
  dodge: 'guard', hook: 'jab', 'hook-windup': 'jab-windup', 'hook-recover': 'jab-recover',
  'hook-body': 'cross-body', 'hook-windup-body': 'cross-windup-body', 'hook-recover-body': 'cross-recover-body',
};
const BODY_POSES = ['jab-body', 'cross-body', 'jab-windup-body', 'cross-windup-body',
  'jab-recover-body', 'cross-recover-body', 'block-body', 'hit-body'];

/** Rendering only. The session owns every timer and every scored contact. */
export class FighterView {
  static preload(scene, { opponent = 'remi', tournament = false } = {}) {
    const base = import.meta.env?.BASE_URL ?? '/';
    scene.load.json('fighters', `${base}${ASSETS}fighters.json`);
    for (const who of ['remi', 'player']) {
      for (const pose of POSES) {
        scene.load.image(`${who}-${pose}`, `${base}${ASSETS}${who}-${pose}.png`);
      }
    }
    scene.load.json('fighters-hook', `${base}${HOOK_ASSETS}fighters.json`);
    for (const pose of ['hook-windup', 'hook-recover', 'hook']) {
      scene.load.image(`player-${pose}`, `${base}${HOOK_ASSETS}player-${pose}.png`);
    }
    scene.load.json('fighters-body', `${base}${BODY_ASSETS}sparring.json`);
    for (const who of ['player', 'remi']) {
      const poses = who === 'player' ? [...BODY_POSES, 'hook-body', 'hook-windup-body', 'hook-recover-body'] : BODY_POSES;
      for (const pose of poses) scene.load.image(`${who}-${pose}`, `${base}${BODY_ASSETS}${who}-${pose}.png`);
    }
    scene.load.json('fighters-knockdown', `${base}${KNOCKDOWN_ASSETS}fighters.json`);
    for (const who of ['player', 'remi']) {
      for (const pose of ['fall', 'down', 'rise']) scene.load.image(`${who}-${pose}`, `${base}${KNOCKDOWN_ASSETS}${who}-${pose}.png`);
    }
    if (opponent === 'beton') {
      scene.load.json('fighters-beton', `${base}${BETON_ASSETS}fighters.json`);
      for (const pose of BETON_POSES) scene.load.image(`beton-${pose}`, `${base}${BETON_ASSETS}beton-${pose}.png`);
    }
    if (CHAPTER_OPPONENTS.includes(opponent)) {
      scene.load.json(`fighters-${opponent}`, `${base}${CHAPTER_ASSETS}${opponent}/fighters.json`);
      for (const pose of CHAPTER_POSES) scene.load.image(`${opponent}-${pose}`, `${base}${CHAPTER_ASSETS}${opponent}/${opponent}-${pose}.png`);
    }
    if (tournament) {
      scene.load.json('fighters-competition', `${base}${COMPETITION_ASSETS}fighters.json`);
      for (const pose of COMPETITION_POSES) scene.load.image(`competition-${pose}`, `${base}${COMPETITION_ASSETS}competition-${pose}.png`);
    }
  }

  constructor(scene, who, x, feet, height, { opponent = 'remi', tournament = false } = {}) {
    this.scene = scene;
    this.who = who;
    this.tournament = tournament;
    this.texturePrefix = who === 'remi' && opponent !== 'remi' ? opponent : who === 'player' && tournament ? 'competition' : who;
    this.x = x;
    this.feet = feet;
    this.height = height;
    const original = scene.cache.json.get('fighters');
    this.metadata = { ...original, poses: { ...original.poses, ...scene.cache.json.get('fighters-hook')?.poses, ...scene.cache.json.get('fighters-body')?.poses, ...scene.cache.json.get('fighters-knockdown')?.poses } };
    if (this.texturePrefix === 'beton') {
      const beton = scene.cache.json.get('fighters-beton');
      if (!beton) throw new Error('Béton sprites must be preloaded before constructing his view.');
      // Keep the model-facing remi-* keys while replacing the complete visual
      // identity, including every fallback and target landmark, atomically.
      const poses = {};
      for (const pose of BETON_POSES) poses[`remi-${pose}`] = { ...beton.poses[`beton-${pose}`], texturePose: pose };
      for (const [pose, fallback] of Object.entries(BETON_FALLBACKS)) poses[`remi-${pose}`] = { ...poses[`remi-${fallback}`], fallbackFrom: pose };
      this.metadata = { ...beton, poses };
    }
    if (CHAPTER_OPPONENTS.includes(this.texturePrefix) || this.texturePrefix === 'competition') {
      const atlas = scene.cache.json.get(`fighters-${this.texturePrefix}`);
      if (!atlas) throw new Error(`${this.texturePrefix}: sprites must be loaded before creating the boxer`);
      const poses = {};
      for (const [key, spec] of Object.entries(atlas.poses)) {
        const pose = key.slice(this.texturePrefix.length + 1);
        poses[`${who}-${pose}`] = { ...spec, texturePose: pose };
      }
      const fallbacks = this.texturePrefix === 'competition'
        ? { 'jab-recover':'jab-windup', 'cross-recover':'cross-windup', 'hook-recover':'hook-windup',
          'jab-recover-body':'jab-windup-body', 'cross-recover-body':'cross-windup-body', 'hook-recover-body':'hook-windup-body' }
        : CHAPTER_FALLBACKS;
      for (const [pose, source] of Object.entries(fallbacks)) if (!poses[`${who}-${pose}`]) poses[`${who}-${pose}`] = { ...poses[`${who}-${source}`], fallbackFrom: pose };
      this.metadata = { ...atlas, poses };
    }
    this.anchor = this.metadata.anchor;
    if (who === 'player' && !tournament) prepareBoxingOutfits(scene, Object.keys(this.metadata.poses).filter(key => key.startsWith('player-')));
    this.shadow = scene.add.ellipse(x, feet - 3, who === 'remi' ? 228 : 250, 30, 0x0b1523, .3);
    this.sprite = scene.add.image(x, feet, `${this.texturePrefix}-guard`).setOrigin(
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

  render(fighter, elapsed, bout = null) {
    const { action, progress = 0 } = fighter;
    const player = this.who === 'player';
    const motion = fighterMotion(fighter, elapsed, this.who);
    if (action === 'feint') {
      // An authored shoulder twitch returns to guard without emitting a tell
      // or making contact. The following real attack receives its full tell.
      motion.pose = progress < .70 ? 'jab-windup' : 'guard';
      motion.dx = -5 * Math.sin(progress * Math.PI);
      motion.rotation = -.012 * Math.sin(progress * Math.PI);
      motion.phase = 'feint';
    } else if (action === 'surrender') {
      motion.pose = 'surrender'; motion.phase = 'surrender';
      motion.dx = 0; motion.dy = 0; motion.rotation = Math.sin(elapsed * 5) * .012;
    }
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
    const spacing = knockdownSpacing(this.who, bout);
    // Some symmetric uniforms reuse an authored pose in mirror. Combine this
    // asset correction with the directional dodge, rather than applying twice.
    const flip = Boolean(poseSpec.mirror) !== motion.flip;
    const originalTexture = `${this.texturePrefix}-${poseSpec.texturePose ?? motion.pose}`;
    const texture = player && !this.tournament ? boxingTexture(this.scene, originalTexture) : originalTexture;
    this.sprite.setTexture(texture)
      .setScale(this.baseScale)
      .setPosition(Math.round(this.x + dx + spacing), Math.round(this.feet + dy))
      .setRotation(motion.rotation).setFlipX(flip).setAlpha(motion.alpha);
    this.pose = motion.pose;
    this.phase = motion.phase;
    this.lastAction = action;
    this.lastProgress = progress;
    // Move the floor shadow by the same composition offset as its boxer.
    this.shadow.setPosition(this.x + dx * .7 + spacing, this.feet + dy * .8 - 3);
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
