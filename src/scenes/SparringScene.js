import Phaser from 'phaser';
import { SparringSession, TIMINGS } from '../game/SparringSession.js';
import { SparringUI } from '../ui/SparringUI.js';
import { FighterView, drawImpact } from './FighterView.js';

const FEEDBACK = {
  'player-hit': ['Touché !', 'success'],
  'player-blocked': ['Rémi bloque', 'block'],
  'player-missed': ['Dans le vide', 'neutral'],
  'remi-hit': ['Coup reçu', 'danger'],
  'remi-blocked': ['Bien bloqué', 'block'],
  'remi-dodged': ['Belle esquive !', 'success'],
  exhausted: ['Soufflez… relâchez la garde', 'danger'],
};

export class SparringScene extends Phaser.Scene {
  constructor() {
    super('SparringScene');
  }

  preload() {
    this.load.image('gym', `${import.meta.env.BASE_URL}assets/backgrounds/gym.png`);
    FighterView.preload(this);
  }

  create() {
    this.session = new SparringSession();
    const background = this.add.image(640, 360, 'gym');
    background.setScale(Math.min(1280 / background.width, 720 / background.height));
    // Fixed framing also contains the forward footwork of close exchanges.
    // Keep combat coordinates local so contact landmarks and marks stay aligned.
    this.fighterLayer = this.add.container(640 * (1 - .88), 0).setScale(.88).setDepth(1);
    this.remi = new FighterView(this, 'remi', 640, 592, 390);
    this.player = new FighterView(this, 'player', 640, 718, 390);
    this.fighterLayer.add([this.remi.shadow, this.remi.sprite, this.player.shadow, this.player.sprite]);
    this.player.target = this.remi.point('guard', 'head');
    this.remi.target = this.player.point('guard', 'head');
    this.cue = this.add.graphics().setDepth(12);
    this.coach = this.add.text(640, 156, '', {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold',
      color: '#ffdf96', backgroundColor: '#14212aee', padding: { x: 12, y: 8 },
    }).setOrigin(.5).setDepth(13);
    this.ui = new SparringUI({
      onAction: (action) => this.session.act(action),
      onGuard: (held) => this.session.setGuard(held),
      onStart: (settings) => { this.session.reset(settings); this.session.start(); },
      onPause: () => this.session.pause(),
      onResume: () => this.session.resume(),
      onRestart: (settings) => { this.session.reset(settings); this.session.start(); },
      onSettings: (settings) => this.session.setSettings(settings),
      onBlur: () => { this.session.releaseControls(); this.session.pause(); },
    });
    this.remi.render(this.session.state.remi, 0);
    this.player.render(this.session.state.player, 0);
    this.ui.update(this.session.state);
    this.resizeObserver = new ResizeObserver(() => this.scale.refresh());
    this.resizeObserver.observe(document.getElementById('game'));
    this.events.once('shutdown', () => { this.ui.destroy(); this.resizeObserver.disconnect(); });
    this.events.once('destroy', () => { this.ui.destroy(); this.resizeObserver.disconnect(); });
    if (import.meta.env.DEV) {
      window.__sparring = { session: this.session, scene: this, ui: this.ui, impacts: [] };
    }
  }

  update(_time, delta) {
    if (!this.session) return;
    this.session.update(Math.min(delta / 1000, .05));
    const state = this.session.state;
    this.remi.render(state.remi, state.elapsed);
    this.player.target = state.remi.action === 'hit'
      ? this.remi.point('guard', 'head')
      : this.remi.point(this.remi.pose, 'head', true);
    if (state.remi.action === 'guard') this.player.target.y += 20;
    this.player.render(state.player, state.elapsed);
    this.renderCue(state);
    for (const event of this.session.drainEvents()) {
      const message = FEEDBACK[event.type];
      if (message) this.ui.showFeedback(...message);
      if (event.type.startsWith('player-') || event.type.startsWith('remi-')) {
        const striker = event.type.startsWith('player-') ? this.player : this.remi;
        const { x, y } = striker.contact();
        this.fighterLayer.add(drawImpact(this, event, x, y));
        if (import.meta.env.DEV) {
          const log = window.__sparring.impacts;
          log.push({ ...event, x, y, playerProgress: state.player.progress, remiProgress: state.remi.progress, playerTexture: this.player.sprite.texture.key, remiTexture: this.remi.sprite.texture.key });
          if (log.length > 100) log.shift();
        }
      }
    }
    this.ui.update(state);
  }

  renderCue(state) {
    this.cue.clear();
    if (state.phase !== 'running') { this.coach.setVisible(false); return; }
    const { action, progress, safeDodge } = state.remi;
    const telegraph = action === 'tellLeft' || action === 'tellRight';
    const punching = action === 'jab' || action === 'cross';
    const opened = action === 'open';
    this.coach.setVisible(telegraph || punching || opened);
    if (telegraph || punching) {
      const right = safeDodge === 'dodgeRight';
      const timing = TIMINGS.remi[right ? 'jab' : 'cross'];
      const untilContact = telegraph
        ? state.remi.duration * (1 - progress) + timing.duration * timing.impact
        : state.remi.duration * (timing.impact - progress);
      const instruction = untilContact > .4 ? 'PRÉPAREZ' : 'ESQUIVEZ';
      this.coach.setText(right ? `${instruction} À DROITE  →` : `←  ${instruction} À GAUCHE`).setColor('#ffdf96');
      if (untilContact < 0) { this.coach.setVisible(false); return; }
      const x = right ? 500 : 780;
      const y = 300;
      this.cue.lineStyle(5, 0xffd18a, .65 + progress * .35);
      this.cue.strokeCircle(x, y, 22 + (1 - progress) * 12);
      this.cue.fillStyle(0xffdc8a, 1).fillTriangle(x - 5, y - 8, x + 5, y - 8, x, y + 6);
    } else if (opened) {
      this.coach.setText('OUVERTURE · À VOUS !').setColor('#b8dfbf');
    }
  }
}
