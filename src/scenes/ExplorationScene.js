import Phaser from 'phaser';
import { ExplorationWorld, STREET_SCALE, WORLD_ENTRANCES } from '../game/ExplorationWorld.js';
import { careerProfile } from '../game/CareerProfile.js';
import { resumePending } from '../game/ResumeRouting.js';
import { GymUI } from '../ui/GymUI.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { downloadCareer } from '../ui/CareerMenu.js';
import { setSceneShell } from '../ui/SceneShell.js';
import '../ui/exploration.css';

export class ExplorationScene extends Phaser.Scene {
  constructor() { super('ExplorationScene'); }

  init(data = {}) {
    const entry = new URLSearchParams(location.search).get('scene');
    const saved = careerProfile.snapshot().location;
    this.place = data.place ?? (['home', 'neighborhood'].includes(entry) ? entry : saved.scene === 'neighborhood' ? 'neighborhood' : 'home');
    this.entryPosition = data.location ?? (data.entrance ? (this.place === 'home'
      ? { x: 640, y: 622, facing: 'up' } : WORLD_ENTRANCES[data.entrance])
      : saved.scene === this.place ? saved : undefined);
    this.changingPlace = false;
    this.sleeping = false;
    this.sleepInterrupted = false;
    this.persistClock = 0;
  }

  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.image(`world-${this.place}`, `${base}assets/world/${this.place}.png`);
    this.load.json('street-player-data', `${base}assets/sprites/street/player.json`);
    for (const direction of ['down', 'right', 'up', 'left']) for (let step = 0; step < 3; step++) {
      this.load.image(`street-player-${direction}-${step}`, `${base}assets/sprites/street/player-${direction}-${step}.png`);
    }
  }

  create() {
    setSceneShell(this.place);
    this.world = new ExplorationWorld({ place: this.place, position: this.entryPosition });
    const { width, height } = this.world.layout;
    this.add.image(0, 0, `world-${this.place}`).setOrigin(0).setDisplaySize(width, height);
    this.addForeground();
    const metadata = this.cache.json.get('street-player-data');
    // The house furniture is drawn at twice the street actor's scale. Keep an
    // integer scale for crisp pixels, with the same foot anchor in every pose.
    const actorScale = this.place === 'home' ? 2 : 1;
    this.shadow = this.add.ellipse(0, 0, 33, 11, 0x132323, .24).setScale(actorScale).setDepth(1);
    this.player = this.add.image(0, 0, 'street-player-down-0')
      .setOrigin(metadata.anchor.x / metadata.width, metadata.anchor.y / metadata.height).setScale(actorScale);
    this.marker = this.add.graphics().setDepth(2);
    this.ui = new GymUI({
      onMove: vector => { if (!this.sleeping && !this.changingPlace && !resumePending()) this.world.setInput(vector); },
      onInteract: () => this.interact(),
      onPause: () => { this.persistLocation(); this.world.pause(); this.refreshProfile(); },
      onResume: () => { if (!this.sleeping && !this.changingPlace && !resumePending()) this.world.resume(); },
      onBlur: () => {
        if (this.sleeping) this.sleepInterrupted = true;
        this.persistLocation(); this.world.pause();
      },
      onCloseDialog: () => { this.ui.closeDialog(); this.world.releaseControls(); },
      onDialogAction: action => this.choose(action.id),
      onExportCareer: () => { this.persistLocation(); downloadCareer(); },
      onInspectCareer: text => careerProfile.inspectImport(text),
      onImportCareer: text => {
        careerProfile.importText(text);
        this.changingPlace = true;
        window.dispatchEvent(new CustomEvent('career-imported'));
      },
      onRefreshCareer: () => this.refreshProfile(),
    }, this.place === 'home' ? {
      eyebrow: 'CHEZ TOI · MONTRÉAL', title: 'Un nouveau jour', welcome: 'Chez toi',
      hint: 'Le lit pour dormir, la porte pour sortir.', pauseText: 'Ta journée attend. Se promener ne coûte aucune énergie.',
      commandsTitle: 'Commandes de la maison', commandsHint: 'Approche-toi du lit ou de la porte, puis interagis.',
    } : {
      eyebrow: 'MONTRÉAL · LE QUARTIER', title: 'À deux pas du gym', welcome: 'Le quartier',
      hint: 'Explore les rues. Maison, gym et salle de boxe sont ouverts.', pauseText: 'Les rues t’attendent. Se promener ne coûte aucune énergie.',
      commandsTitle: 'Commandes du quartier', commandsHint: 'Marche jusqu’à une porte et interagis pour entrer. Les cônes indiquent les rues encore fermées.',
    });
    this.refreshProfile();
    this.renderWorld();
    const camera = this.cameras.main;
    camera.setBounds(0, 0, width, height);
    camera.centerOn(this.player.x, this.player.y);
    if (this.place === 'neighborhood') camera.startFollow(this.player, true, .10, .10, 0, 60);
    // Interior keeps the same 1280×720 frame as the gym; outdoors it is a
    // window into a larger world. Actor size follows each setting's furniture.
    this.ui.update(this.world.state);
    this.persistLocation();
    this.abort = new AbortController();
    window.addEventListener('pagehide', () => this.persistLocation(), { signal: this.abort.signal });
    this.resizeObserver = new ResizeObserver(() => { this.scale.getParentBounds(); this.scale.refresh(); });
    this.resizeObserver.observe(document.getElementById('game'));
    let disposed = false;
    const cleanup = () => {
      if (disposed) return; disposed = true;
      this.events.off('shutdown', cleanup); this.events.off('destroy', cleanup);
      this.world.releaseControls(); this.ui.destroy(); this.abort.abort(); this.resizeObserver.disconnect();
      if (import.meta.env.DEV && window.__exploration?.scene === this) delete window.__exploration;
    };
    this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
    if (import.meta.env.DEV) window.__exploration = { scene: this, world: this.world, ui: this.ui };
  }

  refreshProfile() { this.ui?.setCareer(careerProfile.snapshot(), careerProfile.saveStatus()); }

  persistLocation() {
    if (!this.world || this.changingPlace || careerMenuOpen() || resumePending()) return;
    careerProfile.setLocation(this.world.location());
  }

  interact() {
    if (this.sleeping || this.changingPlace || resumePending() || this.world.state.paused || this.ui.dialog) return;
    const station = this.world.getNearby();
    if (!station) return;
    this.world.releaseControls(); this.persistLocation();
    const daily = careerProfile.dailyStatus();
    const show = (title, text, actions = []) => this.ui.showDialog({ speaker: this.place === 'home' ? 'CHEZ TOI' : 'LA VIE DE QUARTIER', title, text, actions });
    const back = { id: 'close', label: 'Continuer la visite →' };
    if (station.id === 'bed') {
      show('Dormir jusqu’à demain ?', `Jour ${daily.day} · Énergie ${daily.energy}/${daily.maxEnergy}.\n\nUne nuit fait passer au jour suivant et remplit l’énergie de journée. Tes compétences restent acquises; dormir ne donne aucun bonus.`, [
        { id: 'close', label: 'Pas encore' }, { id: 'sleep', label: `Dormir → Jour ${daily.day + 1}` },
      ]);
    } else if (station.id === 'exit') this.travel('neighborhood', 'home');
    else if (station.id === 'home') this.travel('home', 'street');
    else if (station.id === 'gym') this.travel('gym');
    else if (station.id === 'fight') {
      show('Béton vous attend.', 'Entre directement dans la salle de boxe pour affronter Béton. Trois rounds de 60 secondes, Rémi dans ton coin.\n\nCombat et revanche : aucune énergie de journée dépensée. Tu commences avec tes capacités entraînées.', [
        { id: 'enter-fight', label: 'Rencontrer Béton →' }, back,
      ]);
    } else if (station.id === 'wardrobe') {
      show('Ta signature.', 'Survêtement noir à bandes blanches et tuque rouge pour le quartier. Au gym, tu retrouves ta tenue de boxe.\n\nLes nouvelles tenues arriveront plus tard.', [back]);
    } else if (station.id === 'notebook') {
      const { stats, caps, fights } = careerProfile.snapshot();
      show('Ton carnet de boxe', `Endurance : ${stats.endurance}/${caps.endurance}\nRésistance : ${stats.resistance}/${caps.resistance}\nPuissance : +${stats.power}/+${caps.power}\nRécupération : +${Math.round((stats.recovery - 1) * 100)} %\n\nBéton : ${fights.beton.wins} victoire(s) · ${fights.beton.attempts} combat(s).\nL’entraînement améliore tes capacités jusqu’au plafond du palier.`, [back]);
    } else if (station.id.startsWith('works')) {
      show('Fin des travaux : éventuellement.', 'Les cônes veillent sur les prochains coins du quartier.\n\nCette rue est encore fermée. La maison, le gym, le parc et la salle de boxe restent accessibles.', [back]);
    } else if (station.id === 'shop') {
      show('Le dépanneur du coin', 'Le commerce ouvrira dans une prochaine étape. Pour l’instant, profite du quartier : aucun achat n’est nécessaire pour t’entraîner ou combattre.', [back]);
    } else show('Un local, plein de possibilités.', 'Cette adresse sera aménagée plus tard. La vie du quartier commence avec la maison, le gym et la salle de boxe.', [back]);
  }

  choose(id) {
    if (this.changingPlace || this.sleeping || resumePending() || this.world.state.paused || !this.ui.dialog) return;
    if (id === 'sleep' && this.world.getNearby()?.id === 'bed') this.sleep();
    else if (id === 'enter-fight' && this.world.getNearby()?.id === 'fight') {
      this.persistLocation(); this.changingPlace = true; this.ui.clearInputs(); this.world.pause();
      this.scene.start('SparringScene', { opponent: 'beton', lesson: 'resistance', fromNeighborhood: true });
    }
  }

  travel(place, entrance) {
    this.persistLocation(); this.changingPlace = true; this.ui.clearInputs(); this.world.pause();
    const position = place === 'gym' ? { x: 640, y: 630, facing: 'up' }
      : place === 'home' ? { x: 640, y: 622, facing: 'up' } : WORLD_ENTRANCES[entrance];
    careerProfile.setLocation({ scene: place, ...position });
    if (place === 'gym') this.scene.start('GymScene', { fromNeighborhood: true });
    else this.scene.restart({ place, entrance, location: position });
  }

  sleep() {
    this.sleepInterrupted = false;
    this.sleeping = true; this.ui.closeDialog(); this.world.pause();
    // Commit the night once on confirmation. Reloading during the fade resumes
    // the already-saved morning; it cannot grant a second day or a stat bonus.
    const result = careerProfile.sleep();
    if (!result.ok) { this.sleeping = false; this.world.resume(); return; }
    Object.assign(this.world.state, { x: 944, y: 365, facing: 'down' });
    this.persistLocation(); this.refreshProfile();
    this.cameras.main.fadeOut(450, 7, 16, 24);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.time.delayedCall(250, () => {
        this.cameras.main.fadeIn(550, 7, 16, 24);
        this.cameras.main.once('camerafadeincomplete', () => {
          this.sleeping = false;
          if (!this.sleepInterrupted && !this.ui.portraitQuery.matches && !document.hidden) this.world.resume();
          const { day, energy, maxEnergy } = careerProfile.dailyStatus();
          this.ui.showDialog({ speaker: 'BON MATIN', title: `Jour ${day}`, text: `Énergie de journée : ${energy}/${maxEnergy}.\nTes compétences sont conservées. Le quartier t’attend.`, actions: [{ id: 'close', label: 'Commencer la journée →' }] });
          this.refreshProfile();
        });
      });
    });
  }

  addForeground() {
    // Extract existing art pixels into transparent layers. Nothing is repainted:
    // trunks/benches keep their original shape, and feet decide the draw order.
    const layers = this.place === 'home' ? [
      { id: 'bed', points: [[990,171],[1208,171],[1208,365],[990,365]], depth: 365 },
      { id: 'table', points: [[0,453],[136,453],[136,560],[0,560]], depth: 565 },
    ] : [
      { id: 'tree-home', points: [[54,230],[96,202],[142,224],[164,299],[124,351],[119,392],[77,392],[76,337],[39,310]], depth: 393 },
      { id: 'tree-gym', points: [[863,277],[912,238],[958,251],[989,300],[972,332],[948,350],[947,397],[913,397],[912,344],[873,331]], depth: 400 },
      { id: 'tree-hall', points: [[1422,291],[1450,263],[1486,280],[1504,319],[1470,352],[1466,394],[1447,394],[1447,349],[1417,323]], depth: 395 },
      { id: 'park-tree', points: [[306,596],[343,550],[404,521],[455,553],[497,589],[516,644],[491,686],[463,708],[429,708],[428,747],[399,747],[397,702],[347,702],[319,668]], depth: 750 },
      { id: 'park-fence-left', points: [[38,858],[306,858],[306,938],[38,938]], depth: 932 },
      { id: 'park-fence-right', points: [[389,858],[666,858],[666,938],[389,938]], depth: 932 },
      { id: 'park-bench', points: [[452,803],[539,781],[561,815],[546,842],[471,861],[454,838]], depth: 853 },
    ];
    const scale = this.place === 'neighborhood' ? STREET_SCALE : 1;
    const source = this.textures.get(`world-${this.place}`).getSourceImage();
    for (const layer of layers) {
      const key = `world-layer-${this.place}-${layer.id}`;
      const xs = layer.points.map(p => p[0]), ys = layer.points.map(p => p[1]);
      const left = Math.min(...xs), top = Math.min(...ys), width = Math.max(...xs) - left, height = Math.max(...ys) - top;
      if (!this.textures.exists(key)) {
        const texture = this.textures.createCanvas(key, width, height), context = texture.context;
        context.beginPath(); layer.points.forEach(([x,y], i) => i ? context.lineTo(x - left, y - top) : context.moveTo(x - left, y - top));
        context.closePath(); context.clip(); context.drawImage(source, -left, -top); texture.refresh();
      }
      this.add.image(left * scale, top * scale, key).setOrigin(0).setScale(scale).setDepth(layer.depth * scale);
    }
  }

  update(_time, delta) {
    if (!this.world || !this.ui) return;
    const wasMoving = this.world.state.moving;
    if (!this.ui.dialog && !this.sleeping && !this.changingPlace && !careerMenuOpen() && !resumePending()) this.world.update((this.game.loop.rawDelta ?? delta) / 1000);
    this.persistClock += delta;
    if (!this.sleeping && (wasMoving && !this.world.state.moving || this.persistClock > 1500)) {
      this.persistLocation(); this.persistClock = 0;
    }
    this.renderWorld(); this.ui.update(this.world.state);
    // During the brief night transition the fade itself is the presentation.
    if (this.sleeping) this.ui.root.dataset.sleeping = 'true'; else delete this.ui.root.dataset.sleeping;
  }

  renderWorld() {
    const state = this.world.state;
    const step = state.moving && !state.paused && !this.ui?.dialog ? [0,1,0,2][Math.floor(state.walkTime / .14) % 4] : 0;
    this.player.setTexture(`street-player-${state.facing}-${step}`).setPosition(Math.round(state.x), Math.round(state.y)).setDepth(state.y);
    this.shadow.setPosition(state.x, state.y + 1);
    this.marker.clear();
    if (state.nearby && !state.paused && !this.ui?.dialog) this.marker.lineStyle(2, 0xebc37d, .8).strokeEllipse(state.nearby.x, state.nearby.y + 4, 42, 12);
  }
}
