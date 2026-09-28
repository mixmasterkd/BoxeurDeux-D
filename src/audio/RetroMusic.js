import { MUSIC_TRACKS } from './MusicScores.js';
import { createMusicBus, playMusicNote } from './RetroInstruments.js';

export const MUSIC_STORAGE_KEY = 'boxeurdeux-d:music:v1';
const clamp = value => Math.max(0, Math.min(1, value));
const LOOKAHEAD = .12, MAX_VOICES = 80;

// One transport for the whole game: scene changes cannot layer independent songs.
export class RetroMusic {
  constructor({ createContext, storage, setIntervalFn, clearIntervalFn } = {}) {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.createContext = createContext ?? (Context ? () => new Context({latencyHint:'interactive'}) : null);
    try { this.storage = storage === undefined ? globalThis.localStorage : storage; } catch { this.storage = null; }
    this.setInterval = setIntervalFn ?? globalThis.setInterval.bind(globalThis);
    this.clearInterval = clearIntervalFn ?? globalThis.clearInterval.bind(globalThis);
    this.context = null; this.bus = null; this.timer = null; this.voices = new Set();
    this.trackId = null; this.paused = true; this.muted = false; this.volume = .25; this.ducked = false;
    this.running = false; this.offset = 0; this.origin = 0; this.scheduledThrough = 0;
    this.disposed = false; this.failed = false; this.unlocking = null;
    this.onContextStateChange = () => {
      if (this.disposed) return;
      if (this.context?.state === 'closed') this.failed = true;
      this.reconcile();
    };
    try {
      const saved = JSON.parse(this.storage?.getItem(MUSIC_STORAGE_KEY) ?? 'null');
      if (saved && typeof saved === 'object') {
        if (typeof saved.muted === 'boolean') this.muted = saved.muted;
        if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) this.volume = clamp(saved.volume);
      } else {
        // Respect an existing quiet preference on first use without linking the
        // two settings: music and sound effects remain independently adjustable.
        this.muted = JSON.parse(this.storage?.getItem('boxeurdeux-d:audio:v1') ?? 'null')?.muted === true;
      }
    } catch { /* Music remains optional when storage is unavailable. */ }
  }

  getState() {
    return {muted:this.muted, volume:this.volume, available:Boolean(this.createContext) && !this.failed && !this.disposed,
      trackId:this.trackId, paused:this.paused, playing:this.running && this.context?.state === 'running',
      ducked:this.ducked, beat:this.currentBeat(), voices:this.voices.size, contextState:this.context?.state ?? 'locked'};
  }

  // Called synchronously by a real pointer/key gesture, including menu controls.
  unlock() {
    if (!this.getState().available) return Promise.resolve(false);
    if (this.unlocking) return this.unlocking;
    try {
      if (!this.context) {
        this.context = this.createContext(); this.bus = createMusicBus(this.context);
        this.context.addEventListener?.('statechange', this.onContextStateChange);
      }
      if (this.context.state === 'running') { this.reconcile(); return Promise.resolve(true); }
      this.unlocking = Promise.resolve(this.context.resume()).then(() => {
        if (this.disposed) return false;
        this.reconcile(); return this.context.state === 'running';
      }).catch(() => false).finally(() => { this.unlocking = null; });
      return this.unlocking;
    } catch { this.failed = true; this.stopTransport(); return Promise.resolve(false); }
  }

  setTrack(id) {
    const next = Object.hasOwn(MUSIC_TRACKS, id) ? id : null;
    if (next === this.trackId || this.disposed) return;
    this.stopTransport(false); this.trackId = next; this.offset = 0; this.reconcile();
  }
  setPaused(value) {
    if (this.paused === Boolean(value) || this.disposed) return;
    this.paused = Boolean(value); this.reconcile();
  }
  setMuted(value) {
    if (this.disposed) return;
    this.muted = Boolean(value); this.reconcile(); this.save();
  }
  setVolume(value) {
    if (!Number.isFinite(value) || this.disposed) return;
    this.volume = clamp(value); this.reconcile(); this.save();
  }
  setDucked(value) {
    if (this.ducked === Boolean(value) || this.disposed) return;
    this.ducked = Boolean(value); this.updateGain();
  }
  currentBeat() {
    const score = MUSIC_TRACKS[this.trackId];
    if (!this.running || !score || !this.context) return this.offset;
    return Math.max(0, (this.context.currentTime - this.origin) * score.bpm / 60) % score.loopBeats;
  }
  reconcile() {
    const shouldPlay = !this.disposed && !this.failed && this.context?.state === 'running' && this.trackId && !this.paused && !this.muted && this.volume > 0;
    if (!shouldPlay) this.stopTransport();
    else if (!this.running) this.startTransport();
    this.updateGain();
  }
  updateGain() {
    if (!this.bus || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    this.bus.output.gain.cancelScheduledValues(now);
    this.bus.output.gain.setTargetAtTime(this.running && !this.muted ? this.volume * (this.ducked ? .55 : 1) : 0, now, this.running ? .045 : .004);
  }
  startTransport() {
    const score = MUSIC_TRACKS[this.trackId], start = this.context.currentTime + .025;
    this.origin = start - this.offset * 60 / score.bpm;
    this.scheduledThrough = start; this.running = true;
    this.tick();
    if (this.running) this.timer = this.setInterval(() => this.tick(), 25);
  }
  stopTransport(preserve = true) {
    if (preserve && this.running) this.offset = this.currentBeat();
    this.running = false;
    if (this.timer !== null) { this.clearInterval(this.timer); this.timer = null; }
    for (const voice of this.voices) voice.stop(this.disposed);
    this.voices.clear(); this.updateGain();
  }
  tick() {
    if (!this.running || this.context?.state !== 'running') { this.stopTransport(); return; }
    const score = MUSIC_TRACKS[this.trackId], now = this.context.currentTime;
    const beatLength = 60 / score.bpm, loopLength = score.loopBeats * beatLength;
    // Drop missed notes after a stalled tab instead of firing a burst of old beats.
    const from = Math.max(this.scheduledThrough, now - .015), until = now + LOOKAHEAD;
    for (const voice of this.voices) if (voice.finished || voice.endsAt < now) { voice.stop(true); this.voices.delete(voice); }
    try {
      for (let loop = Math.max(0, Math.floor((from - this.origin) / loopLength)); loop <= Math.floor((until - this.origin) / loopLength); loop++) {
        const origin = this.origin + loop * loopLength;
        for (const note of score.notes) {
          const at = origin + note.beat * beatLength;
          if (at < from - 1e-7 || at >= until - 1e-7) continue;
          while (this.voices.size >= MAX_VOICES) { const first = this.voices.values().next().value; first.stop(); this.voices.delete(first); }
          this.voices.add(playMusicNote(this.context, this.bus.input, note, Math.max(at, now), beatLength));
        }
      }
      this.scheduledThrough = until;
    } catch { this.failed = true; this.stopTransport(); }
  }
  save() {
    try { this.storage?.setItem(MUSIC_STORAGE_KEY, JSON.stringify({muted:this.muted, volume:this.volume})); } catch {}
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.context?.removeEventListener?.('statechange', this.onContextStateChange);
    this.stopTransport(false); this.bus?.dispose();
    try { Promise.resolve(this.context?.close()).catch(() => {}); } catch {}
  }
}
