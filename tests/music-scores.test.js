import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MUSIC_TRACKS} from '../src/audio/MusicScores.js';
import {encodeMusicMidi, MIDI_PPQ, MIDI_VOICES} from '../scripts/export-music-midi.mjs';

const ids = ['home', 'city', 'gym', 'shops', 'metro', 'island', 'casino', 'hotel', 'cuba', 'mexico', 'marathon', 'bout'];
const instruments = new Set(['lead', 'bell', 'keys', 'pad', 'bass', 'kick', 'snare', 'hat', 'clap', 'tom']);
const drums = new Set(['kick', 'snare', 'hat', 'clap', 'tom']);
const melodyBar = (score, index) => score.notes.filter(n => n.instrument === 'lead' && n.beat >= index * 4 && n.beat < (index + 1) * 4)
  .map(n => [Math.round((n.beat - index * 4) * 1000), n.midi, n.duration]);

function decodeMidi(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'MThd'); assert.equal(buffer.readUInt32BE(4), 6);
  const format = buffer.readUInt16BE(8), count = buffer.readUInt16BE(10), ppq = buffer.readUInt16BE(12), tracks = [];
  let cursor = 14;
  const variable = () => {
    let value = 0;
    for (let byte = 0; byte < 4; byte++) {
      const part = buffer[cursor++]; assert.notEqual(part, undefined);
      value = value * 128 + (part & 0x7f); if (!(part & 0x80)) return value;
    }
    throw new Error('Invalid MIDI variable-length value.');
  };
  while (cursor < buffer.length) {
    assert.equal(buffer.toString('ascii', cursor, cursor + 4), 'MTrk');
    const length = buffer.readUInt32BE(cursor + 4); cursor += 8;
    const end = cursor + length, events = []; let tick = 0;
    while (cursor < end) {
      tick += variable(); const status = buffer[cursor++];
      if (status === 0xff) {
        const type = buffer[cursor++], size = variable(), content = buffer.subarray(cursor, cursor + size); cursor += size;
        events.push({tick, status, type, content});
      } else {
        assert.ok(status >= 0x80 && status <= 0xef, 'Explicit channel status must be valid.');
        const command = status & 0xf0, size = command === 0xc0 || command === 0xd0 ? 1 : 2;
        const data = [...buffer.subarray(cursor, cursor + size)]; cursor += size;
        assert.ok(data.every(byte => byte < 128), 'Channel data uses seven bits.');
        events.push({tick, command, channel: status & 0xf, data});
      }
    }
    assert.equal(cursor, end); tracks.push(events);
  }
  assert.equal(tracks.length, count); return {format, ppq, tracks};
}

test('music: twelve original 16-bar loops have legal timed notes, bounded polyphony and distinct melodies', () => {
  assert.deepEqual(Object.keys(MUSIC_TRACKS), ids);
  const signatures = new Set();
  for (const score of Object.values(MUSIC_TRACKS)) {
    assert.equal(score.bars, 16); assert.equal(score.beatsPerBar, 4); assert.equal(score.loopBeats, 64);
    assert.equal(score.id in MUSIC_TRACKS, true);
    assert.ok(score.loopBeats * 60 / score.bpm >= 30 && score.loopBeats * 60 / score.bpm <= 50, score.id);
    assert.equal(score.notes[0].beat, 0, `${score.id}: sound begins immediately`);
    const used = new Set(); let lastBeat = -1;
    for (const note of score.notes) {
      assert.ok(Number.isFinite(note.beat) && note.beat >= 0 && note.beat >= lastBeat); lastBeat = note.beat;
      assert.ok(Number.isFinite(note.duration) && note.duration > 0 && note.beat + note.duration <= 64.000001);
      assert.ok(Number.isInteger(note.midi) && note.midi >= 0 && note.midi <= 127);
      assert.ok(note.velocity > 0 && note.velocity <= 1 && note.pan >= -1 && note.pan <= 1);
      assert.ok(instruments.has(note.instrument)); used.add(note.instrument);
      if (drums.has(note.instrument)) assert.ok([36, 38, 39, 42, 45].includes(note.midi));
    }
    for (const name of ['lead', 'bass', 'kick', 'hat']) assert.ok(used.has(name), `${score.id}: ${name}`);
    assert.ok(['keys', 'pad', 'bell'].some(name => used.has(name)), `${score.id}: harmonic accompaniment`);
    const timeline = score.notes.flatMap(n => [[n.beat, 1], [n.beat + n.duration, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let active = 0, max = 0;
    for (const [, delta] of timeline) {active += delta; max = Math.max(max, active);}
    assert.equal(active, 0); assert.ok(max <= 24, `${score.id}: ${max} simultaneous score voices`);
    signatures.add(JSON.stringify(score.notes.filter(n => n.instrument === 'lead').map(n => [n.beat, n.midi, n.duration])));
  }
  assert.equal(signatures.size, 12, 'Locations do not just rename the same melody.');
});

test('music: written phrases return recognizably, with contrasting bridge and varied bar melodies', () => {
  for (const score of Object.values(MUSIC_TRACKS)) {
    const bars = Array.from({length: 16}, (_, bar) => JSON.stringify(melodyBar(score, bar)));
    assert.ok(bars.slice(4).includes(bars[0]), `${score.id}: opening motif returns`);
    assert.notEqual(bars.slice(0, 4).join(), bars.slice(8, 12).join(), `${score.id}: B section contrasts with A`);
    assert.ok(new Set(bars).size >= 12, `${score.id}: harmony is accompanied by melodic development`);
    assert.ok(score.notes.filter(n => n.instrument === 'lead').length >= 50, `${score.id}: a written melodic part`);
  }
});

for (const id of ids) {
  test(`music MIDI: ${id} has portable tempo, tracks, program changes, balanced notes and exact loop markers`, () => {
    const score = MUSIC_TRACKS[id], data = encodeMusicMidi(score), midi = decodeMidi(data), end = 64 * 480;
    assert.equal(midi.format, 1); assert.equal(midi.ppq, MIDI_PPQ); assert.equal(midi.ppq, 480);
    assert.ok(midi.tracks.length >= 5);
    const conductor = midi.tracks[0], tempo = conductor.find(e => e.type === 0x51).content.readUIntBE(0, 3);
    assert.ok(Math.abs(60000000 / tempo - score.bpm) < .001);
    assert.ok(conductor.some(e => e.type === 3 && e.content.toString('utf8').includes(score.title)));
    for (const [marker, tick] of [['LOOP_START', 0], ['LOOP_END', end]]) assert.ok(conductor.some(e => e.type === 6 && e.content.toString() === marker && e.tick === tick));
    assert.deepEqual([...conductor.find(e => e.type === 0x58).content], [4, 2, 24, 8]);
    let ons = 0, offs = 0, percussion = 0;
    const active = new Map();
    for (const events of midi.tracks) {
      assert.equal(events.at(-1).type, 0x2f); assert.equal(events.at(-1).tick, end);
      assert.ok(events.every(event => event.tick <= end));
      assert.ok(events.some(event => event.type === 3), 'Every track is named.');
      for (const event of events) {
        if (event.command === 0xc0) assert.ok(Object.values(MIDI_VOICES).some(v => v.channel === event.channel && v.program === event.data[0]));
        if (event.command === 0x90) {
          ons++; if (event.channel === 9) percussion++;
          const key = `${event.channel}:${event.data[0]}`; active.set(key, (active.get(key) ?? 0) + 1);
          assert.ok(event.data[1] > 0);
        }
        if (event.command === 0x80) {
          offs++; const key = `${event.channel}:${event.data[0]}`;
          assert.ok(active.get(key) > 0, 'Every note-off follows its note-on.'); active.set(key, active.get(key) - 1);
        }
      }
    }
    assert.equal(ons, score.notes.length); assert.equal(offs, ons); assert.ok(percussion > 0);
    assert.ok([...active.values()].every(n => n === 0), 'No MIDI note hangs across the loop.');
    assert.deepEqual(fs.readFileSync(new URL(`../public/assets/music/midi/${id}.mid`, import.meta.url)), data, 'Checked-in MIDI matches the editable game score.');
  });
}
