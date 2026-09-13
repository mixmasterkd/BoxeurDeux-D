import { installConsoleControls } from './GameControls.js';
import { mountSideControls, TOUCH_PORTRAIT_QUERY, TOUCH_CONTROLS_QUERY } from './GameLayout.js';
import './rhythm.css';

const noop = () => {};
const ACTIVITIES = {
  speedball: {
    title: 'Speed ball', skill: 'Récupération', invitation: 'La balle donne le tempo.',
    copy: 'Fais rouler les poings, gauche puis droite. Accompagne le retour de la balle pour garder une série régulière.',
    timing: 'Frappe au repère', left: 'Main gauche', right: 'Main droite',
    commands: 'Alterne les mains. Appuie lorsque le point rejoint le petit repère doré : le poing part, puis le point est compté au contact avec la balle.',
  },
  rope: {
    title: 'Corde à danser', skill: 'Endurance max', invitation: 'Léger sur les appuis.',
    copy: 'Alterne les appuis, gauche puis droite. Saute au passage de la corde et garde les épaules détendues.',
    timing: 'Saute au repère', left: 'Appui gauche', right: 'Appui droit',
    commands: 'Alterne les appuis. Appuie lorsque le point rejoint le petit repère doré : le saut commence, puis le point est compté au passage de la corde sous les pieds.',
  },
};
const clock = seconds => `${Math.floor(Math.ceil(seconds) / 60)}:${String(Math.ceil(seconds) % 60).padStart(2, '0')}`;
const number = value => new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 }).format(value);
const clamp = value => Math.max(0, Math.min(1, value));

export class RhythmUI {
  constructor(activity, callbacks = {}) {
    this.activity = activity === 'rope' ? 'rope' : 'speedball';
    this.info = ACTIVITIES[this.activity];
    this.callbacks = {
      onStart: noop, onResume: noop, onPause: noop, onReturnGym: noop,
      onMute: noop, onAudioGesture: noop, ...callbacks,
    };
    this.root = document.getElementById('rhythm-ui');
    this.stage = document.getElementById('stage');
    this.phase = 'ready'; this.commandsOpen = false; this.reward = null;
    this.menuPointers = new Map(); this.abort = new AbortController();
    this.portrait = matchMedia(TOUCH_PORTRAIT_QUERY);
    this.controlsQuery = matchMedia(TOUCH_CONTROLS_QUERY);
    this.root.hidden = false;
    this.root.dataset.activity = this.activity;
    this.root.innerHTML = `
      <header class="rhythm-hud">
        <div class="rhythm-heading"><span class="rhythm-eyebrow">L’ATELIER DU GYM</span><h2>${this.info.title}</h2></div>
        <div class="rhythm-score"><div><strong class="rhythm-streak">0</strong><span>de suite</span></div><div><strong><b class="rhythm-accuracy">0</b><small>%</small></strong><span>précision</span></div></div>
        <div class="rhythm-clock"><span class="rhythm-eyebrow">SÉANCE</span><strong class="rhythm-time">0:45</strong></div>
      </header>
      <div class="rhythm-conductor" aria-hidden="true">
        <div class="rhythm-cue"><strong class="rhythm-cue-name">Gauche</strong></div>
        <div class="rhythm-track"><span class="rhythm-timing-window"></span><span class="rhythm-target"></span><i class="rhythm-beat-dot"></i></div>
      </div>
      <div class="rhythm-feedback" role="status" aria-live="polite"></div>
      <div class="rhythm-shade"></div>
      <section class="rhythm-panel" role="dialog" aria-modal="true" aria-labelledby="rhythm-title">
        <div class="rhythm-panel-content"><p class="rhythm-eyebrow">${this.info.skill.toUpperCase()}</p><h2 id="rhythm-title" class="rhythm-panel-title">${this.info.invitation}</h2><p class="rhythm-panel-copy">${this.info.copy}</p>
          <p class="rhythm-goal">20 bons temps · 60 % de précision</p>
          <div class="rhythm-results" hidden><dl><div><dt>Bons temps</dt><dd class="result-hits">0</dd></div><div><dt>Précision</dt><dd class="result-accuracy">0 %</dd></div><div><dt>Meilleure série</dt><dd class="result-streak">0</dd></div></dl><p class="rhythm-reward"></p><p class="rhythm-save-status"></p></div>
        </div>
        <div class="rhythm-actions"><button type="button" class="primary-button rhythm-primary">Commencer · 45 s →</button><button type="button" class="choose-session-button rhythm-restart" hidden>Recommencer la séance</button><button type="button" class="commands-open-button">Commandes</button><button type="button" class="rhythm-audio-button" aria-label="Activer ou couper le son" aria-pressed="false">♪ Son</button><button type="button" class="choose-session-button rhythm-return">← Retour au gym</button></div>
      </section>
      <section class="commands-panel rhythm-commands" role="dialog" aria-modal="true" aria-labelledby="rhythm-commands-title" hidden>
        <p class="commands-eyebrow">SÉANCE ARRÊTÉE</p><h2 id="rhythm-commands-title">Commandes · ${this.info.title}</h2>
        <div class="commands-grid"><dl>
          <div><dt>${this.info.left} / ${this.info.right.toLowerCase()}</dt><dd class="rhythm-command-actions">J / K</dd></div>
          <div><dt>Menu pause</dt><dd class="rhythm-command-pause">P / Échap</dd></div>
          <div><dt>Choisir · valider · revenir</dt><dd class="rhythm-command-menu">WASD · E · P / Échap</dd></div>
        </dl><div class="commands-notes"><p>${this.info.commands}</p><p>Relâche entre deux actions : maintenir une touche ne répète pas le mouvement.</p><p class="rhythm-command-sound">Le son se règle dans le menu. Le bouton « ← Gym » quitte directement l’atelier.</p></div></div>
        <button type="button" class="commands-back-button">← Retour au menu</button>
      </section>
      <button type="button" class="rhythm-pause-button" aria-label="Menu pause">☰</button>
      <div class="rhythm-attacks"><button type="button" class="control-button attack-control" data-action="jab" data-move-label="Gauche"><span class="control-key">A</span><span class="control-label">Gauche</span></button><button type="button" class="control-button attack-control" data-action="cross" data-move-label="Droite"><span class="control-key">B</span><span class="control-label">Droite</span></button></div>`;
    mountSideControls(this.root, { right: ['.rhythm-pause-button', '.rhythm-attacks'] });
    this.el = {};
    for (const element of this.root.querySelectorAll('[class]')) {
      for (const name of element.classList) if (!this.el[name]) this.el[name] = element;
    }
    this.bind();
    this.controls = installConsoleControls(this, this.activity);
    this.controls.pad.setAttribute('aria-label', 'Joypad : navigation des menus');
    this.stage.inert = this.portrait.matches;
    this.updateCommandLabels();
    if (callbacks.getState) this.update(callbacks.getState());
  }

  on(target, type, fn, options = {}) { target.addEventListener(type, fn, { ...options, signal: this.abort.signal }); }
  text(name, value) { const element = this.el[name]; if (element.textContent !== String(value)) element.textContent = value; }
  activate(name, fn) {
    const button = this.el[name];
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
    this.activate('rhythm-primary', () => this.phase === 'paused' ? this.callbacks.onResume() : this.callbacks.onStart());
    this.activate('rhythm-restart', () => this.callbacks.onStart());
    this.activate('rhythm-return', () => this.callbacks.onReturnGym());
    this.activate('rhythm-audio-button', () => this.callbacks.onMute());
    this.activate('commands-open-button', () => this.showCommands(true));
    this.activate('commands-back-button', () => this.showCommands(false));
    const blur = () => { this.clear(); this.callbacks.onPause(); };
    this.on(window, 'blur', blur);
    this.on(document, 'visibilitychange', () => { if (document.hidden) blur(); });
    this.on(this.controlsQuery, 'change', () => { this.updateCommandLabels(); blur(); });
    this.on(this.portrait, 'change', event => { this.stage.inert = event.matches; if (event.matches) blur(); });
  }
  clear() { this.controls?.clear(); this.menuPointers.clear(); }
  canPlay() { return this.phase === 'running' && !this.commandsOpen; }
  updateCommandLabels() {
    const touch = this.controlsQuery.matches;
    this.text('rhythm-command-actions', touch ? 'A / B' : 'J / K');
    this.text('rhythm-command-pause', touch ? 'Bouton ☰' : 'P / Échap');
    this.text('rhythm-command-menu', touch ? 'Joypad · A · B' : 'WASD · E · P / Échap');
    this.text('rhythm-command-sound', touch ? 'Le son se règle dans le menu. Le bouton « ← Gym » quitte directement l’atelier.' : 'Le son se règle dans le menu. Le bouton « ← Gym » quitte directement l’atelier.');
  }
  showCommands(open) {
    if (this.phase === 'running') return;
    this.clear(); this.commandsOpen = open;
    this.el['rhythm-panel'].hidden = open;
    this.el['commands-panel'].hidden = !open;
    this.el[open ? 'commands-back-button' : 'commands-open-button'].focus({ preventScroll: true });
    this.controls?.refresh();
  }
  setAudioState(audio) {
    const button = this.el['rhythm-audio-button'];
    button.disabled = !audio.available;
    this.text('rhythm-audio-button', !audio.available ? 'Son indisponible' : audio.muted ? '♪ Muet' : '♪ Son');
    button.setAttribute('aria-pressed', String(Boolean(audio.muted)));
  }
  setReward(reward) {
    this.reward = reward;
    if (!reward) { this.text('rhythm-reward', ''); this.text('rhythm-save-status', ''); return; }
    const percent = reward.stat === 'recovery';
    const format = value => percent ? `${number(value * 100)} %` : number(value);
    const total = value => percent ? `+${number((value - 1) * 100)} %` : number(value);
    const gain = reward.gained ? `${reward.label} +${format(reward.gained)} · ${total(reward.value)} / ${total(reward.cap)}`
      : reward.capped && reward.qualified ? `${reward.label} : plafond atteint · ${total(reward.cap)}`
        : 'Aucun gain cette fois. Le prochain essai compte aussi.';
    this.text('rhythm-reward', gain);
    this.text('rhythm-save-status', reward.saveMessage ?? (reward.saved === false ? 'Sauvegarde locale indisponible : exporte ta progression depuis le gym.' : 'Progression sauvegardée sur cet appareil.'));
  }
  update(state) {
    const changed = this.phase !== state.phase || !this.initialized;
    this.phase = state.phase; this.initialized = true; this.root.dataset.phase = state.phase;
    const running = state.phase === 'running';
    if (changed) {
      this.clear(); this.commandsOpen = false;
      this.el['commands-panel'].hidden = true;
      this.el['rhythm-panel'].hidden = running;
      this.el['rhythm-shade'].hidden = running;
      this.el['rhythm-results'].hidden = state.phase !== 'finished';
      this.el['rhythm-restart'].hidden = state.phase !== 'paused';
      this.el['rhythm-goal'].hidden = state.phase !== 'ready';
      if (state.phase === 'ready' || state.phase === 'running') this.setReward(null);
      if (state.phase === 'paused' && !this.portrait.matches) this.el['rhythm-primary'].focus({ preventScroll: true });
      if (running && this.root.contains(document.activeElement)) document.activeElement.blur();
    }
    this.text('rhythm-time', clock(state.remaining));
    this.text('rhythm-streak', state.stats.streak);
    const attempts = state.stats.hits + state.stats.wrong + state.stats.missed + state.stats.early + state.stats.late;
    this.text('rhythm-accuracy', attempts ? Math.round(100 * state.stats.hits / attempts) : 0);
    const complete = state.beat.phase === 'complete';
    this.el['rhythm-conductor'].hidden = complete;
    const inputAt = state.beat.inputAt ?? state.beat.targetAt ?? state.elapsed;
    const offset = state.elapsed - inputAt;
    const progress = clamp(.5 + offset / (state.rules.interval * 2));
    const now = Math.abs(offset) <= state.rules.tolerance;
    const left = state.beat.expected === 'jab';
    this.text('rhythm-cue-name', left ? 'Gauche' : 'Droite');
    this.el['rhythm-conductor'].dataset.now = String(now);
    this.el['rhythm-conductor'].dataset.hand = left ? 'left' : 'right';
    this.el['rhythm-track'].style.setProperty('--beat', progress);
    this.el['rhythm-track'].style.setProperty('--window', `${100 * clamp(state.rules.tolerance / state.rules.interval)}%`);
    this.text('rhythm-feedback', state.feedback.text);
    this.el['rhythm-feedback'].dataset.tone = state.feedback.tone;
    if (state.phase === 'paused') {
      this.text('rhythm-panel-title', 'Une petite pause.');
      this.text('rhythm-panel-copy', 'Le rythme est arrêté. Reprends la séance quand tu es prêt.');
      this.text('rhythm-primary', 'Reprendre →');
    } else if (state.phase === 'finished' && state.summary) {
      const summary = state.summary;
      this.text('rhythm-panel-title', summary.qualified ? 'Le rythme est là.' : 'On garde le rythme.');
      this.text('rhythm-panel-copy', summary.qualified ? 'Bonne séance. Retrouve ces sensations au prochain entraînement.' : `Vise ${state.rules.minimumHits ?? 20} bons temps avec 60 % de précision. Prends le temps d’observer avant d’appuyer.`);
      this.text('rhythm-primary', 'Refaire la séance →');
      this.text('result-hits', summary.hits);
      this.text('result-accuracy', `${summary.accuracy} %`);
      this.text('result-streak', summary.bestStreak);
    } else if (state.phase === 'ready') {
      this.text('rhythm-panel-title', this.info.invitation);
      this.text('rhythm-panel-copy', this.info.copy);
      this.text('rhythm-goal', `${state.rules.minimumHits ?? 20} bons temps · 60 % de précision`);
      const duration = state.duration ?? state.settings?.duration ?? state.remaining;
      this.text('rhythm-primary', `Commencer · ${number(duration)} s →`);
    }
    this.controls?.refresh();
  }
  destroy() {
    this.controls?.destroy(); this.menuPointers.clear(); this.abort.abort();
    this.stage.inert = false; this.root.hidden = true; this.root.replaceChildren();
  }
}
