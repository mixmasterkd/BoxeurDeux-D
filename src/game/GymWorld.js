// World coordinates are the centre of the boxer's footprint, at his feet.
// Keep the layout separate from movement so the art and its colliders can be
// aligned without changing the controller. The camera remains 1280 × 720.
export const GYM_LAYOUT = {
  width: 1280,
  height: 720,
  speed: 200,
  footprint: { halfWidth: 14, halfHeight: 7 },
  spawn: { x: 640, y: 585, facing: 'up' },
  bounds: { left: 64, right: 1216, top: 213, bottom: 666 },
  obstacles: [
    { id: 'ring', x: 425, y: 211, width: 450, height: 228 },
    { id: 'marches', x: 790, y: 437, width: 70, height: 33 },
    { id: 'remi', x: 899, y: 458, width: 32, height: 20 },
    { id: 'sac', x: 197, y: 237, width: 60, height: 29 },
    { id: 'banc-gauche', x: 64, y: 320, width: 70, height: 111 },
    { id: 'banc-droit', x: 1162, y: 399, width: 55, height: 180 },
    { id: 'casiers', x: 1172, y: 213, width: 44, height: 115 },
  ],
  stations: [
    { id: 'remi', label: 'Rémi le Tank', x: 915, y: 470, radius: 85, kind: 'sparring' },
    { id: 'sac', label: 'Sac de frappe', x: 226, y: 275, radius: 65, kind: 'bag' },
    { id: 'miroir', label: 'Miroir', x: 125, y: 217, radius: 65, kind: 'shadow' },
    { id: 'speedball', label: 'Speed ball', x: 1070, y: 237, radius: 80, kind: 'preview' },
    { id: 'corde', label: 'Corde à danser', x: 210, y: 537, radius: 85, kind: 'preview' },
    { id: 'porte', label: 'Sortie du gym', x: 640, y: 659, radius: 50, kind: 'exit' },
  ],
};

const EPSILON = 1e-7;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const axis = (value) => Number.isFinite(value) ? clamp(value, -1, 1) : 0;

function contains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

// Segment/AABB intersection. A station's own equipment does not obscure it,
// but an intervening ring or wall does, even when the prompt is within range.
function blocksView(rect, from, to) {
  if (contains(rect, to.x, to.y)) return false;
  let first = 0;
  let last = 1;
  for (const [position, delta, low, high] of [
    [from.x, to.x - from.x, rect.x, rect.x + rect.width],
    [from.y, to.y - from.y, rect.y, rect.y + rect.height],
  ]) {
    if (Math.abs(delta) < EPSILON) {
      if (position < low || position > high) return false;
      continue;
    }
    const a = (low - position) / delta;
    const b = (high - position) / delta;
    first = Math.max(first, Math.min(a, b));
    last = Math.min(last, Math.max(a, b));
    if (first > last) return false;
  }
  return last > EPSILON && first < 1 - EPSILON;
}

export class GymWorld {
  constructor({ layout = GYM_LAYOUT } = {}) {
    this.layout = layout;
    this.input = { x: 0, y: 0 };
    const spawn = layout.spawn || GYM_LAYOUT.spawn;
    this.state = {
      x: spawn.x,
      y: spawn.y,
      facing: spawn.facing || 'down',
      moving: false,
      walkTime: 0,
      paused: false,
      nearby: null,
    };
    this.getNearby();
  }

  setInput({ x = 0, y = 0 } = {}) {
    if (this.state.paused) return;
    this.input.x = axis(x);
    this.input.y = axis(y);
    if (!this.input.x && !this.input.y) this.state.moving = false;
  }

  releaseControls() {
    this.input.x = 0;
    this.input.y = 0;
    this.state.moving = false;
  }

  pause() {
    this.releaseControls();
    this.state.paused = true;
  }

  resume() {
    // Focus restoration and returning from the ring must never reuse a held
    // key. The caller supplies a new input after the user resumes control.
    this.releaseControls();
    this.state.paused = false;
    this.getNearby();
  }

  update(dt) {
    if (this.state.paused || !Number.isFinite(dt) || dt <= 0) return this.state;
    const { x: inputX, y: inputY } = this.input;
    const length = Math.hypot(inputX, inputY);
    if (!length) {
      this.state.moving = false;
      this.getNearby();
      return this.state;
    }

    this.face(inputX, inputY);
    // Discard excess time after a stalled tab. Even the full accepted second
    // is collision checked in small steps, so thin equipment cannot be skipped.
    const seconds = Math.min(dt, 1);
    const speed = this.layout.speed ?? GYM_LAYOUT.speed;
    const normalization = Math.max(1, length);
    const dx = inputX / normalization * speed * seconds;
    const dy = inputY / normalization * speed * seconds;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    let distance = 0;
    for (let step = 0; step < steps; step += 1) {
      const beforeX = this.state.x;
      const beforeY = this.state.y;
      this.moveAxis('x', dx / steps);
      this.moveAxis('y', dy / steps);
      distance += Math.hypot(this.state.x - beforeX, this.state.y - beforeY);
    }
    this.state.moving = distance > EPSILON;
    this.state.walkTime += distance / speed;
    this.getNearby();
    return this.state;
  }

  face(x, y) {
    if (Math.abs(x) > Math.abs(y)) this.state.facing = x < 0 ? 'left' : 'right';
    else if (Math.abs(y) > Math.abs(x)) this.state.facing = y < 0 ? 'up' : 'down';
    else {
      // Keep a steady direction during a diagonal instead of flickering when
      // two keys or the two touch axes arrive on consecutive frames.
      const facing = this.state.facing;
      const stillMatches = (facing === 'left' && x < 0) || (facing === 'right' && x > 0)
        || (facing === 'up' && y < 0) || (facing === 'down' && y > 0);
      if (!stillMatches) this.state.facing = y < 0 ? 'up' : 'down';
    }
  }

  moveAxis(direction, amount) {
    if (!amount) return;
    const bounds = this.layout.bounds || GYM_LAYOUT.bounds;
    const foot = this.layout.footprint || GYM_LAYOUT.footprint;
    const horizontal = direction === 'x';
    const radius = horizontal ? foot.halfWidth : foot.halfHeight;
    const crossRadius = horizontal ? foot.halfHeight : foot.halfWidth;
    const crossPosition = horizontal ? this.state.y : this.state.x;
    const previous = this.state[direction];
    let next = clamp(previous + amount,
      (horizontal ? bounds.left : bounds.top) + radius,
      (horizontal ? bounds.right : bounds.bottom) - radius);

    for (const obstacle of this.layout.obstacles || []) {
      const near = horizontal ? obstacle.x : obstacle.y;
      const far = near + (horizontal ? obstacle.width : obstacle.height);
      const crossNear = horizontal ? obstacle.y : obstacle.x;
      const crossFar = crossNear + (horizontal ? obstacle.height : obstacle.width);
      if (crossPosition + crossRadius <= crossNear + EPSILON
        || crossPosition - crossRadius >= crossFar - EPSILON) continue;
      if (amount > 0 && previous + radius <= near + EPSILON && next + radius > near) {
        next = Math.min(next, near - radius);
      } else if (amount < 0 && previous - radius >= far - EPSILON && next - radius < far) {
        next = Math.max(next, far + radius);
      }
    }
    this.state[direction] = next;
  }

  getNearby() {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const station of this.layout.stations || []) {
      const distance = Math.hypot(station.x - this.state.x, station.y - this.state.y);
      if (distance > (station.radius ?? 75) || distance >= nearestDistance) continue;
      if ((this.layout.obstacles || []).some((rect) => blocksView(rect, this.state, station))) continue;
      nearest = station;
      nearestDistance = distance;
    }
    this.state.nearby = nearest;
    return nearest;
  }
}
