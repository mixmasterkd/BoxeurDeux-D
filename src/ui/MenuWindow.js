/** Menu layout helpers deliberately preserve the original controls and their
 * listeners. Each column scrolls inside the camera, never the page. */
export function splitMenu(panel, { reading, actions }) {
  const copy = document.createElement('div');
  copy.className = 'snes-reading';
  const choices = document.createElement('div');
  choices.className = 'snes-choices';
  for (const selector of reading) for (const element of panel.querySelectorAll(selector)) copy.append(element);
  for (const selector of actions) for (const element of panel.querySelectorAll(selector)) choices.append(element);
  panel.append(copy, choices);
  panel.classList.add('snes-split');
  return { copy, choices };
}

export function prepareCommandWindows(root) {
  for (const panel of root.querySelectorAll('.commands-panel')) {
    if (panel.querySelector('.snes-reading')) continue;
    const reading = document.createElement('div'); reading.className = 'snes-reading';
    const guide = document.createElement('p'); guide.className = 'commands-menu-tip';
    guide.innerHTML = '<span class="commands-desktop-only">Menus : WASD pour choisir, E pour confirmer, P ou Échap pour revenir.</span><span class="commands-touch-only">Menus : joypad pour choisir, A pour confirmer, B pour revenir.</span>';
    reading.append(guide);
    for (const child of [...panel.children]) if (!child.matches('.commands-back-button')) reading.append(child);
    panel.prepend(reading);
    panel.classList.add('snes-command-window');
  }
}

/** Indicate that a small SNES window contains another line/choice, even on
 * phones that hide their native scrollbars. The cue never accepts input. */
export function installMenuScrollCues(root) {
  let frame = 0;
  const refresh = () => {
    frame = 0;
    for (const panel of root.querySelectorAll('section')) {
      if (!panel.getClientRects().length || panel.closest('[hidden]')) continue;
      const overflow = [...panel.querySelectorAll('.snes-reading, .snes-choices, .gym-dialog-copy, .gym-dialog-actions, .panel-scroll, .bag-panel-content, .bag-panel-actions, .shadow-panel-intro, .shadow-panel-actions, .rhythm-panel-content, .rhythm-actions')]
        .some(column => column.scrollHeight > column.clientHeight + 3);
      panel.classList.toggle('snes-scrollable', overflow);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
  const changes = new MutationObserver(schedule);
  changes.observe(root, { childList: true, subtree: true, characterData: true });
  const resize = new ResizeObserver(schedule); resize.observe(root);
  schedule();
  return () => { changes.disconnect(); resize.disconnect(); if (frame) cancelAnimationFrame(frame); };
}
