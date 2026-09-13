import Phaser from 'phaser';
import './loading.css';

/** The first visit downloads the artwork. Keep a visible, truthful progress
 * indication while Phaser loads it, including transitions between places. */
export function installSceneLoading(game) {
  const root = document.createElement('div');
  root.id = 'scene-loading'; root.hidden = true;
  root.innerHTML = '<div><span class="loading-eyebrow">BOXEURDEUX-D</span><p role="status" class="loading-title">Chargement…</p><progress max="1" value="0" aria-label="Chargement des images"></progress><span class="loading-detail">Préparation de la scène.</span></div>';
  document.getElementById('stage').append(root);
  const title = root.querySelector('.loading-title'), progress = root.querySelector('progress'), detail = root.querySelector('.loading-detail');
  let current = null, started = 0;
  const labels = {
    HotelScene: 'Un tour dans l’hôtel…', HotelActivityScene: 'Préparation de l’entraînement…',
    GymScene: 'Entrée dans le gym…', BagScene: 'Préparation du sac…', ShadowScene: 'Devant le miroir…',
    SparringScene: 'Préparation du ring…', RhythmScene: 'Préparation de l’atelier…',
  };
  const render = () => {
    const scene = game.scene.scenes.find(s => s.sys.settings.status === Phaser.Scenes.LOADING);
    if (!scene) { root.hidden = true; current = null; return; }
    if (current !== scene) {
      current = scene; started = performance.now();
      title.textContent = scene.sys.settings.key === 'ExplorationScene'
        ? scene.place === 'home' ? 'Retour à la maison…' : 'Un tour dans le quartier…'
        : labels[scene.sys.settings.key] ?? 'Chargement…';
    }
    root.hidden = false;
    progress.value = scene.load.progress;
    const text = performance.now() - started > 8000
      ? 'Le premier chargement des images peut prendre un moment.'
      : `Chargement des images · ${Math.round(scene.load.progress * 100)} %`;
    if (detail.textContent !== text) detail.textContent = text;
  };
  game.events.on('step', render);
  return () => { game.events.off('step', render); root.remove(); };
}
