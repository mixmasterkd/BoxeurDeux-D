// Technical extraction and proportional sampling only. Imagegen owns all art/alpha.
import fs from 'node:fs';
import { readPng, writePng } from './sprite-png.mjs';
import { crop, fit } from './chapter-png.mjs';

function bounds(im, cell) {
  let x0 = im.width, y0 = im.height, x1 = -1, y1 = -1;
  for (let y = cell.y; y < cell.y + cell.h; y++) for (let x = cell.x; x < cell.x + cell.w; x++) if (im.pixels[(y * im.width + x) * 4 + 3] > 48) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0) throw Error('Empty source cell');
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function normalize(im, b, scale, width = 512, height = 640, anchor = { x: 256, y: 624 }) {
  let footLeft = Infinity, footRight = -1;
  for (let y = b.y + b.h - Math.ceil(b.h * .065); y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (im.pixels[(y * im.width + x) * 4 + 3] > 96) { footLeft = Math.min(footLeft, x); footRight = Math.max(footRight, x); }
  const foot = (footLeft + footRight) / 2, top = anchor.y - b.h * scale, pixels = Buffer.alloc(width * height * 4);
  if (b.w * scale > width || top < 0) throw Error('Sprite cannot fit without clipping');
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.floor(foot + (x - anchor.x + .5) / scale), sy = Math.floor(b.y + (y - top + .5) / scale);
    if (sx < b.x || sx >= b.x + b.w || sy < b.y || sy >= b.y + b.h) continue;
    const from = (sy * im.width + sx) * 4;
    if (im.pixels[from + 3] > 16) im.pixels.copy(pixels, (y * width + x) * 4, from, from + 4);
  }
  return { width, height, pixels, foot, top, point: ([x, y]) => ({ x: anchor.x + (x - foot) * scale, y: top + (y - b.y) * scale }) };
}
function small(im, output, artHeight = 91) {
  const b = bounds(im, { x: 0, y: 0, w: im.width, h: im.height });
  const frame = normalize(im, b, artHeight / b.h, 96, 112, { x: 48, y: 104 });
  writePng(output, frame.width, frame.height, frame.pixels);
}
fs.mkdirSync('public/assets/sprites/friends', { recursive: true });
for (const person of ['fredo', 'octopus']) {
  if (person === 'octopus' && fs.existsSync('references/characters/octopus/jab-alpha.png')) {
    const frames = {}, meta = { width: 512, height: 640, anchor: { x: 256, y: 624 }, artHeight: 512, poses: {} };
    for (const name of ['idle', 'ready', 'jab']) {
      const source = `references/characters/octopus/${name}-alpha.png`, im = readPng(source);
      const b = bounds(im, { x: 0, y: 0, w: im.width, h: im.height });
      const scale = Math.min(512 / b.h, 482 / b.w), frame = normalize(im, b, scale);
      const alpha = im.pixels.filter((v, i) => i % 4 === 3 && v === 0).length / (im.width * im.height);
      if (alpha < .35) throw Error(`${source}: real alpha required`);
      writePng(`public/assets/sprites/octopus/${name}.png`, 512, 640, frame.pixels);
      frames[name] = frame; meta.poses[name] = { source, sourceBounds: b, scale, foot: frame.foot, transparentFraction: alpha };
    }
    for (const name of ['idle', 'ready']) small(frames[name], `public/assets/sprites/friends/octopus-${name}.png`);
    const portrait = fit(crop(frames.idle, 118, 108, 260, 270), 256, 256);
    writePng('public/assets/sprites/friends/octopus-portrait.png', 256, 256, portrait.pixels);
    fs.writeFileSync('public/assets/sprites/octopus/fighter.json', JSON.stringify(meta, null, 2) + '\n');
    console.log('octopus: three individual alpha cutouts, normalized full bodies');
    continue;
  }
  const source = `references/characters/${person}/alpha.png`;
  if (!fs.existsSync(source)) continue;
  const im = readPng(source), transparent = im.pixels.filter((v, i) => i % 4 === 3 && v === 0).length / (im.width * im.height);
  if (transparent < .35) throw Error(`${person}: real alpha required`);
  const names = person === 'fredo' ? ['ready', 'left', 'right', 'sweep'] : ['idle', 'ready', 'jab'];
  const cells = names.map((_, i) => bounds(im, { x: Math.floor(i % 2 * im.width / 2), y: Math.floor(Math.floor(i / 2) * im.height / 2), w: Math.floor(im.width / 2), h: Math.floor(im.height / 2) }));
  const scale = Math.min(512 / cells[0].h, ...cells.map(b => 482 / b.w));
  const targets = [[[427, 220], [313, 221]], [[997, 123], [834, 321]], [[439, 942], [273, 736]], [[970, 934], [825, 936]]];
  const meta = { width: 512, height: 640, anchor: { x: 256, y: 624 }, artHeight: cells[0].h * scale, source, scale, transparentFraction: transparent, poses: {} };
  fs.mkdirSync(`public/assets/sprites/${person}`, { recursive: true });
  const frames = names.map((name, i) => {
    const frame = normalize(im, cells[i], scale);
    writePng(`public/assets/sprites/${person}/${name}.png`, 512, 640, frame.pixels);
    meta.poses[name] = { sourceBounds: cells[i], foot: frame.foot, scale,
      ...(person === 'fredo' ? { leftTarget: frame.point(targets[i][0]), rightTarget: frame.point(targets[i][1]) } : {}) };
    return frame;
  });
  fs.writeFileSync(`public/assets/sprites/${person}/${person === 'fredo' ? 'coach' : 'fighter'}.json`, JSON.stringify(meta, null, 2) + '\n');
  small(frames[person === 'fredo' ? 3 : 0], `public/assets/sprites/friends/${person}-idle.png`);
  small(frames[person === 'fredo' ? 0 : 1], `public/assets/sprites/friends/${person}-ready.png`);
  const portrait = person === 'fredo' ? crop(frames[0], 110, 108, 292, 292) : crop(im, Math.floor(im.width / 2), Math.floor(im.height / 2), Math.floor(im.width / 2), Math.floor(im.height / 2));
  const icon = fit(portrait, 256, 256); writePng(`public/assets/sprites/friends/${person}-portrait.png`, 256, 256, icon.pixels);
  console.log(`${person}: ${names.length} poses, alpha ${Math.round(transparent * 100)}%, common scale ${scale.toFixed(3)}`);
}

// Dedicated overhead silhouettes: retain combat art for pads/drills and portraits.
const explorerSource = 'references/characters/gym-explorers/source.png';
if (fs.existsSync(explorerSource)) {
  const im = readPng(explorerSource);
  const transparent = im.pixels.filter((v, i) => i % 4 === 3 && v === 0).length / (im.width * im.height);
  if (transparent < .35) throw Error('Explorer sheet requires real transparency');
  const names = ['fredo-idle', 'fredo-ready', 'octopus-idle', 'octopus-ready'];
  const boxes = names.map((_, i) => bounds(im, { x: Math.floor(i % 2 * im.width / 2), y: Math.floor(Math.floor(i / 2) * im.height / 2), w: Math.floor(im.width / 2), h: Math.floor(im.height / 2) }));
  const scale = 91 / Math.max(...boxes.map(b => b.h));
  const meta = { width: 96, height: 112, anchor: { x: 48, y: 104 }, source: explorerSource, scale, transparentFraction: transparent, poses: {} };
  names.forEach((name, i) => {
    const frame = normalize(im, boxes[i], scale, 96, 112, meta.anchor);
    writePng(`public/assets/sprites/friends/${name}.png`, 96, 112, frame.pixels);
    meta.poses[name] = { sourceBounds: boxes[i], artHeight: boxes[i].h * scale };
  });
  fs.writeFileSync('public/assets/sprites/friends/explorers.json', JSON.stringify(meta, null, 2) + '\n');
  console.log('Gym explorers: four compact silhouettes, common scale, aligned feet');
}
