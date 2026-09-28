import { GymWorld } from './GymWorld.js';
import { doorway, markDoors } from './DoorTravel.js';

export const HOME_BAR_PLACES = Object.freeze(['home', 'home-office', 'home-garage', 'home-landing', 'home-bedroom', 'home-karl', 'island-bar']);
export const HOME_BAR_NAMES = Object.freeze({
  home: 'Chez toi · Le salon', 'home-office': 'La salle d’ordinateur', 'home-garage': 'Le garage',
  'home-landing': 'L’étage des chambres', 'home-bedroom': 'Ta chambre', 'home-karl': 'La chambre de Karl',
  'island-bar': 'Le petit bar de l’île',
});
export const HOME_BAR_ASSETS = Object.freeze({
  home: 'assets/home/living.png', 'home-office': 'assets/home/office.png', 'home-garage': 'assets/home/garage.png',
  'home-landing': 'assets/home/landing.png', 'home-bedroom': 'assets/home/bedroom.png', 'home-karl': 'assets/home/karl.png',
  'island-bar': 'assets/bar/interior.png',
});
export const HOME_ENTRY = Object.freeze({ scene: 'home', x: 640, y: 610, facing: 'up' });
export const HOME_RACE_RETURN = Object.freeze({ scene: 'home', x: 770, y: 580, facing: 'up' });
export const HOME_WAKE = Object.freeze({ scene: 'home-bedroom', x: 510, y: 445, facing: 'down' });
export const ISLAND_BAR_ENTRY = Object.freeze({ scene: 'island-bar', x: 640, y: 610, facing: 'up' });
export const ISLAND_BAR_RETURN = Object.freeze({ scene: 'marathon-island', x: 440, y: 800, facing: 'down' });
export const ISLAND_BAR_BUILDING = Object.freeze({ x: 440, y: 724, width: 560 });
export const ISLAND_BAR_RETURNS = Object.freeze({
  beton: { scene: 'island-bar', x: 440, y: 535, facing: 'up' },
  kramer: { scene: 'island-bar', x: 1030, y: 520, facing: 'up' },
});
export const BAR_BANTER = Object.freeze([
  { speaker: 'beton', name: 'Béton', text: 'Yo tu cé pas chui qui man !' },
  { speaker: 'kramer', name: 'Kramer', text: 'Non TOI tu cé pas chui qui man !' },
]);
export const BAR_BANTER_INTERVAL = 100_000;

const rect = (id, x, y, width, height) => ({ id, x, y, width, height });
const station = (id, label, x, y, radius = 86) => ({ id, label, x, y, radius });
const exit = label => station('exit', label, 640, 660, 55);
const exitDoor = () => doorway('exit', 575, 648, 130, 38, 'down');
const common = { width: 1280, height: 720, speed: 210, actorScale: 2,
  footprint: { halfWidth: 24, halfHeight: 12 }, bounds: { left: 48, right: 1232, top: 216, bottom: 690 } };
const room = (obstacles, stations) => ({ ...common, spawn: { x: 640, y: 610, facing: 'up' }, obstacles, stations, doors: [exitDoor()] });

export const HOME_BAR_LAYOUTS = {
  home: {
    ...common, spawn: HOME_ENTRY,
    obstacles: [rect('tv', 548, 216, 255, 14), rect('sofa', 510, 279, 330, 123), rect('coffee-table', 576, 240, 194, 55),
      rect('garage-shelf', 135, 216, 83, 86), rect('stairs-right', 1018, 216, 90, 42), rect('bookcase', 1110, 216, 65, 75), rect('sideboard', 1180, 319, 100, 186)],
    stations: [exit('Sortir dans le quartier'), station('garage', 'Le garage', 80, 315, 58),
      station('office', 'La salle d’ordinateur', 374, 225, 58), station('upstairs', 'Monter aux chambres', 980, 245, 70),
      station('karl-xbox', 'Karl · Une course sur Xbox', 770, 515, 90)],
    doors: [exitDoor(), doorway('garage', 48, 286, 60, 59, 'left'), doorway('office', 320, 210, 110, 28, 'up'),
      doorway('upstairs', 945, 216, 72, 43, 'up')],
  },
  'home-office': room([rect('desk', 500, 216, 360, 62), rect('office-chair', 610, 260, 87, 38), rect('shelves-west', 85, 216, 166, 65), rect('shelves-east', 1000, 216, 175, 69), rect('office-sideboard', 1180, 278, 100, 210)],
    [exit('Retour au salon'), station('laptop', 'Ton ordinateur · Bureau et Internet', 660, 324)]),
  'home-garage': room([rect('corolla', 210, 164, 510, 314), rect('workbench', 770, 216, 330, 34), rect('tools-west', 48, 216, 125, 130), rect('tools-east', 1195, 260, 85, 230)],
    [exit('Retour au salon'), station('corolla', 'GR Corolla · Voiture de course', 790, 460, 95)]),
  'home-landing': {
    ...room([rect('landing-bench', 550, 216, 200, 94), rect('landing-railing-west', 0, 530, 475, 190), rect('landing-railing-east', 810, 530, 470, 190)], [exit('Redescendre au salon'),
      station('bedroom', 'Ta chambre', 345, 292, 60), station('karl-room', 'La chambre de Karl', 940, 292, 60)]),
    bounds: { left: 110, right: 1150, top: 276, bottom: 690 },
    doors: [exitDoor(), doorway('bedroom', 286, 277, 118, 32, 'up'), doorway('karl-room', 880, 277, 120, 32, 'up')],
  },
  'home-bedroom': room([rect('bed', 164, 143, 278, 215), rect('wardrobe', 945, 216, 173, 58), rect('bedside', 122, 216, 80, 52), rect('bedroom-left-dresser', 0, 299, 69, 196), rect('bedroom-right-shelf', 1176, 290, 104, 187)],
    [exit('Retour au palier'), station('bed', 'Ton lit · Passer au lendemain', 500, 385, 95),
      station('wardrobe', 'Ta garde-robe', 1032, 306, 82), station('medals', 'Tes médailles', 805, 276, 80)]),
  'home-karl': room([rect('karl-bed', 124, 140, 296, 240), rect('gaming-desk', 782, 216, 293, 97), rect('karl-left-shelf', 0, 216, 105, 225), rect('karl-right-shelf', 1113, 316, 167, 280), rect('karl-front-west', 0, 601, 459, 119), rect('karl-front-east', 825, 601, 455, 119)],
    [exit('Retour au palier'), station('gaming-laptop', 'Le laptop gaming de Karl', 925, 370, 90)]),
  'island-bar': room([rect('bar-counter', 95, 150, 433, 126), rect('pool-table', 674, 196, 280, 190),
    rect('bar-stool-1', 158, 216, 55, 86), rect('bar-stool-2', 263, 216, 56, 86), rect('bar-stool-3', 368, 216, 54, 86),
    rect('bar-left-table', 76, 302, 103, 138), rect('bar-booths', 1080, 216, 200, 336), rect('bar-front-west', 0, 567, 510, 123), rect('bar-front-east', 775, 567, 505, 123),
    rect('beton', 422, 444, 36, 28), rect('kramer', 1012, 424, 36, 28)],
    [exit('Retour à l’île et au métro'), station('beton', 'Béton · Billard et grandes phrases', 440, 472, 90),
      station('kramer', 'Kramer · Billard et répartie', 1030, 452, 90), station('billiards', 'La table de billard', 810, 416, 90)]),
};
for (const layout of Object.values(HOME_BAR_LAYOUTS)) markDoors(layout);

const DESTINATIONS = {
  home: { exit: { scene: 'neighborhood', x: 408, y: 550, facing: 'down' },
    office: { scene: 'home-office', x: 640, y: 610, facing: 'up' },
    garage: { scene: 'home-garage', x: 640, y: 610, facing: 'up' },
    upstairs: { scene: 'home-landing', x: 640, y: 610, facing: 'up' } },
  'home-office': { exit: { scene: 'home', x: 374, y: 290, facing: 'down' } },
  'home-garage': { exit: { scene: 'home', x: 135, y: 350, facing: 'right' } },
  'home-landing': { exit: { scene: 'home', x: 980, y: 315, facing: 'down' },
    bedroom: { scene: 'home-bedroom', x: 640, y: 610, facing: 'up' },
    'karl-room': { scene: 'home-karl', x: 640, y: 610, facing: 'up' } },
  'home-bedroom': { exit: { scene: 'home-landing', x: 345, y: 345, facing: 'down' } },
  'home-karl': { exit: { scene: 'home-landing', x: 940, y: 345, facing: 'down' } },
  'island-bar': { exit: ISLAND_BAR_RETURN },
};

export function homeBarDestination(place, door) {
  const destination = DESTINATIONS[place]?.[door];
  return destination ? { ...destination } : null;
}

export class HomeBarWorld extends GymWorld {
  constructor({ place = 'home', position } = {}) {
    if (!HOME_BAR_PLACES.includes(place)) place = 'home';
    super({ layout: HOME_BAR_LAYOUTS[place] }); this.place = place; this.restorePosition(position);
  }
  location() { return { scene: this.place, x: Math.round(this.state.x), y: Math.round(this.state.y), facing: this.state.facing }; }
}
