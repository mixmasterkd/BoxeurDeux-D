import Phaser from 'phaser';
import { SparringSession, TIMINGS } from '../game/SparringSession.js';
import { SparringUI } from '../ui/SparringUI.js';
import { FighterView, drawImpact } from './FighterView.js';
import { SparringAudio } from '../audio/SparringAudio.js';
import { setSceneShell } from '../ui/SceneShell.js';
import { careerProfile } from '../game/CareerProfile.js';
import { DailyActivityGate, sparringActivity } from '../game/DailyActivityGate.js';
import { DailyActivityNotice } from '../ui/DailyActivityNotice.js';
import { rememberActivityReturn } from './activityLifecycle.js';
import { getOpponentProfile } from '../game/OpponentProfiles.js';

const FEEDBACK = {
  'player-hit': ['Touché !', 'success'],
  'player-blocked': ['Rémi bloque', 'block'],
  'player-missed': ['Dans le vide', 'neutral'],
  'remi-hit': ['Coup reçu', 'danger'],
  'remi-blocked': ['Bien bloqué', 'block'],
  'remi-dodged': ['Belle esquive !', 'success'],
  exhausted: ['Soufflez… relâchez la garde', 'danger'],
};

export class SparringScene extends Phaser.Scene {
  constructor() {
    super('SparringScene');
  }

  init(data = {}) {
    const query = new URLSearchParams(window.location.search);
    const requested = data.opponent ?? query.get('opponent') ?? (query.get('scene') === 'fight' ? 'beton' : 'remi');
    this.profile = getOpponentProfile(requested);
    this.opponentId = this.profile.id;
    // Tournament identity determines its uniform, result route and hotel return;
    // an URL option must never turn a bracket opponent into a standalone bout.
    this.tournament = Boolean(this.profile.tournament);
    this.matchId = data.matchId ?? (this.tournament ? careerProfile.tournamentStatus().currentMatchId : null);
    this.initialLesson = this.profile.official ? 'resistance' : data.lesson ?? query.get('lesson') ?? 'free';
    this.backgroundKey = this.profile.official ? 'fight-hall' : 'gym';
    this.returnToNeighborhood = this.profile.official && !this.tournament;
  }

  preload() {
    this.load.image(this.backgroundKey, `${import.meta.env.BASE_URL}assets/backgrounds/${this.backgroundKey}.png`);
    FighterView.preload(this, { opponent: this.opponentId, tournament: this.tournament });
  }

  create(data = {}) {
    setSceneShell('sparring', { opponent: this.opponentId, tournament: this.tournament });
    if (!this.tournament) rememberActivityReturn(this, { fight: this.returnToNeighborhood });
    this.session = new SparringSession({ lesson: this.initialLesson, opponent: this.opponentId, tournament: this.tournament, ...careerProfile.bonuses() });
    this.dailyGate = new DailyActivityGate({ profile: careerProfile, getState: () => this.session.state, activity: () => sparringActivity(this.session.state.settings) });
    this.progressRecorded = false;
    this.audio = new SparringAudio();
    const background = this.add.image(640, 360, this.backgroundKey);
    background.setScale(Math.min(1280 / background.width, 720 / background.height));
    // Fixed framing also contains the forward footwork of close exchanges.
    // Keep combat coordinates local so contact landmarks and marks stay aligned.
    this.fighterLayer = this.add.container(640 * (1 - .88), 0).setScale(.88).setDepth(1);
    this.remi = new FighterView(this, 'remi', 640, 592, 390, { opponent: this.opponentId });
    this.player = new FighterView(this, 'player', 640, 718, 390, { tournament: this.tournament });
    this.fighterLayer.add([this.remi.shadow, this.remi.sprite, this.player.shadow, this.player.sprite]);
    this.player.target = this.remi.point('guard', 'head');
    this.remi.target = this.player.point('guard', 'head');
    this.cue = this.add.graphics().setDepth(12);
    this.ui = new SparringUI({
      onAction: (action) => this.session.act(action),
      onGuard: (held, level) => this.session.setGuard(held, level),
      onStart: (settings) => this.beginSession(settings),
      onPause: () => { this.session.pause(); this.audio.setActive(false); },
      onResume: () => { this.session.resume(); this.audio.setActive(true); },
      onRestart: (settings) => this.beginSession(settings),
      onNextRound: () => {
        this.session.releaseControls();
        if (this.session.nextRound()) { this.audio.setActive(true); this.audio.play('round-start'); }
      },
      onChooseLesson: () => { this.session.reset(); this.audio.setActive(false); },
      onReturnGym: () => this.returnToPlace(),
      onSettings: (settings) => {
        this.session.setSettings(settings);
        if (this.session.state.phase === 'ready') this.audio.setActive(false);
      },
      onBlur: () => { this.session.pause(); this.session.releaseControls(); this.audio.setActive(false); },
      onAudioGesture: () => this.audio.unlock(),
      onAudioSettings: ({ muted, volume }) => {
        this.audio.setMuted(muted);
        this.audio.setVolume(volume);
        this.audio.unlock();
        this.ui.setAudioState(this.audio.getState());
      },
    });
    this.dailyNotice = new DailyActivityNotice({ root: this.ui.root, gate: this.dailyGate, panel: '.panel-actions', primary: '.primary-button', restarts: ['.secondary-button', '.next-lesson-button'] });
    this.ui.elements['panel-copy'].after(this.dailyNotice.note);
    this.dailyNotice.update(this.session.state);
    this.signal = this.ui.root.querySelector('.fight-signal');
    this.accessNote = document.createElement('p'); this.accessNote.className = 'fight-access-note';
    this.accessNote.hidden = true; this.ui.elements['panel-copy'].after(this.accessNote);
    if (this.returnToNeighborhood || this.tournament) {
      this.ui.root.querySelector('.return-gym-button').textContent = this.tournament ? '← Retour à la salle' : '← Retour au quartier';
      const exit = this.ui.controls.exit;
      exit.textContent = this.tournament ? '← Salle' : '← Quartier'; exit.setAttribute('aria-label', this.tournament ? 'Quitter le ring et retourner à la salle' : 'Quitter le combat et retourner au quartier');
    }
    this.ui.setAudioState(this.audio.getState());
    this.remi.render(this.session.state.remi, 0);
    this.player.render(this.session.state.player, 0);
    this.ui.update(this.session.state);
    this.resizeObserver = new ResizeObserver(() => {
      // Phaser refresh computes display size before its final bounds read.
      // Read the resized parent first, including a change of primary pointer.
      this.scale.getParentBounds(); this.scale.refresh();
    });
    this.resizeObserver.observe(document.getElementById('game'));
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      this.events.off('shutdown', cleanup);
      this.events.off('destroy', cleanup);
      this.ui.destroy();
      this.audio.dispose();
      this.resizeObserver.disconnect();
      if (import.meta.env.DEV && window.__sparring?.scene === this) delete window.__sparring;
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
    if (import.meta.env.DEV) {
      window.__sparring = { session: this.session, scene: this, ui: this.ui, audio: this.audio, impacts: [] };
    }
  }

  beginSession(settings) {
    if (this.tournament && this.session.state.phase === 'finished' && this.session.state.bout.result?.winner !== 'draw') {
      this.returnToPlace(); return { ok: true };
    }
    if (this.profile.official && !careerProfile.canFight(this.opponentId).ok) return { ok: false, reason: 'locked' };
    if (this.tournament) this.matchId = careerProfile.tournamentStatus().currentMatchId;
    return this.dailyGate.start(() => {
      this.audio.setActive(false);
      this.progressRecorded = false;
      this.ui.boutHUD.setReward(null);
      this.session.reset({ ...settings, ...careerProfile.bonuses() });
      this.session.start();
      this.audio.setActive(true);
      this.audio.play('round-start');
    }, sparringActivity({ ...this.session.state.settings, ...settings }));
  }

  returnToPlace() {
    this.session.pause(); this.session.releaseControls(); this.audio.setActive(false);
    if (this.tournament) this.scene.start('HotelScene', { place: 'hotel-venue' });
    else if (this.returnToNeighborhood) this.scene.start('ExplorationScene', { place: 'neighborhood', entrance: 'fight' });
    else this.scene.start('GymScene');
  }

  update(_time, delta) {
    if (!this.session) return;
    // The count must follow active real seconds, including a slow frame. The
    // session subdivides its boundaries; blur/portrait explicitly pause it.
    this.session.update(this.session.state.phase === 'knockdown' ? (this.game.loop.rawDelta ?? delta) / 1000 : Math.min(delta / 1000, .05));
    const state = this.session.state;
    this.fighterLayer.setVisible(!(this.profile.official && state.phase === 'between'));
    // Rémi commits to the promised height; moving out of that aim is a dodge.
    this.remi.target = this.player.point('guard', state.remi.target ?? 'head');
    this.remi.render(state.remi, state.elapsed, state.bout);
    const target = state.player.target ?? 'head';
    this.player.target = state.remi.action === 'hit'
      ? this.remi.point('guard', target)
      : this.remi.point(this.remi.pose, target, true);
    if (state.remi.action === 'guard' && target === 'head' && state.remi.guardLevel !== 'body') this.player.target.y += 20;
    this.player.render(state.player, state.elapsed, state.bout);
    this.renderCue(state);
    for (const event of this.session.drainEvents()) {
      if (event.type === 'bout-finish' && !this.progressRecorded) {
        this.progressRecorded = true;
        if (this.tournament) {
          if (event.result.winner !== 'draw') {
            this.recordResult = careerProfile.recordTournamentFight({ ...event.result, opponent: this.opponentId, score: state.bout?.score?.player, matchId: this.matchId });
          }
        } else if (this.profile.official) careerProfile.recordFight({ ...event.result, opponent: this.opponentId, score: state.bout?.score?.player });
        else this.ui.boutHUD.setReward(careerProfile.reward('sparring', {
          completed: true, rounds: event.round, actions: state.stats.landed + state.stats.blocked + state.stats.dodged,
        }));
      }
      // The model emits impacts on the frame where the glove makes contact.
      // End cues finish naturally on the report; there is no ambient sound loop.
      if (event.type !== 'round-start') this.audio.play(event.type);
      const message = event.type === 'player-blocked' && this.profile.official ? [`${this.profile.shortName} bloque`, 'block'] : FEEDBACK[event.type];
      if (event.type === 'player-hit' && event.attack === 'hook') {
        this.ui.showFeedback(event.combo ? 'Combo réussi !' : `Crochet gauche${event.target === 'body' ? ' au corps' : ''} !`, 'success');
      } else if (event.type === 'player-hit' && event.target === 'body') {
        this.ui.showFeedback('Touché au corps !', 'success');
      } else if (event.type === 'remi-hit' && event.target === 'body') {
        this.ui.showFeedback('Coup au corps reçu', 'danger');
      } else if (message) this.ui.showFeedback(...message);
      if (event.type.startsWith('player-') || event.type.startsWith('remi-')) {
        const striker = event.type.startsWith('player-') ? this.player : this.remi;
        const { x, y } = striker.contact();
        this.fighterLayer.add(drawImpact(this, event, x, y));
        if (import.meta.env.DEV) {
          const log = window.__sparring.impacts;
          log.push({ ...event, x, y, contactPoint: { x, y }, targetPoint: { ...(striker.attackAim ?? striker.target) }, playerProgress: state.player.progress, remiProgress: state.remi.progress, playerTexture: this.player.sprite.texture.key, remiTexture: this.remi.sprite.texture.key });
          if (log.length > 100) log.shift();
        }
      }
    }
    this.ui.update(state);
    this.dailyNotice.update(state);
    this.dailyNotice.note.hidden = this.tournament && !['ready', 'paused'].includes(state.phase);
    const access = this.profile.official ? careerProfile.canFight(this.opponentId) : { ok: true };
    this.accessNote.hidden = state.phase !== 'ready' || access.ok;
    if (!this.accessNote.hidden) {
      this.accessNote.textContent = access.message;
      this.ui.elements['primary-button'].disabled = true;
    }
    if (this.tournament) {
      this.dailyNotice.note.textContent = 'Gants de bronze · Combat compris dans votre inscription. Tenue bleue de compétition.';
    }
  }

  renderCue(state) {
    this.cue.clear();
    if (state.phase !== 'running') { this.signal.hidden = true; return; }
    const { action, progress, safeDodge } = state.remi;
    const telegraph = action === 'tellLeft' || action === 'tellRight';
    const punching = action === 'jab' || action === 'cross';
    const opened = action === 'open' || (action === 'hit' && state.combo?.ready);
    this.signal.hidden = !(telegraph || punching || opened);
    if (telegraph || punching) {
      const right = safeDodge === 'dodgeRight';
      const timing = TIMINGS.remi[right ? 'jab' : 'cross'];
      const untilContact = telegraph
        ? state.remi.duration * (1 - progress) + timing.duration * timing.impact
        : state.remi.duration * (timing.impact - progress);
      const instruction = untilContact > .4 ? 'PRÉPAREZ' : 'ESQUIVEZ';
      const height = state.remi.target === 'body' ? 'CORPS · GARDE BASSE' : 'TÊTE · GARDE HAUTE';
      const label = state.training?.id === 'counter'
        ? right ? `${instruction} À DROITE  →` : `←  ${instruction} À GAUCHE`
        : height;
      this.signal.textContent = label;
      this.signal.dataset.tone = 'tell';
      if (untilContact < 0) { this.signal.hidden = true; return; }
      const x = right ? 500 : 780;
      const y = state.remi.target === 'body' ? 390 : 300;
      this.cue.lineStyle(5, 0xffd18a, .65 + progress * .35);
      this.cue.strokeCircle(x, y, 22 + (1 - progress) * 12);
      this.cue.fillStyle(0xffdc8a, 1).fillTriangle(x - 5, y - 8, x + 5, y - 8, x, y + 6);
    } else if (opened) {
      const label = state.training?.id === 'guard' ? 'RELÂCHEZ · SOUFFLEZ'
        : state.training?.id === 'jab' ? 'OUVERTURE · UN JAB !'
          : state.combo?.ready ? 'OUVERTURE · CROCHET PRÊT !' : 'OUVERTURE · À VOUS !';
      this.signal.textContent = label;
      this.signal.dataset.tone = 'open';
    }
  }
}
