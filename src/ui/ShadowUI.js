import { installConsoleControls } from './GameControls.js';
import { mountSideControls, TOUCH_PORTRAIT_QUERY, TOUCH_CONTROLS_QUERY } from './GameLayout.js';
import './shadow.css';

const MOVEMENT_LABELS = {
  idle: 'En garde, à votre rythme', guard: 'Garde haute', jab: 'Jab gauche',
  cross: 'Direct droit', hook: 'Crochet gauche', dodgeLeft: 'Esquive gauche', dodgeRight: 'Esquive droite',
};
const noop = () => {};

/** Free practice controls. The session owns every movement and combo window. */
export class ShadowUI {
  constructor(callbacks = {}) {
    this.callbacks = Object.fromEntries([
      'onAction', 'onGuard', 'onStart', 'onPause', 'onResume', 'onFinish',
      'onReset', 'onReturnGym', 'onSpeed', 'onAudioGesture', 'onMute',
    ].map(name => [name, callbacks[name] ?? noop]));
    this.callbacks.onBlur = callbacks.onBlur ?? this.callbacks.onPause;
    this.root = document.getElementById('shadow-ui');
    this.stage = document.getElementById('stage');
    this.phase = 'ready';
    this.commandsOpen = false;
    this.menuPointers = new Map();
    this.abort = new AbortController();
    this.portrait = matchMedia(TOUCH_PORTRAIT_QUERY);
    this.controlsQuery = matchMedia(TOUCH_CONTROLS_QUERY);
    this.root.innerHTML = `
      <header class="shadow-hud"><span>SHADOW BOXING · À VOTRE RYTHME</span><span class="shadow-speed-label" hidden>RALENTI</span></header>
      <div class="shadow-movement" role="status" aria-live="polite" aria-atomic="true">En garde, à votre rythme</div>
      <div class="shadow-menu-shade" aria-hidden="true"></div>
      <section class="shadow-panel" role="dialog" aria-modal="true" aria-labelledby="shadow-title">
        <div class="shadow-panel-intro"><p class="commands-eyebrow">L’ATELIER DU MIROIR</p><h2 id="shadow-title">Observez votre geste</h2>
          <p class="shadow-panel-copy">Travaillez vos frappes, votre garde et vos esquives devant le miroir. Prenez le temps de revenir en garde entre les gestes et essayez vos enchaînements.</p>
          <div class="shadow-results" hidden><p class="shadow-duration"></p><dl>
            <div><dt>Frappes</dt><dd data-shadow-stat="punches">0</dd></div>
            <div><dt>Enchaînements complets</dt><dd data-shadow-stat="combos">0</dd></div>
            <div><dt>Esquives</dt><dd data-shadow-stat="dodges">0</dd></div>
            <div><dt>Garde tenue</dt><dd data-shadow-stat="guard">0 s</dd></div>
          </dl><p class="shadow-punch-detail"></p><p class="shadow-session-note">Revenez quand vous voulez pour travailler un mouvement.</p></div>
        </div>
        <div class="shadow-panel-actions">
          <label class="shadow-speed-setting" for="shadow-speed">Vitesse des gestes<select id="shadow-speed" name="shadow-speed"><option value="1">Normale</option><option value="0.65">Ralenti · observer le geste</option></select></label>
          <button type="button" class="shadow-start-button primary-button">Pratiquer →</button>
          <button type="button" class="shadow-finish-button choose-session-button" hidden>Terminer la séance</button>
          <button type="button" class="shadow-reset-button choose-session-button" hidden>Recommencer la séance</button>
          <button type="button" class="commands-open-button">Commandes</button>
          <button type="button" class="shadow-return-button choose-session-button">← Retour au gym</button>
        </div>
      </section>
      <section class="commands-panel shadow-commands" role="dialog" aria-modal="true" aria-labelledby="shadow-commands-title" hidden>
        <p class="commands-eyebrow">PRATIQUE LIBRE</p><h2 id="shadow-commands-title">Commandes du miroir</h2>
        <div class="commands-grid"><dl>
          <div><dt>Jab gauche</dt><dd>J</dd></div><div><dt>Direct droit</dt><dd>K</dd></div>
          <div><dt>Crochet gauche en combo</dt><dd>J → K → J</dd></div><div><dt>Garde haute / basse</dt><dd>W / S maintenu</dd></div><div><dt>Frappe au corps</dt><dd>S + J / K</dd></div>
        </dl><dl>
          <div><dt>Esquive gauche / droite</dt><dd>A / D</dd></div>
          <div><dt>Pause / retour</dt><dd>P ou Échap</dd></div><div><dt>Son / muet</dt><dd>Menu pause</dd></div>
        </dl></div>
        <p class="commands-tip">Une pression par frappe ou esquive. Enchaînez J → K → J : le prochain coup peut être préparé juste avant le retour en garde. La garde haute, une esquive ou une pause interrompt le combo. Maintenir bas permet d’enchaîner au corps.</p>
        <p class="commands-tip">Le ralenti se choisit dans le menu. Terminez la séance depuis le menu pause pour voir les mouvements pratiqués.</p>
        <p class="commands-touch-tip commands-tip">Au tactile : joypad à gauche (haut : tête, bas : corps, côtés : esquives), A pour le jab, B pour le direct. Bas + A / B frappe au corps. A → B → A donne le crochet. Dans les menus, A valide et B revient.</p>
        <button type="button" class="commands-back-button">← Retour au menu</button>
      </section>
      <div class="shadow-defense-dock"></div>
      <div class="shadow-attack-dock" aria-label="Frappes">
        <button type="button" class="control-button attack-control" data-action="jab" aria-label="A — Jab gauche"><span class="control-key">A</span><span class="control-label">Jab</span></button>
        <button type="button" class="control-button attack-control" data-action="cross" aria-label="B — Direct droit"><span class="control-key">B</span><span class="control-label">Direct</span></button>
      </div>
      <button type="button" class="shadow-pause-button" aria-label="Mettre la séance en pause">Ⅱ</button>
      <button type="button" class="shadow-audio-button" aria-label="Couper le son" aria-pressed="false">♪ Son</button>`;
    mountSideControls(this.root, {
      left: ['.shadow-defense-dock'],
      right: ['.shadow-pause-button', '.shadow-audio-button', '.shadow-attack-dock'],
    });
    this.buttons = new Map([...this.root.querySelectorAll('[data-action]')].map(button => [button.dataset.action, button]));
    this.bind();
    this.controls = installConsoleControls(this, 'combat');
    this.stage.inert = this.portrait.matches;
    this.setAudioState({ available: true, muted: false });
    this.update(callbacks.getState?.() ?? { phase: 'ready', seconds: 0, speed: 1, player: { action: 'idle' }, combo: {}, stats: {} });
  }

  on(target, type, fn, options = {}) {
    target.addEventListener(type, fn, { ...options, signal: this.abort.signal });
  }

  text(selector, value) {
    const element = this.root.querySelector(selector);
    if (element.textContent !== String(value)) element.textContent = value;
  }

  activate(selector, fn) {
    const button = this.root.querySelector(selector);
    this.on(button, 'pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button === 0) this.menuPointers.set(button, event.pointerId);
    });
    this.on(button, 'pointercancel', () => this.menuPointers.delete(button));
    this.on(button, 'click', event => {
      const id = this.menuPointers.get(button);
      this.menuPointers.delete(button);
      // A release from an old held guard must never activate a new pause menu.
      if (event.detail !== 0 && (id === undefined || (typeof event.pointerId === 'number' && event.pointerId !== id))) return;
      if (this.portrait.matches || document.hidden) return;
      this.clearInputs();
      button.blur();
      this.callbacks.onAudioGesture();
      fn();
    });
  }

  bind() {
    this.activate('.shadow-start-button', () => {
      if (this.phase === 'paused') this.callbacks.onResume();
      else if (this.phase === 'finished') this.callbacks.onReset();
      else this.callbacks.onStart();
    });
    this.activate('.shadow-reset-button', () => this.callbacks.onReset());
    this.activate('.shadow-finish-button', () => this.callbacks.onFinish());
    this.activate('.shadow-return-button', () => this.callbacks.onReturnGym());
    this.activate('.shadow-pause-button', () => this.callbacks.onPause());
    this.activate('.shadow-audio-button', () => this.callbacks.onMute());
    this.activate('.commands-open-button', () => this.showCommands(true));
    this.activate('.commands-back-button', () => this.showCommands(false));
    const speed = this.root.querySelector('#shadow-speed');
    this.on(speed, 'change', () => {
      if (this.phase === 'running' || this.portrait.matches || document.hidden) return;
      this.clearInputs();
      this.callbacks.onSpeed(Number(speed.value));
    });
    const blur = () => {
      this.clearInputs();
      this.callbacks.onBlur();
    };
    this.on(this.controlsQuery, 'change', blur);
    this.on(window, 'blur', blur);
    this.on(document, 'visibilitychange', () => { if (document.hidden) blur(); });
    this.on(this.portrait, 'change', event => {
      this.stage.inert = event.matches;
      if (event.matches) blur();
    });
  }

  canPlay() {
    return this.phase === 'running' && !this.portrait.matches && !document.hidden;
  }

  clearInputs() { this.controls?.clear(); this.menuPointers.clear(); }

  showCommands(open) {
    if (this.phase === 'running') return;
    this.clearInputs();
    this.commandsOpen = open;
    this.root.querySelector('.shadow-panel').hidden = open;
    this.root.querySelector('.commands-panel').hidden = !open;
    if (!this.portrait.matches) this.root.querySelector(open ? '.commands-back-button' : '.commands-open-button').focus({ preventScroll: true });
  }

  setAudioState({ available = true, muted = false } = {}) {
    const button = this.root.querySelector('.shadow-audio-button');
    button.disabled = !available;
    button.textContent = !available ? 'Son indispo.' : muted ? '♪ Muet' : '♪ Son';
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', !available ? 'Son indisponible' : muted ? 'Activer le son' : 'Couper le son');
  }

  setMentor(data) {
    this.mentor = data ? { ...this.mentor, ...data } : null;
    let progress = this.root.querySelector('.shadow-mentor-progress');
    if (!progress) {
      progress = document.createElement('div'); progress.className = 'shadow-mentor-progress';
      progress.setAttribute('role', 'status'); this.root.append(progress);
    }
    progress.hidden = !this.mentor;
    if (!this.mentor) return;
    const { name = 'The Octopus', title = 'Drills au gym', description = '', objective = '', progress: count = '', completed = false } = this.mentor;
    this.root.querySelector('.shadow-hud > span').textContent = `${name.toUpperCase()} · DRILLS`;
    this.text('#shadow-title', this.phase === 'paused' ? `${name} t’attend` : this.phase === 'finished' ? completed ? 'Drill réussi !' : 'Les gestes travaillés' : title);
    this.text('.shadow-panel-copy', description);
    this.root.querySelector('.shadow-panel-copy').hidden = this.phase === 'finished';
    progress.textContent = `${completed ? '✓ ' : ''}${objective}${count !== '' ? ` · ${count}` : ''}`;
    this.text('.shadow-session-note', completed ? `${name} : beau travail. Retrouve ce geste dans le ring.` : description);
  }

  update(state) {
    const changed = !this.initialized || this.phase !== state.phase;
    this.initialized = true;
    this.phase = state.phase;
    this.root.dataset.phase = state.phase;
    const running = state.phase === 'running';
    if (changed) {
      this.clearInputs();
      this.commandsOpen = false;
      this.root.querySelector('.commands-panel').hidden = true;
      this.root.querySelector('.shadow-panel').hidden = running;
      this.root.querySelector('.shadow-menu-shade').hidden = running;
      this.root.querySelector('.shadow-finish-button').hidden = state.phase !== 'paused';
      this.root.querySelector('.shadow-reset-button').hidden = state.phase !== 'paused';
      this.root.querySelector('.shadow-results').hidden = state.phase !== 'finished';
      this.root.querySelector('.shadow-panel-copy').hidden = state.phase === 'finished';
      this.text('#shadow-title', state.phase === 'paused' ? 'Séance en pause' : state.phase === 'finished' ? 'Les gestes travaillés' : 'Observez votre geste');
      this.text('.shadow-start-button', state.phase === 'paused' ? 'Reprendre →' : state.phase === 'finished' ? 'Nouvelle séance →' : 'Pratiquer →');
      if (!running && !this.portrait.matches) this.root.querySelector('.shadow-start-button').focus({ preventScroll: true });
      if (running && this.root.contains(document.activeElement)) document.activeElement.blur();
    }
    for (const button of this.buttons.values()) button.disabled = !running;
    const speed = this.root.querySelector('#shadow-speed');
    speed.disabled = running;
    if (speed.value !== String(state.speed)) speed.value = String(state.speed);
    this.root.querySelector('.shadow-speed-label').hidden = state.speed !== 0.65;
    const ready = Boolean(state.combo?.ready);
    const jabButton = this.buttons.get('jab');
    jabButton.classList.toggle('is-combo-ready', ready);
    jabButton.setAttribute('aria-label', ready ? 'Crochet gauche en combo' : 'Jab gauche');
    this.controls?.refresh();
    this.text('.shadow-movement', ready && state.player.action === 'idle' ? 'Crochet prêt' : state.player.action === 'guard' ? (state.player.guardLevel === 'body' ? 'Garde basse' : 'Garde haute') : `${MOVEMENT_LABELS[state.player.action] ?? 'En garde, à votre rythme'}${['jab', 'cross', 'hook'].includes(state.player.action) && state.player.target === 'body' ? ' au corps' : ''}`);
    if (state.phase === 'finished') {
      const stats = state.stats;
      const seconds = Math.floor(state.seconds);
      const duration = seconds >= 60 ? `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s` : `${seconds} s`;
      this.text('.shadow-duration', `${duration} de pratique`);
      this.text('[data-shadow-stat="punches"]', stats.jab + stats.cross + stats.hook);
      this.text('[data-shadow-stat="combos"]', stats.combos);
      this.text('[data-shadow-stat="dodges"]', stats.dodgeLeft + stats.dodgeRight);
      this.text('[data-shadow-stat="guard"]', `${Math.floor(stats.guardSeconds)} s`);
      this.text('.shadow-punch-detail', `${stats.jab} jab${stats.jab > 1 ? 's' : ''} · ${stats.cross} direct${stats.cross > 1 ? 's' : ''} · ${stats.hook} crochet${stats.hook > 1 ? 's' : ''}`);
    }
    if (this.mentor) this.setMentor(this.mentor);
  }

  destroy() {
    this.controls?.destroy();
    this.clearInputs();
    this.abort.abort();
    this.root.replaceChildren();
  }
}
