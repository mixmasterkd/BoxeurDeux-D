const GUIDES = {
  gym: '<span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Marcher</span><span><kbd>WASD</kbd> / <kbd>ZQSD</kbd> Marcher</span><span><kbd>E</kbd> / <kbd>Entrée</kbd> Interagir</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  sparring: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>Espace</kbd> Garde maintenue</span><span><kbd>A</kbd><kbd>D</kbd> ou <kbd>←</kbd><kbd>→</kbd> Esquiver</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span><span><kbd>M</kbd> Son</span>',
  bag: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>J K J</kbd> Combo avec crochet</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span><span><kbd>M</kbd> Son</span>',
  shadow: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>J K J</kbd> Crochet en combo</span><span><kbd>Espace</kbd> Garde <kbd>A</kbd><kbd>D</kbd> Esquives</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause et commandes</span>',
};

export function setSceneShell(mode) {
  document.getElementById('stage').dataset.scene = mode;
  document.getElementById('stage').setAttribute('aria-label', { gym: 'Visite du gym', sparring: 'Sparring avec Rémi le Tank', bag: 'Entraînement au sac de frappe', shadow: 'Shadow boxing devant le miroir' }[mode]);
  document.getElementById('game').setAttribute('aria-label', mode === 'gym'
    ? 'Gym en pixel art vu du dessus. Votre boxeur porte une tuque rouge.'
    : mode === 'bag' ? 'Votre boxeur à tuque rouge pratique ses enchaînements au sac.'
      : mode === 'shadow' ? 'Votre boxeur à tuque rouge pratique face à son reflet dans le miroir du gym.' : 'Ring de boxe en pixel art. Vous êtes de dos face à Rémi le Tank.');
  for (const scene of ['gym', 'sparring', 'bag', 'shadow']) document.getElementById(`${scene}-ui`).hidden = mode !== scene;
  document.getElementById('game-commands').innerHTML = GUIDES[mode];
  document.querySelector('.prototype-label').textContent = { gym: 'LE GYM', sparring: 'SPARRING AVEC RÉMI', bag: 'SAC · ENCHAÎNEMENTS', shadow: 'MIROIR · SHADOW BOXING' }[mode];
}
