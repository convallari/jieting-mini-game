import { accessSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "index.html",
  "src/main.js",
  "src/hanziAssets.js",
  "src/vectorHanzi.js",
  "src/styles.css",
  "docs/game-design.md"
];

for (const file of requiredFiles) {
  accessSync(file);
}

const syntax = spawnSync("node", ["--check", "src/main.js"], { stdio: "inherit" });
if (syntax.status !== 0) process.exit(syntax.status ?? 1);

const assetSyntax = spawnSync("node", ["--check", "src/hanziAssets.js"], { stdio: "inherit" });
if (assetSyntax.status !== 0) process.exit(assetSyntax.status ?? 1);

const vectorSyntax = spawnSync("node", ["--check", "src/vectorHanzi.js"], { stdio: "inherit" });
if (vectorSyntax.status !== 0) process.exit(vectorSyntax.status ?? 1);

console.log("Project files and JavaScript syntax look good.");
