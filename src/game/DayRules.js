// Daily energy is independent from the stamina used during a fight.
import { CUBA_PLACES, MEXICO_PLACES } from './NextChapterRules.js';
import { MARATHON_PLACES } from './MarathonRules.js';
// Prices are paid once when starting a session, including a restarted session.
export const DAILY_ENERGY_MAX = 100;
export const ACTIVITY_COSTS = Object.freeze({
  bag: 15,
  rope: 15,
  speedball: 15,
  shadow: 5,
  sparring: 20,
  lesson: 10,
  fight: 0,
  delivery: 30,
  pads: 10,
  pool: 10,
});

export const HOME_SPAWN = Object.freeze({ scene: 'home', x: 640, y: 540, facing: 'down' });
export const LEGACY_GYM_SPAWN = Object.freeze({ scene: 'gym', x: 640, y: 585, facing: 'down' });
export const WORLD_SCENES = Object.freeze(['home', 'gym', 'neighborhood', 'residential', 'commercial',
  'clothing-shop', 'boxing-shop', 'metro-station', 'metro-riverside', 'riverside',
  'hotel-room', 'hotel-corridor', 'hotel-lobby', 'hotel-gym', 'hotel-pool', 'hotel-venue', 'hotel-restaurant', ...CUBA_PLACES, ...MEXICO_PLACES, ...MARATHON_PLACES,
  'airport', 'metro-train', 'metro-island', 'metro-stadium', 'metro-airport']);
export const WORLD_DIRECTIONS = Object.freeze(['up', 'down', 'left', 'right']);
// Saved coordinates receive a final collision/spawn check when their scene opens.
// This broad bound permits a scrolling neighborhood without trusting arbitrary JSON.
export const LOCATION_LIMIT = 16_384;

export function activityCost(activity) {
  if (!Object.hasOwn(ACTIVITY_COSTS, activity)) throw new Error(`Unknown activity: ${activity}`);
  return ACTIVITY_COSTS[activity];
}

export function freshDaily() {
  return { day: 1, energy: DAILY_ENERGY_MAX, maxEnergy: DAILY_ENERGY_MAX };
}

export function validDaily(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Number.isSafeInteger(value.day) && value.day >= 1
    && Number.isInteger(value.energy) && value.energy >= 0 && value.energy <= DAILY_ENERGY_MAX
    && value.maxEnergy === DAILY_ENERGY_MAX;
}

export function validLocation(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && WORLD_SCENES.includes(value.scene) && WORLD_DIRECTIONS.includes(value.facing)
    && ['x', 'y'].every(axis => typeof value[axis] === 'number' && Number.isFinite(value[axis])
      && value[axis] >= 0 && value[axis] <= LOCATION_LIMIT);
}

export function cleanLocation(value) {
  if (!validLocation(value)) throw new Error('Le lieu de reprise de cette sauvegarde est invalide.');
  return { scene: value.scene, x: value.x, y: value.y, facing: value.facing };
}
