import Phaser from 'phaser';
import { BagSession } from '../game/BagSession.js';
import { BagFighterView } from './BagFighterView.js';
import { BagUI } from '../ui/BagUI.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';
import { careerProfile } from '../game/CareerProfile.js';
import { DailyActivityGate } from '../game/DailyActivityGate.js';
import { DailyActivityNotice } from '../ui/DailyActivityNotice.js';
import { rememberActivityReturn } from './activityLifecycle.js';

export class BagScene extends Phaser.Scene {
  constructor() { super('BagScene'); }
  preload() { BagFighterView.preload(this); }
  create() {
    setSceneShell('bag');
    rememberActivityReturn(this);
    this.session = new BagSession();
    this.dailyGate = new DailyActivityGate({ profile: careerProfile, getState: () => this.session.state, activity: 'bag' });
    this.progressRecorded = false;
    this.fighter = new BagFighterView(this);
    this.audio = new SparringAudio();
    this.ui = new BagUI({
      getState: () => this.session.state,
      onAction: input => this.session.act(input),
      onGuard: (held, level) => this.session.setGuard(held, level),
      onStart: () => this.dailyGate.start(() => {
        this.audio.setActive(false); this.progressRecorded = false; this.session.reset(); this.fighter.reset(); this.session.start();
        this.audio.setActive(true); this.audio.play('round-start');
      }),
      onPause: () => { this.session.pause(); this.audio.setActive(false); },
      onResume: () => { this.session.resume(); this.audio.setActive(true); },
      onReturnGym: () => {
        this.session.pause(); this.session.releaseControls();
        this.audio.setActive(false); this.scene.start('GymScene');
      },
      onBlur: () => { this.session.pause(); this.session.releaseControls(); this.audio.setActive(false); },
      onAudioGesture: () => this.audio.unlock(),
      onMute: () => {
        this.audio.setMuted(!this.audio.muted); this.audio.unlock(); this.ui.setAudioState(this.audio.getState());
      },
    });
    this.dailyNotice = new DailyActivityNotice({ root: this.ui.root, gate: this.dailyGate, panel: '.bag-panel-actions', primary: '.bag-start-button', restarts: ['.bag-restart-button'] });
    this.dailyNotice.update(this.session.state);
    this.ui.setAudioState(this.audio.getState());
    this.fighter.render(this.session.state.player, 0);
    this.resizeObserver = new ResizeObserver(() => {
      // Phaser refresh computes display size before its final bounds read.
      // Read the resized parent first, including a change of primary pointer.
      this.scale.getParentBounds(); this.scale.refresh();
    });
    this.resizeObserver.observe(document.getElementById('game'));
    let disposed = false;
    const cleanup = () => {
      if (disposed) return; disposed = true;
      this.events.off('shutdown', cleanup);
      this.events.off('destroy', cleanup);
      this.ui.destroy(); this.audio.dispose(); this.resizeObserver.disconnect();
      if (import.meta.env.DEV && window.__bag?.scene === this) delete window.__bag;
    };
    this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
    if (import.meta.env.DEV) window.__bag = { session: this.session, scene: this, ui: this.ui, audio: this.audio, impacts: [] };
  }
  update(_time, delta) {
    if (!this.session) return;
    // Preserve the clock at normal and low frame rates. Bound long stalls so
    // the contact pose remains visible, even on a struggling renderer.
    this.session.update(Math.min((this.game.loop.rawDelta ?? delta) / 1000, .1));
    const state = this.session.state;
    this.fighter.render(state.player, state.elapsed);
    for (const event of this.session.drainEvents()) {
      if (event.type === 'bag-hit') {
        this.fighter.impact(event.attack, event.result, event.time);
        this.fighter.drawImpact(state.elapsed);
        this.audio.play('player-hit');
        if (import.meta.env.DEV) {
          const impacts = window.__bag.impacts;
          impacts.push({ ...event, player: { ...state.player }, contactPoint: { ...this.fighter.contactPoint }, targetPoint: this.fighter.targetPoint(event.target), pose: this.fighter.pose });
          if (impacts.length > 100) impacts.shift();
        }
      } else if (event.type === 'sequence-end' && event.success) this.audio.play('lesson-progress');
      else if (event.type === 'round-end') {
        this.audio.play('round-end');
        if (!this.progressRecorded) { this.progressRecorded = true; this.ui.setReward(careerProfile.reward('bag', { ...event.summary, accuracy: event.summary.precision })); }
      }
    }
    this.ui.update(state);
    this.dailyNotice.update(state);
  }
}
