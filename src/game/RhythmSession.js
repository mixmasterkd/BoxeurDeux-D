const EPSILON = 1e-9;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const SETTINGS = Object.freeze({
  speedball: Object.freeze({
    interval: .68, preparation: 1.7, tolerance: .16, perfect: .08,
    contact: .12, hold: .12, duration: .40, minimumHits: 20, title: 'Speed ball',
  }),
  rope: Object.freeze({
    interval: .80, preparation: 1.7, tolerance: .19, perfect: .09,
    contact: .22, hold: .12, duration: .52, load: .10, minimumHits: 20, title: 'Corde à danser',
  }),
});

/** Fixed musical beats and explicit contact times. Input starts a movement;
 * only its contact can change the score. This model retains no held inputs. */
export class RhythmSession {
  constructor({ activity = 'speedball', duration = 45 } = {}) {
    this.activity = activity === 'rope' ? 'rope' : 'speedball';
    this.rules = SETTINGS[this.activity];
    const requested = Number(duration);
    this.duration = clamp(Number.isFinite(requested) ? requested : 45, 5, 180);
    this.reset();
  }

  reset() {
    this._events = []; this._action = null; this._nextIndex = 0;
    this._beats = [];
    for (let index = 0; ; index += 1) {
      const inputAt = this.rules.preparation + index * this.rules.interval;
      // Even the last permitted late input must have room for its complete
      // recovery animation. The clock never invites an impossible last beat.
      if (inputAt + this.rules.tolerance + this.rules.duration > this.duration + EPSILON) break;
      this._beats.push({
        index, expected: index % 2 ? 'cross' : 'jab', inputAt,
        targetAt: inputAt + this.rules.contact, status: 'waiting',
      });
    }
    this.state = {
      activity: this.activity, duration: this.duration,
      phase: 'ready', elapsed: 0, remaining: this.duration,
      rules: { ...this.rules }, beat: null, player: null,
      stats: { attempts: 0, hits: 0, perfect: 0, wrong: 0, early: 0, late: 0, missed: 0, streak: 0, bestStreak: 0 },
      feedback: {
        text: this.activity === 'rope' ? 'Observe la corde, puis alterne les appuis.' : 'Observe la balle, puis alterne les mains.',
        tone: 'neutral', until: 0,
      },
      summary: null,
    };
    this._refresh();
    return this.state;
  }

  start() {
    if (this.state.phase !== 'ready') return false;
    this.state.phase = 'running'; this._emit('round-start'); return true;
  }
  pause() {
    if (this.state.phase !== 'running') return false;
    this.state.phase = 'paused'; this.releaseControls(); return true;
  }
  resume() {
    if (this.state.phase !== 'paused') return false;
    this.state.phase = 'running'; return true;
  }
  // The input adapter releases keys/pointers. A started movement belongs to
  // the simulation and must keep its frozen pose when the scene loses focus.
  releaseControls() {}
  drainEvents() { const events = this._events; this._events = []; return events; }

  act(input) {
    if (this.state.phase !== 'running' || !['jab', 'cross'].includes(input)
      || this._action || this.state.remaining + EPSILON < this.rules.duration) return false;
    const beat = this._beats[this._nextIndex];
    if (!beat || beat.status !== 'waiting') return false;
    const projectedContact = this.state.elapsed + this.rules.contact;
    const offset = projectedContact - beat.targetAt;
    const inWindow = Math.abs(offset) <= this.rules.tolerance + EPSILON;
    const result = inWindow
      ? input !== beat.expected ? 'wrong' : Math.abs(offset) <= this.rules.perfect + EPSILON ? 'perfect' : 'good'
      : offset < 0 ? 'early' : 'late';
    if (inWindow) beat.status = 'pending';
    this._action = {
      input, action: input, elapsed: 0, duration: this.rules.duration,
      contact: this.rules.contact, hold: this.rules.hold, load: this.rules.load ?? 0,
      startedAt: this.state.elapsed, impacted: false,
      beatIndex: beat.index, reserved: inWindow, status: 'pending', result, offset,
    };
    this._refresh();
    return true;
  }

  update(seconds) {
    if (this.state.phase !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return;
    const until = Math.min(this.duration, this.state.elapsed + seconds);
    while (this.state.elapsed < until - EPSILON && this.state.phase === 'running') {
      let next = until;
      if (this._action) {
        if (!this._action.impacted) next = Math.min(next, this._action.startedAt + this._action.contact);
        next = Math.min(next, this._action.startedAt + this._action.duration);
      }
      const beat = this._beats[this._nextIndex];
      if (beat?.status === 'waiting') next = Math.min(next, beat.targetAt + this.rules.tolerance);
      this.state.elapsed = next;
      this.state.remaining = Math.max(0, this.duration - next);
      if (this._action) this._action.elapsed = next - this._action.startedAt;
      this._resolveTransitions();
    }
    // Settle a sub-nanosecond remainder without losing a boundary contact.
    if (this.state.phase === 'running' && until > this.state.elapsed) {
      this.state.elapsed = until; this.state.remaining = Math.max(0, this.duration - until);
      if (this._action) this._action.elapsed = until - this._action.startedAt;
      this._resolveTransitions();
    }
    this._refresh();
  }

  _resolveTransitions() {
    if (this._action && !this._action.impacted && this._action.elapsed + EPSILON >= this._action.contact) this._contact();
    let beat = this._beats[this._nextIndex];
    while (beat?.status === 'waiting' && this.state.elapsed + EPSILON >= beat.targetAt + this.rules.tolerance) {
      beat.status = 'missed';
      this.state.stats.missed += 1; this.state.stats.streak = 0;
      this._emit('miss', { input: null, index: beat.index, result: 'missed', offset: this.rules.tolerance });
      this._feedback('OBSERVE LE PROCHAIN PASSAGE', 'retry');
      this._nextIndex += 1;
      beat = this._beats[this._nextIndex];
    }
    if (this._action && this._action.elapsed + EPSILON >= this._action.duration) this._action = null;
    if (this.state.feedback.until && this.state.feedback.until < this.state.elapsed) {
      this.state.feedback = { text: '', tone: 'neutral', until: 0 };
    }
    if (this.state.remaining <= EPSILON) this._finish();
  }

  _contact() {
    const action = this._action, stats = this.state.stats;
    action.impacted = true;
    stats.attempts += 1;
    const hit = action.result === 'perfect' || action.result === 'good';
    action.status = hit ? 'hit' : 'miss';
    if (hit) {
      stats.hits += 1;
      if (action.result === 'perfect') stats.perfect += 1;
      stats.streak += 1; stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
      this._feedback(action.result === 'perfect' ? 'PARFAIT !' : 'BON RYTHME', 'good');
    } else {
      stats[action.result] += 1; stats.streak = 0;
      const feedback = {
        wrong: this.activity === 'rope' ? 'CHANGE D’APPUI' : 'CHANGE DE MAIN',
        early: 'TROP TÔT · ATTENDS LE REPÈRE',
        late: 'TROP TARD · PRÉPARE LE SUIVANT',
      };
      this._feedback(feedback[action.result], 'retry');
    }
    if (action.reserved) {
      this._beats[action.beatIndex].status = hit ? 'hit' : 'wrong';
      this._nextIndex = action.beatIndex + 1;
    }
    this._emit(hit ? 'hit' : 'miss', {
      input: action.input, index: action.beatIndex, result: action.result, offset: action.offset,
    });
  }

  _refresh() {
    const beat = this._beats[this._nextIndex];
    if (beat) {
      const offset = this.state.elapsed - beat.inputAt;
      const phase = beat.status === 'pending' ? 'pending'
        : this.state.elapsed < this.rules.preparation - this.rules.interval ? 'preparation'
          : offset < -this.rules.tolerance ? 'approach'
            : offset <= this.rules.tolerance + EPSILON ? 'window' : 'late';
      this.state.beat = {
        ...beat, window: this.rules.tolerance, phase,
        progress: clamp(.5 + offset / (this.rules.interval * 2)),
      };
    } else {
      this.state.beat = {
        index: this._beats.length, expected: null, inputAt: null, targetAt: null,
        window: this.rules.tolerance, status: 'complete', phase: 'complete', progress: 1,
      };
    }
    const action = this._action;
    this.state.player = action ? {
      ...action, progress: clamp(action.elapsed / action.duration),
      phase: !action.impacted ? 'windup' : action.elapsed < action.contact + action.hold ? 'contact' : 'recover',
    } : {
      input: null, action: 'idle', elapsed: 0, duration: 0, contact: 0, hold: 0, load: 0,
      impacted: false, beatIndex: null, status: 'idle', result: null, progress: 0, phase: 'idle',
    };
  }

  _finish() {
    if (this.state.phase === 'finished') return;
    this.state.phase = 'finished'; this.state.elapsed = this.duration; this.state.remaining = 0;
    this._action = null;
    const stats = this.state.stats;
    const resolved = stats.hits + stats.wrong + stats.missed + stats.early + stats.late;
    const accuracy = resolved ? Math.round(100 * stats.hits / resolved) : 0;
    this.state.summary = {
      ...stats, accuracy, qualified: stats.hits >= this.rules.minimumHits && stats.hits / resolved >= .6,
    };
    this._emit('round-end', { summary: { ...this.state.summary } });
  }
  _feedback(text, tone) { this.state.feedback = { text, tone, until: this.state.elapsed + .75 }; }
  _emit(type, data = {}) { this._events.push({ type, time: this.state.elapsed, ...data }); }
}
