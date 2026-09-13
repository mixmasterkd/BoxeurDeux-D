// Arrival and reload never trigger a return trip. A doorway arms only after
// the player is outside its threshold, and crossing requires directional input.
export class DoorTravel {
  constructor(doors, position) {
    this.doors = doors;
    this.latched = new Set(doors.filter(door => inside(door, position, 12)).map(door => door.id));
  }
  update(position, input, blocked = false) {
    if (blocked) return null;
    for (const door of this.doors) {
      if (!inside(door, position, 12)) this.latched.delete(door.id);
      const toward = door.direction === 'up' ? input.y < -.15 : door.direction === 'down' ? input.y > .15
        : door.direction === 'left' ? input.x < -.15 : input.x > .15;
      if (!this.latched.has(door.id) && toward && inside(door, position)) {
        this.latched.add(door.id);
        return door.id;
      }
    }
    return null;
  }
}
function inside(door, position, margin = 0) {
  return position.x >= door.x - margin && position.x <= door.x + door.width + margin
    && position.y >= door.y - margin && position.y <= door.y + door.height + margin;
}
export const doorway = (id, x, y, width, height, direction) => ({ id, x, y, width, height, direction });
export function markDoors(layout) {
  for (const station of layout.stations) if (layout.doors?.some(door => door.id === station.id)) station.autoTravel = true;
  return layout;
}
