// Technical extraction of original generated poses; no anatomy is drawn here.
// Connected silhouettes prevent one row's glove/boot from leaking into another.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, extract } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const canvas = { width: 640, height: 640 }, anchor = { x: 320, y: 624 }, artHeight = 512;
const names = ['guard', 'block', 'jab-windup', 'jab', 'cross-windup', 'cross', 'cross-windup-body', 'cross-body', 'block-body', 'hit', 'hit-body', 'fall', 'down', 'rise', 'dodge', 'surrender'];
const playerNames = ['guard', 'block', 'jab-windup', 'jab', 'cross-windup', 'cross', 'hook-windup', 'hook', 'jab-windup-body', 'jab-body', 'cross-windup-body', 'cross-body', 'hook-windup-body', 'hook-body', 'block-body', 'hit-body'];
// Landmarks measured in each generated silhouette, normalized to its bounds.
// High jab is anatomical left (viewer right for opponents, left for player).
const opponentPoints = [
  [.50,.17,.50,.38], [.50,.17,.50,.40], [.44,.16,.48,.40,.87,.21], [.43,.16,.47,.40,.88,.16],
  [.58,.18,.53,.42,.25,.24], [.59,.17,.56,.41,.13,.24], [.64,.25,.53,.49,.47,.53], [.53,.23,.48,.45,.66,.55],
  [.49,.19,.50,.46], [.37,.19,.48,.42], [.60,.30,.50,.56], [.45,.22,.46,.49],
  [.45,.26,.48,.56], [.48,.22,.49,.51], [.30,.19,.47,.41], [.50,.17,.50,.44],
];
const playerPoints = [
  [.51,.14,.50,.37], [.51,.14,.50,.37], [.58,.14,.58,.37,.12,.20], [.63,.14,.63,.37,.11,.08],
  [.50,.15,.50,.37,.30,.23], [.45,.13,.47,.37,.90,.13], [.47,.15,.52,.40,.12,.30], [.49,.15,.55,.39,.25,.24],
  [.46,.16,.49,.44,.07,.43], [.48,.16,.50,.44,.08,.41], [.45,.16,.52,.44,.26,.28], [.54,.16,.50,.44,.92,.41],
  [.49,.14,.50,.47,.21,.40], [.48,.14,.49,.47,.26,.36], [.51,.14,.51,.44], [.39,.20,.52,.48],
];

function components(image) {
  const seen = new Uint8Array(image.width * image.height), found = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || image.pixels[start * 4 + 3] <= 16) continue;
    const stack = [start], pixels = []; seen[start] = 1;
    let left = Infinity, top = Infinity, right = 0, bottom = 0;
    while (stack.length) {
      const i = stack.pop(), x = i % image.width, y = Math.floor(i / image.width);
      pixels.push(i); left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      const neighbours = [y ? i - image.width : -1, y + 1 < image.height ? i + image.width : -1, x ? i - 1 : -1, x + 1 < image.width ? i + 1 : -1];
      for (const next of neighbours) if (next >= 0 && !seen[next] && image.pixels[next * 4 + 3] > 16) { seen[next] = 1; stack.push(next); }
    }
    if (pixels.length > 1000) found.push({ x: left, y: top, w: right - left + 1, h: bottom - top + 1, pixels });
  }
  return found;
}

function isolate(image, component) {
  const pixels = Buffer.alloc(image.pixels.length);
  for (const i of component.pixels) image.pixels.copy(pixels, i * 4, i * 4, i * 4 + 4);
  return { width: image.width, height: image.height, pixels };
}

function prepare(id) {
  const file = `references/characters/chapter-combat/${id}-alpha.png`;
  const image = readPng(path.join(root, file));
  if (image.width !== 1254 || image.height !== 1254) throw new Error(`${id}: remeasure source atlas`);
  const pieces = components(image).sort((a, b) => {
    const rowA = Math.round((a.y + a.h) / (image.height / 4)) - 1;
    const rowB = Math.round((b.y + b.h) / (image.height / 4)) - 1;
    return rowA - rowB || a.x - b.x;
  });
  if (pieces.length !== 16) throw new Error(`${id}: ${pieces.length} silhouettes, expected 16`);
  const poses = {}, scale = artHeight / pieces[0].h;
  const output = path.join(root, 'public/assets/sprites/chapter-combat', id);
  fs.mkdirSync(output, { recursive: true });
  const posesNames = id === 'competition' ? playerNames : names;
  const points = id === 'competition' ? playerPoints : opponentPoints;
  pieces.forEach((box, i) => {
    const pose = posesNames[i], point = [...points[i]];
    const measuredGloves = {
      'bellini-jab': [.84,.24], 'fortin-jab-windup': [.90,.27],
      'gagnon-jab-windup': [.79,.27], 'fortin-jab': [.85,.24],
    };
    if (measuredGloves[`${id}-${pose}`]) point.splice(4,2,...measuredGloves[`${id}-${pose}`]);
    const relative = (x, y) => [box.x + box.w * x, box.y + box.h * y];
    // Center planted feet, not the extended attacking glove. A seated sprite
    // uses its complete floor support. Equal standing calibration stays fixed.
    const feet = box.pixels.filter(index => Math.floor(index / image.width) >= box.y + box.h - 12).map(index => index % image.width);
    const sourceCenter = ['down', 'fall', 'rise'].includes(pose) ? box.x + box.w / 2 : (Math.min(...feet) + Math.max(...feet)) / 2;
    poses[`${id}-${pose}`] = { ...extract(isolate(image, box), box, `chapter-combat/${id}/${id}-${pose}.png`, {
      width: canvas.width, canvasHeight: canvas.height, baseline: anchor.y, center: anchor.x, scale, sourceCenter,
      landmarks: { head: relative(point[0], point[1]), body: relative(point[2], point[3]), ...(point.length > 4 ? { glove: relative(point[4], point[5]) } : {}) },
    }), sourceFile: file, physicalScale: scale };
  });
  return { version: 1, canvas, anchor, artHeight, identity: id, sourceFile: file, physicalScale: scale, poses };
}

for (const id of ['kramer', 'bellini', 'fortin', 'gagnon', 'competition']) {
  const atlas = prepare(id);
  if (id === 'competition') {
    const file = 'references/characters/chapter-combat/competition-recovery-alpha.png';
    const image = readPng(path.join(root, file)), pieces = components(image).sort((a,b) => a.x - b.x);
    if (pieces.length !== 6) throw new Error('Competition recovery requires six isolated poses');
    const scale = artHeight / pieces[0].h;
    const labels = ['guard-reference', 'hit', 'dodge', 'fall', 'down', 'rise'];
    pieces.slice(1).forEach((box, index) => {
      const pose = labels[index + 1];
      atlas.poses[`competition-${pose}`] = { ...extract(isolate(image,box), box, `chapter-combat/competition/competition-${pose}.png`, {
        width:canvas.width, canvasHeight:canvas.height, baseline:anchor.y, center:anchor.x, scale,
        landmarks:{head:[box.x+box.w*.40,box.y+box.h*.13],body:[box.x+box.w*.48,box.y+box.h*.41]},
      }), sourceFile:file, physicalScale:scale };
    });
  }
  const corrections = id === 'gagnon' ? [['jab', 'gagnon-jab-alpha.png', [.43,.17,.47,.40,.88,.19], 512]]
    : id === 'competition' ? [
      ['hook', 'competition-hook-alpha.png', [.55,.12,.53,.37,.68,.05], 526],
      ['hook-body', 'competition-hook-body-alpha.png', [.51,.13,.52,.37,.15,.29], 492],
    ] : [];
  for (const [pose, source, points, height] of corrections) {
    const file = `references/characters/chapter-combat/${source}`;
    const image = readPng(path.join(root, file)), pieces = components(image);
    if (pieces.length !== 1) throw new Error(`${source}: one complete boxer required`);
    const box = pieces[0], scale = height / box.h;
    const relative = (x,y) => [box.x + box.w*x,box.y + box.h*y];
    const feet = box.pixels.filter(index => Math.floor(index/image.width) >= box.y+box.h-20).map(index=>index%image.width);
    const sourceCenter=(Math.min(...feet)+Math.max(...feet))/2;
    atlas.poses[`${id}-${pose}`] = {...extract(isolate(image,box),box,`chapter-combat/${id}/${id}-${pose}.png`, {
      width:canvas.width,canvasHeight:canvas.height,baseline:anchor.y,center:anchor.x,scale,sourceCenter,
      landmarks:{head:relative(points[0],points[1]),body:relative(points[2],points[3]),glove:relative(points[4],points[5])},
    }),sourceFile:file,physicalScale:scale};
  }
  fs.writeFileSync(path.join(root,`public/assets/sprites/chapter-combat/${id}/fighters.json`), `${JSON.stringify(atlas,null,2)}\n`);
  console.log(`${id}: ${Object.keys(atlas.poses).length} aligned RGBA poses`);
}
