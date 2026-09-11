const KEY_ACTIONS = {
  KeyJ: 'jab',
  KeyK: 'cross',
  KeyA: 'dodgeLeft',
  ArrowLeft: 'dodgeLeft',
  KeyD: 'dodgeRight',
  ArrowRight: 'dodgeRight',
  Space: 'guard',
};

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
};

const noop = () => {};

/** DOM overlay and source-aware inputs. Combat timing belongs to SparringSession. */
export class SparringUI {
  constructor(callbacks = {}) {
    this.callbacks = Object.fromEntries([
      'onAction', 'onGuard', 'onStart', 'onPause', 'onResume', 'onRestart', 'onSettings', 'onBlur',
    ].map((name) => [name, callbacks[name] ?? noop]));
    this.phase = 'ready';
    this.settings = { tempo: 'normal', recovery: 1 };
    this.keys = new Map();
    this.pointers = new Map();
    this.menuPointers = new Map();
    this.guardActive = false;
    this.abort = new AbortController();
    this.root = document.getElementById('sparring-ui');
    this.portraitQuery = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
    this.root.innerHTML = `
      <div class="menu-shade is-visible" aria-hidden="true"></div>
      <div class="fight-hud">
        <div class="fighter-info">
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
        </div>
      </div>
      <div class="session-caption"><span class="touches-count" data-value="landed">0</span> TOUCHES DONNÉES <span aria-hidden="true">·</span> <span class="touches-count" data-value="received">0</span> REÇUES</div>
      <div class="fight-feedback" role="status" aria-live="polite" aria-atomic="true"></div>
      <section class="round-panel" aria-labelledby="round-panel-title">
        <p class="panel-eyebrow">60 SECONDES POUR APPRENDRE</p>
        <h2 class="panel-heading" id="round-panel-title">Un round.\nÀ votre rythme.</h2>
        <p class="panel-copy">Observez ses épaules, protégez-vous, puis profitez des ouvertures. Relâchez la garde pour reprendre votre souffle.</p>
        <div class="round-results" hidden>
          <div class="result-cell"><strong data-value="result-landed">0</strong><span>touches données</span></div>
          <div class="result-cell"><strong data-value="result-received">0</strong><span>touches reçues</span></div>
          <p class="round-detail"></p>
        </div>
        <div class="round-settings">
          <label>Rythme de Rémi<select name="tempo" aria-label="Rythme de Rémi"><option value="calm">Tranquille</option><option value="normal" selected>Normal</option><option value="fast">Vif</option></select></label>
          <label>Récupération<select name="recovery" aria-label="Récupération d’endurance"><option value="1" selected>Normale</option><option value="1.5">Rapide</option></select></label>
        </div>
        <button type="button" class="primary-button">Entrer en sparring →</button>
        <button type="button" class="secondary-button" hidden>Recommencer le round</button>
        <p class="round-footnote">Sparring au gym · Aucun combat officiel</p>
      </section>
      <div class="action-dock defense-dock" aria-label="Défenses">
        <span class="dock-caption">ESQUIVER & PROTÉGER</span>
        <button type="button" class="control-button" data-action="dodgeLeft" aria-label="Esquive gauche — A ou flèche gauche" disabled><span class="control-key">←</span><span class="control-label">Esquive</span></button>
        <button type="button" class="control-button guard-control" data-action="guard" aria-label="Garde — maintenir Espace ou ce bouton" aria-pressed="false" disabled><span class="control-key">▰</span><span class="control-label">Garde · tenir</span></button>
        <button type="button" class="control-button" data-action="dodgeRight" aria-label="Esquive droite — D ou flèche droite" disabled><span class="control-key">→</span><span class="control-label">Esquive</span></button>
      </div>
      <div class="action-dock attack-dock" aria-label="Attaques">
        <span class="dock-caption">À VOUS DE JOUER</span>
        <button type="button" class="control-button attack-control" data-action="jab" aria-label="Jab — J" disabled><span class="control-key">J</span><span class="control-label">Jab</span></button>
        <button type="button" class="control-button attack-control" data-action="cross" aria-label="Direct — K" disabled><span class="control-key">K</span><span class="control-label">Direct</span></button>
      </div>
    `;
    this.elements = Object.fromEntries([
      'menu-shade', 'stamina-track', 'stamina-fill', 'round-time', 'remi-status', 'pause-button',
      'fight-feedback', 'round-panel', 'panel-eyebrow', 'panel-heading', 'panel-copy',
      'round-results', 'round-detail', 'round-settings', 'primary-button', 'secondary-button',
    ].map((className) => [className, this.root.querySelector(`.${className}`)]));
    this.values = Object.fromEntries([...this.root.querySelectorAll('[data-value]')]
      .map((element) => [element.dataset.value, element]));
    this.buttons = new Map([...this.root.querySelectorAll('[data-action]')]
      .map((button) => [button.dataset.action, button]));
    this.bindEvents();
    document.getElementById('stage').inert = this.portraitQuery.matches;
  }

  listen(target, event, callback, options = {}) {
    target.addEventListener(event, callback, { ...options, signal: this.abort.signal });
  }

  listenActivation(button, callback) {
    this.listen(button, 'pointerdown', (event) => this.menuPointers.set(button, event.pointerId));
    this.listen(button, 'pointercancel', () => this.menuPointers.delete(button));
    this.listen(button, 'click', (event) => {
      const pointerId = this.menuPointers.get(button);
      this.menuPointers.delete(button);
      // A finger held on Garde can end above a newly displayed pause menu.
      // Only activate a menu button when this press began on that button.
      // Keyboard and assistive clicks have detail 0 and need no pointer.
      if (event.detail !== 0 && (pointerId === undefined
        || (typeof event.pointerId === 'number' && event.pointerId !== pointerId))) return;
      callback(event);
    });
  }

  bindEvents() {
    this.listen(window, 'keydown', (event) => this.keyDown(event));
    this.listen(window, 'keyup', (event) => this.keyUp(event));
    this.listen(window, 'blur', () => this.loseFocus());
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.loseFocus();
    });
    this.listen(this.portraitQuery, 'change', (event) => {
      document.getElementById('stage').inert = event.matches;
      if (event.matches) this.loseFocus();
    });
    this.listenActivation(this.elements['pause-button'], (event) => {
      event.currentTarget.blur();
      this.clearInputs();
      if (this.phase === 'running') this.callbacks.onPause();
    });
    this.listenActivation(this.elements['primary-button'], (event) => {
      event.currentTarget.blur();
      if (this.portraitQuery.matches) return;
      this.clearInputs();
      if (this.phase === 'ready') this.callbacks.onStart({ ...this.settings });
      else if (this.phase === 'paused') this.callbacks.onResume();
      else if (this.phase === 'finished') this.callbacks.onRestart({ ...this.settings });
    });
    this.listenActivation(this.elements['secondary-button'], (event) => {
      event.currentTarget.blur();
      this.clearInputs();
      this.callbacks.onRestart({ ...this.settings });
    });
    this.root.querySelectorAll('select').forEach((select) => {
      this.listen(select, 'change', () => {
        this.settings = {
          tempo: this.root.querySelector('[name="tempo"]').value,
          recovery: Number(this.root.querySelector('[name="recovery"]').value),
        };
        this.callbacks.onSettings({ ...this.settings });
      });
    });
    for (const [action, button] of this.buttons) {
      this.listen(button, 'pointerdown', (event) => {
        if (!this.canPlay() || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        button.blur();
        this.pointers.set(event.pointerId, { action, button });
        try { button.setPointerCapture(event.pointerId); } catch { /* Pointer may already have ended. */ }
        this.refreshHeldButtons();
        if (action === 'guard') this.refreshGuard();
        else this.callbacks.onAction(action);
      });
      this.listen(button, 'pointerup', (event) => this.releasePointer(event.pointerId));
      this.listen(button, 'pointercancel', (event) => this.releasePointer(event.pointerId));
      this.listen(button, 'lostpointercapture', (event) => this.releasePointer(event.pointerId));
      this.listen(button, 'contextmenu', (event) => event.preventDefault());
      // Enter/Space remain usable by keyboard and assistive technology without
      // causing a duplicate action after a real PointerEvent.
      this.listen(button, 'click', (event) => {
        if (event.detail !== 0 || !this.canPlay()) return;
        if (action === 'guard') return;
        this.callbacks.onAction(action);
      });
    }
    // The global fallback also releases a touch if capture is unavailable.
    this.listen(window, 'pointerup', (event) => this.releasePointer(event.pointerId));
    this.listen(window, 'pointercancel', (event) => this.releasePointer(event.pointerId));
  }

  canPlay() {
    return this.phase === 'running' && !this.portraitQuery.matches && !document.hidden;
  }

  keyDown(event) {
    const target = event.target;
    if (target instanceof Element && target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (target instanceof HTMLButtonElement && (event.code === 'Space' || event.code === 'Enter')
      && !(event.code === 'Space' && target.dataset.action === 'guard')) return;
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (event.repeat || this.portraitQuery.matches) return;
      if (this.phase !== 'running' && this.phase !== 'paused') return;
      event.preventDefault();
      this.clearInputs();
      if (this.phase === 'running') this.callbacks.onPause();
      else this.callbacks.onResume();
      return;
    }
    const action = KEY_ACTIONS[event.code];
    if (!action || !this.canPlay()) return;
    event.preventDefault();
    if (event.repeat || this.keys.has(event.code)) return;
    this.keys.set(event.code, action);
    this.refreshHeldButtons();
    if (action === 'guard') this.refreshGuard();
    else this.callbacks.onAction(action);
  }

  keyUp(event) {
    if (!this.keys.has(event.code)) return;
    event.preventDefault();
    this.keys.delete(event.code);
    this.refreshGuard();
    this.refreshHeldButtons();
  }

  releasePointer(pointerId) {
    const input = this.pointers.get(pointerId);
    if (!input) return;
    this.pointers.delete(pointerId);
    try {
      if (input.button.hasPointerCapture(pointerId)) input.button.releasePointerCapture(pointerId);
    } catch { /* Safe after a detached button or canceled touch. */ }
    this.refreshGuard();
    this.refreshHeldButtons();
  }

  refreshGuard() {
    const active = [...this.keys.values()].includes('guard')
      || [...this.pointers.values()].some((input) => input.action === 'guard');
    if (active === this.guardActive) return;
    this.guardActive = active;
    this.buttons.get('guard').setAttribute('aria-pressed', String(active));
    this.callbacks.onGuard(active);
  }

  refreshHeldButtons() {
    const held = new Set([...this.keys.values(), ...[...this.pointers.values()].map((input) => input.action)]);
    for (const [action, button] of this.buttons) button.classList.toggle('is-held', held.has(action));
  }

  clearInputs() {
    this.keys.clear();
    this.menuPointers.clear();
    const pointers = [...this.pointers.entries()];
    this.pointers.clear();
    for (const [id, input] of pointers) {
      try {
        if (input.button.hasPointerCapture(id)) input.button.releasePointerCapture(id);
      } catch { /* A canceled pointer has no capture left to release. */ }
    }
    this.refreshGuard();
    this.refreshHeldButtons();
  }

  loseFocus() {
    this.clearInputs();
    this.callbacks.onBlur();
  }

  setText(element, value) {
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
  }

  update(state) {
    const phase = state.phase ?? 'ready';
    if (this.phase !== phase || !this.initialized) {
      this.phase = phase;
      this.initialized = true;
      this.clearInputs();
      this.root.dataset.phase = phase;
      const running = phase === 'running';
      this.elements['round-panel'].hidden = running;
      this.elements['menu-shade'].classList.toggle('is-visible', !running);
      this.elements['pause-button'].disabled = !running;
      for (const button of this.buttons.values()) button.disabled = !running;
      this.elements['round-results'].hidden = phase !== 'finished';
      this.elements['round-settings'].hidden = phase === 'finished';
      this.elements['secondary-button'].hidden = phase !== 'paused';
      if (phase === 'ready') {
        this.setText(this.elements['panel-eyebrow'], '60 SECONDES POUR APPRENDRE');
        this.setText(this.elements['panel-heading'], 'Un round.\nÀ votre rythme.');
        this.setText(this.elements['panel-copy'], 'Observez ses épaules, protégez-vous, puis profitez des ouvertures. Relâchez la garde pour reprendre votre souffle.');
        this.setText(this.elements['primary-button'], 'Entrer en sparring →');
      } else if (phase === 'paused') {
        this.setText(this.elements['panel-eyebrow'], 'LE GYM PEUT ATTENDRE');
        this.setText(this.elements['panel-heading'], 'Soufflez.');
        this.setText(this.elements['panel-copy'], 'Le round est en pause. Ajustez le rythme si vous le souhaitez, puis retrouvez Rémi.');
        this.setText(this.elements['primary-button'], 'Reprendre le round →');
      } else if (phase === 'finished') {
        this.setText(this.elements['panel-eyebrow'], 'LE ROUND EST TERMINÉ');
        this.setText(this.elements['panel-heading'], 'Beau travail.');
        this.setText(this.elements['panel-copy'], 'Chaque échange compte. Retrouvez votre souffle et repartez pour une minute.');
        this.setText(this.elements['primary-button'], 'Un autre round →');
      }
      if (!running) this.elements['fight-feedback'].classList.remove('is-visible');
    }
    const stamina = Math.max(0, Math.min(100, Number(state.stamina ?? 100)));
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
    const status = phase === 'ready' ? 'Prêt à vous entraîner' : phase === 'paused' ? 'On reprend à votre rythme' : phase === 'finished' ? 'À la prochaine reprise' : REMI_LABELS[action] ?? 'Il vous observe';
    this.setText(this.values['remi-status'], status);
    this.elements['remi-status'].classList.toggle('is-warning', phase === 'running' && ['telegraph', 'windup', 'tellLeft', 'tellRight', 'attack', 'attacking', 'jab', 'direct', 'cross'].includes(action));
    const stats = state.stats ?? {};
    this.setText(this.values.landed, stats.landed ?? 0);
    this.setText(this.values.received, stats.received ?? 0);
    if (phase === 'finished') {
      this.setText(this.values['result-landed'], stats.landed ?? 0);
      this.setText(this.values['result-received'], stats.received ?? 0);
      this.setText(this.elements['round-detail'], `${stats.blocked ?? 0} coups bloqués · ${stats.dodged ?? 0} esquivés\n${stats.thrown ?? 0} coups tentés`);
    }
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
    this.clearInputs();
    this.abort.abort();
    clearTimeout(this.feedbackTimer);
    this.root.replaceChildren();
    document.getElementById('stage').inert = false;
  }
}
