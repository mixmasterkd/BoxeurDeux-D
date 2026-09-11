import Phaser from 'phaser';
import { GymWorld, GYM_LAYOUT } from '../game/GymWorld.js';
import { GymUI } from '../ui/GymUI.js';
import { setSceneShell } from '../ui/SceneShell.js';

const ACTIVITIES = {
  sac: { title: 'Le sac de frappe', text: 'Travaille le rythme et les enchaînements pendant 45 secondes. Observe les repères : jab, double jab, jab–direct, jab–direct–crochet et frappes au corps. Une pression par coup, et on relâche les épaules entre les séries.' },
  miroir: { title: 'Le miroir', text: 'Pratique libre : frappes à la tête et au corps, crochet en combo, gardes haute et basse, esquives. Observe ton reflet à ton rythme, sans adversaire ni limite de temps. Le ralenti permet de regarder chaque mouvement.' },
  speedball: { title: 'La speed ball', text: 'Un futur exercice de coordination et de régularité. Le matériel est en place; le mini-jeu sera ajouté après la visite du gym.' },
  corde: { title: 'La corde à danser', text: 'Ce tapis accueillera un exercice de rythme et de jeu de jambes. L’atelier ouvrira plus tard; le sparring avec Rémi est déjà accessible.' },
  porte: { title: 'Le quartier attendra', text: 'La première visite se déroule à l’intérieur du gym. Plus tard, vous passerez cette porte en survêtement noir à bandes blanches, toujours avec votre tuque rouge.' },
};

export class GymScene extends Phaser.Scene {
  constructor() { super('GymScene'); }

  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.image('gym-exploration', `${base}assets/backgrounds/gym-exploration.png`);
    this.load.json('gym-player-data', `${base}assets/sprites/exploration/player.json`);
    for (const direction of ['down', 'right', 'up', 'left']) {
      for (let step = 0; step < 3; step++) this.load.image(`gym-player-${direction}-${step}`, `${base}assets/sprites/exploration/player-${direction}-${step}.png`);
    }
    this.load.image('gym-remi', `${base}assets/sprites/exploration/remi.png`);
  }

  create() {
    setSceneShell('gym');
    this.world = this.registry.get('gym-world') ?? new GymWorld();
    this.registry.set('gym-world', this.world);
    this.world.resume();
    this.add.image(640, 360, 'gym-exploration').setDisplaySize(1280, 720);
    // Foreground slices use the original room pixels. Feet determine draw order,
    // so passing beside tall equipment doesn't paint the boxer over its front.
    this.addForeground([[465,145],[841,145],[873,297],[875,439],[426,439],[426,296]], 439);
    this.addForeground([[206,104],[242,104],[258,128],[258,253],[250,265],[203,265],[196,252],[196,129]], 267);
    const remi = GYM_LAYOUT.stations.find(station => station.id === 'remi');
    this.remiShadow = this.add.ellipse(remi.x, remi.y + 1, 45, 13, 0x0c1b23, .30).setDepth(1);
    this.remi = this.add.image(remi.x, remi.y, 'gym-remi').setOrigin(.5, 104 / 112).setDepth(remi.y);
    this.remiName = this.add.text(remi.x, remi.y - 103, 'RÉMI', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#f2d29a',
      backgroundColor: '#142b32df', padding: { x: 8, y: 4 },
    }).setOrigin(.5, 1).setDepth(900);
    this.playerData = this.cache.json.get('gym-player-data');
    this.shadow = this.add.ellipse(0, 0, 33, 11, 0x102129, .27).setDepth(1);
    this.player = this.add.image(0, 0, 'gym-player-down-0').setOrigin(
      this.playerData.anchor.x / this.playerData.width, this.playerData.anchor.y / this.playerData.height);
    this.marker = this.add.graphics().setDepth(2);
    this.ui = new GymUI({
      onMove: vector => this.world.setInput(vector),
      onInteract: () => this.interact(),
      onPause: () => this.world.pause(),
      onResume: () => this.world.resume(),
      onCloseDialog: () => { this.ui.closeDialog(); this.world.releaseControls(); },
      onSparring: lesson => this.enterSparring(lesson),
      onBag: () => this.enterBag(),
      onShadow: () => this.enterShadow(),
      onBlur: () => this.world.pause(),
    });
    this.renderWorld();
    this.ui.update(this.world.state);
    this.resizeObserver = new ResizeObserver(() => {
      // Phaser refresh computes display size before its final bounds read.
      // Read the resized parent first, including a change of primary pointer.
      this.scale.getParentBounds(); this.scale.refresh();
    });
    this.resizeObserver.observe(document.getElementById('game'));
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      this.events.off('shutdown', cleanup);
      this.events.off('destroy', cleanup);
      this.world.releaseControls();
      this.ui.destroy();
      this.resizeObserver.disconnect();
      if (import.meta.env.DEV && window.__gym?.scene === this) delete window.__gym;
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
    if (import.meta.env.DEV) window.__gym = { scene: this, world: this.world, ui: this.ui };
  }

  interact() {
    if (this.world.state.paused || this.ui.dialog) return;
    const station = this.world.getNearby();
    if (!station) return;
    this.world.releaseControls();
    if (station.id === 'remi') {
      this.ui.showDialog({
        speaker: 'RÉMI LE TANK', title: 'On fait un round ?',
        text: 'Salut, la tuque rouge ! Fais le tour du gym à ton rythme. Quand tu es prêt, on travaille ensemble : un round libre ou une leçon, à toi de choisir.',
        actions: [
          { id: 'sparring', lesson: 'free', label: 'Sparring libre · 60 s' },
          { id: 'sparring', lesson: 'jab', label: 'Leçon · Placer son jab' },
          { id: 'sparring', lesson: 'guard', label: 'Leçon · Bloquer et souffler' },
          { id: 'sparring', lesson: 'counter', label: 'Leçon · Esquiver et répondre' },
          { id: 'close', label: 'Continuer la visite →' },
        ],
      });
    } else if (station.id === 'sac') {
      this.ui.showDialog({ speaker: 'L’ATELIER DU SAC', ...ACTIVITIES.sac, actions: [
        { id: 'bag', label: 'Commencer · 45 s' }, { id: 'close', label: 'Continuer la visite →' },
      ] });
    } else if (station.id === 'miroir') {
      this.ui.showDialog({ speaker: 'SHADOW BOXING', ...ACTIVITIES.miroir, actions: [
        { id: 'shadow', label: 'Pratiquer devant le miroir →' }, { id: 'close', label: 'Continuer la visite →' },
      ] });
    } else {
      this.ui.showDialog({ speaker: station.kind === 'exit' ? 'LA PORTE DU GYM' : 'DÉCOUVRIR LES ATELIERS', ...ACTIVITIES[station.id] });
    }
  }

  addForeground(points, depth) {
    const shape = this.make.graphics({ x: 0, y: 0, add: false });
    shape.fillStyle(0xffffff).fillPoints(points.map(([x, y]) => ({ x, y })), true);
    const foreground = this.add.image(640, 360, 'gym-exploration').setDisplaySize(1280, 720).setDepth(depth);
    // Phaser 4's setMask / GeometryMask are Canvas-only. In WebGL they
    // silently leave the whole room drawn over any boxer with a lower depth.
    // The external mask uses room coordinates and clips just this equipment.
    if (this.game.renderer.type === Phaser.WEBGL) {
      foreground.enableFilters();
      const mask = foreground.filters.external.addMask(shape, false, this.cameras.main);
      mask.autoUpdate = false;
      this.events.once('shutdown', () => shape.destroy());
    } else {
      const mask = shape.createGeometryMask();
      foreground.setMask(mask);
      this.events.once('shutdown', () => { mask.destroy(); shape.destroy(); });
    }
  }

  enterSparring(lesson = 'free') {
    if (this.world.state.paused || !this.ui.dialog || this.world.getNearby()?.id !== 'remi') return;
    this.world.releaseControls();
    this.scene.start('SparringScene', { lesson, fromGym: true });
  }

  enterBag() {
    if (this.world.state.paused || !this.ui.dialog || this.world.getNearby()?.id !== 'sac') return;
    this.world.releaseControls();
    this.scene.start('BagScene');
  }

  enterShadow() {
    if (this.world.state.paused || !this.ui.dialog || this.world.getNearby()?.id !== 'miroir') return;
    this.world.releaseControls();
    this.scene.start('ShadowScene');
  }

  update(_time, delta) {
    if (!this.world || !this.ui) return;
    // The world bounds long stalls and subdivides collision steps itself.
    // Phaser smooths and caps its default delta during startup/focus recovery.
    // Use elapsed frame time so walking speed stays steady on slower devices.
    if (!this.ui.dialog) this.world.update((this.game.loop.rawDelta ?? delta) / 1000);
    this.renderWorld();
    this.ui.update(this.world.state);
  }

  renderWorld() {
    const state = this.world.state;
    const step = state.moving && !state.paused && !this.ui.dialog
      ? [0, 1, 0, 2][Math.floor(state.walkTime / .14) % 4] : 0;
    this.player.setTexture(`gym-player-${state.facing}-${step}`).setPosition(Math.round(state.x), Math.round(state.y)).setDepth(state.y);
    this.shadow.setPosition(state.x, state.y + 1);
    const station = state.nearby;
    this.marker.clear();
    if (station && !state.paused && !this.ui.dialog) {
      this.marker.lineStyle(2, 0xebc37d, .8).strokeEllipse(station.x, station.y + 3, 48, 16);
    }
  }
}
