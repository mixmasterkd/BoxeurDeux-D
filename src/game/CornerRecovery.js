/** Nine active seconds: one alternating breath every second. No mash bonus. */
export const CORNER_RULES = Object.freeze({ duration: 9, firstBeat: 1, beats: 8, window: .23, baseline: 20, maxBonus: 8 });
export function createCornerRecovery(coach = 'Fredo') {
  return { elapsed: 0, duration: CORNER_RULES.duration, hits: 0, bonus: 0, completed: false, attempted: [], feedback: `Suivez le souffle de ${coach}.` };
}
export function cornerBeat(corner) {
  const index = Math.max(0, Math.min(CORNER_RULES.beats - 1, Math.round(corner.elapsed - CORNER_RULES.firstBeat)));
  const time = CORNER_RULES.firstBeat + index;
  return { index, time, action: index % 2 === 0 ? 'jab' : 'cross', ready: !corner.completed && !corner.attempted.includes(index) && Math.abs(corner.elapsed - time) <= CORNER_RULES.window };
}
export function pressCorner(corner, action) {
  if (!corner || corner.completed || !['jab', 'cross'].includes(action)) return false;
  const beat = cornerBeat(corner);
  // Early input consumes this beat too. Repeated presses cannot fish for its window.
  if (corner.attempted.includes(beat.index)) return false;
  corner.attempted.push(beat.index);
  const success = beat.ready && action === beat.action;
  if (success) { corner.hits++; corner.bonus = Math.min(CORNER_RULES.maxBonus, corner.hits); }
  corner.feedback = success ? 'Bien. Gardez ce rythme.' : 'Doucement. Attendez le prochain souffle.';
  return success;
}
