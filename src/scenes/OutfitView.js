import { careerProfile } from '../game/CareerProfile.js';
import { SHOP_CATALOG } from '../game/ChapterRules.js';

const DIRECTIONS = ['down', 'right', 'up', 'left'];
const VARIANTS = { street: ['street-blue', 'street-burgundy', 'street-octopus'], boxing: ['boxing-emerald', 'boxing-burgundy'] };
const defaults = { street: 'street-black', boxing: 'boxing-blue' };
const outfitKey = (id, pose) => `outfit-${id}-${pose}`;

function equipped(profile, slot) {
  // Read a single saved choice rather than cloning the whole career every frame.
  const inventory = profile?.profile?.inventory ?? profile?.inventory ?? profile?.snapshot?.().inventory;
  const id = inventory?.equipped?.[slot] ?? defaults[slot];
  return VARIANTS[slot].includes(id) ? id : defaults[slot];
}

/** Twelve authored walking poses per color, with the existing 96 × 112 anchor. */
export function preloadOutfits(scene, { street = false, boxing = false } = {}) {
  const base = import.meta.env?.BASE_URL ?? '/';
  for (const slot of ['street', 'boxing']) {
    if (!(slot === 'street' ? street : boxing)) continue;
    for (const id of VARIANTS[slot]) for (const direction of DIRECTIONS) for (let step = 0; step < 3; step++) {
      const pose = `${direction}-${step}`, key = outfitKey(id, pose);
      if (!scene.textures.exists(key)) scene.load.image(key, `${base}assets/sprites/outfits/${id}/player-${pose}.png`);
    }
  }
}

function walkingTexture(scene, baseKey, id) {
  const pose = /(?:^|-)((?:down|right|up|left)-[0-2])$/.exec(baseKey)?.[1];
  const key = pose ? outfitKey(id, pose) : null;
  return key && scene.textures.exists(key) ? key : null;
}

export function streetTexture(scene, baseKey, profile = careerProfile) {
  const id = equipped(profile, 'street');
  return id === defaults.street ? baseKey : walkingTexture(scene, baseKey, id) ?? baseKey;
}

function rgbToHsl(red, green, blue) {
  const r = red / 255, g = green / 255, b = blue / 255;
  const high = Math.max(r, g, b), low = Math.min(r, g, b), difference = high - low;
  const light = (high + low) / 2;
  if (!difference) return [0, 0, light];
  let hue = high === r ? (g - b) / difference + (g < b ? 6 : 0) : high === g ? (b - r) / difference + 2 : (r - g) / difference + 4;
  return [hue / 6, difference / (1 - Math.abs(2 * light - 1)), light];
}

function hslToRgb(hue, saturation, light) {
  const amplitude = saturation * Math.min(light, 1 - light);
  return [0, 8, 4].map(offset => {
    const k = (offset + hue * 12) % 12;
    return Math.round(255 * (light - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  });
}

/** Native palette swap for the blue fabric in the existing large boxing atlases.
 * No geometry, alpha, skin, red tuque, white bandage or dark outline is changed.
 * The result can share every original pose landmark and hit-contact measurement.
 */
export function recolorBoxingPixels(pixels, targetColor) {
  const targetHue = rgbToHsl((targetColor >>> 16) & 255, (targetColor >>> 8) & 255, targetColor & 255)[0];
  const output = new Uint8ClampedArray(pixels);
  for (let index = 0; index < pixels.length; index += 4) {
    if (!pixels[index + 3]) continue;
    if (Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) - Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 12) continue;
    const [hue, saturation, light] = rgbToHsl(pixels[index], pixels[index + 1], pixels[index + 2]);
    if (hue < .53 || hue > .73 || saturation < .24 || light < .08 || light > .86) continue;
    // The source blue includes very bright cyan highlights. A modest fabric
    // exposure reduction keeps emerald/burgundy rich instead of mint/pink,
    // while preserving the exact ordering of every authored shade.
    const rgb = hslToRgb(targetHue, Math.max(.42, Math.min(.86, saturation * .94)), light * .80);
    output[index] = rgb[0]; output[index + 1] = rgb[1]; output[index + 2] = rgb[2];
  }
  return output;
}

export function boxingTexture(scene, baseKey, profile = careerProfile, { official = false } = {}) {
  if (official) return baseKey;
  const id = equipped(profile, 'boxing');
  if (id === defaults.boxing) return baseKey;
  const walking = walkingTexture(scene, baseKey, id);
  if (walking) return walking;
  const key = `outfit-${id}-${baseKey}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.get(baseKey);
  const source = texture?.getSourceImage?.();
  if (!source || !scene.textures.exists(baseKey)) return baseKey;
  const width = source.naturalWidth || source.width, height = source.naturalHeight || source.height;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return baseKey;
  const context = canvas.getContext();
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0);
  const image = context.getImageData(0, 0, width, height);
  const color = SHOP_CATALOG.find(item => item.id === id).color;
  image.data.set(recolorBoxingPixels(image.data, color));
  context.putImageData(image, 0, 0); canvas.refresh();
  return key;
}

export function applyStreetOutfit(scene, sprite, baseKey, profile = careerProfile) {
  return sprite.setTexture(streetTexture(scene, baseKey, profile));
}
export function applyBoxingOutfit(scene, sprite, baseKey, profile = careerProfile, options = {}) {
  return sprite.setTexture(boxingTexture(scene, baseKey, profile, options));
}

/** Call once while showing the ready menu, so the first punch never pays the
 * one-time canvas conversion cost on its scored contact frame. */
export function prepareBoxingOutfits(scene, baseKeys, profile = careerProfile, options = {}) {
  for (const key of new Set(baseKeys)) boxingTexture(scene, key, profile, options);
}
