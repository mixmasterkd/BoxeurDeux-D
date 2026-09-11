import { mountSideControls } from './GameLayout.js';
import { BAG_RHYTHM } from '../game/BagSession.js';
import './bag.css';

export class BagUI {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.root = document.getElementById('bag-ui');
    this.stage = document.getElementById('stage');
    this.phase = 'ready'; this.commandsOpen = false; this.sequenceIndex = -1;
    this.keys = new Set(); this.pointers = new Map(); this.menuPointers = new Map();
    this.abort = new AbortController();
    this.portrait = matchMedia('(max-width: 900px) and (orientation: portrait)');
    this.root.dataset.touch = String(navigator.maxTouchPoints > 0);
    this.root.innerHTML = `
      <header class="bag-hud"><span>LE SAC · RYTHME & ENCHAÎNEMENTS</span><strong class="bag-clock">0:45</strong><span><b data-bag-stat="accurate">0</b> frappes précises</span></header>
      <div class="bag-choreography"><div class="bag-sequence-title"></div><div class="bag-steps"></div><div class="bag-instruction"></div></div>
      <div class="bag-feedback" role="status"></div>
      <div class="bag-menu-shade"></div>
      <section class="bag-panel" role="dialog" aria-modal="true" aria-labelledby="bag-title">
        <div><p class="commands-eyebrow">L’ATELIER DU SAC</p><h2 id="bag-title">Trouve ton rythme</h2><p class="bag-panel-copy">Observe les coups annoncés. Frappe quand leur repère s’allume, puis laisse revenir les bras. Les enchaînements deviennent progressivement plus longs.</p>
        <div class="bag-results" hidden><dl><div><dt>Contacts</dt><dd data-bag-stat="contacts">0</dd></div><div><dt>Enchaînements réussis</dt><dd data-bag-stat="combosCompleted">0</dd></div><div><dt>Précision</dt><dd class="bag-precision">0 %</dd></div></dl><p class="bag-advice"></p></div></div>
        <div class="bag-panel-actions"><button class="bag-start-button primary-button">Commencer · 45 s →</button><button class="bag-restart-button choose-session-button" hidden>Recommencer la séance</button><button class="commands-open-button">Commandes</button><button class="bag-return-button choose-session-button">← Retour au gym</button></div>
      </section>
      <section class="commands-panel" role="dialog" aria-modal="true" aria-labelledby="bag-commands-title" hidden><p class="commands-eyebrow">SÉANCE ARRÊTÉE</p><h2 id="bag-commands-title">Commandes du sac</h2>
        <div class="commands-grid"><dl><div><dt>Jab</dt><dd>J</dd></div><div><dt>Direct</dt><dd>K</dd></div><div><dt>Pause · son</dt><dd>P / Échap · M</dd></div></dl><div class="commands-notes"><p><strong>J → K → J : jab, direct, crochet.</strong> Le troisième J devient un crochet si les deux premiers coups de cet enchaînement sont réussis et si tu suis le rythme.</p><p>Une pression par coup. Au tactile, utilise les boutons dans la marge droite. Le bouton Jab indique Crochet quand il est prêt.</p></div></div><button class="commands-back-button">← Retour au menu</button></section>
      <div class="bag-action-dock"><button class="control-button attack-control" data-action="jab"><span class="control-key">Jab</span><span class="control-label">Gauche</span></button><button class="control-button attack-control" data-action="cross"><span class="control-key">Direct</span><span class="control-label">Droite</span></button></div>
      <button class="bag-pause-button" aria-label="Mettre la séance en pause">Ⅱ</button><button class="bag-audio-button audio-button" aria-label="Activer ou couper le son">♪ Son</button>`;
    mountSideControls(this.root, { right: ['.bag-pause-button', '.bag-audio-button', '.bag-action-dock'] });
    this.buttons = [...this.root.querySelectorAll('[data-action]')];
    this.bind();
    this.stage.inert = this.portrait.matches;
    this.update(callbacks.getState());
  }
  on(target, type, fn, options = {}) { target.addEventListener(type, fn, { ...options, signal: this.abort.signal }); }
  text(selector, value) { const e = this.root.querySelector(selector); if (e.textContent !== String(value)) e.textContent = value; }
  activate(selector, fn) {
    const button = this.root.querySelector(selector);
    this.on(button, 'pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button === 0) this.menuPointers.set(button, event.pointerId);
    });
    this.on(button, 'pointercancel', () => this.menuPointers.delete(button));
    this.on(button, 'click', event => {
      const id = this.menuPointers.get(button); this.menuPointers.delete(button);
      if (event.detail && (id === undefined || (typeof event.pointerId === 'number' && id !== event.pointerId))) return;
      if (this.portrait.matches || document.hidden) return;
      this.clear(); button.blur(); this.callbacks.onAudioGesture(); fn();
    });
  }
  bind() {
    this.activate('.bag-start-button', () => this.phase === 'paused' ? this.callbacks.onResume() : this.callbacks.onStart());
    this.activate('.bag-restart-button', () => this.callbacks.onStart());
    this.activate('.bag-return-button', () => this.callbacks.onReturnGym());
    this.activate('.bag-pause-button', () => this.callbacks.onPause());
    this.activate('.bag-audio-button', () => this.callbacks.onMute());
    this.activate('.commands-open-button', () => this.showCommands(true));
    this.activate('.commands-back-button', () => this.showCommands(false));
    for (const button of this.buttons) {
      this.on(button, 'pointerdown', event => {
        if (this.phase !== 'running' || this.portrait.matches || document.hidden || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault(); button.blur();
        this.pointers.set(event.pointerId, button);
        try { button.setPointerCapture(event.pointerId); } catch { /* Ended pointer. */ }
        button.classList.add('is-held');
        this.callbacks.onAudioGesture(); this.callbacks.onAction(button.dataset.action);
      });
      this.on(button, 'click', event => {
        // Native keyboard activation has no pointerdown; real touches already fired.
        if (event.detail !== 0 || this.phase !== 'running' || this.portrait.matches || document.hidden) return;
        this.callbacks.onAudioGesture(); this.callbacks.onAction(button.dataset.action);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(button, type, e => this.release(e.pointerId));
      this.on(button, 'contextmenu', e => e.preventDefault());
    }
    this.on(window, 'pointerup', e => this.release(e.pointerId));
    this.on(window, 'pointercancel', e => this.release(e.pointerId));
    this.on(window, 'pointerdown', e => { if (e.pointerType === 'touch') this.root.dataset.touch = 'true'; });
    this.on(window, 'keydown', event => {
      if (this.portrait.matches || document.hidden) return;
      if (event.code === 'Tab' && this.phase !== 'running') {
        const panel = this.root.querySelector(this.commandsOpen ? '.commands-panel' : '.bag-panel');
        const buttons = [...panel.querySelectorAll('button')].filter(e => e.getClientRects().length);
        const index = buttons.indexOf(document.activeElement);
        if (index === -1 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) { event.preventDefault(); buttons[event.shiftKey ? buttons.length - 1 : 0].focus(); }
        return;
      }
      if (event.code === 'KeyP' || event.code === 'Escape') {
        event.preventDefault(); if (event.repeat) return;
        this.clear(); this.callbacks.onAudioGesture();
        if (this.commandsOpen) this.showCommands(false);
        else if (this.phase === 'running') this.callbacks.onPause();
        else if (this.phase === 'paused') this.callbacks.onResume();
        return;
      }
      if (event.target instanceof HTMLButtonElement && ['Enter', 'Space'].includes(event.code)) { if (event.repeat) event.preventDefault(); return; }
      if (event.code === 'KeyM') { if (!event.repeat) { event.preventDefault(); this.callbacks.onMute(); } return; }
      const action = { KeyJ: 'jab', KeyK: 'cross' }[event.code];
      if (!action) return;
      event.preventDefault();
      if (event.repeat || this.keys.has(event.code) || this.phase !== 'running') return;
      this.keys.add(event.code); this.callbacks.onAudioGesture(); this.callbacks.onAction(action);
    });
    this.on(window, 'keyup', e => this.keys.delete(e.code));
    const blur = () => { this.clear(); this.callbacks.onPause(); };
    this.on(window, 'blur', blur);
    this.on(document, 'visibilitychange', () => { if (document.hidden) blur(); });
    this.on(this.portrait, 'change', event => { this.stage.inert = event.matches; if (event.matches) blur(); });
  }
  release(id) {
    const button = this.pointers.get(id); if (!button) return;
    this.pointers.delete(id);
    if (![...this.pointers.values()].includes(button)) button.classList.remove('is-held');
    try { if (button.hasPointerCapture(id)) button.releasePointerCapture(id); } catch { /* Canceled pointer. */ }
  }
  clear() { this.keys.clear(); this.menuPointers.clear(); for (const id of [...this.pointers.keys()]) this.release(id); }
  showCommands(open) {
    if (this.phase === 'running') return;
    this.clear(); this.commandsOpen = open;
    this.root.querySelector('.bag-panel').hidden = open;
    this.root.querySelector('.commands-panel').hidden = !open;
    this.root.querySelector(open ? '.commands-back-button' : '.commands-open-button').focus({ preventScroll: true });
  }
  setAudioState(audio) {
    const button = this.root.querySelector('.bag-audio-button'); button.disabled = !audio.available;
    button.textContent = audio.muted ? '♪ Muet' : '♪ Son'; button.setAttribute('aria-pressed', String(audio.muted));
  }
  update(state) {
    const changed = this.phase !== state.phase || !this.initialized;
    this.phase = state.phase; this.initialized = true; this.root.dataset.phase = state.phase;
    const running = state.phase === 'running';
    if (changed) {
      this.clear(); this.commandsOpen = false;
      this.root.querySelector('.commands-panel').hidden = true;
      this.root.querySelector('.bag-panel').hidden = running;
      this.root.querySelector('.bag-menu-shade').hidden = running;
      this.root.querySelector('.bag-restart-button').hidden = state.phase !== 'paused';
      this.root.querySelector('.bag-results').hidden = state.phase !== 'finished';
      this.root.querySelector('.bag-panel-copy').hidden = state.phase === 'finished';
      this.text('#bag-title', state.phase === 'finished' ? 'Séance terminée' : state.phase === 'paused' ? 'Séance en pause' : 'Trouve ton rythme');
      this.text('.bag-start-button', state.phase === 'paused' ? 'Reprendre →' : state.phase === 'finished' ? 'Refaire la séance →' : 'Commencer · 45 s →');
      if (state.phase === 'paused' && !this.portrait.matches) this.root.querySelector('.bag-start-button').focus({ preventScroll: true });
      if (running && this.root.contains(document.activeElement)) document.activeElement.blur();
    }
    for (const button of this.buttons) button.disabled = !running;
    this.text('.bag-clock', `0:${String(Math.ceil(state.remaining)).padStart(2, '0')}`);
    for (const e of this.root.querySelectorAll('[data-bag-stat]')) if (e.textContent !== String(state.stats[e.dataset.bagStat])) e.textContent = state.stats[e.dataset.bagStat];
    const sequence = state.sequence;
    if (sequence.index !== this.sequenceIndex) {
      this.sequenceIndex = sequence.index;
      const steps = this.root.querySelector('.bag-steps'); steps.replaceChildren();
      for (const step of sequence.steps) { const e = document.createElement('div'); e.className = 'bag-step'; const name = document.createElement('span'); name.textContent = step.label; const meter = document.createElement('i'); e.append(name, meter); steps.append(e); }
    }
    this.text('.bag-sequence-title', sequence.title);
    const next = sequence.steps[sequence.nextStep];
    const now = next && Math.abs(state.elapsed - next.inputAt) <= BAG_RHYTHM.tolerance;
    this.text('.bag-instruction', sequence.stage === 'rest' ? 'Relâche les épaules…' : now ? 'Maintenant !' : 'Observe le prochain repère');
    [...this.root.querySelectorAll('.bag-step')].forEach((e, i) => {
      const step = sequence.steps[i];
      e.dataset.status = step.status;
      e.classList.toggle('is-now', step.status === 'waiting' && Math.abs(state.elapsed - step.inputAt) <= BAG_RHYTHM.tolerance);
      e.querySelector('i').style.transform = `scaleX(${Math.max(0, Math.min(1, 1 - (step.inputAt - state.elapsed) / BAG_RHYTHM.preparation))})`;
    });
    this.text('[data-action="jab"] .control-key', sequence.comboReady ? 'Crochet' : 'Jab');
    this.text('.bag-feedback', state.feedback.text);
    this.root.querySelector('.bag-feedback').dataset.tone = state.feedback.tone;
    if (state.summary) { this.text('.bag-precision', `${state.summary.precision} %`); this.text('.bag-advice', `${state.summary.positive} ${state.summary.improve}`); }
  }
  destroy() { this.clear(); this.abort.abort(); this.root.replaceChildren(); }
}
