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
    const frame = root.querySelector(panel);
    (frame.querySelector('.panel-scroll, .rhythm-panel-content, .bag-panel-content, .shadow-panel-intro') ?? frame).prepend(this.note);
  }

  update(state) {
    const status = this.gate.status();
    const resumes = state.phase === 'paused' || state.phase === 'between';
    const text = `Jour ${status.day} · Énergie ${status.energy}/${status.maxEnergy} · `
      + (status.cost === 0 ? 'Combat gratuit.'
        : !status.ok ? `Il faut ${status.cost} énergie. Rentre dormir.${resumes ? ' Reprise gratuite.' : ''}`
          : state.phase === 'between' ? `Round compris · Refaire : ${status.cost}.`
            : state.phase === 'paused' ? `Reprise gratuite · Refaire : ${status.cost}.`
              : `Séance : ${status.cost} énergie.`);
    const saveMessage = this.gate.lastResult?.saved === false ? ` ${this.gate.lastResult.message ?? 'Sauvegarde locale indisponible.'}` : '';
    if (this.note.textContent !== text + saveMessage) this.note.textContent = text + saveMessage;
    this.note.dataset.low = String(!status.ok);
    this.primary.disabled = !resumes && !status.ok;
    for (const button of this.restarts) button.disabled = !status.ok;
  }
}
