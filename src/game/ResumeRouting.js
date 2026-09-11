// A career choice may arrive while Phaser is still loading the first scene.
// Keep that choice pending until a running scene can hand over safely; the old
// scene must not move or save its position in the meantime.
let pendingResume = false;

export const resumePending = () => pendingResume;
export const requestResume = () => { pendingResume = true; };
export const clearResume = () => { pendingResume = false; };
