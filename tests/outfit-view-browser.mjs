import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from './control-helpers.mjs';

// Isolated local renderer proof: serve the actual repository modules/assets by
// request interception, without starting or depending on another Vite server.
const base = 'http://outfit.local/';
const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('requestfailed', request => errors.push(`${request.url()} ${request.failure()?.errorText}`));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
await page.route('http://outfit.local/**', async route => {
  const pathname = new URL(route.request().url()).pathname;
  const filename = path.resolve(root, '.' + (pathname.startsWith('/assets/') ? '/public' : '') + pathname);
  if (!filename.startsWith(root + path.sep)) return route.abort();
  const type = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.json') ? 'application/json' : 'text/javascript';
  try { await route.fulfill({ contentType: type, body: await fs.readFile(filename) }); }
  catch { await route.fulfill({ status: 404, body: 'Unknown local fixture resource' }); }
});
await page.route('**/__outfit-preview', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#10232b}canvas{display:block}</style></head><body><script type="module">
import Phaser from '/node_modules/phaser/dist/phaser.esm.js';
import { preloadOutfits, streetTexture, boxingTexture } from '/src/scenes/OutfitView.js';
class Gallery extends Phaser.Scene {
  preload() {
    this.load.on('progress',value=>window.outfitLoadProgress=value);
    preloadOutfits(this,{street:true,boxing:true});
    this.load.image('preview-boxer','/assets/sprites/sparring-v2/player-guard.png');
  }
  create() {
    const text=(x,y,value,size=22)=>this.add.text(x,y,value,{fontFamily:'sans-serif',fontSize:size+'px',color:'#edf1df'}).setOrigin(.5,0);
    text(640,24,'TENUES · LA TUQUE ROUGE RESTE TA SIGNATURE',27);
    const ids=['street-blue','street-burgundy','boxing-emerald','boxing-burgundy'];
    const names=['Survêtement bleu','Survêtement bordeaux','Boxe émeraude','Boxe bordeaux et or'];
    const keys=[];
    ids.forEach((id,index)=>{
      const profile={inventory:{equipped:{street:id,boxing:id}}};
      const slot=id.startsWith('street')?'street':'boxing';
      const lookup=slot==='street'?streetTexture:boxingTexture;
      const x=170+index*310;
      text(x,77,names[index],19);
      for(const [pose,y,scale] of [['down-0',292,1.8],['right-1',452,1.4]]){
        const key=lookup(this,'hotel-player-'+pose,profile);keys.push(key);
        this.add.image(x,y,key).setOrigin(.5,104/112).setScale(scale);
      }
    });
    text(640,495,'DANS LE RING · DESSINS ET CONTACTS CONSERVÉS',25);
    const skins=['boxing-blue','boxing-emerald','boxing-burgundy'];
    skins.forEach((id,index)=>{
      const profile={inventory:{equipped:{boxing:id}}};
      const key=boxingTexture(this,'preview-boxer',profile);keys.push(key);
      text(250+index*390,543,['Bleu du gym','Émeraude','Bordeaux'][index],20);
      this.add.image(250+index*390,943,key).setOrigin(.5,624/640).setScale(.68);
    });
    const profile={inventory:{equipped:{boxing:'boxing-emerald'}}};
    window.outfitProof={keys,cacheStable:boxingTexture(this,'preview-boxer',profile)===boxingTexture(this,'preview-boxer',profile),official:boxingTexture(this,'preview-boxer',profile,{official:true})};
  }
}
window.outfitGame=new Phaser.Game({type:Phaser.AUTO,width:1280,height:960,backgroundColor:'#10232b',pixelArt:true,antialias:false,scene:[Gallery]});
</script></body></html>` }));
try {
  await page.goto(new URL('__outfit-preview', base).href);
  await page.waitForFunction(() => window.outfitProof, null, { timeout: 30000 });
  const proof = await page.evaluate(() => window.outfitProof);
  assert.equal(proof.keys.length, 11); assert.equal(proof.cacheStable, true); assert.equal(proof.official, 'preview-boxer');
  assert.ok(proof.keys.slice(0, 8).every(key => key.startsWith('outfit-')));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'references/characters/outfits/preview.png' });
  await fs.writeFile('references/characters/outfits/browser-proof.json', JSON.stringify({ ...proof, errors }, null, 2) + '\n');
  console.log('Outfit renderer: four real walking atlases, two exact boxing palette variants, cached textures and official priority verified without browser errors.');
} catch (error) { console.error({ errors,debug:await page.evaluate(()=>({ready:document.readyState,progress:window.outfitLoadProgress,booted:window.outfitGame?.isBooted,loop:window.outfitGame?.loop.running,scenes:window.outfitGame?.scene.scenes.map(s=>({status:s.sys.settings.status,list:s.load.list.size,inflight:s.load.inflight.size,failed:s.load.totalFailed,complete:s.load.totalComplete}))})) }); throw error; }
finally { await browser.close(); }
