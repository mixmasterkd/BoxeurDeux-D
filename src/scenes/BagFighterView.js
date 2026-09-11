const ASSETS = 'assets/sprites/bag-orthodox/';
const POSES = ['guard', 'windup', 'jab', 'cross', 'hook-windup', 'hook'];
const EPSILON = 1e-9; // Same contact boundary as BagSession.
const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const smooth = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };

/** Authored poses and visual reactions. Only BagSession scores contacts. */
export class BagFighterView {
  static preload(scene) {
    const base = import.meta.env.BASE_URL;
    scene.load.image('bag-room', `${base}assets/backgrounds/bag-training.png`);
    scene.load.json('bag-fighters', `${base}${ASSETS}fighters.json`);
    scene.load.image('heavy-bag', `${base}assets/sprites/bag/heavy-bag.png`);
    for (const pose of POSES) scene.load.image(`bag-player-${pose}`, `${base}${ASSETS}player-${pose}.png`);
  }

  constructor(scene) {
    this.scene = scene;
    this.metadata = scene.cache.json.get('bag-fighters');
    this.anchor = this.metadata.anchor;
    this.x = 595;
    this.feet = 618;
    this.pivot = { x: 835, y: 85 };
    this.background = scene.add.image(640, 360, 'bag-room').setDisplaySize(1280, 720).setDepth(0);
    // Continue the authored chain to the top edge, so its pivot is suspended
    // from the ceiling rather than appearing to float in front of the window.
    this.suspension = scene.add.graphics().setDepth(1);
    this.suspension.lineStyle(3, 0x171819, 1);
    for (let y = -4; y < this.pivot.y - 2; y += 9) this.suspension.strokeRoundedRect(this.pivot.x - 3, y, 6, 12, 3);
    this.bagShadow = scene.add.ellipse(835, 612, 145, 28, 0x061526, .24).setDepth(1);
    this.playerShadow = scene.add.ellipse(this.x - 8, this.feet - 5, 202, 28, 0x061526, .27).setDepth(2);
    const bag = this.metadata.bag;
    this.bag = scene.add.image(this.pivot.x, this.pivot.y, 'heavy-bag')
      .setOrigin(bag.pivot.x / bag.width, bag.pivot.y / bag.height).setDepth(3);
    this.sprite = scene.add.image(this.x, this.feet, 'bag-player-guard')
      .setOrigin(this.anchor.x / this.metadata.canvas.width, this.anchor.y / this.metadata.canvas.height)
      .setDepth(4);
    this.spark = scene.add.graphics().setDepth(6);
    this.pose = 'guard';
    this.lastAction = 'idle';
    this.lastElapsed = 0;
    this.impulses = [];
    this.impactMark = null;
    this.attackAim = null;
    this.contactPoint = this.targetPoint();
  }

  targetPoint() {
    const data = this.metadata.bag;
    const dx = data.target.x - data.pivot.x;
    const dy = data.target.y - data.pivot.y;
    const angle = this.bag.rotation;
    return {
      x: this.pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: this.pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle),
    };
  }

  /** Call once for each bag-hit event, at the model's event.time in seconds. */
  impact(attack, result, time) {
    // Record where the glove actually met the leather before its recoil.
    const point = { ...this.contactPoint };
    this.impulses.push({ time, strength: attack === 'hook' ? .09 : attack === 'cross' ? .065 : .045 });
    this.impactMark = { time, point, result, attack };
  }

  reset() {
    this.impulses = [];
    this.impactMark = null;
    this.attackAim = null;
    this.lastAction = 'idle';
    this.lastElapsed = 0;
    this.bag.setRotation(0);
    this.spark.clear();
  }

  /** player is BagSession's snapshot.player; time uses its paused-aware clock. */
  render(player, time = 0) {
    this.impulses = this.impulses.filter((hit) => time >= hit.time && time - hit.time < 4);
    let angle = 0;
    for (const hit of this.impulses) {
      const age = time - hit.time;
      angle -= hit.strength * Math.sin(age * 8.5) * Math.exp(-age * 2.5);
    }
    this.bag.setRotation(clamp(angle, -.14, .14));
    this.bagShadow.setPosition(this.pivot.x - Math.sin(this.bag.rotation) * 490, 612);

    const action = player.action ?? 'idle';
    const elapsed = player.elapsed ?? 0;
    const attacking = ['jab', 'cross', 'hook'].includes(action);
    let dx = 0;
    let dy = Math.sin(time * 5.2) * 1.8;
    let pose = 'guard';
    let phase = 'guard';
    if (attacking) {
      if (this.lastAction !== action || elapsed < this.lastElapsed) this.attackAim = null;
      const contact = player.contact ?? player.duration * player.impact;
      const hold = player.hold ?? .1;
      const duration = player.duration;
      const isContact = elapsed + EPSILON >= contact && elapsed + EPSILON < contact + hold;
      const isRecovering = elapsed + EPSILON >= contact + hold;
      const target = this.targetPoint();
      // Reacquire on the exact first contact frame: an already swinging bag
      // may have moved since the final anticipation frame.
      if (elapsed + EPSILON < contact || (isContact && this.phase !== 'contact')) this.attackAim = target;
      if (!this.attackAim) this.attackAim = target;
      const glove = this.metadata.poses[action].contact;
      const baseContact = { x: this.x + glove.x - this.anchor.x, y: this.feet + glove.y - this.anchor.y };
      const aim = this.attackAim;
      const reach = isContact ? 1 : isRecovering
        ? 1 - smooth((elapsed - contact - hold) / Math.max(.01, duration - contact - hold))
        : smooth(elapsed / contact);
      // The hook's bent arm has less range: a visible, timed step inward.
      // Contacts share the real leather surface instead of arbitrary offsets.
      dx = (aim.x - baseContact.x) * reach;
      dy = (aim.y - baseContact.y) * reach;
      phase = isContact ? 'contact' : isRecovering ? 'recovery' : 'anticipation';
      pose = isContact ? action : action === 'hook' ? 'hook-windup' : 'windup';
      if (isRecovering && elapsed > contact + hold + (duration - contact - hold) * .6) pose = 'guard';
      // The impact drawing is selected on precisely the same model tick as
      // scoring. It stays readable for the model's full contact hold.
    } else {
      this.attackAim = null;
    }
    this.sprite.setTexture(`bag-player-${pose}`).setPosition(Math.round(this.x + dx), Math.round(this.feet + dy));
    this.playerShadow.setPosition(this.x - 8 + dx, this.feet - 5 + dy * .2);
    this.pose = pose;
    this.phase = phase;
    this.lastAction = action;
    this.lastElapsed = elapsed;
    const glove = this.metadata.poses[pose].contact;
    this.contactPoint = glove ? {
      x: this.sprite.x + glove.x - this.anchor.x,
      y: this.sprite.y + glove.y - this.anchor.y,
    } : this.targetPoint();
    this.drawImpact(time);
  }

  drawImpact(time) {
    this.spark.clear();
    if (!this.impactMark) return;
    const mark = this.impactMark;
    const age = time - mark.time;
    if (age < 0 || age > .18) return;
    const color = mark.result === 'perfect' ? 0xffe7a3
      : ['good', 'free'].includes(mark.result) ? 0xd4f4ef : 0xd3b99b;
    const fade = 1 - age / .18;
    const radius = 10 + age * 50;
    this.spark.lineStyle(3, color, fade);
    for (let i = 0; i < 6; i += 1) {
      const a = i * Math.PI / 3;
      this.spark.lineBetween(mark.point.x + Math.cos(a) * radius, mark.point.y + Math.sin(a) * radius,
        mark.point.x + Math.cos(a) * (radius + 8), mark.point.y + Math.sin(a) * (radius + 8));
    }
    this.spark.fillStyle(color, fade * .8).fillRect(mark.point.x - 3, mark.point.y - 3, 6, 6);
  }

  destroy() {
    for (const object of [this.background, this.suspension, this.bagShadow, this.playerShadow, this.bag, this.sprite, this.spark]) object.destroy();
  }
}
