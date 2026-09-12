import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readPng } from '../scripts/sprite-png.mjs';
import { recolorBoxingPixels, streetTexture, boxingTexture } from '../src/scenes/OutfitView.js';

const root = path.resolve(import.meta.dirname, '..');
const ids = ['street-blue', 'street-burgundy', 'boxing-emerald', 'boxing-burgundy'];

test('each bought outfit has twelve genuinely transparent complete poses at the existing walking anchor', () => {
  for (const id of ids) {
    const folder = path.join(root, 'public/assets/sprites/outfits', id);
    const metadata = JSON.parse(fs.readFileSync(path.join(folder, 'player.json'), 'utf8'));
    assert.deepEqual(metadata.anchor, { x: 48, y: 104 }); assert.equal(Object.keys(metadata.poses).length, 12);
    const distinct = new Set();
    for (const [pose, frame] of Object.entries(metadata.poses)) {
      const image = readPng(path.join(folder, frame.file));
      assert.equal(image.width, 96); assert.equal(image.height, 112); assert.equal(frame.scale, metadata.scale);
      assert.ok(frame.bounds.height >= 82 && frame.bounds.height <= 96, `${id}/${pose} scale is stable`);
      let redCap = 0, clear = 0, bottom = 0, left = 96, right = 0;
      for (let at = 0; at < image.width * image.height; at++) {
        const offset = at * 4, x = at % image.width, y = Math.floor(at / image.width);
        const [r, g, b, a] = image.pixels.subarray(offset, offset + 4);
        if (!a) { clear++; continue; }
        left = Math.min(left, x); right = Math.max(right, x); bottom = Math.max(bottom, y);
        if (y < 44 && r > 110 && r > g * 2 && r > b * 2) redCap++;
        assert.ok(x > 0 && x < 95 && y > 0 && y < 111, `${id}/${pose} has no cropped limb`);
      }
      assert.ok(clear > 6500, `${id}/${pose} background is alpha, not a painted checker`);
      assert.ok(redCap >= 220, `${id}/${pose} keeps the red tuque`);
      assert.ok(bottom >= 102 && bottom <= 104); assert.ok(left >= 15 && right <= 81);
      distinct.add(image.pixels.toString('base64'));
    }
    assert.equal(distinct.size, 12, 'walking frames are authored distinct poses, not duplicated standing figures');
  }
});

test('boxing palette swaps all large atlas types while preserving every alpha sample, skin pixel, red tuque and neutral trim', () => {
  for (const file of ['sparring-v2/player-guard.png', 'sparring-v2/player-jab.png', 'bag-orthodox/player-guard.png',
    'body-training/gym-jab-body.png', 'rope/player-ready.png', 'speedball/player-left-contact.png']) {
    const original = readPng(path.join(root, 'public/assets/sprites', file)).pixels;
    for (const color of [0x2e826c, 0x873b52]) {
      const changed = recolorBoxingPixels(original, color);
      let replaced = 0, skin = 0, red = 0, neutral = 0;
      for (let index = 0; index < original.length; index += 4) {
        assert.equal(changed[index + 3], original[index + 3]);
        const [r, g, b, a] = original.subarray(index, index + 4);
        const same = changed[index] === r && changed[index + 1] === g && changed[index + 2] === b;
        if (!same) replaced++;
        if (!a) { assert.ok(same); continue; }
        if (r > 100 && r > g * 1.2 && g > b * 1.15) { skin++; assert.ok(same, 'warm skin and gold remain intact'); }
        if (r > 110 && r > g * 2 && r > b * 2) { red++; assert.ok(same, 'red tuque remains red'); }
        if (Math.max(r, g, b) - Math.min(r, g, b) < 12) { neutral++; assert.ok(same, 'white wraps and black outline stay intact'); }
      }
      assert.ok(replaced > 1200, `${file} has a visible fabric change`);
      assert.ok(skin > 1000); assert.ok(neutral > 100);
      if (!file.startsWith('sparring-v2')) assert.ok(red > 100, `${file} keeps its tuque`);
    }
  }
});

test('outfit lookup respects each independent slot and official uniform priority, including hotel key prefixes', () => {
  const keys = new Set(['outfit-street-blue-down-0', 'outfit-boxing-emerald-right-1']);
  const scene = { textures: { exists: key => keys.has(key) } };
  const profile = { inventory: { equipped: { street: 'street-blue', boxing: 'boxing-emerald' } } };
  assert.equal(streetTexture(scene, 'street-player-down-0', profile), 'outfit-street-blue-down-0');
  assert.equal(streetTexture(scene, 'hotel-player-down-0', profile), 'outfit-street-blue-down-0');
  assert.equal(boxingTexture(scene, 'hotel-boxer-right-1', profile), 'outfit-boxing-emerald-right-1');
  assert.equal(boxingTexture(scene, 'competition-player-jab', profile, { official: true }), 'competition-player-jab');
  assert.equal(streetTexture(scene, 'street-player-up-2', profile), 'street-player-up-2', 'an unready asset retains an existing sprite');
  assert.equal(streetTexture(scene, 'street-player-down-0', { inventory: { equipped: { street: 'street-black' } } }), 'street-player-down-0');
});
