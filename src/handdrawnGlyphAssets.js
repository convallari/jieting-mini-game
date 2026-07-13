const PACK_URL = "/handdrawn-glyphs/jieting-actor-animation-pack.json";
const IMAGE_ROOT = "/handdrawn-glyphs/";

const actorsByGlyph = new Map();
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
  loadPromise = fetch(PACK_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Hand-drawn glyph pack HTTP ${response.status}`);
      return response.json();
    })
    .then(async (pack) => {
      if (pack?.format !== "jieting-actor-animation-pack") throw new Error("Invalid hand-drawn glyph pack");
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
          image.src = `${IMAGE_ROOT}${encodeURIComponent(layer.file)}`;
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

export function drawHanddrawnGlyph(ctx, text, size) {
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
      ctx.drawImage(
        layer.image,
        bounds.x, bounds.y, bounds.width, bounds.height,
        x, y, glyphSize, glyphSize
      );
    }
  });
  return true;
}
