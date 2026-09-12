import { careerProfile } from '../game/CareerProfile.js';
import { careerPlace, careerMoney, careerMedals, careerChapter, careerImportSummary } from './CareerSummary.js';
import './career.css';

export function downloadCareer() {
  const blob = new Blob([careerProfile.exportText()], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'boxeurdeux-d-sauvegarde.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function installCareerMenu() {
  const root = document.getElementById('career-menu'), stage = document.getElementById('stage');
  const directScene = new URLSearchParams(location.search).has('scene');
  if (!root || directScene || (!careerProfile.hasProgress() && !['invalid', 'incompatible'].includes(careerProfile.saveStatus().state))) return () => {};
  const abort = new AbortController(), previousFocus = document.activeElement;
  let pending = null, held = new Set();
  const notify = open => window.dispatchEvent(new CustomEvent('career-menu-change', { detail: { open } }));
  root.hidden = false; if (stage) stage.inert = true;
  root.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="career-title"><p>BOXEURDEUX-D</p><h2 id="career-title">Reprendre ta journée.</h2><dl class="career-stats"></dl><button type="button" class="career-continue primary-button">Continuer</button><div class="career-tools"><button type="button" class="career-export">Exporter ma partie</button><button type="button" class="career-import">Importer une partie</button><button type="button" class="career-new">Nouvelle partie</button></div><div class="career-confirm" hidden><p></p><div><button type="button" class="career-cancel">Annuler</button><button type="button" class="career-confirm-button">Confirmer</button></div></div><input class="career-file" type="file" accept="application/json,.json" hidden><small class="career-status" role="status" aria-live="polite"></small><small class="career-storage-note">Partie conservée dans ce navigateur et à cette adresse. Exporter permet de la transférer sur un autre appareil.</small></section>`;
  const stats = root.querySelector('.career-stats'), confirmation = root.querySelector('.career-confirm');
  const status = root.querySelector('.career-status'), main = root.querySelector('.career-continue');
  const fileInput = root.querySelector('.career-file'), tools = root.querySelector('.career-tools');
  const on = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal: abort.signal });
  const focus = element => { element?.focus({ preventScroll: true }); element?.scrollIntoView({ block: 'nearest' }); };
  const render = () => {
    const p = careerProfile.snapshot();
    root.querySelector('#career-title').textContent = `Jour ${p.daily.day} · ${careerPlace(p)}`;
    stats.innerHTML = `<div><dt>Énergie de journée</dt><dd>${p.daily.energy}/${p.daily.maxEnergy}</dd></div><div><dt>Argent / plafond</dt><dd>${careerMoney(p)}</dd></div><div><dt>Endurance</dt><dd>${p.stats.endurance}/${p.caps.endurance}</dd></div><div><dt>Résistance</dt><dd>${p.stats.resistance}/${p.caps.resistance}</dd></div><div><dt>Puissance</dt><dd>+${p.stats.power}/${p.caps.power}</dd></div><div><dt>Récupération</dt><dd>+${Math.round((p.stats.recovery - 1) * 100)}%</dd></div><div><dt>Collection</dt><dd>${careerMedals(p)}</dd></div><div><dt>Tenues possédées</dt><dd>${p.inventory?.owned.length ?? 2}</dd></div>`;
    let chapter = root.querySelector('.career-chapter');
    if (!chapter) { chapter = document.createElement('p'); chapter.className = 'career-chapter'; stats.after(chapter); }
    chapter.textContent = careerChapter(p);
    status.textContent = careerProfile.saveStatus().message;
    status.dataset.state = careerProfile.saveStatus().state;
  };
  const close = () => {
    root.hidden = true; if (stage) stage.inert = matchMedia('(pointer: coarse) and (hover: none) and (max-width: 900px) and (orientation: portrait)').matches; held.clear(); notify(false);
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
  };
  const cancel = () => {
    pending = null; confirmation.hidden = true; tools.inert = false; main.disabled = false;
    focus(main);
  };
  const confirm = (message, action, label) => {
    pending = action; confirmation.querySelector('p').textContent = message;
    confirmation.querySelector('.career-confirm-button').textContent = label;
    confirmation.hidden = false; tools.inert = true; main.disabled = true;
    focus(confirmation.querySelector('.career-cancel'));
  };
  on(main, 'click', close);
  on(root.querySelector('.career-export'), 'click', downloadCareer);
  on(root.querySelector('.career-import'), 'click', () => { fileInput.value = ''; fileInput.click(); });
  on(fileInput, 'change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Ce fichier est trop volumineux pour une sauvegarde.');
      const text = await file.text();
      if (abort.signal.aborted || root.hidden) return;
      const candidate = careerProfile.inspectImport(text);
      confirm(`Remplacer la progression actuelle par cette partie ? ${careerImportSummary(candidate)} Une copie de la partie actuelle sera conservée si le stockage est disponible.`, () => {
        careerProfile.importText(text); render(); cancel();
      }, 'Remplacer ma partie');
    } catch (error) { status.textContent = error.message; status.dataset.state = 'invalid'; }
  });
  on(root.querySelector('.career-new'), 'click', () => confirm('Recommencer avec les capacités de base et aucun résultat de combat ? La progression actuelle sera remplacée. Exportez-la avant de recommencer si vous voulez la garder.', () => {
    careerProfile.reset(); render(); cancel(); main.textContent = 'Commencer la nouvelle partie';
  }, 'Oui, recommencer'));
  on(confirmation.querySelector('.career-cancel'), 'click', cancel);
  on(confirmation.querySelector('.career-confirm-button'), 'click', () => pending?.());
  const controls = () => [...root.querySelectorAll('button:not(:disabled)')].filter(element => !element.closest('[hidden], [inert]'));
  const backwards = new Set(['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyZ', 'KeyA', 'KeyQ']);
  const forwards = new Set(['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD']);
  on(window, 'keydown', event => {
    if (root.hidden) return;
    // A modal owns input even if another scene has installed global listeners.
    event.stopImmediatePropagation();
    if (!['Tab', 'Enter', 'Space', 'KeyJ', 'KeyK', 'KeyP', 'Escape', ...backwards, ...forwards].includes(event.code)) return;
    event.preventDefault();
    if (event.repeat || held.has(event.code)) return;
    held.add(event.code);
    const buttons = controls(), index = buttons.indexOf(document.activeElement);
    if (event.code === 'Tab' || backwards.has(event.code) || forwards.has(event.code)) {
      const step = backwards.has(event.code) || event.code === 'Tab' && event.shiftKey ? -1 : 1;
      focus(buttons[index < 0 ? 0 : (index + step + buttons.length) % buttons.length]);
    } else if (['KeyK', 'Escape', 'KeyP'].includes(event.code)) {
      if (pending) cancel(); else close();
    } else (buttons[index] ?? buttons[0])?.click();
  }, { capture: true });
  on(window, 'keyup', event => {
    held.delete(event.code);
    if (!root.hidden) { event.stopImmediatePropagation(); event.preventDefault(); }
  }, { capture: true });
  on(window, 'blur', () => held.clear());
  on(root, 'focusout', () => queueMicrotask(() => {
    if (!root.hidden && !root.contains(document.activeElement)) focus(controls()[0]);
  }));
  render(); focus(main); notify(true);
  return () => { abort.abort(); close(); root.replaceChildren(); };
}
