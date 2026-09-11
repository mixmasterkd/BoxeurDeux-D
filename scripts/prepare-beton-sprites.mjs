// Reproducible technical extraction of original generated Béton artwork.
// One standing reference fixes the physical scale for each source sheet.
// All anatomy, uniforms and motions come from the preserved RGBA artwork.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, bounds, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/assets/sprites/beton');
fs.mkdirSync(output, { recursive: true });
const canvas = { width: 384, height: 640 }, anchor = { x: 192, y: 624 }, artHeight = 512;
const sheets = [
  {
    file: 'jab-alpha.png', standing: [0, 410],
    // pose, cell left/right, fixed stance center, head, abdomen, active glove.
    cells: [
      ['guard', 0, 410, 205, [202, 139], [205, 300]],
      ['block', 410, 795, 605, [590, 156], [598, 309]],
      ['jab-windup', 795, 1205, 998, [983, 141], [992, 300], [1074, 164]],
      ['jab-recover', 1205, 1614, 1411, [1392, 139], [1409, 300], [1506, 194]],
      ['jab', 1614, 1983, 1800, [1785, 140], [1794, 300], [1902, 164]],
    ],
  },
  {
    file: 'body-alpha.png', standing: [0, 350],
    cells: [
      ['cross-windup-body', 350, 700, 522, [507, 237], [518, 358], [439, 266]],
      ['cross-recover-body', 700, 1022, 853, [862, 238], [861, 377], [883, 411]],
      ['cross-body', 1022, 1355, 1187, [1194, 239], [1173, 380], [1182, 442]],
      ['hit-body', 1355, 1663, 1505, [1512, 298], [1509, 412]],
      ['block-body', 1663, 1983, 1821, [1819, 219], [1817, 365]],
    ],
  },
  {
    file: 'knockdown-alpha.png', standing: [0, 390],
    cells: [
      ['hit', 390, 785, 583, [596, 148], [559, 291]],
      ['fall', 785, 1148, 970, [978, 448], [960, 542]],
      ['down', 1148, 1625, 1384, [1386, 448], [1380, 566]],
      ['rise', 1625, 1983, 1805, [1827, 396], [1815, 535]],
    ],
  },
];
const poses = {}, calibration = [];
for (const sheet of sheets) {
  const sourceFile = `references/characters/beton/${sheet.file}`;
  const image = readPng(path.join(root, sourceFile));
  if (image.width !== 1983 || image.height !== 793) throw new Error(`${sheet.file}: source dimensions changed; remeasure its cells`);
  const cell = (left, right) => ({ x: left, y: 0, w: right - left, h: image.height });
  let transparent = 0;
  for (let i = 3; i < image.pixels.length; i += 4) if (image.pixels[i] === 0) transparent++;
  const transparentFraction = transparent / (image.width * image.height);
  if (transparentFraction < .4) throw new Error(`${sheet.file}: true generated alpha required`);
  const standingSourceBounds = bounds(image, cell(...sheet.standing));
  const scale = artHeight / standingSourceBounds.h;
  calibration.push({ sourceFile, standingSourceBounds, scale, transparentFraction });
  for (const [pose, left, right, center, head, body, glove] of sheet.cells) {
    const name = `beton-${pose}`;
    poses[name] = {
      ...extract(image, cell(left, right), `beton/${name}.png`, {
        width: canvas.width, canvasHeight: canvas.height, baseline: anchor.y, center: anchor.x,
        scale, sourceCenter: center, landmarks: { head, body, ...(glove ? { glove } : {}) },
      }),
      sourceFile, physicalScale: scale,
    };
  }
  console.log(`${sheet.file}: ${(100 * transparentFraction).toFixed(2)}% real transparency; standing scale ${scale.toFixed(5)}`);
}
fs.writeFileSync(path.join(output, 'fighters.json'), `${JSON.stringify({ version: 1, canvas, anchor, artHeight,
  identity: 'Béton — graphite and ochre, original Black opponent; left head jab and right body cross.',
  note: 'All fourteen poses are separately authored. Source standing guards calibrate physical scale; knee and canvas poses are never stretched to standing height.',
  calibration, poses,
}, null, 2)}\n`);
console.log(`Prepared ${Object.keys(poses).length} Béton poses.`);
