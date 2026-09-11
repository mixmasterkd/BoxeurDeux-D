const lesson = (id, title, description, objective, target = 3) => Object.freeze({ id, title, description, objective, target });

export const LESSONS = Object.freeze({
  free: lesson('free', 'Sparring libre', 'Un round avec toutes les commandes, à votre rythme.', 'Échangez librement avec Rémi.', null),
  jab: lesson('jab', 'Placer son jab', 'Rémi ouvre sa garde pour vous laisser travailler le jab.', 'Placez un jab dans 3 ouvertures différentes.'),
  guard: lesson('guard', 'Bloquer et souffler', 'Apprenez à protéger votre tête sans épuiser votre endurance.', 'Bloquez, puis relâchez et récupérez 8 points. Répétez 3 fois.'),
  counter: lesson('counter', 'Esquiver et répondre', 'Lisez le coup de Rémi, esquivez, puis profitez de son ouverture.', 'Réussissez 3 esquives suivies d’une frappe dans l’ouverture.'),
});

const EPSILON = 1e-9;
const CUES = {
  jab: 'Attends mon ouverture, puis place un jab.',
  guard: 'Bloque mon coup, puis relâche la garde pour souffler.',
  counter: 'Esquive du côté indiqué, puis réponds dans mon ouverture.',
};

/** Objectives observe resolved combat and scheduled stages; they never defend
 * for Rémi or change a guard in response to a player's attack button. */
export class TrainingCoach {
  constructor(id) {
    const descriptor = LESSONS[id];
    if (!descriptor || id === 'free') throw new Error(`Unknown training lesson: ${id}`);
    this.state = {
      id, title: descriptor.title, objective: descriptor.objective,
      progress: 0, target: descriptor.target, completed: false,
      cue: CUES[id], summary: { positive: '', improve: '' },
    };
    this.usedOpening = null;
    this.recovery = null;
    this.counter = null;
    this.finishAfter = Infinity;
  }

  snapshot(stats) {
    this.state.summary = this.summary(stats);
    return this.state;
  }

  onStage(context) {
    if (this.state.completed) return;
    const { id } = this.state;
    if (id === 'jab') {
      this.state.cue = context.remiAction === 'open'
        ? 'C’est ouvert : un jab, puis reviens en garde.'
        : 'Mes gants sont fermés. Attends l’ouverture.';
    } else if (id === 'counter') {
      if (context.remiAction === 'open' && this.counter?.waiting) {
        this.counter = { opening: context.remiStage, waiting: false };
        this.state.cue = 'À toi ! Place une frappe dans l’ouverture.';
      } else if (this.counter && context.remiAction !== 'open' && !this.counter.waiting) {
        this.counter = null;
        this.state.cue = 'L’ouverture est fermée. Recommence après une esquive.';
      }
    }
  }

  onGuardChange(held, wasHeld, context) {
    if (this.state.id !== 'guard' || this.state.completed || !this.recovery) return;
    // Focus loss and pause release controls too. Those releases are not a
    // completed exercise; deliberate release must happen in a running round.
    if (context.phase !== 'running') return;
    if (!held && wasHeld) {
      this.recovery.released = true;
      this.recovery.target = Math.min(100, context.stamina + 8);
      this.state.cue = 'Souffle… laisse remonter ton endurance.';
    } else if (held) {
      this.recovery.released = false;
      this.state.cue = 'Le blocage est réussi. Relâche pour récupérer.';
    }
  }

  onEvent(event, context) {
    if (this.state.completed) return [];
    const { id } = this.state;
    if (event.type === 'exhausted') {
      this.state.cue = 'Souffle. Relâche les commandes pour récupérer.';
      return [];
    }
    if (id === 'jab') {
      if (event.type === 'player-blocked') this.state.cue = 'Mes gants sont fermés. Attends l’ouverture.';
      if (event.type === 'player-hit') {
        if (event.attack !== 'jab') this.state.cue = 'Pour cet exercice, utilise le jab.';
        else if (context.remiAction !== 'open' || context.remiRemaining <= EPSILON) this.state.cue = 'Touche réussie. Attends maintenant une vraie ouverture.';
        else if (this.usedOpening === context.remiStage) this.state.cue = 'Un seul jab compte par ouverture. Attends la suivante.';
        else {
          this.usedOpening = context.remiStage;
          return this.advance(context, 'Bien ! Attends la prochaine ouverture.');
        }
      }
    } else if (id === 'guard') {
      if (event.type === 'remi-blocked') {
        this.recovery = { released: false, target: Infinity };
        this.state.cue = 'Bien bloqué. Relâche la garde et souffle.';
      } else if (event.type === 'remi-hit') {
        this.state.cue = 'Monte la garde avant le contact, puis relâche après le coup.';
      }
    } else if (id === 'counter') {
      if (event.type === 'remi-dodged') {
        this.counter = { waiting: true, attack: context.remiStage };
        this.state.cue = 'Belle esquive. Attends mon ouverture pour répondre.';
      } else if (event.type === 'player-hit') {
        if (this.counter && !this.counter.waiting
          && context.remiAction === 'open' && context.remiRemaining > EPSILON
          && this.counter.opening === context.remiStage) {
          this.counter = null;
          return this.advance(context, 'Esquive et réponse réussies. Prépare le prochain échange.');
        }
        this.state.cue = this.counter?.waiting
          ? 'Attends la fin de mon coup pour répondre dans l’ouverture.'
          : 'Touche réussie. Pour le contre, esquive d’abord.';
      } else if (event.type === 'remi-blocked') {
        this.state.cue = 'Bien bloqué. Ici, essaie une esquive, puis une riposte.';
      } else if (event.type === 'remi-hit') {
        this.counter = null;
        this.state.cue = 'Suis le côté indiqué et attends le bon moment pour esquiver.';
      } else if (event.type === 'player-blocked') {
        this.state.cue = 'Ma garde est revenue. Recommence après une esquive.';
      }
    }
    return [];
  }

  update(context) {
    if (this.state.completed || this.state.id !== 'guard' || !this.recovery) return [];
    if (!this.recovery.released) {
      // Exhaustion or a paused/focus-lost session can lower the guard without
      // the requested release. Do not reuse that old block after auto-resting.
      if (!context.guardHeld) {
        this.recovery = null;
        this.state.cue = 'Reprends par un blocage, puis relâche pour souffler.';
      }
      return [];
    }
    if (!context.guardHeld && !context.playerAction
      && context.stamina + EPSILON >= this.recovery.target) {
      this.recovery = null;
      return this.advance(context, 'Un cycle réussi. Prépare le prochain blocage.');
    }
    return [];
  }

  advance(context, cue) {
    this.state.progress += 1;
    this.state.cue = cue;
    const details = { lesson: this.state.id, progress: this.state.progress, target: this.state.target };
    const events = [{ type: 'lesson-progress', ...details }];
    if (this.state.progress >= this.state.target) {
      this.state.completed = true;
      this.state.cue = 'Trois répétitions réussies. Bien joué !';
      this.finishAfter = context.time + .5;
      events.push({ type: 'lesson-complete', ...details });
    }
    return events;
  }

  canFinish(context) {
    return this.state.completed && context.time + EPSILON >= this.finishAfter
      && !context.playerAction && !['jab', 'cross'].includes(context.remiAction)
      && context.playerHurt <= EPSILON && context.remiHurt <= EPSILON;
  }

  summary(stats) {
    const { id, progress, target, completed } = this.state;
    const count = `${progress}/${target}`;
    if (id === 'jab') return {
      positive: progress ? `${count} ouvertures travaillées avec un jab bien placé.`
        : stats.landed ? `${stats.landed} touche${stats.landed > 1 ? 's' : ''} placée${stats.landed > 1 ? 's' : ''}, sans répétition de l’exercice validée.`
          : 'Tu peux reprendre cet exercice à ton rythme.',
      improve: completed ? 'Garde ce rythme et reviens en garde après chaque jab.'
        : 'Attends que mes gants s’ouvrent, puis place un seul jab par ouverture.',
    };
    if (id === 'guard') return {
      positive: progress ? `${count} cycles blocage et récupération réussis.`
        : stats.blocked ? `${stats.blocked} coup${stats.blocked > 1 ? 's' : ''} bloqué${stats.blocked > 1 ? 's' : ''}.`
          : 'Tu peux reprendre cet exercice à ton rythme.',
      improve: completed ? 'Continue à relâcher la garde entre les coups pour garder ton endurance.'
        : 'Après un blocage, relâche et récupère 8 points avant de recommencer.',
    };
    return {
      positive: progress ? `${count} esquives suivies d’une riposte réussies.`
        : stats.dodged ? `${stats.dodged} esquive${stats.dodged > 1 ? 's' : ''} réussie${stats.dodged > 1 ? 's' : ''}.`
          : 'Tu peux reprendre cet exercice à ton rythme.',
      improve: completed ? 'Garde le même ordre : lis le coup, esquive, puis réponds dans l’ouverture.'
        : 'Esquive du côté indiqué, puis touche-moi avant que ma garde revienne.',
    };
  }
}
