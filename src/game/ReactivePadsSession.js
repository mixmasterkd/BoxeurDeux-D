import { TIMINGS, IMPACT_HOLD } from './SparringSession.js';

const EPS = 1e-8;
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
// Anatomical sides: the player's left jab meets Fredo's left mitt, which is
// on the RIGHT of a front-facing coach. No clock window or letter sequence.
const targetFor = (expected, index, raisedAt) => ({
  index, expected, side: expected === 'jab' ? 'left' : 'right',
  screenSide: expected === 'jab' ? 'right' : 'left', phase: 'waiting', raisedAt,
});

export class ReactivePadsSession {
  constructor({ duration = 45, random = Math.random } = {}) {
    this.activity = 'pads'; this.duration = Math.max(5, Math.min(180, Number(duration) || 45));
    this.random = typeof random === 'function' ? random : Math.random;
    this.rules = { duration: TIMINGS.player.cross.duration, contact: .19, hold: IMPACT_HOLD,
      minimumHits: 12, interval: 1, tolerance: 0, reactive: true };
    this.reset();
  }
  reset() {
    this.events = []; this.action = null; this.nextTargetAt = null; this.repeat = 1;
    this.state = { activity: 'pads', duration: this.duration, phase: 'ready', elapsed: 0, remaining: this.duration,
      rules: { ...this.rules }, stats: { hits: 0, wrong: 0, early: 0, late: 0, missed: 0, streak: 0, bestStreak: 0 },
      target: targetFor('jab', 0, 0), laps: 0, distance: 0, guard: null,
      feedback: { text: 'Fredo présente sa gauche. Observe la mitaine levée.', tone: 'neutral', until: 0 }, summary: null };
    this.refresh(); return this.state;
  }
  start() { if (this.state.phase !== 'ready') return false; this.state.phase = 'running'; this.emit('round-start'); return true; }
  pause() { if (this.state.phase !== 'running') return false; this.state.phase = 'paused'; return true; }
  resume() { if (this.state.phase !== 'paused') return false; this.state.phase = 'running'; return true; }
  setGuard() { return false; }
  releaseControls() { /* There is no held attack or deferred input in this exercise. */ }
  act(input) {
    const s = this.state, timing = TIMINGS.player[input];
    if (s.phase !== 'running' || this.action || !['jab', 'cross'].includes(input)
      || s.target.phase !== 'waiting' || s.remaining + EPS < timing.duration) return false;
    this.action = { action: input, input, startedAt: s.elapsed, elapsed: 0, duration: timing.duration,
      contact: timing.duration * timing.impact, hold: IMPACT_HOLD, impacted: false,
      result: input === s.target.expected ? 'hit' : 'wrong', targetIndex: s.target.index, status: 'pending' };
    this.refresh(); return true;
  }
  update(dt) {
    const s = this.state;
    if (s.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    const end = Math.min(this.duration, s.elapsed + dt);
    while (s.elapsed < end - EPS) {
      const a = this.action;
      let next = end;
      if (a) next = Math.min(next, a.startedAt + (a.impacted ? a.duration : a.contact));
      else if (this.nextTargetAt !== null) next = Math.min(next, this.nextTargetAt);
      s.elapsed = next; s.remaining = this.duration - next;
      if (a) {
        a.elapsed = next - a.startedAt;
        if (!a.impacted && a.elapsed + EPS >= a.contact) this.contact();
        if (a.elapsed + EPS >= a.duration) {
          this.action = null;
          if (a.result === 'hit') { s.target.phase = 'rest'; this.nextTargetAt = s.elapsed + .18 + clamp(this.random()) * .22; }
        }
      } else if (this.nextTargetAt !== null && s.elapsed + EPS >= this.nextTargetAt) this.raiseTarget();
      if (s.remaining <= EPS) this.finish();
    }
    if (s.elapsed > s.feedback.until) s.feedback.text = '';
    this.refresh();
  }
  contact() {
    const a = this.action, s = this.state;
    a.impacted = true; a.status = a.result;
    if (a.result === 'hit') {
      s.stats.hits++; s.stats.streak++; s.stats.bestStreak = Math.max(s.stats.bestStreak, s.stats.streak);
      s.target.phase = 'contact'; this.feedback('Bien joué !', 'good');
    } else { s.stats.wrong++; s.stats.streak = 0; this.feedback('L’autre mitaine. Prends ton temps.', 'retry'); }
    this.emit(a.result === 'hit' ? 'hit' : 'miss', { input: a.input, result: a.result, targetIndex: a.targetIndex, side: s.target.side, screenSide: s.target.screenSide });
  }
  raiseTarget() {
    const previous = this.state.target;
    let expected = clamp(this.random()) < .5 ? 'jab' : 'cross';
    if (this.repeat >= 2 && expected === previous.expected) expected = expected === 'jab' ? 'cross' : 'jab';
    this.repeat = expected === previous.expected ? this.repeat + 1 : 1;
    this.state.target = targetFor(expected, previous.index + 1, this.state.elapsed);
    this.nextTargetAt = null; this.emit('target', { ...this.state.target });
  }
  refresh() {
    const s = this.state, a = this.action;
    // Compatibility for the shared activity UI. Pads hides the conductor; only
    // the swimming activity uses actual beat phases and acceptance windows.
    s.beat = { expected: s.target.expected, inputAt: s.target.raisedAt, targetAt: s.target.raisedAt, phase: s.target.phase };
    s.player = a ? { ...a, phase: !a.impacted ? 'windup' : a.elapsed < a.contact + a.hold ? 'contact' : 'recover' }
      : { action: 'idle', input: null, phase: 'idle', elapsed: 0, duration: 0, impacted: false };
  }
  finish() {
    const s = this.state; if (s.phase === 'finished') return;
    s.phase = 'finished'; s.remaining = 0; this.action = null; this.nextTargetAt = null;
    const attempts = s.stats.hits + s.stats.wrong, accuracy = attempts ? Math.round(100 * s.stats.hits / attempts) : 0;
    s.summary = { ...s.stats, accuracy, laps: 0, completed: true, qualified: s.stats.hits >= 12 && accuracy >= 60 };
    this.emit('round-end');
  }
  feedback(text, tone) { this.state.feedback = { text, tone, until: this.state.elapsed + .85 }; }
  emit(type, extra = {}) { this.events.push({ type, time: this.state.elapsed, ...extra }); }
  drainEvents() { const result = this.events; this.events = []; return result; }
}
