// Technical extraction of authored imagegen poses, with a single scale per actor.
// No anatomy is drawn here. Sources, transparency edits and prompts are preserved.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, extract } from './sprite-png.mjs';
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/assets/sprites');
for (const id of ['rope', 'speedball']) fs.mkdirSync(path.join(output, id), { recursive: true });

const rope = readPng(path.join(root, 'references/characters/rope/player-alpha.png'));
const ropePoses = [
  ['ready', 0, 0, 277, [125, 270], [428, 269]],
  ['load', 1, 0, 775, [620, 279], [912, 269]],
  ['left', 2, 0, 1260, [1107, 258], [1394, 248]],
  ['right', 0, 1, 277, [124, 762], [423, 759]],
  ['land', 1, 1, 777, [627, 782], [912, 780]],
  ['stumble', 2, 1, 1260, [1095, 773], [1405, 747]],
];
const data = { canvas: { width: 384, height: 416 }, anchor: { x: 192, y: 390 }, poses: {} };
for (const [name, col, row, sourceCenter, leftHandle, rightHandle] of ropePoses) {
  data.poses[name] = extract(rope, { x: col * 512, y: row * 512, w: 512, h: 512 }, `rope/player-${name}.png`, {
    scale: .76, baseline: 390, center: 192, width: 384, canvasHeight: 416,
    sourceCenter, landmarks: { leftHandle, rightHandle },
  });
}
fs.writeFileSync(path.join(output, 'rope/player.json'), JSON.stringify(data, null, 2) + '\n');

const speedball = readPng(path.join(root, 'references/characters/speedball/player-alpha.png'));
const speedPoses = [
  ['left-contact', 0, 222, [390, 145]],
  ['left-return', 1, 647, [745, 184]],
  ['right-contact', 2, 1074, [1220, 148]],
  ['right-return', 3, 1503, [1620, 192]],
];
const speedData = { canvas: { width: 300, height: 408 }, anchor: { x: 130, y: 384 }, poses: {} };
for (const [name, col, sourceCenter, glove] of speedPoses) {
  const x = Math.floor(col * speedball.width / 4);
  speedData.poses[name] = extract(speedball, { x, y: 0, w: Math.floor((col + 1) * speedball.width / 4) - x, h: speedball.height }, `speedball/player-${name}.png`, {
    scale: .47, baseline: 384, center: 130, width: 300, canvasHeight: 408,
    sourceCenter, landmarks: { glove },
  });
}
const ball = readPng(path.join(root, 'references/characters/speedball/ball-alpha.png'));
speedData.ball = extract(ball, { x: 0, y: 0, w: ball.width, h: ball.height }, 'speedball/ball.png', {
  height: 102, baseline: 108, center: 40, width: 80, canvasHeight: 116,
  landmarks: { pivot: [625, 104] },
});
fs.writeFileSync(path.join(output, 'speedball/player.json'), JSON.stringify(speedData, null, 2) + '\n');
console.log('Six rope poses, four speed ball poses and leather ball prepared with transparent backgrounds.');
