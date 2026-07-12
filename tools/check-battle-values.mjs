import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const propSource = fs.readFileSync(new URL("../src/originalPropSprites.js", import.meta.url), "utf8");

const required = [
  ["普通敌军生命表", "const ENEMY_HP_BY_LEVEL = [10, 16, 26, 41, 61, 92, 138, 200, 291, 421, 611, 886, 1285, 1863, 2701, 3917, 5680, 8235, 11941, 17315]"],
  ["每侧出怪表", "const ENEMY_COUNT_BY_LEVEL = [10, 11, 12, 13, 15, 16, 18, 19, 21, 24, 26, 29, 31, 35, 38, 42, 46, 51, 56, 61]"],
  ["兵种等级倍率", "const SOLDIER_LEVEL_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.4125]"],
  ["将领攻速倍率", "const GENERAL_SPEED_MULTIPLIERS = [1, 1.3, 1.56, 1.794, 1.9734]"],
  ["将领攻击倍率", "const GENERAL_DAMAGE_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.276]"],
  ["农民生产周期", "const FARMER_CYCLE_SECONDS = [20, 10, 5, 3, 2]"],
  ["精英将领经验", "const ELITE_GENERAL_EXP = [0, 10, 35, 75, 130]"],
  ["普通将领经验", "const REGULAR_GENERAL_EXP = [0, 8, 23]"],
  ["雨天攻速因子", "const RAIN_ATTACK_SPEED_FACTOR = 0.8"]
];

const missing = required.filter(([, text]) => !source.includes(text));
if (missing.length) {
  throw new Error(`Battle value checks failed: ${missing.map(([name]) => name).join(", ")}`);
}

const weaponChecks = [
  ["dao", "range: 1.5, cooldown: 0.8, damage: 3"],
  ["gong", "range: 3.5, cooldown: 0.8, damage: 2"],
  ["qiang", "range: 2.5, cooldown: 0.8, damage: 2"],
  ["ji", "range: 2, cooldown: 0.8, damage: 2"]
];
for (const [token, text] of weaponChecks) {
  const block = source.match(new RegExp(`${token}: \\{[^}]+\\}`))?.[0] ?? "";
  if (!block.includes(text)) throw new Error(`Battle value checks failed: ${token}`);
}

const propChecks = [
  ["砚台冷却", "inkstone: { label: \"砚台\", icon: \"inkstone_1.png\", cooldown: 90"],
  ["陷阱冷却", "trap: { label: \"陷阱\", icon: \"trap_1.png\", cooldown: 50"],
  ["地雷冷却", "landmine: { label: \"地雷\", icon: \"landmine_1.png\", cooldown: 55"]
];
for (const [name, text] of propChecks) {
  if (!propSource.includes(text)) throw new Error(`Battle value checks failed: ${name}`);
}
if (!source.includes("enemy.slowLeft = Math.max(enemy.slowLeft ?? 0, ink.life - ink.age)")) {
  throw new Error("Battle value checks failed: dynamic inkstone area effect");
}

console.log(`Battle values OK: ${required.length + weaponChecks.length + propChecks.length + 1} canonical checks`);
