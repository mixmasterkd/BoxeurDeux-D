import Phaser from 'phaser';
import { SparringScene } from './scenes/SparringScene.js';
import { GymScene } from './scenes/GymScene.js';
import { BagScene } from './scenes/BagScene.js';
import './style.css';
import { installGameLayout } from './ui/GameLayout.js';
import './ui/layout.css';

const disposeLayout = installGameLayout();
const entry = new URLSearchParams(location.search).get('scene');
const scenes = entry === 'bag' ? [BagScene, GymScene, SparringScene]
  : entry === 'sparring' ? [SparringScene, GymScene, BagScene] : [GymScene, SparringScene, BagScene];

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

// Évite de conserver un ancien jeu lors du rechargement par Vite.
if (import.meta.hot) {
  import.meta.hot.dispose(() => { disposeLayout(); game.destroy(true); });
}
