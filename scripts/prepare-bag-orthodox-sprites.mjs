// Technical extraction only. The original imagegen poses establish anatomy.
// No mirroring, swapping punch labels, recoloring or code-drawn anatomy.
// Usage: node scripts/prepare-bag-orthodox-sprites.mjs
import fs from 'node:fs';
import path from 'node:path';
import { readPng, bounds, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/assets/sprites/bag-orthodox');
fs.mkdirSync(output, { recursive: true });
const sourceFile = 'references/characters/bag-orthodox/player-alpha.png';
const source = readPng(path.join(root, sourceFile));
const cells = [
  ['guard', { x: 50, y: 0, w: 490, h: 512 }, 264],
  ['windup', { x: 550, y: 0, w: 460, h: 512 }, 775],
  ['jab', { x: 1030, y: 0, w: 506, h: 512 }, 1250, [1499, 135], 'left'],
  ['cross', { x: 40, y: 512, w: 500, h: 512 }, 270, [522, 635], 'right'],
  ['hook-windup', { x: 550, y: 512, w: 460, h: 512 }, 775],
  ['hook', { x: 1030, y: 512, w: 506, h: 512 }, 1273, [1455, 660], 'left'],
];
const canvas = { width: 420, height: 360 };
const anchor = { x: 170, y: 340 };
// Two pixels of headroom accommodate the cross's slightly taller source pose.
const artHeight = 338;
const scale = artHeight / bounds(source, cells[0][1]).h;
let transparent = 0;
for (let i = 3; i < source.pixels.length; i += 4) if (source.pixels[i] === 0) transparent += 1;
if (transparent / (source.width * source.height) < .5) {
  throw new Error('Expected true RGBA transparency. Correct the source with imagegen before extracting.');
}
const poses = Object.fromEntries(cells.map(([key, cell, sourceCenter, glove, hand]) => [key, {
  ...extract(source, cell, `bag-orthodox/player-${key}.png`, {
    scale, width: canvas.width, canvasHeight: canvas.height,
    baseline: anchor.y, center: anchor.x, sourceCenter,
    landmarks: glove ? { glove } : {},
  }),
  ...(hand ? { punchingHand: hand } : {}),
}]));
// The original bag art/pivot remain unchanged and are reused by the new player.
const existing = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/sprites/bag/fighters.json'), 'utf8'));
const metadata = {
  version: 2, canvas, anchor, artHeight, scale,
  sources: { player: sourceFile, bag: existing.sources.bag },
  alphaThreshold: 16,
  stance: { kind: 'orthodox', leadFoot: 'left', rearFoot: 'right', view: 'front-left', facing: 'right' },
  note: 'New authored orthodox poses. Left foot and shoulder lead; left jab, right rear cross with right heel pivot, left hook. Common scale and floor anchor; no flip or label substitution.',
  poses, bag: existing.bag,
};
fs.writeFileSync(path.join(output, 'fighters.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({ scale, anchor, transparentFraction: transparent / (source.width * source.height), poses: Object.fromEntries(Object.entries(poses).map(([k, v]) => [k, { bounds: v.bounds, hand: v.punchingHand, contact: v.contact }])) }, null, 2));
