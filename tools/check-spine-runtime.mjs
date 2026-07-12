import fs from "node:fs";
import path from "node:path";
import { ENEMY_CONFIG, GENERAL_CONFIG } from "../src/spineGameLayer.js";

const errors = [];

function load(asset) {
  const file = path.resolve("public/spine-assets", asset, "skeleton.json");
  if (!fs.existsSync(file)) {
    errors.push(`${asset}: runtime asset is missing`);
    return null;
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function requireAnimations(asset, names) {
  const data = load(asset);
  if (!data) return;
  for (const name of names) {
    if (!data.animations?.[name]) errors.push(`${asset}: runtime animation '${name}' is missing`);
  }
}

for (const config of Object.values(GENERAL_CONFIG)) {
  requireAnimations(config.asset, [...config.idle, ...config.attack]);
  if (config.idle.length !== 2 || config.attack.length !== 2) errors.push(`${config.asset}: general runtime must use paired left/right animations`);
  if (config.attack.includes("attack4")) errors.push(`${config.asset}: attack4 must not be part of the normal attack state`);
  const data = load(config.asset);
  for (const skin of ["1", "2", "3"]) if (!data?.skins?.[skin]) errors.push(`${config.asset}: gameplay skin '${skin}' is missing`);
}
for (const config of Object.values(ENEMY_CONFIG)) {
  requireAnimations(config.asset, [...config.walk, ...config.hit, ...(config.death ? [config.death] : [])]);
}
requireAnimations("aDou", ["dou", "zhan", "tu"]);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Spine runtime mappings OK.");
}
