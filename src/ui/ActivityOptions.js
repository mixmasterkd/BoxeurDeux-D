import { careerProfile } from '../game/CareerProfile.js';

/** Keep invitations/results short without duplicating settings or lessons. */
export function installActivityOptions(ui, controls, mode) {
  const root = ui.root;
  const actions = root.querySelector('.panel-actions, .bag-panel-actions, .shadow-panel-actions, .rhythm-actions');
  let opened = false, phase = ui.phase;
  root.dataset.optionsOpen = 'false';
  const toggle = value => {
    if (mode === 'gym' || !['ready', 'finished'].includes(ui.phase)) return;
    controls.clear(); opened = value;
    root.dataset.optionsOpen = String(opened);
    controls.refresh();
    controls.focusControl(opened ? controls.menuControls()[0] : actions?.querySelector('.primary-button'));
  };
  if (actions) {
    const back = document.createElement('button'); back.type = 'button';
    back.className = 'activity-options-back'; back.textContent = '← Retour aux choix';
    back.hidden = true; actions.append(back);
    controls.on(back, 'click', () => toggle(false));
    const tip = document.createElement('p'); tip.className = 'activity-options-tip';
    tip.innerHTML = '<span class="commands-desktop-only">Options · P ou Échap</span><span class="commands-touch-only">Options · ☰</span>';
    actions.append(tip);
  }
  const badge = document.createElement('span'); badge.className = 'test-profile-indicator';
  badge.textContent = 'MODE TEST'; badge.hidden = true; badge.setAttribute('aria-label', 'Profil de test : votre carrière normale reste séparée');
  root.append(badge);
  const exit = document.createElement('button'); exit.type = 'button'; exit.className = 'test-profile-exit';
  exit.textContent = 'Quitter le mode test'; exit.hidden = true;
  (mode === 'gym' ? root.querySelector('.gym-pause-panel .snes-choices') ?? root.querySelector('.gym-pause-panel') : actions)?.append(exit);
  controls.on(exit, 'click', () => {
    controls.clear();
    if (!careerProfile.testStatus().active) return;
    const result = careerProfile.leaveTestProfile();
    if (result.ok) window.dispatchEvent(new CustomEvent('career-imported'));
  });
  return {
    get isOpen() { return opened; },
    toggle: () => toggle(!opened), close: () => toggle(false),
    refresh() {
      if (phase !== ui.phase) { phase = ui.phase; opened = false; root.dataset.optionsOpen = 'false'; }
      const back = actions?.querySelector('.activity-options-back');
      if (back) back.hidden = !opened;
      const test = careerProfile.testStatus().active;
      badge.hidden = !test;
      exit.hidden = !test || !(mode === 'gym' ? ui.paused : ui.phase === 'paused' || opened);
      root.dataset.profileTest = String(test);
    },
  };
}
