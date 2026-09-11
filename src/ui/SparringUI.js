import { installConsoleControls } from './GameControls.js';
import { mountSideControls, TOUCH_PORTRAIT_QUERY, TOUCH_CONTROLS_QUERY } from './GameLayout.js';
import { LESSONS } from '../game/TrainingCoach.js';
import { BoutHUD } from './BoutHUD.js';

const openSparring = id => id === 'free' || id === 'resistance';
const activePhase = phase => phase === 'running' || phase === 'knockdown';

const REMI_LABELS = {
  idle: 'Il vous observe',
  guard: 'Garde fermée',
  guarding: 'Garde fermée',
  telegraph: 'Il prépare son coup…',
  windup: 'Il prépare son coup…',
  tellLeft: 'Il prépare son coup…',
  tellRight: 'Il prépare son coup…',
  jab: 'Jab !',
  direct: 'Direct !',
  cross: 'Direct !',
  attack: 'Il attaque !',
  attacking: 'Il attaque !',
  recovery: 'Une ouverture !',
  recovering: 'Une ouverture !',
  open: 'Une ouverture !',
  hit: 'Bien touché !',
  hurt: 'Bien touché !',
  block: 'Coup bloqué',
  blocked: 'Coup bloqué',
  fall: 'Rémi va au tapis',
  down: 'Rémi reprend ses appuis',
  rise: 'Rémi se relève',
};

const noop = () => {};

/** DOM overlay and source-aware inputs. Combat timing belongs to SparringSession. */
export class SparringUI {
  constructor(callbacks = {}) {
    this.callbacks = Object.fromEntries([
      'onAction', 'onGuard', 'onStart', 'onPause', 'onResume', 'onRestart', 'onSettings', 'onBlur',
      'onChooseLesson', 'onAudioGesture', 'onAudioSettings', 'onReturnGym', 'onNextRound',
    ].map((name) => [name, callbacks[name] ?? noop]));
    this.phase = 'ready';
    this.commandsOpen = false;
    this.settings = { tempo: 'normal', recovery: 1, lesson: 'free' };
    this.audio = { muted: false, volume: 0.35, available: true };
    this.freeTempo = 'normal';
    this.menuPointers = new Map();
    this.abort = new AbortController();
    this.root = document.getElementById('sparring-ui');
    this.portraitQuery = window.matchMedia(TOUCH_PORTRAIT_QUERY);
    this.controlsQuery = window.matchMedia(TOUCH_CONTROLS_QUERY);
    this.root.innerHTML = `
      <div class="menu-shade is-visible" aria-hidden="true"></div>
      <div class="fight-hud">
        <div class="fighter-info">
          <button type="button" class="return-gym-button">← Retour au gym</button>
          <div class="fighter-eyebrow">DANS LE COIN BLEU</div>
          <div class="fighter-name">Vous</div>
          <div class="stamina-track" role="progressbar" aria-label="Votre endurance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="stamina-fill"></div></div>
          <div class="stamina-label"><span>ENDURANCE</span><span data-value="stamina">100</span></div>
        </div>
        <div class="round-clock">
          <div class="round-eyebrow">ROUND 01</div>
          <span class="round-time" aria-label="Temps restant">1:00</span>
          <span class="round-rule" aria-hidden="true"></span>
        </div>
        <div class="fighter-info opponent-info">
          <div class="fighter-eyebrow">VOTRE PARTENAIRE</div>
          <div class="fighter-name">Rémi le Tank</div>
          <div class="remi-status"><span class="status-dot" aria-hidden="true"></span><span data-value="remi-status">Prêt à vous entraîner</span></div>
          <button type="button" class="pause-button" aria-label="Mettre en pause" title="Pause — P ou Échap" disabled>Ⅱ</button>
          <button type="button" class="audio-button" aria-label="Couper le son — M" title="Son — M" aria-pressed="false"><span class="audio-icon" aria-hidden="true">♪</span><span class="audio-label">Son</span></button>
        </div>
      </div>
      <div class="session-caption"><span class="touches-count" data-value="landed">0</span> TOUCHES DONNÉES <span aria-hidden="true">·</span> <span class="touches-count" data-value="received">0</span> REÇUES</div>
      <div class="fight-feedback" role="status" aria-live="polite" aria-atomic="true"></div>
      <aside class="training-coach" aria-label="Conseil de Rémi" hidden>
        <div class="coach-heading"><span>RÉMI VOUS GUIDE</span><strong data-value="training-progress">0 / 3</strong></div>
        <div class="coach-steps" aria-hidden="true"><i></i><i></i><i></i></div>
        <p class="coach-objective"></p>
        <p class="coach-cue" role="status" aria-live="polite" aria-atomic="true"></p>
      </aside>
      <section class="round-panel" aria-labelledby="round-panel-title">
        <div class="panel-intro">
        <p class="panel-eyebrow">60 SECONDES POUR APPRENDRE</p>
        <h2 class="panel-heading" id="round-panel-title">Un round.\nÀ votre rythme.</h2>
        <p class="panel-copy">Observez ses épaules, protégez-vous, puis profitez des ouvertures. Relâchez la garde pour reprendre votre souffle.</p>
        <div class="lesson-choice">
          <label for="lesson-select">Votre séance</label>
          <select id="lesson-select" name="lesson" aria-describedby="lesson-description">${Object.values(LESSONS).map((lesson) => `<option value="${lesson.id}">${lesson.title}</option>`).join('')}</select>
          <p id="lesson-description" class="lesson-description"></p>
        </div>
        <p class="lesson-objective" hidden></p>
        <div class="round-results" hidden>
          <div class="result-cell"><strong data-value="result-landed">0</strong><span>touches données</span></div>
          <div class="result-cell"><strong data-value="result-received">0</strong><span>touches reçues</span></div>
          <p class="round-detail"></p>
        </div>
        <div class="training-summary" hidden>
          <p><strong>Bien joué</strong><span data-value="training-positive"></span></p>
          <p><strong>À travailler</strong><span data-value="training-improve"></span></p>
        </div>
        <button type="button" class="commands-open-button" hidden>Commandes</button>
        </div>
        <div class="panel-options">
        <div class="round-settings">
          <label>Rythme de Rémi<select name="tempo" aria-label="Rythme de Rémi"><option value="calm">Tranquille</option><option value="normal" selected>Normal</option><option value="fast">Vif</option></select></label>
          <label>Récupération<select name="recovery" aria-label="Récupération d’endurance"><option value="1" selected>Normale</option><option value="1.5">Rapide</option></select></label>
        </div>
        <p class="lesson-tempo" hidden>Rémi prend son temps · 3 réussites · 60 s max.</p>
        <label class="audio-volume" for="audio-volume"><span>Volume <output data-value="audio-volume">35 %</output></span><input id="audio-volume" name="volume" type="range" min="0" max="100" value="35" step="5" aria-label="Volume du gym"></label>
        </div>
        <div class="panel-actions">
        <button type="button" class="primary-button">Entrer en sparring →</button>
        <button type="button" class="secondary-button" hidden>Recommencer le round</button>
        <button type="button" class="choose-session-button" hidden>Choisir une séance</button>
        <button type="button" class="next-lesson-button" hidden>Leçon suivante →</button>
        <p class="round-footnote">Sparring au gym · Aucun combat officiel</p>
        </div>
      </section>
      <section class="commands-panel" role="dialog" aria-modal="true" aria-labelledby="sparring-commands-title" hidden>
        <p class="commands-eyebrow">ROUND EN PAUSE</p><h2 id="sparring-commands-title">Commandes du sparring</h2>
        <div class="commands-grid"><dl>
          <div><dt>Jab gauche</dt><dd>J</dd></div>
          <div><dt>Direct droit</dt><dd>K</dd></div>
          <div><dt>Crochet gauche en combo</dt><dd>J → K → J</dd></div>
          <div><dt>Garde haute / basse</dt><dd>↑ / ↓ ou W / S maintenu</dd></div><div><dt>Frappe au corps</dt><dd>↓ ou S + J / K</dd></div>
        </dl><dl>
          <div><dt>Esquive gauche / droite</dt><dd>A / D ou ← / →</dd></div>
          <div><dt>Pause / retour</dt><dd>P ou Échap</dd></div>
          <div><dt>Son / muet</dt><dd>M</dd></div>
        </dl></div>
        <p class="commands-tip">Relâchez la garde pour récupérer. Une pression par frappe ou esquive.</p>
        <p class="commands-tip">En sparring libre : attendez le retour en garde, puis enchaînez sous une demi-seconde. Jab, direct, crochet coûtent 48 d’endurance. La garde haute, une esquive, un coup reçu ou une pause interrompt le combo. Maintenir bas permet d’enchaîner au corps. Les leçons gardent jab et direct.</p>
        <p class="commands-touch-tip commands-tip">Au tactile : joypad à gauche (haut : tête, bas : corps, côtés : esquives), A pour le jab, B pour le direct. Bas + A / B frappe au corps. Dans les menus, A valide et B revient; le joypad choisit.</p>
        <p class="commands-tip">Séance Résistance et relevés : au tapis, alternez J et K, ou A et B, six fois avant dix. Relâchez entre chaque pression et suivez le repère, sans marteler. Le décompte se met aussi en pause avec P / Échap ou ☰.</p>
        <button type="button" class="commands-back-button">← Retour au menu pause</button>
      </section>
      <div class="action-dock defense-dock"></div>
      <div class="action-dock attack-dock" aria-label="Attaques">
        <span class="dock-caption">À VOUS DE JOUER</span>
        <button type="button" class="control-button attack-control" data-action="jab" aria-label="A — Jab" disabled><span class="control-key">A</span><span class="control-label">Jab</span></button>
        <button type="button" class="control-button attack-control" data-action="cross" aria-label="B — Direct" disabled><span class="control-key">B</span><span class="control-label">Direct</span></button>
      </div>
    `;
    mountSideControls(this.root, { left: ['.defense-dock'], right: ['.pause-button', '.audio-button', '.attack-dock'] });
    this.root.querySelector('.panel-actions').append(this.root.querySelector('.return-gym-button'));
    this.elements = Object.fromEntries([
      'menu-shade', 'stamina-track', 'stamina-fill', 'round-time', 'remi-status', 'pause-button',
      'fight-feedback', 'round-panel', 'panel-eyebrow', 'panel-heading', 'panel-copy',
      'round-results', 'round-detail', 'round-settings', 'primary-button', 'secondary-button',
      'audio-button', 'audio-label', 'audio-icon', 'audio-volume', 'lesson-choice', 'lesson-description',
      'lesson-objective', 'lesson-tempo', 'choose-session-button', 'next-lesson-button',
      'training-coach', 'coach-objective', 'coach-cue', 'training-summary', 'return-gym-button',
      'commands-panel', 'commands-open-button', 'commands-back-button',
    ].map((className) => [className, this.root.querySelector(`.${className}`)]));
    this.values = Object.fromEntries([...this.root.querySelectorAll('[data-value]')]
      .map((element) => [element.dataset.value, element]));
    this.buttons = new Map([...this.root.querySelectorAll('[data-action]')]
      .map((button) => [button.dataset.action, button]));
    this.bindEvents();
    this.controls = installConsoleControls(this, 'combat');
    this.boutHUD = new BoutHUD(this);
    this.setAudioState(this.audio);
    document.getElementById('stage').inert = this.portraitQuery.matches;
  }

  listen(target, event, callback, options = {}) {
    target.addEventListener(event, callback, { ...options, signal: this.abort.signal });
  }

  listenActivation(button, callback) {
    this.listen(button, 'pointerdown', (event) => {
      this.callbacks.onAudioGesture();
      this.menuPointers.set(button, event.pointerId);
    });
    this.listen(button, 'pointercancel', () => this.menuPointers.delete(button));
    this.listen(button, 'click', (event) => {
      const pointerId = this.menuPointers.get(button);
      this.menuPointers.delete(button);
      // A finger held on Garde can end above a newly displayed pause menu.
      // Only activate a menu button when this press began on that button.
      // Keyboard and assistive clicks have detail 0 and need no pointer.
      if (event.detail !== 0 && (pointerId === undefined
        || (typeof event.pointerId === 'number' && event.pointerId !== pointerId))) return;
      this.callbacks.onAudioGesture();
      callback(event);
    });
  }

  bindEvents() {
    this.listenActivation(this.elements['return-gym-button'], () => {
      this.clearInputs();
      this.callbacks.onReturnGym();
    });
    this.listen(window, 'blur', () => this.loseFocus());
    this.listen(this.controlsQuery, 'change', () => this.loseFocus());
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.loseFocus();
    });
    this.listen(this.portraitQuery, 'change', (event) => {
      document.getElementById('stage').inert = event.matches;
      if (event.matches) this.loseFocus();
    });
    this.listenActivation(this.elements['pause-button'], (event) => {
      event.currentTarget.blur();
      if (activePhase(this.phase)) this.callbacks.onPause();
      this.clearInputs();
    });
    this.listenActivation(this.elements['commands-open-button'], () => this.showCommands(true));
    this.listenActivation(this.elements['commands-back-button'], () => this.showCommands(false));
    this.listenActivation(this.elements['primary-button'], (event) => {
      event.currentTarget.blur();
      if (this.portraitQuery.matches) return;
      this.clearInputs();
      if (this.phase === 'ready') this.callbacks.onStart({ ...this.settings });
      else if (this.phase === 'paused') this.callbacks.onResume();
      else if (this.phase === 'finished') this.callbacks.onRestart({ ...this.settings });
      else if (this.phase === 'between') this.callbacks.onNextRound();
    });
    this.listenActivation(this.elements['secondary-button'], (event) => {
      event.currentTarget.blur();
      this.clearInputs();
      this.callbacks.onRestart({ ...this.settings });
    });
    this.listenActivation(this.elements['choose-session-button'], (event) => {
      event.currentTarget.blur();
      this.clearInputs();
      this.callbacks.onChooseLesson();
    });
    this.listenActivation(this.elements['next-lesson-button'], (event) => {
      event.currentTarget.blur();
      const lessons = Object.values(LESSONS).filter((lesson) => !openSparring(lesson.id));
      const next = lessons[lessons.findIndex((lesson) => lesson.id === this.settings.lesson) + 1];
      if (!next) return;
      this.clearInputs();
      this.settings = { ...this.settings, lesson: next.id, tempo: 'calm' };
      this.callbacks.onRestart({ ...this.settings });
    });
    this.listenActivation(this.elements['audio-button'], (event) => {
      event.currentTarget.blur();
      this.changeAudio({ muted: !this.audio.muted });
    });
    const volume = this.root.querySelector('[name="volume"]');
    this.listen(volume, 'pointerdown', () => this.callbacks.onAudioGesture());
    this.listen(volume, 'keydown', () => this.callbacks.onAudioGesture());
    this.listen(volume, 'input', () => this.changeAudio({ volume: Number(volume.value) / 100 }));
    this.root.querySelectorAll('select').forEach((select) => {
      this.listen(select, 'pointerdown', () => this.callbacks.onAudioGesture());
      this.listen(select, 'keydown', () => this.callbacks.onAudioGesture());
      this.listen(select, 'change', () => {
        const lesson = this.root.querySelector('[name="lesson"]').value;
        if (openSparring(this.settings.lesson)) this.freeTempo = this.root.querySelector('[name="tempo"]').value;
        this.settings = {
          lesson,
          tempo: openSparring(lesson) ? this.freeTempo : 'calm',
          recovery: Number(this.root.querySelector('[name="recovery"]').value),
        };
        this.callbacks.onSettings({ ...this.settings });
      });
    });
  }

  canPlay() {
    return activePhase(this.phase) && !this.portraitQuery.matches && !document.hidden;
  }

  clearInputs() { this.controls?.clear(); this.menuPointers.clear(); }

  loseFocus() {
    this.callbacks.onBlur();
    this.clearInputs();
  }

  showCommands(open) {
    if (activePhase(this.phase)) return;
    this.clearInputs();
    this.commandsOpen = open;
    this.elements['round-panel'].hidden = open;
    this.elements['commands-panel'].hidden = !open;
    this.root.classList.toggle('is-showing-commands', open);
    this.root.querySelector('.fight-hud').inert = open;
    if (!this.portraitQuery.matches) this.elements[open ? 'commands-back-button' : 'commands-open-button'].focus({ preventScroll: true });
  }

  setText(element, value) {
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
  }

  setAudioState({ muted = this.audio.muted, volume = this.audio.volume, available = this.audio.available } = {}) {
    this.audio = { muted: Boolean(muted), volume: Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : this.audio.volume)), available: available !== false };
    const button = this.elements['audio-button'];
    button.disabled = !this.audio.available;
    button.setAttribute('aria-pressed', String(this.audio.muted));
    const label = this.audio.available ? `${this.audio.muted ? 'Activer' : 'Couper'} le son — M` : 'Son indisponible';
    button.setAttribute('aria-label', label);
    button.title = label;
    this.setText(this.elements['audio-label'], !this.audio.available ? 'Indispo.' : this.audio.muted ? 'Muet' : 'Son');
    this.setText(this.elements['audio-icon'], !this.audio.available ? '—' : this.audio.muted ? '×' : '♪');
    const range = this.root.querySelector('[name="volume"]');
    range.value = String(Math.round(this.audio.volume * 100));
    range.disabled = !this.audio.available;
    this.setText(this.values['audio-volume'], `${Math.round(this.audio.volume * 100)} %`);
  }

  changeAudio(settings) {
    if (!this.audio.available) return;
    this.setAudioState({ ...this.audio, ...settings });
    this.callbacks.onAudioSettings({ muted: this.audio.muted, volume: this.audio.volume });
  }

  update(state) {
    const phase = state.phase ?? 'ready';
    const lesson = LESSONS[state.settings?.lesson ?? this.settings.lesson] ?? LESSONS.free;
    const training = state.training;
    this.settings = { ...this.settings, ...state.settings, lesson: lesson.id };
    if (openSparring(lesson.id)) this.freeTempo = this.settings.tempo;
    this.root.dataset.lesson = lesson.id;
    if (this.phase !== phase || !this.initialized || this.renderedLesson !== lesson.id
      || this.renderedCompleted !== Boolean(training?.completed)) {
      this.phase = phase;
      this.commandsOpen = false;
      this.elements['commands-panel'].hidden = true;
      this.root.classList.remove('is-showing-commands');
      this.root.querySelector('.fight-hud').inert = false;
      this.initialized = true;
      this.renderedLesson = lesson.id;
      this.renderedCompleted = Boolean(training?.completed);
      this.clearInputs();
      this.root.dataset.phase = phase;
      const running = activePhase(phase);
      this.elements['round-panel'].hidden = running;
      this.elements['menu-shade'].classList.toggle('is-visible', !running);
      this.elements['pause-button'].disabled = !running;
      this.elements['return-gym-button'].hidden = running;
      for (const button of this.buttons.values()) button.disabled = !running;
      this.elements['round-results'].hidden = phase !== 'finished';
      this.elements['round-settings'].hidden = phase === 'finished' || phase === 'between';
      this.elements['secondary-button'].hidden = phase !== 'paused';
      this.elements['commands-open-button'].hidden = false;
      this.elements['choose-session-button'].hidden = !['paused', 'finished', 'between'].includes(phase);
      this.elements['lesson-choice'].hidden = phase !== 'ready';
      this.root.querySelector('[name="lesson"]').value = lesson.id;
      this.root.querySelector('[name="lesson"]').disabled = phase !== 'ready';
      const tempo = this.root.querySelector('[name="tempo"]');
      tempo.value = this.settings.tempo;
      tempo.disabled = !openSparring(lesson.id);
      tempo.closest('label').hidden = !openSparring(lesson.id);
      this.root.querySelector('[name="recovery"]').value = String(this.settings.recovery);
      this.elements['lesson-tempo'].hidden = openSparring(lesson.id) || phase === 'finished';
      this.elements['lesson-objective'].hidden = openSparring(lesson.id) || phase === 'finished';
      this.setText(this.elements['lesson-description'], lesson.description);
      this.setText(this.elements['lesson-objective'], lesson.objective);
      this.elements['training-summary'].hidden = phase !== 'finished' || !training;
      const lessons = Object.values(LESSONS).filter((item) => !openSparring(item.id));
      const next = lessons[lessons.findIndex((item) => item.id === lesson.id) + 1];
      this.elements['next-lesson-button'].hidden = phase !== 'finished' || !training || !next;
      if (next) this.setText(this.elements['next-lesson-button'], 'Leçon suivante →');
      this.setText(this.elements['secondary-button'], training ? 'Recommencer l’exercice' : 'Recommencer le round');
      this.elements['panel-copy'].hidden = lesson.id !== 'free';
      if (phase === 'ready') {
        this.setText(this.elements['panel-eyebrow'], lesson.id === 'free' ? '60 SECONDES POUR APPRENDRE' : 'UN EXERCICE AVEC RÉMI');
        this.setText(this.elements['panel-heading'], lesson.id === 'free' ? 'Un round.\nÀ votre rythme.' : lesson.title);
        this.setText(this.elements['panel-copy'], 'Observez ses épaules, protégez-vous, puis profitez des ouvertures. Enchaînez jab, direct, crochet avec J → K → J. Relâchez la garde pour reprendre votre souffle.');
        this.setText(this.elements['primary-button'], lesson.id === 'free' ? 'Entrer en sparring →' : 'Commencer l’exercice →');
      } else if (phase === 'paused') {
        this.setText(this.elements['panel-eyebrow'], 'LE GYM PEUT ATTENDRE');
        this.setText(this.elements['panel-heading'], 'Soufflez.');
        this.setText(this.elements['panel-copy'], 'Le round est en pause. Ajustez le rythme si vous le souhaitez, puis retrouvez Rémi.');
        this.setText(this.elements['primary-button'], training ? 'Reprendre l’exercice →' : 'Reprendre le round →');
      } else if (phase === 'finished') {
        this.setText(this.elements['panel-eyebrow'], training ? `${training.progress} / ${training.target} RÉUSSITES` : 'LE ROUND EST TERMINÉ');
        this.setText(this.elements['panel-heading'], training ? training.completed ? 'Exercice réussi !' : 'On continue ?' : 'Beau travail.');
        this.setText(this.elements['panel-copy'], 'Chaque échange compte. Retrouvez votre souffle et repartez pour une minute.');
        this.setText(this.elements['primary-button'], training ? 'Refaire l’exercice →' : 'Un autre round →');
      }
      if (!running) this.elements['fight-feedback'].classList.remove('is-visible');
      if (['paused', 'between'].includes(phase) && !this.portraitQuery.matches) this.elements['primary-button'].focus({ preventScroll: true });
      else if (running && this.root.contains(document.activeElement)) document.activeElement.blur();
    }
    this.elements['training-coach'].hidden = phase !== 'running' || !training;
    if (training) {
      this.setText(this.values['training-progress'], `${training.progress} / ${training.target}`);
      this.setText(this.elements['coach-objective'], training.objective);
      this.setText(this.elements['coach-cue'], training.cue);
      this.root.querySelectorAll('.coach-steps i').forEach((step, index) => step.classList.toggle('is-complete', index < training.progress));
      if (phase === 'finished') {
        this.setText(this.values['training-positive'], training.summary?.positive ?? 'Vous avez pris le temps de pratiquer.');
        this.setText(this.values['training-improve'], training.summary?.improve ?? 'Recommencez à votre rythme.');
      }
    }
    const stamina = Math.max(0, Math.min(100, Number(state.stamina ?? 100)));
    const hookReady = phase === 'running' && Boolean(state.combo?.ready);
    const hookSelected = phase === 'running' && state.combo?.step === 2 && state.player?.action === 'idle';
    const jabButton = this.buttons.get('jab');
    if (this.hookReady !== hookReady || this.hookSelected !== hookSelected) {
      this.hookReady = hookReady;
      this.hookSelected = hookSelected;
      jabButton.dataset.moveLabel = hookSelected ? 'Crochet' : 'Jab';
      this.setText(jabButton.querySelector('.control-label'), hookSelected ? 'Crochet' : 'Jab');
      jabButton.setAttribute('aria-label', hookSelected ? 'Crochet gauche — 21 endurance — J' : 'Jab gauche — J');
      jabButton.classList.toggle('is-combo-ready', hookReady);
    }
    const displayedStamina = Math.round(stamina);
    this.setText(this.values.stamina, displayedStamina);
    if (this.lastStamina !== displayedStamina) {
      this.elements['stamina-fill'].style.transform = `scaleX(${stamina / 100})`;
      this.elements['stamina-track'].setAttribute('aria-valuenow', String(displayedStamina));
      this.elements['stamina-track'].classList.toggle('is-low', stamina < 25);
      this.lastStamina = displayedStamina;
    }
    const seconds = Math.max(0, Math.ceil(Number(state.remaining ?? 60)));
    this.setText(this.elements['round-time'], `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
    this.elements['round-time'].classList.toggle('is-ending', seconds <= 10);
    const action = typeof state.remi?.action === 'string' ? state.remi.action : state.remi?.action?.type;
    const announcesAttack = ['telegraph', 'windup', 'tellLeft', 'tellRight', 'attack', 'attacking', 'jab', 'direct', 'cross'].includes(action);
    const activeStatus = announcesAttack ? `${state.remi?.target === 'body' ? 'Au corps' : 'À la tête'} · ${REMI_LABELS[action]}` : REMI_LABELS[action] ?? 'Il vous observe';
    const status = phase === 'ready' ? 'Prêt à vous entraîner' : phase === 'paused' ? 'On reprend à votre rythme' : phase === 'finished' ? 'À la prochaine reprise' : activeStatus;
    this.setText(this.values['remi-status'], status);
    this.elements['remi-status'].classList.toggle('is-warning', phase === 'running' && ['telegraph', 'windup', 'tellLeft', 'tellRight', 'attack', 'attacking', 'jab', 'direct', 'cross'].includes(action));
    const stats = state.stats ?? {};
    this.setText(this.values.landed, stats.landed ?? 0);
    this.setText(this.values.received, stats.received ?? 0);
    if (phase === 'finished') {
      this.setText(this.values['result-landed'], stats.landed ?? 0);
      this.setText(this.values['result-received'], stats.received ?? 0);
      this.setText(this.elements['round-detail'], `${stats.blocked ?? 0} coups bloqués · ${stats.dodged ?? 0} esquivés\n${stats.thrown ?? 0} coups tentés${lesson.id === 'free' ? ` · ${stats.hooks ?? 0} crochets touchés\n${stats.combos ?? 0} combos complets (3 touches)` : ''}`);
    }
    this.boutHUD.update(state);
    this.controls?.refresh();
  }

  showFeedback(text, tone = 'neutral') {
    const feedback = this.elements['fight-feedback'];
    clearTimeout(this.feedbackTimer);
    this.setText(feedback, text);
    feedback.dataset.tone = tone;
    feedback.classList.add('is-visible');
    this.feedbackTimer = setTimeout(() => feedback.classList.remove('is-visible'), 850);
  }

  destroy() {
    this.controls?.destroy();
    this.clearInputs();
    this.abort.abort();
    clearTimeout(this.feedbackTimer);
    this.root.replaceChildren();
    document.getElementById('stage').inert = false;
  }
}
