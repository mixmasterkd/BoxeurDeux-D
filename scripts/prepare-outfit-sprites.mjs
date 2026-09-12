// Technical extraction only: the saved imagegen sheet is the artwork.
// This script preserves visible RGBA samples, with no RGB cutout or repainting.
// The imagegen alpha channel has near-invisible matte residues (alpha <= 16),
// treated as empty in the same way as the existing sprite-png.mjs extractor.
// Usage: node scripts/prepare-outfit-sprites.mjs --id street-blue --source references/characters/outfits/street-blue-alpha.png
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const outfitId = args[args.indexOf('--id') + 1];
if (!['street-blue', 'street-burgundy', 'boxing-emerald', 'boxing-burgundy'].includes(outfitId)) throw new Error('Supply a valid --id.');
const output = path.join(root, 'public/assets/sprites/outfits', outfitId);
const directions = ['down', 'right', 'up', 'left'];
const width = 96;
const height = 112;
const anchor = { x: 48, y: 104 };
const artHeight = 88;
const alphaThreshold = 16;
const sourceArgument = args.indexOf('--source');
if (sourceArgument < 0 || !args[sourceArgument + 1]) {
  throw new Error('Supply an RGBA source with --source references/characters/outfits/<filename>.png');
}
const filename = path.resolve(root, args[sourceArgument + 1]);
const image = readPng(filename);

function alphaAt(x, y) {
  return image.pixels[(y * image.width + x) * 4 + 3];
}
const visibleAt = (x, y) => alphaAt(x, y) > alphaThreshold;

// Some authored boots overlap the next row's vertical extent. Identify the
// twelve separate alpha silhouettes instead of cutting across those boots.
const count = image.width * image.height;
const labels = new Int32Array(count);
const queue = new Int32Array(count);
const components = [];
let transparentPixels = 0, componentId = 0;
for (let at = 0; at < count; at++) {
  if (image.pixels[at * 4 + 3] === 0) transparentPixels++;
  if (labels[at] || image.pixels[at * 4 + 3] <= alphaThreshold) continue;
  componentId++;
  let read = 0, write = 1, left = image.width, top = image.height, right = 0, bottom = 0;
  queue[0] = at; labels[at] = componentId;
  while (read < write) {
    const current = queue[read++], x = current % image.width, y = Math.floor(current / image.width);
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    const neighbors = [x > 0 ? current - 1 : -1, x < image.width - 1 ? current + 1 : -1,
      y > 0 ? current - image.width : -1, y < image.height - 1 ? current + image.width : -1];
    for (const next of neighbors) if (next >= 0 && !labels[next] && image.pixels[next * 4 + 3] > alphaThreshold) {
      labels[next] = componentId; queue[write++] = next;
    }
  }
  if (write > count * .005) components.push({ componentId, pixels: write, sourceBounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } });
}
if (transparentPixels / count < .35) throw new Error('Source needs genuine alpha; no RGB cutout is performed.');
if (components.length !== 12) throw new Error(`Expected twelve separate full-body poses, found ${components.length}.`);
components.sort((a, b) => a.sourceBounds.y - b.sourceBounds.y);
const frames = [];
for (let row = 0; row < 4; row++) {
  const group = components.slice(row * 3, row * 3 + 3).sort((a, b) => a.sourceBounds.x - b.sourceBounds.x);
  for (let frame = 0; frame < group.length; frame++) {
    const part = group[frame], box = part.sourceBounds;
    let headLeft = image.width, headRight = 0;
    for (let y = box.y; y < box.y + box.height * .24; y++) for (let x = box.x; x < box.x + box.width; x++) {
      if (labels[y * image.width + x] === part.componentId) { headLeft = Math.min(headLeft, x); headRight = Math.max(headRight, x + 1); }
    }
    frames.push({ key: `${directions[row]}-${frame}`, direction: directions[row], frame,
      componentId: part.componentId, sourceBounds: box, sourceAnchor: { x: (headLeft + headRight) / 2, y: box.y + box.height } });
  }
}

// One scale for the entire sheet: proportions must remain stable through the
// gait. Different pose heights come from the source, never per-pose fitting.
const scale = artHeight / frames[0].sourceBounds.height;
const prepared = frames.map((frame) => {
  const box = frame.sourceBounds;
  const scaledWidth = Math.round(box.width * scale);
  const scaledHeight = Math.round(box.height * scale);
  const left = Math.round(anchor.x + (box.x - frame.sourceAnchor.x) * scale);
  const top = anchor.y - scaledHeight;
  if (left < 0 || top < 0 || left + scaledWidth > width || top + scaledHeight > height) {
    throw new Error(`${frame.key} does not fit the shared ${width}×${height} canvas at the common scale.`);
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < scaledHeight; y += 1) {
    for (let x = 0; x < scaledWidth; x += 1) {
      const sourceX = box.x + Math.min(box.width - 1, Math.floor(x / scale));
      const sourceY = box.y + Math.min(box.height - 1, Math.floor(y / scale));
      const from = (sourceY * image.width + sourceX) * 4;
      const to = ((top + y) * width + left + x) * 4;
      if (labels[sourceY * image.width + sourceX] === frame.componentId) image.pixels.copy(pixels, to, from, from + 4);
    }
  }
  return {
    ...frame,
    file: `player-${frame.key}.png`,
    bounds: { x: left, y: top, width: scaledWidth, height: scaledHeight },
    pixels,
  };
});

const poses = Object.fromEntries(prepared.map(({ key, pixels, ...frame }) => [key, {
  ...frame, width, height, anchor, scale,
}]));
const metadata = {
  version: 1,
  outfitId,
  width,
  height,
  canvas: { width, height },
  anchor,
  artHeight,
  alphaThreshold,
  scale,
  source: {
    file: path.relative(root, filename),
    width: image.width,
    height: image.height,
    transparentPixels,
  },
  sourceBounds: frames.map(({ key, sourceBounds, sourceAnchor }) => ({ key, ...sourceBounds, anchor: sourceAnchor })),
  directions,
  poses,
};

// Validate the entire sheet before writing any runtime asset.
fs.mkdirSync(output, { recursive: true });
for (const frame of prepared) writePng(path.join(output, frame.file), width, height, frame.pixels);
fs.writeFileSync(path.join(output, 'player.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({ source: metadata.source, scale, anchor, poses: metadata.sourceBounds }, null, 2));
