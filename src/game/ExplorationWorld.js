import { GymWorld } from './GymWorld.js';
import { doorway, markDoors } from './DoorTravel.js';

// The map is larger than the camera. These measured landmarks use the source
// image's coordinates, uniformly scaled into the world (never a stretched view).
export const STREET_SCALE = 1.5;
const rect = (id, x, y, width, height) => ({ id, x: x * STREET_SCALE, y: y * STREET_SCALE, width: width * STREET_SCALE, height: height * STREET_SCALE });
const station = (id, label, x, y, radius = 62) => ({ id, label, x: x * STREET_SCALE, y: y * STREET_SCALE, radius: radius * STREET_SCALE });
export const NEIGHBORHOOD_LAYOUT = {
  width: 2379, height: 1488, speed: 230,
  footprint: { halfWidth: 14, halfHeight: 7 },
  bounds: { left: 55 * STREET_SCALE, right: 1530 * STREET_SCALE, top: 140 * STREET_SCALE, bottom: 965 * STREET_SCALE },
  spawn: { x: 272 * STREET_SCALE, y: 366 * STREET_SCALE, facing: 'down' },
  obstacles: [
    rect('maison', 137, 0, 280, 329), rect('gym', 568, 0, 390, 329), rect('salle', 1084, 0, 374, 340),
    rect('cloture-ruelle-ouest', 417, 138, 151, 15), rect('cloture-ruelle-est', 958, 138, 126, 15),
    rect('chantier-est', 1504, 406, 82, 154),
    rect('chantier-sud', 717, 920, 167, 72), rect('cone-sud-ouest', 695, 940, 24, 42), rect('cone-sud-est', 854, 900, 28, 41),
    rect('commerces', 982, 567, 532, 292),
    rect('parc-nord', 55, 593, 607, 16), rect('parc-est', 650, 609, 17, 318),
    rect('parc-sud-ouest', 55, 883, 250, 45), rect('parc-sud-est', 389, 883, 278, 45),
    rect('massif-central', 298, 726, 210, 83), rect('banc-nord', 200, 648, 98, 22),
    rect('banc-ouest', 61, 770, 78, 25), rect('banc-est', 457, 824, 92, 24),
    rect('arbre-maison', 72, 374, 62, 18), rect('arbre-gym', 905, 378, 58, 22), rect('arbre-salle', 1437, 378, 44, 22),
    rect('lampadaire-maison', 430, 380, 27, 13), rect('borne-incendie', 490, 379, 24, 15),
    rect('lampadaire-gym', 975, 380, 28, 13), rect('lampadaire-salle', 1500, 379, 30, 18),
    rect('jardin-commerce', 891, 724, 83, 130),
  ],
  stations: [
    station('home', 'Chez toi · 1736', 272, 335), station('gym', 'Le gym du quartier', 752, 336),
    station('fight', 'Salle de boxe · Les rencontres', 1267, 341), station('depanneur-84', '84, avenue du Gym · Dépanneur', 1095, 873, 52),
    station('to-metro', 'Métro · Station du Quartier', 1365, 874, 52), station('to-residential', 'Rue des livreurs · Passage ouvert', 70, 477, 67),
    station('works-east', 'Rue barrée', 1492, 477, 67), station('works-south', 'Travaux en cours', 778, 892, 67),
  ],
};

export const HOME_LAYOUT = {
  width: 1280, height: 720, speed: 200,
  footprint: { halfWidth: 28, halfHeight: 14 },
  bounds: { left: 43, right: 1234, top: 213, bottom: 666 },
  spawn: { x: 640, y: 540, facing: 'down' },
  obstacles: [
    { id: 'armoire', x: 79, y: 205, width: 163, height: 77 },
    { id: 'cuisine', x: 319, y: 160, width: 233, height: 58 },
    { id: 'lit', x: 988, y: 171, width: 218, height: 192 },
    { id: 'chevet', x: 936, y: 157, width: 49, height: 60 },
    { id: 'table', x: 43, y: 462, width: 91, height: 177 },
    { id: 'chaise', x: 135, y: 527, width: 51, height: 111 },
    { id: 'banc-entree', x: 43, y: 294, width: 40, height: 120 },
    { id: 'buffet', x: 1197, y: 396, width: 40, height: 151 },
    { id: 'trophees', x: 1207, y: 276, width: 40, height: 83 },
  ],
  stations: [
    { id: 'bed', label: 'Ton lit · Passer au lendemain', x: 969, y: 322, radius: 84 },
    { id: 'exit', label: 'Sortir dans le quartier', x: 640, y: 655, radius: 58 },
    { id: 'wardrobe', label: 'Ta garde-robe', x: 164, y: 291, radius: 60 },
    { id: 'notebook', label: 'Carnet de boxe', x: 213, y: 545, radius: 64 },
    { id: 'medals', label: 'Tes médailles', x: 1175, y: 385, radius: 74 },
  ],
};

NEIGHBORHOOD_LAYOUT.doors = [doorway('home',360,497,96,24,'up'), doorway('gym',1070,500,116,24,'up'), doorway('fight',1840,512,124,24,'up'), doorway('to-residential',82,625,52,170,'left'), doorway('to-metro',1980,1285,138,35,'up')];
HOME_LAYOUT.doors = [doorway('exit',586,643,108,38,'down')];
markDoors(NEIGHBORHOOD_LAYOUT); markDoors(HOME_LAYOUT);

export const WORLD_ENTRANCES = {
  home: { x: 408, y: 550, facing: 'down' },
  gym: { x: 1128, y: 555, facing: 'down' },
  fight: { x: 1900, y: 562, facing: 'down' },
};

export function canStand(layout, position) {
  const { x, y } = position ?? {}, { halfWidth: w, halfHeight: h } = layout.footprint;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x - w < layout.bounds.left || x + w > layout.bounds.right
    || y - h < layout.bounds.top || y + h > layout.bounds.bottom) return false;
  return !layout.obstacles.some(r => x + w > r.x && x - w < r.x + r.width && y + h > r.y && y - h < r.y + r.height);
}

export class ExplorationWorld extends GymWorld {
  constructor({ place = 'home', position } = {}) {
    const layout = place === 'neighborhood' ? NEIGHBORHOOD_LAYOUT : HOME_LAYOUT;
    super({ layout: structuredClone(layout) });
    this.place = place;
    // Imported positions never place the player inside furniture or a wall.
    if (canStand(layout, position)) Object.assign(this.state, { x: position.x, y: position.y,
      facing: ['up', 'down', 'left', 'right'].includes(position.facing) ? position.facing : 'down' });
    this.getNearby();
  }
  location() { return { scene: this.place, x: Math.round(this.state.x), y: Math.round(this.state.y), facing: this.state.facing }; }
}
