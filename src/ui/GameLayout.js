// Capability alone (maxTouchPoints / any-pointer) also matches mouse PCs.
export const TOUCH_CONTROLS_QUERY = '(pointer: coarse) and (hover: none)';
export const TOUCH_PORTRAIT_QUERY = `${TOUCH_CONTROLS_QUERY} and (max-width: 900px) and (orientation: portrait)`;

// One shared layout for every activity. Rails belong to the UI, outside the
// fixed 1280×720 canvas; existing buttons retain their pointer captures/events.
export function mountSideControls(root, { left = [], right = [] }) {
  for (const [side, selectors] of Object.entries({ left, right })) {
    const rail = document.createElement('div');
    rail.className = `input-rail rail-${side}`;
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (element) rail.append(element);
    }
    root.append(rail);
  }
}

export function installGameLayout() {
  const root = document.documentElement;
  const area = document.getElementById('play-area');
  const stage = document.getElementById('stage');
  const coarse = matchMedia(TOUCH_CONTROLS_QUERY);
  const abort = new AbortController();
  const updateTouch = () => { root.dataset.touch = String(coarse.matches); };
  updateTouch();
  coarse.addEventListener('change', updateTouch, { signal: abort.signal });
  const observer = new ResizeObserver(() => {
    const rect = area.getBoundingClientRect();
    stage.style.setProperty('--play-width', `${rect.width}px`);
    stage.style.setProperty('--play-height', `${rect.height}px`);
  });
  observer.observe(area);
  return () => { abort.abort(); observer.disconnect(); };
}
