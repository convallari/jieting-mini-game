import { FORMATION_RECIPES as ALL_FORMATION_RECIPES } from "./actorAssetSchema.js";

export const SCENARIO_TEXT = {
  title: "街亭之战",
  subtitle: "蜀营 一",
  stageName: "街亭",
  resourceName: "军粮",
  defenseName: "蜀营",
  defenseHit: "营 -1",
  startHint: "全程共8波 · 点击征兵，再拖到黄光阵地",
  recruitInsufficient: "军粮不足",
  victoryTitle: "守住街亭",
  victorySub: "成功守住街亭八波魏军",
  defeatTitle: "街亭失守",
  defeatSub: "蜀军营寨被攻破",
  waveIncoming: (wave) => `第${wave}波 / 共8波 · 魏军来袭`
};

export const COMMAND_ORDERS = {
  risky: {
    id: "risky", shortLabel: "险", label: "马谡险策", color: "#a83a2d",
    mountainDamage: 1.25, mountainRange: 0.5, supplyDamage: 1.5,
    offMountainCooldown: 1.1, duration: 8, cooldown: 12
  },
  steady: {
    id: "steady", shortLabel: "稳", label: "王平稳阵", color: "#3e7561",
    mountainDamage: 1.05, auraCooldown: 0.8, supplyDamage: 0.5,
    controlDuration: 0.5, duration: 8, cooldown: 12
  }
};

export const SUPPLY_CONFIG = {
  max: 100,
  normalDamage: 5,
  eliteDamage: 12,
  steadyRecovery: 10,
  brokenRecoveryCap: 30,
  recruitPenalty: 4,
  masuBrokenDamage: 0.72,
  masuBrokenCooldown: 1.2
};

export const JIETING_CAMPAIGN = {
  maxWave: 8,
  branchWave: 8,
  acts: [
    { id: "mountain", label: "抢占山道", from: 1, to: 3, bossWave: 2, bossIndex: 1 },
    { id: "water", label: "断绝汲道", from: 4, to: 7, bossWave: 4, bossIndex: 0 },
    { id: "decision", label: "街亭抉择", from: 8, to: 8, bossWave: 8, bossIndex: 2 }
  ],
  routes: {
    retreat: { id: "retreat", label: "王平断后", countMultiplier: 0.8, speedMultiplier: 1.15, requiredProgress: 1 },
    hold: { id: "hold", label: "坚守街亭", countMultiplier: 1.3, hpMultiplier: 1.3, requiredCampHp: 2, requiredSupply: 30 }
  },
  endings: {
    retreat: { title: "全军而退", sub: "王平断后，蜀军主力得以保全" },
    hold: { title: "逆转街亭", sub: "守住汲道，击退魏军总攻" },
    defeat: { title: "街亭失守", sub: "蜀军营寨被攻破" }
  }
};

export const JIETING_TERRAIN = {
  mountain: new Set(["2,3", "2,4", "2,5", "3,3", "3,4", "3,5"]),
  openingDeployment: new Set(["1,2", "1,3", "1,4", "1,5", "2,3", "2,4", "2,5", "3,3", "3,4", "3,5", "4,4", "4,5", "4,6", "6,1", "6,2", "7,1", "7,2", "8,1", "8,2", "8,6", "8,7", "9,6", "9,7"]),
  water: new Set(["4,3", "5,3", "6,3", "7,3"]),
  waterDefense: new Set(["6,1", "6,2", "7,1", "7,2"]),
  camp: new Set(["8,6", "8,7", "9,6", "9,7"]),
  waterPressureWaves: new Set([4, 5, 6, 7, 8])
};

export const ENEMY_ARCHETYPES = {
  wei: { glyph: "魏", hp: 1, speed: 1, unlockWave: 1, weight: 6 },
  qi: { glyph: "骑", hp: 0.75, speed: 1.35, unlockWave: 3, weight: 3 },
  jun: { glyph: "军", hp: 1.6, speed: 0.78, unlockWave: 5, weight: 2 },
  feng: { glyph: "锋", hp: 2, speed: 1.15, unlockWave: 7, weight: 1 }
};

export const WEAPON_CONFIG = {
  dao: { glyph: "刀", name: "刀", range: 1.5, cooldown: 0.8, damage: 3, targetPolicy: "nearest", color: "#f3e7c6", kind: "melee", animationPreset: "meleeSlash" },
  gong: { glyph: "弓", name: "弓", range: 3.5, cooldown: 0.8, damage: 2, targetPolicy: "closest_end", color: "#eef0ff", kind: "arrow", animationPreset: "bowVolley" },
  qiang: { glyph: "枪", name: "枪", range: 2.5, cooldown: 0.8, damage: 2, targetPolicy: "nearest", color: "#e8f0d4", kind: "stab", animationPreset: "spearPierce" },
  ji: { glyph: "骑", name: "骑", range: 2, cooldown: 0.8, damage: 2, targetPolicy: "nearest", color: "#f4dfd5", kind: "dash", animationPreset: "cavalryRush" }
};

export const GENERAL_COMBAT_CONFIG = {
  "马谡": { range: 3.2, damage: 5, cooldown: 0.9, targetPolicy: "closest_end", attackType: "pierce", animationPreset: "bowVolley", trait: "riskyMountain" },
  "王平": { range: 2.7, damage: 5, cooldown: 0.85, targetPolicy: "nearest", attackType: "pierce", animationPreset: "spearPierce", trait: "steadyAura" }
};

export const ELITE_GENERALS = new Set(["马谡", "王平"]);

const JIETING_FORMATION_NAMES = new Set(["马谡", "王平"]);
export const FORMATION_RECIPES = ALL_FORMATION_RECIPES.filter((recipe) => JIETING_FORMATION_NAMES.has(recipe.displayName));

export const JIETING_DECK_WEIGHTS = {
  "刀": 18, "弓": 20, "枪": 18, "骑": 14, "铲": 18
};

export const ATTACK_SOUND_BY_TOKEN = {
  dao: "knife_attack",
  gong: "bow_attack",
  qiang: "general_pike_attack",
  ji: "cavalry_attack",
  "马谡": "bow_attack",
  "王平": "general_pike_attack"
};

export const BOSS_SOUND_BY_SKILL = {
  pressure: "chain_lock",
  waterCut: "skill_ink_splash",
  command: "caoCao_skill_seal",
  chaos: "chain_lock",
  revive: "boss_sweep_skill",
  inspire: "boss_sweep_skill",
  demolish: "bulldozer_land",
  rain: "zhenFu_skill_rain",
  charm: "diaoChan_skill_charm",
  cavalry: "summon_cavalry_skill",
  halberd: "luBu_skill",
  devour: "dongZhuo_skill_phase1_suck",
  frenzy: "maChao_attack_lightning",
  blind: "boss_sweep_skill",
  seal: "caoCao_skill_seal"
};

export const BOSS_ROSTER = [
  { name: "张郃", spineType: "zhangLiang", hp: 10.8, range: 2.5, skillCooldown: 8, skill: "pressure", castDuration: 1.2, effectAt: 0.45, color: "#b9362f" },
  { name: "锋", spineType: null, displayMode: "glyph", hp: 8, range: 0, skillCooldown: 9, skill: "waterCut", castDuration: 0.8, effectAt: 0.35, color: "#416f8f" },
  { name: "司马懿", spineType: null, displayMode: "glyph", hp: 14, range: 10, skillCooldown: 13, skill: "command", castDuration: 1.7, effectAt: 0.8, color: "#1b2f69" }
];
