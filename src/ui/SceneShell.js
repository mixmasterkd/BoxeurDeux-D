const GUIDES = {
  gym: '<span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Marcher</span><span><kbd>WASD</kbd> / <kbd>ZQSD</kbd> Marcher</span><span><kbd>E</kbd> / <kbd>Entrée</kbd> Interagir</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  sparring: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>Espace</kbd> Garde maintenue</span><span><kbd>A</kbd><kbd>D</kbd> ou <kbd>←</kbd><kbd>→</kbd> Esquiver</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span><span><kbd>M</kbd> Son</span>',
};

export function setSceneShell(mode) {
  document.getElementById('stage').dataset.scene = mode;
  document.getElementById('stage').setAttribute('aria-label', mode === 'gym' ? 'Visite du gym' : 'Sparring avec Rémi le Tank');
  document.getElementById('game').setAttribute('aria-label', mode === 'gym'
    ? 'Gym en pixel art vu du dessus. Votre boxeur porte une tuque rouge.'
    : 'Ring de boxe en pixel art. Vous êtes de dos face à Rémi le Tank.');
  document.getElementById('gym-ui').hidden = mode !== 'gym';
  document.getElementById('sparring-ui').hidden = mode !== 'sparring';
  document.getElementById('game-commands').innerHTML = GUIDES[mode];
  document.querySelector('.prototype-label').textContent = mode === 'gym' ? 'PREMIÈRE VISITE' : 'SPARRING AVEC RÉMI';
}
