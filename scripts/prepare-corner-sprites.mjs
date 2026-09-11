// Technical RGBA normalization only. The integrated image tool created the art
// and its alpha; this script does not draw or segment any character pixels.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, bounds, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = 'references/characters/corner/source-alpha.png';
const output = path.join(root, 'public/assets/sprites/corner');
fs.mkdirSync(output, { recursive: true });
const image = readPng(path.join(root, source));
const cell = { x: 0, y: 0, w: image.width, h: image.height };
const sourceBounds = bounds(image, cell);
let transparent = 0;
for (let i = 3; i < image.pixels.length; i += 4) if (image.pixels[i] === 0) transparent++;
const transparentFraction = transparent / (image.width * image.height);
if (transparentFraction < .2) throw new Error('Corner vignette requires true transparent alpha.');
const canvas = { width: 800, height: 650 };
const margin = 24;
const scale = Math.min((canvas.width - 2 * margin) / sourceBounds.w,
  (canvas.height - 2 * margin) / sourceBounds.h);
const sprite = extract(image, cell, 'corner/remi-coach.png', {
  width: canvas.width, canvasHeight: canvas.height, baseline: canvas.height - margin,
  center: canvas.width / 2, scale,
});
const metadata = { version: 1, source, canvas,
  purpose: 'Between-round coaching vignette: seated blue/gold player and Rémi in teal tracksuit.',
  preparation: 'Generated alpha preserved; proportional nearest-neighbor normalization only.',
  transparentFraction, scale, ...sprite };
fs.writeFileSync(path.join(output, 'corner.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
