import { MUSIC_PLACES } from '../audio/MusicPlaces.js';
import { MUSIC_TRACKS } from '../audio/MusicScores.js';
import './music.css';

/** These native controls join GameControls' existing arrows / A / B navigation. */
export class MusicControls {
  constructor(ui, music, onChange = () => {}) {
    this.ui = ui; this.music = music; this.onChange = onChange;
    this.abort = new AbortController();
    this.host = ui.root.querySelector('.gym-pause-panel .snes-choices, .panel-options, .bag-panel-actions, .shadow-panel-actions, .rhythm-actions');
    this.element = document.createElement('fieldset');
    this.element.className = 'music-controls'; this.element.hidden = true;
    this.element.innerHTML = `<legend>Musique</legend>
      <small class="music-track"></small>
      <button type="button" class="music-toggle" aria-pressed="false">Couper la musique</button>
      <label class="music-volume-label"><span>Volume <output class="music-volume-value">25 %</output></span>
        <input class="music-volume" type="range" min="0" max="100" step="5" value="25" aria-label="Volume de la musique">
      </label>`;
    this.toggle = this.element.querySelector('.music-toggle');
    this.volume = this.element.querySelector('.music-volume');
    this.value = this.element.querySelector('.music-volume-value');
    this.track = this.element.querySelector('.music-track');
    this.effectsButtons = [...ui.root.querySelectorAll('.audio-button, .bag-audio-button, .shadow-audio-button, .rhythm-audio-button')]
      .map(button => ({ button, label: button.querySelector('.audio-label') ?? button }));
    this.effectsVolume = ui.root.querySelector('#audio-volume');
    this.host?.classList.add('music-settings-host');
    this.host?.append(this.element);
    this.toggle.addEventListener('click', event => {
      this.music.setMuted(!this.music.getState().muted); this.onChange(event); this.refresh();
    }, { signal: this.abort.signal });
    this.volume.addEventListener('input', event => {
      this.music.setVolume(Number(this.volume.value) / 100); this.onChange(event); this.refresh();
    }, { signal: this.abort.signal });
    this.refresh();
  }

  refresh() {
    const { ui } = this;
    const hidden = !(ui.paused || ui.phase === 'paused' || ui.activityOptions?.isOpen);
    if (this.element.hidden !== hidden) this.element.hidden = hidden;
    const state = this.music.getState();
    const signature = [state.trackId, state.muted, state.volume, state.available].join('|');
    // MenuWindow observes this subtree: unchanged frames must not mutate the DOM.
    if (signature !== this.signature) {
      this.signature = signature;
      const title = MUSIC_PLACES[state.trackId] ?? '';
      this.element.dataset.track = state.trackId ?? '';
      this.track.textContent = MUSIC_TRACKS[state.trackId]?.title ?? (title ? `Thème · ${title}` : 'Bande-son originale');
      this.track.title = title;
      this.toggle.textContent = !state.available ? 'Musique indisponible' : state.muted ? 'Activer la musique' : 'Couper la musique';
      this.toggle.setAttribute('aria-pressed', String(state.muted));
      this.toggle.disabled = this.volume.disabled = !state.available;
      const percent = Math.round(state.volume * 100);
      this.volume.value = percent; this.value.value = `${percent} %`;
      this.volume.setAttribute('aria-valuetext', `${percent} pour cent`);
    }
    // Existing sound controls keep their own settings, callbacks and persistence.
    for (const { button, label } of this.effectsButtons) {
      const text = label.textContent.replace(/Son/g, 'Effets').replace(/Muet/g, 'Effets coupés');
      if (text !== label.textContent) label.textContent = text;
      for (const name of ['aria-label', 'title']) {
        const aria = button.getAttribute(name);
        if (aria?.includes('le son')) button.setAttribute(name, aria.replace('le son', 'les effets sonores'));
      }
    }
    if (this.effectsVolume && this.effectsVolume.getAttribute('aria-label') !== 'Volume des effets sonores') {
      this.effectsVolume.setAttribute('aria-label', 'Volume des effets sonores');
    }
  }

  destroy() {
    this.abort.abort(); this.element.remove(); this.host?.classList.remove('music-settings-host');
  }
}
