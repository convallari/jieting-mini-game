const TOKEN_TO_REFERENCE_KEY = {
  dao: "dao",
  qiang: "qiang",
  gong: "gong",
  ji: "qi"
};

const ORIGINAL_GLYPHS = {
  dao: { sheet: "dao-attack-sheet.png", frames: 19, frameWidth: 120, frameHeight: 129, bounds: [54, 56, 92, 97], visualScale: 0.76 },
  // The captured bow animation points upward. The original game rotates the
  // complete animation container toward the target before playing it.
  gong: { sheet: "gong-attack-sheet.png", frames: 30, frameWidth: 74, frameHeight: 95, bounds: [21, 1, 48, 53], visualScale: 0.76, aimOffset: Math.PI / 2 },
  qiang: { sheet: "qiang-full-review-sheet.png", frames: 21, frameWidth: 224, frameHeight: 224, bounds: [34, 20, 184, 198] },
  qi: { sheet: "qi-attack-sheet.png", frames: 19, frameWidth: 263, frameHeight: 294, bounds: [106, 116, 183, 177] }
};

const ATTACK_TIMING = {
  dao: { duration: 0.6, impact: 0.5 },
  qiang: { duration: 0.667, releaseRatio: 360 / 667, activeRatio: 120 / 667 },
  gong: { duration: 1, releaseRatio: 0.65, activeRatio: 0.35 },
  ji: { duration: 0.6, releaseRatio: 0.25, activeRatio: 0.5 }
};

const cache = new Map();
const BASE_URL = import.meta.env.BASE_URL || "/";

export function preloadWeaponGlyphSprites() {
  for (const key of Object.values(TOKEN_TO_REFERENCE_KEY)) loadSprite(key);
}

export function hasWeaponGlyphSprite(token) {
  return Boolean(TOKEN_TO_REFERENCE_KEY[token]);
}

export function getWeaponAnimationTiming(token) {
  return ATTACK_TIMING[token] ?? null;
}

export function drawWeaponGlyphSprite(ctx, token, cx, cy, cardSize, options = {}) {
  const key = TOKEN_TO_REFERENCE_KEY[token];
  if (!key) return false;
  const item = ORIGINAL_GLYPHS[key];
  const sprite = loadSprite(key);
  if (!item || !sprite.loaded) return false;

  const frame = selectFrame(item.frames, options.action, options.actionProgress);
  const sx = frame * item.frameWidth;
  const [bx0, by0, bx1, by1] = item.bounds;
  const visibleWidth = bx1 - bx0;
  const visibleHeight = by1 - by0;
  const visibleScale = cardSize * (item.visualScale ?? 0.84) / Math.max(visibleWidth, visibleHeight) * (options.dragging ? 1.08 : 1);
  const drawWidth = item.frameWidth * visibleScale;
  const drawHeight = item.frameHeight * visibleScale;
  const x = cx - (bx0 + visibleWidth / 2) * visibleScale + (options.offsetX ?? 0);
  const y = cy - (by0 + visibleHeight / 2) * visibleScale + (options.offsetY ?? 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (options.asleep) ctx.globalAlpha *= 0.62;
  if (Number.isFinite(item.aimOffset)) {
    let rotation = 0;
    if (options.action === "attack" && Number.isFinite(options.actionAimAngle)) {
      const start = options.actionStartAngle ?? 0;
      const target = options.actionAimAngle;
      const turnProgress = Math.min(1, (options.actionProgress ?? 0) / 0.65);
      const eased = turnProgress * turnProgress * (3 - 2 * turnProgress);
      const delta = Math.atan2(Math.sin(target - start), Math.cos(target - start));
      rotation = start + delta * eased;
    } else if (options.engaged) {
      rotation = options.aimAngle ?? 0;
    } else if (Number.isFinite(options.aimAngle) && (options.aimReturnAge ?? 0) < 0.65) {
      const returnProgress = Math.min(1, (options.aimReturnAge ?? 0) / 0.65);
      const eased = returnProgress * returnProgress * (3 - 2 * returnProgress);
      rotation = options.aimAngle * (1 - eased);
    }
    if (Math.abs(rotation) > 0.0001) {
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);
    }
  }
  ctx.drawImage(sprite.image, sx, 0, item.frameWidth, item.frameHeight, x, y, drawWidth, drawHeight);
  ctx.restore();
  return true;
}

function loadSprite(key) {
  if (cache.has(key)) return cache.get(key);
  const item = ORIGINAL_GLYPHS[key];
  const image = new Image();
  const candidates = [
    `${BASE_URL}original-glyphs/${item.sheet}`,
    `/original-glyphs/${item.sheet}`,
    `/public/original-glyphs/${item.sheet}`
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

function selectFrame(frames, action, actionProgress = 0) {
  if (action !== "attack") return 0;
  const progress = Math.max(0, Math.min(0.999999, actionProgress));
  return Math.min(frames - 1, Math.floor(progress * frames));
}
