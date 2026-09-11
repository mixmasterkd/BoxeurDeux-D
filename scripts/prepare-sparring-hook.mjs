// Technical alignment and nearest-neighbour resampling of preserved imagegen
// RGBA sources. No character painting, recolouring or background segmentation.
import fs from 'node:fs';
import { readPng, writePng, bounds } from './sprite-png.mjs';

const sourceDir = 'references/characters/sparring-hook';
const outputDir = 'public/assets/sprites/sparring-hook';
const width = 384, height = 640, baseline = 624, center = 192;
// Scale from the ANATOMICAL crown-to-sole height, independently of the raised
// glove. Landmarks were checked against each generated source at full size.
const frames = [
  { pose: 'player-hook-windup', crown: 59, sourceCenter: 500,
    head: [516, 203], glove: [325, 141] },
  { pose: 'player-hook-recover', crown: 115, sourceCenter: 500,
    head: [515, 263], glove: [411, 104] },
  { pose: 'player-hook', crown: 79, sourceCenter: 500,
    head: [538, 220], glove: [658, 89] },
];
const metadata = {
  version: 1, canvas: { width, height }, anchor: { x: center, y: baseline },
  artHeight: 512, poses: {},
};
fs.mkdirSync(outputDir, { recursive: true });
for (const frame of frames) {
  const input = readPng(`${sourceDir}/${frame.pose}-alpha.png`);
  const box = bounds(input, { x: 0, y: 0, w: input.width, h: input.height });
  const sole = box.y + box.h;
  const scale = 512 / (sole - frame.crown);
  const artWidth = Math.round(box.w * scale), artHeight = Math.round(box.h * scale);
  const left = Math.round(center + (box.x - frame.sourceCenter) * scale);
  const top = baseline - artHeight;
  if (left < 0 || top < 0 || left + artWidth > width) throw new Error(`Clipped ${frame.pose}`);
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < artHeight; y++) for (let x = 0; x < artWidth; x++) {
    const sx = box.x + Math.min(box.w - 1, Math.floor(x / scale));
    const sy = box.y + Math.min(box.h - 1, Math.floor(y / scale));
    const from = (sy * input.width + sx) * 4;
    input.pixels.copy(pixels, ((top + y) * width + left + x) * 4, from, from + 4);
  }
  const point = ([x, y]) => ({
    x: Math.round(left + (x - box.x) * scale),
    y: Math.round(top + (y - box.y) * scale),
  });
  const glove = point(frame.glove);
  const file = `${frame.pose}.png`;
  writePng(`${outputDir}/${file}`, width, height, pixels);
  metadata.poses[frame.pose] = {
    file, width, height, anchor: { x: center, y: baseline },
    bounds: { x: left, y: top, width: artWidth, height: artHeight },
    sourceBounds: box, sourceCrown: frame.crown,
    head: point(frame.head), glove, contact: glove,
  };
}
fs.writeFileSync(`${outputDir}/fighters.json`, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
