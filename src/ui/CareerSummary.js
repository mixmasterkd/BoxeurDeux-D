import { TOURNAMENT_ROUNDS, MEDAL_LABELS, moneyCap, tournamentLabel, goldTournamentUnlocked } from '../game/ChapterRules.js';
import { postBronzeUnlocked, CUBA_PRICE } from '../game/NextChapterRules.js';

const PLACES = {
  home: 'Chez toi', gym: 'Au gym', neighborhood: 'Le quartier', residential: 'Rue des livraisons',
  'cuba-home': 'Cuba · Logement', 'cuba-village': 'Cuba · Village', 'cuba-gym': 'Cuba · Gym aux pneus', 'cuba-beach': 'Cuba · Plage de Louisto',
  'metro-station': 'Métro du quartier', 'metro-riverside': 'Métro des Rives', riverside: 'Des Rives',
  commercial: 'Quartier des boutiques', 'clothing-shop': 'Boutique de vêtements', 'boxing-shop': 'Boutique de boxe',
  'hotel-room': 'Hôtel · Chambre', 'hotel-corridor': 'Hôtel · Couloir', 'hotel-lobby': 'Hôtel · Rez-de-chaussée',
  'hotel-restaurant': 'Hôtel · Restaurant et bar à pain',
  'mexico-home': 'Mexique · Logement', 'mexico-village': 'Mexique · Village', 'mexico-gym': 'Mexique · Gym de Pablo', 'mexico-beach': 'Mexique · Plage', 'mexico-arena': 'Mexique · Arènes',
  airport: 'Aéroport de Montréal', 'metro-train': 'Métro · En route', 'metro-island': 'Métro de l’île', 'metro-stadium': 'Métro du Stade', 'metro-airport': 'Métro de l’aéroport',
  'marathon-island': 'L’île', 'marathon-downtown': 'Centre-ville', 'marathon-oldport': 'Vieux-Port', 'marathon-stadium': 'Stade olympique',
  'hotel-gym': 'Hôtel · Mini-gym', 'hotel-pool': 'Hôtel · Piscine', 'hotel-venue': 'Hôtel · Salle des combats',
};
export const careerPlace = profile => PLACES[profile.location?.scene] ?? 'Le quartier';
export const careerMoney = profile => `${profile.wallet?.money ?? 0} / ${moneyCap(profile.fights)} $`;
export function careerMedals(profile) {
  const medals = profile.tournament?.medals ?? [];
  const competitionCount = medals.filter(medal => medal.type !== 'participation').length;
  const count = competitionCount + (profile.marathon?.medals.length ?? 0);
  const souvenirs = medals.length - competitionCount;
  return count ? `${count} médaille${count > 1 ? 's' : ''}` : souvenirs ? `${souvenirs} souvenir${souvenirs > 1 ? 's' : ''}` : 'À gagner';
}
export function careerChapter(profile) {
  if (profile.marathon?.active) return profile.marathon.active.status === 'registered' ? 'Marathon inscrit · Départ sur l’île · Métro' : 'Marathon de Montréal · Suis le parcours vers le Stade';
  if (profile.mexico?.active) return 'Séjour au Mexique · Pablo et Danielo · Retour inclus';
  if (profile.cuba?.active) return 'Séjour à Cuba · Gym, plage et Louisto · Retour inclus';
  const run = profile.tournament?.active;
  if (run) {
    const prefix = `${tournamentLabel(run.tier)} · J${run.day}/3`;
    if (run.status === 'champion' || run.status === 'eliminated') return `${prefix} · ${MEDAL_LABELS[run.medal] ?? 'Séjour terminé'}`;
    return `${prefix} · ${run.status === 'awaiting-sleep' ? 'Victoire, retrouve ton lit' : TOURNAMENT_ROUNDS[run.day - 1]}`;
  }
  if (profile.delivery?.active) return `Tournée à vélo · ${profile.delivery.active.completed.length}/3 colis livrés`;
  const reserved = [profile.cuba?.reserved ? 'Cuba' : null, profile.mexico?.reserved ? 'Mexique' : null].filter(Boolean);
  if (reserved.length) return `${reserved.join(' et ')} réservé · Embarquement à l’aéroport, accessible en métro`;
  if (goldTournamentUnlocked(profile)) return 'Gants dorés accessibles · Inscription 240 $ · Marathon facultatif';
  if (postBronzeUnlocked(profile)) return `Choix libre : Dyrex, Le Feu, Cuba ou Mexique · Voyage ${Math.min(profile.wallet.money, CUBA_PRICE)}/${CUBA_PRICE} $`;
  if (profile.fights.kramer?.wins) return 'Gants de bronze accessibles · Inscription à la salle';
  if (profile.fights.beton?.wins) return 'Prochain défi : Kramer « The Quitter »';
  return 'Premier défi : Béton · Salle communautaire';
}
export function careerImportSummary(profile) {
  return `Jour ${profile.daily.day} · ${careerPlace(profile)} · ${profile.daily.energy}/100 énergie · ${profile.wallet?.money ?? 0} $ · endurance ${profile.stats.endurance} · résistance ${profile.stats.resistance} · ${careerMedals(profile)}. ${careerChapter(profile)}.`;
}
