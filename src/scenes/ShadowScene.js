import Phaser from 'phaser';
import { ShadowSession } from '../game/ShadowSession.js';
import { ShadowFighterView } from './ShadowFighterView.js';
import { ShadowUI } from '../ui/ShadowUI.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';
import { careerProfile } from '../game/CareerProfile.js';
import { DailyActivityGate } from '../game/DailyActivityGate.js';
import { DailyActivityNotice } from '../ui/DailyActivityNotice.js';
import { rememberActivityReturn } from './activityLifecycle.js';

export class ShadowScene extends Phaser.Scene {
  constructor() { super('ShadowScene'); }
  preload() { ShadowFighterView.preload(this); }

  create() {
    setSceneShell('shadow');
    rememberActivityReturn(this);
    this.session = new ShadowSession();
    this.dailyGate = new DailyActivityGate({ profile: careerProfile, getState: () => this.session.state, activity: 'shadow' });
    this.progressRecorded = false;
    this.fighter = new ShadowFighterView(this);
    this.audio = new SparringAudio();
    const start = () => this.dailyGate.start(() => {
      this.audio.setActive(false);
      this.progressRecorded = false; this.session.reset(); this.session.start(); this.audio.setActive(true);
    });
    this.ui = new ShadowUI({
      getState: () => this.session.state,
      onAction: action => this.session.act(action),
      onGuard: (held, level) => this.session.setGuard(held, level),
      onStart: start, onReset: start,
      onPause: () => { this.session.pause(); this.audio.setActive(false); },
      onResume: () => { this.session.resume(); this.audio.setActive(true); },
      onFinish: () => { this.session.finish(); this.recordProgress(); this.audio.setActive(false); },
      onReturnGym: () => {
        this.session.finish(); this.recordProgress(); this.session.releaseControls();
        this.audio.setActive(false); this.scene.start('GymScene');
      },
      onSpeed: speed => this.session.setSpeed(speed),
      onBlur: () => { this.session.pause(); this.session.releaseControls(); this.audio.setActive(false); },
      onAudioGesture: () => this.audio.unlock(),
      onMute: () => {
        this.audio.setMuted(!this.audio.muted); this.audio.unlock(); this.ui.setAudioState(this.audio.getState());
      },
    });
    this.dailyNotice = new DailyActivityNotice({ root: this.ui.root, gate: this.dailyGate, panel: '.shadow-panel-actions', primary: '.shadow-start-button', restarts: ['.shadow-reset-button'] });
    this.dailyNotice.update(this.session.state);
    this.ui.setAudioState(this.audio.getState());
    this.fighter.render(this.session.state.player, 0);
    this.ui.update(this.session.state);
    this.resizeObserver = new ResizeObserver(() => {
      // Phaser refresh computes display size before its final bounds read.
      // Read the resized parent first, including a change of primary pointer.
      this.scale.getParentBounds(); this.scale.refresh();
    });
    this.resizeObserver.observe(document.getElementById('game'));
    let disposed = false;
    const cleanup = () => {
      if (disposed) return; disposed = true;
      this.events.off('shutdown', cleanup); this.events.off('destroy', cleanup);
      this.ui.destroy(); this.audio.dispose(); this.resizeObserver.disconnect();
      if (import.meta.env.DEV && window.__shadow?.scene === this) delete window.__shadow;
    };
    this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
    if (import.meta.env.DEV) window.__shadow = { session: this.session, scene: this, ui: this.ui, audio: this.audio, motions: [] };
  }

  recordProgress() {
    if (this.progressRecorded || this.session.state.seconds < 1) return;
    this.progressRecorded = true; careerProfile.reward('shadow', { seconds: this.session.state.seconds });
  }

  update(_time, delta) {
    if (!this.session) return;
    const realSeconds = (this.game.loop.rawDelta ?? delta) / 1000;
    this.session.update(realSeconds, Math.min(realSeconds, .05));
    const state = this.session.state;
    this.fighter.render(state.player, state.elapsed);
    for (const event of this.session.drainEvents()) {
      if (event.type !== 'motion') continue;
      this.audio.play('shadow-motion');
      if (import.meta.env.DEV) {
        const motions = window.__shadow.motions;
        motions.push({ ...event, pose: this.fighter.pose, phase: this.fighter.phase,
          texture: this.fighter.sprite.texture.key, reflectedTexture: this.fighter.reflection.texture.key,
          bounds: this.fighter.bounds(), reflectedBounds: this.fighter.bounds(true) });
        if (motions.length > 100) motions.shift();
      }
    }
    this.ui.update(state);
    this.dailyNotice.update(state);
  }
}
