// Original instruments: filtered pulse/triangle leads, FM keys and synthesized drums.
// No samples, soundfonts, remote services or gameplay randomness are involved.
const cache = new WeakMap();
const limit = (value, low, high) => Math.max(low, Math.min(high, value));
const hz = midi => 440 * 2 ** ((midi - 69) / 12);

function resources(context) {
  let value = cache.get(context);
  if (value) return value;
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = noise.getChannelData(0);
  let seed = 19870928;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  const real = new Float32Array(33), imaginary = new Float32Array(33);
  for (let harmonic = 1; harmonic < imaginary.length; harmonic++) {
    imaginary[harmonic] = Math.sin(Math.PI * harmonic * .3) / harmonic ** 1.18;
  }
  value = { noise, pulse: context.createPeriodicWave(real, imaginary) };
  cache.set(context, value);
  return value;
}

export function createMusicBus(context, destination = context.destination) {
  const input = context.createGain(), highpass = context.createBiquadFilter();
  highpass.type = 'highpass'; highpass.frequency.value = 28; highpass.Q.value = .5;
  const compressor = context.createDynamicsCompressor(), output = context.createGain();
  compressor.threshold.value = -12; compressor.knee.value = 15;
  compressor.ratio.value = 3; compressor.attack.value = .004; compressor.release.value = .12;
  output.gain.value = 0;
  input.connect(highpass); highpass.connect(compressor); compressor.connect(output); output.connect(destination);
  return { input, output, dispose() { for (const node of [input, highpass, compressor, output]) { try { node.disconnect(); } catch {} } } };
}

/** Same synthesis is used by the live player and the offline listening exports.
 * Durations include their release; a note cannot leak beyond its score boundary.
 */
export function playMusicNote(context, destination, note, at, secondsPerBeat) {
  const duration = Math.max(.015, note.duration * secondsPerBeat);
  const end = at + duration, frequency = hz(note.midi), velocity = limit(note.velocity ?? .7, 0, 1);
  const shared = resources(context), sources = [], nodes = [];
  const envelope = context.createGain(); nodes.push(envelope);
  const panner = context.createStereoPanner?.();
  if (panner) { panner.pan.value = limit(note.pan ?? 0, -1, 1); nodes.push(panner); envelope.connect(panner); panner.connect(destination); }
  else envelope.connect(destination);
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    for (const source of sources) { source.onended = null; try { source.stop(); } catch {} }
    for (const node of nodes) { try { node.disconnect(); } catch {} }
  };
  const oscillator = (type, pitch, target = envelope, level = 1) => {
    const source = context.createOscillator(); sources.push(source); nodes.push(source);
    if (type === 'pulse') source.setPeriodicWave(shared.pulse); else source.type = type;
    source.frequency.setValueAtTime(pitch, at);
    if (level === 1) source.connect(target);
    else { const gain = context.createGain(); gain.gain.value = level; nodes.push(gain); source.connect(gain); gain.connect(target); }
    return source;
  };
  const filter = (type, cutoff, q = .6) => {
    const node = context.createBiquadFilter(); node.type = type; node.frequency.value = cutoff; node.Q.value = q;
    nodes.push(node); node.connect(envelope); return node;
  };
  const noise = (type, cutoff, q = .6) => {
    const source = context.createBufferSource(); source.buffer = shared.noise; source.loop = true;
    sources.push(source); nodes.push(source); source.connect(filter(type, cutoff, q)); return source;
  };
  const contour = (level, attack, decay, sustain, release) => {
    const a = Math.min(attack, duration * .2), d = Math.min(decay, duration * .22), r = Math.min(release, duration * .32);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level * velocity, at + a);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.00001, level * velocity * sustain), at + a + d);
    envelope.gain.setValueAtTime(Math.max(.00001, level * velocity * sustain), end - r);
    envelope.gain.linearRampToValueAtTime(0, end);
  };
  const percussion = (level, attack = .002, decayEnd = end) => {
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level * velocity, at + Math.min(attack, duration * .2));
    envelope.gain.exponentialRampToValueAtTime(.00001, Math.max(at + .008, decayEnd - .003));
    envelope.gain.setValueAtTime(0, end);
  };
  const fm = (index, ratio, level) => {
    const carrier = oscillator('sine', frequency);
    const modulator = context.createOscillator(), modulation = context.createGain();
    sources.push(modulator); nodes.push(modulator, modulation);
    modulator.frequency.setValueAtTime(frequency * ratio, at);
    modulation.gain.setValueAtTime(frequency * index, at);
    modulation.gain.exponentialRampToValueAtTime(Math.max(1, frequency * .06), end);
    modulator.connect(modulation); modulation.connect(carrier.frequency);
    contour(level, .004, .08, .3, .1);
    return carrier;
  };
  switch (note.instrument) {
    case 'lead': {
      const low = filter('lowpass', Math.min(5200, frequency * 5.5), .5);
      const lead = oscillator('pulse', frequency, low, .72);
      oscillator('triangle', frequency, low, .28);
      if (duration > .25) {
        const vibrato = context.createOscillator(), depth = context.createGain(); sources.push(vibrato); nodes.push(vibrato, depth);
        vibrato.frequency.value = 5.2; depth.gain.setValueAtTime(0, at); depth.gain.linearRampToValueAtTime(frequency * .0025, at + duration * .6);
        vibrato.connect(depth); depth.connect(lead.frequency);
      }
      contour(.24, .006, .04, .67, .035); break;
    }
    case 'bell': fm(1.25, 3, .22); break;
    case 'keys': fm(.75, 2, .23); break;
    case 'pad': {
      const low = filter('lowpass', 1800, .45);
      const left = oscillator('triangle', frequency, low, .6), right = oscillator('sine', frequency, low, .4);
      left.detune.value = -4; right.detune.value = 4;
      contour(.11, .12, .15, .7, .22); break;
    }
    case 'bass': {
      const low = filter('lowpass', 900, .7);
      oscillator('triangle', frequency, low, .8); oscillator('sine', frequency, low, .2);
      contour(.4, .003, .045, .62, .025); break;
    }
    case 'kick': {
      const kick = oscillator('sine', 145);
      kick.frequency.exponentialRampToValueAtTime(48, at + Math.min(.065, duration * .55));
      kick.frequency.exponentialRampToValueAtTime(38, end);
      percussion(.66); break;
    }
    case 'snare': {
      noise('highpass', 1400); oscillator('triangle', 175, envelope, .2);
      percussion(.34); break;
    }
    case 'hat': noise('highpass', 6400); percussion(.2); break;
    case 'clap': {
      noise('bandpass', 1500, .75);
      const level = .35 * velocity;
      envelope.gain.setValueAtTime(0, at);
      for (const [time, gain] of [[.001, 1], [.009, .25], [.012, .8], [.02, .2], [.023, .6]]) {
        if (time < duration * .65) envelope.gain.linearRampToValueAtTime(Math.max(.00001, level * gain), at + time);
      }
      envelope.gain.exponentialRampToValueAtTime(.00001, end - .002); envelope.gain.setValueAtTime(0, end); break;
    }
    case 'tom': {
      const pitch = 90 + (note.midi - 41) * 14, drum = oscillator('sine', pitch * 1.8);
      drum.frequency.exponentialRampToValueAtTime(Math.max(50, pitch), at + Math.min(.04, duration * .4));
      percussion(.4); break;
    }
    default: throw new Error(`Unknown music instrument: ${note.instrument}`);
  }
  sources[0].onended = cleanup;
  for (const source of sources) { source.start(at); source.stop(end + .004); }
  return {
    endsAt: end + .004,
    get finished() { return finished; },
    stop(immediate = false) {
      if (finished) return;
      if (immediate) { cleanup(); return; }
      const now = context.currentTime;
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setTargetAtTime(0, now, .003);
      for (const source of sources) { try { source.stop(now + .015); } catch {} }
    },
  };
}
