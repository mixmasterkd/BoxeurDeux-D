// Technical chroma-key extraction and common-scale alignment of imagegen artwork.
// This script does not draw, retouch, mirror, or invent any character pixels.
import fs from 'node:fs';
import path from 'node:path';
import { readOpaquePng, writePng } from './chapter-png.mjs';
import { extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = 'references/characters/referee/atlas-chroma.png';
const atlas = readOpaquePng(path.join(root, source));
for (let i = 0; i < atlas.pixels.length; i += 4) {
  const [r, g, b] = atlas.pixels.subarray(i, i + 3);
  if (g > r + 18 && g > b + 18) atlas.pixels.fill(0, i, i + 4);
}

// The raised left hand overlaps the first column at the very top, so use a
// stepped atlas boundary instead of accidentally cropping its fingertips.
const definitions = [
  { name: 'neutral', center: 256, belongs: (x, y) => x < (y < 160 ? 480 : 510), hands: [[44, 580], [473, 580]], head: [255, 214] },
  { name: 'raise-left', center: 766, belongs: (x, y) => x >= (y < 160 ? 480 : 510) && x < 1024, hands: [[531, 102], [951, 584]], head: [766, 214] },
  { name: 'raise-right', center: 1277, belongs: x => x >= 1024, hands: [[1083, 584], [1485, 125]], head: [1277, 214] },
];
const scale = 512 / 805;
const metadata = {
  version: 1, canvas: { width: 640, height: 640 }, anchor: { x: 320, y: 624 }, artHeight: 512,
  identity: 'Arbitre original — chemise bleu clair, nœud papillon et gants noirs, tempes grises.',
  source, scale, note: 'Three independently generated poses on one atlas. Uniform standing body scale and common foot baseline; raised arms retain their extra height. Left/right names refer to image coordinates. Actual RGBA transparency extracted from integrated-imagegen chroma background.',
  poses: {},
};
fs.mkdirSync(path.join(root, 'public/assets/sprites/referee'), { recursive: true });
for (const pose of definitions) {
  const isolated = { ...atlas, pixels: Buffer.from(atlas.pixels) };
  for (let y = 0; y < atlas.height; y++) for (let x = 0; x < atlas.width; x++) {
    if (!pose.belongs(x, y)) isolated.pixels.fill(0, (y * atlas.width + x) * 4, (y * atlas.width + x) * 4 + 4);
  }
  metadata.poses[pose.name] = extract(isolated, { x: 0, y: 0, w: atlas.width, h: atlas.height }, `referee/${pose.name}.png`, {
    scale, width: 640, center: 320, baseline: 624, sourceCenter: pose.center,
    landmarks: { handLeft: pose.hands[0], handRight: pose.hands[1], head: pose.head },
  });
}
writePng(path.join(root, 'references/characters/referee/atlas-alpha.png'), atlas.width, atlas.height, atlas.pixels);
fs.writeFileSync(path.join(root, 'public/assets/sprites/referee/fighters.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
