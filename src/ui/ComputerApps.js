import { careerChapter, careerMedals } from './CareerSummary.js';
import { postBronzeUnlocked } from '../game/NextChapterRules.js';

export const COMPUTER_APPS = Object.freeze([
  { id: 'browser', label: 'Navigateur', icon: 'WWW', detail: 'Voyages et inscriptions' },
  { id: 'messages', label: 'Messages', icon: 'MAIL', detail: 'Karl et Fredo' },
  { id: 'career', label: 'Mon carnet', icon: 'BOXE', detail: 'Ta progression' },
  { id: 'scores', label: 'Entre amis', icon: 'P1/P2', detail: 'Courses et pool' },
  { id: 'garage', label: 'Mon garage', icon: 'GR', detail: 'La Corolla de course' },
]);
const back = { id: 'desktop', label: '← Bureau' };
const clock = ms => ms === null ? 'À établir' : `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(Math.floor(ms % 1000 / 10)).padStart(2, '0')}`;

// All applications are views of the current career. Opening a page cannot
// change a reservation, award a win or spend the player's daily resources.
export function computerApp(page, profile) {
  const record = profile.leisure ?? { race: { playerWins: 0, karlWins: 0, bestMs: null }, billiards: { beton: { playerWins: 0, opponentWins: 0 }, kramer: { playerWins: 0, opponentWins: 0 } } };
  const score = record.race;
  if (page === 'career') return { title: 'Mon carnet de boxe', text:
    `Jour ${profile.daily.day} · ${profile.daily.energy}/100 énergie · ${profile.wallet.money} $\n\n${careerChapter(profile)}\n\nEndurance : ${profile.stats.endurance}\nRésistance : ${profile.stats.resistance}\nCollection : ${careerMedals(profile)}`, actions: [back] };
  if (page === 'scores') return { title: 'Les parties entre amis', text:
    `COURSES AVEC KARL\nToi ${score.playerWins} — ${score.karlWins} Karl\nTon meilleur chrono gagné : ${clock(score.bestMs)}\n\nPOOL AU BAR DE L’ÎLE\nBéton : toi ${record.billiards.beton.playerWins} — ${record.billiards.beton.opponentWins} lui\nKramer : toi ${record.billiards.kramer.playerWins} — ${record.billiards.kramer.opponentWins} lui\n\nLes revanches vous attendent au salon et au bar.`, actions: [back] };
  if (page === 'garage') return { title: 'La GR Corolla', text:
    'Blanc, rouge et noir. Aileron, belles jantes et préparation de course : ta Corolla t’attend dans le garage, à côté du salon.\n\nPour l’instant, les duels avec la Camaro jaune de Karl se jouent sur la Xbox. Les vraies sorties en voiture viendront plus tard.', actions: [back] };
  if (page === 'messages') return { title: 'Messages de tes proches', text: 'Deux nouvelles occasions de se retrouver. Choisis une conversation.', actions:
    [{ id: 'messages-karl', label: 'Karl · La Camaro est prête' }, { id: 'messages-fredo', label: 'Fredo · À ton rythme' }, back] };
  if (page === 'messages-karl') return { title: 'Karl · La Camaro est prête', text:
    `« Ma Camaro jaune à bandes noires est prête ! Viens me chercher pour une course dans le salon. »\n\n${score.playerWins + score.karlWins === 0 ? '« On ouvre le compteur ce soir ? »' : score.playerWins > score.karlWins ? '« Profite de ton avance… je veux ma revanche ! »' : score.karlWins > score.playerWins ? '« Je garde la manette au chaud. Tu peux encore me rattraper ! »' : '« Égalité ! La prochaine course va compter. »'}\n\nToi ${score.playerWins} — ${score.karlWins} Karl`, actions: [{ id: 'messages', label: '← Conversations' }] };
  if (page === 'messages-fredo') return { title: 'Fredo · À ton rythme', text:
    `« Le gym sera là demain aussi. Prends le temps de souffler avec tes amis, puis reviens travailler tes appuis. »\n\nTon prochain objectif :\n${careerChapter(profile)}`, actions: [{ id: 'messages', label: '← Conversations' }] };
  if (page === 'news') return { title: 'La vie du quartier', text:
    `${postBronzeUnlocked(profile) ? `Le quartier suit ton parcours. ${careerChapter(profile)}` : profile.fights.kramer.wins ? 'Le quartier a entendu parler de tes victoires. Les Gants de bronze t’attendent à la salle.' : profile.fights.beton.wins ? 'Béton a trouvé quelqu’un à sa mesure. Kramer veut voir ce que tu vaux sur le ring.' : 'La salle communautaire organise les premières rencontres. Béton y attend les nouveaux boxeurs.'}\n\nAu Bar de l’Île, dans le quartier, Béton et Kramer discutent encore pour savoir qui est le caïd du coin. La table de pool, elle, attend le prochain joueur.`, actions: [{ id: 'browser', label: '← Favoris' }] };
  return null;
}
