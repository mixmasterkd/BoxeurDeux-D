import { boxingTexture } from './OutfitView.js';

const ANNOUNCEMENT_AT = 7;
const REFEREE_POSES = ['neutral', 'raise-left', 'raise-right'];

/** Presentation only. The session has already settled and saved the decision.
 * update(state, deltaSeconds) advances the reveal clock; pass zero while paused.
 * No timers, inputs, scoring changes, or scene transitions are owned here.
 */
export class DecisionView {
  static preload(scene) {
    const base = import.meta.env?.BASE_URL ?? '/';
    scene.load.json('referee-poses', `${base}assets/sprites/referee/fighters.json`);
    for (const pose of REFEREE_POSES) {
      if (!scene.textures.exists(`referee-${pose}`)) scene.load.image(`referee-${pose}`, `${base}assets/sprites/referee/${pose}.png`);
    }
  }

  constructor(scene, { player, remi }) {
    this.scene = scene;
    this.fighters = { player, remi };
    this.elapsed = 0;
    this.active = false;
    this.announced = false;
    this.refereeMetadata = scene.cache.json.get('referee-poses');
    this.layer = scene.add.container(0, 0).setDepth(3).setVisible(false);
    // A brief result cutaway uses the same authored venue, framed higher so
    // the three pairs of feet rest on canvas above the decision panel instead
    // of appearing to float against the back ropes. Combat framing is untouched.
    if (scene.backgroundKey && scene.textures.exists(scene.backgroundKey)) {
      const backdrop = scene.add.image(640, 200, scene.backgroundKey);
      backdrop.setScale(Math.max(1280 / backdrop.width, 720 / backdrop.height) * 1.32);
      this.layer.add(backdrop);
    }
    // Leave y >= 315 clear for the smallest landscape decision menu, and
    // y <= 70 clear for the combat HUD, including the overhead winning glove.
    this.height = 210;
    this.scale = this.height / 512;
    this.feet = 312;
    this.positions = { player: 557, remi: 745 };
    this.images = {};
    for (const who of ['player', 'remi']) {
      const shadow = scene.add.ellipse(this.positions[who], this.feet - 2, 100, 12, 0x08101a, .28);
      const image = scene.add.image(this.positions[who], this.feet, `${this.fighters[who].texturePrefix}-guard`);
      const metadata = this.fighters[who].metadata;
      image.setOrigin(metadata.anchor.x / metadata.canvas.width, metadata.anchor.y / metadata.canvas.height);
      this.images[who] = image;
      this.layer.add([shadow, image]);
    }
    this.layer.add(scene.add.ellipse(640, this.feet - 2, 98, 12, 0x08101a, .25));
    this.referee = scene.add.image(640, this.feet, 'referee-neutral')
      .setOrigin(320 / 640, 624 / 640).setScale(this.scale);
    // His hand can cover the winner's glove/wrist naturally at the announcement.
    this.layer.add(this.referee);
    this._pose('player', 'guard');
    this._pose('remi', 'guard');
  }

  _pose(who, pose) {
    const view = this.fighters[who];
    const metadata = view.metadata;
    const spec = metadata.poses[`${who}-${pose}`] ?? metadata.poses[`${who}-guard`];
    const texturePose = spec.texturePose ?? pose;
    const originalTexture = `${view.texturePrefix}-${texturePose}`;
    const texture = who === 'player' && !view.tournament ? boxingTexture(this.scene, originalTexture) : originalTexture;
    const safeTexture = this.scene.textures.exists(texture) ? texture : `${view.texturePrefix}-guard`;
    this.images[who].setTexture(safeTexture).setScale(this.height / metadata.artHeight)
      .setPosition(this.positions[who], this.feet).setFlipX(Boolean(spec.mirror)).setAlpha(1).setRotation(0);
    return spec;
  }

  /** Optional future fast-forward; scoring is unaffected. */
  reveal() { this.elapsed = Math.max(this.elapsed, ANNOUNCEMENT_AT); }

  update(state, deltaSeconds = 0) {
    const visible = state.phase === 'finished' && state.bout?.result?.reason === 'points';
    this.layer.setVisible(visible);
    if (!visible) {
      this.elapsed = 0;
      this.active = false;
      this.announced = false;
      return false;
    }
    if (!this.active) {
      this.announced = false;
      this.elapsed = 0;
      this.active = true;
      this._pose('player', 'guard');
      this._pose('remi', 'guard');
      this.referee.setTexture('referee-neutral');
    }
    this.elapsed = Math.min(ANNOUNCEMENT_AT, this.elapsed + Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    if (this.elapsed >= ANNOUNCEMENT_AT && !this.announced) {
      this.announced = true;
      const winner = state.bout.result.winner;
      if (winner === 'player') {
        // The authored player cross is an overhead arm extension seen from
        // behind. It provides a natural victory pose without cutting up limbs.
        const spec = this._pose('player', 'cross');
        const source = this.fighters.player;
        const scale = this.height / source.metadata.artHeight;
        const glove = spec.glove ?? spec.contact;
        const hand = this.refereeMetadata.poses['raise-left'].handLeft;
        if (glove) {
          const gloveX = (glove.x - source.anchor.x) * scale * (spec.mirror ? -1 : 1);
          const handX = 640 + (hand.x - 320) * this.scale;
          // The stance moves only a few pixels to meet the referee's hand;
          // the arm is raised by the authored pose, never by moving the body.
          this.images.player.x = Math.round(handX - gloveX);
        }
        this.referee.setTexture('referee-raise-left');
      } else if (winner === 'remi') {
        // Opponents currently have no authored overhead victory pose. Preserve
        // their exact identity and anatomy: the referee signals the winner's
        // side while that boxer remains in his own guard, rather than inventing
        // a disjointed arm from a forward-facing jab.
        this.referee.setTexture('referee-raise-right');
      }
    }
    return true;
  }

  destroy() { this.layer.destroy(true); }
}
