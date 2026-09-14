export function sceneForPlace(place) {
  if (place?.startsWith('mexico-')) return 'MexicoScene';
  if (place?.startsWith('cuba-')) return 'CubaScene';
  if (place?.startsWith('hotel-')) return 'HotelScene';
  if (place?.startsWith('marathon-')) return 'MarathonScene';
  if (place?.startsWith('metro-') || place === 'airport') return 'MetroScene';
  return place === 'gym' ? 'GymScene' : 'ExplorationScene';
}
export function startAt(scene, location) {
  scene.changingPlace = true; scene.ui?.clearInputs(); scene.world?.pause();
  scene.scene.start(sceneForPlace(location.scene), { place: location.scene, location });
}
