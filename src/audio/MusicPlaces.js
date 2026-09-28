/** Place selection stays separate from the synthesizer and from saved careers. */
export const MUSIC_PLACES = Object.freeze({
  home: 'Chez toi', city: 'Le quartier', gym: 'Le gym', shops: 'Les boutiques',
  metro: 'Le métro', island: 'Les îles', casino: 'Le casino', hotel: 'L’hôtel',
  cuba: 'Cuba', mexico: 'Le Mexique', marathon: 'Le marathon', bout: 'Le ring',
});

export function musicTrackForPlace(place = '') {
  if (place === 'home') return 'home';
  if (place === 'gym') return 'gym';
  if (place === 'commercial' || place.endsWith('-shop')) return 'shops';
  if (place === 'airport' || place.startsWith('metro-')) return 'metro';
  if (place === 'casino-island' || place === 'marathon-island') return 'island';
  if (place.startsWith('casino-')) return 'casino';
  if (place.startsWith('hotel-')) return 'hotel';
  if (place.startsWith('cuba-')) return 'cuba';
  if (place.startsWith('mexico-')) return 'mexico';
  return 'city';
}

export function musicTrackForScene(scene) {
  if (!scene) return null;
  const key = scene.sys?.settings?.key;
  // A ring keeps its own theme, including a bout on the marathon course.
  if (key === 'SparringScene') return 'bout';
  if (key === 'MarathonScene' && scene.isRunning?.()) return 'marathon';
  if (scene.fromMexico) return 'mexico';
  if (scene.fromCuba || scene.activityReturn?.place?.startsWith('cuba-')) return 'cuba';
  if (scene.fromGym) return 'gym';
  if (['GymScene', 'BagScene', 'ShadowScene', 'RhythmScene'].includes(key)) return 'gym';
  if (key === 'CasinoIslandScene') return 'island';
  if (key === 'CasinoScene') return 'casino';
  if (key === 'CubaScene') return 'cuba';
  if (key === 'MexicoScene') return 'mexico';
  if (key === 'MetroScene') return 'metro';
  return musicTrackForPlace(scene.place);
}

/** Read-only policy: a conversation lowers music; a real pause stops its clock. */
export function musicPlaybackForScene(scene, environment = {}) {
  const ui = scene?.ui;
  const phase = scene?.session?.state?.phase ?? ui?.phase;
  const paused = Boolean(!scene || !ui || ui.destroyed || environment.hidden || environment.blurred
    || environment.portrait || environment.careerMenu || environment.loading || environment.resumePending
    || scene.changingPlace || scene.changing || scene.sleeping || scene.world?.state?.paused
    || ui.paused || phase === 'paused' || ui.commandsOpen || ui.pendingCareerImport
    || ui.journal?.isOpen || ui.activityOptions?.isOpen);
  return { trackId: musicTrackForScene(scene), paused, ducked: Boolean(!paused && ui?.dialog) };
}
