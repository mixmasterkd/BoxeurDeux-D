import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
let modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
if (!modulePath) {
  try { modulePath = require.resolve('playwright'); }
  catch { modulePath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'); }
}
export const { chromium } = await import(pathToFileURL(modulePath));
export const wait = (page, predicate, arg, timeout = 10000) => page.waitForFunction(predicate, arg, { timeout });
// Parallel development can update an unrelated scene while a route is being
// tested. Keep that browser's loaded version stable; production has no HMR.
export async function suppressHotReload(context) {
  await context.routeWebSocket('**', socket => {
    const server = socket.connectToServer();
    server.onMessage(message => {
      if (typeof message === 'string' && /"type":"(?:update|full-reload)"/.test(message)) return;
      socket.send(message);
    });
  });
}
export const directions = { up: [0,-1], down:[0,1], left:[-1,0], right:[1,0], upRight:[.707,-.707], downRight:[.707,.707], center:[0,0] };
export async function joyPoint(page, root, direction, id=1) {
  const r = await page.locator(`${root} .joypad`).boundingBox();
  if (!r) throw new Error(`Joypad absent: ${root}`);
  const [x,y] = directions[direction];
  return { id, x:r.x+r.width/2+x*r.width*.35, y:r.y+r.height/2+y*r.height*.35 };
}
export async function buttonPoint(page, selector, id=2) {
  const r = await page.locator(selector).boundingBox();
  if (!r) throw new Error(`Button absent: ${selector}`);
  return { id, x:r.x+r.width/2, y:r.y+r.height/2 };
}
export const dispatch = (cdp,type,points=[]) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
export async function tapContact(page, cdp, selector, held=[]) {
  const point = await buttonPoint(page,selector);
  await dispatch(cdp,'touchStart',[...held,point]);
  await dispatch(cdp,'touchEnd',[point]);
}
export async function fit(page, root, mobile, menu=false) {
  return page.evaluate(({root,mobile,menu})=>{
    const canvas=document.querySelector('canvas');
    const c=canvas.getBoundingClientRect();
    const visible=e=>Boolean(e.getClientRects().length)&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
    const controls=[...document.querySelectorAll(`${root} .input-rail button, ${root} .joypad`)].filter(visible).map(e=>{
      const r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label')||e.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,
        outside:r.right<=c.left+1||r.left>=c.right-1, fits:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};
    });
    return { mobile,menu,width:canvas.width,height:canvas.height,ratio:c.width/c.height,
      noScroll:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight,
      fits:c.left>=-1&&c.top>=-1&&c.right<=innerWidth+1&&c.bottom<=innerHeight+1,controls,
      primaryFine:matchMedia('(pointer: fine)').matches,touchPoints:navigator.maxTouchPoints };
  },{root,mobile,menu});
}
