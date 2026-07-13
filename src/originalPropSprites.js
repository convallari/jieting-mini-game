const BASE_URL = import.meta.env.BASE_URL || "/";
const cache = new Map();

export const ACTIVE_PROP_CONFIG = {
  trap: { label: "拒马", icon: "trap_1.png", cooldown: 50 },
  landmine: { label: "伏火", icon: "landmine_1.png", cooldown: 55 },
  inkstone: { label: "疑兵墨阵", icon: "inkstone_1.png", cooldown: 90 }
};

export function preloadOriginalPropSprites() {
  for (const config of Object.values(ACTIVE_PROP_CONFIG)) load(config.icon);
  for (const file of ["trap_2.png", "mound.png", "ink.png", "shovel_1.png", "shovel_2.png", "shovelShadow.png"]) load(file);
}

export function drawOriginalPropSprite(ctx, file, x, y, width, height = width, options = {}) {
  const sprite = load(file);
  if (!sprite.loaded) return false;
  ctx.save();
  ctx.globalAlpha *= options.alpha ?? 1;
  ctx.translate(x, y);
  if (options.rotation) ctx.rotate(options.rotation);
  const scale = options.scale ?? 1;
  ctx.drawImage(sprite.image, -width * scale / 2, -height * scale / 2, width * scale, height * scale);
  ctx.restore();
  return true;
}

function load(file) {
  if (cache.has(file)) return cache.get(file);
  const image = new Image();
  const sprite = { image, loaded: false };
  image.onload = () => { sprite.loaded = true; };
  image.src = `${BASE_URL}original-props/${file}`;
  cache.set(file, sprite);
  return sprite;
}
