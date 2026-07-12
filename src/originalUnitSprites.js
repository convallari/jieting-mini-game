const BASE_URL = import.meta.env.BASE_URL || "/";
const cache = new Map();

export function preloadOriginalUnitSprites() {
  load("farmer");
  load("hoe");
  load("gold-mine");
  for (let i = 0; i < 4; i++) load(`crops-${i}`);
}

export function drawOriginalFarmer(ctx, cx, cy, size, options = {}) {
  const sprite = load("farmer");
  if (!sprite.loaded) return false;
  const bob = Math.sin((options.time ?? 0) * Math.PI * 2 + (options.wobble ?? 0)) * size * 0.025;
  const scale = options.dragging ? 1.08 : 1;
  const shown = size * 0.88 * scale;
  ctx.save();
  if (options.asleep) ctx.globalAlpha *= 0.62;
  const unitAlpha = ctx.globalAlpha;
  const progress = Math.max(0, Math.min(0.999, options.progress ?? 0));
  const cropStage = progress < 1 / 6 ? 0 : progress < 1 / 3 ? 1 : progress < 2 / 3 ? 2 : 3;
  const crops = load(options.mode === "crazy" ? "gold-mine" : `crops-${cropStage}`);
  if (options.active && crops.loaded) {
    const cropSize = size * 0.78;
    ctx.globalAlpha = unitAlpha * 0.82;
    ctx.drawImage(crops.image, cx - cropSize / 2, cy - cropSize * 0.34, cropSize, cropSize);
    ctx.globalAlpha = unitAlpha;
  }
  ctx.drawImage(sprite.image, cx - shown / 2, cy - shown / 2 + bob, shown, shown);
  const hoe = load("hoe");
  if (options.active && hoe.loaded) {
    const speedScale = Math.max(0.1, options.speedScale ?? 1);
    const swing = ((options.time ?? 0) / (0.7 * speedScale)) % 1;
    const down = options.mode === "crazy" ? -Math.PI : -Math.PI / 2;
    const rotation = swing < 3 / 7
      ? down * (swing / (3 / 7))
      : swing < 4 / 7
        ? down * (1 - (swing - 3 / 7) / (1 / 7))
        : 0;
    const hoeSize = size * 0.88;
    ctx.translate(cx - size * 0.18, cy + size * 0.05);
    ctx.rotate(rotation);
    ctx.drawImage(hoe.image, -hoeSize * 0.5, -hoeSize * 0.45, hoeSize, hoeSize);
  }
  ctx.restore();
  return true;
}

function load(key) {
  if (cache.has(key)) return cache.get(key);
  const image = new Image();
  const sprite = { image, loaded: false };
  image.onload = () => { sprite.loaded = true; };
  image.src = `${BASE_URL}original-units/${key}.png`;
  cache.set(key, sprite);
  return sprite;
}
