const BASE_URL = import.meta.env?.BASE_URL || "/";
const PACK_URL = `${BASE_URL}handdrawn-glyphs/jieting-actor-animation-pack.json`;
const IMAGE_ROOT = `${BASE_URL}handdrawn-glyphs/`;

const actorsByGlyph = new Map();
const tintedLayerCache = new Map();
const JIETING_RUNTIME_GLYPHS = new Set([
  "马", "谡", "王", "平",
  "张", "郃", "司", "懿", "魏", "军", "锋", "蜀", "营", "山", "水",
  "刀", "枪", "弓", "骑", "铲", "农"
]);
const GLYPH_SCALE_OVERRIDES = new Map([
  ["先", 0.85],
  ["锋", 0.85],
  ["营", 0.85],
  ["魏", 0.85]
]);
let loadPromise;

export function preloadHanddrawnGlyphs() {
  if (loadPromise) return loadPromise;
  loadPromise = fetch(PACK_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Hand-drawn glyph pack HTTP ${response.status}`);
      return response.json();
    })
    .then(async (pack) => {
      if (pack?.format !== "jieting-actor-animation-pack") throw new Error("Invalid hand-drawn glyph pack");
      const assetRevision = encodeURIComponent(pack.assetRevision ?? "current");
      const glyphActors = Object.values(pack.actors ?? {}).filter((actor) =>
        actor.actorType === "generalGlyph"
        && [...(actor.glyph ?? "")].length === 1
        && JIETING_RUNTIME_GLYPHS.has(actor.glyph)
      );
      await Promise.all(glyphActors.map(async (actor) => {
        const layers = [];
        for (const layerId of pack.layerOrder ?? ["ink", "accent", "shadow", "fx"]) {
          const layer = actor.layers?.[layerId];
          if (!layer?.file) continue;
          const image = new Image();
          image.decoding = "async";
          image.src = `${IMAGE_ROOT}${encodeURIComponent(layer.file)}?v=${assetRevision}`;
          await image.decode();
          layers.push({ id: layerId, image });
        }
        if (layers.length) actorsByGlyph.set(actor.glyph, { ...actor, layers });
      }));
      return actorsByGlyph.size;
    })
    .catch((error) => {
      console.warn("Hand-drawn glyph assets unavailable; using vector fallback.", error);
      return 0;
    });
  return loadPromise;
}

export function handdrawnGlyphCount() {
  return actorsByGlyph.size;
}

export function hasHanddrawnGlyph(text) {
  const chars = [...String(text ?? "")];
  return chars.length > 0 && chars.every((char) => actorsByGlyph.has(char));
}

export function isJietingHanddrawnText(text) {
  const chars = [...String(text ?? "")];
  return chars.length > 0 && chars.every((char) => JIETING_RUNTIME_GLYPHS.has(char));
}

export function drawHanddrawnGlyph(ctx, text, size, { tint = null } = {}) {
  const chars = [...String(text ?? "")];
  if (!chars.length || !chars.every((char) => actorsByGlyph.has(char))) return false;

  const partSize = chars.length === 1 ? size * 1.357 : size * Math.min(0.874, 1.61 / chars.length);
  const spacing = partSize * 0.82;
  const startX = -((chars.length - 1) * spacing) / 2;
  chars.forEach((char, index) => {
    const actor = actorsByGlyph.get(char);
    const glyphSize = partSize * (GLYPH_SCALE_OVERRIDES.get(char) ?? 1);
    const bounds = actor.bounds ?? { x: 0, y: 0, width: 512, height: 512 };
    const pivot = actor.pivot ?? { x: 256, y: 300 };
    const pivotX = (pivot.x - bounds.x) / bounds.width;
    const pivotY = (pivot.y - bounds.y) / bounds.height;
    const x = startX + index * spacing - pivotX * glyphSize;
    const y = -pivotY * glyphSize - glyphSize * 0.1;
    for (const layer of actor.layers) {
      const image = tint ? tintedLayer(actor, layer, tint) : layer.image;
      ctx.drawImage(
        image,
        bounds.x, bounds.y, bounds.width, bounds.height,
        x, y, glyphSize, glyphSize
      );
    }
  });
  return true;
}

function tintedLayer(actor, layer, color) {
  const key = `${actor.token}:${layer.id}:${color}`;
  if (tintedLayerCache.has(key)) return tintedLayerCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = layer.image.naturalWidth || layer.image.width;
  canvas.height = layer.image.naturalHeight || layer.image.height;
  const context = canvas.getContext("2d");
  context.drawImage(layer.image, 0, 0);
  context.globalCompositeOperation = "source-in";
  if (color === "formationGold") {
    const gold = context.createLinearGradient(0, 0, 0, canvas.height);
    gold.addColorStop(0, "#d7aa3a");
    gold.addColorStop(0.48, "#9f711f");
    gold.addColorStop(1, "#684111");
    context.fillStyle = gold;
  } else {
    context.fillStyle = color;
  }
  context.fillRect(0, 0, canvas.width, canvas.height);
  tintedLayerCache.set(key, canvas);
  return canvas;
}
