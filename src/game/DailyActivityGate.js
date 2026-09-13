import { getOpponentProfile } from './OpponentProfiles.js';
/** Charge a whole session at its explicit start, never at entry or on resume.
 * Keeping this boundary outside the combat models leaves their round clocks
 * and energy during a fight independent from the player's day. */
export const sparringActivity = ({ opponent = 'remi', lesson = 'free' } = {}) =>
  getOpponentProfile(opponent).official ? 'fight' : ['free', 'resistance'].includes(lesson) ? 'sparring' : 'lesson';

export class DailyActivityGate {
  constructor({ profile, getState, activity }) {
    this.profile = profile;
    this.getState = getState;
    this.activity = typeof activity === 'function' ? activity : () => activity;
    this.lastResult = null;
  }

  start(begin, activity = this.activity()) {
    // Two clicks in one frame or a held action cannot debit two sessions.
    if (!['ready', 'paused', 'finished'].includes(this.getState().phase)) return { ok: false, reason: 'active' };
    const result = this.profile.spendEnergy(activity);
    this.lastResult = result;
    if (result.ok) begin();
    return result;
  }

  status(activity = this.activity()) {
    return { ...this.profile.dailyStatus(), ...this.profile.canStartActivity(activity) };
  }
}
