import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FighterView } from '../src/scenes/FighterView.js';
import { transformFighterPoint } from '../src/game/FighterMotion.js';
import { SparringSession, TIMINGS, KNOCKDOWN_RULES } from '../src/game/SparringSession.js';
import { readPng } from '../scripts/sprite-png.mjs';

const json = file => JSON.parse(readFileSync(new URL(`../public/assets/sprites/${file}`, import.meta.url)));
const atlases = {
  fighters: json('sparring-v2/fighters.json'),
  'fighters-hook': json('sparring-hook/fighters.json'),
  'fighters-body': json('body-training/sparring.json'),
  'fighters-knockdown': json('knockdown/fighters.json'),
  'fighters-beton': json('beton/fighters.json'),
};
const beton = atlases['fighters-beton'];
function object(x, y, key) {
  return {
    x, y, texture: { key }, rotation: 0, flipX: false,
    setOrigin(x, y) { this.origin = { x, y }; return this; },
    setScale(scale) { this.scaleX = this.scaleY = scale; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
    setFlipX(flip) { this.flipX = flip; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setTexture(key) { this.texture = { key }; return this; },
  };
}
function scene() {
  return { cache: { json: { get: key => atlases[key] } }, add: { image: object, ellipse: object } };
}
function view(who = 'remi', opponent = 'beton') {
  return new FighterView(scene(), who, 640, who === 'player' ? 718 : 592, 390, { opponent });
}
function bounds(boxer) {
  const b = boxer.metadata.poses[`${boxer.who}-${boxer.pose}`].bounds;
  return [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
    .map(([x, y]) => transformFighterPoint({ x, y }, boxer.anchor, {
      x: boxer.sprite.x, y: boxer.sprite.y, scale: boxer.sprite.scaleX,
      rotation: boxer.sprite.rotation, flip: boxer.sprite.flipX,
    }));
}
function inCamera(boxer) {
  // The actual sparring camera uses this existing .88 zoom about x = 640.
  for (const p of bounds(boxer)) {
    const x = 640 * (1 - .88) + p.x * .88, y = p.y * .88;
    assert.ok(x >= 0 && x <= 1280 && y >= 0 && y <= 720, `${boxer.sprite.texture.key} must fit the fixed camera: ${x}, ${y}`);
  }
}

test('Béton contains fourteen genuine RGBA authored poses with stable scale, complete boots and meaningful landmarks', () => {
  assert.equal(Object.keys(beton.poses).length, 14);
  assert.deepEqual(beton.canvas, { width: 384, height: 640 });
  assert.deepEqual(beton.anchor, { x: 192, y: 624 });
  assert.equal(beton.artHeight, 512);
  const hashes = new Set();
  for (const [name, spec] of Object.entries(beton.poses)) {
    const file = new URL(`../public/assets/sprites/${spec.file}`, import.meta.url);
    const png = readPng(file);
    assert.equal(png.width, 384); assert.equal(png.height, 640);
    let clear = 0, visible = 0;
    for (let i = 3; i < png.pixels.length; i += 4) {
      if (png.pixels[i] === 0) clear++;
      if (png.pixels[i] > 220) visible++;
    }
    assert.ok(clear > png.width * png.height * .45 && visible > 10000, `${name}: real transparent surroundings and a complete boxer`);
    const b = spec.bounds;
    assert.ok(b.x > 0 && b.x + b.width < 384 && b.y > 0, `${name}: full silhouette is inside the canvas`);
    assert.equal(b.y + b.height, 624, 'all complete boots/knees retain the same floor anchor');
    for (const point of [spec.head, spec.body, ...(spec.contact ? [spec.contact] : [])]) {
      assert.ok(point && Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(png.pixels[(point.y * png.width + point.x) * 4 + 3] > 220, `${name}: target/contact landmark must sit on the visible boxer`);
    }
    assert.equal(spec.physicalScale, beton.calibration.find(c => c.sourceFile === spec.sourceFile).scale);
    hashes.add(createHash('sha256').update(readFileSync(file)).digest('hex'));
  }
  assert.equal(hashes.size, 14, 'each requested pose is separately authored');
  for (const name of ['fall', 'down', 'rise']) assert.ok(beton.poses[`beton-${name}`].bounds.height < 512 * .7, 'bent bodies retain their natural lower height');
  assert.ok(beton.poses['beton-down'].bounds.height < beton.poses['beton-rise'].bounds.height);
  assert.ok(beton.poses['beton-cross-body'].contact.y > beton.poses['beton-jab'].contact.y + 140, 'the authored body glove truly points lower');
});

test('Béton assets are opt-in and every generic visual state resolves to his own identity', () => {
  const collect = opponent => {
    const calls = [];
    FighterView.preload({ load: { json: (key, url) => calls.push({ key, url }), image: (key, url) => calls.push({ key, url }) } }, opponent ? { opponent } : undefined);
    return calls;
  };
  const ordinary = collect(), requested = collect('beton');
  assert.ok(!ordinary.some(call => call.key.includes('beton')), 'gym/Rémi never request the new asset bundle');
  const extra = requested.filter(call => call.key.includes('beton'));
  assert.equal(extra.length, 15, 'only fourteen sprite textures and their JSON are requested');
  for (const call of extra) assert.ok(existsSync(new URL(`../public${call.url}`, import.meta.url)), call.url);
  assert.equal(view('remi', 'remi').sprite.texture.key, 'remi-guard');
  assert.equal(view('player', 'beton').sprite.texture.key, 'player-guard');
  const boxer = view();
  assert.equal(boxer.who, 'remi', 'combat semantics remain independent of the visual opponent');
  for (const action of ['idle', 'open', 'guard', 'tellLeft', 'tellRight', 'jab', 'cross', 'hook', 'hit', 'dodgeLeft', 'dodgeRight', 'fall', 'down', 'rise']) {
    for (const target of ['head', 'body']) {
      boxer.render({ action, target, guardLevel: target, progress: .45, duration: .6, impact: .4 }, 3);
      const key = boxer.sprite.texture.key;
      assert.ok(key.startsWith('beton-') && beton.poses[key], `${action}/${target}: no Rémi texture fallback`);
      assert.equal(boxer.baseScale, 390 / 512);
    }
  }
  boxer.render({ action: 'tellRight', target: 'body', progress: .5 }, 4);
  assert.equal(boxer.sprite.texture.key, 'beton-cross-windup-body');
  boxer.render({ action: 'tellLeft', target: 'head', progress: .5 }, 4);
  assert.equal(boxer.sprite.texture.key, 'beton-jab-windup');
});

test('Béton plays both actual model attacks with scored glove contact, readable tells and complete camera bounds at 20/60 Hz', () => {
  for (const hz of [20, 60]) {
    const session = new SparringSession({ opponent: 'beton', random: () => .5 });
    const player = view('player'), opponent = view();
    const contacts = new Map(), seen = new Set();
    session.start();
    for (let frame = 0; frame < hz * 9 && contacts.size < 2; frame++) {
      session.update(1 / hz);
      const state = session.state;
      opponent.target = player.point('guard', state.remi.target);
      opponent.render(state.remi, state.elapsed, state.bout);
      player.render(state.player, state.elapsed, state.bout);
      seen.add(opponent.pose);
      assert.ok(opponent.sprite.texture.key.startsWith('beton-'));
      assert.equal(opponent.sprite.scaleX, 390 / 512);
      inCamera(opponent); inCamera(player);
      if (state.remi.action.startsWith('tell') && state.remi.progress > .25) assert.match(opponent.pose, /-windup(-body)?$/);
      for (const event of session.drainEvents()) {
        if (event.type !== 'remi-hit') continue;
        const pose = event.target === 'head' ? 'jab' : 'cross-body';
        assert.equal(opponent.pose, pose);
        assert.equal(opponent.phase, 'contact');
        assert.equal(opponent.sprite.texture.key, `beton-${pose}`);
        const contact = opponent.contact(), aim = opponent.attackAim;
        assert.ok(Math.hypot(contact.x - aim.x, contact.y - aim.y) < 1, 'the visible glove reaches the promised target on the scored frame');
        assert.equal(aim.x, opponent.target.x + (event.attack === 'jab' ? -36 : 36));
        assert.equal(aim.y, opponent.target.y + (event.target === 'head' ? 18 : 0));
        contacts.set(event.target, contact);
      }
    }
    assert.deepEqual([...contacts.keys()], ['head', 'body']);
    assert.ok(contacts.get('body').y > contacts.get('head').y + 70, 'actual body contact is lower than head contact');
    for (const pose of ['jab-windup', 'jab-recover', 'jab', 'cross-windup-body', 'cross-recover-body', 'cross-body']) assert.ok(seen.has(pose), pose);
  }
});

test('player punches hit Béton landmarks and his floor poses retain scale and a clear count composition', () => {
  for (const hz of [20, 60]) {
    for (const target of ['head', 'body']) {
      const session = new SparringSession({ opponent: 'beton' });
      const player = view('player'), opponent = view();
      session.start();
      if (target === 'body') session.setGuard(true, 'body');
      session.act('jab');
      let hit = false;
      while (session.state.player.action === 'jab') {
        session.update(1 / hz);
        const state = session.state;
        opponent.render(state.remi, state.elapsed, state.bout);
        player.target = state.remi.action === 'hit' ? opponent.point('guard', target) : opponent.point(opponent.pose, target, true);
        player.render(state.player, state.elapsed, state.bout);
        inCamera(player); inCamera(opponent);
        for (const event of session.drainEvents()) if (event.type === 'player-hit') {
          hit = true;
          assert.equal(event.target, target);
          assert.ok(Math.hypot(player.contact().x - player.attackAim.x, player.contact().y - player.attackAim.y) < 1);
          assert.equal(opponent.pose, target === 'body' ? 'hit-body' : 'hit');
        }
      }
      assert.ok(hit);
    }
    const player = view('player'), opponent = view();
    for (const [stage, action, duration] of [['fall', 'fall', KNOCKDOWN_RULES.fall], ['count', 'down', 2], ['rise', 'rise', KNOCKDOWN_RULES.rise]]) {
      for (let frame = 0; frame <= Math.round(hz * duration); frame++) {
        const elapsed = Math.min(duration, frame / hz);
        const bout = { count: { stage, elapsed, hold: 0, downed: { remi: true, player: false } } };
        player.render({ action: 'idle' }, elapsed, bout);
        opponent.render({ action, progress: elapsed / duration, duration }, elapsed, bout);
        assert.equal(opponent.sprite.scaleX, 390 / 512);
        assert.ok(Math.abs(opponent.sprite.y - 592) <= 2, 'ground anchor is preserved without stretching floor poses');
        inCamera(player); inCamera(opponent);
        if (stage === 'count') {
          const gap = Math.min(...bounds(opponent).map(p => p.x)) - Math.max(...bounds(player).map(p => p.x));
          assert.ok(gap > 20, 'the standing player cannot cover seated Béton');
        }
      }
    }
  }
});
