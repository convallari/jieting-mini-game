import { accessSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "index.html",
  "src/main.js",
  "src/hanziAssets.js",
  "src/glyphMasks.js",
  "src/vectorHanzi.js",
  "src/weaponGlyphSprites.js",
  "src/styles.css",
  "tools/build-glyph-masks.py",
  "tools/build-game-glyph-sprites.py",
  "tools/make-animation-references.mjs",
  "docs/game-design.md"
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

const animationReferenceSyntax = spawnSync("node", ["--check", "tools/make-animation-references.mjs"], { stdio: "inherit" });
if (animationReferenceSyntax.status !== 0) process.exit(animationReferenceSyntax.status ?? 1);

console.log("Project files and JavaScript syntax look good.");
