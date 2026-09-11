const GUIDES = {
  gym: '<span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Marcher</span><span><kbd>WASD</kbd> / <kbd>ZQSD</kbd> Marcher</span><span><kbd>E</kbd> / <kbd>Entrée</kbd> Interagir</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  sparring: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>↑</kbd> Garde haute <kbd>↓</kbd> Garde basse et coups au corps</span><span><kbd>←</kbd><kbd>→</kbd> Esquiver · flèches ou WASD</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span><span><kbd>M</kbd> Son</span>',
  bag: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>J K J</kbd> Combo avec crochet</span><span><kbd>↑</kbd><kbd>↓</kbd> Gardes <kbd>←</kbd><kbd>→</kbd> Esquives · flèches ou WASD</span><span><kbd>↓</kbd> + frappe : corps</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  shadow: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>J K J</kbd> Crochet en combo</span><span><kbd>↑</kbd><kbd>↓</kbd> Gardes <kbd>←</kbd><kbd>→</kbd> Esquives · flèches ou WASD</span><span><kbd>↓</kbd> + frappe : corps</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause et commandes</span>',
  speedball: '<span><kbd>J</kbd> Main gauche <kbd>K</kbd> Main droite</span><span>Alterne au repère</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  rope: '<span><kbd>J</kbd> Appui gauche <kbd>K</kbd> Appui droit</span><span>Alterne au passage de la corde</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
};

export function setSceneShell(mode, { opponent = 'remi' } = {}) {
  const fight = mode === 'sparring' && opponent === 'beton';
  document.querySelector('.gym-location').innerHTML = `MONTRÉAL <span aria-hidden="true">/</span> ${fight ? 'SALLE DE BOXE' : 'AU GYM'}`;
  document.getElementById('stage').dataset.scene = mode;
  document.getElementById('stage').setAttribute('aria-label', { gym: 'Visite du gym', sparring: 'Sparring avec Rémi le Tank', bag: 'Entraînement au sac de frappe', shadow: 'Shadow boxing devant le miroir', speedball: 'Entraînement à la speed ball', rope: 'Entraînement à la corde à danser' }[mode]);
  document.getElementById('game').setAttribute('aria-label', mode === 'gym'
    ? 'Gym en pixel art vu du dessus. Votre boxeur porte une tuque rouge.'
    : mode === 'bag' ? 'Votre boxeur à tuque rouge pratique ses enchaînements au sac.'
      : mode === 'shadow' ? 'Votre boxeur à tuque rouge pratique face à son reflet dans le miroir du gym.'
        : mode === 'speedball' ? 'Votre boxeur à tuque rouge travaille son rythme à la speed ball.'
          : mode === 'rope' ? 'Votre boxeur à tuque rouge saute à la corde dans un espace du gym.' : 'Ring de boxe en pixel art. Vous êtes de dos face à Rémi le Tank.');
  for (const scene of ['gym', 'sparring', 'bag', 'shadow', 'rhythm']) document.getElementById(`${scene}-ui`).hidden = scene === 'rhythm' ? !['speedball', 'rope'].includes(mode) : mode !== scene;
  document.getElementById('game-commands').innerHTML = GUIDES[mode];
  document.querySelector('.prototype-label').textContent = { gym: 'LE GYM', sparring: 'SPARRING AVEC RÉMI', bag: 'SAC · ENCHAÎNEMENTS', shadow: 'MIROIR · SHADOW BOXING', speedball: 'SPEED BALL · RYTHME', rope: 'CORDE · ENDURANCE' }[mode];
  if (fight) {
    document.getElementById('stage').setAttribute('aria-label', 'Combat contre Béton dans une salle de boxe');
    document.getElementById('game').setAttribute('aria-label', 'Salle de boxe en pixel art, public autour du ring et projecteurs de soirée. Vous êtes de dos face à Béton.');
    document.querySelector('.prototype-label').textContent = 'COMBAT EN SALLE · BÉTON';
  }
}
