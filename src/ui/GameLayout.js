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
  const coarse = matchMedia('(any-pointer: coarse)');
  const abort = new AbortController();
  let touched = navigator.maxTouchPoints > 0;
  const updateTouch = () => { root.dataset.touch = String(touched || coarse.matches); };
  updateTouch();
  coarse.addEventListener('change', updateTouch, { signal: abort.signal });
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !touched) { touched = true; updateTouch(); }
  }, { signal: abort.signal });
  const observer = new ResizeObserver(() => {
    const rect = area.getBoundingClientRect();
    stage.style.setProperty('--play-width', `${rect.width}px`);
    stage.style.setProperty('--play-height', `${rect.height}px`);
  });
  observer.observe(area);
  return () => { abort.abort(); observer.disconnect(); };
}
