import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error("Usage: node tools/import-curated-game-assets.mjs <source-directory>");

const outputDir = path.resolve("public/curated-animation-assets");
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

async function crop(sourceName, outputName, region, options = {}) {
  const input = path.join(sourceDir, sourceName);
  const output = path.join(outputDir, outputName);
  const { data, info } = await sharp(input)
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const key = options.key ?? [74, 111, 76];
  const transparentDistance = options.transparentDistance ?? 18;
  const opaqueDistance = options.opaqueDistance ?? 58;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const dr = data[offset] - key[0];
    const dg = data[offset + 1] - key[1];
    const db = data[offset + 2] - key[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const keyedAlpha = distance <= transparentDistance
      ? 0
      : distance >= opaqueDistance
        ? 255
        : Math.round(((distance - transparentDistance) / (opaqueDistance - transparentDistance)) * 255);
    data[offset + 3] = Math.min(data[offset + 3], keyedAlpha);
  }
  await sharp(data, { raw: info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(output);
  return outputName;
}

const campWidth = 2048;
const campCols = 7;
const campCellW = campWidth / campCols;
function campRegion(col, row) {
  const left = Math.round(col * campCellW);
  const right = Math.round((col + 1) * campCellW);
  return { left, top: row * 256, width: right - left, height: 256 };
}

const files = [];
files.push(await crop("蜀营图标.png", "camp-static.png", campRegion(0, 0)));
files.push(await crop("张郃资产.png", "zhanghe-energy-ring.png", { left: 1030, top: 10, width: 360, height: 310 }));
files.push(await crop("张郃资产.png", "zhanghe-slash-trail.png", { left: 1010, top: 345, width: 390, height: 410 }));
files.push(await crop("马谡.png", "glyph-ma.png", { left: 0, top: 0, width: 345, height: 406 }, { key: [250, 249, 246], transparentDistance: 10, opaqueDistance: 52 }));
files.push(await crop("马谡.png", "glyph-su.png", { left: 365, top: 0, width: 355, height: 406 }, { key: [250, 249, 246], transparentDistance: 10, opaqueDistance: 52 }));
files.push(await crop("王平.png", "glyph-wang.png", { left: 0, top: 0, width: 330, height: 405 }));
files.push(await crop("王平.png", "glyph-ping.png", { left: 360, top: 0, width: 336, height: 405 }));
files.push(await crop("马谡资产.png", "masu-explosion-a.png", { left: 830, top: 675, width: 194, height: 180 }));
files.push(await crop("马谡资产.png", "masu-explosion-b.png", { left: 730, top: 825, width: 294, height: 199 }));
files.push(await crop("王平资产.png", "wangping-ground-impact.png", { left: 535, top: 690, width: 489, height: 334 }));

const manifest = {
  format: "jieting-curated-animation-assets",
  sourceDirectory: sourceDir,
  generatedAt: new Date().toISOString(),
  applied: {
    camp: files.filter((file) => file.startsWith("camp-")),
    zhanghe: files.filter((file) => file.startsWith("zhanghe-")),
    generalGlyphs: files.filter((file) => file.startsWith("glyph-")),
    generalEffects: ["masu-explosion-a.png", "masu-explosion-b.png", "wangping-ground-impact.png"]
  },
  rejected: {
    "马谡资产.png": "采用红色爆炸；人物拆件、风暴、炸弹本体和水滴等元素不采用",
    "王平资产.png": "采用地裂冲击；空甲、风暴和重复姓名不采用",
    "张郃资产.png": "保留枪势环和斩击拖尾；姓名、武器、披风与既有 Boss 入场资产重复"
  }
};
await fs.writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Curated ${files.length} assets into ${outputDir}`);
