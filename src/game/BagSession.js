/** A deterministic choreography lesson. All times, including cue times, are seconds. */
export const BAG_TIMINGS = Object.freeze({
  jab: Object.freeze({ duration: .48, anticipation: .20, impact: .20 / .48, hold: .10, recovery: .18 }),
  cross: Object.freeze({ duration: .60, anticipation: .27, impact: .27 / .60, hold: .10, recovery: .23 }),
  hook: Object.freeze({ duration: .66, anticipation: .32, impact: .32 / .66, hold: .11, recovery: .23 }),
});

export const BAG_RHYTHM = Object.freeze({ preparation: 1.6, spacing: .88, rest: 1.1, tolerance: .24, perfect: .12 });

export const BAG_SEQUENCES = Object.freeze([
  Object.freeze({ id: 'jab', title: 'Le jab', actions: Object.freeze(['jab']) }),
  Object.freeze({ id: 'double-jab', title: 'Double jab', actions: Object.freeze(['jab', 'jab']) }),
  Object.freeze({ id: 'jab-direct', title: 'Jab · direct', actions: Object.freeze(['jab', 'cross']) }),
  Object.freeze({ id: 'jab-direct-crochet', title: 'Jab · direct · crochet', actions: Object.freeze(['jab', 'cross', 'hook']) }),
]);

const ORDER = [0, 1, 2, 3, 2, 1, 3];
const LABELS = { jab: 'Jab', cross: 'Direct', hook: 'Crochet' };
const EPSILON = 1e-9;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function settingsFor(settings, previous = {}) {
  const requested = Number(settings.duration ?? previous.duration ?? 45);
  return { duration: Number.isFinite(requested) ? clamp(requested, 5, 300) : 45 };
}

function sequenceFor(index, startsAt) {
  const descriptor = BAG_SEQUENCES[ORDER[index % ORDER.length]];
  const steps = descriptor.actions.map((action, step) => {
    const inputAt = startsAt + BAG_RHYTHM.preparation + step * BAG_RHYTHM.spacing;
    return {
      action, input: action === 'cross' ? 'cross' : 'jab', label: LABELS[action],
      inputAt, targetAt: inputAt + BAG_TIMINGS[action].anticipation,
      status: 'waiting', offset: null, quality: null,
    };
  });
  return {
    id: descriptor.id, title: descriptor.title, index, steps, startsAt,
    prepareUntil: steps[0].inputAt,
    endsAt: steps.at(-1).targetAt + BAG_RHYTHM.tolerance + BAG_RHYTHM.rest,
    stage: 'prepare', stageRemaining: BAG_RHYTHM.preparation,
    nextStep: 0, comboReady: false, progress: 0, result: null,
  };
}

/**
 * Call attack only on fresh input edges; there is deliberately no held-key repeat
 * or queued punch. Events and statistics change at glove contact, never keydown.
 * inputAt is the ideal keydown; targetAt adds the displayed punch anticipation.
 */
export class BagSession {
  constructor(settings = {}) {
    this.settings = settingsFor(settings);
    this.reset();
  }

  reset(settings = {}) {
    this.settings = settingsFor(settings, this.settings);
    this._events = [];
    this._action = null;
    this._coasting = false;
    this.state = {
      phase: 'ready', elapsed: 0, remaining: this.settings.duration,
      settings: { ...this.settings }, player: this._playerSnapshot(),
      sequence: sequenceFor(0, 0),
      stats: { contacts: 0, accurate: 0, perfect: 0, combosCompleted: 0, combosMissed: 0, missedSteps: 0, wrong: 0, early: 0, late: 0 },
      feedback: { text: 'Observe l’enchaînement, puis suis le rythme.', tone: 'neutral', until: 0 },
      summary: null,
    };
    return this.state;
  }

  start() {
    if (this.state.phase !== 'ready') return false;
    this.state.phase = 'running';
    this._emit('sequence-start', { id: this.state.sequence.id, index: 0 });
    this._syncState();
    return true;
  }

  pause() {
    if (this.state.phase !== 'running') return false;
    this.state.phase = 'paused';
    this._syncState();
    return true;
  }

  resume() {
    if (this.state.phase !== 'paused') return false;
    this.state.phase = 'running';
    this._syncState();
    return true;
  }

  attack(input) {
    if (this.state.phase !== 'running' || !['jab', 'cross'].includes(input) || this._action) return false;
    const action = input === 'jab' && this._canHook() ? 'hook' : input;
    const timing = BAG_TIMINGS[action];
    // Finish every accepted animation before the bell: no invisible last hit.
    if (timing.duration > this.state.remaining + EPSILON) return false;
    this._action = { action, elapsed: 0, impacted: false, ...timing };
    this._syncState();
    return true;
  }

  drainEvents() {
    const events = this._events;
    this._events = [];
    return events;
  }

  update(dtSeconds) {
    if (this.state.phase !== 'running' || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    let remaining = Math.min(dtSeconds, this.state.remaining);
    while (remaining > EPSILON && this.state.phase === 'running') {
      let dt = Math.min(remaining, 1 / 120, this.state.remaining);
      const boundaries = [this.state.sequence.endsAt - this.state.elapsed];
      for (const step of this.state.sequence.steps) {
        if (step.status === 'waiting') boundaries.push(step.targetAt + BAG_RHYTHM.tolerance - this.state.elapsed);
      }
      if (this._action) {
        boundaries.push((this._action.impacted ? this._action.duration : this._action.anticipation) - this._action.elapsed);
      }
      for (const boundary of boundaries) if (boundary > EPSILON) dt = Math.min(dt, boundary);
      this._step(dt);
      remaining -= dt;
    }
    this._syncState();
  }

  _step(dt) {
    this.state.elapsed = Math.min(this.settings.duration, this.state.elapsed + dt);
    this.state.remaining = Math.max(0, this.settings.duration - this.state.elapsed);
    if (this._action) {
      this._action.elapsed += dt;
      if (!this._action.impacted && this._action.elapsed + EPSILON >= this._action.anticipation) {
        this._action.impacted = true;
        this._contact();
      }
      if (this._action.elapsed + EPSILON >= this._action.duration) this._action = null;
    }
    for (const step of this.state.sequence.steps) {
      if (step.status === 'waiting' && this.state.elapsed + EPSILON >= step.targetAt + BAG_RHYTHM.tolerance) {
        step.status = 'missed';
        this.state.stats.missedSteps += 1;
        this._feedback('Continue avec le prochain temps.', 'neutral');
        this._emit('step-missed', { step: this.state.sequence.steps.indexOf(step), action: step.action });
      }
    }
    this._resolveSequence();
    if (this.state.remaining <= EPSILON) {
      this._finish();
      return;
    }
    if (!this._coasting && this.state.elapsed + EPSILON >= this.state.sequence.endsAt) {
      const next = sequenceFor(this.state.sequence.index + 1, this.state.elapsed);
      const last = next.steps.at(-1);
      const lastTiming = BAG_TIMINGS[last.action];
      if (last.targetAt + BAG_RHYTHM.tolerance + lastTiming.hold + lastTiming.recovery > this.settings.duration + EPSILON) {
        // Do not announce an exercise that the remaining session cannot contain.
        this._coasting = true;
        this.state.sequence.endsAt = this.settings.duration;
        this._feedback('Séance presque terminée. Relâche les épaules.', 'neutral', this.state.remaining);
      } else {
        this.state.sequence = next;
        this._emit('sequence-start', { id: next.id, index: next.index });
      }
    }
  }

  _canHook() {
    const sequence = this.state.sequence;
    if (sequence.id !== 'jab-direct-crochet' || sequence.steps[2].status !== 'waiting'
      || sequence.steps[0].status !== 'hit' || sequence.steps[1].status !== 'hit') return false;
    const projectedContact = this.state.elapsed + BAG_TIMINGS.hook.anticipation;
    return Math.abs(projectedContact - sequence.steps[2].targetAt) <= BAG_RHYTHM.tolerance + EPSILON;
  }

  _contact() {
    const sequence = this.state.sequence;
    const stats = this.state.stats;
    const action = this._action.action;
    const index = sequence.steps.findIndex(step => step.status === 'waiting');
    const step = sequence.steps[index];
    const time = this.state.elapsed;
    let result = 'free';
    let offset = null;
    stats.contacts += 1;

    if (step && Math.abs(time - step.targetAt) <= BAG_RHYTHM.tolerance + EPSILON) {
      offset = time - step.targetAt;
      step.offset = offset;
      if (action === step.action) {
        result = Math.abs(offset) <= BAG_RHYTHM.perfect + EPSILON ? 'perfect' : 'good';
        step.status = 'hit';
        step.quality = result;
        stats.accurate += 1;
        if (result === 'perfect') stats.perfect += 1;
        this._feedback(result === 'perfect' ? 'Dans le rythme !' : offset < 0 ? 'Bien ! Un peu plus tard.' : 'Bien ! Un peu plus tôt.', 'good');
      } else {
        result = 'wrong';
        step.status = 'missed';
        step.quality = result;
        stats.wrong += 1;
        stats.missedSteps += 1;
        this._feedback(step.action === 'hook' ? 'Le crochet vient après un jab et un direct réussis.' : `Ici, c’était ${step.action === 'jab' ? 'un jab' : 'un direct'}.`, 'retry');
      }
    } else if (step) {
      const previous = sequence.steps[index - 1];
      const lateForPrevious = previous?.status === 'missed'
        && time > previous.targetAt + BAG_RHYTHM.tolerance
        && Math.abs(time - previous.targetAt) < Math.abs(time - step.targetAt);
      result = lateForPrevious ? 'late' : 'early';
      offset = time - (lateForPrevious ? previous.targetAt : step.targetAt);
      stats[result] += 1;
      this._feedback(result === 'early' ? 'Un peu tôt : attends le repère.' : 'Un peu tard : prépare le prochain coup.', 'retry');
    } else if (sequence.result === 'missed' && time < sequence.steps.at(-1).targetAt + .65) {
      result = 'late';
      offset = time - sequence.steps.at(-1).targetAt;
      stats.late += 1;
      this._feedback('Un peu tard : reprends au prochain enchaînement.', 'retry');
    } else {
      this._feedback('Respire et prépare le prochain enchaînement.', 'neutral');
    }
    this._emit('bag-hit', { attack: action, result, step: index, offset, sequenceIndex: sequence.index });
  }

  _resolveSequence() {
    const sequence = this.state.sequence;
    if (sequence.result || sequence.steps.some(step => step.status === 'waiting')) return;
    const success = sequence.steps.every(step => step.status === 'hit');
    sequence.result = success ? 'completed' : 'missed';
    this.state.stats[success ? 'combosCompleted' : 'combosMissed'] += 1;
    if (success) this._feedback('Enchaînement réussi !', 'good');
    this._emit('sequence-end', { id: sequence.id, index: sequence.index, success });
  }

  _playerSnapshot() {
    const action = this._action;
    return action ? {
      action: action.action, elapsed: action.elapsed, duration: action.duration,
      progress: clamp(action.elapsed / action.duration, 0, 1), impact: action.impact,
      contact: action.anticipation, hold: action.hold, impacted: action.impacted,
    } : { action: 'idle', elapsed: 0, duration: 0, progress: 0, impact: null, contact: 0, hold: 0, impacted: false };
  }

  _syncState() {
    this.state.player = this._playerSnapshot();
    const sequence = this.state.sequence;
    sequence.nextStep = sequence.steps.findIndex(step => step.status === 'waiting');
    sequence.stage = sequence.result ? 'rest'
      : this.state.elapsed < sequence.prepareUntil - BAG_RHYTHM.tolerance ? 'prepare' : 'active';
    const boundary = sequence.stage === 'prepare' ? sequence.prepareUntil : sequence.stage === 'rest'
      ? sequence.endsAt : sequence.steps[sequence.nextStep].targetAt + BAG_RHYTHM.tolerance;
    sequence.stageRemaining = Math.max(0, boundary - this.state.elapsed);
    sequence.progress = clamp((this.state.elapsed - sequence.startsAt) / (sequence.endsAt - sequence.startsAt), 0, 1);
    sequence.comboReady = this.state.phase === 'running' && !this._action && this._canHook();
    if (this.state.feedback.until < this.state.elapsed) this.state.feedback = { text: '', tone: 'neutral', until: 0 };
  }

  _feedback(text, tone, duration = .9) {
    this.state.feedback = { text, tone, until: this.state.elapsed + duration };
  }

  _finish() {
    this.state.elapsed = this.settings.duration;
    this.state.remaining = 0;
    this.state.phase = 'finished';
    this._action = null;
    const stats = this.state.stats;
    this.state.summary = {
      ...stats,
      precision: stats.contacts ? Math.round(100 * stats.accurate / stats.contacts) : 0,
      rhythm: stats.accurate ? Math.round(100 * stats.perfect / stats.accurate) : 0,
      positive: stats.combosCompleted ? `${stats.combosCompleted} enchaînement${stats.combosCompleted > 1 ? 's' : ''} réussi${stats.combosCompleted > 1 ? 's' : ''}.` : 'Tu as découvert le rythme du sac.',
      improve: stats.contacts === 0 ? 'Essaie le jab au premier repère.' : stats.wrong
        ? 'Observe l’ordre des coups avant de commencer.' : stats.early > stats.late
          ? 'Prends le temps d’attendre chaque repère.' : stats.late
            ? 'Prépare le prochain coup pendant le retour en garde.' : 'Garde ce rythme régulier pour la prochaine séance.',
    };
    this._emit('round-end', { stats: { ...stats }, summary: { ...this.state.summary } });
  }

  _emit(type, extra = {}) {
    this._events.push({ type, time: this.state.elapsed, ...extra });
  }
}
