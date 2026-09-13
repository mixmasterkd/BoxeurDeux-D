import { boxingTexture, prepareBoxingOutfits } from './OutfitView.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const POSES = {
  rope: ['ready', 'load', 'left', 'right', 'land', 'stumble'],
  speedball: ['left-contact', 'left-return', 'right-contact', 'right-return'],
};

/** Authored adult boxer poses. Only cord, shadows and impact marks are geometry. */
export class RhythmTrainingView {
  static preload(scene) {
    const base = import.meta.env.BASE_URL;
    if (scene.fromCuba) scene.load.image('cuba-training-room', base + 'assets/cuba/gym-training.png');
    for (const id of Object.keys(POSES)) {
      scene.load.image(id + '-room', base + 'assets/backgrounds/' + id + '-training.png');
      scene.load.json(id + '-athlete-data', base + 'assets/sprites/' + id + '/player.json');
      for (const pose of POSES[id]) scene.load.image(id + '-athlete-' + pose, base + 'assets/sprites/' + id + '/player-' + pose + '.png');
    }
    scene.load.image('speedball-leather', base + 'assets/sprites/speedball/ball.png');
  }

  constructor(scene, activity) {
    this.scene = scene; this.activity = activity;
    prepareBoxingOutfits(scene, POSES[activity].map(pose => `${activity}-athlete-${pose}`));
    this.data = scene.cache.json.get(activity + '-athlete-data');
    this.anchor = this.data.anchor;
    scene.add.image(640, 360, scene.fromCuba ? 'cuba-training-room' : activity + '-room').setDisplaySize(1280, 720);
    this.ground = activity === 'rope' ? 602 : 620;
    this.baseX = activity === 'rope' ? 716 : 823;
    this.shadow = scene.add.ellipse(this.baseX, this.ground + 3, activity === 'rope' ? 144 : 155, 23, 0x04121e, .32).setDepth(2);
    this.ropeBack = scene.add.graphics().setDepth(3);
    this.sprite = scene.add.image(this.baseX, this.ground, boxingTexture(scene, activity + '-athlete-' + POSES[activity][0]))
      .setOrigin(this.anchor.x / this.data.canvas.width, this.anchor.y / this.data.canvas.height).setDepth(4);
    this.ropeFront = scene.add.graphics().setDepth(5);
    this.spark = scene.add.graphics().setDepth(7);
    if (activity === 'speedball') {
      this.pivot = { x: 926, y: 236 };
      const ball = this.data.ball;
      this.ball = scene.add.image(this.pivot.x, this.pivot.y, 'speedball-leather')
        .setOrigin(ball.pivot.x / ball.width, ball.pivot.y / ball.height).setDepth(5);
    }
    this.reset();
  }

  reset() { this.impact = null; this.lastHand = 'right'; this.contact = null; }

  onEvent(event) {
    if (event.type === 'hit' || event.type === 'miss') {
      this.impact = { ...event };
      if (event.input) this.lastHand = event.input === 'jab' ? 'left' : 'right';
    }
  }

  pose(name, x = this.baseX, y = this.ground) {
    this.poseName = name;
    this.sprite.setTexture(boxingTexture(this.scene, this.activity + '-athlete-' + name)).setPosition(x, y);
  }

  point(name) {
    const p = this.data.poses[this.poseName][name];
    return { x: this.sprite.x + p.x - this.anchor.x, y: this.sprite.y + p.y - this.anchor.y };
  }

  render(state) {
    this.ropeBack.clear(); this.ropeFront.clear(); this.spark.clear();
    if (this.activity === 'rope') this.renderRope(state); else this.renderSpeedball(state);
  }

  renderSpeedball(state) {
    const p = state.player, moving = p.action !== 'idle';
    const hand = moving ? p.input === 'jab' ? 'left' : 'right' : this.lastHand;
    const atContact = moving && p.phase === 'contact';
    // Small weight transfer, bent elbows and feet kept under the shoulders.
    const extension = !moving ? 0 : p.phase === 'windup' ? clamp(p.elapsed / p.contact)
      : atContact ? 1 : 1 - clamp((p.elapsed - p.contact - p.hold) / (p.duration - p.contact - p.hold));
    const shift = hand === 'right' ? 11 * extension : 0;
    this.pose(hand + '-' + (atContact ? 'contact' : 'return'), this.baseX + shift, this.ground);
    const elapsed = this.impact?.input ? state.elapsed - this.impact.time : Infinity;
    const rebound = clamp((elapsed - state.rules.hold) / (state.rules.interval - state.rules.hold));
    // Three rebounds; leather remains at the fist throughout the contact hold.
    const angle = elapsed < state.rules.hold || atContact ? 0
      : elapsed < state.rules.interval ? -Math.sin(rebound * Math.PI * 3) * 1.08 * (1 - rebound * .25) : 0;
    this.ball.setRotation(angle);
    this.contact = atContact ? { hand: this.point('glove'), target: { x: 902, y: 300 }, pose: this.poseName } : null;
    if (atContact) this.drawImpact(this.contact.target, p.status === 'hit', .7);
    this.shadow.setPosition(this.baseX + shift * .3, this.ground + 3);
  }

  renderRope(state) {
    const p = state.player, now = state.elapsed, moving = p.action !== 'idle';
    let pose = 'ready', jump = 0;
    if (moving) {
      const takeoff = clamp((p.elapsed - p.load) / (p.contact - p.load));
      const landing = clamp((p.elapsed - p.contact - p.hold) / (p.duration - p.contact - p.hold));
      if (p.elapsed < p.load) pose = 'load';
      else if (p.elapsed <= p.contact + p.hold) {
        pose = p.input === 'jab' ? 'left' : 'right';
        jump = 22 * Math.sin(takeoff * Math.PI / 2);
      } else { pose = landing < .6 ? (p.input === 'jab' ? 'left' : 'right') : 'land'; jump = 22 * (1 - landing); }
      if (p.status === 'miss') { pose = 'stumble'; jump *= .25; }
    } else if (this.impact?.type === 'miss' && now - this.impact.time < .24) pose = 'stumble';
    this.pose(pose, this.baseX, this.ground - jump);
    this.shadow.setScale(1 - jump / 150, 1).setAlpha(1 - jump / 90);
    const left = this.point('leftHandle'), right = this.point('rightHandle');
    // The wrists can adjust one revolution within the accepted timing window.
    // This aligns the visible underfoot passage with the scored contact.
    let adjustment = 0;
    if (moving && p.reserved) {
      const weight = p.elapsed <= p.contact + p.hold ? Math.sin(clamp(p.elapsed / p.contact) * Math.PI / 2)
        : 1 - clamp((p.elapsed - p.contact - p.hold) / (p.duration - p.contact - p.hold));
      adjustment = p.offset * weight;
    }
    const turning = state.phase !== 'ready' && state.phase !== 'finished';
    const angle = moving && p.phase === 'contact' && p.status === 'hit' ? 0
      : turning ? (now - adjustment - state.rules.preparation - state.rules.contact) / state.rules.interval * TAU : 0;
    const vertical = Math.cos(angle), front = Math.sin(angle) < 0;
    const midY = (left.y + right.y) / 2;
    const radius = vertical >= 0 ? this.ground + 7 - midY : 228;
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const u = i / 48, arc = Math.sin(Math.PI * u);
      const spread = -Math.sin(TAU * u) * 24 * arc;
      points.push({ x: left.x + (right.x - left.x) * u + spread, y: left.y + (right.y - left.y) * u + arc * radius * vertical });
    }
    const graphics = front ? this.ropeFront : this.ropeBack;
    // Dark outline + warm bright cord stay visible over both mat and windows.
    for (const [width, color, alpha] of [[7, 0x152029, .94], [4, 0xffd18a, 1]]) {
      graphics.lineStyle(width, color, alpha).beginPath().moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.strokePath();
    }
    const underfoot = points[24];
    this.contact = moving && p.phase === 'contact' ? { rope: underfoot, feetY: this.sprite.y, pose, jump } : null;
    if (this.contact && p.status === 'hit') this.drawImpact({ x: underfoot.x, y: this.ground + 7 }, true, .65);
  }

  drawImpact({ x, y }, good, scale = 1) {
    this.spark.lineStyle(3, good ? 0xffe8b0 : 0xe99478, .85);
    for (const [dx, dy] of [[-1, -.7], [0, -1], [1, -.7]]) {
      this.spark.lineBetween(x + dx * 18 * scale, y + dy * 18 * scale, x + dx * 27 * scale, y + dy * 27 * scale);
    }
  }
}
