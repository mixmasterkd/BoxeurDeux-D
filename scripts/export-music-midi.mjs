// Export the game's editable compositions as standard MIDI format 1.
// Run: node scripts/export-music-midi.mjs [output-directory]
// No sequencer, synthesizer, npm dependency, or external service is required.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {MUSIC_TRACKS} from '../src/audio/MusicScores.js';

export const MIDI_PPQ = 480;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const MIDI_VOICES = Object.freeze({
  lead: {channel: 0, program: 80, title: 'Mélodie · Lead doux'},
  keys: {channel: 1, program: 4, title: 'Accords · Piano électrique'},
  bell: {channel: 2, program: 10, title: 'Contrechant · Boîte à musique'},
  pad: {channel: 3, program: 89, title: 'Harmonie · Nappe chaude'},
  bass: {channel: 4, program: 38, title: 'Basse · Synthétiseur'},
});
const DRUMS = new Set(['kick', 'snare', 'hat', 'clap', 'tom']);
const bytes = values => Buffer.from(values);
const u16 = value => {const b = Buffer.alloc(2); b.writeUInt16BE(value); return b;};
const u32 = value => {const b = Buffer.alloc(4); b.writeUInt32BE(value); return b;};
function variable(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0x0fffffff) throw new RangeError('MIDI delta outside range.');
  const out = [value & 0x7f];
  while ((value = Math.floor(value / 128)) > 0) out.unshift((value & 0x7f) | 0x80);
  return bytes(out);
}
function meta(type, content) {
  const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : bytes(content);
  return Buffer.concat([bytes([0xff, type]), variable(data.length), data]);
}
function chunk(type, data) {return Buffer.concat([Buffer.from(type, 'ascii'), u32(data.length), data]);}
function event(tick, priority, data) {return {tick, priority, data};}
function track(events, endTick) {
  let previous = 0;
  const parts = [];
  for (const item of events.sort((a, b) => a.tick - b.tick || a.priority - b.priority)) {
    if (item.tick < 0 || item.tick > endTick) throw new RangeError('MIDI event outside loop.');
    parts.push(variable(item.tick - previous), item.data); previous = item.tick;
  }
  parts.push(variable(endTick - previous), meta(0x2f, []));
  return chunk('MTrk', Buffer.concat(parts));
}

export function encodeMusicMidi(score) {
  const endTick = Math.round(score.loopBeats * MIDI_PPQ), micros = Math.round(60000000 / score.bpm);
  const conductor = [
    event(0, 0, meta(0x03, `${score.title} · BoxeurDeux-D`)),
    event(0, 1, meta(0x01, 'Original composition. 16 bars; A / A-prime / B / return.')),
    event(0, 1, meta(0x51, [(micros >>> 16) & 255, (micros >>> 8) & 255, micros & 255])),
    event(0, 1, meta(0x58, [4, 2, 24, 8])),
    event(0, 2, meta(0x06, 'LOOP_START')),
    ...['SECTION_A', 'SECTION_A_PRIME', 'SECTION_B', 'SECTION_RETURN'].map((label, index) => event(index * 16 * MIDI_PPQ, 3, meta(0x06, label))),
    event(endTick, 3, meta(0x06, 'LOOP_END')),
  ];
  const groups = new Map();
  for (const note of score.notes) {
    const id = DRUMS.has(note.instrument) ? 'drums' : note.instrument;
    if (id !== 'drums' && !MIDI_VOICES[id]) throw new Error(`Unknown MIDI instrument ${id}.`);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(note);
  }
  const tracks = [track(conductor, endTick)];
  for (const [id, notes] of groups) {
    const voice = id === 'drums' ? {channel: 9, title: 'Batterie · GM percussion'} : MIDI_VOICES[id];
    const pan = id === 'drums' ? 64 : Math.max(0, Math.min(127, Math.round((notes[0].pan + 1) * 63.5)));
    const events = [event(0, 0, meta(0x03, voice.title)), event(0, 1, bytes([0xb0 | voice.channel, 10, pan]))];
    if (voice.program !== undefined) events.push(event(0, 1, bytes([0xc0 | voice.channel, voice.program])));
    for (const note of notes) {
      const start = Math.round(note.beat * MIDI_PPQ), end = Math.round((note.beat + note.duration) * MIDI_PPQ);
      const velocity = Math.max(1, Math.min(127, Math.round(note.velocity * 127)));
      // Note-offs precede note-ons at a shared tick, including a repeated pitch.
      events.push(event(start, 4, bytes([0x90 | voice.channel, note.midi, velocity])),
        event(end, 2, bytes([0x80 | voice.channel, note.midi, 0])));
    }
    tracks.push(track(events, endTick));
  }
  return Buffer.concat([chunk('MThd', Buffer.concat([u16(1), u16(tracks.length), u16(MIDI_PPQ)])), ...tracks]);
}

export function exportMusicMidi(outputDirectory = path.join(ROOT, 'public/assets/music/midi')) {
  fs.mkdirSync(outputDirectory, {recursive: true});
  return Object.values(MUSIC_TRACKS).map(score => {
    const filename = path.join(outputDirectory, `${score.id}.mid`), data = encodeMusicMidi(score);
    fs.writeFileSync(filename, data);
    return {id: score.id, title: score.title, filename, bytes: data.length, bpm: score.bpm, duration: score.loopBeats * 60 / score.bpm};
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const exported = exportMusicMidi(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  for (const result of exported) process.stdout.write(`${result.id}.mid · ${result.bpm} BPM · ${result.duration.toFixed(1)} s · ${result.bytes} octets\n`);
}
