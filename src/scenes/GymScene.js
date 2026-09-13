import Phaser from 'phaser';
import { DoorTravel } from '../game/DoorTravel.js';
import { preloadGymFriends, createGymFriends, renderGymFriends, interactGymFriend, chooseGymFriend } from './GymFriends.js';
import { GymWorld, GYM_LAYOUT } from '../game/GymWorld.js';
import { GymUI } from '../ui/GymUI.js';
import { setSceneShell } from '../ui/SceneShell.js';
import { careerProfile } from '../game/CareerProfile.js';
import { resumePending } from '../game/ResumeRouting.js';
import { downloadCareer } from '../ui/CareerMenu.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { sparringActivity } from '../game/DailyActivityGate.js';
import { showEquipment, chapterChoose } from './ChapterInteractions.js';
import { preloadOutfits, boxingTexture } from './OutfitView.js';

const ACTIVITIES = {
  sac: { title: 'Le sac de frappe', text: 'Travaille le rythme et les enchaînements pendant 45 secondes. Observe les repères : jab, double jab, jab–direct, jab–direct–crochet et frappes au corps. Une pression par coup, et on relâche les épaules entre les séries.' },
  miroir: { title: 'Le miroir', text: 'Pratique libre : frappes à la tête et au corps, crochet en combo, gardes haute et basse, esquives. Observe ton reflet à ton rythme, sans adversaire ni limite de temps. Le ralenti permet de regarder chaque mouvement.' },
  speedball: { title: 'La speed ball', text: 'Travaille la coordination et la récupération. Alterne les deux mains au retour de la balle : 20 bons temps et 60 % de précision font progresser ta récupération.' },
  corde: { title: 'La corde à danser', text: 'Travaille le rythme et l’endurance. Alterne les appuis au passage de la corde : 20 bons temps et 60 % de précision augmentent ton endurance maximale.' },
  porte: { title: 'Un tour dans le quartier ?', text: 'La maison et la salle communautaire sont à quelques rues. Marcher ne consomme pas d’énergie.' },
};

export class GymScene extends Phaser.Scene {
  constructor() { super('GymScene'); }

  preload() {
    const base = import.meta.env.BASE_URL;
    preloadOutfits(this,{boxing:true});
    preloadGymFriends(this);
    this.load.image('gym-exploration', `${base}assets/backgrounds/gym-exploration.png`);
    this.load.json('gym-player-data', `${base}assets/sprites/exploration/player.json`);
    for (const direction of ['down', 'right', 'up', 'left']) {
      for (let step = 0; step < 3; step++) this.load.image(`gym-player-${direction}-${step}`, `${base}assets/sprites/exploration/player-${direction}-${step}.png`);
    }
    this.load.image('gym-remi', `${base}assets/sprites/exploration/remi.png`);
  }

  create(data = {}) {
    if (careerProfile.snapshot().cuba?.active) { this.changingPlace = true; this.scene.start('CubaScene'); return; }
    this.changingPlace = false;
    setSceneShell('gym');
    this.world = this.registry.get('gym-world') ?? new GymWorld();
    const saved = data.location ?? careerProfile.snapshot().location;
    const spawn = data.fromNeighborhood ? { x: 640, y: 630, facing: 'up' }
      : !this.registry.has('gym-world') && saved?.scene === 'gym' ? saved : null;
    if (spawn) this.world.restorePosition(spawn);
    this.registry.set('gym-world', this.world);
    this.world.resume();
    this.doorTravel = new DoorTravel(this.world.layout.doors ?? [], this.world.state);
    this.add.image(640, 360, 'gym-exploration').setDisplaySize(1280, 720);
    this.locationClock = 0;
    this.lastLocation = null;
    this.persistLocation();
    // Foreground slices use the original room pixels. Feet determine draw order,
    // so passing beside tall equipment doesn't paint the boxer over its front.
    this.addForeground([[465,145],[841,145],[873,297],[875,439],[426,439],[426,296]], 439);
    this.addForeground([[206,104],[242,104],[258,128],[258,253],[250,265],[203,265],[196,252],[196,129]], 267);
    const remi = GYM_LAYOUT.stations.find(station => station.id === 'remi');
    this.remiShadow = this.add.ellipse(remi.x, remi.y + 1, 45, 13, 0x0c1b23, .30).setScale(GYM_LAYOUT.actorScale).setDepth(1);
    this.remi = this.add.image(remi.x, remi.y, 'gym-remi').setOrigin(.5, 104 / 112).setScale(GYM_LAYOUT.actorScale).setDepth(remi.y);
    this.remiName = this.add.text(remi.x, remi.y - 103 * GYM_LAYOUT.actorScale, 'RÉMI', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#f2d29a',
      backgroundColor: '#142b32df', padding: { x: 8, y: 4 },
    }).setOrigin(.5, 1).setDepth(900);
    createGymFriends(this);
    this.playerData = this.cache.json.get('gym-player-data');
    this.shadow = this.add.ellipse(0, 0, 33, 11, 0x102129, .27).setScale(GYM_LAYOUT.actorScale).setDepth(1);
    this.player = this.add.image(0, 0, 'gym-player-down-0').setOrigin(
      this.playerData.anchor.x / this.playerData.width, this.playerData.anchor.y / this.playerData.height).setScale(GYM_LAYOUT.actorScale);
    this.marker = this.add.graphics().setDepth(2);
    this.ui = new GymUI({
      onMove: vector => { if (!this.changingPlace && !resumePending()) this.world.setInput(vector); },
      onInteract: () => this.interact(),
      onPause: () => { this.world.pause(); this.persistLocation(); this.ui.setCareer(careerProfile.snapshot(), careerProfile.saveStatus()); },
      onResume: () => { if (!this.changingPlace && !resumePending()) this.world.resume(); },
      onCloseDialog: () => { this.ui.closeDialog(); this.world.releaseControls(); },
      onSparring: lesson => this.enterSparring(lesson),
      onBag: () => this.enterBag(),
      onShadow: () => this.enterShadow(),
      onRhythm: activity => this.enterRhythm(activity),
      onDialogAction: action => { if (chooseGymFriend(this,action)) return; if (action?.id === 'neighborhood') this.enterNeighborhood(); else if(action?.id.startsWith('equip-'))chapterChoose(this,action.id); },
      onExportCareer: () => downloadCareer(),
      onInspectCareer: text => careerProfile.inspectImport(text),
      onImportCareer: text => { careerProfile.importText(text); this.ui.setCareer(careerProfile.snapshot(), careerProfile.saveStatus()); window.dispatchEvent(new CustomEvent('career-imported')); },
      onRefreshCareer: () => this.ui.setCareer(careerProfile.snapshot(), careerProfile.saveStatus()),
      onBlur: () => { this.world.pause(); this.persistLocation(); },
    });
    this.ui.setCareer(careerProfile.snapshot(), careerProfile.saveStatus());
    this.renderWorld();
    this.ui.update(this.world.state);
    this.resizeObserver = new ResizeObserver(() => {
      // Phaser refresh computes display size before its final bounds read.
      // Read the resized parent first, including a change of primary pointer.
      this.scale.getParentBounds(); this.scale.refresh();
    });
    this.resizeObserver.observe(document.getElementById('game'));
    this.onPageHide = () => this.persistLocation();
    window.addEventListener('pagehide', this.onPageHide);
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      this.events.off('shutdown', cleanup);
      this.events.off('destroy', cleanup);
      this.world.releaseControls();
      this.ui.destroy();
      this.resizeObserver.disconnect();
      window.removeEventListener('pagehide', this.onPageHide);
      if (import.meta.env.DEV && window.__gym?.scene === this) delete window.__gym;
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
    if (import.meta.env.DEV) window.__gym = { scene: this, world: this.world, ui: this.ui };
  }

  interact() {
    if (this.changingPlace || resumePending() || this.world.state.paused || this.ui.dialog) return;
    const station = this.world.getNearby();
    if (!station) return;
    this.world.releaseControls();
    if(interactGymFriend(this,station))return;
    if(station.id==='locker'){showEquipment(this,'boxing');return;}
    if (station.id === 'remi') {
      this.ui.showDialog({
        speaker: 'RÉMI LE TANK', title: 'On fait un round ?',
        text: `Salut, la tuque rouge ! On travaille ensemble : un round libre ou une leçon, à toi de choisir.\n\n${this.trainingBenefit('sparring')}\n\n${this.dailyInvitation()}`,
        actions: [
          this.activityChoice({ id: 'sparring', lesson: 'free', label: 'Sparring libre · 60 s' }, 'sparring'),
          this.activityChoice({ id: 'sparring', lesson: 'resistance', label: 'Résistance et relevés · 3 rounds' }, 'sparring'),
          this.activityChoice({ id: 'sparring', lesson: 'jab', label: 'Leçon · Placer son jab' }, 'lesson'),
          this.activityChoice({ id: 'sparring', lesson: 'guard', label: 'Leçon · Bloquer et souffler' }, 'lesson'),
          this.activityChoice({ id: 'sparring', lesson: 'counter', label: 'Leçon · Esquiver et répondre' }, 'lesson'),
          { id: 'close', label: 'Continuer la visite →' },
        ],
      });
    } else if (station.id === 'sac') {
      this.ui.showDialog({ speaker: 'L’ATELIER DU SAC', ...ACTIVITIES.sac, text: `${ACTIVITIES.sac.text}\n\n${this.trainingBenefit('bag')}\n\n${this.dailyInvitation()}`, actions: [
        this.activityChoice({ id: 'bag', label: 'Commencer · 45 s' }, 'bag'), { id: 'close', label: 'Continuer la visite →' },
      ] });
    } else if (station.id === 'miroir') {
      this.ui.showDialog({ speaker: 'SHADOW BOXING', ...ACTIVITIES.miroir, text: `${ACTIVITIES.miroir.text}\n\nPratique libre : aucun gain de capacité.\n\n${this.dailyInvitation()}`, actions: [
        this.activityChoice({ id: 'shadow', label: 'Pratiquer devant le miroir →' }, 'shadow'), { id: 'close', label: 'Continuer la visite →' },
      ] });
    } else if (station.id === 'speedball' || station.id === 'corde') {
      const activity = station.id === 'corde' ? 'rope' : 'speedball';
      this.ui.showDialog({ speaker: station.id === 'speedball' ? 'COORDINATION' : 'JEU DE JAMBES', ...ACTIVITIES[station.id], text: `${ACTIVITIES[station.id].text}\n\n${this.trainingBenefit(activity)}\n\n${this.dailyInvitation()}`, actions: [
        this.activityChoice({ id: 'rhythm', activity, label: 'Commencer · 45 s' }, activity), { id: 'close', label: 'Continuer la visite →' },
      ] });
    } else if (station.id === 'porte') {
      this.enterNeighborhood();
    } else {
      this.ui.showDialog({ speaker: station.kind === 'exit' ? 'LA PORTE DU GYM' : 'DÉCOUVRIR LES ATELIERS', ...ACTIVITIES[station.id] });
    }
  }

  trainingBenefit(activity) {
    const { stats, caps } = careerProfile.snapshot();
    if (activity === 'bag') return `Puissance : +${stats.power} / +${caps.power}. Termine avec 6 contacts et 50 % de précision : puissance +1, jusqu’au plafond.`;
    if (activity === 'speedball') return `Récupération : +${Math.round((stats.recovery - 1) * 100)} % / +${Math.round((caps.recovery - 1) * 100)} %. Séance réussie : +2 %, jusqu’au plafond.`;
    if (activity === 'rope') return `Endurance maximale : ${stats.endurance} / ${caps.endurance}. Séance réussie : +2, jusqu’au plafond.`;
    return `Résistance : ${stats.resistance} / ${caps.resistance}. Termine « Résistance et relevés » et réussis 10 touches ou défenses : résistance +2, jusqu’au plafond. Les leçons et le sparring libre servent à pratiquer.`;
  }

  dailyInvitation() {
    const { day, energy, maxEnergy } = careerProfile.dailyStatus();
    return `Jour ${day} · Énergie ${energy}/${maxEnergy}. Le coût est débité au démarrage. Pour récupérer, rentre dormir à la maison.`;
  }

  activityChoice(action, activity) {
    const { ok, cost } = careerProfile.canStartActivity(activity);
    return { ...action, label: `${action.label} · ${cost} énergie${ok ? '' : ' · insuffisante'}`, disabled: !ok };
  }

  persistLocation() {
    if (!this.world || this.changingPlace || careerMenuOpen() || resumePending()) return;
    const { x, y, facing } = this.world.state;
    const fingerprint = `${Math.round(x)},${Math.round(y)},${facing}`;
    if (fingerprint === this.lastLocation) return;
    careerProfile.setLocation({ scene: 'gym', x: Math.round(x), y: Math.round(y), facing });
    this.lastLocation = fingerprint;
    this.locationClock = 0;
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
    if (!careerProfile.canStartActivity(sparringActivity({ lesson })).ok) return;
    this.persistLocation();
    this.world.releaseControls();
    this.scene.start('SparringScene', { lesson, opponent: 'remi', fromGym: true });
  }

  enterNeighborhood() {
    if (this.world.state.paused || this.world.getNearby()?.id !== 'porte') return;
    this.persistLocation(); this.world.releaseControls(); this.changingPlace = true;
    careerProfile.setLocation({ scene: 'neighborhood', x: 1128, y: 555, facing: 'down' });
    this.scene.start('ExplorationScene', { place: 'neighborhood', entrance: 'gym' });
  }

  enterBag() {
    if (this.world.state.paused || !this.ui.dialog || this.world.getNearby()?.id !== 'sac') return;
    if (!careerProfile.canStartActivity('bag').ok) return;
    this.persistLocation();
    this.world.releaseControls();
    this.scene.start('BagScene');
  }

  enterShadow() {
    if (this.world.state.paused || !this.ui.dialog || this.world.getNearby()?.id !== 'miroir') return;
    if (!careerProfile.canStartActivity('shadow').ok) return;
    this.persistLocation();
    this.world.releaseControls();
    this.scene.start('ShadowScene');
  }

  enterRhythm(activity) {
    const station = this.world.getNearby();
    if (this.world.state.paused || !this.ui.dialog || !['speedball', 'corde'].includes(station?.id)) return;
    if (!careerProfile.canStartActivity(activity).ok) return;
    this.persistLocation();
    this.world.releaseControls(); this.scene.start('RhythmScene', { activity });
  }

  update(_time, delta) {
    if (!this.world || !this.ui) return;
    // The world bounds long stalls and subdivides collision steps itself.
    // Phaser smooths and caps its default delta during startup/focus recovery.
    // Use elapsed frame time so walking speed stays steady on slower devices.
    if (!this.ui.dialog && !this.changingPlace && !resumePending() && !careerMenuOpen()) this.world.update((this.game.loop.rawDelta ?? delta) / 1000);
    if (this.doorTravel.update(this.world.state, this.world.input, this.changingPlace || this.world.state.paused || Boolean(this.ui.dialog) || resumePending() || careerMenuOpen()) === 'porte') this.enterNeighborhood();
    this.renderWorld();
    this.ui.update(this.world.state);
    this.locationClock += Math.min(delta / 1000, .1);
    if (!this.world.state.moving || this.locationClock >= 2) this.persistLocation();
    this.ui.setDaily(careerProfile.dailyStatus());
  }

  renderWorld() {
    renderGymFriends(this,this.time.now);
    const state = this.world.state;
    const step = state.moving && !state.paused && !this.ui.dialog
      ? [0, 1, 0, 2][Math.floor(state.walkTime / .14) % 4] : 0;
    this.player.setTexture(boxingTexture(this,`gym-player-${state.facing}-${step}`)).setPosition(Math.round(state.x), Math.round(state.y)).setDepth(state.y);
    this.shadow.setPosition(state.x, state.y + 1);
    const station = state.nearby;
    this.marker.clear();
    if (station && !state.paused && !this.ui.dialog) {
      this.marker.lineStyle(2, 0xebc37d, .8).strokeEllipse(station.x, station.y + 3, 48, 16);
    }
  }
}
