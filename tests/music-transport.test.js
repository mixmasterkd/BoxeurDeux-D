import test from 'node:test';
import assert from 'node:assert/strict';
import { RetroMusic, MUSIC_STORAGE_KEY } from '../src/audio/RetroMusic.js';
import { MUSIC_TRACKS } from '../src/audio/MusicScores.js';

const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
const node = () => ({ connect() {}, disconnect() { this.disconnected = true; } });
class Device {
  currentTime = 0; sampleRate = 8000; state = 'suspended'; destination = node(); sources = [];
  listeners = new Map();
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  removeEventListener(name) { this.listeners.delete(name); }
  changeState(state) { this.state = state; this.listeners.get('statechange')?.(); }
  resume() { return new Promise(resolve => { this.finishResume = () => { this.state = 'running'; resolve(); }; }); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createGain() { return { ...node(), gain: param() }; }
  createBiquadFilter() { return { ...node(), frequency: param(), Q: param() }; }
  createDynamicsCompressor() { return { ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }; }
  createStereoPanner() { return { ...node(), pan: param() }; }
  createPeriodicWave() { return {}; }
  createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  createOscillator() {
    const source = { ...node(), frequency: param(), detune: param(), setPeriodicWave() {}, start(at) { this.at = at; }, stop(at) { this.stoppedAt = at; } };
    this.sources.push(source); return source;
  }
  createBufferSource() { return this.createOscillator(); }
}
function fixture(values = {}) {
  const device = new Device(), saved = new Map(Object.entries(values)), timers = new Set();
  let created = 0;
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const music = new RetroMusic({ createContext: () => { created++; return device; }, storage,
    setIntervalFn: callback => { timers.add(callback); return callback; }, clearIntervalFn: callback => timers.delete(callback) });
  const unlock = async () => { const pending = music.unlock(); device.finishResume(); await pending; };
  return { music, device, saved, timers, unlock, created: () => created };
}

test('music never creates an audio device before a gesture and respects a pause during pending unlock', async () => {
  const { music, device, timers, created } = fixture();
  music.setTrack('casino'); music.setPaused(false); music.setVolume(.4);
  assert.equal(created(), 0); assert.equal(music.getState().playing, false);
  const pending = music.unlock(); assert.equal(music.unlock(), pending);
  music.setPaused(true); device.finishResume(); await pending;
  assert.equal(device.sources.length, 0); assert.equal(timers.size, 0);
  music.setPaused(false); assert.ok(device.sources.length > 0); assert.equal(timers.size, 1);
  music.dispose(); assert.equal(timers.size, 0);
});

test('pause freezes the musical position, resuming keeps it, and switching tracks clears old notes', async () => {
  const { music, device, timers, unlock } = fixture();
  music.setTrack('home'); music.setPaused(false); await unlock();
  device.currentTime = 5; music.tick(); music.setPaused(true);
  const beat = music.getState().beat, oldSources = [...device.sources];
  assert.ok(beat > 6 && beat < 7); assert.equal(timers.size, 0);
  assert.ok(oldSources.every(source => source.disconnected || source.stoppedAt <= 5.015));
  device.currentTime = 105; assert.equal(music.getState().beat, beat);
  music.setPaused(false); device.currentTime += .025;
  assert.ok(Math.abs(music.getState().beat - beat) < 1e-9); assert.equal(timers.size, 1);
  music.setTrack('city'); assert.equal(music.getState().beat, 0); assert.equal(timers.size, 1);
  const count = device.sources.length; music.setTrack('city'); music.tick();
  assert.equal(device.sources.length, count, 'Same-theme scene changes and identical ticks do not restart or duplicate notes');
  music.setTrack('unknown'); assert.equal(music.getState().playing, false); assert.equal(timers.size, 0);
  music.dispose();
});

test('music preferences persist independently, with mute, zero volume and dialog ducking', async () => {
  const effects = JSON.stringify({ muted: true, volume: .7 });
  const { music, saved, unlock } = fixture({ 'boxeurdeux-d:audio:v1': effects });
  assert.equal(music.getState().muted, true); assert.equal(music.getState().volume, .25);
  music.setTrack('gym'); music.setPaused(false); await unlock();
  assert.equal(music.getState().playing, false);
  music.setMuted(false); assert.equal(music.getState().playing, true);
  music.setVolume(.4); music.setDucked(true); assert.ok(Math.abs(music.bus.output.gain.value - .22) < 1e-9);
  music.setDucked(false); assert.equal(music.bus.output.gain.value, .4);
  music.setVolume(0); assert.equal(music.getState().playing, false);
  music.setVolume(5); assert.equal(music.getState().volume, 1); assert.equal(music.getState().playing, true);
  music.setVolume(NaN); assert.equal(music.getState().volume, 1);
  assert.equal(saved.get('boxeurdeux-d:audio:v1'), effects);
  assert.deepEqual(JSON.parse(saved.get(MUSIC_STORAGE_KEY)), { muted: false, volume: 1 });
  const other = fixture(Object.fromEntries(saved)); assert.equal(other.music.getState().muted, false);
  other.music.dispose(); music.dispose();
});

test('scheduler wraps without duplicate notes and discards missed beats after a stalled frame', async () => {
  const { music, device, unlock } = fixture();
  music.setTrack('bout'); music.setPaused(false); await unlock();
  const duration = MUSIC_TRACKS.bout.loopBeats * 60 / MUSIC_TRACKS.bout.bpm;
  device.currentTime = music.origin + duration - .06; music.tick();
  const count = device.sources.length; music.tick(); assert.equal(device.sources.length, count);
  assert.ok(device.sources.some(source => Math.abs(source.at - music.origin - duration) < .001));
  device.currentTime += 700;
  const before = device.sources.length; music.tick();
  assert.ok(device.sources.length - before < 80, 'No burst of accumulated missed notes');
  assert.ok(music.getState().voices <= 80);
  music.dispose();
});

test('failed device and resume, blocked storage and disposal leave gameplay independent of music', async () => {
  const absent = new RetroMusic({ createContext: () => { throw Error('No device'); }, storage: { getItem() { throw Error('Denied'); }, setItem() { throw Error('Denied'); } } });
  absent.setTrack('home'); absent.setPaused(false); absent.setVolume(.5);
  assert.equal(await absent.unlock(), false); assert.equal(absent.getState().available, false); absent.dispose();
  const { music, device, timers } = fixture();
  device.resume = () => Promise.reject(Error('Gesture not accepted'));
  music.setTrack('casino'); music.setPaused(false);
  assert.equal(await music.unlock(), false); assert.equal(timers.size, 0);
  device.resume = () => { device.state = 'running'; return Promise.resolve(); };
  assert.equal(await music.unlock(), true); assert.equal(timers.size, 1);
  music.dispose(); music.dispose(); assert.equal(timers.size, 0); assert.equal(device.state, 'closed');
  assert.ok(device.sources.every(source => source.disconnected));
  assert.equal(await music.unlock(), false);
});


test('an OS audio interruption stops the timer and a running device resumes without a new gesture', async () => {
  const { music, device, timers, unlock } = fixture();
  music.setTrack('metro'); music.setPaused(false); await unlock();
  device.currentTime = 3; device.changeState('interrupted');
  const beat = music.getState().beat;
  assert.equal(music.getState().playing, false); assert.equal(timers.size, 0);
  device.currentTime = 30; device.changeState('running');
  assert.equal(music.getState().playing, true); assert.equal(timers.size, 1);
  device.currentTime += .025; assert.ok(Math.abs(music.getState().beat - beat) < 1e-9);
  music.setPaused(true); device.changeState('suspended'); device.changeState('running');
  assert.equal(music.getState().playing, false, 'Device recovery cannot bypass an actual game pause');
  music.dispose(); assert.equal(device.listeners.size, 0);
});
