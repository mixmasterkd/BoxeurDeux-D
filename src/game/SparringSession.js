import { LESSONS, TrainingCoach } from './TrainingCoach.js';

/**
 * Deterministic, renderer-independent sparring model. All times are seconds.
 * An impact is counted when action progress crosses its `impact` fraction.
 * Renderers should hold the extended glove from impact for IMPACT_HOLD seconds.
 * A hit reaction never cancels a committed punch or Rémi's tell.
 */
export const IMPACT_HOLD = 0.10;
// Each follow-up must begin within this interval after the previous punch ends.
export const COMBO_WINDOW = 0.50;

export const TIMINGS = Object.freeze({
  player: Object.freeze({
    jab: Object.freeze({ duration: 0.44, impact: 0.45, cost: 10 }),
    cross: Object.freeze({ duration: 0.60, impact: 0.50, cost: 17 }),
    hook: Object.freeze({ duration: 0.68, impact: 0.32 / 0.68, cost: 21 }),
    dodgeLeft: Object.freeze({ duration: 0.60, activeFrom: 0.08, activeUntil: 0.44, cost: 12 }),
    dodgeRight: Object.freeze({ duration: 0.60, activeFrom: 0.08, activeUntil: 0.44, cost: 12 }),
    hit: Object.freeze({ duration: 0.28 }),
  }),
  remi: Object.freeze({
    jab: Object.freeze({ duration: 0.58, impact: 0.40 }),
    cross: Object.freeze({ duration: 0.68, impact: 0.40 }),
  }),
});

export const TEMPOS = Object.freeze({
  calm: Object.freeze({ tell: 1.05, opening: 1.40, openingFree: 1.95, guard: 0.95 }),
  normal: Object.freeze({ tell: 0.80, opening: 1.10, openingFree: 1.70, guard: 0.70 }),
  fast: Object.freeze({ tell: 0.62, opening: 0.90, openingFree: 1.45, guard: 0.50 }),
});

const RECOVERY_PER_SECOND = 20;
const GUARD_DRAIN_PER_SECOND = 7;
const BLOCK_COST = 8;
const RECOVERY_DELAY = 0.35;
const HURT_DURATION = 0.26;
const EPSILON = 1e-9;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizeSettings(settings = {}, previous = {}) {
  const duration = Number(settings.duration ?? previous.duration ?? 60);
  const recovery = Number(settings.recovery ?? previous.recovery ?? 1);
  const tempo = settings.tempo ?? previous.tempo ?? 'normal';
  const requestedLesson = settings.lesson ?? previous.lesson ?? 'free';
  const lesson = Object.hasOwn(LESSONS, requestedLesson) ? requestedLesson : 'free';
  return {
    duration: lesson === 'free' && Number.isFinite(duration) ? clamp(duration, 1, 600) : 60,
    tempo: lesson !== 'free' ? 'calm' : Object.hasOwn(TEMPOS, tempo) ? tempo : 'normal',
    recovery: Number.isFinite(recovery) ? clamp(recovery, 0.5, 2) : 1,
    lesson,
  };
}

function actionState(action, duration = 0, elapsed = 0, extra = {}) {
  return {
    action,
    progress: duration ? clamp(elapsed / duration, 0, 1) : 0,
    duration,
    impact: null,
    hurt: 0,
    reactionProgress: 1,
    ...extra,
  };
}

export class SparringSession {
  constructor({ random = Math.random, ...settings } = {}) {
    this.random = typeof random === 'function' ? random : Math.random;
    this.settings = normalizeSettings(settings);
    this.reset();
  }

  reset(settings = {}) {
    this.settings = normalizeSettings(settings, this.settings);
    this._events = [];
    this._guardHeld = false;
    this._playerAction = null;
    this._combo = null;
    this._playerHurt = 0;
    this._remiHurt = 0;
    this._recoverAt = 0;
    this._nextSide = 'left';
    this._remiAction = null;
    this._remiStage = 0;
    this._coach = this.settings.lesson === 'free' ? null : new TrainingCoach(this.settings.lesson);
    this.state = {
      phase: 'ready',
      remaining: this.settings.duration,
      elapsed: 0,
      stamina: 100,
      player: actionState('idle'),
      remi: actionState('idle', 0, 0, { safeDodge: null, side: null }),
      stats: { landed: 0, received: 0, blocked: 0, dodged: 0, thrown: 0, opponentBlocked: 0, missed: 0, hooks: 0, combos: 0 },
      combo: { step: 0, ready: false, remaining: 0 },
      settings: { ...this.settings },
      training: null,
    };
    this.state.training = this._coach?.snapshot(this.state.stats) ?? null;
    return this.state;
  }

  setSettings(settings = {}) {
    const next = normalizeSettings(settings, this.settings);
    if (next.lesson !== this.settings.lesson) {
      this.reset(next);
      return { ...this.settings };
    }
    this.settings = next;
    this.state.settings = { ...this.settings };
    if (this.state.phase === 'ready') {
      this.state.remaining = this.settings.duration;
    }
    // A current tell keeps its promised timing; changes apply to following stages.
    return { ...this.settings };
  }

  start() {
    if (this.state.phase !== 'ready') return false;
    this.state.phase = 'running';
    // A generous first opening lets the player try their first punch.
    this._setRemiAction('open', this._coach ? 1.30 : 1.85);
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
    return true;
  }

  act(action) {
    // The hook belongs to J → K → J, never to a third attack command.
    if (!['jab', 'cross', 'dodgeLeft', 'dodgeRight'].includes(action)
      || this.state.phase !== 'running' || this._playerAction || this._coach?.state.completed) return false;
    this._expireCombo();
    if (this._guardHeld || action.startsWith('dodge')) this._clearCombo();
    if (!this._coach && action === 'jab' && this._combo?.step === 2) action = 'hook';
    const timing = TIMINGS.player[action];
    if (this.state.stamina + EPSILON < timing.cost) {
      this._clearCombo();
      this._emit('exhausted', { action });
      this._syncState();
      return false;
    }
    let sequence = null;
    if (!this._coach && !this._guardHeld) {
      if (action === 'jab') {
        this._clearCombo();
        sequence = { step: 1, hits: 0, valid: true };
      } else if (action === 'cross' && this._combo?.step === 1) {
        sequence = this._combo;
        sequence.step = 2;
      } else if (action === 'hook') {
        sequence = this._combo;
        // Keep the completed sequence attached to the punch until contact.
        this._combo = null;
      } else {
        this._clearCombo();
      }
      if (sequence && action !== 'hook') {
        sequence.expiresAt = this.state.elapsed + timing.duration + COMBO_WINDOW;
        this._combo = sequence;
      }
    }
    this.state.stamina = Math.max(0, this.state.stamina - timing.cost);
    this._playerAction = { action, elapsed: 0, duration: timing.duration, impact: timing.impact ?? null, impacted: false, sequence };
    this._recoverAt = this.state.elapsed + timing.duration + RECOVERY_DELAY;
    if (timing.impact !== undefined) this.state.stats.thrown += 1;
    this._syncState();
    return true;
  }

  setGuard(held) {
    if (held && this.state.phase === 'running') this._clearCombo();
    const next = Boolean(held) && this.state.phase === 'running' && this.state.stamina > EPSILON;
    const wasHeld = this._guardHeld;
    if (this._guardHeld && !next) this._recoverAt = Math.max(this._recoverAt, this.state.elapsed + RECOVERY_DELAY);
    this._guardHeld = next;
    this._coach?.onGuardChange(next, wasHeld, this._trainingContext());
    this._syncState();
    return this._guardHeld;
  }

  releaseControls() {
    this._clearCombo();
    this.setGuard(false);
  }

  drainEvents() {
    const events = this._events;
    this._events = [];
    return events;
  }

  update(dtSeconds) {
    if (this.state.phase !== 'running' || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    let remaining = Math.min(dtSeconds, this.state.remaining);
    // Bound integration and land exactly on action/impact boundaries. This keeps
    // large deterministic test steps and real rendering frames equivalent.
    while (remaining > EPSILON && this.state.phase === 'running') {
      let dt = Math.min(remaining, 1 / 120);
      for (const action of [this._playerAction, this._remiAction]) {
        if (!action) continue;
        const boundary = action.impact !== null && !action.impacted
          ? action.duration * action.impact
          : action.duration;
        const untilBoundary = boundary - action.elapsed;
        if (untilBoundary > EPSILON) dt = Math.min(dt, untilBoundary);
      }
      this._step(dt);
      remaining -= dt;
    }
    this._syncState();
  }

  _step(dt) {
    this.state.elapsed = Math.min(this.settings.duration, this.state.elapsed + dt);
    this.state.remaining = Math.max(0, this.settings.duration - this.state.elapsed);
    this._playerHurt = Math.max(0, this._playerHurt - dt);
    this._remiHurt = Math.max(0, this._remiHurt - dt);

    if (this._playerAction) this._playerAction.elapsed += dt;
    if (this._remiAction) this._remiAction.elapsed += dt;

    const guarding = this._guardHeld && !this._playerAction;
    if (guarding) {
      this._clearCombo();
      this.state.stamina = Math.max(0, this.state.stamina - GUARD_DRAIN_PER_SECOND * dt);
      this._recoverAt = this.state.elapsed + RECOVERY_DELAY;
      if (this.state.stamina <= EPSILON) {
        this._guardHeld = false;
        this._emit('exhausted', { action: 'guard' });
      }
    } else if (!this._playerAction && this.state.elapsed >= this._recoverAt) {
      this.state.stamina = Math.min(100, this.state.stamina + RECOVERY_PER_SECOND * this.settings.recovery * dt);
    }

    // Resolve both committed punches before changing stages, allowing a fair trade.
    if (this._hasImpact(this._playerAction)) {
      this._playerAction.impacted = true;
      this._resolvePlayerPunch();
    }
    if (this._hasImpact(this._remiAction)) {
      this._remiAction.impacted = true;
      this._resolveRemiPunch();
    }

    if (this._playerAction && this._playerAction.elapsed + EPSILON >= this._playerAction.duration) {
      this._playerAction = null;
    }
    if (this._remiAction && this._remiAction.elapsed + EPSILON >= this._remiAction.duration) {
      this._nextRemiAction();
    }

    this._trainingEvents(this._coach?.update(this._trainingContext()));

    if (this.state.remaining <= EPSILON) {
      this.state.remaining = 0;
      this.state.elapsed = this.settings.duration;
      this._finishRound();
    } else if (this._coach?.canFinish(this._trainingContext())) {
      this.state.remaining = 0;
      this._finishRound();
    }
  }

  _hasImpact(action) {
    return action && action.impact !== null && !action.impacted && action.elapsed + EPSILON >= action.duration * action.impact;
  }

  _resolvePlayerPunch() {
    const attack = this._playerAction.action;
    const sequence = this._playerAction.sequence;
    if (this._remiAction?.action === 'guard') {
      this.state.stats.opponentBlocked += 1;
      this._emit('player-blocked', { attack, impact: this._playerAction.impact });
    } else {
      this.state.stats.landed += 1;
      const combo = attack === 'hook' && sequence?.valid === true && sequence.hits === 2;
      if (attack === 'hook') {
        this.state.stats.hooks += 1;
        if (combo) this.state.stats.combos += 1;
      } else if (sequence?.valid) {
        sequence.hits += 1;
      }
      this._remiHurt = HURT_DURATION;
      this._emit('player-hit', { attack, impact: this._playerAction.impact, ...(attack === 'hook' ? { combo } : {}) });
    }
  }

  _resolveRemiPunch() {
    const attack = this._remiAction.action;
    const safeDodge = this._remiAction.safeDodge;
    const player = this._playerAction;
    const dodgeTiming = player && TIMINGS.player[player.action];
    const dodged = player?.action === safeDodge
      && player.elapsed + EPSILON >= dodgeTiming.activeFrom
      && player.elapsed <= dodgeTiming.activeUntil + EPSILON;
    if (dodged) {
      this.state.stats.dodged += 1;
      this._emit('remi-dodged', { attack, direction: safeDodge, impact: this._remiAction.impact });
      return;
    }
    if (this._guardHeld && !player && this.state.stamina + EPSILON >= BLOCK_COST) {
      this.state.stamina = Math.max(0, this.state.stamina - BLOCK_COST);
      this._recoverAt = this.state.elapsed + RECOVERY_DELAY;
      this.state.stats.blocked += 1;
      this._emit('remi-blocked', { attack, impact: this._remiAction.impact });
      return;
    }
    this.state.stats.received += 1;
    this._clearCombo();
    this.state.stamina = Math.max(0, this.state.stamina - 4);
    this._playerHurt = HURT_DURATION;
    this._recoverAt = Math.max(this._recoverAt, this.state.elapsed + RECOVERY_DELAY);
    if (!player) this._playerAction = { action: 'hit', elapsed: 0, duration: TIMINGS.player.hit.duration, impact: null, impacted: false };
    this._emit('remi-hit', { attack, impact: this._remiAction.impact, guardBroken: this._guardHeld });
  }

  _setRemiAction(action, duration, extra = {}) {
    this._remiAction = { action, duration, elapsed: 0, impact: null, impacted: false, side: null, safeDodge: null, ...extra };
    this._remiStage += 1;
    this._coach?.onStage(this._trainingContext());
  }

  _nextRemiAction() {
    const current = this._remiAction;
    const tempo = TEMPOS[this.settings.tempo];
    if (this._coach?.state.completed) {
      this._setRemiAction('open', 1);
    } else if (current.action === 'open') {
      const sample = clamp(Number(this.random()) || 0, 0, 1);
      this._setRemiAction('guard', tempo.guard + (sample - 0.5) * 0.26);
    } else if (current.action === 'guard') {
      if (this.settings.lesson === 'jab') {
        this._setRemiAction('open', tempo.opening);
        return;
      }
      const side = this._nextSide;
      this._nextSide = side === 'left' ? 'right' : 'left';
      const safeDodge = side === 'left' ? 'dodgeRight' : 'dodgeLeft';
      this._setRemiAction(side === 'left' ? 'tellLeft' : 'tellRight', tempo.tell, { side, safeDodge });
      this._emit('tell', { side, safeDodge, duration: tempo.tell });
    } else if (current.action === 'tellLeft' || current.action === 'tellRight') {
      const action = current.side === 'left' ? 'jab' : 'cross';
      this._setRemiAction(action, TIMINGS.remi[action].duration, {
        impact: TIMINGS.remi[action].impact,
        side: current.side,
        safeDodge: current.safeDodge,
      });
    } else {
      this._setRemiAction('open', this._coach ? tempo.opening : tempo.openingFree);
    }
  }

  _syncState() {
    this._expireCombo();
    const player = this._playerAction;
    const remi = this._remiAction;
    this.state.combo = {
      step: this._combo?.step ?? 0,
      ready: this.state.phase === 'running' && !player && !this._guardHeld
        && this._combo?.step === 2 && this.state.stamina + EPSILON >= TIMINGS.player.hook.cost,
      remaining: this._combo && !player ? Math.max(0, this._combo.expiresAt - this.state.elapsed) : 0,
    };
    this.state.player = player
      ? actionState(player.action, player.duration, player.elapsed, {
        impact: player.impact,
        hurt: this._playerHurt / HURT_DURATION,
        reactionProgress: 1 - this._playerHurt / HURT_DURATION,
      })
      : actionState(this._guardHeld ? 'guard' : 'idle', 0, 0, {
        hurt: this._playerHurt / HURT_DURATION,
        reactionProgress: 1 - this._playerHurt / HURT_DURATION,
      });
    // Show the hit pose in an opening, but preserve all tells and committed punches.
    const remiAction = remi?.action === 'open' && this._remiHurt > 0 ? 'hit' : (remi?.action ?? 'idle');
    this.state.remi = remi
      ? actionState(remiAction, remi.duration, remi.elapsed, {
        impact: remi.impact,
        hurt: this._remiHurt / HURT_DURATION,
        reactionProgress: 1 - this._remiHurt / HURT_DURATION,
        safeDodge: remi.safeDodge,
        side: remi.side,
      })
      : actionState('idle', 0, 0, { safeDodge: null, side: null });
    if (remiAction === 'hit') {
      this.state.remi.duration = HURT_DURATION;
      this.state.remi.progress = this.state.remi.reactionProgress;
    }
    this.state.training = this._coach?.snapshot(this.state.stats) ?? null;
  }

  _trainingContext() {
    return {
      time: this.state.elapsed, phase: this.state.phase, stamina: this.state.stamina,
      guardHeld: this._guardHeld, playerAction: this._playerAction?.action ?? null,
      playerHurt: this._playerHurt, remiHurt: this._remiHurt,
      remiAction: this._remiAction?.action ?? null, remiStage: this._remiStage,
      remiRemaining: this._remiAction ? this._remiAction.duration - this._remiAction.elapsed : 0,
    };
  }

  _trainingEvents(events = []) {
    for (const event of events) this._events.push({ time: this.state.elapsed, ...event });
  }

  _finishRound() {
    this.state.phase = 'finished';
    this._clearCombo();
    this._guardHeld = false;
    // Freeze the final combat frame behind the report. Clearing an action here
    // would hide a glove whose contact was just scored in this same frame.
    // Finished rounds accept no input or time; reset clears both actions.
    this._emit('round-end', { stats: { ...this.state.stats } });
  }

  _emit(type, extra = {}) {
    const event = { type, time: this.state.elapsed, ...extra };
    this._events.push(event);
    this._trainingEvents(this._coach?.onEvent(event, this._trainingContext()));
  }

  _clearCombo() {
    if (this._combo) this._combo.valid = false;
    if (this._playerAction?.sequence) this._playerAction.sequence.valid = false;
    this._combo = null;
  }

  _expireCombo() {
    if (this._combo && this.state.elapsed > this._combo.expiresAt + EPSILON) this._clearCombo();
  }
}
