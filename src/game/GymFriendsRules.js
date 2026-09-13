import { getOpponentProfile } from './OpponentProfiles.js';

export const GYM_FRIEND_STATIONS = [
  { id: 'fredo', label: 'Fredo · Ton coach', x: 350, y: 493, radius: 68, kind: 'friend' },
  { id: 'octopus', label: 'The Octopus · Conseils et drills', x: 1040, y: 555, radius: 72, kind: 'friend' },
];
export const GYM_FRIEND_OBSTACLES = GYM_FRIEND_STATIONS.map(({ id, x, y }) => ({ id, x: x - 20, y: y - 18, width: 40, height: 26 }));

export const OCTOPUS_DRILLS = Object.freeze({
  basics: { title: 'Des directs propres', description: 'On travaille dans le vide ensemble. Suis le geste demandé, à ton rythme. Après les deux premiers coups, tiens la garde haute avant de recommencer.', steps: ['jab', 'cross', 'guardHead', 'jab', 'cross'], labels: ['Jab à la tête', 'Direct à la tête', 'Reviens en garde haute', 'Encore un jab à la tête', 'Termine par un direct'] },
  defense: { title: 'Se protéger et répondre', description: 'Monte la garde, protège le corps, puis esquive et réponds. Les gardes se tiennent un petit instant; inutile de marteler les directions.', steps: ['guardHead', 'guardBody', 'dodgeLeft', 'jab', 'dodgeRight', 'cross'], labels: ['Tiens la garde haute', 'Tiens la garde basse', 'Esquive à gauche', 'Réponds avec un jab', 'Esquive à droite', 'Réponds avec un direct'] },
  combo: { title: 'Le troisième coup', description: 'Jab, direct, puis jab à nouveau : ce troisième geste devient un crochet. Réussis trois enchaînements complets, à la tête ou au corps. Une pression par frappe.', steps: ['combo', 'combo', 'combo'], labels: ['Premier jab–direct–crochet', 'Deuxième enchaînement', 'Un dernier enchaînement propre'] },
});

export function nextFightAdvice(profile) {
  const active = profile.tournament?.active;
  const id = !profile.fights?.beton?.wins ? 'beton' : !profile.fights?.kramer?.wins ? 'kramer'
    : active ? ['bellini', 'fortin', 'gagnon'][Math.max(0, Math.min(2, active.day - 1))] : 'bellini';
  const opponent = getOpponentProfile(id);
  return { id, name: opponent.name, text: opponent.advice ?? 'Béton ferme souvent la garde en haut. Son jab vise la tête, son direct vise le corps. Protège la bonne hauteur, puis profite du long retour de son direct pour répondre.' };
}

/** Practice objectives observe completed motions, never raw button presses. */
export class OctopusDrill {
  constructor(id = 'basics') { this.id = Object.hasOwn(OCTOPUS_DRILLS, id) ? id : 'basics'; this.reset(); }
  reset() { this.progress = 0; this.guardTime = 0; this.completedAt = null; this.lastSeconds = 0; }
  get descriptor() { return OCTOPUS_DRILLS[this.id]; }
  get expected() { return this.descriptor.steps[this.progress]; }
  get completed() { return this.progress >= this.descriptor.steps.length; }
  advance(seconds) { this.progress++; this.guardTime = 0; if (this.completed) this.completedAt = seconds; }
  observe(state, events) {
    const dt = Math.max(0, Math.min(.1, state.seconds - this.lastSeconds)); this.lastSeconds = state.seconds;
    if (state.phase !== 'running' || this.completed) return;
    for (const event of events) {
      if (event.type !== 'motion' || this.completed) continue;
      if (this.expected === 'combo' ? event.action === 'hook' && event.combo === true
        : event.action === this.expected && (event.action.startsWith('dodge') || event.target === 'head')) this.advance(state.seconds);
    }
    if (this.expected?.startsWith('guard')) {
      const level = this.expected === 'guardHead' ? 'head' : 'body';
      if (state.player.action === 'guard' && state.player.guardLevel === level) this.guardTime += dt;
      else this.guardTime = 0;
      if (this.guardTime >= .45) this.advance(state.seconds);
    }
  }
  presentation() {
    return { name: 'The Octopus', title: this.descriptor.title, description: this.descriptor.description,
      objective: this.completed ? 'Bien joué ! Garde ces gestes pour ta prochaine séance avec Rémi.' : this.descriptor.labels[this.progress],
      progress: `${this.progress} / ${this.descriptor.steps.length}`, completed: this.completed };
  }
}
