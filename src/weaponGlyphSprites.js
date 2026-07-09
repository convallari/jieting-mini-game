import { REFERENCE_GLYPHS } from "./referenceGlyphManifest.js";

const TOKEN_TO_REFERENCE_KEY = {
  dao: "dao",
  qiang: "qiang",
  gong: "gong",
  ji: "qi"
};

const STATIC_FRAMES = {
  dao: 0,
  qiang: 0,
  gong: 0,
  qi: 0
};

const RHYTHM = {
  dao: { fps: 30, start: 0, frames: 24 },
  qiang: { fps: 30, start: 0, frames: 24 },
  gong: { fps: 30, start: 0, frames: 24 },
  qi: { fps: 30, start: 24, frames: 24 }
};

const cache = new Map();
const BASE_URL = import.meta.env.BASE_URL || "/";

export function preloadWeaponGlyphSprites() {
  for (const key of Object.values(TOKEN_TO_REFERENCE_KEY)) loadSprite(key);
}

export function hasWeaponGlyphSprite(token) {
  return Boolean(TOKEN_TO_REFERENCE_KEY[token]);
}

export function drawWeaponGlyphSprite(ctx, token, cx, cy, cardSize, options = {}) {
  const key = TOKEN_TO_REFERENCE_KEY[token];
  if (!key) return false;
  const item = REFERENCE_GLYPHS.glyphs[key];
  const sprite = loadSprite(key);
  if (!item || !sprite.loaded) return false;

  const frame = selectFrame(key, item.frames, options.action, options.actionAge);
  const sx = frame * item.frameWidth;
  const drawSize = cardSize * (options.dragging ? 1.1 : 1.06);
  const x = cx - drawSize / 2 + (options.offsetX ?? 0);
  const y = cy - drawSize / 2 + (options.offsetY ?? 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (options.asleep) ctx.globalAlpha *= 0.62;
  ctx.drawImage(sprite.image, sx, 0, item.frameWidth, item.frameHeight, x, y, drawSize, drawSize);
  ctx.restore();
  return true;
}

function loadSprite(key) {
  if (cache.has(key)) return cache.get(key);
  const item = REFERENCE_GLYPHS.glyphs[key];
  const image = new Image();
  const gameSheet = item.gameSheet ?? item.sheet.replace("-sheet.png", "-game-sheet.png");
  const candidates = [
    `${BASE_URL}reference-glyphs/${gameSheet}`,
    `${BASE_URL}public/reference-glyphs/${gameSheet}`,
    `/reference-glyphs/${gameSheet}`,
    `/public/reference-glyphs/${gameSheet}`
  ];
  const sprite = { image, loaded: false, failed: false, index: 0 };
  image.onload = () => {
    sprite.loaded = true;
  };
  image.onerror = () => {
    sprite.index += 1;
    if (sprite.index < candidates.length) {
      image.src = candidates[sprite.index];
      return;
    }
    sprite.failed = true;
  };
  image.src = candidates[sprite.index];
  cache.set(key, sprite);
  return sprite;
}

function selectFrame(key, frames, action, actionAge = 0) {
  if (action !== "attack") return STATIC_FRAMES[key] ?? 0;
  const rhythm = RHYTHM[key] ?? { fps: REFERENCE_GLYPHS.fps ?? 30, start: 0, frames: frames };
  const localFrame = Math.min(rhythm.frames - 1, Math.floor(Math.max(0, actionAge) * rhythm.fps));
  return Math.min(frames - 1, rhythm.start + localFrame);
}
