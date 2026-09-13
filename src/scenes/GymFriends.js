import { careerProfile } from '../game/CareerProfile.js';
import { GYM_FRIEND_STATIONS, OCTOPUS_DRILLS, nextFightAdvice } from '../game/GymFriendsRules.js';
import { postBronzeUnlocked } from '../game/NextChapterRules.js';

const close = { id: 'close', label: 'À bientôt' };
export function preloadGymFriends(scene) {
  const base = import.meta.env.BASE_URL;
  for (const person of ['fredo', 'octopus']) for (const pose of ['idle', 'ready']) {
    scene.load.image(`friend-${person}-${pose}`, `${base}assets/sprites/friends/${person}-${pose}.png`);
  }
}
export function createGymFriends(scene) {
  const scale = scene.world.layout.actorScale ?? 1;
  scene.gymFriends = GYM_FRIEND_STATIONS.map(station => {
    scene.add.ellipse(station.x, station.y + 2, 38, 12, 0x0c1b23, .27).setScale(scale).setDepth(1);
    const sprite = scene.add.image(station.x, station.y, `friend-${station.id}-idle`).setOrigin(.5, 104 / 112).setScale(scale).setDepth(station.y);
    return { ...station, sprite };
  });
}
export function renderGymFriends(scene, time) {
  for (const person of scene.gymFriends ?? []) {
    const engaged = scene.world.state.nearby?.id === person.id;
    person.sprite.setTexture(`friend-${person.id}-${engaged ? 'ready' : 'idle'}`);
    person.sprite.y = person.y + (scene.world.state.paused || scene.ui.dialog ? 0 : Math.sin(time / 680 + person.x) * .6);
  }
}
export function interactGymFriend(scene, station) {
  if (!['fredo', 'octopus'].includes(station.id)) return false;
  if (station.id === 'fredo') {
    scene.ui.showDialog({ speaker: 'FREDO · TON COACH', title: 'On travaille ensemble ?', image: 'assets/sprites/friends/fredo-portrait.png', imageAlt: 'Fredo en survêtement bleu marine',
      text: 'Je te retrouve ici et dans ton coin à chaque combat. Aux pads, regarde la cible que je présente : ton jab croise vers ma main gauche; ton direct vers ma droite.\n\nLes pads coûtent 10 énergie au démarrage. Une séance réussie travaille ta puissance, jusqu’à ton plafond.',
      actions: [{ id: 'friend-pads', label: 'Faire des pads · 10 énergie', disabled: !careerProfile.canStartActivity('pads').ok }, { id: 'friend-fredo-advice', label: 'Préparer mon prochain combat' }, close] });
  } else {
    scene.ui.showDialog({ speaker: 'THE OCTOPUS · TON AMI AU GYM', title: 'Salut, la tuque rouge !', image: 'assets/sprites/friends/octopus-portrait.png', imageAlt: 'The Octopus, barbe et chandail noir à poulpe blanc',
      text: 'On peut travailler quelques gestes ensemble ou parler de ton prochain adversaire. Fredo reste ton coach; moi, je partage mes trucs de boxeur.\n\nUn drill coûte 10 énergie. On pratique sans bonus automatique de compétence.',
      actions: [...Object.entries(OCTOPUS_DRILLS).map(([id, drill]) => ({ id: `friend-drill-${id}`, label: `${drill.title}${id === 'doubleJab' && !postBronzeUnlocked(careerProfile.snapshot()) ? ' · Après les Gants' : ' · 10 énergie'}`, disabled: !careerProfile.canStartActivity('lesson').ok || id === 'doubleJab' && !postBronzeUnlocked(careerProfile.snapshot()) })), { id: 'friend-octopus-advice', label: 'Un conseil pour mon prochain combat' }, { id: 'friend-shirt', label: 'Ton chandail est en boutique ?' }, close] });
  }
  return true;
}
export function chooseGymFriend(scene, action) {
  const id = typeof action === 'string' ? action : action?.id;
  if (!id?.startsWith('friend-')) return false;
  if (id === 'friend-shirt') {
    scene.ui.showDialog({ speaker: 'THE OCTOPUS', title: 'Le chandail de l’équipe', text: 'Le chandail noir POULIN avec le poulpe blanc est chez Rue Nord, sur la place commerçante : 45 $. Tu pourras le mettre dans ta garde-robe à la maison. La tuque rouge reste avec toi !', actions: [close] }); return true;
  }
  if (id.endsWith('-advice')) {
    const advice = nextFightAdvice(careerProfile.snapshot());
    scene.ui.showDialog({ speaker: id.includes('fredo') ? 'FREDO · TON COACH' : 'THE OCTOPUS', title: `Avant ${advice.name}`, text: advice.text, actions: [close] }); return true;
  }
  const pads = id === 'friend-pads', drill = id.slice('friend-drill-'.length);
  if (!pads && !Object.hasOwn(OCTOPUS_DRILLS, drill)) return true;
  if (drill === 'doubleJab' && !postBronzeUnlocked(careerProfile.snapshot())) return true;
  if (!careerProfile.canStartActivity(pads ? 'pads' : 'lesson').ok) return true;
  scene.persistLocation(); scene.changingPlace = true; scene.ui.clearInputs(); scene.world.pause();
  scene.scene.start(pads ? 'HotelActivityScene' : 'ShadowScene', pads ? { activity: 'pads', fromGym: true } : { mentor: 'octopus', drill });
  return true;
}
