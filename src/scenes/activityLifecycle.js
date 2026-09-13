import { careerProfile } from '../game/CareerProfile.js';
import { careerMenuOpen } from '../ui/GameControls.js';

// A training session is not resumed halfway through after a browser reload.
// Direct scene links still save an appropriate, walkable place to return to.
export function rememberActivityReturn(scene, { fight = false } = {}) {
  if (careerMenuOpen()) return;
  const profile = careerProfile.snapshot();
  if (profile.cuba?.active) {
    scene.activityReturn = { scene: 'CubaScene', place: fight ? 'cuba-beach' : 'cuba-gym', location: profile.location };
    return;
  }
  const destination = fight ? 'neighborhood' : 'gym';
  if (careerProfile.snapshot().location.scene === destination) return;
  const state = fight ? { x: 1900, y: 562, facing: 'down' }
    : scene.registry.get('gym-world')?.state ?? { x: 640, y: 585, facing: 'up' };
  careerProfile.setLocation({ scene: destination, x: Math.round(state.x), y: Math.round(state.y), facing: state.facing });
}

export function returnFromActivity(scene) {
  const profile = careerProfile.snapshot();
  if (profile.cuba?.active) {
    const saved = profile.location;
    scene.scene.start('CubaScene', { place: saved.scene.startsWith('cuba-') ? saved.scene : 'cuba-gym', location: saved.scene.startsWith('cuba-') ? saved : undefined });
  } else scene.scene.start('GymScene');
}
