import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_SCENES } from '../src/game/DayRules.js';
import { MUSIC_PLACES, musicTrackForPlace, musicTrackForScene, musicPlaybackForScene } from '../src/audio/MusicPlaces.js';

const scene = (key, data = {}) => ({ sys: { settings: { key } }, ui: {}, ...data });

test('every saved location selects an existing theme, keeping casino exterior on the island', () => {
  for (const place of WORLD_SCENES) assert.ok(Object.hasOwn(MUSIC_PLACES, musicTrackForPlace(place)), place);
  for (const [place, theme] of Object.entries({ home: 'home', gym: 'gym', neighborhood: 'city', commercial: 'shops', 'boxing-shop': 'shops',
    'metro-train': 'metro', airport: 'metro', 'casino-island': 'island', 'marathon-island': 'island',
    'casino-lobby': 'casino', 'casino-tables': 'casino', 'casino-poker': 'casino', 'hotel-gym': 'hotel', 'cuba-home': 'cuba', 'mexico-gym': 'mexico' })) {
    assert.equal(musicTrackForPlace(place), theme, place);
  }
});

test('activities follow their host, and every fight takes precedence over travel and marathon', () => {
  assert.equal(musicTrackForScene(scene('SparringScene', { fromCuba: true, place: 'cuba-gym' })), 'bout');
  assert.equal(musicTrackForScene(scene('SparringScene', { returnScene: 'MarathonScene' })), 'bout');
  assert.equal(musicTrackForScene(scene('MarathonScene', { place: 'marathon-island', isRunning: () => true })), 'marathon');
  assert.equal(musicTrackForScene(scene('MarathonScene', { place: 'marathon-island', isRunning: () => false })), 'island');
  assert.equal(musicTrackForScene(scene('BagScene')), 'gym');
  assert.equal(musicTrackForScene(scene('BagScene', { fromCuba: true })), 'cuba');
  assert.equal(musicTrackForScene(scene('ShadowScene', { activityReturn: { place: 'cuba-gym' } })), 'cuba');
  assert.equal(musicTrackForScene(scene('HotelActivityScene', { place: 'hotel-gym', fromGym: true })), 'gym');
  assert.equal(musicTrackForScene(scene('HotelActivityScene', { fromMexico: true, fromGym: true })), 'mexico');
  assert.equal(musicTrackForScene(scene('HotelActivityScene', { place: 'hotel-pool' })), 'hotel');
});

test('true interruptions stop transport while conversations only lower music', () => {
  const walking = scene('CasinoScene', { place: 'casino-tables', world: { state: { paused: false } } });
  assert.deepEqual(musicPlaybackForScene(walking), { trackId: 'casino', paused: false, ducked: false });
  assert.deepEqual(musicPlaybackForScene({ ...walking, ui: { dialog: {} } }), { trackId: 'casino', paused: false, ducked: true });
  for (const reason of ['hidden', 'blurred', 'portrait', 'careerMenu', 'loading', 'resumePending']) {
    assert.equal(musicPlaybackForScene(walking, { [reason]: true }).paused, true, reason);
  }
  for (const patch of [{ changingPlace: true }, { changing: true }, { sleeping: true }, { ui: null },
    { world: { state: { paused: true } } }, { session: { state: { phase: 'paused' } } },
    ...[{ paused: true }, { destroyed: true }, { commandsOpen: true }, { journal: { isOpen: true } },
      { activityOptions: { isOpen: true } }].map(ui => ({ ui }))]) {
    assert.equal(musicPlaybackForScene({ ...walking, ...patch }).paused, true, JSON.stringify(patch));
  }
  assert.deepEqual(musicPlaybackForScene(null), { trackId: null, paused: true, ducked: false });
});
