const BASE_URL = import.meta.env?.BASE_URL || "/";
const ROOT = `${BASE_URL}curated-animation-assets/`;

const CAMP_IMAGE = "camp-static.png";

const images = new Map();
const GENERAL_GLYPHS = new Map([
  ["马", "glyph-ma.png"],
  ["谡", "glyph-su.png"],
  ["王", "glyph-wang.png"],
  ["平", "glyph-ping.png"]
]);
let loadPromise;

export function preloadCuratedAnimationAssets() {
  if (loadPromise) return loadPromise;
  const files = [
    CAMP_IMAGE,
    "zhanghe-energy-ring.png",
    "zhanghe-slash-trail.png",
    ...GENERAL_GLYPHS.values(),
    "masu-explosion-a.png",
    "masu-explosion-b.png",
    "wangping-ground-impact.png"
  ];
  loadPromise = Promise.all(files.map(async (file) => {
    const image = new Image();
    image.decoding = "async";
    image.src = `${ROOT}${file}`;
    await image.decode();
    images.set(file, image);
  })).then(() => images.size).catch((error) => {
    console.warn("Curated animation assets unavailable.", error);
    return 0;
  });
  return loadPromise;
}

export function drawCuratedCamp(ctx, cx, cy, width, height) {
  const image = images.get(CAMP_IMAGE);
  if (!image) return false;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  ctx.drawImage(image, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  return true;
}

export function drawCuratedZhangHeFx(ctx, x, y, size, enemy, time) {
  if (enemy?.bossIndex !== 0 || !(enemy.bossCastingLeft > 0)) return false;
  const ring = images.get("zhanghe-energy-ring.png");
  const slash = images.get("zhanghe-slash-trail.png");
  if (!ring || !slash) return false;
  const duration = Math.max(0.01, enemy.bossCastDuration ?? 1.2);
  const progress = Math.max(0, Math.min(1, (enemy.bossCastElapsed ?? 0) / duration));
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.min(0.9, progress * 2.4);
  ctx.rotate(time * 2.7);
  ctx.drawImage(ring, -size * 0.72, -size * 0.72, size * 1.44, size * 1.44);
  if (progress > 0.38) {
    ctx.rotate(-time * 2.7 - 0.42);
    ctx.globalAlpha = Math.sin(Math.min(1, (progress - 0.38) / 0.62) * Math.PI) * 0.92;
    ctx.drawImage(slash, -size * 0.82, -size * 0.64, size * 1.64, size * 1.28);
  }
  ctx.restore();
  return true;
}

export function drawCuratedGeneralGlyph(ctx, text, size) {
  const chars = [...String(text ?? "")];
  if (!chars.length || !chars.every((char) => images.has(GENERAL_GLYPHS.get(char)))) return false;
  const partSize = chars.length === 1 ? size * 1.08 : size * Math.min(0.9, 1.65 / chars.length);
  const spacing = partSize * 0.72;
  const startX = -((chars.length - 1) * spacing) / 2;
  chars.forEach((char, index) => {
    const image = images.get(GENERAL_GLYPHS.get(char));
    const scale = char === "马" || char === "谡" ? 1.3 : 1;
    const ratio = image.naturalWidth / image.naturalHeight;
    const drawH = partSize * scale;
    const drawW = drawH * ratio;
    const anchoredBottom = partSize * 0.36;
    ctx.drawImage(image, startX + index * spacing - drawW / 2, anchoredBottom - drawH, drawW, drawH);
  });
  return true;
}

export function drawCuratedGeneralFx(ctx, token, x, y, size, { action = "idle", progress = 0, time = 0 } = {}) {
  if (action !== "attack") return false;
  const image = token === "马谡"
    ? images.get(progress < 0.42 ? "masu-explosion-a.png" : "masu-explosion-b.png")
    : token === "王平"
      ? images.get("wangping-ground-impact.png")
      : null;
  if (!image) return false;
  const k = Math.max(0, Math.min(1, progress));
  const pulse = Math.sin(k * Math.PI);
  ctx.save();
  ctx.translate(x, y + (token === "王平" ? size * 0.18 : -size * 0.04));
  ctx.globalAlpha = pulse * (token === "马谡" ? 0.88 : 0.78);
  if (token === "马谡") ctx.rotate(Math.sin(time * 18) * 0.035);
  const scale = token === "马谡" ? 0.48 + k * 0.82 : 0.62 + k * 0.5;
  const drawW = size * scale;
  const drawH = drawW * (image.naturalHeight / image.naturalWidth);
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
  return true;
}
