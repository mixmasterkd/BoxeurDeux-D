// Technical extraction only: all poses and anatomy are generated artwork.
// A standing calibration figure in each source fixes ONE physical scale for
// the entire sheet, so kneeling/seated bodies are never stretched taller.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, bounds, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/assets/sprites/knockdown');
fs.mkdirSync(output, { recursive: true });
const canvas = { width: 384, height: 640 }, anchor = { x: 192, y: 624 };
const artHeight = 512;
const poses = {}, calibration = {};
const sourceFiles = [];
const specifications = {
  player: {
    sourceWidth: 1942, sourceHeight: 809,
    standing: [0, 490],
    cells: [
      ['fall', 490, 960, 718, [795, 371], [739, 486]],
      ['down', 990, 1510, 1233, [1228, 486], [1230, 607]],
      ['rise', 1510, 1942, 1720, [1736, 266], [1740, 410]],
    ],
  },
  remi: {
    sourceWidth: 2079, sourceHeight: 756,
    standing: [0, 515],
    cells: [
      ['fall', 530, 1000, 770, [716, 302], [780, 448]],
      ['down', 1010, 1570, 1301, [1283, 418], [1290, 531]],
      ['rise', 1580, 2079, 1840, [1842, 268], [1845, 405]],
    ],
  },
};
for (const [who, spec] of Object.entries(specifications)) {
  const sourceFile = `references/characters/knockdown/${who}-alpha.png`;
  const image = readPng(path.join(root, sourceFile));
  const sx = image.width / spec.sourceWidth, sy = image.height / spec.sourceHeight;
  const cellAt = (left, right) => ({ x: Math.round(left * sx), y: 0,
    w: Math.round(right * sx) - Math.round(left * sx), h: image.height });
  let transparent = 0;
  for (let i = 3; i < image.pixels.length; i += 4) if (image.pixels[i] === 0) transparent++;
  const transparentFraction = transparent / (image.width * image.height);
  if (transparentFraction < .45) throw new Error(`${who}: require true generated alpha, not an opaque background`);
  const referenceBounds = bounds(image, cellAt(...spec.standing));
  const scale = artHeight / referenceBounds.h;
  calibration[who] = { sourceFile, standingSourceBounds: referenceBounds, standingArtHeight: artHeight, scale, transparentFraction };
  sourceFiles.push(sourceFile);
  for (const [pose, left, right, center, head, body] of spec.cells) {
    const name = `${who}-${pose}`;
    const point = p => [p[0] * sx, p[1] * sy];
    poses[name] = {
      ...extract(image, cellAt(left, right), `knockdown/${name}.png`, {
        width: canvas.width, canvasHeight: canvas.height, baseline: anchor.y, center: anchor.x,
        scale, sourceCenter: center * sx, landmarks: { head: point(head), body: point(body) },
      }),
      sourceFile, physicalScale: scale,
    };
  }
  console.log(`${who}: ${(100 * transparentFraction).toFixed(2)} % true alpha; common scale ${scale.toFixed(4)}; heights ${['fall', 'down', 'rise'].map(p => `${p} ${poses[`${who}-${p}`].bounds.height}`).join(', ')}`);
}
fs.writeFileSync(path.join(output, 'fighters.json'), `${JSON.stringify({ version: 1, canvas, anchor, artHeight,
  note: 'Original knee fall, seated canvas and rising poses. Each sheet uses one standing-calibrated scale; floor anchors remain fixed. No stretched or rotated standing sprites.',
  sources: sourceFiles, calibration, poses }, null, 2)}\n`);
