import { ExplorationScene } from './ExplorationScene.js';
import { HomeBarWorld, HOME_BAR_PLACES, HOME_BAR_NAMES, HOME_BAR_ASSETS, HOME_WAKE,
  BAR_BANTER, BAR_BANTER_INTERVAL, homeBarDestination } from '../game/HomeBarWorld.js';
import { careerProfile } from '../game/CareerProfile.js';
import { startAt } from '../game/SceneRouting.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { resumePending } from '../game/ResumeRouting.js';
import { LaptopUI } from '../ui/LaptopUI.js';
import { addMedalDisplay } from './MedalDisplay.js';

const close = { id: 'close', label: 'Continuer la visite' };
let nextBarBanter = 0;

export class HomeBarScene extends ExplorationScene {
  constructor() { super('HomeBarScene'); }
  init(data = {}) {
    const requested = data.place ?? new URLSearchParams(location.search).get('scene');
    const saved = careerProfile.snapshot().location;
    const place = HOME_BAR_PLACES.includes(requested) ? requested : HOME_BAR_PLACES.includes(saved.scene) ? saved.scene : 'home';
    super.init({ ...data, place });
    this.customHome = true; this.actorScale = 2; this.assetPath = HOME_BAR_ASSETS[place];
    this.laptop = null; this.medalDisplay = null; this.people = []; this.banter = null; this.banterText = null; this.banterTime = 0; this.visitTime = 0;
    this.placeCopy = { eyebrow: place === 'island-bar' ? 'MONTRÉAL · SUR L’ÎLE' : 'CHEZ TOI · MONTRÉAL',
      title: HOME_BAR_NAMES[place], welcome: HOME_BAR_NAMES[place],
      hint: place === 'island-bar' ? 'Béton et Kramer sont près du billard. La porte ramène au parc.'
        : place === 'home' ? 'La Xbox au salon, le bureau et le garage en bas, les chambres à l’étage.'
          : place === 'home-bedroom' ? 'Ton lit, ta garde-robe et tes médailles.' : 'Approche-toi des objets. Les portes se franchissent en avançant.',
      pauseText: 'Ta visite et tes résultats de jeux sont sauvegardés. Aucun coût d’énergie.',
      commandsTitle: place === 'island-bar' ? 'Un tour au bar de l’île' : 'La maison agrandie',
      commandsHint: 'Flèches ou WASD pour marcher. Avance dans une porte ou sur l’escalier pour passer à la pièce suivante. E pour parler ou utiliser un objet.' };
  }
  makeWorld() { return new HomeBarWorld({ place: this.place, position: this.entryPosition }); }
  preload() {
    super.preload(); const base = import.meta.env.BASE_URL;
    if (['home', 'home-karl'].includes(this.place)) {
      this.load.image('home-karl-guest', `${base}assets/home/karl-guest.png`);
      this.load.image('home-karl-gaming', `${base}assets/home/karl-gaming.png`);
    }
    if (this.place === 'island-bar') for (const person of ['beton', 'kramer']) this.load.image(`bar-${person}`, `${base}assets/bar/${person}.png`);
  }
  create() {
    const run = careerProfile.marathonStatus().active;
    if (['running', 'encounter'].includes(run?.status)) { startAt(this, run.checkpoint); return; }
    super.create(); if (this.changingPlace) return;
    if (this.place === 'home-office') this.laptop = new LaptopUI(this, { drawArt: false, device: 'desktop' });
    if (this.place === 'home-bedroom') {
      const profile = careerProfile.snapshot();
      const medals = [...profile.tournament.medals, ...profile.marathon.medals.map(medal => ({ ...medal, type: 'marathon' }))];
      const types = ['gold', 'silver', 'bronze', 'participation', 'marathon'].filter(type => medals.some(medal => medal.type === type));
      types.forEach((type, index) => {
        addMedalDisplay(this, [{ type }]);
        this.medalDisplay.setPosition(748 + (index % 3) * 49 - 1210, 76 + Math.floor(index / 3) * 42 - 283).setDepth(238);
      });
    }
    if (!['home', 'home-karl'].includes(this.registry.get('home-karl-place'))) this.registry.set('home-karl-place', 'home-karl');
    this.syncKarl();
    if (this.place === 'island-bar') {
      this.addPerson('beton', 'bar-beton', 440, 466);
      this.addPerson('kramer', 'bar-kramer', 1030, 446);
      this.banterText = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '20px', color: '#fff2cf',
        backgroundColor: '#15263e', padding: { x: 12, y: 9 }, wordWrap: { width: 270 }, align: 'center' })
        .setOrigin(.5, 1).setDepth(1900).setVisible(false);
    }
    if (import.meta.env.DEV) window.__homeBar = { scene: this, world: this.world, ui: this.ui };
    this.events.once('shutdown', () => { if (window.__homeBar?.scene === this) delete window.__homeBar; });
  }
  addPerson(id, key, x, y) {
    // Karl stands roughly one player-head taller; seated art keeps the same proportions.
    const scale = id === 'karl' ? this.actorScale * .6 : .9;
    const sprite = this.add.image(x, y, key).setOrigin(.5, 1).setScale(scale).setDepth(y);
    this.people.push({ id, sprite, x, y });
  }
  syncKarl() {
    for (const person of this.people.filter(person => person.id === 'karl')) person.sprite.destroy();
    this.people = this.people.filter(person => person.id !== 'karl');
    this.world.layout.obstacles = this.world.layout.obstacles.filter(obstacle => obstacle.id !== 'karl-presence');
    const location = this.registry.get('home-karl-place');
    if (this.place === location) {
      if (location === 'home') this.addPerson('karl', 'home-karl-guest', 815, 470);
      else this.addPerson('karl', 'home-karl-gaming', 840, 335);
      const karl = this.people.find(person => person.id === 'karl');
      this.world.layout.obstacles.push({ id: 'karl-presence', x: karl.x - 26, y: karl.y - 14, width: 52, height: 28 });
      this.world.restorePosition(this.world.location());
    }
    const xbox = this.world.layout.stations.find(station => station.id === 'karl-xbox');
    if (xbox) xbox.label = location === 'home' ? 'Karl · Une course sur Xbox' : 'La Xbox · Inviter Karl';
    const laptop = this.world.layout.stations.find(station => station.id === 'gaming-laptop');
    if (laptop) laptop.label = location === 'home-karl' ? 'Karl · À son laptop gaming' : 'Le laptop gaming de Karl';
    this.world.getNearby();
  }
  showXbox() {
    const record = careerProfile.leisureStatus?.().race ?? { playerWins: 0, karlWins: 0 };
    const present = this.registry.get('home-karl-place') === 'home';
    this.ui.showDialog({ speaker: present ? 'KARL · DANS LE SALON' : 'LA XBOX · DANS LE SALON',
      title: present ? 'Une course sur Xbox ?' : 'On invite Karl ?',
      text: present ? `Karl te tend la deuxième manette. « On se fait une course ? »\n\nToi : ${record.playerWins} victoire(s) · Karl : ${record.karlWins}.\nUne partie pour le plaisir, sans mise et sans coût d’énergie.`
        : 'La Xbox et les deux manettes sont prêtes. Karl joue sur son laptop, dans sa chambre à l’étage. Tu peux l’inviter à descendre.',
      actions: present ? [{ id: 'race-karl', label: 'Prendre la deuxième manette' }, { id: 'karl-to-room', label: 'Laisser Karl retourner à son laptop' }, close]
        : [{ id: 'invite-karl', label: 'Inviter Karl au salon' }, close] });
  }
  // Room art already contains furniture; its front edge follows the player's feet.
  addForeground() {
    const pieces = this.place === 'home' ? [[510, 279, 330, 123, 402], [576, 240, 194, 55, 295]]
      : this.place === 'home-office' ? [[500, 145, 360, 155, 300]]
        : this.place === 'home-bedroom' ? [[164, 143, 278, 215, 358]]
          : this.place === 'home-karl' ? [[124, 140, 296, 240, 380], [782, 173, 293, 140, 313], [0, 601, 459, 119, 690], [825, 601, 455, 119, 690]]
            : this.place === 'home-garage' ? [[210, 148, 510, 330, 478]]
              : this.place === 'island-bar' ? [[670, 194, 290, 192, 386], [0, 560, 510, 135, 695], [775, 560, 505, 135, 695]] : this.place === 'home-landing' ? [[0, 520, 477, 146, 666], [810, 520, 470, 146, 666]] : [];
    const key = `world-${this.place}`, source = this.textures.get(key).getSourceImage();
    for (const [x, y, width, height, depth] of pieces) this.add.image(0, 0, key, '__BASE').setOrigin(0).setDisplaySize(1280, 720)
      .setCrop(x * source.width / 1280, y * source.height / 720, width * source.width / 1280, height * source.height / 720).setDepth(depth);
  }
  addWayfinding() {}
  blocked() { return this.changingPlace || this.sleeping || this.world?.state.paused || this.ui?.dialog || careerMenuOpen() || resumePending(); }
  interactDoor(id) {
    if (this.blocked()) return;
    const destination = homeBarDestination(this.place, id); if (!destination) return;
    this.persistLocation(); careerProfile.setLocation(destination); startAt(this, destination);
  }
  interact() {
    if (this.blocked()) return;
    const nearby = this.world.getNearby(); if (!nearby) return;
    const id = nearby.id;
    if (!['karl-xbox', 'gaming-laptop', 'corolla', 'beton', 'kramer', 'billiards'].includes(id)) { super.interact(); return; }
    this.world.releaseControls(); this.persistLocation();
    const show = (speaker, title, text, actions = [close]) => this.ui.showDialog({ speaker, title, text, actions });
    if (id === 'karl-xbox') this.showXbox();
    else if (id === 'gaming-laptop') {
      const present = this.registry.get('home-karl-place') === 'home-karl';
      show(present ? 'KARL · À SON LAPTOP' : 'LA CHAMBRE DE KARL', present ? 'Encore une partie…' : 'Son coin gaming',
        present ? 'Karl est installé devant son laptop gaming, casque sur les oreilles. Il termine sa partie et lève les yeux. « Une course à deux en bas ? J’arrive si tu veux ! »'
          : 'Le laptop gaming et le casque de Karl sont ici. Il t’attend dans le salon avec les manettes de la Xbox.',
        present ? [{ id: 'invite-karl', label: 'Inviter Karl au salon' }, close] : [close]);
    }
    else if (id === 'corolla') show('LE GARAGE', 'La GR Corolla de course', 'La GR Corolla est garée à la maison, avec sa préparation de course et ses outils. Tu peux venir l’admirer de près.\n\nLes sorties en voiture viendront plus tard. La course avec Karl se joue sur la Xbox du salon.');
    else if (id === 'billiards') show('LE BAR DE L’ÎLE', 'Une partie de billard ?', 'Béton et Kramer sont partants. Une table, quelques grandes phrases et une partie amicale. Aucun pari.',
      [{ id: 'pool-beton', label: 'Jouer contre Béton' }, { id: 'pool-kramer', label: 'Jouer contre Kramer' }, close]);
    else {
      const person = id === 'beton' ? 'Béton' : 'Kramer';
      const record = careerProfile.leisureStatus?.().billiards?.[id] ?? { playerWins: 0, opponentWins: 0 };
      const lines = BAR_BANTER.map(line => `${line.name} : « ${line.text} »`).join('\n');
      show(`${person.toUpperCase()} · AU BILLARD`, 'Deux grands caïds… autour d’une table', `${lines}\n\nIls reprennent leur partie avec le même sourire.\n\nContre ${person} : toi ${record.playerWins} · lui ${record.opponentWins}.`,
        [{ id: `pool-${id}`, label: `Jouer contre ${person}` }, close]);
    }
  }
  choose(id) {
    if (!this.ui.dialog || this.changingPlace || this.world.state.paused || careerMenuOpen() || resumePending()) return;
    if (id === 'invite-karl' && ['home', 'home-karl'].includes(this.place)) {
      this.registry.set('home-karl-place', 'home'); this.syncKarl();
      if (this.place === 'home') this.showXbox();
      else this.ui.showDialog({ speaker: 'KARL', title: 'Je descends !', text: 'Karl sauvegarde sa partie, pose son casque et descend au salon. Rejoins-le par l’escalier : la deuxième manette t’attend.', actions: [close] });
      return;
    }
    if (id === 'karl-to-room' && this.place === 'home') {
      this.registry.set('home-karl-place', 'home-karl'); this.syncKarl();
      this.ui.showDialog({ speaker: 'KARL', title: 'À la prochaine course !', text: 'Karl remonte retrouver son laptop. Les scores de vos courses restent sauvegardés.', actions: [close] }); return;
    }
    if (id === 'race-karl' && this.place === 'home' && this.registry.get('home-karl-place') === 'home') { this.startGame('RetroRaceScene'); return; }
    if (['pool-beton', 'pool-kramer'].includes(id) && this.place === 'island-bar') { this.startGame('BilliardsScene', { opponent: id.slice(5) }); return; }
    super.choose(id);
  }
  startGame(scene, options = {}) {
    this.persistLocation(); const returnLocation = this.world.location();
    this.changingPlace = true; this.ui.clearInputs(); this.world.pause();
    this.scene.start(scene, { ...options, returnLocation });
  }
  sleep() {
    if (this.place !== 'home-bedroom') return;
    this.sleepInterrupted = false; this.sleeping = true; this.ui.closeDialog(); this.world.pause();
    const result = careerProfile.sleep();
    if (!result.ok) {
      this.sleeping = false; this.world.resume();
      this.ui.showDialog({ speaker: 'CHEZ TOI', title: 'Avant de dormir', text: result.message, actions: [close] }); return;
    }
    this.world.restorePosition(HOME_WAKE); this.persistLocation(); this.refreshProfile();
    this.cameras.main.fadeOut(450, 7, 16, 24);
    this.cameras.main.once('camerafadeoutcomplete', () => this.time.delayedCall(250, () => {
      this.cameras.main.fadeIn(550, 7, 16, 24);
      this.cameras.main.once('camerafadeincomplete', () => {
        this.sleeping = false;
        if (!this.sleepInterrupted && !this.ui.portraitQuery.matches && !document.hidden) this.world.resume();
        const { day, energy, maxEnergy } = careerProfile.dailyStatus();
        this.ui.showDialog({ speaker: 'BON MATIN', title: `Jour ${day}`, text: `Énergie de journée : ${energy}/${maxEnergy}.\nTes compétences sont conservées. Le salon et le quartier t’attendent.`, actions: [close] });
        this.refreshProfile();
      });
    }));
  }
  renderWorld() { super.renderWorld(); this.shadow.setScale(this.actorScale); }
  update(time, delta) {
    super.update(time, delta);
    if (this.place !== 'island-bar' || !this.world || !this.banterText) return;
    if (this.blocked() || document.hidden) { this.banterText.setVisible(false); this.banter = null; return; }
    this.visitTime += delta;
    if (!this.banter && this.visitTime > 6000 && Date.now() >= nextBarBanter
      && this.people.some(person => Math.hypot(person.x - this.world.state.x, person.y - this.world.state.y) < 290)) {
      this.banter = true; this.banterTime = 0; nextBarBanter = Date.now() + BAR_BANTER_INTERVAL;
    }
    if (!this.banter) return;
    this.banterTime += delta;
    const line = BAR_BANTER[Math.floor(this.banterTime / 4500)];
    if (!line) { this.banter = null; this.banterText.setVisible(false); return; }
    const person = this.people.find(person => person.id === line.speaker);
    this.banterText.setText(line.text).setPosition(person.x, person.y - 190).setVisible(true);
  }
}
