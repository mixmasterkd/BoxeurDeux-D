// Fictional compact network inspired by Montreal; labels include the useful destination.
export const METRO_STATIONS = Object.freeze([
  { id: 'metro-station', name: 'Quartier', attraction: 'Maison · gym · salle de boxe', outside: 'neighborhood', exitScene: 'ExplorationScene', exit: { x: 2047, y: 1375, facing: 'down' } },
  { id: 'metro-riverside', name: 'Des Rives', attraction: 'Place · kiosque voyages', outside: 'riverside', exitScene: 'ExplorationScene', exit: { x: 1200, y: 1320, facing: 'down' } },
  { id: 'metro-island', name: 'Île Sainte-Hélène', attraction: 'Île · départ du marathon', outside: 'marathon-island', exitScene: 'MarathonScene', exit: { x: 428, y: 1375, facing: 'down' } },
  { id: 'metro-stadium', name: 'Stade olympique', attraction: 'Stade · arrivée du marathon', outside: 'marathon-stadium', exitScene: 'MarathonScene', exit: { x: 2370, y: 1500, facing: 'down' } },
  { id: 'metro-airport', name: 'Aéroport', attraction: 'Vols pour Cuba et le Mexique', outside: 'airport', exitScene: 'MetroScene', exit: { x: 640, y: 435, facing: 'up' } },
].map(station => Object.freeze({ ...station, exit: Object.freeze(station.exit) })));
export const METRO_STATION_IDS = Object.freeze(METRO_STATIONS.map(station => station.id));
export const METRO_HALLS = Object.freeze(METRO_STATION_IDS.map(id => `${id}-hall`));
export const METRO_RETURN_PLATFORMS = Object.freeze(METRO_STATION_IDS.map(id => `${id}-return`));
export const METRO_PLACES = Object.freeze([...METRO_STATION_IDS, ...METRO_HALLS, ...METRO_RETURN_PLATFORMS, 'metro-train', 'airport']);
export const METRO_EXITS = Object.freeze(Object.fromEntries(METRO_STATIONS.map(station => [station.id,
  Object.freeze({ scene: station.exitScene, place: station.outside, location: Object.freeze({ scene: station.outside, ...station.exit }) })])));
export function metroStation(id) { return METRO_STATIONS.find(station => station.id === id?.replace(/-(?:hall|return)$/, '')) ?? METRO_STATIONS[0]; }
export function metroDirection(station, direction = 1) {
  const index = METRO_STATION_IDS.indexOf(metroStation(station).id);
  if (index <= 0) return 1;
  if (index >= METRO_STATIONS.length - 1) return -1;
  return direction === -1 ? -1 : 1;
}
export function metroTerminus(direction) { return direction === -1 ? METRO_STATIONS[0] : METRO_STATIONS.at(-1); }
export function metroPlatformLocation(station, direction=1) {
  const id=metroStation(station).id, backward=metroDirection(id,direction)===-1;
  return { scene: backward ? `${id}-return` : id, x:640,y:420,facing:'down' };
}
export function metroHallLocation(station) { return { scene:`${metroStation(station).id}-hall`, x:640,y:610,facing:'up' }; }
export const metroMapRows = () => METRO_STATIONS.map(station => `${station.name} — ${station.attraction}`);
