import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public/spine-assets");
const errors = [];
let animationCount = 0;

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const jsonPath = path.join(root, entry.name, "skeleton.json");
  const atlasPath = path.join(root, entry.name, "skeleton.atlas");
  const texturePath = path.join(root, entry.name, "skeleton.png");
  for (const file of [jsonPath, atlasPath, texturePath]) {
    if (!fs.existsSync(file)) errors.push(`${entry.name}: missing ${path.basename(file)}`);
  }
  if (!fs.existsSync(jsonPath)) continue;
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  for (const [animationName, animation] of Object.entries(data.animations ?? {})) {
    animationCount += 1;
    for (const [slotName, timeline] of Object.entries(animation.slots ?? {})) {
      for (const frame of timeline.attachment ?? []) {
        if (!frame.name) continue;
        const owners = Object.values(data.skins ?? {}).filter(skin => skin[slotName]?.[frame.name]);
        if (!owners.length) errors.push(`${entry.name}.${animationName}: ${slotName}:${frame.name} is not in any skin`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Spine assets OK: ${animationCount} animations checked.`);
}
