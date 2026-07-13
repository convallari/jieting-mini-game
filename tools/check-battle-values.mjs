import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const scenarioSource = fs.readFileSync(new URL("../src/scenarioJieting.js", import.meta.url), "utf8");
const propSource = fs.readFileSync(new URL("../src/originalPropSprites.js", import.meta.url), "utf8");

const required = [
  ["八波强化生命表", "const ENEMY_HP_BY_LEVEL = [6, 9, 14, 20, 27, 36, 48, 66]"],
  ["八波双倍出怪表", "const ENEMY_COUNT_BY_LEVEL = [20, 24, 28, 32, 36, 40, 44, 52]"],
  ["首轮固定核心阵型和铲子", "[\"马\", \"谡\", \"王\", \"平\", \"铲\"]"],
  ["首轮中文牌转换为内部铲子", "makeUnit(internalToken(guaranteed[i]))"],
  ["后续征兵自动补三张", "createRecruitChoices().slice(0, openSlots.length)"],
  ["马谡首发限定山地", "deploymentZone = \"mountain\""],
  ["王平首发限定水防", "deploymentZone = \"waterDefense\""],
  ["开局两次征兵资源", "buns: 24"],
  ["攻击调试默认空地图", "const previewUnits = DEBUG_UNITS ? ["],
  ["高血量演示需显式开启单位", "const DEBUG_ATTACK_PREVIEW = DEBUG_ATTACK && DEBUG_UNITS"],
  ["敌军按阶段围山断水", "state.wave <= 3"],
  ["普通敌军战役速度", "isBoss ? 12 : 24 * archetype.speed"],
  ["所有非道路荒地均可开垦", "&& !JIETING_TERRAIN.camp.has(key)"],
  ["攻击调试敌人从入口生成", "if (!DEBUG_UNITS || DEBUG_GENERAL_IDLE) return"],
  ["兵种等级倍率", "const SOLDIER_LEVEL_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.4125]"],
  ["将领攻速倍率", "const GENERAL_SPEED_MULTIPLIERS = [1, 1.3, 1.56, 1.794, 1.9734]"],
  ["将领攻击倍率", "const GENERAL_DAMAGE_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.276]"],
  ["屯田生产周期", "const FARMER_CYCLE_SECONDS = [40, 30, 20, 15, 10]"],
  ["屯田产粮反馈", "floatText(\"军粮+1\""],
  ["精英将领经验", "const ELITE_GENERAL_EXP = [0, 10, 35, 75, 130]"],
  ["普通将领经验", "const REGULAR_GENERAL_EXP = [0, 8, 23]"],
  ["新将领阵型固定从一级开始", "level: 1, attackTimer: 0, experience: 0"],
  ["我方整体伤害系数", "const PLAYER_DAMAGE_FACTOR = 0.8"],
  ["雨天攻速因子", "const RAIN_ATTACK_SPEED_FACTOR = 0.8"],
  ["断汲道军粮奖励", "return state.waterBreached ? 0 : 1"],
  ["双路线汇入同一营寨生命", "const gate = \"left\""]
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
  const block = scenarioSource.match(new RegExp(`${token}: \\{[^}]+\\}`))?.[0] ?? "";
  if (!block.includes(text)) throw new Error(`Battle value checks failed: ${token}`);
}

const propChecks = [
  ["疑兵墨阵冷却", "inkstone: { label: \"疑兵墨阵\", icon: \"inkstone_1.png\", cooldown: 90"],
  ["拒马冷却", "trap: { label: \"拒马\", icon: \"trap_1.png\", cooldown: 50"],
  ["伏火冷却", "landmine: { label: \"伏火\", icon: \"landmine_1.png\", cooldown: 55"]
];
for (const [name, text] of propChecks) {
  if (!propSource.includes(text)) throw new Error(`Battle value checks failed: ${name}`);
}
if (!source.includes("enemy.slowLeft = Math.max(enemy.slowLeft ?? 0, ink.life - ink.age)")) {
  throw new Error("Battle value checks failed: dynamic inkstone area effect");
}
if (source.includes("member.level = Math.max(member.level ?? 1, level)")) {
  throw new Error("Battle value checks failed: general level must not leak into glyph members");
}

console.log(`Battle values OK: ${required.length + weaponChecks.length + propChecks.length + 2} canonical checks`);
