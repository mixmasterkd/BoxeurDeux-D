import Phaser from 'phaser';
import { SparringScene } from './scenes/SparringScene.js';
import { GymScene } from './scenes/GymScene.js';
import { BagScene } from './scenes/BagScene.js';
import { ShadowScene } from './scenes/ShadowScene.js';
import { RhythmScene } from './scenes/RhythmScene.js';
import { ExplorationScene } from './scenes/ExplorationScene.js';
import { HotelScene } from './scenes/HotelScene.js';
import { HotelActivityScene } from './scenes/HotelActivityScene.js';
import { MarathonScene } from './scenes/MarathonScene.js';
import { CasinoScene } from './scenes/CasinoScene.js';
import { CasinoIslandScene } from './scenes/CasinoIslandScene.js';
import { BarStreetScene } from './scenes/BarStreetScene.js';
import { HomeBarScene } from './scenes/HomeBarScene.js';
import { BilliardsScene } from './scenes/BilliardsScene.js';
import { RetroRaceScene } from './scenes/RetroRaceScene.js';
import { MetroScene } from './scenes/MetroScene.js';
import { MexicoScene } from './scenes/MexicoScene.js';
import { sceneForPlace } from './game/SceneRouting.js';
import { CubaScene } from './scenes/CubaScene.js';
import { careerProfile } from './game/CareerProfile.js';
import { resumePending, requestResume, clearResume } from './game/ResumeRouting.js';
import './style.css';
import { installGameLayout } from './ui/GameLayout.js';
import './ui/layout.css';
import { installCareerMenu } from './ui/CareerMenu.js';
import { installSceneLoading } from './ui/SceneLoading.js';
import { installGameMusic } from './audio/GameMusic.js';
import './ui/snes.css';

const disposeLayout = installGameLayout();
const disposeCareer = installCareerMenu();
const entry = new URLSearchParams(location.search).get('scene');
const saved=careerProfile.snapshot();
const savedPlace=saved.mexico?.active?(saved.location.scene.startsWith('mexico-')?saved.location.scene:'mexico-home'):saved.cuba?.active?(saved.location.scene.startsWith('cuba-')?saved.location.scene:'cuba-home'):saved.location.scene;
const placeScenes={ExplorationScene,GymScene,CubaScene,MexicoScene,HotelScene,MetroScene,MarathonScene,CasinoScene,CasinoIslandScene,BarStreetScene,HomeBarScene};
const activityScenes={bag:BagScene,sparring:SparringScene,fight:SparringScene,shadow:ShadowScene,speedball:RhythmScene,rope:RhythmScene,pads:HotelActivityScene,pool:HotelActivityScene,'retro-race':RetroRaceScene,billiards:BilliardsScene};
// A committed casino hand must resume before a debug URL can start another activity.
const effectiveEntry=saved.casino?.active&&!saved.casino.active.settled?savedPlace:entry;
const initialScene=activityScenes[effectiveEntry]??placeScenes[sceneForPlace(effectiveEntry??savedPlace)];
const scenes=[initialScene,...[ExplorationScene,GymScene,SparringScene,BagScene,ShadowScene,RhythmScene,HotelScene,HotelActivityScene,CubaScene,MexicoScene,MetroScene,MarathonScene,CasinoScene,CasinoIslandScene,BarStreetScene,HomeBarScene,BilliardsScene,RetroRaceScene].filter(scene=>scene!==initialScene)];

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#172432',
  pixelArt: true,
  roundPixels: true,
  // Music and effects use separate Web Audio mixers, unlocked by a real user gesture.
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: scenes,
});
const disposeLoading = installSceneLoading(game);
const disposeMusic = installGameMusic(game);

const routing = new AbortController();
function resumeSavedPlace() {
  if (!resumePending()) return;
  const active = game.scene.getScenes(true)[0];
  if (!active) return;
  const saved = careerProfile.snapshot().location;
  game.registry.remove('gym-world');
  // Each world resets its own transition flag in init; do not inject a stale
  // changingPlace property into hotel/travel scenes or training activities.
  if (Object.hasOwn(active, 'changingPlace')) active.changingPlace = true;
  else if (Object.hasOwn(active, 'changing')) active.changing = true;
  active.world?.pause();
  active.ui?.clearInputs();
  clearResume();
  if (careerProfile.snapshot().mexico?.active || saved.scene.startsWith('mexico-')) active.scene.start('MexicoScene',{place:saved.scene.startsWith('mexico-')?saved.scene:'mexico-home',location:saved.scene.startsWith('mexico-')?saved:undefined});
  else if (careerProfile.snapshot().cuba?.active || saved.scene.startsWith('cuba-')) active.scene.start('CubaScene', { place: saved.scene.startsWith('cuba-') ? saved.scene : 'cuba-home', location: saved.scene.startsWith('cuba-') ? saved : undefined });
  else if (saved.scene === 'gym') active.scene.start('GymScene', { location: saved });
  else if(saved.scene.startsWith('hotel-')) active.scene.start('HotelScene',{place:saved.scene,location:saved});
  else active.scene.start(sceneForPlace(saved.scene), { place: saved.scene, location: saved });
}
window.addEventListener('career-menu-change', event => { if (!event.detail.open) requestResume(); }, { signal: routing.signal });
window.addEventListener('career-imported', requestResume, { signal: routing.signal });
// LOADING scenes are absent from getScenes(true). Retry on the next game step
// instead of discarding a Continue/New/import choice made during their preload.
game.events.on('poststep', resumeSavedPlace);

// Évite de conserver un ancien jeu lors du rechargement par Vite.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    routing.abort(); game.events.off('poststep', resumeSavedPlace); clearResume();
    disposeMusic(); disposeLoading(); disposeLayout(); disposeCareer(); game.destroy(true);
  });
}
