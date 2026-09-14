import { METRO_STATIONS, METRO_STATION_IDS, metroDirection, metroPlatformLocation } from './MetroNetwork.js';
export const TRAIN_TRAVEL_SECONDS = 4;
export const TRAIN_STOP_SECONDS = 8;
/** Stops never select an exit for the player. The world doorway calls disembark(). */
export class TrainSession {
  constructor({ station = METRO_STATION_IDS[0], direction = 1 } = {}) {
    const index = Math.max(0, METRO_STATION_IDS.indexOf(station));
    this.state = { index, direction: metroDirection(METRO_STATION_IDS[index], direction), phase: 'stopped', elapsed: 0, stops: 0, paused: false };
  }
  pause() { this.state.paused = true; }
  resume() { this.state.paused = false; }
  update(seconds) {
    if (this.state.paused || !Number.isFinite(seconds) || seconds <= 0) return [];
    // Discard time from stalled or hidden tabs; a frame cannot race through stations.
    let remaining = Math.min(seconds, 1); const events = [];
    while (remaining > 1e-9) {
      const state = this.state, duration = state.phase === 'stopped' ? TRAIN_STOP_SECONDS : TRAIN_TRAVEL_SECONDS;
      const used = Math.min(remaining, duration - state.elapsed);
      state.elapsed += used; remaining -= used;
      if (state.elapsed < duration - 1e-9) break;
      state.elapsed = 0;
      if (state.phase === 'stopped') { state.phase = 'moving'; events.push({ type: 'depart', station: this.station.id, next: this.nextStation.id }); }
      else {
        state.index += state.direction;
        state.direction = metroDirection(this.station.id, state.direction);
        state.phase = 'stopped'; state.stops++;
        events.push({ type: 'arrive', station: this.station.id, direction: state.direction });
      }
    }
    return events;
  }
  get station() { return METRO_STATIONS[this.state.index]; }
  get nextStation() { return METRO_STATIONS[this.state.index + this.state.direction]; }
  get doorsOpen() { return this.state.phase === 'stopped'; }
  get progress() { return this.state.elapsed / (this.doorsOpen ? TRAIN_STOP_SECONDS : TRAIN_TRAVEL_SECONDS); }
  disembark() { return this.doorsOpen && !this.state.paused ? metroPlatformLocation(this.station.id) : null; }
  resumeLocation() { return metroPlatformLocation(this.station.id); }
  snapshot() { return { ...this.state, station: this.station.id, next: this.nextStation.id, doorsOpen: this.doorsOpen, progress: this.progress }; }
}
