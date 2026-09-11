import Phaser from 'phaser';
import { SparringScene } from './scenes/SparringScene.js';
import { GymScene } from './scenes/GymScene.js';
import { BagScene } from './scenes/BagScene.js';
import { ShadowScene } from './scenes/ShadowScene.js';
import { RhythmScene } from './scenes/RhythmScene.js';
import { ExplorationScene } from './scenes/ExplorationScene.js';
import { careerProfile } from './game/CareerProfile.js';
import { resumePending, requestResume, clearResume } from './game/ResumeRouting.js';
import './style.css';
import { installGameLayout } from './ui/GameLayout.js';
import './ui/layout.css';
import { installCareerMenu } from './ui/CareerMenu.js';
import { installSceneLoading } from './ui/SceneLoading.js';

const disposeLayout = installGameLayout();
const disposeCareer = installCareerMenu();
const entry = new URLSearchParams(location.search).get('scene');
const initialScene = { gym: GymScene, home: ExplorationScene, neighborhood: ExplorationScene, bag: BagScene, sparring: SparringScene, fight: SparringScene, shadow: ShadowScene, speedball: RhythmScene, rope: RhythmScene }[entry]
  ?? (careerProfile.snapshot().location.scene === 'gym' ? GymScene : ExplorationScene);
const scenes = [initialScene, ...[ExplorationScene, GymScene, SparringScene, BagScene, ShadowScene, RhythmScene].filter(scene => scene !== initialScene)];

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#172432',
  pixelArt: true,
  roundPixels: true,
  // Sounds are synthesized by SparringAudio, unlocked by a user gesture.
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: scenes,
});
const disposeLoading = installSceneLoading(game);

const routing = new AbortController();
function resumeSavedPlace() {
  if (!resumePending()) return;
  const active = game.scene.getScenes(true)[0];
  if (!active) return;
  const saved = careerProfile.snapshot().location;
  game.registry.remove('gym-world');
  active.changingPlace = true;
  active.world?.pause();
  active.ui?.clearInputs();
  clearResume();
  if (saved.scene === 'gym') active.scene.start('GymScene', { location: saved });
  else active.scene.start('ExplorationScene', { place: saved.scene, location: saved });
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
    disposeLoading(); disposeLayout(); disposeCareer(); game.destroy(true);
  });
}
