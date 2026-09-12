import { LESSONS, TrainingCoach } from './TrainingCoach.js';
import { getOpponentProfile, opponentCornerAdvice } from './OpponentProfiles.js';

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

export const KNOCKDOWN_RULES = Object.freeze({
  rounds: 3, maxResistance: 100, damage: Object.freeze({ jab: 12, cross: 18, hook: 22 }),
  contactHold: IMPACT_HOLD, fall: .60, count: 10, rise: .80, needed: 6, pressSpacing: .35,
  remiCounts: Object.freeze([6, 8, 9]), restoredResistance: Object.freeze([55, 45, 35]),
});
// Resistance-mode events use `time` for the frozen round clock. `count` also
// supplies countTime, so a renderer/audio layer never has to derive the count
// from the round clock. knockdown: downed/eliminated/downs; recovery-press:
// action/accepted/needed; stood-up: actor/resistance/totalDowns; round-break:
// round/history; bout-finish: result/stats/round. sparring-resumed and round-start
// tell input adapters to discard old held controls before the new opening.
const ACTORS = ['player', 'remi'];
const unguided = lesson => lesson === 'free' || lesson === 'resistance';

const RECOVERY_PER_SECOND = 20;
const GUARD_DRAIN_PER_SECOND = 7;
const BLOCK_COST = 8;
const RECOVERY_DELAY = 0.35;
const HURT_DURATION = 0.26;
const EPSILON = 1e-9;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const boundedBonus = (value, min, max) => Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : min;

function normalizeSettings(settings = {}, previous = {}) {
  const duration = Number(settings.duration ?? previous.duration ?? 60);
  const recovery = Number(settings.recovery ?? previous.recovery ?? 1);
  const tempo = settings.tempo ?? previous.tempo ?? 'normal';
  const opponent = getOpponentProfile(settings.opponent ?? previous.opponent).id;
  const maxStamina = boundedBonus(settings.maxStamina ?? previous.maxStamina ?? 100, 100, 124);
  const maxResistance = boundedBonus(settings.maxResistance ?? previous.maxResistance ?? 100, 100, 122);
  const recoveryBonus = boundedBonus(settings.recoveryBonus ?? previous.recoveryBonus ?? 0, 0, .20);
  const powerBonus = boundedBonus(settings.powerBonus ?? previous.powerBonus ?? 0, 0, 10);
  const requestedLesson = settings.lesson ?? previous.lesson ?? 'free';
  const official = getOpponentProfile(opponent).official;
  const lesson = official ? 'resistance' : Object.hasOwn(LESSONS, requestedLesson) ? requestedLesson : 'free';
  return {
    duration: unguided(lesson) && Number.isFinite(duration) ? clamp(duration, 1, 600) : 60,
    tempo: official ? 'normal' : !unguided(lesson) ? 'calm' : Object.hasOwn(TEMPOS, tempo) ? tempo : 'normal',
    recovery: Number.isFinite(recovery) ? clamp(recovery, 0.5, 2) : 1,
    lesson, opponent, maxStamina, maxResistance, recoveryBonus, powerBonus,
    tournament: Boolean(settings.tournament ?? previous.tournament),
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
    target: 'head',
    guardLevel: 'head',
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
    this.profile = getOpponentProfile(this.settings.opponent);
    this._roundFatigue = 0;
    this._events = [];
    this._guardHeld = false;
    this._guardRequested = false;
    this._guardLevel = 'head';
    this._playerAction = null;
    this._combo = null;
    this._playerHurt = 0;
    this._remiHurt = 0;
    this._playerHurtTarget = 'head';
    this._remiHurtTarget = 'head';
    this._recoverAt = 0;
    this._nextSide = 'left';
    this._nextTarget = 'head';
    this._nextGuardLevel = 'head';
    this._remiAction = null;
    this._remiStage = 0;
    this._patternIndex = 0;
    this._knockdown = null;
    this._coach = unguided(this.settings.lesson) ? null : new TrainingCoach(this.settings.lesson);
    this.state = {
      phase: 'ready',
      pausedPhase: null,
      remaining: this.settings.duration,
      elapsed: 0,
      stamina: this.settings.maxStamina,
      player: actionState('idle'),
      remi: actionState('idle', 0, 0, { safeDodge: null, side: null }),
      stats: { landed: 0, received: 0, blocked: 0, dodged: 0, thrown: 0, opponentBlocked: 0, missed: 0, hooks: 0, combos: 0, landedHead: 0, landedBody: 0, receivedHead: 0, receivedBody: 0, blockedHead: 0, blockedBody: 0 },
      combo: { step: 0, ready: false, remaining: 0 },
      settings: { ...this.settings },
      training: null,
      bout: this.settings.lesson === 'resistance' ? {
        round: 1, rounds: KNOCKDOWN_RULES.rounds, maxResistance: this.profile.maxResistance ?? KNOCKDOWN_RULES.maxResistance, playerMaxResistance: this.settings.maxResistance,
        resistance: { player: this.settings.maxResistance, remi: this.profile.maxResistance ?? 100 },
        downs: { player: { round: 0, total: 0 }, remi: { round: 0, total: 0 } },
        count: null, result: null, roundHistory: [],
        ...(this.profile.official ? { score: { player: 0, remi: 0 }, coach: opponentCornerAdvice(this.profile.id) } : {}),
      } : null,
    };
    this._roundStartStats = { ...this.state.stats };
    this._roundStartScore = this.state.bout?.score ? { ...this.state.bout.score } : null;
    this.state.training = this._coach?.snapshot(this.state.stats) ?? null;
    return this.state;
  }

  setSettings(settings = {}) {
    const next = normalizeSettings(settings, this.settings);
    if (next.lesson !== this.settings.lesson || next.opponent !== this.settings.opponent) {
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
    this._setRemiAction('open', this.profile.rhythm?.initialOpening ?? (this._coach ? 1.30 : 1.85));
    this._syncState();
    return true;
  }

  pause() {
    if (!['running', 'knockdown'].includes(this.state.phase)) return false;
    this.state.pausedPhase = this.state.phase;
    this.state.phase = 'paused';
    this.releaseControls();
    return true;
  }

  resume() {
    if (this.state.phase !== 'paused') return false;
    this.state.phase = this.state.pausedPhase ?? 'running';
    this.state.pausedPhase = null;
    this._syncState();
    return true;
  }

  act(action) {
    if (this.state.phase === 'knockdown') return this._recoveryPress(action);
    // The hook belongs to J → K → J, never to a third attack command.
    if (!['jab', 'cross', 'dodgeLeft', 'dodgeRight'].includes(action)
      || this.state.phase !== 'running' || this._playerAction || this._coach?.state.completed) return false;
    this._expireCombo();
    if ((this._guardHeld && this._guardLevel === 'head') || action.startsWith('dodge')) this._clearCombo();
    if (!this._coach && action === 'jab' && this._combo?.step === 2) action = 'hook';
    const timing = TIMINGS.player[action];
    if (this.state.stamina + EPSILON < timing.cost) {
      this._clearCombo();
      this._emit('exhausted', { action });
      this._syncState();
      return false;
    }
    let sequence = null;
    if (!this._coach && (!this._guardHeld || this._guardLevel === 'body')) {
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
    this._playerAction = { action, target: this._guardRequested && this._guardLevel === 'body' ? 'body' : 'head', elapsed: 0, duration: timing.duration, impact: timing.impact ?? null, impacted: false, sequence };
    this._recoverAt = this.state.elapsed + timing.duration + RECOVERY_DELAY;
    if (timing.impact !== undefined) this.state.stats.thrown += 1;
    this._syncState();
    return true;
  }

  setGuard(held, level = 'head') {
    const guardLevel = level === 'body' ? 'body' : 'head';
    // Down also selects body punches, so holding it between punches must keep
    // their combo window intact. A high guard remains a defensive interruption.
    if (held && guardLevel === 'head' && this.state.phase === 'running') this._clearCombo();
    const requested = Boolean(held) && this.state.phase === 'running';
    // Exhaustion drops the effective defense, not the held direction. Down
    // keeps selecting body punches while resting; the exhausted guard needs
    // a deliberate release before it can be raised again.
    const next = requested && this.state.stamina > EPSILON
      && (!this._guardRequested || this._guardHeld);
    const wasHeld = this._guardHeld;
    if (this._guardHeld && !next) this._recoverAt = Math.max(this._recoverAt, this.state.elapsed + RECOVERY_DELAY);
    this._guardHeld = next;
    this._guardRequested = requested;
    this._guardLevel = requested ? guardLevel : 'head';
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
    if (!['running', 'knockdown'].includes(this.state.phase) || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    let remaining = dtSeconds;
    // Bound integration and land exactly on action/impact boundaries. This keeps
    // large deterministic test steps and real rendering frames equivalent.
    while (remaining > EPSILON && ['running', 'knockdown'].includes(this.state.phase)) {
      let dt = Math.min(remaining, 1 / 120);
      if (this.state.phase === 'knockdown') {
        dt = Math.min(dt, this._knockdownBoundary());
        this._stepKnockdown(dt);
        remaining -= dt;
        continue;
      }
      dt = Math.min(dt, this.state.remaining);
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
      if (this._guardLevel === 'head') this._clearCombo();
      this.state.stamina = Math.max(0, this.state.stamina - GUARD_DRAIN_PER_SECOND * dt);
      this._recoverAt = this.state.elapsed + RECOVERY_DELAY;
      if (this.state.stamina <= EPSILON) {
        this._guardHeld = false;
        this._emit('exhausted', { action: 'guard' });
      }
    } else if (!this._playerAction && this.state.elapsed >= this._recoverAt) {
      this.state.stamina = Math.min(this.settings.maxStamina, this.state.stamina + RECOVERY_PER_SECOND * (this.settings.recovery + this.settings.recoveryBonus) * dt);
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

    if (this.state.bout && ACTORS.some(actor => this.state.bout.resistance[actor] <= EPSILON)) {
      this._beginKnockdown();
      return;
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
    const target = this._playerAction.target;
    const sequence = this._playerAction.sequence;
    if (this._remiAction?.action === 'dodge' && this._remiAction.elapsed >= .08 && this._remiAction.elapsed <= .44) {
      this.state.stats.missed += 1;
      if (sequence) sequence.valid = false;
      this._emit('player-missed', { attack, target, impact: this._playerAction.impact });
    } else if (this._remiAction?.action === 'guard' && this._remiAction.guardLevel === target) {
      this.state.stats.opponentBlocked += 1;
      this._emit('player-blocked', { attack, target, impact: this._playerAction.impact });
    } else {
      this._damage('remi', attack);
      if (this.state.bout?.score) this.state.bout.score.player += 1;
      this.state.stats.landed += 1;
      this.state.stats[target === 'body' ? 'landedBody' : 'landedHead'] += 1;
      const combo = attack === 'hook' && sequence?.valid === true && sequence.hits === 2;
      if (attack === 'hook') {
        this.state.stats.hooks += 1;
        if (combo) this.state.stats.combos += 1;
      } else if (sequence?.valid) {
        sequence.hits += 1;
      }
      this._remiHurt = HURT_DURATION;
      this._remiHurtTarget = target;
      this._emit('player-hit', { attack, target, impact: this._playerAction.impact, ...(attack === 'hook' ? { combo } : {}) });
    }
  }

  _resolveRemiPunch() {
    const attack = this._remiAction.action;
    const target = this._remiAction.target;
    const safeDodge = this._remiAction.safeDodge;
    const player = this._playerAction;
    const dodgeTiming = player && TIMINGS.player[player.action];
    const dodged = player?.action === safeDodge
      && player.elapsed + EPSILON >= dodgeTiming.activeFrom
      && player.elapsed <= dodgeTiming.activeUntil + EPSILON;
    if (dodged) {
      this.state.stats.dodged += 1;
      this._emit('remi-dodged', { attack, target, direction: safeDodge, impact: this._remiAction.impact });
      return;
    }
    if (this._guardHeld && this._guardLevel === target && !player && this.state.stamina + EPSILON >= BLOCK_COST) {
      this.state.stamina = Math.max(0, this.state.stamina - BLOCK_COST);
      this._recoverAt = this.state.elapsed + RECOVERY_DELAY;
      this.state.stats.blocked += 1;
      this.state.stats[target === 'body' ? 'blockedBody' : 'blockedHead'] += 1;
      this._emit('remi-blocked', { attack, target, impact: this._remiAction.impact });
      return;
    }
    this._damage('player', attack);
    if (this.state.bout?.score) this.state.bout.score.remi += 1;
    this.state.stats.received += 1;
    this.state.stats[target === 'body' ? 'receivedBody' : 'receivedHead'] += 1;
    this._clearCombo();
    this.state.stamina = Math.max(0, this.state.stamina - 4);
    this._playerHurt = HURT_DURATION;
    this._playerHurtTarget = target;
    this._recoverAt = Math.max(this._recoverAt, this.state.elapsed + RECOVERY_DELAY);
    if (!player) this._playerAction = { action: 'hit', target, elapsed: 0, duration: TIMINGS.player.hit.duration, impact: null, impacted: false };
    this._emit('remi-hit', { attack, target, impact: this._remiAction.impact, guardBroken: this._guardHeld && this._guardLevel === target && !player, wrongGuard: this._guardHeld && !player && this._guardLevel !== target });
  }

  _setRemiAction(action, duration, extra = {}) {
    this._remiAction = { action, duration, elapsed: 0, impact: null, impacted: false, side: null, safeDodge: null, target: 'head', guardLevel: 'head', ...extra };
    this._remiStage += 1;
    this._coach?.onStage(this._trainingContext());
  }

  _nextRemiAction() {
    if (this.profile.id === 'beton') { this._nextBetonAction(); return; }
    if (this.profile.pattern) { this._nextAuthoredAction(); return; }
    const current = this._remiAction;
    const tempo = TEMPOS[this.settings.tempo];
    if (this._coach?.state.completed) {
      this._setRemiAction('open', 1);
    } else if (current.action === 'open') {
      const sample = clamp(Number(this.random()) || 0, 0, 1);
      const guardLevel = this._coach ? 'head' : this._nextGuardLevel;
      this._nextGuardLevel = guardLevel === 'head' ? 'body' : 'head';
      this._setRemiAction('guard', tempo.guard + (sample - 0.5) * 0.26, { guardLevel });
    } else if (current.action === 'guard') {
      if (this.settings.lesson === 'jab') {
        this._setRemiAction('open', tempo.opening);
        return;
      }
      const target = this._coach ? 'head' : this._nextTarget;
      this._nextTarget = target === 'head' ? 'body' : 'head';
      const side = this._nextSide;
      this._nextSide = side === 'left' ? 'right' : 'left';
      const safeDodge = side === 'left' ? 'dodgeRight' : 'dodgeLeft';
      this._setRemiAction(side === 'left' ? 'tellLeft' : 'tellRight', tempo.tell, { side, safeDodge, target });
      this._emit('tell', { side, safeDodge, target, duration: tempo.tell });
    } else if (current.action === 'tellLeft' || current.action === 'tellRight') {
      const action = current.side === 'left' ? 'jab' : 'cross';
      this._setRemiAction(action, TIMINGS.remi[action].duration, {
        impact: TIMINGS.remi[action].impact,
        side: current.side,
        target: current.target,
        safeDodge: current.safeDodge,
      });
    } else {
      this._setRemiAction('open', this._coach ? tempo.opening : tempo.openingFree);
    }
  }

  _nextAuthoredAction() {
    const current = this._remiAction;
    if (current.action === 'tellLeft' || current.action === 'tellRight') {
      const attack = current.side === 'left' ? 'jab' : 'cross';
      this._setRemiAction(attack, TIMINGS.remi[attack].duration, {
        impact: TIMINGS.remi[attack].impact, side: current.side, target: current.target,
        safeDodge: current.safeDodge, opening: current.opening,
      });
      return;
    }
    if (current.action === 'jab' || current.action === 'cross') {
      this._setRemiAction('open', current.opening);
      return;
    }
    // The next move depends solely on this authored cycle. No input, current
    // guard, hit or held button can cause a reactive block or a surprise punch.
    const stage = this.profile.pattern[this._patternIndex % this.profile.pattern.length];
    this._patternIndex += 1;
    if (!stage.attack) {
      this._setRemiAction(stage.action, stage.duration, { guardLevel: stage.guardLevel ?? 'head', side: stage.side ?? null });
      return;
    }
    const side = stage.attack === 'jab' ? 'left' : 'right';
    const safeDodge = side === 'left' ? 'dodgeRight' : 'dodgeLeft';
    this._setRemiAction(side === 'left' ? 'tellLeft' : 'tellRight', stage.tell, {
      side, safeDodge, target: stage.target, opening: stage.opening,
    });
    this._emit('tell', { side, safeDodge, target: stage.target, duration: stage.tell });
  }

  _nextBetonAction() {
    const current = this._remiAction;
    const rhythm = this.profile.rhythm;
    if (current.action === 'open') {
      // The high guard is scheduled before the next tell. Body punches may
      // pass it; no player input participates in this decision.
      this._setRemiAction('guard', rhythm.guard, { guardLevel: 'head' });
    } else if (current.action === 'guard') {
      const side = this._nextSide;
      this._nextSide = side === 'left' ? 'right' : 'left';
      const target = side === 'left' ? 'head' : 'body';
      const safeDodge = side === 'left' ? 'dodgeRight' : 'dodgeLeft';
      const duration = side === 'left' ? rhythm.jabTell : rhythm.crossTell;
      this._setRemiAction(side === 'left' ? 'tellLeft' : 'tellRight', duration, { side, target, safeDodge });
      this._emit('tell', { side, target, safeDodge, duration });
    } else if (current.action === 'tellLeft' || current.action === 'tellRight') {
      const action = current.side === 'left' ? 'jab' : 'cross';
      this._setRemiAction(action, TIMINGS.remi[action].duration, {
        impact: TIMINGS.remi[action].impact, side: current.side,
        target: current.target, safeDodge: current.safeDodge,
      });
    } else {
      this._setRemiAction('open', current.action === 'jab' ? rhythm.afterJab : rhythm.afterCross);
    }
  }

  _syncState() {
    this._expireCombo();
    const player = this._playerAction;
    const remi = this._remiAction;
    this.state.combo = {
      step: this._combo?.step ?? 0,
      ready: this.state.phase === 'running' && !player && (!this._guardHeld || this._guardLevel === 'body')
        && this._combo?.step === 2 && this.state.stamina + EPSILON >= TIMINGS.player.hook.cost,
      remaining: this._combo && !player ? Math.max(0, this._combo.expiresAt - this.state.elapsed) : 0,
    };
    this.state.player = player
      ? actionState(player.action, player.duration, player.elapsed, {
        impact: player.impact,
        target: player.target,
        guardLevel: this._guardLevel,
        hurtTarget: this._playerHurtTarget,
        hurt: this._playerHurt / HURT_DURATION,
        reactionProgress: 1 - this._playerHurt / HURT_DURATION,
      })
      : actionState(this._guardHeld ? 'guard' : 'idle', 0, 0, {
        target: this._guardRequested ? this._guardLevel : 'head',
        guardLevel: this._guardLevel,
        hurtTarget: this._playerHurtTarget,
        hurt: this._playerHurt / HURT_DURATION,
        reactionProgress: 1 - this._playerHurt / HURT_DURATION,
      });
    // Show the hit pose in an opening, but preserve all tells and committed punches.
    const remiAction = remi?.action === 'open' && this._remiHurt > 0 ? 'hit' : (remi?.action ?? 'idle');
    this.state.remi = remi
      ? actionState(remiAction, remi.duration, remi.elapsed, {
        impact: remi.impact,
        target: remiAction === 'hit' ? this._remiHurtTarget : remi.target,
        guardLevel: remi.guardLevel,
        hurtTarget: this._remiHurtTarget,
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
    if (this.state.bout?.count) this._syncKnockdown();
  }

  nextRound() {
    const bout = this.state.bout;
    if (this.state.phase !== 'between' || !bout || bout.round >= bout.rounds) return false;
    bout.round += 1;
    for (const actor of ACTORS) {
      bout.downs[actor].round = 0;
      const maximum = actor === 'player' ? bout.playerMaxResistance : bout.maxResistance;
      bout.resistance[actor] = Math.min(maximum, bout.resistance[actor] + 20);
    }
    this.state.elapsed = 0;
    this.state.remaining = this.settings.duration;
    this.state.stamina = this.settings.maxStamina;
    this._roundStartStats = { ...this.state.stats };
    this._roundStartScore = bout.score ? { ...bout.score } : null;
    this._roundFatigue = 0;
    this._clearCombatActions();
    this._nextSide = 'left'; this._nextTarget = 'head'; this._nextGuardLevel = 'head';
    this.state.phase = 'running';
    this.state.pausedPhase = null;
    this._setRemiAction('open', this.profile.rhythm?.initialOpening ?? 1.85);
    this._syncState();
    this._emit('round-start', { round: bout.round });
    return true;
  }

  _damage(actor, attack) {
    if (!this.state.bout) return;
    const resistance = this.state.bout.resistance;
    const power = actor === 'remi' ? this.settings.powerBonus : 0;
    resistance[actor] = Math.max(0, resistance[actor] - KNOCKDOWN_RULES.damage[attack] - power);
  }

  _clearCombatActions() {
    this._clearCombo();
    this._guardHeld = false; this._guardRequested = false; this._guardLevel = 'head';
    this._playerAction = null; this._remiAction = null;
    this._playerHurt = 0; this._remiHurt = 0;
    this._recoverAt = this.state.elapsed;
  }

  _beginKnockdown() {
    if (this.state.remaining <= EPSILON) { this.state.remaining = 0; this.state.elapsed = this.settings.duration; }
    const bout = this.state.bout;
    // Snapshot only after resolving both contacts at this exact boundary. The
    // contact stays on screen before either fighter begins the falling pose.
    this._syncState();
    const poses = { player: { ...this.state.player }, remi: { ...this.state.remi } };
    const downed = Object.fromEntries(ACTORS.map(actor => [actor, bout.resistance[actor] <= EPSILON]));
    const eliminated = { player: null, remi: null };
    for (const actor of ACTORS) if (downed[actor]) {
      bout.downs[actor].round += 1;
      bout.downs[actor].total += 1;
      if (bout.score) bout.score[actor === 'player' ? 'remi' : 'player'] += 3;
      if (bout.downs[actor].total >= 4) eliminated[actor] = 'total-limit';
      else if (bout.downs[actor].round >= 3) eliminated[actor] = 'round-limit';
    }
    this._knockdown = { time: 0, poses, recoveredAt: {}, standing: {}, lastPress: -Infinity };
    this.state.phase = 'knockdown';
    bout.count = {
      stage: 'fall', elapsed: 0, number: 0, downed, eliminated,
      recovered: { player: false, remi: false }, hold: KNOCKDOWN_RULES.contactHold,
      progress: 0, needed: KNOCKDOWN_RULES.needed, accepted: 0,
      next: null, ready: false, readyIn: 0,
    };
    this._clearCombo();
    this._guardHeld = false; this._guardRequested = false; this._guardLevel = 'head';
    this._emit('knockdown', { round: bout.round, downed: { ...downed }, eliminated: { ...eliminated }, downs: structuredClone(bout.downs) });
    this._syncState();
  }

  _knockdownBoundary() {
    const count = this.state.bout.count;
    if (count.hold > EPSILON) return count.hold;
    if (count.stage === 'fall') return Math.max(EPSILON, KNOCKDOWN_RULES.fall - count.elapsed);
    const boundaries = [];
    if (count.stage === 'count') {
      boundaries.push(KNOCKDOWN_RULES.count - count.elapsed, Math.floor(count.elapsed + EPSILON) + 1 - count.elapsed);
      if (count.downed.remi && !count.recovered.remi && !count.eliminated.remi) boundaries.push(this._remiRecoveryCount() - count.elapsed);
    }
    for (const actor of ACTORS) if (count.recovered[actor] && !this._knockdown.standing[actor]) {
      boundaries.push(this._knockdown.recoveredAt[actor] + KNOCKDOWN_RULES.rise - this._knockdown.time);
    }
    return Math.min(...boundaries.filter(value => value > EPSILON), 1 / 120);
  }

  _stepKnockdown(dt) {
    const count = this.state.bout.count;
    this._knockdown.time += dt;
    if (count.hold > EPSILON) {
      count.hold = Math.max(0, count.hold - dt);
      return;
    }
    count.elapsed += dt;
    if (count.stage === 'fall') {
      if (count.elapsed + EPSILON < KNOCKDOWN_RULES.fall) return;
      count.elapsed = 0;
      const eligible = ACTORS.filter(actor => count.downed[actor] && !count.eliminated[actor]);
      if (!eligible.length) { this._finishEliminations(); return; }
      count.stage = 'count'; count.number = 0;
      return;
    }
    if (count.stage === 'count') {
      const number = Math.min(10, Math.floor(count.elapsed + EPSILON));
      if (number !== count.number) {
        count.number = number;
        this._emit('count', { number, downed: { ...count.downed }, countTime: count.elapsed });
      }
      if (count.downed.remi && !count.eliminated.remi && !count.recovered.remi
        && count.elapsed + EPSILON >= this._remiRecoveryCount()) this._markRecovered('remi');
      if (count.elapsed + EPSILON >= KNOCKDOWN_RULES.count) {
        for (const actor of ACTORS) if (count.downed[actor] && !count.recovered[actor] && !count.eliminated[actor]) count.eliminated[actor] = 'ko';
      }
      // Kramer reaches his second count across the whole bout, waves the fight
      // off, then rises. This reveal happens here, never in the introduction.
      if (this.profile.quitsAfterDowns && count.downed.remi
        && this.state.bout.downs.remi.total >= this.profile.quitsAfterDowns
        && count.elapsed >= 2 && !count.downed.player) {
        count.stage = 'surrender'; count.elapsed = 0;
        this._emit('opponent-abandon', { opponent: this.profile.id });
        return;
      }
    }
    if (count.stage === 'surrender') {
      if (count.elapsed >= 1.9) this._finishBout({ reason: 'abandon', winner: 'player', loser: 'remi' });
      return;
    }
    for (const actor of ACTORS) if (count.recovered[actor] && !this._knockdown.standing[actor]
      && this._knockdown.time - this._knockdown.recoveredAt[actor] + EPSILON >= KNOCKDOWN_RULES.rise) this._standUp(actor);
    this._advanceRecovery();
  }

  _remiRecoveryCount() {
    return KNOCKDOWN_RULES.remiCounts[Math.min(2, this.state.bout.downs.remi.total - 1)];
  }

  _recoveryPress(action) {
    const count = this.state.bout?.count;
    if (!count || count.stage !== 'count' || !count.downed.player || count.eliminated.player
      || count.recovered.player || action !== (count.accepted % 2 === 0 ? 'jab' : 'cross')
      || this._knockdown.time - this._knockdown.lastPress + EPSILON < KNOCKDOWN_RULES.pressSpacing) return false;
    count.accepted += 1;
    this._knockdown.lastPress = this._knockdown.time;
    this._emit('recovery-press', { action, accepted: count.accepted, needed: count.needed });
    if (count.accepted === count.needed) this._markRecovered('player');
    this._advanceRecovery();
    this._syncState();
    return true;
  }

  _markRecovered(actor) {
    this.state.bout.count.recovered[actor] = true;
    this._knockdown.recoveredAt[actor] = this._knockdown.time;
  }

  _standUp(actor) {
    const bout = this.state.bout;
    this._knockdown.standing[actor] = true;
    bout.resistance[actor] = KNOCKDOWN_RULES.restoredResistance[Math.min(2, bout.downs[actor].total - 1)];
    if (actor === 'player') this.state.stamina = 60;
    this._emit('stood-up', { actor, resistance: bout.resistance[actor], round: bout.round, totalDowns: bout.downs[actor].total });
  }

  _advanceRecovery() {
    const count = this.state.bout.count;
    if (!count || count.stage === 'fall') return;
    const eligible = ACTORS.filter(actor => count.downed[actor] && !count.eliminated[actor]);
    if (!eligible.length) { this._finishEliminations(); return; }
    if (!eligible.every(actor => count.recovered[actor])) return;
    if (count.stage !== 'rise') { count.stage = 'rise'; count.elapsed = 0; }
    if (!eligible.every(actor => this._knockdown.standing[actor])) return;
    if (ACTORS.some(actor => count.eliminated[actor])) { this._finishEliminations(); return; }
    if (this.profile.quitsAfterDowns && count.downed.remi
      && this.state.bout.downs.remi.total >= this.profile.quitsAfterDowns) {
      count.stage = 'surrender'; count.elapsed = .8;
      this._emit('opponent-abandon', { opponent: this.profile.id });
      return;
    }
    this.state.bout.count = null;
    this._knockdown = null;
    this._clearCombatActions();
    if (this.state.remaining <= EPSILON) { this._finishResistanceRound(); return; }
    this.state.phase = 'running';
    this._setRemiAction('open', this.profile.rhythm?.afterRecovery ?? 1.85);
    this._emit('sparring-resumed', { round: this.state.bout.round });
  }

  _finishEliminations() {
    const eliminated = this.state.bout.count.eliminated;
    const losers = ACTORS.filter(actor => eliminated[actor]);
    const loser = losers.length === 2 ? 'both' : losers[0];
    this._finishBout({
      reason: loser === 'both' ? 'double-ko' : eliminated[loser],
      winner: loser === 'both' ? 'draw' : loser === 'player' ? 'remi' : 'player', loser,
    });
  }

  _syncKnockdown() {
    const count = this.state.bout.count;
    const active = this.state.phase === 'knockdown';
    count.readyIn = Math.max(0, KNOCKDOWN_RULES.pressSpacing - (this._knockdown.time - this._knockdown.lastPress));
    count.next = count.stage === 'count' && count.downed.player && !count.eliminated.player && !count.recovered.player
      ? count.accepted % 2 === 0 ? 'jab' : 'cross' : null;
    count.ready = active && count.next !== null && count.readyIn <= EPSILON;
    count.progress = count.downed.player ? count.accepted / count.needed
      : count.recovered.remi ? 1 : count.stage === 'fall' ? 0 : clamp(count.elapsed / this._remiRecoveryCount(), 0, 1);
    for (const actor of ACTORS) {
      if (count.hold > EPSILON) { this.state[actor] = { ...this._knockdown.poses[actor] }; continue; }
      let action = 'idle', duration = 0, elapsed = 0;
      if (count.downed[actor]) {
        if (count.stage === 'fall') { action = 'fall'; duration = KNOCKDOWN_RULES.fall; elapsed = count.elapsed; }
        else if (count.recovered[actor]) { action = this._knockdown.standing[actor] ? 'idle' : 'rise'; duration = KNOCKDOWN_RULES.rise; elapsed = this._knockdown.time - this._knockdown.recoveredAt[actor]; }
        else action = 'down';
        if (count.stage === 'surrender' && actor === 'remi') {
          action = count.elapsed < .8 ? 'rise' : 'surrender';
          duration = .8; elapsed = count.elapsed;
        }
      }
      this.state[actor] = actionState(action, duration, elapsed, { target: this._knockdown.poses[actor].hurtTarget ?? 'head' });
    }
  }

  _recordResistanceRound() {
    const bout = this.state.bout;
    if (bout.roundHistory.some(round => round.round === bout.round)) return;
    bout.roundHistory.push({
      round: bout.round, duration: this.state.elapsed,
      stats: Object.fromEntries(Object.entries(this.state.stats).map(([key, value]) => [key, value - this._roundStartStats[key]])),
      downs: { player: bout.downs.player.round, remi: bout.downs.remi.round },
      resistance: { ...bout.resistance },
      ...(bout.score ? { fatigue: this._roundFatigue, score: {
        player: bout.score.player - this._roundStartScore.player,
        remi: bout.score.remi - this._roundStartScore.remi,
      } } : {}),
    });
    if (bout.score) bout.coach = opponentCornerAdvice(this.profile.id, bout.roundHistory.at(-1));
  }

  _finishResistanceRound() {
    this._recordResistanceRound();
    // Freeze any contact that occurred on the bell behind the interval/report.
    // nextRound, rather than the bell itself, discards the committed actions.
    this._clearCombo();
    this._guardHeld = false; this._guardRequested = false; this._guardLevel = 'head';
    if (this.state.bout.round >= this.state.bout.rounds) {
      const score = this.state.bout.score;
      const winner = score ? score.player === score.remi ? 'draw' : score.player > score.remi ? 'player' : 'remi' : null;
      this._finishBout({ reason: score ? 'points' : 'time', winner, loser: !score || winner === 'draw' ? null : winner === 'player' ? 'remi' : 'player' });
      return;
    }
    this.state.phase = 'between';
    this.state.pausedPhase = null;
    this._emit('round-break', { round: this.state.bout.round, history: structuredClone(this.state.bout.roundHistory.at(-1)) });
  }

  _finishBout(result) {
    if (this.state.phase === 'finished') return;
    this._recordResistanceRound();
    this.state.bout.result = result;
    this.state.phase = 'finished';
    this.state.pausedPhase = null;
    this._clearCombo();
    this._guardHeld = false; this._guardRequested = false; this._guardLevel = 'head';
    this._emit('bout-finish', { result: { ...result }, stats: { ...this.state.stats }, round: this.state.bout.round });
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
    if (this.state.bout) { this._finishResistanceRound(); return; }
    this.state.phase = 'finished';
    this._clearCombo();
    this._guardHeld = false;
    this._guardRequested = false;
    // Freeze the final combat frame behind the report. Clearing an action here
    // would hide a glove whose contact was just scored in this same frame.
    // Finished rounds accept no input or time; reset clears both actions.
    this._emit('round-end', { stats: { ...this.state.stats } });
  }

  _emit(type, extra = {}) {
    if (type === 'exhausted' && this.profile.official) this._roundFatigue += 1;
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
