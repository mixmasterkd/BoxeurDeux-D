// Technical cropping, nearest-neighbor resampling and measured alignment only.
// Every character and pose was drawn by the integrated image-generation tool.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, bounds, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'public/assets/sprites/body-training');
fs.mkdirSync(dir, { recursive: true });
const sourcePath = who => `references/characters/body-training/${who}-alpha.png`;
function source(who) {
  const image = readPng(path.join(root, sourcePath(who)));
  let clear = 0;
  for (let p = 3; p < image.pixels.length; p += 4) if (image.pixels[p] === 0) clear++;
  const transparentFraction = clear / (image.width * image.height);
  if (transparentFraction < .40) throw new Error(`${who}: expected generated true RGBA transparency`);
  console.log(`${who}: ${(transparentFraction * 100).toFixed(2)} % transparent`);
  return image;
}

const gym = source('gym');
const gymCanvas = { width: 420, height: 360 }, gymAnchor = { x: 170, y: 340 };
const gymScale = .7056367432150313;
const gymCells = [
  ['windup-body', 0, 0, 270],
  ['jab-body', 1, 0, 771, [1000, 232], 'left'],
  ['cross-body', 2, 0, 1280, [1464, 242], 'right'],
  ['hook-windup-body', 0, 1, 274],
  ['hook-body', 1, 1, 776, [912, 721], 'left'],
  ['block-body', 2, 1, 1286],
];
const gymPoses = Object.fromEntries(gymCells.map(([pose, col, row, sourceCenter, glove, punchingHand]) => [pose, {
  ...extract(gym, { x: col * 512, y: row * 512, w: 512, h: 512 }, `body-training/gym-${pose}.png`, {
    width: 420, canvasHeight: 360, baseline: 340, center: 170,
    scale: gymScale, sourceCenter, landmarks: glove ? { glove } : {},
  }),
  ...(punchingHand ? { punchingHand } : {}), target: 'body',
}]));
fs.writeFileSync(path.join(dir, 'gym.json'), `${JSON.stringify({ version: 1, canvas: gymCanvas, anchor: gymAnchor,
  sources: [sourcePath('gym')], note: 'Original orthodox body punches and low guard; same stance, camera and anchor as bag-orthodox. No sprite flipping.', poses: gymPoses }, null, 2)}\n`);

const sparring = {};
const canvas = { width: 384, height: 640 }, anchor = { x: 192, y: 624 };
const specifications = {
  player: {
    columns: 4, rows: 2, scale: 1.035,
    cells: [
      ['jab-windup-body', 0, 0, 204, [200, 72], [211, 203]],
      ['jab-body', 1, 0, 590, [591, 73], [590, 207], [528, 99], 'left'],
      ['cross-windup-body', 2, 0, 965, [970, 75], [968, 205]],
      ['cross-body', 3, 0, 1338, [1350, 72], [1350, 202], [1405, 96], 'right'],
      ['hook-windup-body', 0, 1, 204, [198, 577], [208, 712]],
      ['hook-body', 1, 1, 590, [591, 578], [587, 710], [480, 669], 'left'],
      ['block-body', 2, 1, 971, [976, 587], [973, 709]],
      ['hit-body', 3, 1, 1344, [1350, 620], [1341, 698]],
    ],
  },
  remi: {
    columns: 3, rows: 2, scale: .85,
    cells: [
      ['jab-windup-body', 0, 0, 220, [218, 132], [220, 278]],
      ['jab-body', 1, 0, 621, [606, 135], [597, 280], [654, 270], 'left'],
      ['cross-windup-body', 2, 0, 1023, [1024, 133], [1024, 291]],
      ['cross-body', 0, 1, 208, [218, 754], [227, 895], [165, 868], 'right'],
      ['block-body', 1, 1, 618, [616, 755], [611, 904]],
      ['hit-body', 2, 1, 1030, [1040, 809], [1036, 926]],
    ],
  },
};
for (const [who, specification] of Object.entries(specifications)) {
  if (!fs.existsSync(path.join(root, sourcePath(who)))) {
    console.log(`Skipping ${who} until its generated RGBA source is available.`);
    continue;
  }
  const image = source(who);
  for (const [pose, col, row, sourceCenter, head, body, glove, punchingHand] of specification.cells) {
    const x = Math.round(col * image.width / specification.columns), y = Math.round(row * image.height / specification.rows);
    const cell = { x, y, w: Math.round((col + 1) * image.width / specification.columns) - x,
      h: Math.round((row + 1) * image.height / specification.rows) - y };
    // The hook's right boot extends just beyond its nominal grid column.
    // Crop in the transparent gap, rather than clip it or leak it into guard.
    if (who === 'player' && row === 1 && col === 1) { cell.x = 400; cell.w = 400; }
    if (who === 'player' && row === 1 && col === 2) { cell.x = 800; cell.w = 352; }
    const name = `${who}-${pose}`;
    sparring[name] = {
      ...extract(image, cell, `body-training/${name}.png`, { width: 384, canvasHeight: 640, baseline: 624, center: 192,
        scale: specification.scale, sourceCenter, landmarks: { head, body, ...(glove ? { glove } : {}) } }),
      ...(punchingHand ? { punchingHand } : {}), target: 'body',
    };
  }
  // Recovery travels through the same authored compact intermediate as windup.
  // Duplicate files preserve stable public URLs without repainting anatomy.
  for (const action of who === 'player' ? ['jab', 'cross', 'hook'] : ['jab', 'cross']) {
    const from = `${who}-${action}-windup-body`, to = `${who}-${action}-recover-body`;
    fs.copyFileSync(path.join(dir, `${from}.png`), path.join(dir, `${to}.png`));
    sparring[to] = { ...sparring[from], file: `body-training/${to}.png`, reusedFrom: from };
  }
}
fs.writeFileSync(path.join(dir, 'sparring.json'), `${JSON.stringify({ version: 1, canvas, anchor, artHeight: 512,
  sources: ['player', 'remi'].map(sourcePath), poses: sparring }, null, 2)}\n`);
console.log(`Prepared ${Object.keys(gymPoses).length} gym poses and ${Object.keys(sparring).length} sparring poses.`);
