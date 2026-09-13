import { careerProfile } from '../game/CareerProfile.js';
import { CUBA_PRICE, postBronzeUnlocked } from '../game/NextChapterRules.js';
import { MEDAL_LABELS, moneyCap } from '../game/ChapterRules.js';
import { installMenuScrollCues } from './MenuWindow.js';
import './career-journal.css';

const names = { beton: 'Béton', kramer: 'Kramer', bellini: 'Bellini', fortin: 'Fortin', gagnon: 'Gagnon', dyrex: 'Dyrex', lefeu: 'Le Feu', louisto: 'Louisto' };
const record = fight => `${fight?.wins ?? 0} V · ${fight?.losses ?? 0} D · ${fight?.draws ?? 0} N`;
const completed = (profile, id) => profile.fights[id]?.wins ? `Victoire acquise · ${record(profile.fights[id])}` : 'À découvrir, puis à rejouer librement';

export function careerJournalPages(profile, touch = false) {
  const unlocked = postBronzeUnlocked(profile), cuba = profile.cuba?.active, run = profile.tournament?.active;
  const money = profile.wallet.money, missing = Math.max(0, CUBA_PRICE - money);
  const firstObjective = run ? run.status === 'awaiting-sleep' ? 'Dors à l’hôtel pour ouvrir le combat du lendemain.'
    : ['champion', 'eliminated'].includes(run.status) ? 'Ton tournoi est terminé. Rentre par l’accueil de l’hôtel pour choisir la suite.'
      : `Dispute le combat du jour ${run.day} dans la salle d’événement.`
    : !profile.fights.beton.wins ? 'Entraîne-toi au gym, puis retrouve Béton à la salle communautaire.'
      : !profile.fights.kramer.wins ? 'Kramer t’attend à la salle communautaire.'
        : 'Inscris-toi aux Gants de bronze à la salle communautaire. Termine une participation : une élimination compte aussi.';
  return [
    { id: 'objectives', title: 'Tes prochains défis', description: unlocked
      ? 'Dyrex, Le Feu ou Cuba : trois défis, dans l’ordre de ton choix.'
      : 'Avance à ton rythme. Le gym aide à préparer les combats; aucune capacité maximale n’est obligatoire.', rows: [
      ...(!unlocked || run ? [{ title: 'En ce moment', text: firstObjective }] : []),
      { title: 'Dyrex · Montréal', text: unlocked ? completed(profile, 'dyrex') : 'Après une participation terminée aux Gants de bronze.' },
      { title: 'Le Feu · Montréal', text: unlocked ? `${completed(profile, 'lefeu')}. Le défi le plus exigeant de Montréal.` : 'Même déblocage que Dyrex; aucun ordre imposé.' },
      { title: 'Louisto · Cuba', text: unlocked ? `${completed(profile, 'louisto')}. Rencontre sur le ring de la plage pendant le séjour.` : 'Le séjour à Cuba ouvre après les Gants de bronze.' },
      { title: cuba ? 'Séjour déjà payé' : `Projet Cuba · ${CUBA_PRICE} $`, text: cuba ? 'Le logement et le retour sont compris. Dors pour récupérer ton énergie; rentre à Montréal quand tu le souhaites.'
        : `${Math.min(money, CUBA_PRICE)} / ${CUBA_PRICE} $ réunis${missing ? ` · encore ${missing} $` : ' · budget prêt'}. Les livraisons financent le voyage; départ à Des Rives après les Gants.` },
    ] },
    { id: 'record', title: 'Ton parcours', description: `Jour ${profile.daily.day} · ${profile.daily.energy}/100 énergie quotidienne · ${money}/${moneyCap(profile.fights)} $.`, rows: [
      { title: 'Capacités et plafonds', text: `Endurance ${profile.stats.endurance}/${profile.caps.endurance} · Résistance ${profile.stats.resistance}/${profile.caps.resistance}\nPuissance +${profile.stats.power}/${profile.caps.power} · Récupération +${Math.round((profile.stats.recovery - 1) * 100)}/${Math.round((profile.caps.recovery - 1) * 100)} %. Les trois nouveaux défis gardent les mêmes plafonds.` },
      ...Object.entries(names).map(([id, name]) => ({ title: name, text: record(profile.fights[id]) })),
      { title: 'Médailles et souvenirs', text: profile.tournament.medals.length ? Object.entries(MEDAL_LABELS).map(([id, label]) => {
        const count = profile.tournament.medals.filter(medal => medal.type === id).length; return count ? `${label} × ${count}` : null;
      }).filter(Boolean).join('\n') : 'Ta collection se remplit à la fin des participations aux Gants de bronze.' },
      { title: 'Voyages', text: `${profile.cuba?.history.length ?? 0} séjour(s) terminé(s) à Cuba${cuba ? ' · un séjour en cours' : ''}.` },
    ] },
    { id: 'techniques', title: 'Tes techniques', description: 'Une pression par frappe.', rows: [
      { title: 'Jab · direct · crochet', text: `${touch ? 'A → B → A' : 'J → K → J'} · technique de départ. Le troisième geste devient un crochet gauche. Garde le rythme du retour en garde.` },
      { title: profile.techniques?.doubleJab ? 'Double jab · direct — appris' : 'Double jab · direct — à apprendre', text: profile.techniques?.doubleJab
        ? `${touch ? 'A → A → B' : 'J → J → K'}. Deux jabs rapides, puis le direct. Cette technique élargit tes choix sans augmenter les capacités.`
        : unlocked ? 'Parle à The Octopus au gym de Montréal et termine son drill du double jab. Le coût de la séance est annoncé avant de commencer.'
          : 'The Octopus proposera ce drill après ton retour d’une participation terminée aux Gants de bronze.' },
      { title: 'Se défendre', text: touch ? 'Joypad haut : garde à la tête. Bas : garde au corps. Gauche/droite : esquive. Bas + A/B : frappe au corps.'
        : 'W : garde à la tête. S : garde au corps. A/D : esquive. S + J/K : frappe au corps.' },
      { title: 'Tes repères', text: 'Fredo est ton coach, Rémi ton partenaire de sparring. The Octopus partage ses drills et ses conseils. Dormir remplit seulement l’énergie de la journée; tes gestes et capacités restent acquis.' },
    ] },
  ];
}

/** Install after the host has created its pause UI and console controls.
 * The host's controls must prioritize journal.panel while journal.isOpen.
 * Closing returns to the existing paused menu; it never resumes gameplay.
 */
export function installCareerJournal(ui) {
  if (ui.journal) return ui.journal;
  const root = ui.root, anchor = root.querySelector('.commands-open-button');
  if (!anchor) return null;
  const abort = new AbortController(), suppressed = new Map();
  const button = document.createElement('button'); button.type = 'button'; button.className = 'career-journal-open'; button.textContent = 'Carnet';
  anchor.after(button);
  const panel = document.createElement('section'); panel.className = 'career-journal-panel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Carnet de boxeur');
  panel.innerHTML = '<div class="snes-reading journal-reading"><p class="journal-eyebrow">LA TUQUE ROUGE · CARNET</p><h2></h2><p class="journal-description"></p><dl class="journal-entries"></dl></div><nav class="snes-choices journal-choices" aria-label="Pages du carnet"><button type="button" data-journal-page="objectives">Objectifs</button><button type="button" data-journal-page="record">Parcours</button><button type="button" data-journal-page="techniques">Techniques</button><button type="button" class="journal-close">← Retour au menu</button></nav>';
  root.append(panel);
  const entries = panel.querySelector('.journal-entries'), reading = panel.querySelector('.journal-reading');
  let currentPage = 'objectives';
  const clear = () => { ui.clearInputs?.(); ui.clear?.(); ui.controls?.clear(); };
  const focus = element => { element?.focus({ preventScroll: true }); element?.scrollIntoView({ block: 'nearest' }); };
  const render = id => {
    currentPage = id;
    const page = careerJournalPages(careerProfile.snapshot(), document.documentElement.dataset.touch === 'true').find(page => page.id === id);
    panel.querySelector('h2').textContent = page.title; panel.querySelector('.journal-description').textContent = page.description;
    entries.replaceChildren();
    for (const row of page.rows) {
      const group = document.createElement('div'), title = document.createElement('dt'), text = document.createElement('dd');
      title.textContent = row.title; text.textContent = row.text; group.append(title, text); entries.append(group);
    }
    for (const pageButton of panel.querySelectorAll('[data-journal-page]')) pageButton.setAttribute('aria-current', pageButton.dataset.journalPage === id ? 'page' : 'false');
    reading.scrollTop = 0;
  };
  const api = {
    panel, button,
    get isOpen() { return !panel.hidden; },
    open() {
      if (!panel.hidden || ['running', 'knockdown'].includes(ui.phase) || ui.paused === false && root.dataset.mode === 'walking') return;
      clear();
      for (const other of root.querySelectorAll(':scope > section')) if (other !== panel) { suppressed.set(other, other.inert); other.inert = true; }
      root.classList.add('is-career-journal-open'); panel.hidden = false; render(currentPage);
      focus(panel.querySelector(`[data-journal-page="${currentPage}"]`)); ui.controls?.refresh();
    },
    close({ focusButton = true } = {}) {
      if (panel.hidden) return;
      clear(); panel.hidden = true; root.classList.remove('is-career-journal-open');
      for (const [other, inert] of suppressed) if (other.isConnected) other.inert = inert;
      suppressed.clear(); if (focusButton && button.isConnected) focus(button); ui.controls?.refresh();
    },
    destroy() { api.close({ focusButton: false }); abort.abort(); disposeScrollCues(); button.remove(); panel.remove(); if (ui.journal === api) ui.journal = null; },
  };
  const on = (element, event, handler) => element.addEventListener(event, handler, { signal: abort.signal });
  on(button, 'click', () => api.open());
  on(panel.querySelector('.journal-close'), 'click', () => api.close());
  for (const pageButton of panel.querySelectorAll('[data-journal-page]')) on(pageButton, 'click', () => { clear(); render(pageButton.dataset.journalPage); focus(pageButton); });
  const disposeScrollCues = installMenuScrollCues(panel);
  ui.abort?.signal.addEventListener('abort', () => api.destroy(), { once: true });
  ui.journal = api;
  return api;
}
