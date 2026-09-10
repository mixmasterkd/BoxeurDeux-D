import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import './style.css';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 384,
  height: 288,
  backgroundColor: '#172432',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
});

// Évite de conserver un ancien jeu lors du rechargement par Vite.
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
