import { accessSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "index.html",
  "glyph-designer.html",
  "src/main.js",
  "src/glyphDesigner.js",
  "src/glyphDesigner.css",
  "src/actorAssetSchema.js",
  "src/hanziAssets.js",
  "src/glyphMasks.js",
  "src/vectorHanzi.js",
  "src/weaponGlyphSprites.js",
  "src/originalUnitSprites.js",
  "src/originalPropSprites.js",
  "src/originalMapConfig.js",
  "src/scenarioJieting.js",
  "src/animationPresets.js",
  "src/styles.css",
  "vite.config.js",
  "tools/build-glyph-masks.py",
  "tools/build-game-glyph-sprites.py",
  "tools/make-animation-references.mjs",
  "tools/extract-original-maps.mjs",
  "tools/check-jieting-config.mjs",
  "docs/game-design.md",
  "docs/animation-asset-standard.md",
  "public/original-units/farmer.png",
  "public/original-units/hoe.png",
  "public/original-units/gold-mine.png",
  "public/original-units/crops-0.png",
  "public/original-units/crops-1.png",
  "public/original-units/crops-2.png",
  "public/original-units/crops-3.png",
  "public/original-props/trap_1.png",
  "public/original-props/trap_2.png",
  "public/original-props/landmine_1.png",
  "public/original-props/inkstone_1.png",
  "public/original-props/ink.png",
  "public/original-props/mound.png",
  "public/original-glyphs/dao-attack-sheet.png",
  "public/original-glyphs/gong-attack-sheet.png",
  "public/original-glyphs/qiang-full-review-sheet.png",
  "public/original-glyphs/qi-attack-sheet.png"
];

for (const file of requiredFiles) {
  accessSync(file);
}

const syntax = spawnSync("node", ["--check", "src/main.js"], { stdio: "inherit" });
if (syntax.status !== 0) process.exit(syntax.status ?? 1);

const assetSyntax = spawnSync("node", ["--check", "src/hanziAssets.js"], { stdio: "inherit" });
if (assetSyntax.status !== 0) process.exit(assetSyntax.status ?? 1);

const maskSyntax = spawnSync("node", ["--check", "src/glyphMasks.js"], { stdio: "inherit" });
if (maskSyntax.status !== 0) process.exit(maskSyntax.status ?? 1);

const vectorSyntax = spawnSync("node", ["--check", "src/vectorHanzi.js"], { stdio: "inherit" });
if (vectorSyntax.status !== 0) process.exit(vectorSyntax.status ?? 1);

const weaponSpriteSyntax = spawnSync("node", ["--check", "src/weaponGlyphSprites.js"], { stdio: "inherit" });
if (weaponSpriteSyntax.status !== 0) process.exit(weaponSpriteSyntax.status ?? 1);

const unitSpriteSyntax = spawnSync("node", ["--check", "src/originalUnitSprites.js"], { stdio: "inherit" });
if (unitSpriteSyntax.status !== 0) process.exit(unitSpriteSyntax.status ?? 1);

const propSpriteSyntax = spawnSync("node", ["--check", "src/originalPropSprites.js"], { stdio: "inherit" });
if (propSpriteSyntax.status !== 0) process.exit(propSpriteSyntax.status ?? 1);

const scenarioSyntax = spawnSync("node", ["--check", "src/scenarioJieting.js"], { stdio: "inherit" });
if (scenarioSyntax.status !== 0) process.exit(scenarioSyntax.status ?? 1);

const animationPresetSyntax = spawnSync("node", ["--check", "src/animationPresets.js"], { stdio: "inherit" });
if (animationPresetSyntax.status !== 0) process.exit(animationPresetSyntax.status ?? 1);

const animationReferenceSyntax = spawnSync("node", ["--check", "tools/make-animation-references.mjs"], { stdio: "inherit" });
if (animationReferenceSyntax.status !== 0) process.exit(animationReferenceSyntax.status ?? 1);

const viteConfigSyntax = spawnSync("node", ["--check", "vite.config.js"], { stdio: "inherit" });
if (viteConfigSyntax.status !== 0) process.exit(viteConfigSyntax.status ?? 1);

const deploymentPathChecks = [
  ["index.html", /<script[^>]+src="\/vendor\//],
  ["spine-animation-review.html", /<script[^>]+src="\/vendor\//],
  ["src/handdrawnGlyphAssets.js", /["'`]\/handdrawn-glyphs\//],
  ["src/spineGameLayer.js", /["'`]\/spine-assets\//],
  ["src/spineAnimationReview.js", /["'`]\/spine-assets\//],
  ["src/main.js", /["'`]\/original-audio\//]
];

for (const [file, pattern] of deploymentPathChecks) {
  if (pattern.test(readFileSync(file, "utf8"))) {
    throw new Error(`${file} contains a root-relative runtime asset path that breaks GitHub Pages subdirectory deployments`);
  }
}

console.log("Project files and JavaScript syntax look good.");
