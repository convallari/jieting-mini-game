import { ANIMATION_PRESETS, EFFECT_RECIPES } from "../src/animationPresets.js";
import { BOSS_ROSTER, COMMAND_ORDERS, ENEMY_ARCHETYPES, FORMATION_RECIPES, GENERAL_COMBAT_CONFIG, JIETING_CAMPAIGN, JIETING_DECK_WEIGHTS, SUPPLY_CONFIG } from "../src/scenarioJieting.js";
import { GLYPH_ACTORS, LEGACY_ACTOR_ALIASES, SOURCE_DISPLAY_POLICY, SOURCE_STRUCTURES, STATE_PROFILES, stateMatrixForActor } from "../src/actorAssetSchema.js";
import { hasVectorHanzi } from "../src/vectorHanzi.js";

const requiredPresets = ["meleeSlash", "spearPierce", "bowVolley", "cavalryRush", "commandAura", "ambushPressure"];
const requiredRecipes = ["knife", "pike", "bow", "cavalry", "command", "ambush"];
const requiredGlyphs = ["马", "谡", "王", "平", "诸", "葛", "亮", "张", "郃", "司", "懿", "魏", "蜀", "营", "水", "山"];

for (const key of requiredPresets) {
  if (!ANIMATION_PRESETS[key]) throw new Error(`Missing animation preset: ${key}`);
}

for (const key of requiredRecipes) {
  if (!EFFECT_RECIPES[key]) throw new Error(`Missing effect recipe: ${key}`);
}

const fixedOrScenarioGlyphs = ["马", "谡", "王", "平", "诸", "葛", "亮", "张", "郃", "司", "懿", "魏", "蜀", "营", "水", "山"];
for (const glyph of requiredGlyphs) {
  if (!Object.prototype.hasOwnProperty.call(JIETING_DECK_WEIGHTS, glyph) && !fixedOrScenarioGlyphs.includes(glyph)) {
    throw new Error(`Missing deck glyph: ${glyph}`);
  }
  if (!hasVectorHanzi(glyph)) throw new Error(`Missing vector glyph: ${glyph}`);
}

for (const name of ["马谡", "王平", "诸葛亮", "张郃", "司马懿", "锋"]) {
  if (!hasVectorHanzi(name)) throw new Error(`Missing vector name: ${name}`);
}

const recipeIds = new Set();
for (const recipe of FORMATION_RECIPES) {
  if (recipeIds.has(recipe.id)) throw new Error(`Duplicate formation id: ${recipe.id}`);
  recipeIds.add(recipe.id);
  if (!/^general\.[a-z]+$/.test(recipe.id)) throw new Error(`Invalid stable formation id: ${recipe.id}`);
  if (recipe.span !== recipe.members.length) throw new Error(`Formation span mismatch: ${recipe.displayName}`);
  if (!GENERAL_COMBAT_CONFIG[recipe.displayName]) throw new Error(`Missing general combat config: ${recipe.displayName}`);
  for (const glyph of recipe.members) {
    if (!GLYPH_ACTORS[glyph]) throw new Error(`Missing glyph actor: ${glyph}`);
    if (!["马", "谡", "王", "平"].includes(glyph)) throw new Error(`Unexpected non-fixed formation glyph: ${glyph}`);
  }
  if (LEGACY_ACTOR_ALIASES[recipe.displayName] !== recipe.id) throw new Error(`Missing legacy alias: ${recipe.displayName}`);
}

if (FORMATION_RECIPES.map((recipe) => recipe.displayName).join(",") !== "马谡,王平") throw new Error("Jieting must expose exactly the two unique field generals");
for (const profile of ["generalGlyph", "generalFormation", "unit", "enemy", "terrain", "prop", "effect"]) {
  if (!STATE_PROFILES[profile]?.length) throw new Error(`Missing state profile: ${profile}`);
}
const glyphStates = stateMatrixForActor("generalGlyph", ["idle"]);
if (glyphStates.attack.status !== "notApplicable" || glyphStates.neutral.status !== "source") throw new Error("Invalid general glyph state policy");
if (SOURCE_STRUCTURES["unit.qiang"]?.kind !== "bakedComposite" || SOURCE_STRUCTURES["unit.qiang"]?.editableParts !== false) throw new Error("Qiang baked source structure is not preserved");
for (const id of ["general.zhaoyun", "general.zhangfei", "general.machao"]) {
  const structure = SOURCE_STRUCTURES[id];
  if (structure?.kind !== "spineParts" || structure.parts?.length !== 2) throw new Error(`Missing paired Spine structure: ${id}`);
  if (structure.parts[0].attack === structure.parts[1].attack) throw new Error(`Paired Spine clips were flattened: ${id}`);
}
if (SOURCE_DISPLAY_POLICY.allowImplicitSplit || SOURCE_DISPLAY_POLICY.allowImplicitMerge) throw new Error("Source-first display policy allows implicit restructuring");

for (const boss of BOSS_ROSTER) {
  if (!boss.name || !boss.skill || (!boss.spineType && boss.displayMode !== "glyph")) throw new Error(`Incomplete boss config: ${JSON.stringify(boss)}`);
}
if (BOSS_ROSTER.find((boss) => boss.name === "张郃")?.hp !== 10.8) throw new Error("Invalid Zhang He health multiplier");

if (JIETING_CAMPAIGN.maxWave !== 8 || JIETING_CAMPAIGN.branchWave !== 8 || JIETING_CAMPAIGN.acts.length !== 3) {
  throw new Error("Invalid 8-wave campaign structure");
}
for (const orderId of ["risky", "steady"]) {
  if (!COMMAND_ORDERS[orderId]?.label || COMMAND_ORDERS[orderId].duration !== 8 || COMMAND_ORDERS[orderId].cooldown !== 12) throw new Error(`Invalid command order: ${orderId}`);
}
if (COMMAND_ORDERS.risky.mountainDamage !== 1.25 || COMMAND_ORDERS.steady.mountainDamage !== 1.05 || GENERAL_COMBAT_CONFIG["马谡"]?.damage !== 5) {
  throw new Error("Invalid restrained Ma Su balance");
}
if (SUPPLY_CONFIG.max !== 100 || SUPPLY_CONFIG.recruitPenalty !== 4 || SUPPLY_CONFIG.brokenRecoveryCap !== 30) {
  throw new Error("Invalid supply-line configuration");
}
if (!JIETING_CAMPAIGN.routes.retreat || !JIETING_CAMPAIGN.routes.hold || !JIETING_CAMPAIGN.endings.defeat) {
  throw new Error("Missing campaign routes or endings");
}
const enemyGlyphs = Object.values(ENEMY_ARCHETYPES).map((enemy) => enemy.glyph);
if (enemyGlyphs.join("") !== "魏骑军锋" || enemyGlyphs.some((glyph) => [...glyph].length !== 1)) {
  throw new Error("Enemy archetypes must use the four approved single glyphs");
}

const forbiddenLegacyGlyphs = ["赵", "云", "飞", "超", "黄", "忠"];
for (const glyph of forbiddenLegacyGlyphs) {
  if (Object.prototype.hasOwnProperty.call(JIETING_DECK_WEIGHTS, glyph)) throw new Error(`Legacy glyph leaked into Jieting deck: ${glyph}`);
}
for (const recipe of FORMATION_RECIPES) {
  if (!["马谡", "王平"].includes(recipe.displayName)) throw new Error(`Legacy general leaked into Jieting runtime: ${recipe.displayName}`);
}

console.log("Jieting scenario animation config looks good.");
