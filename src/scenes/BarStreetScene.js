import { ExplorationScene } from './ExplorationScene.js';
import { BarStreetWorld, BAR_STREET_BUILDING, BAR_STREET_NEIGHBORHOOD_RETURN } from '../game/BarStreetWorld.js';
import { ISLAND_BAR_ENTRY } from '../game/HomeBarWorld.js';
import { careerProfile } from '../game/CareerProfile.js';
import { startAt } from '../game/SceneRouting.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { resumePending } from '../game/ResumeRouting.js';

export class BarStreetScene extends ExplorationScene {
  constructor() { super('BarStreetScene'); }
  init(data = {}) {
    super.init({ ...data, place: 'bar-street' }); this.actorScale = 1; this.assetPath = 'assets/bar/street.png';
    this.placeCopy = { eyebrow: 'MONTRÉAL · LE QUARTIER', title: 'La rue du bar', welcome: 'La rue du bar',
      hint: 'Le Bar de l’Île est sur le trottoir nord. La maison et le gym sont à gauche.',
      pauseText: 'Ta promenade est sauvegardée. Aucun coût d’énergie.', commandsTitle: 'La rue du bar',
      commandsHint: 'Flèches ou WASD pour marcher. Entre dans le bar en avançant vers sa porte. À gauche, retrouve le quartier de la maison.' };
  }
  makeWorld() { return new BarStreetWorld({ position: this.entryPosition }); }
  preload() { super.preload(); this.load.image('bar-street-exterior', `${import.meta.env.BASE_URL}assets/bar/exterior.png`); }
  create() {
    const run = careerProfile.marathonStatus().active;
    if (['running', 'encounter'].includes(run?.status)) { startAt(this, run.checkpoint); return; }
    super.create(); if (this.changingPlace) return;
    this.cameras.main.setFollowOffset(0, 200);
    if (import.meta.env.DEV) window.__barStreet = { scene: this, world: this.world, ui: this.ui };
    this.events.once('shutdown', () => { if (window.__barStreet?.scene === this) delete window.__barStreet; });
  }
  addForeground() {
    const { x, y, width } = BAR_STREET_BUILDING;
    const image = this.add.image(x, y, 'bar-street-exterior').setOrigin(.5, 1).setDepth(y);
    image.setScale(width / image.width);
  }
  addWayfinding() {
    const sign = (x, y, label) => this.add.text(x, y, label, { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '18px',
      color: '#ffdf92', backgroundColor: '#173047', padding: { x: 9, y: 6 } }).setOrigin(.5, 1).setDepth(y);
    sign(190, 910, '← MAISON / GYM'); sign(1790, 605, '← BAR · BILLARD');
  }
  interact() { const nearby = this.world.getNearby(); if (nearby) this.interactDoor(nearby.id); }
  interactDoor(id) {
    if (this.changingPlace || this.world.state.paused || this.ui.dialog || careerMenuOpen() || resumePending()) return;
    const destination = id === 'neighborhood' ? BAR_STREET_NEIGHBORHOOD_RETURN : id === 'bar' ? ISLAND_BAR_ENTRY : null;
    if (!destination) return;
    this.world.releaseControls(); this.persistLocation();
    const result = careerProfile.setLocation(destination); if (!result.ok) return;
    startAt(this, destination);
  }
}
