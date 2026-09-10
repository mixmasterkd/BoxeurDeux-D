import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const decor = this.add.graphics();

    // Décor géométrique provisoire, à remplacer par les futurs sprites.
    decor.fillStyle(0x1c2c3c);
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        decor.fillRect(column * 48 - (row % 2) * 24, row * 18, 46, 16);
      }
    }
    decor.fillStyle(0x111925);
    decor.fillRect(0, 126, 384, 162);
    decor.fillStyle(0x304657);
    decor.fillRect(0, 124, 384, 4);

    this.add.text(192, 30, 'BoxeurDeux-D', {
      fontFamily: 'monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f5d486',
    }).setOrigin(0.5);

    this.add.text(192, 57, 'UNE VIE DE BOXEUR · 16 BITS', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#b8cbd7',
    }).setOrigin(0.5);

    this.drawRing(decor);

    this.add.text(192, 174, 'PROJET PRÊT', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#132b3c',
    }).setOrigin(0.5);

    this.add.text(192, 260, 'GYM · SCÈNE DE DÉMARRAGE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b8cbd7',
    }).setOrigin(0.5);
  }

  drawRing(graphics) {
    const backLeft = { x: 80, y: 136 };
    const backRight = { x: 304, y: 136 };
    const frontRight = { x: 342, y: 222 };
    const frontLeft = { x: 42, y: 222 };
    const corners = [backLeft, backRight, frontRight, frontLeft];

    graphics.fillStyle(0x233e53);
    graphics.fillRect(42, 221, 300, 14);
    graphics.fillStyle(0x84aeba);
    graphics.fillPoints(corners, true);
    graphics.lineStyle(2, 0xb8d1d6);
    graphics.strokePoints(corners, true);

    // Trois cordes et quatre poteaux suffisent pour valider le rendu du ring.
    for (const [height, color] of [[38, 0xdc7775], [26, 0xe9e3cf], [14, 0x719dd4]]) {
      graphics.lineStyle(3, color);
      graphics.strokePoints(corners.map(({ x, y }) => ({ x, y: y - height })), true);
    }

    corners.forEach(({ x, y }, index) => {
      graphics.fillStyle(index % 2 === 0 ? 0xad4b55 : 0x456da1);
      graphics.fillRect(x - 4, y - 44, 8, 46);
      graphics.fillStyle(0xe9e3cf);
      graphics.fillRect(x - 4, y - 44, 8, 4);
    });
  }
}
