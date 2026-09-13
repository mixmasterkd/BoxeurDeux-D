import { splitMenu } from './MenuWindow.js';
import { installConsoleControls, careerMenuOpen } from './GameControls.js';
import { careerMoney, careerMedals, careerChapter, careerImportSummary } from './CareerSummary.js';
import './gym.css';
import { mountSideControls, TOUCH_PORTRAIT_QUERY, TOUCH_CONTROLS_QUERY } from './GameLayout.js';

const noop = () => {};

/** Source-aware controls for the gym. Movement and activities belong to the scene. */
export class GymUI {
  constructor(callbacks = {}, options = {}) {
    this.options = {
      eyebrow: 'LE GYM DU QUARTIER', title: 'Explorer le gym', welcome: 'Bienvenue au gym',
      hint: 'Approchez-vous de Rémi ou d’un atelier.', pauseText: 'Le gym vous attend. Reprenez quand vous êtes prêt.',
      commandsTitle: 'Commandes du gym', commandsHint: 'Approchez-vous de Rémi ou d’un atelier, puis interagissez.', ...options,
    };
    this.callbacks = Object.fromEntries([
      'onMove', 'onInteract', 'onPause', 'onResume', 'onCloseDialog', 'onSparring', 'onBag', 'onShadow', 'onRhythm', 'onFight', 'onDialogAction', 'onExportCareer', 'onImportCareer', 'onInspectCareer', 'onRefreshCareer', 'onBlur',
    ].map((name) => [name, callbacks[name] ?? noop]));
    this.root = document.getElementById('gym-ui');
    if (!this.root) throw new Error('GymUI requires #gym-ui inside the game stage.');
    this.stage = document.getElementById('stage');
    this.menuPointers = new Map();
    this.paused = false;
    this.commandsOpen = false;
    this.pendingCareerImport = null;
    this.dialog = null;
    this.nearby = null;
    this.destroyed = false;
    this.abort = new AbortController();
    this.portraitQuery = window.matchMedia(TOUCH_PORTRAIT_QUERY);
    this.controlsQuery = window.matchMedia(TOUCH_CONTROLS_QUERY);
    this.root.hidden = false;
    this.root.dataset.mode = 'walking';
    this.root.innerHTML = `
      <header class="gym-hud">
        <div class="gym-heading"><span class="gym-eyebrow">LE GYM DU QUARTIER</span><h2>Explorer le gym</h2></div>
        <button type="button" class="gym-pause-button" aria-label="Mettre la visite en pause" title="Pause — P ou Échap"><span aria-hidden="true">Ⅱ</span><span>Pause</span></button>
      </header>
      <div class="gym-daily" aria-label="Journée, argent et énergie"><span class="gym-day">Jour 1</span><span class="gym-money">0 $</span><span class="gym-energy">Énergie 100/100</span></div>
      <div class="gym-nearby" role="status" aria-live="polite" aria-atomic="true"><span class="gym-nearby-label">Bienvenue au gym</span><span class="gym-nearby-hint">Approchez-vous de Rémi ou d’un atelier.</span></div>
      <div class="gym-movement"></div>
      <button type="button" class="gym-interact-button" disabled><span class="gym-interact-key" aria-hidden="true">A</span><span class="gym-interact-label">Interagir</span></button>
      <div class="gym-modal-shade" hidden></div>
      <section class="gym-dialog" role="dialog" aria-modal="true" aria-labelledby="gym-dialog-title" aria-describedby="gym-dialog-text" hidden>
        <div class="gym-dialog-copy"><p class="gym-dialog-speaker gym-eyebrow"></p><h2 id="gym-dialog-title"></h2><p id="gym-dialog-text"></p></div>
        <div class="gym-dialog-actions"></div>
      </section>
      <section class="gym-pause-panel" role="dialog" aria-modal="true" aria-labelledby="gym-pause-title" hidden>
        <p class="gym-eyebrow">ON PREND SON TEMPS</p><h2 id="gym-pause-title">Visite en pause</h2><p>Le gym vous attend. Reprenez quand vous êtes prêt.</p><div class="gym-career"><span>END <b data-career="endurance">100/110</b></span><span>RÉS <b data-career="resistance">100/108</b></span><span>PUI <b data-career="power">0/5</b></span><span>RÉC <b data-career="recovery">+0%</b></span><span>ARGENT <b data-career="money">0 / 200 $</b></span><span>COLLECTION <b data-career="medals">À gagner</b></span></div><p class="gym-chapter"></p><button type="button" class="gym-resume-button">Continuer la visite →</button><button type="button" class="commands-open-button">Commandes</button><div class="gym-save-tools"><button type="button" class="gym-export-button">Exporter la sauvegarde</button><button type="button" class="gym-import-button">Importer</button><input type="file" class="gym-import-file" accept="application/json,.json" hidden></div><small class="gym-save-status">Sauvegarde locale automatique</small>
      </section>
      <section class="commands-panel" role="dialog" aria-modal="true" aria-labelledby="gym-commands-title" hidden>
        <p class="commands-eyebrow">VISITE EN PAUSE</p><h2 id="gym-commands-title">Commandes du gym</h2>
        <div class="commands-grid"><dl>
          <div><dt>Marcher</dt><dd>WASD</dd></div>
          <div><dt>Interagir</dt><dd>E</dd></div>
          <div><dt>Pause / retour</dt><dd>P ou Échap</dd></div>
        </dl><div class="commands-notes"><p>Approchez-vous de Rémi ou d’un atelier, puis interagissez.</p><p class="commands-desktop-only">WASD choisit dans les menus; E confirme. P ou Échap revient en arrière.</p><p class="commands-touch-tip">Au tactile : joypad à gauche, A pour interagir, ☰ pour le menu. Dans les menus, le joypad choisit, A valide et B revient.</p></div></div>
        <button type="button" class="commands-back-button">← Retour au menu pause</button>
      </section>
      <section class="gym-import-confirm" role="dialog" aria-modal="true" aria-labelledby="gym-import-title" hidden>
        <p class="commands-eyebrow">SAUVEGARDE</p><h2 id="gym-import-title">Remplacer votre partie ?</h2>
        <div class="commands-notes"><p class="gym-import-preview"></p><p>La progression actuelle sera remplacée. Une copie précédente est conservée si le stockage est disponible; exportez votre partie pour garder votre propre copie.</p></div>
        <button type="button" class="gym-import-cancel">Annuler</button>
        <button type="button" class="gym-import-replace gym-dialog-button">Remplacer ma partie</button>
      </section>
    `;
    mountSideControls(this.root, { left: ['.gym-movement'], right: ['.gym-pause-button', '.gym-interact-button'] });
    this.elements = Object.fromEntries([
      'gym-pause-button', 'gym-nearby', 'gym-nearby-label', 'gym-nearby-hint', 'gym-day', 'gym-energy', 'gym-money', 'gym-chapter',
      'gym-movement', 'gym-interact-button', 'gym-interact-label',
      'gym-modal-shade', 'gym-dialog', 'gym-dialog-speaker', 'gym-dialog-actions',
      'gym-pause-panel', 'gym-resume-button', 'commands-panel', 'commands-open-button', 'commands-back-button',
      'gym-export-button', 'gym-import-button', 'gym-import-file', 'gym-save-status',
      'gym-import-confirm', 'gym-import-preview', 'gym-import-cancel', 'gym-import-replace',
    ].map((name) => [name, this.root.querySelector(`.${name}`)]));
    for (const [selector, value] of [
      ['.gym-heading .gym-eyebrow', this.options.eyebrow], ['.gym-heading h2', this.options.title],
      ['.gym-pause-panel > p:not(.gym-eyebrow)', this.options.pauseText],
      ['#gym-commands-title', this.options.commandsTitle], ['.commands-panel .commands-notes p', this.options.commandsHint],
    ]) this.setText(this.root.querySelector(selector), value);
    // The main action stays above career details on a short landscape phone.
    // Extra progression is still available by scrolling the pause panel.
    this.root.querySelector('.gym-career').before(this.elements['gym-resume-button']);
    splitMenu(this.elements['gym-pause-panel'], {
      reading: ['.gym-eyebrow', 'h2', ':scope > p:not(.gym-eyebrow)', '.gym-career', '.gym-save-status'],
      actions: ['.gym-resume-button', '.commands-open-button', '.gym-save-tools'],
    });
    splitMenu(this.elements['gym-import-confirm'], {
      reading: ['.commands-eyebrow', 'h2', '.commands-notes'],
      actions: ['.gym-import-cancel', '.gym-import-replace'],
    });
    this.bindEvents();
    this.controls = installConsoleControls(this, 'gym');
    this.stage.inert = this.portraitQuery.matches || careerMenuOpen();
    if (this.portraitQuery.matches || document.hidden) this.loseFocus();
  }

  listen(target, event, callback, options = {}) {
    target.addEventListener(event, callback, { ...options, signal: this.abort.signal });
  }

  /** A release from an old movement touch must never activate a new dialog. */
  listenActivation(button, callback) {
    this.listen(button, 'pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      this.menuPointers.set(button, event.pointerId);
    });
    this.listen(button, 'pointercancel', () => this.menuPointers.delete(button));
    this.listen(button, 'click', (event) => {
      if (!this.consumeActivation(button, event)) return;
      callback();
    });
  }

  consumeActivation(button, event) {
    const pointerId = this.menuPointers.get(button);
    this.menuPointers.delete(button);
    if (event.detail !== 0 && (pointerId === undefined
      || (typeof event.pointerId === 'number' && event.pointerId !== pointerId))) return false;
    if (this.destroyed || this.portraitQuery.matches || document.hidden || careerMenuOpen()) return false;
    button.blur();
    return true;
  }

  bindEvents() {
    this.listen(window, 'blur', () => this.loseFocus());
    this.listen(this.controlsQuery, 'change', () => this.loseFocus());
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.loseFocus();
    });
    this.listen(this.portraitQuery, 'change', (event) => {
      this.stage.inert = event.matches || careerMenuOpen();
      if (event.matches) this.loseFocus();
    });
    this.listen(window, 'career-menu-change', event => {
      this.clearInputs(); this.stage.inert = this.portraitQuery.matches || event.detail.open;
      if (!event.detail.open) this.callbacks.onRefreshCareer();
    });
    this.listenActivation(this.elements['gym-pause-button'], () => this.requestPause());
    this.listenActivation(this.elements['gym-resume-button'], () => {
      if (!this.paused) return;
      this.clearInputs();
      this.callbacks.onResume();
    });
    this.listenActivation(this.elements['gym-interact-button'], () => this.interact());
    this.listenActivation(this.elements['commands-open-button'], () => this.showCommands(true));
    this.listenActivation(this.elements['commands-back-button'], () => this.showCommands(false));
    this.listenActivation(this.elements['gym-export-button'], () => this.callbacks.onExportCareer());
    this.listenActivation(this.elements['gym-import-button'], () => { this.elements['gym-import-file'].value = ''; this.elements['gym-import-file'].click(); });
    this.listen(this.elements['gym-import-file'], 'change', async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        if (file.size > 1_000_000) throw new Error('Ce fichier est trop volumineux pour une sauvegarde.');
        const text = await file.text(); if (this.destroyed) return;
        const profile = this.callbacks.onInspectCareer(text);
        if (!profile?.stats) throw new Error('Ce fichier n’est pas une sauvegarde compatible.');
        this.clearInputs(); this.pendingCareerImport = text;
        this.setText(this.elements['gym-import-preview'], `Partie sélectionnée : ${careerImportSummary(profile)}`);
        this.renderMode(); this.elements['gym-import-cancel'].focus({ preventScroll: true });
      } catch (error) { this.setText(this.elements['gym-save-status'], error.message); }
    });
    this.listenActivation(this.elements['gym-import-cancel'], () => this.cancelCareerImport());
    this.listenActivation(this.elements['gym-import-replace'], () => {
      if (!this.pendingCareerImport) return;
      try { this.callbacks.onImportCareer(this.pendingCareerImport); }
      catch (error) { this.setText(this.elements['gym-save-status'], error.message); }
      this.cancelCareerImport();
    });
    // Delegate the changing choices: revisiting a station does not retain old
    // buttons or register new listeners on the UI's long-lived abort signal.
    const actionRoot = this.elements['gym-dialog-actions'];
    const actionButton = (event) => {
      const button = event.target instanceof Element ? event.target.closest('button[data-gym-action]') : null;
      return button?.parentElement === actionRoot ? button : null;
    };
    this.listen(actionRoot, 'pointerdown', (event) => {
      const button = actionButton(event);
      if (!button || (event.pointerType === 'mouse' && event.button !== 0)) return;
      this.menuPointers.set(button, event.pointerId);
    });
    this.listen(actionRoot, 'pointercancel', (event) => {
      const button = actionButton(event);
      if (button) this.menuPointers.delete(button);
    });
    this.listen(actionRoot, 'click', (event) => {
      const button = actionButton(event);
      if (!button || button.disabled || !this.consumeActivation(button, event) || this.paused || !this.dialog) return;
      this.clearInputs();
      if (button.dataset.gymAction === 'sparring') this.callbacks.onSparring(button.dataset.lesson ?? 'free');
      else if (button.dataset.gymAction === 'bag') this.callbacks.onBag();
      else if (button.dataset.gymAction === 'shadow') this.callbacks.onShadow();
      else if (button.dataset.gymAction === 'rhythm') this.callbacks.onRhythm(button.dataset.activity);
      else if (button.dataset.gymAction === 'fight') this.callbacks.onFight();
      else if (button.dataset.gymAction === 'close') this.callbacks.onCloseDialog();
      else this.callbacks.onDialogAction(this.dialog.actions[Number(button.dataset.actionIndex)]);
    });
  }

  canMove() {
    return !this.destroyed && !this.paused && !this.dialog && !this.portraitQuery.matches && !document.hidden && !careerMenuOpen();
  }

  interact() {
    if (!this.canMove() || !this.nearby || this.nearby.autoTravel) return;
    this.clearInputs();
    this.callbacks.onInteract();
  }

  requestPause() {
    if (this.paused || this.dialog || this.destroyed) return;
    this.clearInputs();
    this.callbacks.onPause();
  }

  clearInputs() { this.controls?.clear(); this.menuPointers.clear(); }

  loseFocus() {
    if (this.destroyed) return;
    this.clearInputs();
    this.callbacks.onBlur();
  }

  setText(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  setCareer(profile, saveStatus) {
    if (!profile) return;
    for (const [key, value] of Object.entries({ endurance: `${profile.stats.endurance}/${profile.caps.endurance}`, resistance: `${profile.stats.resistance}/${profile.caps.resistance}`, power: `${profile.stats.power}/${profile.caps.power}`, recovery: `+${Math.round((profile.stats.recovery - 1) * 100)}%` })) this.setText(this.root.querySelector(`[data-career="${key}"]`), value);
    if (saveStatus) this.setText(this.elements['gym-save-status'], saveStatus.message);
    if (profile.daily) this.setDaily(profile.daily);
    this.setText(this.elements['gym-money'], `${profile.wallet?.money ?? 0} $`);
    this.setText(this.root.querySelector('[data-career="money"]'), careerMoney(profile));
    this.setText(this.root.querySelector('[data-career="medals"]'), careerMedals(profile));
    this.setText(this.elements['gym-chapter'], careerChapter(profile));
  }

  setDaily({ day, energy, maxEnergy = 100 }) {
    this.setText(this.elements['gym-day'], `Jour ${day}`);
    this.setText(this.elements['gym-energy'], `Énergie ${energy}/${maxEnergy}`);
    this.elements['gym-energy'].dataset.low = String(energy < 15);
  }

  cancelCareerImport() {
    if (!this.pendingCareerImport) return;
    this.clearInputs(); this.pendingCareerImport = null; this.renderMode();
    this.elements['gym-import-button'].focus({ preventScroll: true });
  }

  update(state = {}) {
    if (this.destroyed) return;
    const wasPaused = this.paused;
    this.paused = Boolean(state.paused);
    if (!this.paused) this.commandsOpen = false;
    this.nearby = state.nearby ?? null;
    if (wasPaused !== this.paused) this.clearInputs();
    this.renderMode();
    this.setText(this.elements['gym-nearby-label'], this.nearby?.label ?? this.options.welcome);
    this.setText(this.elements['gym-nearby-hint'], this.nearby
      ? this.nearby.autoTravel ? 'Avancez pour passer.' : document.documentElement.dataset.touch === 'true' ? 'Appuyez sur A pour interagir.' : 'E pour interagir.'
      : this.options.hint);
    this.elements['gym-nearby'].classList.toggle('is-available', Boolean(this.nearby));
    this.elements['gym-interact-button'].disabled = !this.canMove() || !this.nearby || Boolean(this.nearby.autoTravel);
    this.controls?.refresh();
    if (this.paused && !wasPaused && !this.portraitQuery.matches) {
      this.elements['gym-resume-button'].focus({ preventScroll: true });
    } else if (wasPaused && !this.paused && this.dialog && !this.portraitQuery.matches) {
      this.elements['gym-dialog-actions'].querySelector('button')?.focus({ preventScroll: true });
    } else if (wasPaused && !this.paused && this.elements['gym-pause-panel'].contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  renderMode() {
    const blocked = this.paused || Boolean(this.dialog);
    this.root.dataset.mode = this.paused ? 'paused' : this.dialog ? 'dialog' : 'walking';
    this.elements['gym-modal-shade'].hidden = !blocked;
    this.elements['gym-pause-panel'].hidden = !this.paused || this.commandsOpen || Boolean(this.pendingCareerImport);
    this.elements['commands-panel'].hidden = !this.paused || !this.commandsOpen;
    this.elements['gym-import-confirm'].hidden = !this.paused || !this.pendingCareerImport;
    this.elements['gym-dialog'].hidden = !this.dialog || this.paused;
    this.elements['gym-pause-button'].disabled = blocked;
    this.elements['gym-interact-button'].disabled = blocked || !this.nearby;
    this.controls?.refresh();
  }

  showCommands(open) {
    if (!this.paused || this.destroyed) return;
    this.clearInputs();
    this.commandsOpen = open;
    this.renderMode();
    if (!this.portraitQuery.matches) this.elements[open ? 'commands-back-button' : 'commands-open-button'].focus({ preventScroll: true });
  }

  showDialog({ speaker = '', title = '', text = '', actions = [], image = null, imageAlt = '' } = {}) {
    if (this.destroyed) return;
    this.clearInputs();
    this.dialog = { speaker, title, text, actions };
    let picture = this.root.querySelector('.gym-dialog-portrait');
    if (image) {
      if (!picture) { picture = document.createElement('img'); picture.className = 'gym-dialog-portrait'; this.elements['gym-dialog-speaker'].before(picture); }
      picture.src = `${import.meta.env.BASE_URL}${image}`; picture.alt = imageAlt; picture.hidden = false;
    } else if (picture) picture.hidden = true;
    this.setText(this.elements['gym-dialog-speaker'], speaker);
    this.setText(this.root.querySelector('#gym-dialog-title'), title);
    this.setText(this.root.querySelector('#gym-dialog-text'), text);
    const actionRoot = this.elements['gym-dialog-actions'];
    actionRoot.replaceChildren();
    const choices = actions.length ? actions : [{ id: 'close', label: 'Continuer la visite →' }];
    for (const [index, action] of choices.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `gym-dialog-button${action.id === 'sparring' ? ' gym-session-button' : action.id === 'bag' ? ' gym-bag-button' : action.id === 'shadow' ? ' gym-shadow-button' : action.id === 'rhythm' ? ' gym-rhythm-button' : action.id === 'fight' ? ' gym-fight-button' : ' gym-close-button'}`;
      button.dataset.gymAction = action.id;
      button.dataset.actionIndex = index;
      button.disabled = Boolean(action.disabled);
      if (action.lesson) button.dataset.lesson = action.lesson;
      if (action.activity) button.dataset.activity = action.activity;
      button.textContent = action.label;
      actionRoot.append(button);
    }
    this.renderMode();
    if (!this.paused && !this.portraitQuery.matches) actionRoot.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  closeDialog() {
    if (this.destroyed) return;
    this.clearInputs();
    if (this.elements['gym-dialog'].contains(document.activeElement)) document.activeElement.blur();
    this.dialog = null;
    this.renderMode();
  }

  destroy() {
    this.controls?.destroy();
    if (this.destroyed) return;
    this.clearInputs();
    this.destroyed = true;
    this.abort.abort();
    this.root.replaceChildren();
    this.root.hidden = true;
    this.stage.inert = this.portraitQuery.matches || careerMenuOpen();
  }
}
