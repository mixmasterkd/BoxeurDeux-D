const GUIDES = {
  gym: '<span><kbd>WASD</kbd> Marcher</span><span><kbd>E</kbd> Interagir et confirmer</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  sparring: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>W</kbd> Garde haute <kbd>S</kbd> Garde basse et coups au corps</span><span><kbd>A</kbd><kbd>D</kbd> Esquiver</span><span><kbd>E</kbd> Confirmer</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  bag: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>J K J</kbd> Crochet en combo</span><span><kbd>W</kbd><kbd>S</kbd> Gardes <kbd>A</kbd><kbd>D</kbd> Esquives</span><span><kbd>S</kbd> + frappe : corps</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  shadow: '<span><kbd>J</kbd> Jab <kbd>K</kbd> Direct</span><span><kbd>J K J</kbd> Crochet en combo</span><span><kbd>W</kbd><kbd>S</kbd> Gardes <kbd>A</kbd><kbd>D</kbd> Esquives</span><span><kbd>S</kbd> + frappe : corps</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  speedball: '<span><kbd>J</kbd> Main gauche <kbd>K</kbd> Main droite</span><span>Alterne au repère</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
  rope: '<span><kbd>J</kbd> Appui gauche <kbd>K</kbd> Appui droit</span><span>Alterne au passage de la corde</span><span><kbd>P</kbd> / <kbd>Échap</kbd> Pause</span>',
};

export function setSceneShell(mode, { opponent = 'remi', fromGym = false, fromCuba = false } = {}) {
  const chapterPlaces={'metro-station':'MÉTRO · DU QUARTIER','metro-riverside':'MÉTRO · DES RIVES',riverside:'DES RIVES',residential:'RUE DES LIVREURS',commercial:'PLACE COMMERÇANTE','clothing-shop':'RUE NORD','boxing-shop':'LE COIN BLEU',
    'hotel-room':'CHAMBRE 201','hotel-corridor':'ÉTAGE DES CHAMBRES','hotel-lobby':'HÔTEL · REZ-DE-CHAUSSÉE','hotel-gym':'HÔTEL · MINI-GYM','hotel-pool':'HÔTEL · PISCINE','hotel-venue':'LES GANTS DE BRONZE',
    'cuba-home':'CUBA · TON LOGEMENT','cuba-village':'CUBA · LE VILLAGE','cuba-gym':'CUBA · LE GYM AUX PNEUS','cuba-beach':'CUBA · LA PLAGE'};
  if(chapterPlaces[mode]){
    setSceneShell('gym');document.getElementById('stage').dataset.scene=mode;
    document.getElementById('stage').setAttribute('aria-label',chapterPlaces[mode]);
    document.getElementById('game').setAttribute('aria-label',`${chapterPlaces[mode]} · Lieu explorable en pixel art.`);
    document.querySelector('.gym-location').textContent=chapterPlaces[mode];document.querySelector('.prototype-label').textContent=chapterPlaces[mode];return;
  }
  if(mode==='pads'||mode==='pool'){
    setSceneShell('rope');document.getElementById('stage').dataset.scene=mode;
    document.getElementById('stage').setAttribute('aria-label',mode==='pads'?'Pads avec Fredo':'Longueurs à la piscine');
    document.querySelector('.gym-location').textContent=fromCuba?'CUBA · LE GYM AUX PNEUS':fromGym?'LE GYM DU QUARTIER':'LES GANTS DE BRONZE · HÔTEL';
    document.querySelector('.prototype-label').textContent=mode==='pads'?'PADS AVEC FREDO':'PISCINE · LONGUEURS';return;
  }
  if (mode === 'home' || mode === 'neighborhood') {
    setSceneShell('gym');
    document.getElementById('stage').dataset.scene = mode;
    document.getElementById('stage').setAttribute('aria-label', mode === 'home' ? 'Maison explorable du boxeur' : 'Quartier de Montréal explorable');
    document.getElementById('game').setAttribute('aria-label', mode === 'home' ? 'Maison en pixel art, lit et sortie. Ton boxeur porte sa tuque rouge et son survêtement.' : 'Rues de Montréal en pixel art. La caméra suit le boxeur entre maison, gym, parc et salle de boxe.');
    document.querySelector('.gym-location').innerHTML = `MONTRÉAL <span aria-hidden="true">/</span> ${mode === 'home' ? 'CHEZ TOI' : 'LE QUARTIER'}`;
    document.querySelector('.prototype-label').textContent = mode === 'home' ? 'MAISON' : 'LE QUARTIER';
    return;
  }
  const fight = mode === 'sparring' && opponent !== 'remi';
  document.querySelector('.gym-location').innerHTML = `${fromCuba || opponent === 'louisto' ? 'CUBA' : 'MONTRÉAL'} <span aria-hidden="true">/</span> ${opponent === 'louisto' ? 'RING DE LA PLAGE' : fight ? 'SALLE DE BOXE' : 'AU GYM'}`;
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
    const name={beton:'Béton',kramer:'Kramer',bellini:'Marco Bellini',fortin:'Louis Fortin',gagnon:'André Gagnon',dyrex:'Dyrex',lefeu:'Le Feu',louisto:'Louisto'}[opponent]??opponent;
    document.getElementById('stage').setAttribute('aria-label', `Combat contre ${name} dans une salle de boxe`);
    document.getElementById('game').setAttribute('aria-label', `Salle de boxe en pixel art, public autour du ring. Vous êtes de dos face à ${name}.`);
    document.querySelector('.prototype-label').textContent = `COMBAT EN SALLE · ${name.toUpperCase()}`;
    if (opponent === 'louisto') {
      document.getElementById('stage').setAttribute('aria-label', 'Combat contre Louisto sur la plage de Cuba');
      document.getElementById('game').setAttribute('aria-label', 'Ring extérieur sur la plage. Louisto fait face à ton boxeur; Fredo est dans ton coin.');
      document.querySelector('.prototype-label').textContent = 'RING DE LA PLAGE · LOUISTO';
    }
  }
}
