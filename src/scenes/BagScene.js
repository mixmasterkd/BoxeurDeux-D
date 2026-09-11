import Phaser from 'phaser';
import { BagSession } from '../game/BagSession.js';
import { BagFighterView } from './BagFighterView.js';
import { BagUI } from '../ui/BagUI.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';

export class BagScene extends Phaser.Scene {
  constructor() { super('BagScene'); }
  preload() { BagFighterView.preload(this); }
  create() {
    setSceneShell('bag');
    this.session = new BagSession();
    this.fighter = new BagFighterView(this);
    this.audio = new SparringAudio();
    this.ui = new BagUI({
      getState: () => this.session.state,
      onAction: input => this.session.attack(input),
      onStart: () => {
        this.audio.setActive(false); this.session.reset(); this.fighter.reset(); this.session.start();
        this.audio.setActive(true); this.audio.play('round-start');
      },
      onPause: () => { this.session.pause(); this.audio.setActive(false); },
      onResume: () => { this.session.resume(); this.audio.setActive(true); },
      onReturnGym: () => { if (this.session.state.phase !== 'running') this.scene.start('GymScene'); },
      onAudioGesture: () => this.audio.unlock(),
      onMute: () => {
        this.audio.setMuted(!this.audio.muted); this.audio.unlock(); this.ui.setAudioState(this.audio.getState());
      },
    });
    this.ui.setAudioState(this.audio.getState());
    this.fighter.render(this.session.state.player, 0);
    this.resizeObserver = new ResizeObserver(() => this.scale.refresh());
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
          impacts.push({ ...event, player: { ...state.player }, contactPoint: { ...this.fighter.contactPoint }, targetPoint: this.fighter.targetPoint(), pose: this.fighter.pose });
          if (impacts.length > 100) impacts.shift();
        }
      } else if (event.type === 'sequence-end' && event.success) this.audio.play('lesson-progress');
      else if (event.type === 'round-end') this.audio.play('round-end');
    }
    this.ui.update(state);
  }
}
