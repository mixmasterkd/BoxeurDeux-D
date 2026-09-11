import { installConsoleControls, careerMenuOpen } from './GameControls.js';
import { mountSideControls, TOUCH_PORTRAIT_QUERY, TOUCH_CONTROLS_QUERY } from './GameLayout.js';
import { BAG_RHYTHM } from '../game/BagSession.js';
import { careerProfile } from '../game/CareerProfile.js';
import './bag.css';

export class BagUI {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.root = document.getElementById('bag-ui');
    this.stage = document.getElementById('stage');
    this.phase = 'ready'; this.commandsOpen = false; this.sequenceIndex = -1;
    this.menuPointers = new Map();
    this.abort = new AbortController();
    this.portrait = matchMedia(TOUCH_PORTRAIT_QUERY);
    this.controlsQuery = matchMedia(TOUCH_CONTROLS_QUERY);
    this.root.innerHTML = `
      <header class="bag-hud"><span>LE SAC · RYTHME & ENCHAÎNEMENTS</span><strong class="bag-clock">0:45</strong><span><b data-bag-stat="accurate">0</b> frappes précises</span></header>
      <div class="bag-choreography"><div class="bag-sequence-title"></div><div class="bag-steps"></div><div class="bag-instruction"></div></div>
      <div class="bag-feedback" role="status"></div>
      <div class="bag-menu-shade"></div>
      <section class="bag-panel" role="dialog" aria-modal="true" aria-labelledby="bag-title">
        <div><p class="commands-eyebrow">L’ATELIER DU SAC</p><h2 id="bag-title">Trouve ton rythme</h2><p class="bag-panel-copy">Observe les coups annoncés. Frappe quand leur repère s’allume, puis laisse revenir les bras. Les enchaînements deviennent progressivement plus longs.</p>
        <p class="bag-benefit"></p><div class="bag-results" hidden><dl><div><dt>Contacts</dt><dd data-bag-stat="contacts">0</dd></div><div><dt>Enchaînements réussis</dt><dd data-bag-stat="combosCompleted">0</dd></div><div><dt>Précision</dt><dd class="bag-precision">0 %</dd></div></dl><p class="bag-reward"></p><small class="bag-save-status" role="status"></small><p class="bag-advice"></p></div></div>
        <div class="bag-panel-actions"><button class="bag-start-button primary-button">Commencer · 45 s →</button><button class="bag-restart-button choose-session-button" hidden>Recommencer la séance</button><button class="commands-open-button">Commandes</button><button class="bag-return-button choose-session-button">← Retour au gym</button></div>
      </section>
      <section class="commands-panel" role="dialog" aria-modal="true" aria-labelledby="bag-commands-title" hidden><p class="commands-eyebrow">SÉANCE ARRÊTÉE</p><h2 id="bag-commands-title">Commandes du sac</h2>
        <div class="commands-grid"><dl>
          <div><dt>Jab / direct</dt><dd>J / K</dd></div>
          <div><dt>Garde haute / basse</dt><dd>↑ / ↓ ou W / S maintenu</dd></div>
          <div><dt>Esquive gauche / droite</dt><dd>← / → ou A / D</dd></div>
          <div><dt>Frappe au corps</dt><dd>↓ ou S + J / K</dd></div>
          <div><dt>Pause · son</dt><dd>P / Échap · M</dd></div>
        </dl><div class="commands-notes"><p><strong>J → K → J : jab, direct, crochet.</strong> Le troisième J devient un crochet si les deux premiers coups de cet enchaînement sont réussis et si tu suis le rythme.</p><p>Une pression par frappe ou esquive. Au tactile : joypad à gauche — haut pour la garde haute, bas pour la garde basse, côtés pour les esquives. À droite : A pour le jab, B pour le direct; A → B → A donne le crochet. Bas + A / B frappe au corps.</p><p>Dans les menus, le joypad choisit, A valide et B revient.</p></div></div><button class="commands-back-button">← Retour au menu</button></section>
      <div class="bag-action-dock"><button class="control-button attack-control" data-action="jab"><span class="control-key">A</span><span class="control-label">Jab</span></button><button class="control-button attack-control" data-action="cross"><span class="control-key">B</span><span class="control-label">Direct</span></button></div>
      <button class="bag-pause-button" aria-label="Mettre la séance en pause">Ⅱ</button><button class="bag-audio-button audio-button" aria-label="Activer ou couper le son">♪ Son</button>`;
    mountSideControls(this.root, { right: ['.bag-pause-button', '.bag-audio-button', '.bag-action-dock'] });
    this.buttons = [...this.root.querySelectorAll('[data-action]')];
    this.bind();
    this.controls = installConsoleControls(this, 'bag');
    this.stage.inert = this.portrait.matches || careerMenuOpen();
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
    const blur = () => { this.clear(); this.callbacks.onPause(); };
    this.on(this.controlsQuery, 'change', blur);
    this.on(window, 'blur', blur);
    this.on(document, 'visibilitychange', () => { if (document.hidden) blur(); });
    this.on(this.portrait, 'change', event => { this.stage.inert = event.matches || careerMenuOpen(); if (event.matches) blur(); });
  }
  clear() { this.controls?.clear(); this.menuPointers.clear(); }
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
  setReward(reward) {
    this.reward = reward;
    const text = reward.gained ? `${reward.label} +${reward.gained} · ${reward.value}/${reward.cap}`
      : reward.capped && reward.qualified ? `${reward.label} : plafond atteint` : 'Aucun gain cette fois · vise 6 contacts et 50 % de précision.';
    this.text('.bag-reward', text);
    this.text('.bag-save-status', reward.saveMessage ?? careerProfile.saveStatus().message);
  }
  update(state) {
    const changed = this.phase !== state.phase || !this.initialized;
    this.phase = state.phase; this.initialized = true; this.root.dataset.phase = state.phase;
    const running = state.phase === 'running';
    if (changed) {
      const { stats, caps } = careerProfile.snapshot();
      this.text('.bag-benefit', `Puissance : +${stats.power} / +${caps.power}. Termine avec 6 contacts et 50 % de précision : +1, jusqu’au plafond.`);
      this.root.querySelector('.bag-benefit').hidden = state.phase === 'finished';
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
    this.root.querySelector('[data-action="jab"]').classList.toggle('is-combo-ready', sequence.comboReady);
    this.text('.bag-feedback', state.feedback.text);
    this.root.querySelector('.bag-feedback').dataset.tone = state.feedback.tone;
    this.controls?.refresh();
    if (state.summary) { this.text('.bag-precision', `${state.summary.precision} %`); this.text('.bag-advice', `${state.summary.positive} ${state.summary.improve}`); }
  }
  destroy() { this.controls?.destroy(); this.clear(); this.abort.abort(); this.root.replaceChildren(); }
}
