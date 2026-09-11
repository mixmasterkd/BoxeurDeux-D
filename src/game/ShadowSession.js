import { COMBO_WINDOW, TIMINGS } from './SparringSession.js';

const EPSILON = 1e-9;
const INPUTS = new Set(['jab', 'cross', 'dodgeLeft', 'dodgeRight']);
const EMPTY_COMBO = () => ({ step: 0, ready: false, remaining: 0 });

/**
 * Free movement practice: no opponent, damage, stamina cost or time limit.
 * `seconds` measures active real time; `elapsed` and movement timings use the
 * selected practice speed. Motion events mark the same peak as sparring.
 */
export class ShadowSession {
  constructor({ speed = 1 } = {}) {
    this._speed = speed === 0.65 ? 0.65 : 1;
    this.reset();
  }

  reset() {
    this._events = [];
    this._guardHeld = false;
    this._guardLevel = 'head';
    this._action = null;
    this._combo = null;
    this.state = {
      phase: 'ready',
      elapsed: 0,
      seconds: 0,
      speed: this._speed,
      player: null,
      combo: EMPTY_COMBO(),
      stats: { jab: 0, cross: 0, hook: 0, combos: 0, dodgeLeft: 0, dodgeRight: 0, guardSeconds: 0, head: 0, body: 0, guardHeadSeconds: 0, guardBodySeconds: 0 },
    };
    this._syncState();
    return this.state;
  }

  start() {
    if (this.state.phase !== 'ready') return false;
    this.state.phase = 'running';
    this._syncState();
    return true;
  }

  pause() {
    if (this.state.phase !== 'running') return false;
    this.state.phase = 'paused';
    this.releaseControls();
    return true;
  }

  resume() {
    if (this.state.phase !== 'paused') return false;
    this.state.phase = 'running';
    this._syncState();
    return true;
  }

  finish() {
    if (!['running', 'paused'].includes(this.state.phase)) return false;
    this.state.phase = 'finished';
    this._clearCombo();
    this._guardHeld = false;
    this.state.combo = EMPTY_COMBO();
    // Keep the exact last pose behind the report, including an extended glove.
    return true;
  }

  setSpeed(speed) {
    if (this.state.phase === 'running' || ![1, 0.65].includes(speed)) return false;
    this._speed = speed;
    this.state.speed = speed;
    return true;
  }

  act(input) {
    if (!INPUTS.has(input) || this.state.phase !== 'running' || this._action) return false;
    this._expireCombo();
    if ((this._guardHeld && this._guardLevel === 'head') || input.startsWith('dodge')) this._clearCombo();
    const action = input === 'jab' && this._combo?.step === 2 ? 'hook' : input;
    const timing = TIMINGS.player[action];
    let sequence = null;
    if (!this._guardHeld || this._guardLevel === 'body') {
      if (action === 'jab') {
        this._clearCombo();
        sequence = { step: 1, motions: 0, valid: true };
      } else if (action === 'cross' && this._combo?.step === 1) {
        sequence = this._combo;
        sequence.step = 2;
      } else if (action === 'hook') {
        sequence = this._combo;
        this._combo = null;
      } else {
        this._clearCombo();
      }
      if (sequence && action !== 'hook') {
        sequence.expiresAt = this.state.elapsed + timing.duration + COMBO_WINDOW;
        this._combo = sequence;
      }
    }
    this._action = {
      action,
      target: this._guardHeld && this._guardLevel === 'body' ? 'body' : 'head',
      elapsed: 0,
      startedAt: this.state.elapsed,
      duration: timing.duration,
      impact: timing.impact ?? null,
      peak: timing.impact === undefined ? timing.activeFrom : timing.duration * timing.impact,
      counted: false,
      sequence,
    };
    this._syncState();
    return true;
  }

  setGuard(held, level = 'head') {
    const guardLevel = level === 'body' ? 'body' : 'head';
    const next = Boolean(held) && this.state.phase === 'running';
    if (next && guardLevel === 'head') this._clearCombo();
    this._guardHeld = next;
    this._guardLevel = next ? guardLevel : 'head';
    this._syncState();
    return next;
  }

  releaseControls() {
    this._clearCombo();
    this._guardHeld = false;
    this._guardLevel = 'head';
    this._syncState();
  }

  update(realSeconds, animationSeconds = realSeconds) {
    if (this.state.phase !== 'running' || !Number.isFinite(realSeconds) || realSeconds <= 0) return;
    if (!Number.isFinite(animationSeconds) || animationSeconds <= 0) return;
    const dt = Math.min(animationSeconds, realSeconds) * this.state.speed;
    const action = this._action;
    const busyFor = action ? Math.max(0, action.duration - action.elapsed) : 0;
    this.state.seconds += realSeconds;
    this.state.elapsed += dt;
    if (action) {
      action.elapsed = Math.min(action.duration, action.elapsed + dt);
      if (!action.counted && action.elapsed + EPSILON >= action.peak) {
        action.counted = true;
        this.state.stats[action.action] += 1;
        if (action.impact !== null) this.state.stats[action.target] += 1;
        const event = { type: 'motion', action: action.action, target: action.target, time: action.startedAt + action.peak };
        if (action.action === 'hook') {
          event.combo = action.sequence?.valid === true && action.sequence.motions === 2;
          if (event.combo) this.state.stats.combos += 1;
        } else if (action.sequence?.valid) {
          action.sequence.motions += 1;
        }
        this._events.push(event);
      }
      if (action.elapsed + EPSILON >= action.duration) this._action = null;
    }
    // Holding guard during a punch raises it only after the committed recovery.
    // A renderer may bound animation steps to keep peaks visible on slow frames.
    // The active clock remains real time; guard time follows the visible guarded
    // fraction of that frame, including a recovery that ends partway through it.
    if (this._guardHeld) {
      const guarded = Math.max(0, dt - busyFor) / dt * realSeconds;
      this.state.stats.guardSeconds += guarded;
      this.state.stats[this._guardLevel === 'body' ? 'guardBodySeconds' : 'guardHeadSeconds'] += guarded;
    }
    this._syncState();
  }

  drainEvents() {
    const events = this._events;
    this._events = [];
    return events;
  }

  _clearCombo() {
    if (this._combo) this._combo.valid = false;
    if (this._action?.sequence) this._action.sequence.valid = false;
    this._combo = null;
  }

  _expireCombo() {
    if (this._combo && this.state.elapsed > this._combo.expiresAt + EPSILON) this._clearCombo();
  }

  _syncState() {
    this._expireCombo();
    const action = this._action;
    this.state.combo = {
      step: this._combo?.step ?? 0,
      ready: this.state.phase === 'running' && !action && (!this._guardHeld || this._guardLevel === 'body') && this._combo?.step === 2,
      remaining: this._combo && !action ? Math.max(0, this._combo.expiresAt - this.state.elapsed) : 0,
    };
    if (this.state.phase === 'finished') return;
    this.state.player = {
      action: action?.action ?? (this._guardHeld ? 'guard' : 'idle'),
      target: action?.target ?? (this._guardHeld ? this._guardLevel : 'head'),
      guardLevel: this._guardLevel,
      elapsed: action?.elapsed ?? 0,
      progress: action ? Math.min(1, action.elapsed / action.duration) : 0,
      duration: action?.duration ?? 0,
      impact: action?.impact ?? null,
      hurt: 0,
      reactionProgress: 1,
    };
  }
}
