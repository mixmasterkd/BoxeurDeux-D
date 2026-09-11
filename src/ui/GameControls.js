const DIRECTIONS = {
  ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right',
};
const INPUT_KEYS = new Set([...Object.keys(DIRECTIONS), 'KeyJ', 'KeyK', 'KeyE', 'Enter', 'Space', 'KeyP', 'Escape', 'KeyM']);
const noop = () => {};

/** One console convention for every place and activity. Inputs are sources,
 * never queued actions: changing a menu or losing focus releases all of them. */
export class GameControls {
  constructor({ root, mode = 'combat', canPlay, onAction = noop, onGuard = noop, onMove = noop,
    onInteract = noop, onPause = noop, onBack = noop, onMenu = noop, onMute = noop, onAudioGesture = noop,
    onReturnGym = null, getMenu }) {
    Object.assign(this, { root, mode, canPlay, onAction, onGuard, onMove, onInteract,
      onPause, onBack, onMenu, onMute, onAudioGesture, getMenu });
    this.abort = new AbortController();
    this.keys = new Map(); this.pointers = new Map(); this.menuHeld = new Set();
    this.vector = { x: 0, y: 0 }; this.padVector = { x: 0, y: 0 };
    this.guard = null; this.padDirection = null; this.padId = null;
    this.portrait = matchMedia('(pointer: coarse) and (hover: none) and (max-width: 900px) and (orientation: portrait)');
    this.controlsQuery = matchMedia('(pointer: coarse) and (hover: none)');
    const left = root.querySelector('.rail-left');
    left.replaceChildren();
    this.pad = document.createElement('div');
    this.pad.className = 'joypad'; this.pad.setAttribute('role', 'group');
    this.pad.setAttribute('aria-label', mode === 'gym' ? 'Joypad : déplacements et navigation des menus' : 'Joypad : garde haute ou basse, esquives et navigation des menus');
    this.pad.innerHTML = '<span class="joypad-axis axis-horizontal"></span><span class="joypad-axis axis-vertical"></span><span class="joypad-mark mark-up">▲</span><span class="joypad-mark mark-down">▼</span><span class="joypad-mark mark-left">◀</span><span class="joypad-mark mark-right">▶</span><span class="joypad-stick"></span>';
    left.append(this.pad);
    this.stick = this.pad.querySelector('.joypad-stick');
    const right = root.querySelector('.rail-right');
    this.a = mode === 'gym' ? root.querySelector('.gym-interact-button') : root.querySelector('[data-action="jab"]');
    this.b = mode === 'gym' ? document.createElement('button') : root.querySelector('[data-action="cross"]');
    this.a.type = this.b.type = 'button';
    this.a.dataset.padButton = 'a'; this.b.dataset.padButton = 'b';
    this.a.classList.add('pad-action'); this.b.classList.add('pad-action');
    if (mode === 'gym') { this.b.className = 'pad-action gym-back-button'; this.b.innerHTML = '<span class="control-key">B</span><span class="control-label">Retour</span>'; }
    const dock = document.createElement('div'); dock.className = 'console-actions'; dock.append(this.b, this.a);
    // Keep the existing pause element so its accessible title remains available.
    this.pause = right.querySelector('[class*="pause-button"]');
    if (this.pause) { this.pause.classList.add('console-menu-button'); this.pause.textContent = '☰'; this.pause.setAttribute('aria-label', 'Menu pause'); }
    const sound = right.querySelector('[class*="audio-button"]');
    if (sound) root.querySelector('.panel-options, .bag-panel-actions, .shadow-panel-actions')?.append(sound);
    const options = root.querySelector('.panel-options, .shadow-speed-setting') ?? sound;
    if (options) {
      const heading = document.createElement('p'); heading.className = 'console-settings-heading'; heading.textContent = 'Réglages';
      if (options.matches('.panel-options')) options.prepend(heading); else options.before(heading);
    }
    right.replaceChildren(...(this.pause ? [this.pause, dock] : [dock]));
    if (onReturnGym) {
      this.exit = document.createElement('button'); this.exit.type = 'button';
      this.exit.className = 'activity-exit-button'; this.exit.textContent = '← Gym';
      this.exit.setAttribute('aria-label', 'Quitter l’activité et retourner au gym');
      root.append(this.exit);
      this.bindPress(this.exit, () => { this.clear(); onReturnGym(); });
    }
    this.bindPress(this.a, () => this.pressAction('a'));
    this.bindPress(this.b, () => this.pressAction('b'));
    if (this.pause) this.bindPress(this.pause, () => { this.clear(); this.onMenu(); });
    this.on(this.pad, 'pointerdown', event => {
      if (!this.allowed() || this.padId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault(); this.padId = event.pointerId;
      try { this.pad.setPointerCapture(event.pointerId); } catch { /* Ended pointer. */ }
      this.movePad(event);
    });
    this.on(this.pad, 'pointermove', event => { if (event.pointerId === this.padId) { event.preventDefault(); this.movePad(event); } });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(this.pad, type, event => { if (event.pointerId === this.padId) this.releasePad(); });
    this.on(this.pad, 'contextmenu', event => event.preventDefault());
    this.on(window, 'pointerup', event => this.releasePointer(event.pointerId));
    this.on(window, 'pointercancel', event => this.releasePointer(event.pointerId));
    this.on(window, 'keydown', event => this.keyDown(event), { capture: true });
    this.on(window, 'keyup', event => this.keyUp(event), { capture: true });
    this.on(window, 'blur', () => this.clear());
    this.on(window, 'focus', () => this.menuHeld.clear());
    this.on(document, 'visibilitychange', () => { if (document.hidden) this.clear(); });
    this.on(this.controlsQuery, 'change', () => this.clear());
    this.on(this.portrait, 'change', () => this.clear());
    this.on(window, 'keydown', event => {
      if (event.code !== 'Tab' || !this.menu()) return;
      const controls = this.menuControls(); const index = controls.indexOf(document.activeElement);
      if (controls.length && (index === -1 || (!event.shiftKey && index === controls.length - 1) || (event.shiftKey && index === 0))) {
        event.preventDefault(); this.focusControl(controls[event.shiftKey ? controls.length - 1 : 0]);
      }
    }, { capture: true });
    this.refresh();
  }

  on(target, type, callback, options = {}) { target.addEventListener(type, callback, { ...options, signal: this.abort.signal }); }
  allowed() { return !this.portrait.matches && !document.hidden; }
  menu() { return this.getMenu?.() ?? null; }
  bindPress(button, callback) {
    this.on(button, 'pointerdown', event => {
      event.stopImmediatePropagation();
      if (!this.allowed() || button.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault(); button.blur();
      this.pointers.set(event.pointerId, button);
      try { button.setPointerCapture(event.pointerId); } catch { /* Ended pointer. */ }
      button.classList.add('is-held'); this.onAudioGesture(); callback();
    }, { capture: true });
    this.on(button, 'click', event => {
      event.stopImmediatePropagation(); event.preventDefault();
      if (event.detail === 0 && this.allowed() && !button.disabled) { this.onAudioGesture(); callback(); }
    }, { capture: true });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(button, type, event => this.releasePointer(event.pointerId));
    this.on(button, 'contextmenu', event => event.preventDefault());
  }

  pressAction(letter) {
    if (this.menu()) {
      // A new press is required after every screen transition. A held old finger
      // only releases; it cannot click the newly focused menu item.
      this.clear();
      if (letter === 'a') this.confirmMenu(); else this.onBack();
    } else if (this.canPlay()) {
      if (this.mode === 'gym') { if (letter === 'a') { this.clear(); this.onInteract(); } }
      else this.onAction(letter === 'a' ? 'jab' : 'cross');
    }
  }

  menuControls() {
    return [...(this.menu()?.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled)') ?? [])]
      .filter(element => element.getClientRects().length && !element.closest('[hidden]'));
  }
  focusControl(element) { element?.focus({ preventScroll: true }); element?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  navigateMenu(direction) {
    const controls = this.menuControls(); if (!controls.length) return;
    const focused = document.activeElement;
    if ((direction === 'left' || direction === 'right') && controls.includes(focused)
      && (focused instanceof HTMLSelectElement || focused instanceof HTMLInputElement)) {
      this.adjustSetting(focused, direction === 'right' ? 1 : -1); return;
    }
    const index = controls.indexOf(focused);
    const step = direction === 'up' || direction === 'left' ? -1 : 1;
    this.focusControl(controls[index === -1 ? 0 : (index + step + controls.length) % controls.length]);
  }
  adjustSetting(control, step) {
    if (control instanceof HTMLSelectElement) {
      control.selectedIndex = (control.selectedIndex + step + control.options.length) % control.options.length;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (control instanceof HTMLInputElement && control.type === 'range') {
      control.value = String(Number(control.value) + step * Number(control.step || 1));
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  confirmMenu() {
    const controls = this.menuControls();
    const focused = controls.includes(document.activeElement) ? document.activeElement : controls.find(e => e.matches('.primary-button, .gym-talk-button, .gym-sparring-button, .gym-bag-button, .gym-shadow-button, .gym-resume-button')) ?? controls[0];
    if (!focused) return;
    this.focusControl(focused);
    if (focused instanceof HTMLButtonElement) focused.click();
    else this.focusControl(controls[(controls.indexOf(focused) + 1) % controls.length]);
  }

  keyDown(event) {
    if (!INPUT_KEYS.has(event.code)) return;
    // Fields outside this game's menu retain their ordinary typing behavior.
    if (event.target instanceof Element && event.target.closest('textarea, [contenteditable="true"]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!this.allowed() || event.repeat || this.keys.has(event.code) || this.menuHeld.has(event.code)) return;
    if (['Enter', 'Space'].includes(event.code) && event.target instanceof HTMLButtonElement
      && !event.target.disabled && this.root.contains(event.target)) {
      this.menuHeld.add(event.code); event.target.click(); return;
    }
    const direction = DIRECTIONS[event.code];
    if (this.menu()) {
      this.menuHeld.add(event.code);
      if (direction) this.navigateMenu(direction);
      else if (event.code === 'Enter' || event.code === 'KeyJ') this.confirmMenu();
      else if (event.code === 'KeyP') { this.clear(); this.onMenu(); }
      else if (['Escape', 'KeyK'].includes(event.code)) { this.clear(); this.onBack(); }
      else if (event.code === 'KeyM') this.onMute();
      return;
    }
    if (event.code === 'Escape' || event.code === 'KeyP') { this.menuHeld.add(event.code); this.clear(); this.onPause(); return; }
    if (event.code === 'KeyM') { this.menuHeld.add(event.code); this.onMute(); return; }
    if (!this.canPlay()) return;
    if (direction) {
      this.keys.set(event.code, direction); this.refreshDirections();
      if (this.mode !== 'gym' && (direction === 'left' || direction === 'right')) this.onAction(direction === 'left' ? 'dodgeLeft' : 'dodgeRight');
    } else if (this.mode === 'gym' && (event.code === 'KeyE' || event.code === 'Enter')) {
      this.menuHeld.add(event.code); this.clear(); this.onInteract();
    } else if (this.mode !== 'gym' && (event.code === 'KeyJ' || event.code === 'KeyK')) {
      this.keys.set(event.code, event.code); this.onAudioGesture(); this.onAction(event.code === 'KeyJ' ? 'jab' : 'cross');
    }
  }
  keyUp(event) {
    if (!INPUT_KEYS.has(event.code)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    this.menuHeld.delete(event.code);
    if (this.keys.delete(event.code)) this.refreshDirections();
  }

  movePad(event) {
    const rect = this.pad.getBoundingClientRect();
    let x = (event.clientX - rect.left - rect.width / 2) / (rect.width * .37);
    let y = (event.clientY - rect.top - rect.height / 2) / (rect.height * .37);
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    this.stick.style.transform = `translate(${x * 25}%, ${y * 25}%)`;
    this.pad.classList.toggle('is-held', length > .22);
    const direction = length < .22 ? null : Math.abs(x) > Math.abs(y) ? x > 0 ? 'right' : 'left' : y > 0 ? 'down' : 'up';
    const previous = this.padDirection;
    this.padDirection = direction;
    this.padVector = length < .22 ? { x: 0, y: 0 } : { x, y };
    if (this.menu()) {
      if (direction && previous !== direction) this.navigateMenu(direction);
    } else if (this.canPlay()) {
      this.refreshDirections();
      if (this.mode !== 'gym' && direction !== previous && ['left', 'right'].includes(direction)) this.onAction(direction === 'left' ? 'dodgeLeft' : 'dodgeRight');
    }
  }
  refreshDirections() {
    const held = new Set(this.keys.values());
    if (this.mode === 'gym') {
      let x = Number(held.has('right')) - Number(held.has('left')) + this.padVector.x;
      let y = Number(held.has('down')) - Number(held.has('up')) + this.padVector.y;
      const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
      if (!this.canPlay() || this.menu()) x = y = 0;
      if (x !== this.vector.x || y !== this.vector.y) { this.vector = { x, y }; this.onMove(this.vector); }
    } else {
      if (this.padDirection) held.add(this.padDirection);
      const guard = this.canPlay() && !this.menu() ? held.has('down') ? 'body' : held.has('up') ? 'head' : null : null;
      if (guard !== this.guard) { this.guard = guard; this.onGuard(Boolean(guard), guard ?? 'head'); }
    }
  }
  releasePad() {
    const id = this.padId; this.padId = null; this.padDirection = null; this.padVector = { x: 0, y: 0 };
    this.stick.style.transform = ''; this.pad.classList.remove('is-held');
    try { if (id !== null && this.pad.hasPointerCapture(id)) this.pad.releasePointerCapture(id); } catch { /* Detached capture. */ }
    this.refreshDirections();
  }
  releasePointer(id) {
    if (id === this.padId) this.releasePad();
    const button = this.pointers.get(id); if (!button) return;
    this.pointers.delete(id);
    if (![...this.pointers.values()].includes(button)) button.classList.remove('is-held');
    try { if (button.hasPointerCapture(id)) button.releasePointerCapture(id); } catch { /* Detached capture. */ }
  }
  clear() {
    // Preserve keyboard latches until keyup across menus; repeated held keys
    // must not start another scene or resume a pause caused by focus loss.
    for (const key of this.keys.keys()) this.menuHeld.add(key);
    this.keys.clear(); this.releasePad();
    for (const id of [...this.pointers.keys()]) this.releasePointer(id);
    this.refreshDirections();
  }
  refresh() {
    const menu = Boolean(this.menu()); this.root.dataset.controlMode = menu ? 'menu' : 'play';
    this.a.disabled = this.b.disabled = false;
    this.b.classList.toggle('is-inactive', this.mode === 'gym' && !menu);
    const labels = menu ? ['Valider', 'Retour'] : this.mode === 'gym' ? ['Interagir', 'Retour'] : [this.a.dataset.moveLabel ?? (this.a.classList.contains('is-combo-ready') ? 'Crochet' : 'Jab'), 'Direct'];
    for (const [button, letter, label] of [[this.a, 'A', labels[0]], [this.b, 'B', labels[1]]]) {
      let key = button.querySelector('.control-key, .gym-interact-key');
      let text = button.querySelector('.control-label, .gym-interact-label');
      if (!key || !text) { button.innerHTML = '<span class="control-key"></span><span class="control-label"></span>'; key = button.firstElementChild; text = button.lastElementChild; }
      key.textContent = letter; text.textContent = label;
      button.setAttribute('aria-label', `${letter} — ${label}`);
    }
    if (this.pause) { this.pause.disabled = false; this.pause.hidden = false; }
  }
  destroy() { this.clear(); this.abort.abort(); this.menuHeld.clear(); }
}

/** Adapter shared by the existing scene overlays. Their panels, settings and
 * status displays stay owned by each activity; the physical controls do not. */
export function installConsoleControls(ui, mode = 'combat') {
  return new GameControls({
    root: ui.root, mode,
    canPlay: () => mode === 'gym' ? ui.canMove() : ui.canPlay?.() ?? ui.phase === 'running',
    getMenu: () => ui.root.querySelector('.commands-panel:not([hidden]), .gym-dialog:not([hidden]), .gym-pause-panel:not([hidden]), .round-panel:not([hidden]), .bag-panel:not([hidden]), .shadow-panel:not([hidden])'),
    onMove: vector => ui.callbacks.onMove?.(vector),
    onAction: action => ui.callbacks.onAction?.(action),
    onGuard: (held, level) => ui.callbacks.onGuard?.(held, level),
    onInteract: () => ui.interact(),
    onPause: () => mode === 'gym' ? ui.requestPause() : ui.callbacks.onPause(),
    onMenu: () => {
      if (ui.commandsOpen) ui.showCommands(false);
      else if (mode === 'gym') {
        if (ui.paused) ui.callbacks.onResume();
        else if (ui.dialog) ui.callbacks.onCloseDialog();
        else ui.requestPause();
      } else if (ui.phase === 'paused') ui.callbacks.onResume();
      else if (ui.phase === 'running') ui.callbacks.onPause();
      // The ready screen and the results already are menus. Opening the menu
      // again leaves them in place; only B or the explicit exit returns outside.
    },
    onBack: () => {
      if (ui.commandsOpen) ui.showCommands(false);
      else if (mode === 'gym') {
        if (ui.paused) ui.callbacks.onResume();
        else if (ui.dialog) ui.callbacks.onCloseDialog();
      } else if (ui.phase === 'paused') ui.callbacks.onResume();
      else ui.callbacks.onReturnGym();
    },
    onMute: () => ui.changeAudio ? ui.changeAudio({ muted: !ui.audio.muted }) : ui.callbacks.onMute?.(),
    onAudioGesture: () => ui.callbacks.onAudioGesture?.(),
    onReturnGym: mode === 'gym' ? null : () => ui.callbacks.onReturnGym(),
  });
}
