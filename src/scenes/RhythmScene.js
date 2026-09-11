import Phaser from 'phaser';
import { RhythmSession } from '../game/RhythmSession.js';
import { careerProfile } from '../game/CareerProfile.js';
import { RhythmTrainingView } from './RhythmTrainingView.js';
import { RhythmUI } from '../ui/RhythmUI.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';

export class RhythmScene extends Phaser.Scene {
  constructor() { super('RhythmScene'); }
  init(data = {}) {
    const requested = data.activity ?? new URLSearchParams(location.search).get('scene');
    this.activity = requested === 'rope' ? 'rope' : 'speedball';
  }
  preload() { RhythmTrainingView.preload(this); }
  create() {
    setSceneShell(this.activity); this.session = new RhythmSession({ activity: this.activity }); this.rewarded = false;
    this.view = new RhythmTrainingView(this, this.activity); this.audio = new SparringAudio();
    const start = () => {
      this.audio.setActive(false); this.rewarded = false; this.view.reset(); this.session.reset(); this.session.start();
      if (import.meta.env.DEV && window.__rhythm) window.__rhythm.impacts.length = 0;
      this.audio.setActive(true); this.audio.play('round-start');
    };
    this.ui = new RhythmUI(this.activity, { getState: () => this.session.state, onAction: input => this.session.act(input), onGuard: () => {}, onStart: start,
      onPause: () => { this.session.pause(); this.audio.setActive(false); }, onResume: () => { this.session.resume(); this.audio.setActive(true); },
      onReturnGym: () => { this.session.pause(); this.audio.setActive(false); this.scene.start('GymScene'); },
      onAudioGesture: () => this.audio.unlock(),
      onMute: () => { this.audio.setMuted(!this.audio.getState().muted); this.ui.setAudioState(this.audio.getState()); if (!this.audio.getState().muted) this.audio.unlock(); } });
    this.ui.setAudioState(this.audio.getState());
    this.ui.update(this.session.state);
    this.resizeObserver = new ResizeObserver(() => { this.scale.getParentBounds(); this.scale.refresh(); }); this.resizeObserver.observe(document.getElementById('game'));
    let disposed = false;
    const cleanup = () => {
      if (disposed) return; disposed = true; this.events.off('shutdown', cleanup); this.events.off('destroy', cleanup);
      this.ui.destroy(); this.audio.dispose(); this.resizeObserver.disconnect();
      if (import.meta.env.DEV && window.__rhythm?.scene === this) delete window.__rhythm;
    };
    this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
    if (import.meta.env.DEV) window.__rhythm = { scene: this, session: this.session, ui: this.ui, impacts: [] };
  }
  update(_time, delta) {
    if (!this.session) return; this.session.update(Math.min((this.game.loop.rawDelta ?? delta) / 1000, .1)); const state = this.session.state;
    const events = this.session.drainEvents();
    for (const event of events) { this.view.onEvent(event); if (event.type === 'hit') this.audio.play(this.activity === 'rope' ? 'shadow-motion' : 'player-blocked'); else if (event.type === 'round-end') this.audio.play('round-end'); }
    if (state.phase === 'finished' && !this.rewarded) { this.rewarded = true; this.ui.setReward(careerProfile.reward(this.activity, state.summary)); }
    this.view.render(state); this.ui.update(state);
    if (import.meta.env.DEV) for (const event of events) {
      if (event.input && ['hit', 'miss'].includes(event.type)) {
        window.__rhythm.impacts.push({ ...event, visual: this.view.contact });
        if (window.__rhythm.impacts.length > 80) window.__rhythm.impacts.shift();
      }
    }
  }
}
