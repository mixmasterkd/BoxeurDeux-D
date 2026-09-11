import Phaser from 'phaser';
import { SparringScene } from './scenes/SparringScene.js';
import { GymScene } from './scenes/GymScene.js';
import './style.css';

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
  scene: new URLSearchParams(location.search).get('scene') === 'sparring'
    ? [SparringScene, GymScene] : [GymScene, SparringScene],
});

// Évite de conserver un ancien jeu lors du rechargement par Vite.
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
