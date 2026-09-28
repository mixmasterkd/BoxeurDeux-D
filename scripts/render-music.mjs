// Deterministic listening export of the exact in-game synthesizer. Requires the
// same Playwright installation as the browser checks; no soundfont or service.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../tests/control-helpers.mjs';
import { MUSIC_TRACKS } from '../src/audio/MusicScores.js';

const output = path.resolve(process.env.MUSIC_RENDER_OUTPUT || '/tmp/boxeur-music-renders');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
function wav(samples, rate) {
  const result = Buffer.alloc(44 + samples.length * 2);
  result.write('RIFF'); result.writeUInt32LE(result.length - 8, 4); result.write('WAVEfmt ', 8);
  result.writeUInt32LE(16, 16); result.writeUInt16LE(1, 20); result.writeUInt16LE(2, 22);
  result.writeUInt32LE(rate, 24); result.writeUInt32LE(rate * 4, 28);
  result.writeUInt16LE(4, 32); result.writeUInt16LE(16, 34); result.write('data', 36); result.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) result.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return result;
}
try {
  const context = await browser.newContext();
  await context.route('https://music-render.invalid/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>BoxeurDeux-D · Rendu musical</title>' });
    if (!/^\/src\/audio\/(MusicScores|RetroInstruments)\.js$/.test(pathname)) return route.abort();
    await route.fulfill({ contentType: 'text/javascript', body: await fs.readFile(path.resolve(pathname.slice(1))) });
  });
  const page = await context.newPage(); await page.goto('https://music-render.invalid/');
  const reports = [], excerpts = [], rate = 22050;
  for (const track of Object.values(MUSIC_TRACKS)) {
    const rendered = await page.evaluate(async ({ id, rate }) => {
      const { MUSIC_TRACKS } = await import('/src/audio/MusicScores.js');
      const { createMusicBus, playMusicNote } = await import('/src/audio/RetroInstruments.js');
      const score = MUSIC_TRACKS[id], beatLength = 60 / score.bpm, duration = score.loopBeats * beatLength;
      // Render two repeats to verify the join and retain the compressor state.
      const audio = new OfflineAudioContext(2, Math.ceil((duration * 2 + .1) * rate), rate);
      const bus = createMusicBus(audio); bus.output.gain.value = .75;
      for (let loop = 0; loop < 2; loop++) for (const note of score.notes) playMusicNote(audio, bus.input, note, .025 + loop * duration + note.beat * beatLength, beatLength);
      const buffer = await audio.startRendering(), channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
      const start = Math.round((duration + .025) * rate), frames = Math.round(duration * rate);
      const samples = new Float32Array(frames * 2); let peak = 0, energy = 0, delta = 0;
      for (let i = 0; i < frames; i++) for (let ch = 0; ch < 2; ch++) {
        const value = channels[ch][start + i]; samples[i * 2 + ch] = value; peak = Math.max(peak, Math.abs(value)); energy += value * value;
        if (i) delta = Math.max(delta, Math.abs(value - channels[ch][start + i - 1]));
      }
      let joinEnergy = 0, joinPeakDelta = 0;
      for (let i = start - Math.round(.05 * rate); i < start + Math.round(.05 * rate); i++) {
        joinEnergy += channels[0][i] ** 2;
        joinPeakDelta = Math.max(joinPeakDelta, Math.abs(channels[0][i] - channels[0][i - 1]));
      }
      // Returning binary base64 keeps the bridge smaller than millions of JSON numbers.
      const bytes = new Uint8Array(samples.buffer); let binary = '';
      for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      return { data: btoa(binary), duration, frames, peak, rms: Math.sqrt(energy / samples.length), maxSampleDelta: delta, joinRms: Math.sqrt(joinEnergy / Math.round(.1 * rate)), joinPeakDelta };
    }, { id: track.id, rate });
    const bytes = Buffer.from(rendered.data, 'base64'), samples = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
    assert.ok(Number.isFinite(rendered.rms) && rendered.rms > .015, `${track.id}: audible finite signal`);
    assert.ok(rendered.peak < .98, `${track.id}: headroom without clipping`);
    assert.ok(rendered.joinRms > .005, `${track.id}: no empty loop join`);
    await fs.writeFile(path.join(output, `${track.id}.wav`), wav(samples, rate));
    // Four opening bars per track, with short fades between sampler excerpts.
    const excerpt = samples.slice(0, Math.round(16 * 60 / track.bpm * rate) * 2), frames = excerpt.length / 2;
    for (let i = 0; i < frames; i++) {
      const fade = Math.min(1, i / (rate * .025), (frames - i - 1) / (rate * .12));
      excerpt[2 * i] *= fade; excerpt[2 * i + 1] *= fade;
    }
    excerpts.push(excerpt); delete rendered.data;
    reports.push({ id: track.id, title: track.title, bpm: track.bpm, ...rendered });
    console.log(`${track.id}: ${rendered.duration.toFixed(1)} s · peak ${rendered.peak.toFixed(3)} · RMS ${rendered.rms.toFixed(3)}`);
  }
  const sampler = new Float32Array(excerpts.reduce((n, value) => n + value.length, 0)); let offset = 0;
  for (const excerpt of excerpts) { sampler.set(excerpt, offset); offset += excerpt.length; }
  await fs.writeFile(path.join(output, 'sampler.wav'), wav(sampler, rate));
  await fs.writeFile(path.join(output, 'render-report.json'), JSON.stringify({ sampleRate: rate, previewGain: .75, runtimeDefaultGain: .25, tracks: reports }, null, 2) + '\n');
  console.log(`WAV + sampler + report: ${output}`);
} finally { await browser.close(); }
