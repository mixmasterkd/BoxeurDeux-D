// Technical sizing only. The entire hall is original imagegen artwork.
// Reuse the project's PNG writer and RGBA reader; the small RGB adapter handles
// the built-in generator's opaque PNG output without another dependency.
import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { readPng, writePng } from './sprite-png.mjs';

const root = path.resolve(import.meta.dirname, '..');
const reference = path.join(root, 'references/direction-artistique/fight-hall');
const source = path.join(reference, 'fight-hall-source.png');
const destination = path.join(root, 'public/assets/backgrounds/fight-hall.png');

function readOpaquePng(filename) {
  const bytes = fs.readFileSync(filename);
  if (bytes[25] === 6) return readPng(filename);
  if (bytes[24] !== 8 || bytes[25] !== 2 || bytes[28] !== 0) throw new Error('Expected an 8-bit RGB or RGBA non-interlaced PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), parts = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') parts.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(parts)), stride = width * 3;
  if (raw.length !== height * (stride + 1)) throw new Error('Unexpected PNG scanline size');
  const rgb = Buffer.alloc(width * height * 3), pixels = Buffer.alloc(width * height * 4, 255);
  let cursor = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++];
    if (filter > 4) throw new Error('Unexpected PNG filter');
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const a = x >= 3 ? rgb[index - 3] : 0, b = y ? rgb[index - stride] : 0, c = y && x >= 3 ? rgb[index - stride - 3] : 0;
      rgb[index] = (raw[cursor++] + (filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c))) & 255;
    }
  }
  for (let i = 0; i < width * height; i++) rgb.copy(pixels, i * 4, i * 3, i * 3 + 3);
  return { width, height, pixels };
}

const image = readOpaquePng(source), width = 1280, height = 720;
const scale = Math.max(width / image.width, height / image.height);
const crop = { x: (image.width - width / scale) / 2, y: (image.height - height / scale) / 2,
  width: width / scale, height: height / scale };
const output = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const sx = Math.min(image.width - 1, Math.max(0, Math.floor(crop.x + (x + .5) / scale)));
  const sy = Math.min(image.height - 1, Math.max(0, Math.floor(crop.y + (y + .5) / scale)));
  const from = (sy * image.width + sx) * 4;
  image.pixels.copy(output, (y * width + x) * 4, from, from + 4);
}
writePng(destination, width, height, output);
const metadata = {
  source: 'references/direction-artistique/fight-hall/fight-hall-source.png',
  destination: 'public/assets/backgrounds/fight-hall.png',
  sourceSize: { width: image.width, height: image.height }, outputSize: { width, height },
  method: 'Uniform cover scale, centered fractional crop, nearest-neighbor sampling; no stretching, recoloring or drawn overlays.',
  scale, crop,
  visualLandmarks: { farRopesY: [230, 286, 346], blueCanvasBeginsY: 394, postsX: [130, 1140] },
};
fs.writeFileSync(path.join(reference, 'preparation.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
