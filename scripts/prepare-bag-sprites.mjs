// Technical extraction of imagegen artwork: preserve RGB and generated alpha.
// No segmentation by color, repainting, or dependency on an image service.
// Usage: node scripts/prepare-bag-sprites.mjs
import fs from 'node:fs';
import path from 'node:path';
import { readPng, bounds, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/assets/sprites/bag');
fs.mkdirSync(output, { recursive: true });
const sourceFile = 'references/characters/bag/player-alpha.png';
const source = readPng(path.join(root, sourceFile));
const cells = [
  ['guard', { x: 100, y: 0, w: 480, h: 510 }, 329],
  ['windup', { x: 590, y: 0, w: 380, h: 510 }, 755],
  ['jab', { x: 990, y: 0, w: 540, h: 510 }, 1209, [1432, 166]],
  ['cross', { x: 100, y: 510, w: 480, h: 510 }, 315, [548, 646]],
  ['hook-windup', { x: 590, y: 510, w: 380, h: 510 }, 755],
  ['hook', { x: 990, y: 510, w: 540, h: 510 }, 1242, [1392, 630]],
];
const canvas = { width: 420, height: 360 };
const anchor = { x: 170, y: 340 };
const artHeight = 340;
const guardBounds = bounds(source, cells[0][1]);
const scale = artHeight / guardBounds.h;
let transparent = 0;
for (let i = 3; i < source.pixels.length; i += 4) if (source.pixels[i] === 0) transparent += 1;
if (transparent / (source.width * source.height) < .5) {
  throw new Error('Expected a true RGBA sheet with transparent gutters. Correct the source with imagegen first.');
}
const poses = Object.fromEntries(cells.map(([key, cell, sourceCenter, glove]) => [key, extract(
  source, cell, `bag/player-${key}.png`, {
    scale, width: canvas.width, canvasHeight: canvas.height,
    baseline: anchor.y, center: anchor.x, sourceCenter,
    landmarks: glove ? { glove } : {},
  },
)]));

const bagFile = 'references/characters/bag/bag-alpha.png';
const bagSource = readPng(path.join(root, bagFile));
const bag = extract(bagSource, { x: 0, y: 0, w: bagSource.width, h: bagSource.height }, 'bag/heavy-bag.png', {
  height: 510, width: 160, canvasHeight: 530, baseline: 520, center: 80,
  landmarks: { pivot: [512, 19], target: [336, 850] },
});
const metadata = {
  version: 1, canvas, anchor, artHeight, scale,
  sources: { player: sourceFile, bag: bagFile },
  alphaThreshold: 16,
  note: 'One common scale, head reference and ground baseline. Painted poses; transparent samples preserved. Hook steps inward to match its shorter reach.',
  poses, bag,
};
fs.writeFileSync(path.join(output, 'fighters.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({ scale, anchor, poses: Object.fromEntries(Object.entries(poses).map(([k, v]) => [k, { bounds: v.bounds, contact: v.contact }])), bag }, null, 2));
