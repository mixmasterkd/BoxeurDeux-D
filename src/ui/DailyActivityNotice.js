import './daily.css';

/** A quiet line inside the existing menu; the scene remains responsible for
 * starting/resuming, and ordinary buttons remain usable with the joypad. */
export class DailyActivityNotice {
  constructor({ root, gate, panel, primary, restarts = [] }) {
    this.gate = gate;
    this.primary = root.querySelector(primary);
    this.restarts = restarts.map(selector => root.querySelector(selector)).filter(Boolean);
    this.note = document.createElement('p');
    this.note.className = 'daily-activity-note';
    this.note.setAttribute('role', 'status');
    this.note.setAttribute('aria-live', 'polite');
    root.querySelector(panel).prepend(this.note);
  }

  update(state) {
    const status = this.gate.status();
    const resumes = state.phase === 'paused' || state.phase === 'between';
    const text = `Jour ${status.day} · Énergie ${status.energy}/${status.maxEnergy}. `
      + (status.cost === 0 ? 'Combat et revanche gratuits.'
        : !status.ok ? `Nouvelle séance : ${status.cost}. Énergie insuffisante : rentre dormir à la maison.${resumes ? ' Reprendre reste gratuit.' : ''}`
          : state.phase === 'between' ? `Round suivant compris. Nouvelle séance : ${status.cost}.`
            : state.phase === 'paused' ? `Reprendre est gratuit. Recommencer : ${status.cost}.`
              : `Cette séance coûte ${status.cost}.`);
    const saveMessage = this.gate.lastResult?.saved === false ? ` ${this.gate.lastResult.message ?? 'Sauvegarde locale indisponible.'}` : '';
    if (this.note.textContent !== text + saveMessage) this.note.textContent = text + saveMessage;
    this.note.dataset.low = String(!status.ok);
    this.primary.disabled = !resumes && !status.ok;
    for (const button of this.restarts) button.disabled = !status.ok;
  }
}
