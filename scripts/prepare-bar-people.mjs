// Technical extraction only: preserve generated RGBA and resize uniformly with nearest neighbour.
// The source contains Béton on the left and Kramer on the right, with a transparent background.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const reference = path.join(root, 'references/bar-street');
const source = path.join(reference, 'people-alpha-source.png');
const width = 96, height = 112, anchor = { x: 48, y: 104 };
const alphaThreshold = 64;

function bounds(image, left, right) {
  let x0 = right, y0 = image.height, x1 = -1, y1 = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = left; x < right; x++) {
      if (image.pixels[(y * image.width + x) * 4 + 3] <= alphaThreshold) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  if (x1 < x0 || y1 < y0) throw new Error(`No visible figure in source columns ${left}..${right - 1}`);
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function prepare(image, id, left, right, artHeight) {
  const crop = bounds(image, left, right);
  const scale = artHeight / crop.height;
  const artWidth = Math.round(crop.width * scale);
  const offsetX = Math.round(anchor.x - artWidth / 2);
  const offsetY = anchor.y - artHeight;
  if (artWidth < 1 || offsetX < 0 || offsetX + artWidth > width || offsetY < 0) {
    throw new Error(`${id}: the uniformly resized figure (${artWidth}×${artHeight}) does not fit ${width}×${height}`);
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < artHeight; y++) {
    for (let x = 0; x < artWidth; x++) {
      const sx = crop.x + Math.min(crop.width - 1, Math.floor(x / scale));
      const sy = crop.y + Math.min(crop.height - 1, Math.floor(y / scale));
      const from = (sy * image.width + sx) * 4;
      const to = ((y + offsetY) * width + x + offsetX) * 4;
      // Copy all four channels unchanged, including partial transparency inside the crop.
      image.pixels.copy(pixels, to, from, from + 4);
    }
  }
  return {
    pixels,
    metadata: {
      id, destination: `public/assets/bar/${id}.png`,
      region: { left, right }, sourceBounds: crop, scale,
      width, height, anchor,
      bounds: { x: offsetX, y: offsetY, width: artWidth, height: artHeight },
    },
  };
}

if (!fs.existsSync(source)) throw new Error(`Missing RGBA source: ${source}`);
const image = readPng(source);
let transparentPixels = 0;
for (let i = 3; i < image.pixels.length; i += 4) {
  if (image.pixels[i] <= alphaThreshold) transparentPixels++;
}
if (!transparentPixels) throw new Error('Source has no transparent background; refusing an opaque or flattened image.');
const middle = Math.floor(image.width / 2);
// Prepare and validate both figures before writing either destination.
const figures = [
  prepare(image, 'beton', 0, middle, 88),
  prepare(image, 'kramer', middle, image.width, 90),
];
fs.mkdirSync(path.join(root, 'public/assets/bar'), { recursive: true });
for (const figure of figures) writePng(path.join(root, figure.metadata.destination), width, height, figure.pixels);
const report = {
  method: 'Alpha-bounds crops (>64); uniform nearest-neighbour resize; source RGBA preserved without recolouring or redraw.',
  source: path.relative(root, source), sourceSize: { width: image.width, height: image.height },
  transparentPixels, alphaThreshold, outputs: figures.map(figure => figure.metadata),
};
fs.writeFileSync(path.join(reference, 'sprites-preparation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
