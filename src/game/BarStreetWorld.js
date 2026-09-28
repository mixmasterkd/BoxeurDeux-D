import { GymWorld } from './GymWorld.js';
import { doorway, markDoors } from './DoorTravel.js';

export const BAR_STREET_ENTRY = Object.freeze({ scene: 'bar-street', x: 110, y: 760, facing: 'right' });
export const BAR_STREET_NEIGHBORHOOD_RETURN = Object.freeze({ scene: 'neighborhood', x: 2210, y: 716, facing: 'left' });
export const BAR_STREET_BUILDING = Object.freeze({ x: 1450, y: 620, width: 560 });
export const BAR_STREET_BAR_RETURN = Object.freeze({ scene: 'bar-street', x: 1450, y: 710, facing: 'down' });

const rect = (id, x, y, width, height) => ({ id, x, y, width, height });
export const BAR_STREET_LAYOUT = {
  width: 2880, height: 1620, speed: 230,
  footprint: { halfWidth: 14, halfHeight: 7 },
  bounds: { left: 24, right: 2856, top: 230, bottom: 930 },
  spawn: BAR_STREET_ENTRY,
  obstacles: [rect('bar', 1170, 314, 560, 306), rect('buildings-west', 0, 0, 1100, 510), rect('buildings-east', 1940, 0, 940, 510),
    rect('tree-bed-west', 480, 560, 140, 55), rect('tree-bed-east', 2390, 560, 145, 55),
    rect('lamp-west', 61, 572, 34, 42), rect('lamp-west-middle', 645, 572, 32, 42),
    rect('lamp-east-middle', 1970, 572, 32, 42), rect('lamp-east', 2750, 572, 32, 42)],
  stations: [
    { id: 'neighborhood', label: '← Le quartier · Maison et gym', x: 65, y: 760, radius: 84 },
    { id: 'bar', label: 'Bar de l’Île · Billard', x: 1450, y: 635, radius: 84 },
  ],
  doors: [doorway('neighborhood', 24, 675, 60, 170, 'left'), doorway('bar', 1390, 624, 120, 26, 'up')],
};
markDoors(BAR_STREET_LAYOUT);

export class BarStreetWorld extends GymWorld {
  constructor({ position } = {}) {
    super({ layout: BAR_STREET_LAYOUT }); this.place = 'bar-street'; this.restorePosition(position);
  }
  location() { return { scene: this.place, x: Math.round(this.state.x), y: Math.round(this.state.y), facing: this.state.facing }; }
}
