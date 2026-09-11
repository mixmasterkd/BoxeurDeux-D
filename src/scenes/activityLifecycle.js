import { careerProfile } from '../game/CareerProfile.js';
import { careerMenuOpen } from '../ui/GameControls.js';

// A training session is not resumed halfway through after a browser reload.
// Direct scene links still save an appropriate, walkable place to return to.
export function rememberActivityReturn(scene, { fight = false } = {}) {
  if (careerMenuOpen()) return;
  const destination = fight ? 'neighborhood' : 'gym';
  if (careerProfile.snapshot().location.scene === destination) return;
  const state = fight ? { x: 1900, y: 562, facing: 'down' }
    : scene.registry.get('gym-world')?.state ?? { x: 640, y: 585, facing: 'up' };
  careerProfile.setLocation({ scene: destination, x: Math.round(state.x), y: Math.round(state.y), facing: state.facing });
}
