import './gym.css';

const DIRECTIONS = {
  ArrowUp: 'up', KeyW: 'up', KeyZ: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const noop = () => {};

/** Source-aware controls for the gym. Movement and activities belong to the scene. */
export class GymUI {
  constructor(callbacks = {}) {
    this.callbacks = Object.fromEntries([
      'onMove', 'onInteract', 'onPause', 'onResume', 'onCloseDialog', 'onSparring', 'onBlur',
    ].map((name) => [name, callbacks[name] ?? noop]));
    this.root = document.getElementById('gym-ui');
    if (!this.root) throw new Error('GymUI requires #gym-ui inside the game stage.');
    this.stage = document.getElementById('stage');
    this.keys = new Map();
    this.activationKeys = new Set();
    this.pointers = new Map();
    this.menuPointers = new Map();
    this.vector = { x: 0, y: 0 };
    this.paused = false;
    this.commandsOpen = false;
    this.dialog = null;
    this.nearby = null;
    this.destroyed = false;
    this.abort = new AbortController();
    this.portraitQuery = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
    this.root.hidden = false;
    this.root.dataset.touch = String(navigator.maxTouchPoints > 0);
    this.root.dataset.mode = 'walking';
    this.root.innerHTML = `
      <header class="gym-hud">
        <div class="gym-heading"><span class="gym-eyebrow">LE GYM DU QUARTIER</span><h2>Explorer le gym</h2></div>
        <button type="button" class="gym-pause-button" aria-label="Mettre la visite en pause" title="Pause — P ou Échap"><span aria-hidden="true">Ⅱ</span><span>Pause</span></button>
      </header>
      <div class="gym-nearby" role="status" aria-live="polite" aria-atomic="true"><span class="gym-nearby-label">Bienvenue au gym</span><span class="gym-nearby-hint">Approchez-vous de Rémi ou d’un atelier.</span></div>
      <div class="gym-movement" role="group" aria-label="Déplacements : flèches, WASD ou ZQSD">
        <span class="gym-dock-caption">SE DÉPLACER</span>
        <button type="button" class="gym-direction" data-direction="up" aria-label="Aller vers le haut" tabindex="-1">↑</button>
        <button type="button" class="gym-direction" data-direction="left" aria-label="Aller à gauche" tabindex="-1">←</button>
        <span class="gym-pad-center" aria-hidden="true">·</span>
        <button type="button" class="gym-direction" data-direction="right" aria-label="Aller à droite" tabindex="-1">→</button>
        <button type="button" class="gym-direction" data-direction="down" aria-label="Aller vers le bas" tabindex="-1">↓</button>
      </div>
      <button type="button" class="gym-interact-button" disabled><span class="gym-interact-key" aria-hidden="true">E</span><span class="gym-interact-label">Interagir</span></button>
      <div class="gym-modal-shade" hidden></div>
      <section class="gym-dialog" role="dialog" aria-modal="true" aria-labelledby="gym-dialog-title" aria-describedby="gym-dialog-text" hidden>
        <div class="gym-dialog-copy"><p class="gym-dialog-speaker gym-eyebrow"></p><h2 id="gym-dialog-title"></h2><p id="gym-dialog-text"></p></div>
        <div class="gym-dialog-actions"></div>
      </section>
      <section class="gym-pause-panel" role="dialog" aria-modal="true" aria-labelledby="gym-pause-title" hidden>
        <p class="gym-eyebrow">ON PREND SON TEMPS</p><h2 id="gym-pause-title">Visite en pause</h2><p>Le gym vous attend. Reprenez quand vous êtes prêt.</p><button type="button" class="gym-resume-button">Continuer la visite →</button><button type="button" class="commands-open-button">Commandes</button>
      </section>
      <section class="commands-panel" role="dialog" aria-modal="true" aria-labelledby="gym-commands-title" hidden>
        <p class="commands-eyebrow">VISITE EN PAUSE</p><h2 id="gym-commands-title">Commandes du gym</h2>
        <div class="commands-grid"><dl>
          <div><dt>Marcher</dt><dd>Flèches · WASD · ZQSD</dd></div>
          <div><dt>Interagir</dt><dd>E ou Entrée</dd></div>
          <div><dt>Pause / retour</dt><dd>P ou Échap</dd></div>
        </dl><div class="commands-notes"><p>Approchez-vous de Rémi ou d’un atelier, puis interagissez.</p><p>Échap ferme aussi une conversation.</p><p class="commands-touch-tip">Au tactile : pavé à gauche, Interagir à droite et Pause en haut.</p></div></div>
        <button type="button" class="commands-back-button">← Retour au menu pause</button>
      </section>
    `;
    this.elements = Object.fromEntries([
      'gym-pause-button', 'gym-nearby', 'gym-nearby-label', 'gym-nearby-hint',
      'gym-movement', 'gym-interact-button', 'gym-interact-label',
      'gym-modal-shade', 'gym-dialog', 'gym-dialog-speaker', 'gym-dialog-actions',
      'gym-pause-panel', 'gym-resume-button', 'commands-panel', 'commands-open-button', 'commands-back-button',
    ].map((name) => [name, this.root.querySelector(`.${name}`)]));
    this.directionButtons = new Map([...this.root.querySelectorAll('[data-direction]')]
      .map((button) => [button.dataset.direction, button]));
    this.bindEvents();
    this.stage.inert = this.portraitQuery.matches;
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
    if (this.destroyed || this.portraitQuery.matches || document.hidden) return false;
    button.blur();
    return true;
  }

  bindEvents() {
    this.listen(window, 'keydown', (event) => this.keyDown(event));
    this.listen(window, 'keyup', (event) => this.keyUp(event));
    this.listen(window, 'blur', () => this.loseFocus());
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.loseFocus();
    });
    this.listen(this.portraitQuery, 'change', (event) => {
      this.stage.inert = event.matches;
      if (event.matches) this.loseFocus();
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
    this.listen(window, 'pointerdown', (event) => {
      if (event.pointerType === 'touch') this.root.dataset.touch = 'true';
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
      if (!button || !this.consumeActivation(button, event) || this.paused || !this.dialog) return;
      this.clearInputs();
      if (button.dataset.gymAction === 'sparring') this.callbacks.onSparring(button.dataset.lesson ?? 'free');
      else this.callbacks.onCloseDialog();
    });
    for (const [direction, button] of this.directionButtons) {
      this.listen(button, 'pointerdown', (event) => {
        if (!this.canMove() || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        button.blur();
        this.pointers.set(event.pointerId, { direction, button });
        try { button.setPointerCapture(event.pointerId); } catch { /* Ended pointer. */ }
        this.refreshMovement();
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.listen(button, event, (input) => this.releasePointer(input.pointerId));
      }
      this.listen(button, 'contextmenu', (event) => event.preventDefault());
    }
    this.listen(window, 'pointerup', (event) => this.releasePointer(event.pointerId));
    this.listen(window, 'pointercancel', (event) => this.releasePointer(event.pointerId));
  }

  canMove() {
    return !this.destroyed && !this.paused && !this.dialog && !this.portraitQuery.matches && !document.hidden;
  }

  keyDown(event) {
    if (this.destroyed || this.portraitQuery.matches || document.hidden) return;
    if (this.activationKeys.has(event.code)) {
      event.preventDefault();
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest('input, select, textarea, [contenteditable="true"]')) return;
    const modal = this.commandsOpen ? this.elements['commands-panel'] : this.paused ? this.elements['gym-pause-panel'] : this.dialog ? this.elements['gym-dialog'] : null;
    if (event.code === 'Tab' && modal) {
      const buttons = [...modal.querySelectorAll('button:not(:disabled)')];
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      if (index === -1 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault();
        buttons[event.shiftKey ? buttons.length - 1 : 0].focus({ preventScroll: true });
      }
      return;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') {
      event.preventDefault();
      if (event.repeat) return;
      this.clearInputs();
      if (this.commandsOpen) this.showCommands(false);
      else if (this.paused) this.callbacks.onResume();
      else if (this.dialog) this.callbacks.onCloseDialog();
      else this.requestPause();
      return;
    }
    // Enter and Space retain native activation for focused dialog buttons.
    if (target instanceof HTMLButtonElement && (event.code === 'Enter' || event.code === 'Space')) {
      if (event.repeat) event.preventDefault();
      return;
    }
    if (event.code === 'KeyE' || event.code === 'Enter') {
      event.preventDefault();
      if (!event.repeat) {
        // The Enter that opens a conversation must not repeat on its newly
        // focused first choice and immediately send the player into the ring.
        this.activationKeys.add(event.code);
        this.interact();
      }
      return;
    }
    const direction = DIRECTIONS[event.code];
    if (!direction) return;
    event.preventDefault();
    if (!this.canMove() || event.repeat || this.keys.has(event.code)) return;
    this.keys.set(event.code, direction);
    this.refreshMovement();
  }

  keyUp(event) {
    if (this.activationKeys.delete(event.code)) event.preventDefault();
    if (!this.keys.has(event.code)) return;
    event.preventDefault();
    this.keys.delete(event.code);
    this.refreshMovement();
  }

  interact() {
    if (!this.canMove() || !this.nearby) return;
    this.clearInputs();
    this.callbacks.onInteract();
  }

  requestPause() {
    if (this.paused || this.dialog || this.destroyed) return;
    this.clearInputs();
    this.callbacks.onPause();
  }

  refreshMovement() {
    const held = new Set([...this.keys.values(), ...[...this.pointers.values()].map((pointer) => pointer.direction)]);
    let x = Number(held.has('right')) - Number(held.has('left'));
    let y = Number(held.has('down')) - Number(held.has('up'));
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    if (x !== this.vector.x || y !== this.vector.y) {
      this.vector = { x, y };
      this.callbacks.onMove({ x, y });
    }
    for (const [direction, button] of this.directionButtons) {
      button.classList.toggle('is-held', held.has(direction));
    }
  }

  releasePointer(pointerId) {
    const pointer = this.pointers.get(pointerId);
    if (!pointer) return;
    this.pointers.delete(pointerId);
    try {
      if (pointer.button.hasPointerCapture(pointerId)) pointer.button.releasePointerCapture(pointerId);
    } catch { /* A canceled or detached pointer has no capture to release. */ }
    this.refreshMovement();
  }

  clearInputs() {
    this.keys.clear();
    this.menuPointers.clear();
    const pointers = [...this.pointers.entries()];
    this.pointers.clear();
    for (const [id, pointer] of pointers) {
      try {
        if (pointer.button.hasPointerCapture(id)) pointer.button.releasePointerCapture(id);
      } catch { /* Safe after a pointer cancellation. */ }
    }
    this.refreshMovement();
  }

  loseFocus() {
    if (this.destroyed) return;
    this.clearInputs();
    this.activationKeys.clear();
    this.callbacks.onBlur();
  }

  setText(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  update(state = {}) {
    if (this.destroyed) return;
    const wasPaused = this.paused;
    this.paused = Boolean(state.paused);
    if (!this.paused) this.commandsOpen = false;
    this.nearby = state.nearby ?? null;
    if (wasPaused !== this.paused) this.clearInputs();
    this.renderMode();
    this.setText(this.elements['gym-nearby-label'], this.nearby?.label ?? 'Bienvenue au gym');
    this.setText(this.elements['gym-nearby-hint'], this.nearby
      ? this.root.dataset.touch === 'true' ? 'Touchez Interagir pour participer.' : 'Un atelier ou un partenaire vous attend.'
      : 'Approchez-vous de Rémi ou d’un atelier.');
    this.elements['gym-nearby'].classList.toggle('is-available', Boolean(this.nearby));
    this.elements['gym-interact-button'].disabled = !this.canMove() || !this.nearby;
    this.setText(this.elements['gym-interact-label'], this.nearby?.kind === 'sparring' ? 'Parler à Rémi' : 'Interagir');
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
    this.elements['gym-pause-panel'].hidden = !this.paused || this.commandsOpen;
    this.elements['commands-panel'].hidden = !this.paused || !this.commandsOpen;
    this.elements['gym-dialog'].hidden = !this.dialog || this.paused;
    this.elements['gym-pause-button'].disabled = blocked;
    this.elements['gym-interact-button'].disabled = blocked || !this.nearby;
    for (const button of this.directionButtons.values()) button.disabled = blocked;
  }

  showCommands(open) {
    if (!this.paused || this.destroyed) return;
    this.clearInputs();
    this.commandsOpen = open;
    this.renderMode();
    if (!this.portraitQuery.matches) this.elements[open ? 'commands-back-button' : 'commands-open-button'].focus({ preventScroll: true });
  }

  showDialog({ speaker = '', title = '', text = '', actions = [] } = {}) {
    if (this.destroyed) return;
    this.clearInputs();
    this.dialog = { speaker, title, text, actions };
    this.setText(this.elements['gym-dialog-speaker'], speaker);
    this.setText(this.root.querySelector('#gym-dialog-title'), title);
    this.setText(this.root.querySelector('#gym-dialog-text'), text);
    const actionRoot = this.elements['gym-dialog-actions'];
    actionRoot.replaceChildren();
    const choices = actions.length ? actions : [{ id: 'close', label: 'Continuer la visite →' }];
    for (const action of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `gym-dialog-button${action.id === 'sparring' ? ' gym-session-button' : ' gym-close-button'}`;
      button.dataset.gymAction = action.id;
      if (action.lesson) button.dataset.lesson = action.lesson;
      button.textContent = action.label;
      actionRoot.append(button);
    }
    this.renderMode();
    if (!this.paused && !this.portraitQuery.matches) actionRoot.querySelector('button')?.focus({ preventScroll: true });
  }

  closeDialog() {
    if (this.destroyed) return;
    this.clearInputs();
    if (this.elements['gym-dialog'].contains(document.activeElement)) document.activeElement.blur();
    this.dialog = null;
    this.renderMode();
  }

  destroy() {
    if (this.destroyed) return;
    this.clearInputs();
    this.activationKeys.clear();
    this.destroyed = true;
    this.abort.abort();
    this.root.replaceChildren();
    this.root.hidden = true;
    this.stage.inert = false;
  }
}
