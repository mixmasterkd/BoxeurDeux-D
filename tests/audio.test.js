import test from 'node:test';
import assert from 'node:assert/strict';
import { SparringAudio } from '../src/audio/SparringAudio.js';

const parameter = () => ({
  value: 0,
  setValueAtTime(value) { this.value = value; },
  linearRampToValueAtTime(value) { this.value = value; },
  exponentialRampToValueAtTime(value) { this.value = value; },
  setTargetAtTime(value) { this.value = value; },
  cancelScheduledValues() {},
});
const node = () => ({ connect() {}, disconnect() { this.disconnected = true; } });

// The fake clock deliberately keeps resume pending to reproduce mobile unlock
// races. Signal quality is checked separately with browser OfflineAudioContext.
class AudioDevice {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.state = 'suspended';
    this.destination = node();
    this.voices = [];
  }
  resume() { return new Promise(resolve => { this.finishResume = () => { this.state = 'running'; resolve(); }; }); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createGain() { return { ...node(), gain: parameter() }; }
  createDynamicsCompressor() {
    return { ...node(), threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter() };
  }
  createBiquadFilter() { return { ...node(), frequency: parameter(), Q: parameter() }; }
  createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  createOscillator() {
    const voice = {
      ...node(), frequency: parameter(),
      start(time) { this.startedAt = time; },
      stop(time) { this.stoppedAt = time; this.stoppedImmediately = time === undefined; },
    };
    this.voices.push(voice);
    return voice;
  }
  createBufferSource() { return this.createOscillator(); }
}

function fixture() {
  const device = new AudioDevice();
  let created = 0;
  const audio = new SparringAudio({ createContext: () => { created += 1; return device; } });
  return { audio, device, created: () => created };
}

test('loading, changing preferences and pre-start events never open an audio device', () => {
  const { audio, created } = fixture();
  assert.deepEqual(audio.getState(), { muted: false, volume: .35, available: true });
  audio.setVolume(.4);
  audio.setMuted(true);
  audio.setMuted(false);
  audio.setActive(true);
  assert.equal(audio.play('round-start'), false);
  assert.equal(created(), 0);
  audio.dispose();
});

test('opening bell survives asynchronous gesture unlock, but pause cancels it before resume resolves', async () => {
  const { audio, device, created } = fixture();
  const unlock = audio.unlock();
  assert.equal(created(), 1);
  assert.equal(audio.unlock(), unlock, 'Only one pending resume');
  audio.setActive(true);
  assert.equal(audio.play('round-start'), true);
  assert.ok(device.voices.length > 0, 'The start sound is scheduled during the gesture');
  audio.setActive(false);
  assert.ok(device.voices.every(voice => voice.stoppedImmediately && voice.disconnected));
  device.finishResume();
  assert.equal(await unlock, true);
  const count = device.voices.length;
  assert.equal(audio.play('player-hit'), false);
  audio.setActive(true);
  assert.equal(device.voices.length, count, 'Resuming does not replay the bell or queued hits');
  assert.equal(audio.play('player-hit'), true);
  audio.dispose();
});

test('mute and zero volume cancel future notes, and muted events never replay', async () => {
  const { audio, device } = fixture();
  const unlock = audio.unlock();
  device.finishResume();
  await unlock;
  audio.setActive(true);
  audio.play('lesson-complete');
  assert.ok(device.voices.some(voice => voice.startedAt > .1));
  audio.setMuted(true);
  assert.ok(device.voices.every(voice => voice.stoppedImmediately));
  assert.equal(audio.play('round-end'), false);
  audio.setMuted(false);
  const count = device.voices.length;
  assert.equal(audio.sources.size, 0);
  assert.equal(device.voices.length, count);
  audio.play('remi-dodged');
  audio.setVolume(-2);
  assert.equal(audio.getState().volume, 0);
  assert.equal(audio.sources.size, 0);
  audio.setVolume(10);
  assert.equal(audio.getState().volume, 1);
  audio.setVolume(NaN);
  assert.equal(audio.getState().volume, 1);
  audio.dispose();
});

test('rapid repeated cues are throttled and overlapping sounds stay bounded', async () => {
  const { audio, device } = fixture();
  const unlock = audio.unlock();
  device.finishResume();
  await unlock;
  audio.setActive(true);
  audio.play('exhausted');
  for (let i = 0; i < 30; i += 1) assert.equal(audio.play('exhausted'), false);
  for (let i = 0; i < 40; i += 1) {
    device.currentTime += .045;
    audio.play('round-end');
    assert.ok(audio.sources.size <= 24);
  }
  assert.equal(audio.play('unknown-event'), false);
  device.currentTime += 5;
  audio.play('lesson-progress');
  assert.equal(audio.sources.size, 2, 'Expired voices are disconnected even if ended events arrive late');
  audio.dispose();
  audio.dispose();
  assert.equal(audio.sources.size, 0);
  assert.equal(device.state, 'closed');
  assert.equal(await audio.unlock(), false);
});

test('unavailable devices, rejected resume and blocked storage do not interrupt play', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
  try {
    const missing = new SparringAudio({ createContext: () => { throw new Error('Device unavailable'); } });
    missing.setMuted(false);
    missing.setVolume(.2);
    assert.equal(await missing.unlock(), false);
    assert.equal(missing.getState().available, false);
    assert.equal(missing.play('player-hit'), false);
    missing.dispose();

    const { audio, device } = fixture();
    device.resume = () => Promise.reject(new Error('Gesture not accepted'));
    const unlock = audio.unlock();
    audio.setActive(true);
    audio.play('round-start');
    assert.equal(await unlock, false);
    assert.equal(audio.sources.size, 0);
    assert.equal(audio.play('player-hit'), false);
    audio.dispose();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
