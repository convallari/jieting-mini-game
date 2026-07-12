const EFFECTS = {
  knife: { sheet: "knife-hit-sheet.png", frames: 1, scale: 1.25, life: 0.104 },
  pike: { sheet: "pike-hit-sheet.png", frames: 1, scale: 0.78, life: 0.256 },
  bow: { sheet: "bow-hit-sheet.png", frames: 3, scale: 0.9, life: 0.136 },
  cavalry: { sheet: "cavalry-hit-sheet.png", frames: 2, scale: 1, life: 0.25 }
};
const TOKEN_TO_EFFECT = { dao: "knife", qiang: "pike", gong: "bow", ji: "cavalry" };
const cache = new Map();
const BASE_URL = import.meta.env.BASE_URL || "/";

export function preloadOriginalHitEffects() { for (const key of Object.keys(EFFECTS)) loadEffect(key); }
export function hitEffectForToken(token) { return TOKEN_TO_EFFECT[token] ?? null; }
export function getOriginalHitEffectTiming(key) { return EFFECTS[key]?.life ?? 0.18; }

export function drawOriginalHitEffect(ctx, effect) {
  const item = EFFECTS[effect.key];
  const sprite = loadEffect(effect.key);
  if (!item || !sprite.loaded) return false;
  const progress = Math.max(0, Math.min(0.999, effect.age / effect.life));
  const frame = Math.min(item.frames - 1, Math.floor(progress * item.frames));
  const size = effect.size * item.scale * (0.82 + Math.sin(progress * Math.PI) * 0.28);
  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.72;
  ctx.translate(effect.x, effect.y);
  ctx.rotate(effect.rotation);
  ctx.drawImage(sprite.image, frame * 96, 0, 96, 96, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

function loadEffect(key) {
  if (cache.has(key)) return cache.get(key);
  const image = new Image();
  const item = EFFECTS[key];
  const candidates = [`${BASE_URL}original-effects/${item.sheet}`, `/original-effects/${item.sheet}`, `/public/original-effects/${item.sheet}`];
  const sprite = { image, loaded: false, index: 0 };
  image.onload = () => { sprite.loaded = true; };
  image.onerror = () => { sprite.index += 1; if (sprite.index < candidates.length) image.src = candidates[sprite.index]; };
  image.src = candidates[0];
  cache.set(key, sprite);
  return sprite;
}
