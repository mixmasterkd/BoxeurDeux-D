import Phaser from 'phaser';
import { RetroMusic } from './RetroMusic.js';
import { musicPlaybackForScene } from './MusicPlaces.js';
import { MusicControls } from '../ui/MusicControls.js';
import { TOUCH_PORTRAIT_QUERY } from '../ui/GameLayout.js';
import { careerMenuOpen } from '../ui/GameControls.js';
import { resumePending } from '../game/ResumeRouting.js';

/** One soundtrack survives scene changes; no scene owns an extra audio context. */
export function installGameMusic(game) {
  const abort = new AbortController();
  const portrait = matchMedia(TOUCH_PORTRAIT_QUERY);
  let music = new RetroMusic(), controls = null, currentScene = null;
  let disposed = false, pageHidden = false, blurred = false, gestureTask = false, gestureTimer = null, ducked = false;

  const sceneShutdown = () => { music?.setPaused(true); controls?.destroy(); controls = null; };
  function update() {
    if (disposed || pageHidden || !music) return;
    const scene = game.scene.getScenes(true)[0] ?? null;
    if (currentScene !== scene) {
      currentScene?.events?.off('shutdown', sceneShutdown);
      currentScene = scene;
      currentScene?.events?.on('shutdown', sceneShutdown);
    }
    const policy = musicPlaybackForScene(scene, {
      hidden: document.hidden, blurred, portrait: portrait.matches, careerMenu: careerMenuOpen(),
      loading: game.scene.scenes.some(candidate => candidate.sys.settings.status === Phaser.Scenes.LOADING),
      resumePending: resumePending(),
    });
    // Stop first when entering a blocked scene, including the frame of a preload.
    const state = music.getState();
    if (policy.paused && !state.paused) music.setPaused(true);
    if (policy.trackId && policy.trackId !== state.trackId) music.setTrack(policy.trackId);
    if (policy.ducked !== ducked) { ducked = policy.ducked; music.setDucked(ducked); }
    if (!policy.paused && state.paused) music.setPaused(false);
    if (controls && (controls.ui !== scene?.ui || !controls.element.isConnected)) { controls.destroy(); controls = null; }
    if (!controls && scene?.ui?.root && !scene.ui.destroyed) controls = new MusicControls(scene.ui, music, afterPreference);
    controls?.refresh();
  }
  function afterPreference(event) {
    update();
    // A menu choice may unmute on the same genuine key gesture that clicked it.
    if (!disposed && !pageHidden && (event.isTrusted || gestureTask)) music?.unlock();
  }
  function userGesture(event) {
    if (disposed || pageHidden || !event.isTrusted || event.repeat
      || (event.type === 'pointerdown' && event.button !== 0)) return;
    gestureTask = true;
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(() => { gestureTask = false; }, 0);
    update();
    music?.unlock();
  }
  const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: abort.signal });
  // Capture only observes the gesture, before a game control consumes it.
  on(window, 'pointerdown', userGesture, { capture: true });
  on(window, 'keydown', userGesture, { capture: true });
  on(window, 'blur', () => { blurred = true; update(); });
  on(window, 'focus', () => { blurred = false; update(); });
  on(document, 'visibilitychange', update);
  on(portrait, 'change', update);
  // On close, the router requests a scene resume later in this same event.
  // Let poststep finish that transition before considering playback again.
  on(window, 'career-menu-change', event => { if (event.detail.open) update(); });
  on(window, 'pagehide', () => {
    pageHidden = true; controls?.destroy(); controls = null; music?.dispose(); music = null;
  });
  on(window, 'pageshow', event => {
    if (!event.persisted || !pageHidden || disposed) return;
    pageHidden = false; music = new RetroMusic(); ducked = false; update();
  });
  game.events.on('poststep', update);
  function dispose() {
    if (disposed) return;
    disposed = true; abort.abort(); clearTimeout(gestureTimer);
    game.events.off('poststep', update); game.events.off('destroy', dispose);
    currentScene?.events?.off('shutdown', sceneShutdown);
    controls?.destroy(); controls = null; music?.dispose(); music = null;
  }
  game.events.once('destroy', dispose);
  update();
  return dispose;
}
