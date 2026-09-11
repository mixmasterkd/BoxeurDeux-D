// Technical crop, nearest-neighbour scale and shared foot alignment only.
// All anatomy and transparency were authored with the built-in imagegen tool.
// Usage: node scripts/prepare-mirror-sprites.mjs
import fs from 'node:fs';
import path from 'node:path';
import { readPng, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/assets/sprites/mirror');
fs.mkdirSync(output, { recursive: true });
const canvas = { width: 420, height: 360 };
const anchor = { x: 170, y: 340 };
// Measured boot-sole centres in the existing orthodox guard (y=333):
// rear [51..93] => 72, lead [215..286] => 250.5.
// Align the same landmarks in independently generated source resolutions.
// The lower head height in each slip is retained, never stretched upright.
const rear = 72;
const bootDistance = 250.5 - rear;
const sources = [
  ['block', 'player-block-alpha.png', 231, 801.5],
  ['dodgeLeft', 'player-dodge-left-alpha.png', 317.5, 965],
  ['dodgeRight', 'player-dodge-right-alpha.png', 261, 880.5],
];
const poses = {};
const verification = [];
for (const [key, file, sourceRear, sourceLead] of sources) {
  const sourcePath = `references/characters/mirror/${file}`;
  const image = readPng(path.join(root, sourcePath));
  let transparent = 0;
  for (let i = 3; i < image.pixels.length; i += 4) if (image.pixels[i] === 0) transparent++;
  const transparentFraction = transparent / (image.width * image.height);
  if (transparentFraction < .5) throw new Error(`Native RGBA transparency missing: ${file}`);
  const scale = bootDistance / (sourceLead - sourceRear);
  const sourceCenter = sourceRear + (anchor.x - rear) / scale;
  const filename = `mirror/player-${key === 'dodgeLeft' ? 'dodge-left' : key === 'dodgeRight' ? 'dodge-right' : key}.png`;
  poses[key] = {
    ...extract(image, { x: 0, y: 0, w: image.width, h: image.height }, filename, {
      scale, width: canvas.width, canvasHeight: canvas.height,
      center: anchor.x, baseline: anchor.y, sourceCenter,
    }),
    source: sourcePath,
    sourceScale: scale,
    floor: anchor.y,
  };
  verification.push({ key, transparentFraction, scale, bounds: poses[key].bounds });
}
const metadata = {
  version: 1, canvas, anchor, artHeight: 338,
  stance: { kind: 'orthodox', leadFoot: 'left', rearFoot: 'right', view: 'front-left', facing: 'right' },
  note: 'Three original defensive poses; same foot landmarks as bag-orthodox. High guard, rear-weighted screen-left slip, forward crouching screen-right slip. No anatomical mirroring. A scene may flip the entire boxer only when drawing his simultaneous mirror reflection.',
  poses,
  background: {
    file: 'backgrounds/mirror-training.png', width: 1280, height: 720,
    source: 'references/characters/mirror/background-final-source.png',
    glass: { x: 688, y: 58, width: 510, height: 458 },
    suggestedReflection: { x: 960, floor: 500, artHeight: 300 },
  },
};
fs.writeFileSync(path.join(output, 'fighters.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(verification, null, 2));
