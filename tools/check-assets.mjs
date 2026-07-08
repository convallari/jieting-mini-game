import { accessSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "index.html",
  "src/main.js",
  "src/styles.css",
  "docs/game-design.md"
];

for (const file of requiredFiles) {
  accessSync(file);
}

const syntax = spawnSync("node", ["--check", "src/main.js"], { stdio: "inherit" });
if (syntax.status !== 0) process.exit(syntax.status ?? 1);

console.log("Project files and JavaScript syntax look good.");
