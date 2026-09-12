// Technical extraction only: the saved imagegen sheet is the artwork.
// This script preserves visible RGBA samples, with no RGB cutout or repainting.
// The imagegen alpha channel has near-invisible matte residues (alpha <= 16),
// treated as empty in the same way as the existing sprite-png.mjs extractor.
// Usage: node scripts/prepare-cycling-sprites.mjs --source references/characters/cycling/player-alpha.png
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/assets/sprites/cycling');
const directions = ['down', 'right', 'up', 'left'];
const width = 160;
const height = 152;
const anchor = { x: 80, y: 144 };
const artHeight = 116;
const alphaThreshold = 16;
const args = process.argv.slice(2);
const sourceArgument = args.indexOf('--source');
if (sourceArgument < 0 || !args[sourceArgument + 1]) {
  throw new Error('Supply an RGBA source with --source references/characters/cycling/<filename>.png');
}
const filename = path.resolve(root, args[sourceArgument + 1]);
const image = readPng(filename);

function alphaAt(x, y) {
  return image.pixels[(y * image.width + x) * 4 + 3];
}
const visibleAt = (x, y) => alphaAt(x, y) > alphaThreshold;

// Empty gutters, rather than thirds of the whole canvas, locate the figures.
// The generated source has generous outside margins and tighter inner ones.
function runs(counts, minimumGap = 3) {
  const result = [];
  let start = -1;
  let lastVisible = -1;
  for (let index = 0; index <= counts.length; index += 1) {
    if (index < counts.length && counts[index] > 0) {
      if (start < 0) start = index;
      lastVisible = index;
    } else if (start >= 0 && (index - lastVisible >= minimumGap || index === counts.length)) {
      result.push({ start, end: lastVisible + 1 });
      start = -1;
    }
  }
  return result;
}

let transparentPixels = 0;
const rows = Array(image.height).fill(0);
for (let y = 0; y < image.height; y += 1) {
  for (let x = 0; x < image.width; x += 1) {
    if (visibleAt(x, y)) rows[y] += 1;
    if (alphaAt(x, y) === 0) transparentPixels += 1;
  }
}
if (transparentPixels / (image.width * image.height) < .35) {
  throw new Error('The source needs genuine transparent gutters; ask imagegen to correct it. No code-based cutout is performed.');
}
const rowRuns = runs(rows);
if (rowRuns.length !== 4) {
  throw new Error(`Expected four separate pose rows, found ${rowRuns.length}; inspect the source alignment and alpha.`);
}

const frames = [];
for (let rowIndex = 0; rowIndex < rowRuns.length; rowIndex += 1) {
  const row = rowRuns[rowIndex];
  const columns = Array(image.width).fill(0);
  for (let x = 0; x < image.width; x += 1) {
    for (let y = row.start; y < row.end; y += 1) if (visibleAt(x, y)) columns[x] += 1;
  }
  const columnRuns = runs(columns);
  if (columnRuns.length !== 3) {
    throw new Error(`Expected three separate poses in ${directions[rowIndex]}, found ${columnRuns.length}; inspect the source.`);
  }
  for (let columnIndex = 0; columnIndex < columnRuns.length; columnIndex += 1) {
    const column = columnRuns[columnIndex];
    let top = row.end;
    let bottom = row.start;
    for (let y = row.start; y < row.end; y += 1) {
      for (let x = column.start; x < column.end; x += 1) {
        if (visibleAt(x, y)) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y + 1);
        }
      }
    }
    const sourceBounds = { x: column.start, y: top, width: column.end - column.start, height: bottom - top };

    // The cap/head is the stable body reference. Centring the full silhouette
    // independently would make swinging hands and feet jerk the torso sideways.
    let headLeft = column.end;
    let headRight = column.start;
    const headBottom = top + Math.round(sourceBounds.height * .24);
    for (let y = top; y < headBottom; y += 1) {
      for (let x = column.start; x < column.end; x += 1) {
        if (visibleAt(x, y)) {
          headLeft = Math.min(headLeft, x);
          headRight = Math.max(headRight, x + 1);
        }
      }
    }
    frames.push({
      key: `${directions[rowIndex]}-${columnIndex}`,
      direction: directions[rowIndex],
      frame: columnIndex,
      sourceBounds,
      sourceAnchor: { x: (headLeft + headRight) / 2, y: bottom },
    });
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
      if (image.pixels[from + 3] > alphaThreshold) image.pixels.copy(pixels, to, from, from + 4);
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
