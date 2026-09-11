import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RhythmSession } from '../src/game/RhythmSession.js';
import { RhythmTrainingView } from '../src/scenes/RhythmTrainingView.js';
import { readPng } from '../scripts/sprite-png.mjs';

const spriteUrl = file => new URL(`../public/assets/sprites/${file}`, import.meta.url);
const atlases = Object.fromEntries(['rope', 'speedball'].map(activity => [activity,
  JSON.parse(readFileSync(spriteUrl(`${activity}/player.json`))),
]));
const images = new Map();
for (const [activity, atlas] of Object.entries(atlases)) {
  for (const [pose, spec] of Object.entries(atlas.poses)) images.set(`${activity}-athlete-${pose}`, readPng(spriteUrl(spec.file)));
  if (atlas.ball) images.set('speedball-leather', readPng(spriteUrl(atlas.ball.file)));
}

function object(x = 0, y = 0, key) {
  return {
    x, y, texture: { key }, origin: { x: .5, y: .5 }, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1,
    setOrigin(x, y) { this.origin = { x, y }; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setDepth(depth) { this.depth = depth; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setTexture(key) { this.texture = { key }; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
  };
}
function graphics() {
  const result = object();
  Object.assign(result, {
    paths: [], segments: [], style: null, current: [],
    clear() { this.paths = []; this.segments = []; this.current = []; return this; },
    lineStyle(width, color, alpha) { this.style = { width, color, alpha }; return this; },
    beginPath() { this.current = []; return this; },
    moveTo(x, y) { this.current.push({ x, y }); return this; },
    lineTo(x, y) { this.current.push({ x, y }); return this; },
    strokePath() { this.paths.push({ style: { ...this.style }, points: [...this.current] }); return this; },
    lineBetween(x1, y1, x2, y2) { this.segments.push({ x1, y1, x2, y2, style: { ...this.style } }); return this; },
  });
  return result;
}
function scene() {
  return {
    cache: { json: { get: key => atlases[key.replace('-athlete-data', '')] } },
    add: { image: object, ellipse: object, graphics },
  };
}
function near(actual, expected, tolerance = 1e-7, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, message ?? `${actual} should be near ${expected}`);
}
function world(sprite, point, png = images.get(sprite.texture.key)) {
  const x = (point.x - sprite.origin.x * png.width) * sprite.scaleX;
  const y = (point.y - sprite.origin.y * png.height) * sprite.scaleY;
  const c = Math.cos(sprite.rotation), s = Math.sin(sprite.rotation);
  return { x: sprite.x + x * c - y * s, y: sprite.y + x * s + y * c };
}
function alpha(png, { x, y }) { return png.pixels[(Math.round(y) * png.width + Math.round(x)) * 4 + 3]; }
function visibleBounds(png) {
  let left = png.width, top = png.height, right = -1, bottom = -1;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    if (!png.pixels[(y * png.width + x) * 4 + 3]) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { left, right, top, bottom };
}
const boundsByTexture = new Map([...images].map(([key, png]) => [key, visibleBounds(png)]));
function inCamera(sprite) {
  const b = boundsByTexture.get(sprite.texture.key);
  for (const [x, y] of [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]]) {
    const point = world(sprite, { x, y });
    assert.ok(point.x > 0 && point.x < 1280 && point.y > 0 && point.y < 720,
      `${sprite.texture.key} has cropped art at ${point.x}, ${point.y}`);
  }
}
function lowestBoot(png) {
  const b = visibleBounds(png);
  let xTotal = 0, yTotal = 0, count = 0;
  for (let y = b.bottom - 39; y <= b.bottom; y++) for (let x = 0; x < png.width; x++) {
    const at = (y * png.width + x) * 4, [r, g, blue, a] = png.pixels.subarray(at, at + 4);
    if (a > 220 && blue > 85 && blue > r * 1.3 && blue > g * 1.1) { xTotal += x; yTotal += y; count++; }
  }
  assert.ok(count > 300, 'The lowest foot contains a complete visible blue boxing boot.');
  return { x: xTotal / count, y: yTotal / count, bottom: b.bottom };
}
function distanceToVisibleBall(point, ball) {
  const png = images.get(ball.texture.key);
  let distance = Infinity;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    if (png.pixels[(y * png.width + x) * 4 + 3] < 220) continue;
    const pixel = world(ball, { x, y }, png);
    distance = Math.min(distance, Math.hypot(point.x - pixel.x, point.y - pixel.y));
  }
  return distance;
}
function cordPath(view) {
  const paths = [...view.ropeFront.paths, ...view.ropeBack.paths];
  assert.ok(paths.length >= 1, 'The rope has a rendered path.');
  return paths.reduce((best, path) => !best || path.style.width < best.style.width ? path : best, null).points;
}
function renderStep(session, view, seconds) {
  session.update(seconds);
  const events = session.drainEvents();
  for (const event of events) view.onEvent(event);
  view.render(session.state);
  inCamera(view.sprite);
  if (view.ball) inCamera(view.ball);
  return events;
}

test('training sprites have real transparent surroundings, clean alpha, complete feet and consistent canvas sizes', () => {
  for (const [activity, atlas] of Object.entries(atlases)) {
    const hashes = new Set();
    for (const [pose, spec] of Object.entries(atlas.poses)) {
      const key = `${activity}-athlete-${pose}`, png = images.get(key), b = boundsByTexture.get(key);
      assert.equal(png.width, atlas.canvas.width); assert.equal(png.height, atlas.canvas.height);
      assert.equal(spec.width, png.width); assert.equal(spec.height, png.height);
      assert.deepEqual(spec.anchor, atlas.anchor);
      let clear = 0, solid = 0;
      for (let at = 0; at < png.pixels.length; at += 4) {
        const a = png.pixels[at + 3];
        if (a === 0) {
          clear++;
          assert.equal(png.pixels[at] + png.pixels[at + 1] + png.pixels[at + 2], 0, `${key}: no colored matte in transparent pixels`);
        } else assert.ok(a > 16, `${key}: segmentation residue must not survive as barely visible pixels`);
        if (a > 220) solid++;
      }
      assert.ok(clear > png.width * png.height * .5 && solid > 25000, `${key}: genuine cutout and a full-sized boxer`);
      assert.ok(b.left >= 12 && b.top >= 12 && b.right < png.width - 12 && b.bottom < png.height - 12, `${key}: silhouette needs clear padding on every edge`);
      assert.equal(b.bottom + 1, atlas.anchor.y, `${key}: complete boots share the floor anchor`);
      assert.ok(spec.bounds.x <= b.left && spec.bounds.y <= b.top);
      assert.ok(spec.bounds.x + spec.bounds.width > b.right && spec.bounds.y + spec.bounds.height > b.bottom);
      lowestBoot(png);
      hashes.add(createHash('sha256').update(png.pixels).digest('hex'));
    }
    assert.equal(hashes.size, Object.keys(atlas.poses).length, 'Every movement uses distinct authored pixels.');
  }
  const ball = images.get('speedball-leather'), bounds = visibleBounds(ball);
  assert.equal(ball.width, atlases.speedball.ball.width);
  assert.equal(ball.height, atlases.speedball.ball.height);
  assert.ok(bounds.left > 0 && bounds.top > 0 && bounds.right < ball.width - 1 && bounds.bottom < ball.height - 1);
});

test('rope poses truly alternate the supporting leg and the handles attach to visible authored hands', () => {
  const atlas = atlases.rope;
  const left = lowestBoot(images.get('rope-athlete-left'));
  const right = lowestBoot(images.get('rope-athlete-right'));
  assert.ok(left.x > atlas.anchor.x + 8, 'The left-step pose has its lowest boot on the right of the image.');
  assert.ok(right.x < atlas.anchor.x - 25, 'The right-step pose moves the lowest boot to the other side.');
  assert.ok(left.x - right.x > 45, 'The two appuis cannot be a duplicated pose shifted a few pixels.');
  for (const [pose, spec] of Object.entries(atlas.poses)) {
    const png = images.get(`rope-athlete-${pose}`);
    for (const handle of [spec.leftHandle, spec.rightHandle]) {
      assert.ok(handle && Number.isFinite(handle.x) && Number.isFinite(handle.y));
      assert.ok(alpha(png, handle) > 220, `${pose}: the cord landmark must be on a real opaque handle, not empty air`);
    }
    assert.ok(spec.leftHandle.x < atlas.anchor.x - 70 && spec.rightHandle.x > atlas.anchor.x + 70, 'Two separate handles flank the torso.');
  }
  for (const [pose, spec] of Object.entries(atlases.speedball.poses)) {
    assert.ok(alpha(images.get(`speedball-athlete-${pose}`), spec.glove) > 220, `${pose}: the contact point belongs to the visible hand`);
  }
});

test('both speedball hands meet actual leather pixels on their scored frame at 20/60 Hz, including timing tolerance', () => {
  for (const hz of [20, 60]) for (const offset of [-.15, 0, .15]) {
    const session = new RhythmSession({ activity: 'speedball' }), view = new RhythmTrainingView(scene(), 'speedball');
    session.start(); session.drainEvents();
    const scoredHands = new Set(), seen = new Set();
    for (const input of ['jab', 'cross']) {
      renderStep(session, view, session.state.beat.inputAt + offset - session.state.elapsed);
      const oldHits = session.state.stats.hits;
      assert.equal(session.act(input), true);
      view.render(session.state);
      assert.equal(session.state.stats.hits, oldHits);
      assert.equal(view.contact, null, 'Input is a windup, not a scored contact pose.');
      while (session.state.player.action !== 'idle') {
        const events = renderStep(session, view, 1 / hz);
        seen.add(view.poseName);
        for (const event of events) {
          if (event.type !== 'hit') continue;
          const hand = event.input === 'jab' ? 'left' : 'right';
          assert.equal(session.state.player.phase, 'contact');
          assert.equal(view.sprite.texture.key, `speedball-athlete-${hand}-contact`);
          const point = world(view.sprite, atlases.speedball.poses[`${hand}-contact`].glove);
          assert.ok(distanceToVisibleBall(point, view.ball) <= 8, `${hand} at ${hz} Hz must visibly touch leather, rather than a separate abstract target`);
          assert.ok(view.contact && Math.hypot(point.x - view.contact.target.x, point.y - view.contact.target.y) <= 8);
          assert.equal(session.state.stats.hits, oldHits + 1);
          scoredHands.add(hand);
        }
      }
    }
    assert.deepEqual([...scoredHands], ['left', 'right']);
    for (const pose of ['left-return', 'left-contact', 'right-return', 'right-contact']) assert.ok(seen.has(pose), `${pose}: motion must include contact and return`);
  }
});

test('the drawn cord passes beneath the airborne boot exactly when either appui scores at 20/60 Hz', () => {
  for (const hz of [20, 60]) for (const offset of [-.18, 0, .18]) {
    const session = new RhythmSession({ activity: 'rope' }), view = new RhythmTrainingView(scene(), 'rope');
    session.start(); session.drainEvents();
    const scoredPoses = new Set();
    for (const input of ['jab', 'cross']) {
      renderStep(session, view, session.state.beat.inputAt + offset - session.state.elapsed);
      const oldHits = session.state.stats.hits;
      assert.equal(session.act(input), true);
      view.render(session.state);
      assert.equal(session.state.stats.hits, oldHits);
      assert.equal(view.contact, null);
      while (session.state.player.action !== 'idle') {
        const events = renderStep(session, view, 1 / hz);
        const spec = atlases.rope.poses[view.poseName], path = cordPath(view);
        for (const [point, landmark] of [[path[0], spec.leftHandle], [path.at(-1), spec.rightHandle]]) {
          const handle = world(view.sprite, landmark);
          near(point.x, handle.x); near(point.y, handle.y);
        }
        for (const event of events) {
          if (event.type !== 'hit') continue;
          const pose = event.input === 'jab' ? 'left' : 'right';
          assert.equal(view.poseName, pose);
          assert.equal(session.state.player.phase, 'contact');
          assert.equal(session.state.stats.hits, oldHits + 1);
          const boot = lowestBoot(images.get(view.sprite.texture.key));
          const toe = world(view.sprite, { x: boot.x, y: boot.bottom });
          const underBoot = path.reduce((closest, point) => Math.abs(point.x - toe.x) < Math.abs(closest.x - toe.x) ? point : closest);
          assert.ok(Math.abs(underBoot.x - toe.x) < 8, 'The visible cord crosses the supporting foot’s horizontal position.');
          assert.ok(underBoot.y > toe.y + 3, `${pose}: the scored cord is actually below the boot`);
          assert.ok(underBoot.y <= view.shadow.y + 9, 'The cord remains on the gym floor instead of dropping below the scene.');
          assert.ok(view.shadow.y - toe.y > 15, 'A scored jump has visible clearance above the floor.');
          assert.ok(view.contact && view.contact.jump > 15);
          scoredPoses.add(pose);
        }
      }
    }
    assert.deepEqual([...scoredPoses], ['left', 'right']);
  }
});

test('idle training never jumps by itself and pausing preserves the actual drawn contact pose', () => {
  for (const activity of ['rope', 'speedball']) {
    const session = new RhythmSession({ activity }), view = new RhythmTrainingView(scene(), activity);
    session.start(); session.drainEvents(); view.render(session.state);
    const floor = view.sprite.y;
    for (let frame = 0; frame < 30; frame++) {
      renderStep(session, view, 1 / 60);
      assert.equal(session.state.player.action, 'idle');
      assert.equal(view.sprite.y, floor);
      assert.equal(session.state.stats.hits, 0);
    }
    renderStep(session, view, session.state.beat.inputAt - session.state.elapsed);
    session.act('jab'); renderStep(session, view, session.rules.contact);
    const snapshot = () => structuredClone({
      sprite: { x: view.sprite.x, y: view.sprite.y, texture: view.sprite.texture },
      ballRotation: view.ball?.rotation, cord: [...view.ropeBack.paths, ...view.ropeFront.paths],
      contact: view.contact, hits: session.state.stats.hits,
    });
    const before = snapshot();
    session.pause(); renderStep(session, view, 5);
    assert.deepEqual(snapshot(), before, 'Pausing preserves both the model clock and the rendered action.');
  }
});
