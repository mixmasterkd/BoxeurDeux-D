import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FighterView } from '../src/scenes/FighterView.js';
import { fighterMotion, knockdownSpacing, transformFighterPoint } from '../src/game/FighterMotion.js';
import { KNOCKDOWN_RULES, TIMINGS } from '../src/game/SparringSession.js';
import { readPng } from '../scripts/sprite-png.mjs';

const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const atlases = {
  fighters: json('../public/assets/sprites/sparring-v2/fighters.json'),
  'fighters-hook': json('../public/assets/sprites/sparring-hook/fighters.json'),
  'fighters-body': json('../public/assets/sprites/body-training/sparring.json'),
  'fighters-knockdown': json('../public/assets/sprites/knockdown/fighters.json'),
};
const atlas = atlases['fighters-knockdown'];
function displayObject(x, y) {
  return {
    x, y, rotation: 0, flipX: false,
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setScale(scale) { this.scaleX = this.scaleY = scale; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
    setFlipX(flip) { this.flipX = flip; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setTexture(key) { this.texture = { key }; return this; },
  };
}
function view(who) {
  return new FighterView({ cache: { json: { get: key => atlases[key] } }, add: { image: displayObject, ellipse: displayObject } }, who, 640, who === 'player' ? 718 : 592, 390);
}

function renderedBounds(boxer) {
  const b = boxer.metadata.poses[`${boxer.who}-${boxer.pose}`].bounds;
  const points = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
    .map(([x, y]) => transformFighterPoint({ x, y }, boxer.anchor, {
      x: boxer.sprite.x, y: boxer.sprite.y, scale: boxer.sprite.scaleX,
      rotation: boxer.sprite.rotation, flip: boxer.sprite.flipX,
    }));
  return {
    left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
    top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)),
  };
}

const remiCount = (stage, elapsed, extras = {}) => ({
  count: { stage, elapsed, hold: 0, downed: { player: false, remi: true }, ...extras },
});

test('knockdown artwork has real alpha and keeps seated bodies physically shorter than standing', () => {
  assert.deepEqual(atlas.canvas, { width: 384, height: 640 });
  assert.deepEqual(atlas.anchor, { x: 192, y: 624 });
  for (const who of ['player', 'remi']) {
    const heights = {};
    const sources = new Set();
    for (const pose of ['fall', 'down', 'rise']) {
      const spec = atlas.poses[`${who}-${pose}`];
      assert.ok(spec && spec.head && spec.body, `${who}-${pose} has target landmarks`);
      const image = readPng(new URL(`../public/assets/sprites/knockdown/${who}-${pose}.png`, import.meta.url));
      assert.deepEqual([image.width, image.height], [384, 640]);
      let opaque = 0, clear = 0;
      for (let i = 3; i < image.pixels.length; i += 4) {
        if (image.pixels[i] === 0) clear++;
        if (image.pixels[i] > 16) opaque++;
      }
      assert.ok(clear > image.width * image.height * .5, 'empty canvas must be genuinely transparent');
      assert.ok(opaque > 12000, 'complete detailed boxer pixels must remain');
      const b = spec.bounds;
      assert.equal(b.y + b.height, 624, 'the grounded boot/knee shares the exact floor baseline');
      assert.ok(b.x >= 0 && b.x + b.width <= 384 && b.y > 112, 'the entire lowered silhouette fits below standing height');
      heights[pose] = b.height;
      sources.add(JSON.stringify(spec.sourceBounds));
    }
    assert.equal(sources.size, 3, 'fall, seated and rise are separately authored poses');
    assert.ok(heights.down < heights.fall && heights.down < heights.rise, `${who}: the seated pose really lowers the body`);
    assert.ok(heights.rise < 512 && heights.fall < 512);
  }
});

test('a committed glove contact releases into grounded knockdown poses without stretching or residual aim', () => {
  for (const who of ['player', 'remi']) {
    const boxer = view(who);
    boxer.target = { x: 640, y: 355 };
    const punch = TIMINGS[who].jab;
    boxer.render({ action: 'jab', ...punch, progress: punch.impact, target: 'head' }, 1);
    assert.ok(boxer.attackAim, 'the preceding real contact has a frozen punch aim');
    const scale = boxer.baseScale;
    for (const action of ['fall', 'down', 'rise']) {
      for (const progress of [0, .1, .25, .5, .8, 1]) {
        boxer.render({ action, progress, hurt: 1, target: 'body' }, 2 + progress);
        assert.equal(boxer.attackAim, null, 'a down boxer cannot retain an extended attack target');
        assert.equal(boxer.sprite.scaleX, scale);
        assert.equal(boxer.sprite.scaleY, scale, 'shorter poses must never scale up to standing height');
        assert.ok(atlas.poses[`${who}-${boxer.pose}`] || boxer.pose === 'guard');
        assert.equal(boxer.sprite.flipX, false, 'the authored stance is not replaced by a mirrored body');
        if (boxer.pose !== 'guard') {
          assert.deepEqual([boxer.sprite.x, boxer.sprite.y, boxer.sprite.rotation], [boxer.x, boxer.feet, 0]);
        }
        const ground = transformFighterPoint(atlas.anchor, atlas.anchor, {
          x: boxer.sprite.x, y: boxer.sprite.y, scale, rotation: boxer.sprite.rotation,
        });
        assert.ok(Math.abs(ground.y - boxer.feet) <= 2, 'the anchored floor point cannot float away during the count');
      }
    }
  }
});

test('fall settles on the canvas and a complete rise returns to guard at both low and high frame rates', () => {
  for (const dt of [1 / 20, 1 / 60]) {
    for (const who of ['player', 'remi']) {
      const boxer = view(who);
      const seen = new Set();
      for (const [action, duration] of [['fall', .6], ['down', 2], ['rise', .8]]) {
        for (let time = 0; time <= duration + dt / 2; time += dt) {
          const progress = Math.min(1, time / duration);
          boxer.render({ action, progress, duration }, time);
          seen.add(boxer.pose);
          assert.equal(boxer.baseScale, 390 / 512);
          if (action === 'down') assert.equal(boxer.pose, 'down');
        }
      }
      assert.deepEqual([...seen], ['fall', 'down', 'rise', 'guard']);
      assert.equal(boxer.pose, 'guard');
      assert.equal(fighterMotion({ action: 'down', progress: 1 }, 10, who).rotation, 0);
    }
  }
});

test('count composition preserves contact and never moves a downed boxer or a paused clock', () => {
  const held = remiCount('fall', 0, { hold: KNOCKDOWN_RULES.contactHold });
  const player = view('player');
  const original = view('player');
  const punch = { action: 'jab', ...TIMINGS.player.jab, progress: TIMINGS.player.jab.impact, target: 'head' };
  player.target = original.target = { x: 640, y: 280 };
  player.render(punch, 5, held);
  original.render(punch, 5);
  assert.deepEqual(player.contact(), original.contact(), 'the actual scoring glove retains its contact throughout the initial hold');
  assert.deepEqual([player.sprite.x, player.sprite.y], [original.sprite.x, original.sprite.y]);
  assert.equal(knockdownSpacing('player', held), 0);
  assert.equal(knockdownSpacing('player'), 0);

  for (const stage of ['fall', 'count', 'rise']) {
    const bout = remiCount(stage, .25);
    assert.equal(knockdownSpacing('remi', bout), 0, 'Rémi retains his fixed ground anchor');
    assert.equal(knockdownSpacing('player', remiCount(stage, .25, { downed: { player: true, remi: true } })), 0, 'double knockdowns retain the original two ground anchors');
    assert.equal(knockdownSpacing('player', remiCount(stage, .25, { downed: { player: true, remi: false } })), 0);
    const pausedOffset = knockdownSpacing('player', bout);
    player.render({ action: 'idle' }, 5, bout);
    const pausedX = player.sprite.x;
    for (let frame = 0; frame < 120; frame++) {
      assert.equal(knockdownSpacing('player', bout), pausedOffset);
      player.render({ action: 'idle' }, 5, bout);
      assert.equal(player.sprite.x, pausedX, 'no renderer timer advances the paused offset');
    }
  }
  const atRest = knockdownSpacing('player', remiCount('count', 2));
  assert.ok(atRest < -240);
  assert.equal(knockdownSpacing('player', { ...remiCount('count', 10), result: { winner: 'player' } }), atRest, 'a final knockout stays clearly composed');
  assert.equal(knockdownSpacing('player', remiCount('fall', KNOCKDOWN_RULES.fall)), atRest);
  assert.equal(knockdownSpacing('player', remiCount('rise', 0)), atRest);
  assert.ok(knockdownSpacing('player', remiCount('rise', KNOCKDOWN_RULES.rise)) === 0);
});

test('the standing player clears the seated Rémi and both complete silhouettes stay in camera at 20/60 Hz', () => {
  for (const dt of [1 / 20, 1 / 60]) {
    const player = view('player');
    const original = view('player');
    const remi = view('remi');
    let clock = 0;
    let previous = 0;
    for (const [stage, duration, action] of [
      ['fall', KNOCKDOWN_RULES.fall, 'fall'], ['count', 2, 'down'], ['rise', KNOCKDOWN_RULES.rise, 'rise'],
    ]) {
      const frames = Math.round(duration / dt);
      for (let frame = 0; frame <= frames; frame++) {
        const elapsed = frame * duration / frames;
        const bout = remiCount(stage, elapsed);
        const offset = knockdownSpacing('player', bout);
        const now = clock + elapsed;
        player.render({ action: 'idle' }, now, bout);
        original.render({ action: 'idle' }, now);
        remi.render({ action, progress: elapsed / duration, duration }, now, bout);
        const playerBounds = renderedBounds(player);
        const remiBounds = renderedBounds(remi);
        if (stage === 'count') assert.ok(remiBounds.left - playerBounds.right > 8, 'the full standing and seated silhouettes have a visible horizontal gap');
        for (const [who, b] of [['player', playerBounds], ['remi', remiBounds]]) {
          assert.ok(b.left >= 0 && b.right <= 1280 && b.top >= 0 && b.bottom <= 721, `${who} remains fully in the fixed camera, allowing one rasterized edge pixel`);
        }
        assert.equal(player.sprite.y, original.sprite.y, 'stepping aside never changes the floor plane');
        assert.equal(player.sprite.scaleX, original.sprite.scaleX);
        assert.equal(player.sprite.scaleY, original.sprite.scaleY);
        assert.ok(Math.abs(player.sprite.x - original.sprite.x - offset) <= 1, 'only the intended lateral offset is added, before pixel rounding');
        assert.ok(Math.abs(player.shadow.x - original.shadow.x - offset) < 1e-8, 'the floor shadow follows the full lateral step');
        assert.ok(Math.abs(offset - previous) <= 260 * 1.5 * dt / KNOCKDOWN_RULES.fall + 1e-8, 'the transition has no teleport even at 20 Hz');
        if (stage === 'fall') assert.ok(offset <= previous + 1e-8);
        if (stage === 'rise') assert.ok(offset >= previous - 1e-8);
        previous = offset;
      }
      clock += duration;
    }
    assert.ok(previous === 0);
    assert.equal(player.sprite.x, original.sprite.x, 'the completed rise reconnects exactly to the normal guard composition');
  }
});
