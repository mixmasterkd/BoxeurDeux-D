import Phaser from 'phaser';
import { ShadowSession } from '../game/ShadowSession.js';
import { ShadowFighterView } from './ShadowFighterView.js';
import { ShadowUI } from '../ui/ShadowUI.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';

export class ShadowScene extends Phaser.Scene {
  constructor() { super('ShadowScene'); }
  preload() { ShadowFighterView.preload(this); }

  create() {
    setSceneShell('shadow');
    this.session = new ShadowSession();
    this.fighter = new ShadowFighterView(this);
    this.audio = new SparringAudio();
    const start = () => {
      this.audio.setActive(false);
      this.session.reset(); this.session.start(); this.audio.setActive(true);
    };
    this.ui = new ShadowUI({
      getState: () => this.session.state,
      onAction: action => this.session.act(action),
      onGuard: held => this.session.setGuard(held),
      onStart: start, onReset: start,
      onPause: () => { this.session.pause(); this.audio.setActive(false); },
      onResume: () => { this.session.resume(); this.audio.setActive(true); },
      onFinish: () => { this.session.finish(); this.audio.setActive(false); },
      onReturnGym: () => {
        if (this.session.state.phase === 'running') return;
        this.session.releaseControls(); this.scene.start('GymScene');
      },
      onSpeed: speed => this.session.setSpeed(speed),
      onBlur: () => { this.session.pause(); this.session.releaseControls(); this.audio.setActive(false); },
      onAudioGesture: () => this.audio.unlock(),
      onMute: () => {
        this.audio.setMuted(!this.audio.muted); this.audio.unlock(); this.ui.setAudioState(this.audio.getState());
      },
    });
    this.ui.setAudioState(this.audio.getState());
    this.fighter.render(this.session.state.player, 0);
    this.ui.update(this.session.state);
    this.resizeObserver = new ResizeObserver(() => this.scale.refresh());
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
  }
}
