const STORAGE_KEY = 'boxeurdeux-d:audio:v1';
const MAX_SOURCES = 24;
const clamp = (value) => Math.min(1, Math.max(0, value));

// Original, short Web Audio cues. No sound files, network requests or ambient loop.
export class SparringAudio {
  constructor({ createContext } = {}) {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.createContext = createContext ?? (Context ? () => new Context({ latencyHint: 'interactive' }) : null);
    this.context = null;
    this.output = null;
    this.compressor = null;
    this.sources = new Set();
    this.lastPlayed = new Map();
    this.active = false;
    this.disposed = false;
    this.failed = false;
    this.unlocking = null;
    this.muted = false;
    this.volume = .35;
    try {
      const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? 'null');
      if (typeof stored?.muted === 'boolean') this.muted = stored.muted;
      if (typeof stored?.volume === 'number' && Number.isFinite(stored.volume)) this.volume = clamp(stored.volume);
    } catch { /* Private browsing and unavailable storage must not prevent play. */ }
  }

  getState() {
    return { muted: this.muted, volume: this.volume, available: Boolean(this.createContext) && !this.failed && !this.disposed };
  }

  // Call directly in a click/key gesture, without awaiting another operation first.
  // Nodes exist synchronously, so a following play() can schedule the opening bell
  // while the browser completes resume(). Stopping a round cancels those nodes too.
  unlock() {
    if (!this.getState().available || this.muted || this.volume === 0) return Promise.resolve(false);
    if (this.unlocking) return this.unlocking;
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.output = this.context.createGain();
        this.output.gain.value = this.active ? this.volume : 0;
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -16;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = .003;
        this.compressor.release.value = .12;
        this.output.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      }
      if (this.context.state === 'running') return Promise.resolve(true);
      const resumed = this.context.resume();
      this.unlocking = Promise.resolve(resumed).then(() => !this.disposed && this.context?.state === 'running').catch(() => {
        this.stopSources();
        return false;
      }).finally(() => { this.unlocking = null; });
      return this.unlocking;
    } catch {
      this.failed = true;
      this.stopSources();
      return Promise.resolve(false);
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) this.stopSources();
    this.updateGain();
    this.save();
  }

  setVolume(volume) {
    if (typeof volume !== 'number' || !Number.isFinite(volume)) return;
    this.volume = clamp(volume);
    if (this.volume === 0) this.stopSources();
    this.updateGain();
    this.save();
  }

  setActive(active) {
    const next = Boolean(active) && !this.disposed;
    if (next === this.active) return;
    this.active = next;
    if (!next) {
      this.stopSources();
      this.lastPlayed.clear();
    }
    this.updateGain();
  }

  play(type) {
    const ctx = this.context;
    if (!ctx || this.disposed || !this.active || this.muted || this.volume === 0) return false;
    if (ctx.state !== 'running' && !this.unlocking) return false;
    const now = ctx.currentTime;
    const cooldown = type === 'exhausted' ? 1.3 : type === 'lesson-progress' ? .18 : .04;
    if (now - (this.lastPlayed.get(type) ?? -Infinity) < cooldown) return false;
    const at = now + .006;
    try {
      switch (type) {
        case 'round-start':
          this.bell(at);
          break;
        case 'round-end':
          this.bell(at);
          this.bell(at + .25, .7);
          break;
        case 'player-hit':
        case 'remi-hit': {
          const received = type === 'remi-hit';
          this.tone(at, .14, received ? 110 : 145, 55, .34);
          this.noise(at, .085, 720, .18, .003);
          break;
        }
        case 'player-blocked':
        case 'remi-blocked':
          this.tone(at, .065, 290, 170, .14);
          this.noise(at, .06, 1700, .15, .002);
          break;
        case 'remi-dodged':
          this.noise(at, .23, 1100, .13, .055);
          break;
        case 'exhausted':
          this.noise(at, .32, 550, .12, .07);
          this.noise(at + .23, .21, 470, .075, .05);
          break;
        case 'lesson-progress':
          this.tone(at, .13, 523.25, 523.25, .11);
          this.tone(at + .085, .19, 659.25, 659.25, .1);
          break;
        case 'lesson-complete':
          for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
            this.tone(at + index * .13, .35, frequency, frequency, .13);
          }
          break;
        default: return false;
      }
      this.lastPlayed.set(type, now);
      return true;
    } catch {
      // Losing an audio device or rejecting Web Audio cannot interrupt the lesson.
      this.stopSources();
      return false;
    }
  }

  bell(at, level = 1) {
    for (const [frequency, gain, duration] of [[660, .15, 1.05], [1326, .065, .73], [1841, .035, .42]]) {
      this.tone(at, duration, frequency, frequency * .998, gain * level);
    }
  }

  tone(at, duration, frequency, endFrequency, level) {
    const source = this.context.createOscillator();
    source.type = 'sine';
    source.frequency.setValueAtTime(frequency, at);
    source.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    this.connectSource(source, [], at, duration, level, .004);
  }

  noise(at, duration, frequency, level, attack) {
    // A reproducible noise buffer avoids loading files and testing random outcomes.
    if (!this.noiseBuffer) {
      this.noiseBuffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * .5), this.context.sampleRate);
      const samples = this.noiseBuffer.getChannelData(0);
      let seed = 714025;
      for (let i = 0; i < samples.length; i += 1) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        samples[i] = seed / 2147483648 - 1;
      }
    }
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = .7;
    this.connectSource(source, [filter], at, duration, level, attack);
  }

  connectSource(source, filters, at, duration, level, attack) {
    for (const voice of this.sources) {
      if (voice.endsAt <= this.context.currentTime) this.release(voice);
    }
    while (this.sources.size >= MAX_SOURCES) this.release(this.sources.values().next().value);
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, at + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    envelope.gain.setValueAtTime(0, at + duration + .004);
    const nodes = [source, ...filters, envelope];
    for (let i = 0; i < nodes.length - 1; i += 1) nodes[i].connect(nodes[i + 1]);
    envelope.connect(this.output);
    const voice = { source, nodes, endsAt: at + duration + .01 };
    this.sources.add(voice);
    source.onended = () => this.release(voice);
    source.start(at);
    source.stop(voice.endsAt);
  }

  release(voice) {
    if (!voice || !this.sources.delete(voice)) return;
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* The voice may have ended already. */ }
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* A closed device is already silent. */ }
    }
  }

  stopSources() {
    for (const voice of this.sources) this.release(voice);
  }

  updateGain() {
    if (!this.output || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setTargetAtTime(this.active && !this.muted ? this.volume : 0, now, .012);
  }

  save() {
    try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ muted: this.muted, volume: this.volume })); }
    catch { /* Sound remains usable without persistence. */ }
  }

  dispose() {
    if (this.disposed) return;
    this.setActive(false);
    this.disposed = true;
    try {
      this.output?.disconnect();
      this.compressor?.disconnect();
      Promise.resolve(this.context?.close()).catch(() => {});
    } catch { /* Idempotent teardown, including unavailable or closed devices. */ }
    this.noiseBuffer = null;
  }
}
