import { ENEMY_GLYPHS, combinePoses, getHanziAsset, sampleMotion } from "./hanziAssets.js";
import { drawVectorHanzi, hasVectorHanzi } from "./vectorHanzi.js";
import { drawWeaponGlyphSprite, getWeaponAnimationTiming, hasWeaponGlyphSprite, preloadWeaponGlyphSprites } from "./weaponGlyphSprites.js";
import { drawOriginalHitEffect, getOriginalHitEffectTiming, hitEffectForToken, preloadOriginalHitEffects } from "./originalHitEffects.js";
import { drawOriginalFarmer, preloadOriginalUnitSprites } from "./originalUnitSprites.js";
import { ACTIVE_PROP_CONFIG, drawOriginalPropSprite, preloadOriginalPropSprites } from "./originalPropSprites.js";
import { hasOriginalGeneralAnimation, initSpineGameLayer, isADouAnimationReady, isOriginalEnemyReady, isOriginalGeneralReady, resizeSpineGameLayer, syncADouAnimations, syncEnemyAnimations, syncGeneralAnimations } from "./spineGameLayer.js";
import { PLAYER_MAP_GRID, PLAYER_PATHS, playerCellType } from "./originalMapConfig.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const AUDIO_ROOT = "/original-audio/";
const audioEngine = {
  unlocked: false,
  muted: false,
  pending: [],
  unlock() {
    this.unlocked = true;
    const pending = this.pending.splice(0);
    for (const event of pending) this._play(event.name, event.ext, event.volume);
  },
  _play(name, ext, volume) {
    if (this.muted || !name) return;
    const audio = new Audio(`${AUDIO_ROOT}${name}.${ext}`);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
  },
  play(name, volume = 0.42) {
    if (!name || this.muted) return;
    if (!this.unlocked) {
      if (this.pending.length < 48) this.pending.push({ name, ext: "mp3", volume });
      return;
    }
    this._play(name, "mp3", volume);
  },
  voice(name, volume = 0.5) {
    if (!name || this.muted) return;
    if (!this.unlocked) {
      if (this.pending.length < 48) this.pending.push({ name, ext: "wav", volume });
      return;
    }
    this._play(name, "wav", volume);
  }
};

const BOARD_COLS = PLAYER_MAP_GRID.length;
const BOARD_ROWS = PLAYER_MAP_GRID[0].length;
const CAMP_SIZE = 5;

const pathKeySet = new Set(Object.values(PLAYER_PATHS).flat().map(([r, c]) => `${r},${c}`));
const blockedSet = new Set();
const initialCultivated = new Set();
const staticCultivatedSet = new Set();
for (let r = 0; r < BOARD_ROWS; r++) {
  for (let c = 0; c < BOARD_COLS; c++) {
    const type = playerCellType(r, c);
    if (type?.startsWith("2_")) blockedSet.add(`${r},${c}`);
    else if (type?.startsWith("1_")) {
      staticCultivatedSet.add(`${r},${c}`);
      if (type.endsWith("_0")) initialCultivated.add(`${r},${c}`);
    }
  }
}

const weapons = {
  dao: { glyph: "刀", name: "刀", range: 1.5, cooldown: 0.8, damage: 3, targetPolicy: "nearest", color: "#f3e7c6", kind: "melee" },
  gong: { glyph: "弓", name: "弓", range: 3.5, cooldown: 0.8, damage: 2, targetPolicy: "closest_end", color: "#eef0ff", kind: "arrow" },
  qiang: { glyph: "枪", name: "枪", range: 2.5, cooldown: 0.8, damage: 2, targetPolicy: "nearest", color: "#e8f0d4", kind: "stab" },
  ji: { glyph: "骑", name: "骑", range: 2, cooldown: 0.8, damage: 2, targetPolicy: "nearest", color: "#f4dfd5", kind: "dash" }
};

const ATTACK_SOUND_BY_TOKEN = {
  dao: "knife_attack",
  gong: "bow_attack",
  qiang: "general_pike_attack",
  ji: "cavalry_attack",
  "赵云": "general_pike_attack",
  "张飞": "knife_attack",
  "马超": "maChao_attack_lightning",
  "关羽": "knife_attack",
  "黄忠": "bow_attack",
  "关平": "knife_attack",
  "关兴": "knife_attack",
  "张苞": "general_pike_attack",
  "张翼": "knife_attack",
  "黄盖": "knife_attack",
  "刘备": "knife_attack",
  "黄祖": "knife_attack"
};
const BOSS_SOUND_BY_SKILL = {
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

const SOLDIER_LEVEL_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.4125];
const GENERAL_SPEED_MULTIPLIERS = [1, 1.3, 1.56, 1.794, 1.9734];
const GENERAL_DAMAGE_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.276];
const FARMER_CYCLE_SECONDS = [20, 10, 5, 3, 2];
const RAIN_ATTACK_SPEED_FACTOR = 0.8;
const ELITE_GENERAL_EXP = [0, 10, 35, 75, 130];
const REGULAR_GENERAL_EXP = [0, 8, 23];
const ELITE_GENERALS = new Set(["赵云", "张飞", "马超", "关羽", "黄忠", "刘备"]);
const GENERAL_COMBAT_CONFIG = {
  "赵云": { range: 2.5, damage: 2, cooldown: 0.8, targetPolicy: "closest_end", attackType: "pierce" },
  "张飞": { range: 2.5, damage: 10, cooldown: 1, targetPolicy: "nearest", attackType: "area", releaseRatio: 0.1 },
  "马超": { range: 2.5, damage: 10, cooldown: 1, targetPolicy: "nearest", attackType: "single" },
  "关羽": { range: 2.5, damage: 20, cooldown: 1, targetPolicy: "nearest", attackType: "area" },
  "黄忠": { range: 4.5, damage: 6, cooldown: 0.8, targetPolicy: "nearest", attackType: "pierce" },
  "关平": { range: 2.5, damage: 3, cooldown: 1, targetPolicy: "nearest", attackType: "area" },
  "关兴": { range: 2.5, damage: 7, cooldown: 1, targetPolicy: "closest_end", attackType: "area" },
  "张苞": { range: 2.5, damage: 7, cooldown: 1, targetPolicy: "closest_end", attackType: "pierce" },
  "张翼": { range: 2.5, damage: 7, cooldown: 1, targetPolicy: "closest_end", attackType: "single" },
  "黄盖": { range: 2.5, damage: 8, cooldown: 1, targetPolicy: "nearest", attackType: "single" },
  "刘备": { range: 2.5, damage: 10, cooldown: 0.8, targetPolicy: "nearest", attackType: "single" },
  "黄祖": { range: 3.5, damage: 6, cooldown: 0.8, targetPolicy: "closest_end", attackType: "single" }
};
const ENEMY_HP_BY_LEVEL = [10, 16, 26, 41, 61, 92, 138, 200, 291, 421, 611, 886, 1285, 1863, 2701, 3917, 5680, 8235, 11941, 17315];
const ENEMY_COUNT_BY_LEVEL = [10, 11, 12, 13, 15, 16, 18, 19, 21, 24, 26, 29, 31, 35, 38, 42, 46, 51, 56, 61];
const BOSS_WAVES = [3, 6, 9, 12, 15, 18];
const BOSS_WAVE_CHANCES = [0.1, 0.2, 0.3, 0.5, 0.9, 1];
const BEST_WAVE_STORAGE_KEY = "jieting.bestWave";
const CURRENT_MAP_BOSS_INDEX = 0;
const BOSS_ROSTER = [
  { name: "张梁", spineType: "zhangLiang", hp: 7, range: 2, skillCooldown: 8, skill: "chaos", castDuration: 1.667, effectAt: 0.5, color: "#ed462f" },
  { name: "张宝", spineType: "zhangBao", hp: 10, range: 3, skillCooldown: 8, skill: "revive", castDuration: 2, effectAt: 0, color: "#32ee3a" },
  { name: "张角", spineType: "zhangJiao", hp: 14, range: 2, skillCooldown: 10, skill: "inspire", castDuration: 1, effectAt: 0.5, color: "#27c8ff" },
  { name: "孙尚香", spineType: "sunShangXiang", hp: 7, range: 10, skillCooldown: 10, skill: "demolish", castDuration: 1, effectAt: 0.5, color: "#f16fe1" },
  { name: "甄宓", spineType: "zhenFu", hp: 10, range: 10, skillCooldown: 3, skill: "rain", castDuration: 1, effectAt: 1, color: "#68b4ff" },
  { name: "貂蝉", spineType: "diaoChan", hp: 14, range: 10, skillCooldown: 10, skill: "charm", castDuration: 2.333, effectAt: 0, color: "#d9207a" },
  { name: "华雄", spineType: "huaXiong", hp: 7, range: 0, skillCooldown: 8, skill: "cavalry", castDuration: 0.767, effectAt: 0.367, color: "#4db678" },
  { name: "吕布", spineType: "lvBu", hp: 10, range: 2.5, skillCooldown: 10, skill: "halberd", castDuration: 1.733, effectAt: 0.65, color: "#fb4c54" },
  { name: "董卓", spineType: "dongZhuo", hp: 14, range: 1.5, skillCooldown: 10, skill: "devour", castDuration: 2.067, effectAt: 0.5, recoveryDuration: 0.733, color: "#7447a6" },
  { name: "典韦", spineType: "dianWei", hp: 7, range: 2, skillCooldown: 15, skill: "frenzy", castDuration: 0.5, effectAt: 0.5, color: "#fb2500" },
  { name: "夏侯惇", spineType: "xiaHouDun", hp: 10, range: 2, skillCooldown: 8, skill: "blind", castDuration: 2.333, effectAt: 1, color: "#21b2ff" },
  { name: "曹操", spineType: "caoCao", hp: 14, range: 10, skillCooldown: 15, skill: "seal", castDuration: 1.733, effectAt: 1.733, color: "#010b97" }
];
const PREPARE_SECONDS = 10;
const SPAWN_INTERVAL_SECONDS = 1.5;
const WAVE_GAP_SECONDS = 5;
const MAX_WAVE = ENEMY_COUNT_BY_LEVEL.length;

const charPairs = [
  { first: "刘", second: "备", general: "刘备" },
  { first: "赵", second: "云", general: "赵云" },
  { first: "关", second: "羽", general: "关羽" },
  { first: "关", second: "平", general: "关平" },
  { first: "关", second: "兴", general: "关兴" },
  { first: "张", second: "飞", general: "张飞" },
  { first: "张", second: "苞", general: "张苞" },
  { first: "张", second: "翼", general: "张翼" },
  { first: "马", second: "超", general: "马超" },
  { first: "黄", second: "忠", general: "黄忠" },
  { first: "黄", second: "盖", general: "黄盖" },
  { first: "黄", second: "祖", general: "黄祖" }
];

const BASIC_DECK_TOKENS = new Set(["刀", "弓", "枪", "骑", "铲", "农"]);
const ENABLE_FARMER_ABILITY = true;
const ORIGINAL_DECK_WEIGHTS = {
  "刀": 21, "弓": 19, "枪": 18, "骑": 17, "铲": 11,
  "刘": 1, "备": 1, "赵": 2, "云": 1, "关": 1, "羽": 1, "平": 1, "兴": 1,
  "马": 2, "超": 1, "张": 2, "飞": 1, "苞": 1, "翼": 1,
  "黄": 2, "忠": 1, "盖": 1, "祖": 1
};

function createOriginalDeckPool(includeNewPlayerShovels = true) {
  const pool = [];
  for (const [token, count] of Object.entries(ORIGINAL_DECK_WEIGHTS)) {
    for (let i = 0; i < count; i++) pool.push(token);
  }
  if (includeNewPlayerShovels) pool.push("铲", "铲");
  if (ENABLE_FARMER_ABILITY) pool.push("农");
  return pool;
}

function internalToken(originalToken) {
  return { "刀": "dao", "弓": "gong", "枪": "qiang", "骑": "ji", "铲": "shovel", "农": "farmer" }[originalToken] ?? originalToken;
}

let idSeq = 1;
let state = createState();
let layout = {};
let lastTime = performance.now();
let pointer = null;
const debugParams = new URLSearchParams(window.location.search);
const DEBUG_ATTACK = debugParams.has("debugAttack");
const DEBUG_GENERAL_IDLE = debugParams.has("debugGeneralIdle");
const DEBUG_GENERIC_GENERALS = debugParams.has("debugGeneric");
const DEBUG_STATE = debugParams.has("debugState");
const DEBUG_END = debugParams.get("debugEnd");
const DEBUG_TIME_SCALE = Math.max(0.1, Math.min(20, Number(debugParams.get("debugTimeScale") ?? 1) || 1));
const DEBUG_BOSS_INDEX = Math.max(0, Math.min(BOSS_ROSTER.length - 1, Number(debugParams.get("debugBoss") ?? 0) || 0));
if (DEBUG_STATE || DEBUG_ATTACK) {
  window.__jietingDebugState = () => ({
    mode: state.mode,
    paused: state.paused,
    menuPanel: state.menuPanel,
    wave: state.wave,
    wavePhase: state.wavePhase,
    waveTimer: state.waveTimer,
    spawnLeft: state.spawnLeft,
    buns: state.buns,
    refreshCost: state.refreshCost,
    playerDeckSize: state.playerDeckPool?.length,
    playerBoard: [...state.board.entries()].map(([key, unit]) => [key, unit.token ?? unit.type, unit.level ?? 0, unit.experience ?? 0, Boolean(unit.confused), Boolean(unit.rained), Boolean(unit.charmed), Boolean(unit.knockedDown), Boolean(unit.sealed), Math.ceil(unit.mergeLockedLeft ?? 0)]),
    enemies: state.enemies.map((enemy) => {
      const pos = enemyPosition(enemy);
      return [enemy.spineType, enemy.t, enemy.hp, enemy.bossSkillTimer ?? null, enemy.bossCastingLeft ?? 0, Boolean(enemy.bossSkillApplied), enemy.bossRecoveryLeft ?? 0, enemy.chaosAffected?.size ?? 0, Math.round(pos.x), Math.round(pos.y), enemy.bossChargePhase ?? null, enemy.maxHp, enemy.inspireLeft ?? 0, enemy.reviveCount ?? 0, Boolean(enemy.revived), enemy.slowLeft ?? 0];
    }),
    hitAudit: state.hitAudit,
    cultivated: [...state.cultivated],
    hp: state.douHp,
    blindLeft: state.blindLeft,
    inkEffects: state.inkEffects.length,
    pendingRevives: state.pendingRevives.length,
    reviveAudit: state.reviveAudit,
    bestWave: state.bestWave
  });
}
preloadWeaponGlyphSprites();
preloadOriginalHitEffects();
preloadOriginalUnitSprites();
preloadOriginalPropSprites();
initSpineGameLayer(canvas.clientWidth, canvas.clientHeight);

function createState() {
  return {
    mode: "menu",
    buns: 20,
    displayedBuns: 20,
    refreshCost: 10,
    playerDeckPool: createOriginalDeckPool(),
    wave: 0,
    wavePhase: "prepare",
    waveTimer: PREPARE_SECONDS,
    spawnLeft: 0,
    bossSequence: 0,
    selectedProp: null,
    propCooldowns: { trap: 0, landmine: 0, inkstone: 0 },
    traps: [],
    landmines: [],
    inkEffects: [],
    fallenEnemies: [],
    deathSeq: 0,
    pendingRevives: [],
    reviveAudit: 0,
    bossBlocked: new Set(),
    rainLeft: 0,
    blindLeft: 0,
    douHp: { left: 3, right: 3 },
    paused: false,
    cultivated: new Set(initialCultivated),
    board: new Map(),
    camp: new Array(CAMP_SIZE).fill(null),
    enemies: [],
    projectiles: [],
    hitSprites: [],
    hitAudit: {},
    charmLinks: [],
    particles: [],
    strokes: [],
    ghosts: [],
    absorbs: [],
    floats: [],
    pulses: [],
    shakes: [],
    recruits: [],
    messages: [],
    drag: null,
    menuPanel: null,
    bestWave: readBestWave(),
    banner: null
  };
}

function makeUnit(token, level = 1) {
  const isWeapon = Boolean(weapons[token]);
  const isGeneral = charPairs.some((pair) => pair.general === token);
  return {
    id: idSeq++,
    token,
    level,
    type: isWeapon ? "weapon" : isGeneral ? "general" : token === "shovel" ? "shovel" : token === "farmer" ? "farmer" : "char",
    attackTimer: 0,
    farmTimer: 0,
    farmMode: null,
    farmCrazyLeft: 0,
    experience: 0,
    action: "idle",
    actionAge: 0,
    actionLife: 1,
    actionDx: 0,
    actionDy: 0,
    placedAt: performance.now(),
    wobble: Math.random() * Math.PI * 2
  };
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  computeLayout(rect.width, rect.height);
  resizeSpineGameLayer(rect.width, rect.height);
}

function computeLayout(w, h) {
  const safeTop = Math.max(8, Math.min(20, h * 0.018));
  const topH = Math.max(68, Math.min(86, h * 0.1));
  const bottomH = Math.max(142, Math.min(174, h * 0.19));
  const availableH = h - topH - bottomH - 20;
  const cell = Math.floor(Math.min((w - 22) / BOARD_COLS, availableH / BOARD_ROWS));
  const boardW = cell * BOARD_COLS;
  const boardH = cell * BOARD_ROWS;
  const boardX = Math.round((w - boardW) / 2);
  const boardY = Math.round(topH + Math.max(4, (availableH - boardH) * 0.2));
  const campY = boardY + boardH + 12;
  const slot = Math.min(55, Math.floor((w - 92) / CAMP_SIZE));
  layout = {
    w, h, safeTop, topH, bottomH, cell, boardX, boardY, boardW, boardH,
    campY, slot,
    campX: Math.round((w - slot * CAMP_SIZE - 10 * (CAMP_SIZE - 1)) / 2 + 20),
    recruit: { x: Math.round(w / 2 - 76), y: campY + slot + 14, w: 152, h: 54 },
    start: { x: Math.round(w / 2 - 108), y: Math.round(h * 0.68), w: 216, h: 64 },
    pause: { x: 14, y: safeTop + 4, r: 17 },
    codex: { x: 15, y: campY + 10, w: 42, h: 42 }
  };
  layout.propSlots = Object.keys(ACTIVE_PROP_CONFIG).map((key, index) => ({
    key,
    x: Math.min(w - 38, boardX + boardW - 30),
    y: Math.round(boardY + boardH / 2 - 50 + index * 38),
    w: 34,
    h: 34
  }));
}

new ResizeObserver(resize).observe(canvas);
resize();

function startGame() {
  audioEngine.unlock();
  audioEngine.play("match_drum", 0.34, 0.2);
  audioEngine.voice("zhaoYun_voice_entrance", 0.32);
  state = createState();
  state.mode = "play";
  if (DEBUG_ATTACK) setupDebugAttack();
  if (DEBUG_END === "win" || DEBUG_END === "lose") {
    state.wave = DEBUG_END === "win" ? MAX_WAVE : 3;
    recordBestWave(state.wave);
    state.mode = "end";
    state.banner = DEBUG_END === "win"
      ? { title: "胜利", sub: "成功守住全部二十波敌军", won: true }
      : { title: "失败", sub: "我方防线被攻破", won: false };
  }
  toast(DEBUG_ATTACK ? "攻击动画预览" : "消耗馒头刷新五格，再拖到己方阵地", "#f3c037");
}

function setupDebugAttack() {
  state.buns = 120;
  state.displayedBuns = 120;
  state.wave = 3;
  state.wavePhase = "combat";
  state.spawnLeft = DEBUG_GENERAL_IDLE ? 999 : 0;
  state.waveTimer = 999;
  state.camp = new Array(CAMP_SIZE).fill(null);
  state.board.clear();
  const previewUnits = [
    ["2,3", makeUnit("qiang", 3)],
    ["3,4", makeUnit("dao", 3)],
    ["5,2", makeUnit("gong", 3)],
    ["7,3", makeUnit("ji", 3)],
    ["1,3", makeUnit("farmer", 3)],
    ["1,4", makeUnit(DEBUG_GENERIC_GENERALS ? "关羽" : "赵云", 3)],
    ["4,1", makeUnit(DEBUG_GENERIC_GENERALS ? "黄忠" : "张飞", 3)],
    ["8,4", makeUnit(DEBUG_GENERIC_GENERALS ? "刘备" : "马超", 3)]
  ];
  for (const [key, unit] of previewUnits) {
    unit.attackTimer = 0.04 + Math.random() * 0.08;
    if (unit.type === "general") unit.span = 2;
    state.board.set(key, unit);
    if (unit.type === "farmer") {
      const { r, c } = keyToCell(key);
      activateFarmerForCell(unit, r, c);
    }
    if (unit.span === 2) {
      const { r, c } = keyToCell(key);
      state.board.set(`${r},${c + 1}`, { type: "general-reserved", ownerId: unit.id, ownerKey: key });
    }
  }
  if (DEBUG_GENERAL_IDLE) return;
  state.enemies.push({
    id: idSeq++,
    t: 3.1,
    pathSide: "left",
    speed: 0.055,
    hp: 520,
    maxHp: 520,
    glyph: "贼",
    spineType: "thief",
    lane: 0,
    wobble: 0.2,
    hitFlash: 0,
    hitAge: 99,
    hitDx: 0,
    hitDy: 0,
    spawnAge: 1,
    dead: false
  });
  const debugBoss = BOSS_ROSTER[DEBUG_BOSS_INDEX];
  state.enemies.push({
    id: idSeq++,
    t: 5.35,
    pathSide: "right",
    speed: 0.045,
    hp: 5000,
    maxHp: 5000,
    glyph: debugBoss.name,
    spineType: debugBoss.spineType,
    bossIndex: DEBUG_BOSS_INDEX,
    bossSkillTimer: 0.25,
    spineVariant: 0,
    lane: -0.12,
    wobble: 1.7,
    hitFlash: 0,
    hitAge: 99,
    hitDx: 0,
    hitDy: 0,
    spawnAge: 1,
    dead: false
  });
  if (DEBUG_BOSS_INDEX === 1) {
    for (let i = 0; i < 3; i++) {
      state.enemies.push({
        id: idSeq++, t: 4.95 + i * 0.22, pathSide: "right", speed: 0.015,
        hp: 40, maxHp: 40, glyph: "贼", spineType: "thief", lane: (i - 1) * 0.12,
        wobble: 3 + i, hitFlash: 0, hitAge: 99, hitDx: 0, hitDy: 0,
        spawnAge: 1, dead: false, reviveTestVictim: true
      });
    }
  }
  if (DEBUG_BOSS_INDEX === 2) {
    for (let i = 0; i < 2; i++) {
      state.enemies.push({
        id: idSeq++, t: 5.05 + i * 0.35, pathSide: "right", speed: 0.01,
        hp: 1000, maxHp: 1000, glyph: "贼", spineType: "thief", lane: (i - 0.5) * 0.14,
        wobble: 5 + i, hitFlash: 0, hitAge: 99, hitDx: 0, hitDy: 0,
        spawnAge: 1, dead: false, inspireTestAlly: true
      });
    }
  }
  state.enemies.push({
    id: idSeq++,
    t: 6.25,
    pathSide: "left",
    speed: 0.04,
    hp: 680,
    maxHp: 680,
    glyph: "寇",
    spineType: "boss1",
    spineVariant: 1,
    lane: 0.08,
    wobble: 2.8,
    hitFlash: 0,
    hitAge: 99,
    hitDx: 0,
    hitDy: 0,
    spawnAge: 1,
    dead: false
  });
  state.enemies.push({
    id: idSeq++, t: 8.1, pathSide: "right", speed: 0.035, hp: 760, maxHp: 760, glyph: "寇", spineType: "boss2", spineVariant: 2,
    lane: -0.08, wobble: 3.6, hitFlash: 0, hitAge: 99, hitDx: 0, hitDy: 0,
    spawnAge: 1, dead: false
  });
}

// Debug review links should open directly on the animation under review.
// Keeping the menu in front made repeated cadence checks unnecessarily ambiguous.
if (DEBUG_ATTACK) startGame();

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000) * DEBUG_TIME_SCALE;
  lastTime = now;
  update(dt, now / 1000);
  draw(now / 1000);
  syncOriginalGeneralLayer();
  syncOriginalEnemyLayer();
  syncOriginalADouLayer();
  if (DEBUG_STATE || DEBUG_ATTACK) canvas.dataset.debugState = JSON.stringify(window.__jietingDebugState());
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt, time) {
  updateParticles(dt);
  updateBuns(dt);

  if (state.mode !== "play" || state.paused) return;

  updateWaveFlow(dt);
  updateActiveProps(dt);

  updateEnemies(dt);
  updateUnits(dt);
  if (state.drag?.unit) updateUnitAction(state.drag.unit, dt);
  updateProjectiles(dt);
}

function maybeSpawnBoss() {
  const bossWaveIndex = BOSS_WAVES.indexOf(state.wave);
  if (bossWaveIndex < 0 || Math.random() >= BOSS_WAVE_CHANCES[bossWaveIndex]) return;
  const bossIndex = CURRENT_MAP_BOSS_INDEX;
  state.bossSequence += 1;
  spawnEnemy(true, 0, bossIndex, "left");
  spawnEnemy(true, 0, bossIndex, "right");
}

function updateActiveProps(dt) {
  for (const key of Object.keys(state.propCooldowns)) state.propCooldowns[key] = Math.max(0, state.propCooldowns[key] - dt);
  for (const effect of state.inkEffects) effect.age += dt;
  state.inkEffects = state.inkEffects.filter((effect) => effect.age < effect.life);
  for (const trap of state.traps) if (trap.triggered) trap.age += dt;
  state.traps = state.traps.filter((trap) => !trap.triggered || trap.age < 5);

  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.dying) continue;
    enemy.stunLeft = Math.max(0, (enemy.stunLeft ?? 0) - dt);
    enemy.slowLeft = Math.max(0, (enemy.slowLeft ?? 0) - dt);
    const path = pathForEnemy(enemy);
    const cell = path[Math.min(path.length - 1, Math.floor(enemy.t))];
    if (!cell) continue;
    const key = `${cell[0]},${cell[1]}`;
    const trap = state.traps.find((item) => !item.triggered && item.key === key);
    if (trap) {
      trap.triggered = true;
      trap.age = 0;
      enemy.stunLeft = Math.max(enemy.stunLeft, 5);
      const center = cellCenter(cell[0], cell[1]);
      pulseAt(center.x, center.y, "#6d4a32", layout.cell * 0.7);
    }
    const mine = state.landmines.find((item) => item.key === key);
    if (mine) triggerLandmine(mine);
  }
}

function triggerLandmine(mine) {
  state.landmines = state.landmines.filter((item) => item !== mine);
  const center = cellCenter(mine.r, mine.c);
  pulseAt(center.x, center.y, "#ef6b32", layout.cell * 1.4);
  shake(0.18, 4.5);
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.dying) continue;
    const pos = enemyPosition(enemy);
    if (Math.hypot(pos.x - center.x, pos.y - center.y) > layout.cell * 1.05) continue;
    enemy.hp = 0;
    enemy.dying = true;
    enemy.deathAge = 0;
    enemy.deathLife = enemy.spineType === "thief" ? 2.05 : 0.7;
    enemyDeathFx(pos.x, pos.y, enemy);
    dropBun(pos.x, pos.y, enemy.spineType === "thief" ? 1 : 10, enemy.pathSide);
  }
}

function updateWaveFlow(dt) {
  if (DEBUG_ATTACK) return;
  state.waveTimer = Math.max(0, state.waveTimer - dt);

  if (state.wavePhase === "prepare") {
    if (state.waveTimer <= 0) startWave(1);
    return;
  }

  if (state.wavePhase === "spawning") {
    if (state.waveTimer <= 0 && state.spawnLeft > 0) {
      spawnEnemy(false, 0, 0, "left");
      spawnEnemy(false, 0, 0, "right");
      state.spawnLeft -= 1;
      state.waveTimer = state.spawnLeft > 0 ? SPAWN_INTERVAL_SECONDS : 0;
    }
    if (state.spawnLeft === 0) state.wavePhase = "clearing";
    return;
  }

  if (state.wavePhase === "clearing") {
    if (state.enemies.length > 0) return;
    if (state.wave >= MAX_WAVE) {
      state.mode = "end";
      audioEngine.play("battle_end_gold_fly", 0.38, 0.25);
      state.banner = { title: "胜利", sub: "成功守住全部二十波敌军", won: true };
      return;
    }
    state.wavePhase = "gap";
    state.waveTimer = WAVE_GAP_SECONDS;
    return;
  }

  if (state.wavePhase === "gap" && state.waveTimer <= 0) startWave(state.wave + 1);
}

function startWave(wave) {
  state.wave = wave;
  recordBestWave(wave);
  state.wavePhase = "spawning";
  state.spawnLeft = ENEMY_COUNT_BY_LEVEL[Math.min(ENEMY_COUNT_BY_LEVEL.length - 1, wave - 1)];
  state.waveTimer = 0;
  audioEngine.play(wave === 1 ? "match_drum" : "enemy_hit", wave === 1 ? 0.28 : 0.16, 0.2);
  maybeSpawnBoss();
  pulseAt(layout.w / 2, layout.safeTop + 36, "#f3c037", 36);
  toast(`第${wave}波敌军来袭`, "#d34331");
}

function readBestWave() {
  try {
    return Math.max(0, Number.parseInt(window.localStorage.getItem(BEST_WAVE_STORAGE_KEY) ?? "0", 10) || 0);
  } catch {
    return 0;
  }
}

function recordBestWave(wave) {
  const best = readBestWave();
  state.bestWave = Math.max(state.bestWave ?? 0, best, wave);
  if (wave <= best) return;
  try {
    window.localStorage.setItem(BEST_WAVE_STORAGE_KEY, String(wave));
  } catch {
    // Restricted storage must not interrupt gameplay.
  }
}

function spawnEnemy(isBoss = false, lane = 0, bossIndex = 0, pathSide = "left") {
  const baseHp = ENEMY_HP_BY_LEVEL[Math.min(ENEMY_HP_BY_LEVEL.length - 1, state.wave - 1)];
  const boss = BOSS_ROSTER[bossIndex] ?? BOSS_ROSTER[0];
  const hp = baseHp * (isBoss ? boss.hp : 1);
  state.enemies.push({
    id: idSeq++,
    t: 0,
    pathSide,
    speedPx: isBoss ? 10 : 50,
    hp,
    maxHp: hp,
    glyph: isBoss ? boss.name : ENEMY_GLYPHS[Math.floor(Math.random() * ENEMY_GLYPHS.length)],
    spineType: isBoss ? boss.spineType : "thief",
    bossIndex: isBoss ? bossIndex : null,
    bossSkillTimer: isBoss ? boss.skillCooldown : 0,
    spineVariant: null,
    lane,
    wobble: Math.random() * 10,
    hitFlash: 0,
    hitAge: 99,
    hitDx: 0,
    hitDy: 0,
    spawnAge: 0,
    dead: false
  });
}

function updateEnemies(dt) {
  state.rainLeft = Math.max(0, state.rainLeft - dt);
  state.blindLeft = Math.max(0, state.blindLeft - dt);
  for (const enemy of state.enemies) {
    if (enemy.dying) continue;
    enemy.spawnAge += dt;
    enemy.chargeReturnLeft = Math.max(0, (enemy.chargeReturnLeft ?? 0) - dt);
    if (enemy.bossRecoveryLeft > 0) {
      enemy.bossRecoveryLeft = Math.max(0, enemy.bossRecoveryLeft - dt);
      if (enemy.bossRecoveryLeft <= 0) finalizeBossRecovery(enemy);
    }
    const previousInspire = enemy.inspireLeft ?? 0;
    enemy.inspireLeft = Math.max(0, previousInspire - dt);
    if (previousInspire > 0 && enemy.inspireLeft <= 0 && enemy.inspireHpBonus) {
      enemy.maxHp = Math.max(1, enemy.maxHp - enemy.inspireHpBonus);
      enemy.hp = Math.min(enemy.hp, enemy.maxHp);
      enemy.inspireHpBonus = 0;
    }
    // Inkstone is a persistent area effect: enemies entering during its
    // five-second lifetime receive the same slow as enemies present at cast.
    for (const ink of state.inkEffects) {
      if (ink.age >= ink.life) continue;
      const inkDistance = Math.hypot(enemyPosition(enemy).x - ink.x, enemyPosition(enemy).y - ink.y);
      if (inkDistance <= layout.cell * 1.5) enemy.slowLeft = Math.max(enemy.slowLeft ?? 0, ink.life - ink.age);
    }
    const controlMultiplier = enemy.bossCastingLeft > 0 || enemy.bossRecoveryLeft > 0 || enemy.stunLeft > 0 ? 0 : enemy.slowLeft > 0 ? 0.8 : 1;
    const inspireMultiplier = enemy.inspireLeft > 0 ? 1.3 : 1;
    enemy.t += (enemy.speedPx ? enemy.speedPx / layout.cell : enemy.speed) * dt * controlMultiplier * inspireMultiplier;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.hitAge += dt;
    if (enemy.bossIndex != null && !enemy.endpointAttackStarted) {
      if (enemy.bossCastingLeft > 0) {
        enemy.bossCastElapsed += dt;
        if (enemy.bossChargeMotion) updateBossChargeMotion(enemy);
        enemy.bossCastingLeft = Math.max(0, enemy.bossCastingLeft - dt);
        const boss = BOSS_ROSTER[enemy.bossIndex];
        if (boss.skill === "chaos") {
          updateChaosCast(enemy, boss, dt);
        } else if (boss.skill === "revive") {
          updateReviveAura(enemy, boss);
          enemy.bossSkillApplied = true;
        } else if (!enemy.bossSkillApplied && enemy.bossCastElapsed >= (enemy.bossEffectAt ?? boss.effectAt)) {
          enemy.bossSkillApplied = true;
          applyBossSkill(enemy);
        }
        if (enemy.bossCastingLeft <= 0 && boss.skill === "chaos") {
          enemy.bossSkillApplied = true;
        } else if (enemy.bossCastingLeft <= 0 && !enemy.bossSkillApplied) {
          enemy.bossSkillApplied = true;
          applyBossSkill(enemy);
        }
        if (enemy.bossCastingLeft <= 0 && enemy.bossChargeMotion) finishBossChargeMotion(enemy);
        if (enemy.bossCastingLeft <= 0 && boss.recoveryDuration && !enemy.bossRecoveryStarted) {
          enemy.bossRecoveryStarted = true;
          enemy.bossRecoveryLeft = boss.recoveryDuration;
        }
      } else if (!(enemy.bossRecoveryLeft > 0)) {
        enemy.bossSkillTimer -= dt;
        if (enemy.bossSkillTimer <= 0) castBossSkill(enemy);
      }
    }
    const path = pathForEnemy(enemy);
    if (!enemy.endpointAttackStarted && enemy.t >= path.length - 2) {
      enemy.endpointAttackStarted = true;
      enemy.endpointAttackAge = 0;
      enemy.hitAge = 0;
    }
    if (enemy.endpointAttackStarted && !enemy.endpointDamageApplied) {
      enemy.endpointAttackAge += dt;
      if (enemy.endpointAttackAge >= 0.018) {
        enemy.endpointDamageApplied = true;
        damageDefense(enemy);
      }
    }
    if (enemy.t >= path.length - 1) {
      enemy.dying = true;
      enemy.deathAge = 0;
      enemy.deathLife = enemy.spineType === "thief" ? 2.05 : 0.7;
      const pos = enemyPosition(enemy);
      enemyDeathFx(pos.x, pos.y, enemy);
    }
  }
  for (const enemy of state.enemies) {
    if (enemy.dying) {
      enemy.deathAge += dt;
      if (enemy.hp <= 0 && !enemy.deathRecorded) {
        enemy.deathRecorded = true;
        state.fallenEnemies.push({
          seq: ++state.deathSeq,
          age: 0,
          pathSide: enemy.pathSide,
          t: enemy.t,
          lane: enemy.lane,
          glyph: enemy.glyph,
          spineType: enemy.spineType,
          maxHp: enemy.maxHp,
          speedPx: enemy.speedPx
        });
      }
    }
  }
  for (const fallen of state.fallenEnemies) fallen.age += dt;
  state.fallenEnemies = state.fallenEnemies.filter((fallen) => fallen.age < 12);
  updatePendingRevives(dt);
  state.enemies = state.enemies.filter((enemy) => !enemy.dead && (!enemy.dying || enemy.deathAge < (enemy.deathLife ?? 2.05)));
}

function updateUnits(dt) {
  updateUnitBoard(state.board, "left", dt);
  for (const unit of state.camp) {
    if (unit) updateUnitAction(unit, dt);
  }
}

function castBossSkill(enemy) {
  const boss = BOSS_ROSTER[enemy.bossIndex];
  if (!boss) return;
  audioEngine.play(BOSS_SOUND_BY_SKILL[boss.skill] ?? "boss_entrance", 0.28);
  let castDuration = boss.castDuration;
  let effectAt = boss.effectAt;
  if (boss.skill === "frenzy") {
    const origin = enemyPosition(enemy);
    const candidates = [...state.board.entries()]
      .filter(([, unit]) => (unit.type === "weapon" || unit.type === "general") && !unit.knockedDown)
      .map(([key, unit]) => ({ key, unit, ...keyToCell(key) }))
      .filter(({ r, c }) => {
        const center = cellCenter(r, c);
        return Math.hypot(center.x - origin.x, center.y - origin.y) <= boss.range * layout.cell;
      });
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (!target) {
      enemy.bossSkillTimer = boss.skillCooldown;
      return;
    }
    enemy.bossChargeTargetId = target.unit.id;
    const center = cellCenter(target.r, target.c);
    const side = origin.x >= center.x ? 1 : -1;
    const desired = { x: center.x + side * layout.cell * 0.75, y: center.y };
    const dx = desired.x - origin.x;
    const dy = desired.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const stopDistance = layout.cell * 0.75;
    const travel = Math.max(0, distance - stopDistance);
    const approach = distance > 0 ? { x: origin.x + dx / distance * travel, y: origin.y + dy / distance * travel } : { ...origin };
    const approachDuration = distance < stopDistance ? 0 : distance * 0.003;
    const leapDuration = 0.1;
    castDuration = approachDuration + boss.castDuration;
    effectAt = approachDuration + leapDuration;
    enemy.bossChargeMotion = {
      start: { ...origin }, approach, target: center,
      control: { x: (approach.x + center.x) / 2, y: approach.y - layout.cell * (200 / 48) },
      approachDuration, leapDuration
    };
    enemy.bossChargePhase = approachDuration > 0 ? "approach" : "leap";
  }
  enemy.bossSkillTimer = boss.skillCooldown;
  enemy.bossCastingLeft = castDuration;
  enemy.bossEffectAt = effectAt;
  enemy.bossCastElapsed = 0;
  enemy.bossSkillApplied = false;
  enemy.bossRecoveryStarted = false;
  enemy.bossRecoveryLeft = 0;
  enemy.chaosAffected = new Set();
  enemy.chaosScanTimer = 0;
  enemy.bossCastSerial = (enemy.bossCastSerial ?? 0) + 1;
  enemy.hitAge = 0;
  if (effectAt <= 0) {
    enemy.bossSkillApplied = true;
    applyBossSkill(enemy);
  }
}

function applyBossSkill(enemy) {
  const boss = BOSS_ROSTER[enemy.bossIndex];
  if (!boss || enemy.dying) return;
  const origin = enemyPosition(enemy);
  if (boss.skill === "chaos") {
    let affected = 0;
    for (const [key, unit] of state.board) {
      if (unit.type !== "weapon") continue;
      const { r, c } = keyToCell(key);
      const center = cellCenter(r, c);
      if (Math.hypot(center.x - origin.x, center.y - origin.y) > boss.range * layout.cell) continue;
      unit.confused = true;
      unit.engaged = false;
      affected += 1;
      floatText("乱", center.x, center.y - layout.cell * 0.36, boss.color, 18);
    }
    pulseAt(origin.x, origin.y, boss.color, layout.cell * Math.max(1, boss.range));
    toast(affected ? `${boss.name}施放摄魂` : `${boss.name}试图施放摄魂`, boss.color);
    return;
  }
  if (boss.skill === "revive") {
    enemy.reviveStartSeq = state.deathSeq;
    enemy.reviveCount = 0;
    pulseAt(origin.x, origin.y, boss.color, layout.cell * boss.range);
    toast(`${boss.name}展开招魂法阵`, boss.color);
    return;
  }
  if (boss.skill === "inspire") {
    let affected = 0;
    for (const ally of state.enemies) {
      if (ally === enemy || ally.dying || ally.pathSide !== enemy.pathSide) continue;
      if (Math.abs(ally.t - enemy.t) > boss.range) continue;
      if (!ally.inspireHpBonus) {
        const bonus = ally.maxHp * 0.5;
        ally.maxHp += bonus;
        ally.hp += bonus;
        ally.inspireHpBonus = bonus;
      }
      ally.inspireLeft = 5;
      affected += 1;
      const allyPos = enemyPosition(ally);
      floatText("勇", allyPos.x, allyPos.y - layout.cell * 0.35, boss.color, 16);
    }
    pulseAt(origin.x, origin.y, boss.color, layout.cell * Math.max(1, boss.range));
    toast(affected ? `${boss.name}鼓舞${affected}名单位` : `${boss.name}发出鼓舞号令`, boss.color);
    return;
  }
  if (boss.skill === "demolish") {
    const candidates = [...state.cultivated]
      .filter((key) => !state.board.has(key) && !pathKeySet.has(key) && !state.bossBlocked.has(key))
      .map((key) => ({ key, ...keyToCell(key) }))
      .filter(({ r, c }) => {
        const center = cellCenter(r, c);
        return Math.hypot(center.x - origin.x, center.y - origin.y) <= boss.range * layout.cell;
      });
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (target) {
      state.cultivated.delete(target.key);
      state.bossBlocked.add(target.key);
      const center = cellCenter(target.r, target.c);
      floatText("拆", center.x, center.y, boss.color, 20);
      pulseAt(center.x, center.y, boss.color, layout.cell * 0.8);
    }
    toast(target ? `${boss.name}拆毁一处空白地块` : `${boss.name}未找到可拆地块`, boss.color);
    return;
  }
  if (boss.skill === "rain") {
    state.rainLeft = Math.max(state.rainLeft, 6);
    let affected = 0;
    for (const unit of state.board.values()) {
      if (unit.type !== "weapon" && unit.type !== "general") continue;
      unit.rained = true;
      affected += 1;
    }
    pulseAt(layout.w / 2, layout.boardY + layout.boardH / 2, boss.color, Math.max(layout.boardW, layout.boardH));
    toast(`${boss.name}施放巫山云雨，${affected}个单位攻速降低`, boss.color);
    return;
  }
  if (boss.skill === "charm") {
    const candidates = [...state.board.entries()]
      .filter(([, unit]) => unit.type === "weapon" && !unit.charmed)
      .map(([key, unit]) => ({ key, unit, ...keyToCell(key) }))
      .filter(({ r, c }) => {
        const center = cellCenter(r, c);
        return Math.hypot(center.x - origin.x, center.y - origin.y) <= boss.range * layout.cell;
      });
    const minLevel = Math.min(...candidates.map(({ unit }) => unit.level));
    const targets = candidates.filter(({ unit }) => unit.level === minLevel);
    targets.forEach((target, index) => {
      target.unit.charmed = true;
      target.unit.engaged = false;
      const center = cellCenter(target.r, target.c);
      floatText("魅", center.x, center.y - layout.cell * 0.3, boss.color, 20);
      pulseAt(center.x, center.y, boss.color, layout.cell * 0.75);
      state.charmLinks.push({ sx: origin.x, sy: origin.y, tx: center.x, ty: center.y, age: -index * (1 / Math.max(1, targets.length)), life: 1.15, color: boss.color });
    });
    if (targets.length) {
      pulseAt(origin.x, origin.y, boss.color, layout.cell * 1.1);
    }
    toast(targets.length ? `${boss.name}魅惑${targets.length}名最低等级小兵` : `${boss.name}未找到可魅惑小兵`, boss.color);
    return;
  }
  if (boss.skill === "cavalry") {
    const baseHp = ENEMY_HP_BY_LEVEL[Math.max(0, Math.min(ENEMY_HP_BY_LEVEL.length - 1, state.wave - 1))];
    for (let i = 0; i < 3; i++) {
      const hp = baseHp * 1.4;
      state.enemies.push({
        id: idSeq++, t: Math.max(0, enemy.t - 0.35 - i * 0.28), pathSide: enemy.pathSide,
        speedPx: 72, hp, maxHp: hp, glyph: "骑", spineType: "thief", bossIndex: null,
        bossSkillTimer: 0, lane: (i - 1) * 0.14, wobble: Math.random() * 10,
        hitFlash: 0, hitAge: 99, hitDx: 0, hitDy: 0, spawnAge: 0, dead: false, cavalry: true
      });
    }
    pulseAt(origin.x, origin.y, boss.color, layout.cell * 1.5);
    toast(`${boss.name}召来三名西凉骑兵`, boss.color);
    return;
  }
  const nearbyUnits = [...state.board.entries()]
    .filter(([, unit]) => unit.type === "weapon" || unit.type === "general")
    .map(([key, unit]) => ({ key, unit, ...keyToCell(key) }))
    .filter(({ r, c }) => {
      const center = cellCenter(r, c);
      return Math.hypot(center.x - origin.x, center.y - origin.y) <= boss.range * layout.cell;
    });
  if (boss.skill === "halberd") {
    for (const { r, c, unit } of nearbyUnits) {
      unit.level = Math.max(1, unit.level - 2);
      unit.mergeLockedLeft = Math.max(unit.mergeLockedLeft ?? 0, 6);
      unit.engaged = false;
      const center = cellCenter(r, c);
      floatText("降", center.x, center.y - layout.cell * 0.3, boss.color, 18);
    }
    pulseAt(origin.x, origin.y, boss.color, layout.cell * boss.range);
    toast(`${boss.name}挥动方天画戟`, boss.color);
    return;
  }
  if (boss.skill === "devour") {
    let swallowed = 0;
    for (const { key, unit, r, c } of nearbyUnits) {
      if (!state.board.has(key) || state.board.get(key) !== unit) continue;
      removeBoardUnit(key, unit);
      swallowed += 1;
      const center = cellCenter(r, c);
      floatText("吞", center.x, center.y, boss.color, 18);
    }
    if (swallowed) enemy.pendingDevourCount = (enemy.pendingDevourCount ?? 0) + swallowed;
    pulseAt(origin.x, origin.y, boss.color, layout.cell * Math.max(1, boss.range));
    toast(swallowed ? `${boss.name}吞噬${swallowed}个单位` : `${boss.name}饕餮未果`, boss.color);
    return;
  }
  if (boss.skill === "frenzy") {
    const target = nearbyUnits.find(({ unit }) => unit.id === enemy.bossChargeTargetId);
    if (target) {
      target.unit.knockedDown = true;
      target.unit.engaged = false;
      const center = cellCenter(target.r, target.c);
      floatText("倒", center.x, center.y - layout.cell * 0.3, boss.color, 18);
      pulseAt(center.x, center.y, boss.color, layout.cell * 0.9);
    }
    enemy.bossChargeTargetId = null;
    shake(0.28, 7);
    pulseAt(origin.x, origin.y, boss.color, layout.cell * boss.range);
    toast(target ? `${boss.name}冲阵击倒一名小兵` : `${boss.name}冲阵落空`, boss.color);
    return;
  }
  if (boss.skill === "blind") {
    state.blindLeft = Math.max(state.blindLeft, 5);
    toast(`${boss.name}施放噬目`, boss.color);
    return;
  }
  if (boss.skill === "seal") {
    const candidates = [...state.board.entries()]
      .filter(([, unit]) => unit.type === "weapon" && !unit.sealed)
      .map(([key, unit]) => ({ key, unit, ...keyToCell(key) }));
    const highest = Math.max(...candidates.map(({ unit }) => unit.level));
    const target = candidates.find(({ unit }) => unit.level === highest);
    if (target) {
      target.unit.sealed = true;
      target.unit.engaged = false;
      const center = cellCenter(target.r, target.c);
      floatText("封", center.x, center.y - layout.cell * 0.3, boss.color, 20);
      pulseAt(center.x, center.y, boss.color, layout.cell * 0.78);
    }
    toast(target ? `${boss.name}封印最高等级小兵` : `${boss.name}未找到可封印小兵`, boss.color);
  }
}

function updateChaosCast(enemy, boss, dt) {
  const elapsed = enemy.bossCastElapsed;
  if (elapsed < 0.5 || elapsed > 1.4) return;
  enemy.chaosScanTimer = (enemy.chaosScanTimer ?? 0) - dt;
  if (enemy.chaosScanTimer > 0) return;
  enemy.chaosScanTimer = 0.1;
  enemy.chaosAffected ??= new Set();
  const progress = Math.max(0, Math.min(1, (elapsed - 0.5) / 0.9));
  const radius = Math.max(layout.cell * 0.15, boss.range * layout.cell * progress);
  const origin = enemyPosition(enemy);
  for (const [key, unit] of state.board) {
    if (unit.type !== "weapon" || enemy.chaosAffected.has(unit.id)) continue;
    const { r, c } = keyToCell(key);
    const center = cellCenter(r, c);
    if (Math.hypot(center.x - origin.x, center.y - origin.y) > radius) continue;
    unit.confused = true;
    unit.engaged = false;
    enemy.chaosAffected.add(unit.id);
    floatText("乱", center.x, center.y - layout.cell * 0.36, boss.color, 18);
  }
  state.pulses.push({ x: origin.x, y: origin.y, color: boss.color, r: radius, age: 0, life: 0.12, fixedRadius: true });
}

function updateReviveAura(enemy, boss) {
  if ((enemy.reviveCount ?? 0) >= 3) return;
  const origin = enemyPosition(enemy);
  const candidates = state.fallenEnemies
    .filter((fallen) => !fallen.consumed && fallen.seq > (enemy.reviveStartSeq ?? state.deathSeq) && fallen.spineType === "thief" && fallen.pathSide === enemy.pathSide)
    .filter((fallen) => {
      const pos = enemyPathPosition(fallen);
      return Math.hypot(pos.x - origin.x, pos.y - origin.y) < boss.range * layout.cell;
    })
    .sort((a, b) => a.seq - b.seq);
  for (const fallen of candidates) {
    if (enemy.reviveCount >= 3) break;
    fallen.consumed = true;
    enemy.reviveCount += 1;
    const target = enemyPathPosition(fallen);
    state.pendingRevives.push({ fallen, left: 0.22, color: boss.color });
    state.charmLinks.push({ sx: origin.x, sy: origin.y, tx: target.x, ty: target.y, age: 0, life: 0.22, color: "#05fe77", solid: true });
  }
}

function updatePendingRevives(dt) {
  for (const pending of state.pendingRevives) pending.left -= dt;
  const ready = state.pendingRevives.filter((pending) => pending.left <= 0);
  state.pendingRevives = state.pendingRevives.filter((pending) => pending.left > 0);
  for (const { fallen, color } of ready) {
    const revived = {
      id: idSeq++, t: fallen.t, pathSide: fallen.pathSide, speedPx: fallen.speedPx ?? 50,
      hp: fallen.maxHp, maxHp: fallen.maxHp, glyph: fallen.glyph,
      spineType: "thief", bossIndex: null, bossSkillTimer: 0, spineVariant: null,
      lane: fallen.lane, wobble: Math.random() * 10, hitFlash: 0, hitAge: 99,
      hitDx: 0, hitDy: 0, spawnAge: 0, dead: false, revived: true
    };
    state.enemies.push(revived);
    state.reviveAudit += 1;
    const pos = enemyPosition(revived);
    floatText("魂归", pos.x, pos.y - layout.cell * 0.35, color, 16);
    pulseAt(pos.x, pos.y, color, layout.cell * 0.7);
  }
  if (ready.length) state.fallenEnemies = state.fallenEnemies.filter((fallen) => !fallen.consumed);
}

function finalizeBossRecovery(enemy) {
  if (!enemy.pendingDevourCount) return;
  const swallowed = enemy.pendingDevourCount;
  enemy.pendingDevourCount = 0;
  const bonus = swallowed * enemy.maxHp * 0.18;
  enemy.maxHp += bonus;
  enemy.hp += bonus;
  enemy.devourScale = Math.min(1.75, (enemy.devourScale ?? 1) + swallowed * 0.12);
  const pos = enemyPosition(enemy);
  pulseAt(pos.x, pos.y, BOSS_ROSTER[enemy.bossIndex]?.color ?? "#7447a6", layout.cell * 1.25);
}

function updateBossChargeMotion(enemy) {
  const motion = enemy.bossChargeMotion;
  if (!motion) return;
  const elapsed = enemy.bossCastElapsed;
  if (elapsed < motion.approachDuration && motion.approachDuration > 0) {
    const k = Math.max(0, Math.min(1, elapsed / motion.approachDuration));
    enemy.chargeX = lerp(motion.start.x, motion.approach.x, k);
    enemy.chargeY = lerp(motion.start.y, motion.approach.y, k);
    enemy.bossChargePhase = "approach";
    return;
  }
  const leapK = Math.max(0, Math.min(1, (elapsed - motion.approachDuration) / motion.leapDuration));
  const inv = 1 - leapK;
  enemy.chargeX = inv * inv * motion.approach.x + 2 * inv * leapK * motion.control.x + leapK * leapK * motion.target.x;
  enemy.chargeY = inv * inv * motion.approach.y + 2 * inv * leapK * motion.control.y + leapK * leapK * motion.target.y;
  enemy.bossChargePhase = "leap";
}

function finishBossChargeMotion(enemy) {
  const base = enemyPathPosition(enemy);
  enemy.chargeOffsetX = (enemy.chargeX ?? base.x) - base.x;
  enemy.chargeOffsetY = (enemy.chargeY ?? base.y) - base.y;
  enemy.chargeReturnLeft = 0.3;
  enemy.chargeX = null;
  enemy.chargeY = null;
  enemy.bossChargeMotion = null;
  enemy.bossChargePhase = null;
}

function removeBoardUnit(key, unit) {
  state.board.delete(key);
  if (unit.span === 2) {
    const { r, c } = keyToCell(key);
    const reserveKey = `${r},${c + 1}`;
    if (state.board.get(reserveKey)?.ownerId === unit.id) state.board.delete(reserveKey);
  }
}

function updateUnitBoard(board, defendedPath, dt) {
  for (const [key, unit] of board) {
    if (unit.type === "general-reserved") continue;
    updateUnitAction(unit, dt);
    unit.mergeLockedLeft = Math.max(0, (unit.mergeLockedLeft ?? 0) - dt);
    unit.attackTimer -= dt;
    if (unit.type === "farmer") {
      unit.farmTimer += dt;
      if (unit.farmMode === "crazy") unit.farmCrazyLeft = Math.max(0, unit.farmCrazyLeft - dt);
      const cycle = unit.farmMode === "crazy"
        ? 1
        : FARMER_CYCLE_SECONDS[Math.max(0, Math.min(4, unit.level - 1))];
      if (unit.farmTimer >= cycle) {
        unit.farmTimer %= cycle;
        const { r, c } = keyToCell(key);
        const center = cellCenter(r, c);
        state.buns += 1;
        floatText("+1", center.x, center.y - layout.cell * 0.35, "#d19622", 15);
      }
      if (unit.farmMode === "crazy" && unit.farmCrazyLeft <= 0) {
        unit.farmMode = "framing";
        unit.farmTimer = 0;
      }
      continue;
    }
    if (unit.type === "char" || unit.type === "shovel") continue;
    if (unit.confused || unit.charmed || unit.knockedDown || unit.sealed) {
      unit.engaged = false;
      continue;
    }
    const pos = keyToCell(key);
    pos.offsetX = unit.span === 2 ? 0.5 : 0;
    const targetPolicy = unit.type === "weapon"
      ? weapons[unit.token]?.targetPolicy
      : unit.type === "general"
        ? GENERAL_COMBAT_CONFIG[unit.token]?.targetPolicy
        : "nearest";
    const target = findTarget(pos.r, pos.c, getUnitRange(unit), pos.offsetX, targetPolicy, defendedPath);
    unit.engaged = Boolean(target);
    if (unit.token === "gong") {
      if (target) unit.aimReturnAge = 0;
      else if (Number.isFinite(unit.aimAngle)) {
        unit.aimReturnAge = Math.min(0.65, (unit.aimReturnAge ?? 0) + dt);
        if (unit.aimReturnAge >= 0.65) unit.aimAngle = 0;
      }
    }
    if (unit.attackTimer > 0) continue;
    if (!target) continue;
    unit.attackTimer = getUnitCooldown(unit);
    fireAt(unit, pos, target);
  }
}

function drawOriginalDeckUnit(player) {
  const pool = state.playerDeckPool;
  if (!pool.length) return makeUnit("dao", 1);
  const index = Math.floor(Math.random() * pool.length);
  const originalToken = pool[index];
  if (!BASIC_DECK_TOKENS.has(originalToken)) pool.splice(index, 1);
  return makeUnit(internalToken(originalToken), 1);
}

function updateProjectiles(dt) {
  for (const p of state.projectiles) {
    p.age += dt;
    if (p.age < 0) continue;
    const k = Math.min(1, p.age / p.life);
    if (p.kind === "cavalrySweep") {
      p.hitIds ??= new Set();
      const startAngle = Math.PI / 3;
      for (const enemy of state.enemies) {
        if (enemy.dead || enemy.dying || enemy.pathSide !== p.targetSide || p.hitIds.has(enemy.id)) continue;
        const enemyPos = enemyPosition(enemy);
        const distance = Math.hypot(enemyPos.x - p.sx, enemyPos.y - p.sy);
        if (distance > p.sweepRadius) continue;
        const enemyAngle = Math.atan2(enemyPos.y - p.sy, enemyPos.x - p.sx);
        const phase = ((startAngle - enemyAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
        if (k + 0.035 < phase) continue;
        p.hitIds.add(enemy.id);
        hitEnemy({ ...p, target: enemy.id, tx: enemyPos.x, ty: enemyPos.y, done: false });
      }
      if (k >= 1) p.done = true;
      continue;
    }
    if (Number.isFinite(p.controlX) && Number.isFinite(p.controlY)) {
      const inv = 1 - k;
      p.x = inv * inv * p.sx + 2 * inv * k * p.controlX + k * k * p.tx;
      p.y = inv * inv * p.sy + 2 * inv * k * p.controlY + k * k * p.ty;
      const tangentX = 2 * inv * (p.controlX - p.sx) + 2 * k * (p.tx - p.controlX);
      const tangentY = 2 * inv * (p.controlY - p.sy) + 2 * k * (p.ty - p.controlY);
      p.rotation = Math.atan2(tangentY, tangentX);
    } else {
      const previousX = p.x;
      const previousY = p.y;
      p.x = lerp(p.sx, p.tx, easeOutCubic(k));
      p.y = lerp(p.sy, p.ty, easeOutCubic(k)) - Math.sin(k * Math.PI) * p.arc;
      if (Math.hypot(p.x - previousX, p.y - previousY) > 0.001) {
        p.rotation = Math.atan2(p.y - previousY, p.x - previousX);
      }
    }
    if (k >= 1) {
      if (p.kind === "generalPierce") hitPiercingEnemies(p);
      else if (p.kind === "generalArea") hitAreaEnemies(p, layout.cell * 0.9);
      else hitEnemy(p);
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.age < p.life && !p.done);
}

function updateParticles(dt) {
  for (const item of [...state.particles, ...state.hitSprites, ...state.strokes, ...state.ghosts, ...state.absorbs, ...state.floats, ...state.pulses, ...state.charmLinks, ...state.shakes, ...state.recruits, ...state.messages]) {
    item.age += dt;
  }
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 90 * dt;
  }
  state.particles = state.particles.filter((p) => p.age < p.life);
  state.hitSprites = state.hitSprites.filter((p) => p.age < p.life);
  state.strokes = state.strokes.filter((s) => s.age < s.life);
  state.ghosts = state.ghosts.filter((g) => g.age < g.life);
  state.absorbs = state.absorbs.filter((a) => a.age < a.life);
  state.floats = state.floats.filter((f) => f.age < f.life);
  state.pulses = state.pulses.filter((p) => p.age < p.life);
  state.charmLinks = state.charmLinks.filter((p) => p.age < p.life);
  state.shakes = state.shakes.filter((s) => s.age < s.life);
  state.recruits = state.recruits.filter((r) => r.age < r.life);
  state.messages = state.messages.filter((m) => m.age < m.life);
}

function updateBuns(dt) {
  state.displayedBuns += (state.buns - state.displayedBuns) * Math.min(1, dt * 9);
}

function updateUnitAction(unit, dt) {
  if (!unit.action || unit.action === "idle") return;
  unit.actionAge += dt;
  if (unit.actionAge >= unit.actionLife) {
    unit.action = "idle";
    unit.actionAge = 0;
    unit.actionLife = 1;
    unit.actionDx = 0;
    unit.actionDy = 0;
  }
}

function setUnitAction(unit, action, life, dx = 0, dy = 0) {
  unit.action = action;
  unit.actionAge = 0;
  unit.actionLife = life;
  unit.actionDx = dx;
  unit.actionDy = dy;
}

function fireAt(unit, cell, enemy) {
  audioEngine.play(ATTACK_SOUND_BY_TOKEN[unit.token] ?? "knife_attack", unit.type === "general" ? 0.22 : 0.14, 0.08);
  const from = cellCenter(cell.r, cell.c);
  from.x += (cell.offsetX ?? 0) * layout.cell;
  const to = enemyPosition(enemy);
  const damage = Math.round(getUnitDamage(unit) * 100) / 100;
  const len = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  const dx = (to.x - from.x) / len;
  const dy = (to.y - from.y) / len;
  const kind = unit.type === "general" ? "gold" : weapons[unit.token]?.kind ?? "char";
  const timing = getWeaponAnimationTiming(unit.token);
  let bowControl = null;
  if (unit.type === "general") unit.attackSerial = (unit.attackSerial ?? 0) + 1;
  const attackLife = timing ? getUnitCooldown(unit) : getAttackLife(unit, kind);
  if (unit.token === "gong") {
    const controlX = from.x + (to.x - from.x) / 2;
    const controlY = from.y + (to.y - from.y) / 2 - layout.cell * 2.5;
    bowControl = { x: controlX, y: controlY };
    unit.actionStartAngle = unit.aimAngle ?? 0;
    unit.actionAimAngle = Math.atan2(controlY - from.y, controlX - from.x) + Math.PI / 2;
    unit.aimAngle = unit.actionAimAngle;
  }
  setUnitAction(unit, "attack", attackLife, dx, dy);
  if (unit.type !== "general" && !hasWeaponGlyphSprite(unit.token)) {
    strokeTrail(from.x, from.y, to.x, to.y, "#17120f", 0.18, kind);
  }
  if (weapons[unit.token]?.kind === "melee") {
    state.projectiles.push({ sx: from.x, sy: from.y, tx: to.x, ty: to.y, x: from.x, y: from.y, age: 0, life: 0.025, arc: 0, damage, target: enemy.id, targetSide: enemy.pathSide, sourceId: unit.id, kind: "slash", hitEffect: hitEffectForToken(unit.token), done: false });
  } else {
    const releaseDelay = attackLife * (timing?.releaseRatio ?? (unit.type === "general" ? GENERAL_COMBAT_CONFIG[unit.token]?.releaseRatio ?? 0 : 0));
    const projectileLife = timing?.activeRatio
      ? Math.max(0.08, attackLife * timing.activeRatio)
      : timing?.impact ?? (unit.type === "general" ? 0.18 : 0.24);
    if (unit.token === "ji") {
      for (let sweepIndex = 0; sweepIndex < 2; sweepIndex++) {
        state.projectiles.push({
          sx: from.x, sy: from.y, tx: to.x, ty: to.y, x: from.x, y: from.y,
          age: -releaseDelay, life: projectileLife, arc: 0,
          damage: Math.round(damage * 50) / 100, target: enemy.id, targetSide: enemy.pathSide, sourceId: unit.id, kind: "cavalrySweep",
          sweepIndex, sweepRadius: getUnitRange(unit) * layout.cell * (sweepIndex === 0 ? 0.5 : 1),
          hitEffect: hitEffectForToken(unit.token), done: false
        });
      }
      return;
    }
    const generalAttackType = unit.type === "general" ? GENERAL_COMBAT_CONFIG[unit.token]?.attackType : null;
    const projectileKind = unit.token === "qiang"
      ? "pike"
      : unit.token === "ji"
        ? "cavalrySweep"
        : generalAttackType === "pierce"
          ? "generalPierce"
          : generalAttackType === "area"
            ? "generalArea"
            : unit.type === "general"
              ? "gold"
              : "arrow";
    state.projectiles.push({
      sx: from.x, sy: from.y, tx: to.x, ty: to.y, x: from.x, y: from.y,
      controlX: bowControl?.x, controlY: bowControl?.y,
      age: -releaseDelay, life: projectileLife,
      arc: unit.token === "gong" ? 0 : unit.type === "general" ? 16 : 0,
      damage, target: enemy.id, targetSide: enemy.pathSide, sourceId: unit.id,
      kind: projectileKind, hitEffect: hitEffectForToken(unit.token), done: false
    });
  }
}

function damageDefense(enemy) {
  const gate = enemy.pathSide === "right" ? "right" : "left";
  state.douHp[gate] -= 1;
  audioEngine.play("enemy_knife_attack", 0.3, 0.12);
  shake(0.13, 3.4);
  const endpoint = pathForEnemy(enemy).at(-1);
  floatText(
    "斗 -1",
    layout.boardX + (endpoint[1] + 0.5) * layout.cell,
    layout.boardY + (endpoint[0] + 0.5) * layout.cell,
    "#d12d25",
    18
  );
  if (state.douHp[gate] > 0) return;
  audioEngine.play("gameover_double_gold", 0.38, 0.25);
  state.mode = "end";
  state.banner = {
    title: "失败",
    sub: "我方防线被攻破",
    won: false
  };
}

function getAttackLife(unit, kind) {
  if (unit.type === "general" || unit.type === "weapon") return getUnitCooldown(unit);
  return 0.4;
}

function hitEnemy(projectile) {
  const enemy = state.enemies.find((item) => item.id === projectile.target);
  projectile.done = true;
  if (!enemy || enemy.dying) return;
  if (enemy.reviveTestVictim && !state.enemies.some((item) => item.spineType === "zhangBao" && item.bossCastingLeft > 0)) return;
  const sourceUnit = findBoardUnitById(projectile.sourceId, projectile.targetSide);
  const auditKey = sourceUnit?.token ?? projectile.kind ?? "unknown";
  state.hitAudit[auditKey] = (state.hitAudit[auditKey] ?? 0) + 1;
  if (sourceUnit?.type === "general") {
    enemy.generalContributors ??= new Set();
    enemy.generalContributors.add(sourceUnit.id);
  }
  enemy.hp -= projectile.damage;
  audioEngine.play(enemy.hp <= 0 ? "enemy_dead" : "enemy_hit", enemy.hp <= 0 ? 0.22 : 0.1, enemy.hp <= 0 ? 0.08 : 0.035);
  enemy.hitFlash = 0.1;
  enemy.hitAge = 0;
  const hitLen = Math.max(1, Math.hypot(projectile.tx - projectile.sx, projectile.ty - projectile.sy));
  enemy.hitDx = (projectile.tx - projectile.sx) / hitLen;
  enemy.hitDy = (projectile.ty - projectile.sy) / hitLen;
  const pos = enemyPosition(enemy);
  if (projectile.hitEffect) {
    const direction = Math.atan2(enemy.hitDy, enemy.hitDx);
    const rotation = projectile.hitEffect === "knife"
        ? direction + Math.PI / 2
        : projectile.hitEffect === "cavalry"
        ? direction + Math.PI * 0.25
        : 0;
    state.hitSprites.push({ key: projectile.hitEffect, x: pos.x, y: pos.y, age: 0, life: getOriginalHitEffectTiming(projectile.hitEffect), size: layout.cell * 1.35, rotation });
  }
  const isGeneralHit = projectile.kind === "gold" || projectile.kind === "generalPierce" || projectile.kind === "generalArea";
  inkSplash(pos.x, pos.y, isGeneralHit ? "#f6cd55" : "#2d2019", isGeneralHit ? 14 : 10);
  floatText(`-${projectile.damage}`, pos.x, pos.y - 10, "#b92825", 15);
  if (enemy.hp <= 0) {
    enemy.dying = true;
    enemy.deathAge = 0;
    enemy.deathLife = enemy.spineType === "thief" ? 2.05 : 0.7;
    enemyDeathFx(pos.x, pos.y, enemy);
    awardGeneralExperience(enemy, sourceUnit);
    dropBun(pos.x, pos.y, enemy.spineType === "thief" ? 1 : 10, enemy.pathSide);
  }
}

function findBoardUnitById(id, pathSide = "left") {
  if (!id) return null;
  for (const unit of state.board.values()) if (unit.id === id) return unit;
  return null;
}

function awardGeneralExperience(enemy, killer) {
  const contributors = [...(enemy.generalContributors ?? [])];
  if (killer?.type === "general") addGeneralExperience(killer, 1);
  const assists = contributors.filter((id) => id !== killer?.id);
  if (!assists.length) return;
  const share = 0.5 / assists.length;
  for (const id of assists) {
    const unit = findBoardUnitById(id, enemy.pathSide);
    if (unit?.type === "general") addGeneralExperience(unit, share);
  }
}

function addGeneralExperience(unit, amount) {
  const thresholds = ELITE_GENERALS.has(unit.token) ? ELITE_GENERAL_EXP : REGULAR_GENERAL_EXP;
  unit.experience = Math.max(0, (unit.experience ?? 0) + amount);
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (unit.experience >= thresholds[i]) {
      level = i + 1;
      break;
    }
  }
  if (level <= unit.level) return;
  unit.level = level;
  unit.confused = false;
  unit.rained = false;
  unit.charmed = false;
  unit.knockedDown = false;
  unit.sealed = false;
  unit.mergeLockedLeft = 0;
  setUnitAction(unit, "merge", 0.48, 0, -1);
  for (const [key, candidate] of state.board) {
    if (candidate !== unit) continue;
    const { r, c } = keyToCell(key);
    const center = cellCenter(r, c);
    floatText(`Lv.${level}`, center.x + (unit.span === 2 ? layout.cell * 0.5 : 0), center.y - layout.cell * 0.42, "#d19622", 18);
    break;
  }
}

function hitPiercingEnemies(projectile) {
  const vx = projectile.tx - projectile.sx;
  const vy = projectile.ty - projectile.sy;
  const lengthSquared = Math.max(1, vx * vx + vy * vy);
  const hits = [];
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.dying || enemy.pathSide !== projectile.targetSide) continue;
    const pos = enemyPosition(enemy);
    const along = Math.max(0, Math.min(1, ((pos.x - projectile.sx) * vx + (pos.y - projectile.sy) * vy) / lengthSquared));
    const px = projectile.sx + vx * along;
    const py = projectile.sy + vy * along;
    if (Math.hypot(pos.x - px, pos.y - py) <= layout.cell * 0.42) hits.push({ enemy, pos });
  }
  for (const { enemy, pos } of hits) hitEnemy({ ...projectile, target: enemy.id, tx: pos.x, ty: pos.y, done: false });
  projectile.done = true;
}

function hitAreaEnemies(projectile, radius) {
  const hits = [];
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.dying || enemy.pathSide !== projectile.targetSide) continue;
    const pos = enemyPosition(enemy);
    if (Math.hypot(pos.x - projectile.tx, pos.y - projectile.ty) <= radius) hits.push({ enemy, pos });
  }
  for (const { enemy, pos } of hits) hitEnemy({ ...projectile, target: enemy.id, tx: pos.x, ty: pos.y, done: false });
  projectile.done = true;
}

function dropBun(x, y, amount = 1, pathSide = "left") {
  state.buns += amount;
  const tx = 76;
  state.floats.push({ type: "bun", sx: x, sy: y, tx, ty: layout.safeTop + 23, x, y, age: 0, life: 0.52 });
  pulseAt(tx, layout.safeTop + 23, "#f1dfc2", 24);
}

function findTarget(r, c, range, offsetX = 0, policy = "nearest", defendedPath = "left") {
  let best = null;
  let bestScore = policy === "closest_end" ? -Infinity : Infinity;
  const unitPos = cellCenter(r, c);
  unitPos.x += offsetX * layout.cell;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.dying) continue;
    const pos = enemyPosition(enemy);
    const dist = Math.hypot(pos.x - unitPos.x, pos.y - unitPos.y) / layout.cell;
    if (dist > range) continue;
    const score = policy === "closest_end" ? enemy.t : dist;
    const improves = policy === "closest_end" ? score > bestScore : score < bestScore;
    if (improves) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

function getUnitRange(unit) {
  if (unit.type === "general") return GENERAL_COMBAT_CONFIG[unit.token]?.range ?? 2.5;
  return weapons[unit.token]?.range ?? 1.2;
}

function getUnitCooldown(unit) {
  // Original Zhen Fu applies attack-speed -0.2, i.e. retain 80% speed.
  // Cooldown therefore grows by 1 / 0.8 rather than using a flat 50% penalty.
  const weatherMultiplier = unit.rained ? (1 / RAIN_ATTACK_SPEED_FACTOR) : 1;
  if (unit.type === "general") {
    const multiplier = GENERAL_SPEED_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
    return ((GENERAL_COMBAT_CONFIG[unit.token]?.cooldown ?? 1) / multiplier) * weatherMultiplier;
  }
  const multiplier = SOLDIER_LEVEL_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
  return ((weapons[unit.token]?.cooldown ?? 0.8) / multiplier) * weatherMultiplier;
}

function getUnitDamage(unit) {
  if (unit.type === "general") {
    const multiplier = GENERAL_DAMAGE_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
    return (GENERAL_COMBAT_CONFIG[unit.token]?.damage ?? 10) * multiplier;
  }
  const multiplier = SOLDIER_LEVEL_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
  return (weapons[unit.token]?.damage ?? 2) * multiplier;
}

function enemyPosition(enemy) {
  if (Number.isFinite(enemy.chargeX) && Number.isFinite(enemy.chargeY)) return { x: enemy.chargeX, y: enemy.chargeY };
  const base = enemyPathPosition(enemy);
  if (enemy.chargeReturnLeft > 0) {
    const k = enemy.chargeReturnLeft / 0.3;
    return {
      x: base.x + (enemy.chargeOffsetX ?? 0) * k,
      y: base.y + (enemy.chargeOffsetY ?? 0) * k
    };
  }
  return base;
}

function enemyPathPosition(enemy) {
  const path = pathForEnemy(enemy);
  const index = Math.min(path.length - 2, Math.floor(enemy.t));
  const local = Math.min(1, enemy.t - index);
  const a = path[index];
  const b = path[index + 1];
  const ca = cellCenter(a[0], a[1]);
  const cb = cellCenter(b[0], b[1]);
  return {
    x: lerp(ca.x, cb.x, local),
    y: lerp(ca.y, cb.y, local)
  };
}

function currentPathSegment(enemy) {
  const path = pathForEnemy(enemy);
  const index = Math.min(path.length - 2, Math.floor(enemy.t));
  const a = path[index];
  const b = path[index + 1];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const len = Math.max(1, Math.hypot(dx, dy));
  return { dir: { x: dx / len, y: dy / len } };
}

function pathForEnemy(enemy) {
  return enemy.pathSide === "right" ? PLAYER_PATHS.right : PLAYER_PATHS.left;
}

function draw(time) {
  const spineLayer = document.querySelector("#spine-game-layer");
  if (spineLayer) {
    spineLayer.style.visibility = state.mode === "menu" || state.mode === "end" || state.paused ? "hidden" : "visible";
  }
  const shakeOffset = getShake(time);
  ctx.clearRect(0, 0, layout.w, layout.h);
  drawBackground(time);
  if (state.mode === "menu") {
    drawMenu(time);
    return;
  }
  ctx.save();
  ctx.translate(shakeOffset.x, shakeOffset.y);
  drawTopBar();
  drawBoard(time);
  drawPlacedProps(time);
  drawEnemies(time);
  drawUnits(time);
  drawBossWeather(time);
  drawAbsorbEvents(time);
  drawProjectiles();
  drawEffects();
  drawCamp(time);
  drawPropToolbar();
  drawDrag(time);
  ctx.restore();
  drawMessages();
  drawBossBlindness();
  if (state.mode === "play" && state.paused) drawPauseOverlay();
  if (state.mode === "end") drawEnd();
}

function drawBackground(time) {
  const g = ctx.createLinearGradient(0, 0, 0, layout.h);
  g.addColorStop(0, "#e9dfc9");
  g.addColorStop(0.45, "#cfdcc7");
  g.addColorStop(1, "#f1e4cf");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, layout.w, layout.h);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#5a4a3d";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = 38 + i * 74 + Math.sin(time + i) * 5;
    ctx.beginPath();
    ctx.moveTo(-30, y);
    ctx.bezierCurveTo(layout.w * 0.24, y - 34, layout.w * 0.42, y + 32, layout.w + 30, y - 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMenu(time) {
  drawInkTitle("赵云与阿斗", layout.w / 2, layout.h * 0.22, 43, "#a62b24");
  drawCentered("军士 一", layout.w / 2, layout.h * 0.285, 19, "#3d342c", "700");
  for (let i = 0; i < 5; i++) drawStar(layout.w / 2 - 88 + i * 44, layout.h * 0.34, i === 0 ? "#f5c945" : "#665f39", 18);

  const boardX = layout.w / 2 - 92;
  const boardY = layout.h * 0.43;
  ctx.save();
  ctx.translate(boardX, boardY);
  ctx.rotate(-0.06);
  ctx.fillStyle = "#f7f2e8";
  ctx.strokeStyle = "#6e5b4e";
  ctx.lineWidth = 3;
  roundRect(0, 0, 184, 92, 8, true, true);
  for (let c = 1; c < 4; c++) line(c * 46, 0, c * 46, 92, "#9e8d7d", 1);
  line(0, 46, 184, 46, "#9e8d7d", 1);
  ctx.restore();
  if (!isADouAnimationReady()) drawCalligraphy("斗", layout.w / 2 - 10 + Math.sin(time * 5) * 3, layout.h * 0.49, 82, "#111");
  drawWeaponIcon(layout.w / 2 - 3, layout.h * 0.53, 48, "qiang", time);

  drawButton(layout.start, "开始游戏", "#b85845", "#69312b", true);
  drawCrossedSwords(layout.w / 2, layout.start.y - 14, 42);
  drawSmallPanel(18, layout.h - 82, 48, 52, "排行榜");
  drawBag(layout.w - 58, layout.h - 68, 42);
  drawTopCurrency();
  if (state.menuPanel) drawMenuPanel();
}

function drawMenuPanel() {
  ctx.save();
  ctx.fillStyle = "rgba(20, 16, 13, 0.46)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  const box = { x: layout.w / 2 - 142, y: layout.h * 0.2, w: 284, h: layout.h * 0.58 };
  ctx.fillStyle = "#f7f1e4";
  roundRect(box.x, box.y, box.w, box.h, 12, true, false);
  ctx.strokeStyle = "#6a5145";
  ctx.lineWidth = 3;
  roundRect(box.x, box.y, box.w, box.h, 12, false, true);
  const title = state.menuPanel === "ranking" ? "排行榜" : "武器背包";
  drawCentered(title, layout.w / 2, box.y + 48, 29, "#3a2b24", "900");
  if (state.menuPanel === "ranking") {
    drawCentered("军士一", layout.w / 2, box.y + 105, 20, "#8d3029", "900");
    drawCentered(`当前记录：第 ${state.bestWave ?? 0} 波`, layout.w / 2, box.y + 150, 17, "#514239", "700");
    drawCentered("完整战斗后会记录最高波次", layout.w / 2, box.y + 190, 14, "#75665a", "500");
  } else {
    const counts = new Map();
    for (const token of state.playerDeckPool) counts.set(token, (counts.get(token) ?? 0) + 1);
    const entries = [["刀", "刀"], ["弓", "弓"], ["枪", "枪"], ["骑", "骑"], ["铲", "铲"]];
    entries.forEach(([label, token], index) => {
      const y = box.y + 102 + index * 38;
      drawCentered(`${label}　${counts.get(token) ?? 0}`, layout.w / 2, y, 17, "#514239", "700");
    });
    if (ENABLE_FARMER_ABILITY) drawCentered("农民能力　已启用", layout.w / 2, box.y + 292, 15, "#8d3029", "700");
    drawCentered("当前牌池统计", layout.w / 2, box.y + 310, 14, "#75665a", "500");
  }
  const back = { x: layout.w / 2 - 76, y: box.y + box.h - 62, w: 152, h: 44 };
  drawButton(back, "返回", "#bf6d52", "#4a2c26", true);
  ctx.restore();
}

function drawTopBar() {
  drawPauseButton();
  drawTopCurrency();
  drawCentered("巨鹿", layout.w / 2, layout.safeTop + 19, 26, "#3b241d", "900");
  const waveLabel = state.wavePhase === "prepare"
    ? `备战 ${Math.ceil(state.waveTimer)}秒`
    : state.wavePhase === "gap"
      ? `整备 ${Math.ceil(state.waveTimer)}秒`
      : `第${state.wave}波`;
  drawCentered(waveLabel, layout.w / 2, layout.safeTop + 45, 22, "#14110f", "900");
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(20, 16, 13, 0.42)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  const box = { x: layout.w / 2 - 116, y: layout.h / 2 - 68, w: 232, h: 136 };
  ctx.fillStyle = "rgba(247, 241, 228, 0.96)";
  roundRect(box.x, box.y, box.w, box.h, 10, true, false);
  ctx.strokeStyle = "#6a5145";
  ctx.lineWidth = 3;
  roundRect(box.x, box.y, box.w, box.h, 10, false, true);
  drawCentered("暂停", layout.w / 2, box.y + 48, 28, "#3a2b24", "900");
  drawCentered("点击左上角按钮继续", layout.w / 2, box.y + 91, 15, "#6a5145", "700");
  ctx.restore();
}

function drawPlacedProps(time) {
  for (const trap of state.traps) {
    const center = cellCenter(trap.r, trap.c);
    drawOriginalPropSprite(ctx, trap.triggered ? "trap_2.png" : "trap_1.png", center.x, center.y, layout.cell * 0.9, layout.cell * 0.9, {
      alpha: trap.triggered ? Math.max(0.25, 1 - trap.age / 5) : 1
    });
  }
  for (const mine of state.landmines) {
    const center = cellCenter(mine.r, mine.c);
    drawOriginalPropSprite(ctx, "mound.png", center.x, center.y + layout.cell * 0.2, layout.cell * 0.68, layout.cell * 0.42, { alpha: 0.8 });
    drawOriginalPropSprite(ctx, "landmine_1.png", center.x, center.y + Math.sin(time * 5) * 1.5, layout.cell * 0.72, layout.cell * 0.48);
  }
  for (const effect of state.inkEffects) {
    const k = effect.age / effect.life;
    drawOriginalPropSprite(ctx, "ink.png", effect.x, effect.y, layout.cell * 3, layout.cell * 3, {
      alpha: Math.min(0.82, (1 - k) * 1.2),
      scale: 0.55 + Math.min(1, effect.age / 0.18) * 0.45
    });
  }
}

function drawPropToolbar() {
  for (const slot of layout.propSlots ?? []) {
    const config = ACTIVE_PROP_CONFIG[slot.key];
    const selected = state.selectedProp === slot.key;
    ctx.save();
    ctx.fillStyle = selected ? "#f0c84d" : "rgba(52,39,31,0.88)";
    ctx.strokeStyle = selected ? "#fff2a8" : "#241813";
    ctx.lineWidth = selected ? 3 : 2;
    roundRect(slot.x, slot.y, slot.w, slot.h, 5, true, true);
    drawOriginalPropSprite(ctx, config.icon, slot.x + slot.w / 2, slot.y + slot.h / 2, slot.w * 0.88, slot.h * 0.88);
    const cooldown = state.propCooldowns[slot.key];
    if (cooldown > 0) {
      ctx.fillStyle = "rgba(15,12,10,0.68)";
      roundRect(slot.x, slot.y, slot.w, slot.h, 5, true, false);
      drawCentered(String(Math.ceil(cooldown)), slot.x + slot.w / 2, slot.y + slot.h / 2, 13, "#fff", "900");
    }
    ctx.restore();
  }
}

function drawTopCurrency() {
  drawBun(78, layout.safeTop + 24, 17);
  ctx.fillStyle = "#2a211d";
  roundRect(92, layout.safeTop + 9, 78, 30, 15, true, false);
  drawText(`${Math.round(state.displayedBuns)}`, 126, layout.safeTop + 31, 20, "#f6eee3", "900", "center");
}

function drawPauseButton() {
  ctx.fillStyle = "rgba(36,33,30,0.26)";
  circle(layout.pause.x, layout.pause.y, layout.pause.r, true, false);
  ctx.fillStyle = "#fff8ed";
  roundRect(layout.pause.x - 6, layout.pause.y - 8, 4, 16, 2, true, false);
  roundRect(layout.pause.x + 2, layout.pause.y - 8, 4, 16, 2, true, false);
}

function drawBoard(time) {
  ctx.save();
  ctx.translate(layout.boardX, layout.boardY);
  ctx.fillStyle = "#22201d";
  roundRect(-2, -2, layout.boardW + 4, layout.boardH + 4, 3, true, false);
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const key = `${r},${c}`;
      const x = c * layout.cell;
      const y = r * layout.cell;
      if (state.bossBlocked.has(key)) ctx.fillStyle = "#3f3835";
      else if (pathKeySet.has(key)) ctx.fillStyle = "#c6b2a4";
      else if (isCultivatedCell(key)) ctx.fillStyle = "#f5f1e9";
      else if (isBlockedCell(key)) ctx.fillStyle = "#5e6761";
      else ctx.fillStyle = "#9bc5b4";
      ctx.fillRect(x, y, layout.cell, layout.cell);
      ctx.strokeStyle = "#34312e";
      ctx.lineWidth = 1.15;
      ctx.strokeRect(x + 0.5, y + 0.5, layout.cell - 1, layout.cell - 1);
      if (state.bossBlocked.has(key)) {
        ctx.strokeStyle = "rgba(238,157,183,0.72)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + layout.cell - 5, y + layout.cell - 5);
        ctx.moveTo(x + layout.cell - 5, y + 5);
        ctx.lineTo(x + 5, y + layout.cell - 5);
        ctx.stroke();
      }
      if (!pathKeySet.has(key) && !isBlockedCell(key) && !isCultivatedCell(key)) {
        ctx.fillStyle = "rgba(62,81,69,0.18)";
        ctx.fillRect(x + 3, y + 3, layout.cell - 6, layout.cell - 6);
      }
    }
  }
  drawRouteStones(time);
  ctx.restore();
  drawMapSideLabels();
  drawDropHighlight(time);
}

function drawBossWeather(time) {
  if (state.rainLeft <= 0) return;
  const alpha = Math.min(0.42, state.rainLeft * 0.12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.boardX, layout.boardY, layout.boardW, layout.boardH);
  ctx.clip();
  ctx.fillStyle = `rgba(65,105,145,${alpha * 0.38})`;
  ctx.fillRect(layout.boardX, layout.boardY, layout.boardW, layout.boardH);
  ctx.strokeStyle = `rgba(154,207,244,${alpha})`;
  ctx.lineWidth = 1.2;
  const spacing = Math.max(13, layout.cell * 0.42);
  const shift = (time * 260) % spacing;
  for (let x = layout.boardX - layout.boardH; x < layout.boardX + layout.boardW; x += spacing) {
    for (let y = layout.boardY - spacing + shift; y < layout.boardY + layout.boardH; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + y * 0.28, y);
      ctx.lineTo(x + y * 0.28 - 5, y + 12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRouteStones(time) {
  ctx.strokeStyle = "rgba(79,63,55,0.72)";
  ctx.lineWidth = 2;
  for (const path of Object.values(PLAYER_PATHS)) {
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      const x = c * layout.cell + layout.cell / 2;
      const y = r * layout.cell + layout.cell / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const a = 0.42 + Math.sin(time * 4) * 0.08;
  ctx.fillStyle = `rgba(115,70,51,${a})`;
  for (const path of Object.values(PLAYER_PATHS)) {
    for (let i = 0; i < path.length; i += 2) {
      const [r, c] = path[i];
      circle(c * layout.cell + layout.cell / 2, r * layout.cell + layout.cell / 2, 2.2, true, false);
    }
  }
}

function drawMapSideLabels() {
  for (const [gate, path] of Object.entries(PLAYER_PATHS)) {
    const [r, c] = path.at(-1);
    const x = layout.boardX + (c + 0.5) * layout.cell;
    const y = layout.boardY + (r + 0.5) * layout.cell;
    if (!isADouAnimationReady()) {
      ctx.save();
      ctx.globalAlpha = 0.82;
      drawCalligraphy("斗", x, y + layout.cell * 0.12, layout.cell * 0.72, "#18110e");
      ctx.restore();
    }
    const heartsY = y + (r < BOARD_ROWS / 2 ? layout.cell * 0.42 : -layout.cell * 0.48);
    for (let i = 0; i < 3; i++) {
      drawHeart(x - 13 + i * 13, heartsY, i < state.douHp[gate] ? "#d83435" : "#6b5d57");
    }
  }
}

function drawDropHighlight(time) {
  if (!state.drag?.hover) return;
  const hover = state.drag.hover;
  const p = hover.kind === "board" ? cellRect(hover.r, hover.c) : campSlotRect(hover.i);
  ctx.save();
  ctx.globalAlpha = 0.72 + Math.sin(time * 12) * 0.18;
  ctx.strokeStyle = canDropOn(hover, state.drag.unit) ? "#f2d04f" : "#d94738";
  ctx.lineWidth = 3;
  roundRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6, 5, false, true);
  ctx.restore();
}

function drawEnemies(time) {
  for (const enemy of state.enemies) {
    if (enemy.dying) continue;
    const pos = enemyPosition(enemy);
    const asset = getHanziAsset(enemy.glyph);
    const segment = currentPathSegment(enemy);
    const walkPose = sampleMotion(asset, "enemyWalk", (enemy.t * 0.9 + enemy.wobble) % 1);
    const hitPose = enemy.hitAge < 0.22 ? sampleMotion(asset, "hit", enemy.hitAge / 0.22) : null;
    const deathPose = enemy.dying ? sampleMotion(asset, "death", enemy.deathAge / 0.34) : null;
    const pose = combinePoses(walkPose, hitPose, deathPose);
    const laneX = -segment.dir.y * enemy.lane * layout.cell;
    const laneY = segment.dir.x * enemy.lane * layout.cell;
    ctx.save();
    ctx.translate(pos.x + laneX + pose.x - enemy.hitDx * (enemy.hitAge < 0.2 ? 5 : 0), pos.y + laneY + pose.y - enemy.hitDy * (enemy.hitAge < 0.2 ? 5 : 0));
    ctx.rotate(pose.rotate + segment.dir.x * 0.025);
    ctx.transform(1, 0, pose.skewX, 1, 0, 0);
    const enemyBuffScale = enemy.inspireLeft > 0 ? 1.2 : 1;
    ctx.scale(pose.scaleX * (enemy.devourScale ?? 1) * enemyBuffScale, pose.scaleY * (enemy.devourScale ?? 1) * enemyBuffScale);
    ctx.globalAlpha = pose.alpha;
    const ink = enemy.hitFlash > 0 ? "#fff" : asset.ink;
    if (!isOriginalEnemyReady(enemy.id)) {
      drawGlyphLayer(enemy.glyph, 0, 9, layout.cell * asset.fontScale, ink, {
        scaleX: pose.glyphScaleX,
        scaleY: pose.glyphScaleY,
        skewX: pose.glyphSkewX,
        rotate: pose.glyphRotate,
        jitter: enemy.hitFlash > 0 ? 0.65 : 0.22,
        stroke: "rgba(255,242,218,0.4)"
      });
      drawEnemyFeet((enemy.t * Math.PI * 2.2) + enemy.wobble, layout.cell * 0.35);
    }
    if (!enemy.dying) {
      ctx.fillStyle = "#d93632";
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      roundRect(-layout.cell * 0.34, -layout.cell * 0.44, layout.cell * 0.68 * hpRatio, 4, 2, true, false);
    }
    ctx.restore();
  }
}

function drawUnits(time) {
  drawUnitBoard(state.board, time, true);
}

function drawUnitBoard(board, time, draggable) {
  for (const [key, unit] of board) {
    if (unit.type === "general-reserved") continue;
    if (draggable && state.drag?.source?.kind === "board" && state.drag.source.key === key) continue;
    const { r, c } = keyToCell(key);
    const rect = cellRect(r, c);
    if (unit.type === "general" && unit.span === 2) drawGeneralCard(unit, rect.x + rect.w, rect.y + rect.h / 2, rect.w * 1.86, time);
    else drawUnitCard(unit, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.9, time, false);
  }
}

function drawGeneralCard(unit, cx, cy, width, time) {
  const height = layout.cell * 0.9;
  const asset = getHanziAsset(unit.token);
  ctx.save();
  ctx.fillStyle = asset.paper;
  ctx.strokeStyle = asset.border;
  ctx.lineWidth = 3;
  roundRect(cx - width / 2, cy - height / 2, width, height, 5, true, true);
  line(cx, cy - height / 2, cx, cy + height / 2, "rgba(130,88,31,0.2)", 1);
  const originalReady = hasOriginalGeneralAnimation(unit.token) && isOriginalGeneralReady(unit.id);
  if (!originalReady) {
    const chars = [...unit.token];
    const pose = sampleGenericGeneralPose(unit, time);
    drawGenericGeneralPart(chars[0] ?? "", cx - width * 0.25, cy + height * 0.17, height * 0.62, asset.ink ?? "#17120f", pose);
    drawGenericGeneralPart(chars[1] ?? "", cx + width * 0.25, cy + height * 0.17, height * 0.62, asset.ink ?? "#17120f", pose);
  }
  drawText(String(unit.level), cx + width / 2 - 10, cy - height / 2 + 15, Math.max(11, height * 0.22), "#10100f", "900", "center");
  const thresholds = ELITE_GENERALS.has(unit.token) ? ELITE_GENERAL_EXP : REGULAR_GENERAL_EXP;
  const currentFloor = thresholds[Math.max(0, unit.level - 1)] ?? 0;
  const next = thresholds[unit.level];
  const progress = next == null ? 1 : Math.max(0, Math.min(1, ((unit.experience ?? 0) - currentFloor) / (next - currentFloor)));
  ctx.fillStyle = "rgba(53,43,35,0.25)";
  roundRect(cx - width * 0.38, cy + height * 0.36, width * 0.76, 4, 2, true, false);
  ctx.fillStyle = "#d8a936";
  roundRect(cx - width * 0.38, cy + height * 0.36, width * 0.76 * progress, 4, 2, true, false);
  drawUnitStatusLabels(unit, cx, cy, height);
  ctx.restore();
}

function drawGenericGeneralPart(glyph, x, y, size, color, pose) {
  ctx.save();
  ctx.translate(x, y - size * 0.18);
  ctx.rotate(pose.rotation * Math.PI / 180);
  ctx.scale(pose.scaleX, pose.scaleY);
  drawCalligraphy(glyph, 0, size * 0.18, size, color);
  ctx.restore();
}

function sampleGenericGeneralPose(unit, time) {
  if (unit.action !== "attack") {
    const idle = ((time * 1000 + unit.wobble * 97) % 600) / 600;
    const k = idle < 0.5 ? idle * 2 : (1 - idle) * 2;
    return { rotation: 0, scaleX: 1 + 0.04 * k, scaleY: 1 - 0.08 * k };
  }
  const p = Math.max(0, Math.min(1, unit.actionAge / Math.max(0.001, unit.actionLife)));
  const frames = [
    [0, 0, 1, 1],
    [150 / 600, -3, 1.04, 0.95],
    [270 / 600, -2, 0.97, 1.05],
    [390 / 600, 0, 1.04, 0.89],
    [1, 0, 1, 1]
  ];
  let i = 1;
  while (i < frames.length - 1 && p > frames[i][0]) i += 1;
  const a = frames[i - 1];
  const b = frames[i];
  const k = (p - a[0]) / Math.max(0.0001, b[0] - a[0]);
  return {
    rotation: a[1] + (b[1] - a[1]) * k,
    scaleX: a[2] + (b[2] - a[2]) * k,
    scaleY: a[3] + (b[3] - a[3]) * k
  };
}

function drawUnitStatusLabels(unit, cx, cy, size) {
  const labels = [];
  if (unit.knockedDown) labels.push(["倒", "#fb2500"]);
  if (unit.sealed) labels.push(["封", "#010b97"]);
  if ((unit.mergeLockedLeft ?? 0) > 0) labels.push(["禁", "#fb4c54"]);
  labels.forEach(([label, color], index) => drawCentered(label, cx - (labels.length - 1) * size * 0.09 + index * size * 0.18, cy - size * 0.31, size * 0.16, color, "900"));
}

function drawBossBlindness() {
  if (state.blindLeft <= 0) return;
  const alpha = Math.min(0.82, 0.48 + state.blindLeft * 0.045);
  const gradient = ctx.createRadialGradient(layout.w / 2, layout.h / 2, layout.cell * 0.6, layout.w / 2, layout.h / 2, Math.max(layout.w, layout.h) * 0.62);
  gradient.addColorStop(0, `rgba(4,10,25,${alpha * 0.32})`);
  gradient.addColorStop(0.55, `rgba(3,8,20,${alpha * 0.72})`);
  gradient.addColorStop(1, `rgba(1,4,12,${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.w, layout.h);
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    if (p.age < 0) continue;
    ctx.save();
    if (p.kind === "slash") {
      ctx.strokeStyle = "#fff9e6";
      ctx.lineWidth = 4;
      line(p.x - 9, p.y + 9, p.x + 10, p.y - 10, "#fff9e6", 4);
      line(p.x - 8, p.y + 8, p.x + 8, p.y - 8, "#222", 1.4);
    } else if (p.kind === "pike") {
      ctx.translate(p.sx, p.sy);
      ctx.rotate(p.rotation ?? 0);
      const thrustProgress = Math.min(1, p.age / p.life);
      const reach = Math.hypot(p.x - p.sx, p.y - p.sy);
      line(-8, 0, reach, 0, "#29231d", 4);
      line(-5, -1, reach + 8, -1, "#f4ecd4", 1.5);
      ctx.globalAlpha = Math.sin(thrustProgress * Math.PI);
      ctx.fillStyle = "#fff5c8";
      ctx.beginPath();
      ctx.moveTo(reach + 13, 0);
      ctx.lineTo(reach + 1, -6);
      ctx.lineTo(reach + 4, 0);
      ctx.lineTo(reach + 1, 6);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === "cavalrySweep") {
      const sweep = Math.min(1, p.age / p.life);
      ctx.strokeStyle = p.sweepIndex === 0 ? "rgba(35,28,22,0.86)" : "rgba(185,120,38,0.7)";
      ctx.lineWidth = p.sweepIndex === 0 ? 5 : 3;
      ctx.beginPath();
      const startAngle = Math.PI / 3 - sweep * Math.PI * 2;
      ctx.arc(p.sx, p.sy, p.sweepRadius, startAngle, startAngle + Math.PI * 0.72);
      ctx.stroke();
    } else {
      const isGeneralProjectile = p.kind === "gold" || p.kind === "generalPierce" || p.kind === "generalArea";
      ctx.strokeStyle = isGeneralProjectile ? "#f8c73a" : "#1c1815";
      ctx.lineWidth = isGeneralProjectile ? 5 : 3;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation ?? 0);
      line(-12, 0, 12, 0, ctx.strokeStyle, ctx.lineWidth);
      circle(12, 0, isGeneralProjectile ? 4 : 2, true, false);
    }
    ctx.restore();
  }
}

function drawCamp(time) {
  const baseY = layout.campY;
  drawSmallPanel(layout.codex.x, layout.codex.y, layout.codex.w, layout.codex.h, "营");
  for (let i = 0; i < CAMP_SIZE; i++) {
    const rect = campSlotRect(i);
    ctx.fillStyle = "#f7f1e4";
    roundRect(rect.x, rect.y, rect.w, rect.h, 3, true, false);
    ctx.strokeStyle = "#6a6258";
    ctx.lineWidth = 2;
    roundRect(rect.x, rect.y, rect.w, rect.h, 3, false, true);
    const recruit = state.recruits.find((item) => item.i === i);
    if (recruit) {
      const k = Math.min(1, recruit.age / recruit.life);
      ctx.save();
      ctx.translate(0, (1 - easeOutBack(k)) * 14);
      ctx.globalAlpha = k;
      if (state.camp[i]) drawUnitCard(state.camp[i], rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.88, time, false);
      ctx.restore();
    } else if (state.camp[i] && !(state.drag?.source?.kind === "camp" && state.drag.source.i === i)) {
      drawUnitCard(state.camp[i], rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.88, time, false);
    }
  }
  drawButton(layout.recruit, "征兵", state.buns >= state.refreshCost ? "#bf6d52" : "#6e625d", "#4a2c26", false);
  drawBun(layout.recruit.x + layout.recruit.w / 2 - 15, layout.recruit.y + layout.recruit.h - 13, 9);
  drawText(String(state.refreshCost), layout.recruit.x + layout.recruit.w / 2 + 8, layout.recruit.y + layout.recruit.h - 8, 14, "#fff7ea", "900", "left");
  drawCentered("营", layout.codex.x + layout.codex.w / 2, baseY + 37, 23, "#fff3e0", "900");
}

function drawDrag(time) {
  if (!state.drag) return;
  const d = state.drag;
  if (d.hover?.kind === "board" && d.unit.type !== "shovel") {
    const target = cellCenter(d.hover.r, d.hover.c);
    ctx.save();
    ctx.globalAlpha = 0.42 + Math.sin(time * 8) * 0.05;
    ctx.setLineDash([6, 7]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#d4ba62";
    ctx.beginPath();
    ctx.arc(target.x, target.y, getUnitRange(d.unit) * layout.cell, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    line(d.originX, d.originY, d.x, d.y, "#201915", 2);
    ctx.setLineDash([]);
    ctx.restore();
  }
  drawUnitCard(d.unit, d.x, d.y, layout.cell * 0.92, time, true);
}

function drawEffects() {
  for (const link of state.charmLinks) {
    if (link.age < 0) continue;
    const k = Math.min(1, link.age / link.life);
    const endK = Math.min(1, k / 0.45);
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.min(1, k) * Math.PI) * 0.9;
    ctx.strokeStyle = link.color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(link.solid ? [] : [5, 5]);
    ctx.beginPath();
    ctx.moveTo(link.sx, link.sy);
    ctx.quadraticCurveTo((link.sx + link.tx) / 2, Math.min(link.sy, link.ty) - layout.cell * (link.charge ? 2.8 : 1), lerp(link.sx, link.tx, endK), lerp(link.sy, link.ty, endK));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  for (const effect of state.hitSprites) drawOriginalHitEffect(ctx, effect);
  for (const g of state.ghosts) {
    const k = g.age / g.life;
    const asset = getHanziAsset(g.glyph);
    const pose = sampleMotion(asset, "death", k);
    ctx.save();
    ctx.globalAlpha = pose.alpha;
    ctx.translate(g.x + g.vx * k + pose.x, g.y + g.vy * k + pose.y);
    ctx.rotate(g.rotate + pose.rotate);
    ctx.transform(1, 0, pose.skewX, 1, 0, 0);
    ctx.scale(pose.scaleX, pose.scaleY);
    drawGlyphLayer(g.glyph, 0, 0, g.size, asset.ink, {
      scaleX: pose.glyphScaleX,
      scaleY: pose.glyphScaleY,
      jitter: 1.4,
      stroke: "rgba(255,255,255,0.35)"
    });
    ctx.restore();
  }
  for (const s of state.strokes) {
    const k = s.age / s.life;
    ctx.save();
    ctx.globalAlpha = (1 - k) * s.alpha;
    const sx = lerp(s.x1, s.x2, k * 0.18);
    const sy = lerp(s.y1, s.y2, k * 0.18);
    line(sx, sy, s.x2, s.y2, s.color, s.width * (1 - k * 0.5));
    if (s.glint) line(sx, sy - 1.5, s.x2 - (s.x2 - sx) * 0.14, s.y2 - (s.y2 - sy) * 0.14 - 1.5, "rgba(255,248,226,0.75)", Math.max(1, s.width * 0.32) * (1 - k * 0.4));
    if (s.tip) drawStrokeTip(s, k);
    ctx.restore();
  }
  for (const p of state.particles) {
    const k = p.age / p.life;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = p.color;
    circle(p.x, p.y, p.size * (1 - k * 0.35), true, false);
    ctx.restore();
  }
  for (const f of state.floats) {
    const k = f.age / f.life;
    if (f.type === "bun") {
      const x = lerp(f.sx, f.tx, easeOutCubic(k));
      const y = lerp(f.sy, f.ty, easeInOut(k)) - Math.sin(k * Math.PI) * 28;
      drawBun(x, y, 10 + (1 - k) * 3);
    } else {
      ctx.save();
      ctx.globalAlpha = 1 - k;
      drawText(f.text, f.x, f.y - k * 34, f.size, f.color, "900", "center");
      ctx.restore();
    }
  }
  for (const p of state.pulses) {
    const k = p.age / p.life;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    circle(p.x, p.y, p.fixedRadius ? p.r : p.r * (0.55 + k * 1.25), false, true);
    ctx.restore();
  }
}

function drawAbsorbEvents(time) {
  for (const a of state.absorbs) {
    const k = a.age / a.life;
    const asset = getHanziAsset(a.glyph);
    const x = lerp(a.sx, a.tx, easeInOut(k));
    const y = lerp(a.sy, a.ty, easeInOut(k)) - Math.sin(k * Math.PI) * 8;
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, k - 0.72) / 0.28;
    ctx.translate(x, y);
    ctx.rotate(a.rotate * (1 - k) + Math.sin(time * 20 + a.phase) * 0.03 * (1 - k));
    ctx.scale(1 - k * 0.18, 1 - k * 0.18);
    ctx.fillStyle = asset.paper ?? "#fff5ce";
    roundRect(-a.size / 2, -a.size / 2, a.size, a.size, 4, true, false);
    ctx.strokeStyle = "#d6ad33";
    ctx.lineWidth = 2;
    roundRect(-a.size / 2, -a.size / 2, a.size, a.size, 4, false, true);
    drawGlyphLayer(a.glyph, 0, a.size * asset.baseline, a.size * asset.fontScale, asset.ink, { scaleX: 1 + k * 0.08, scaleY: 1 - k * 0.04, jitter: 0.7 });
    ctx.restore();
  }
}

function drawGlyphLayer(text, x, y, size, color, pose = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, pose.skewX ?? 0, 1, 0, 0);
  ctx.rotate(pose.rotate ?? 0);
  ctx.scale(pose.scaleX ?? 1, pose.scaleY ?? 1);
  const drawn = drawVectorHanzi(ctx, text, size, color, {
    jitter: pose.jitter ?? 0,
    stroke: pose.stroke,
    breathe: Math.abs((pose.glyphScaleX ?? 1) - (pose.glyphScaleY ?? 1)) + Math.abs(pose.rotate ?? 0),
    attack: pose.glow ?? 0,
    merge: Math.max(0, ((pose.glyphScaleX ?? 1) - 1) * 0.8),
    phase: performance.now() * 0.001,
    action: pose.action,
    actionProgress: pose.actionProgress
  });
  if (!drawn) drawInkSigil(size, color);
  ctx.restore();
}

function drawInkSigil(size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, size * 0.12);
  line(-size * 0.24, -size * 0.34, size * 0.22, -size * 0.28, color, ctx.lineWidth);
  line(-size * 0.12, -size * 0.08, size * 0.28, size * 0.04, color, ctx.lineWidth * 0.86);
  line(size * 0.08, -size * 0.38, -size * 0.16, size * 0.34, color, ctx.lineWidth);
  ctx.restore();
}

function drawAttachment(asset, cx, cy, s, time, pose, layer) {
  const type = asset.attachment;
  if (!type) return;
  ctx.save();
  ctx.globalAlpha = 0.58 + pose.glow * 0.35;
  if (type === "blade" && layer === "over") {
    line(cx + s * 0.1, cy - s * 0.26, cx + s * (0.28 + pose.glow * 0.16), cy - s * 0.02, "#dce7e9", Math.max(2, s * 0.06));
    line(cx - s * 0.22, cy - s * 0.14, cx + s * 0.22, cy + s * 0.2, "#201b18", Math.max(2, s * 0.04));
  } else if (type === "spear" && layer === "over") {
    line(cx - s * 0.3, cy + s * 0.24, cx + s * (0.25 + pose.glow * 0.16), cy - s * 0.25, "#5d3f2c", Math.max(2, s * 0.04));
    circle(cx + s * (0.25 + pose.glow * 0.16), cy - s * 0.25, Math.max(2, s * 0.035), true, false, "#c93d2f");
  } else if (type === "bow" && layer === "under") {
    ctx.strokeStyle = "#1c1714";
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.beginPath();
    ctx.arc(cx + s * 0.08, cy + s * 0.08, s * 0.3, -1.22, 1.18);
    ctx.stroke();
    line(cx - s * 0.18, cy + s * 0.08, cx + s * (0.26 + pose.glow * 0.1), cy, "#1c1714", Math.max(1.5, s * 0.03));
  } else if (type === "speed" && layer === "under") {
    for (let i = 0; i < 3; i++) line(cx - s * (0.34 + i * 0.08), cy + s * (0.2 - i * 0.12), cx - s * (0.16 + i * 0.08), cy + s * (0.16 - i * 0.12), "#3b2b21", Math.max(1.4, s * 0.025));
  } else if (type === "general-ring" && layer === "under") {
    ctx.strokeStyle = "#d29b22";
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.beginPath();
    ctx.arc(cx, cy, s * (0.35 + pose.glow * 0.05), time * 2, time * 2 + Math.PI * 1.35);
    ctx.stroke();
  } else if (type === "shovel" && layer === "tool") {
    drawShovel(cx, cy, s * 0.62);
  }
  ctx.restore();
}

function drawEnemyFeet(phase, width) {
  const a = Math.sin(phase) * width * 0.16;
  line(-width * 0.25, 22, -width * 0.42 - a, 28, "rgba(31,24,18,0.68)", 2);
  line(width * 0.2, 22, width * 0.36 + a, 28, "rgba(31,24,18,0.68)", 2);
}

function drawMessages() {
  for (const [index, m] of state.messages.entries()) {
    const k = m.age / m.life;
    const y = layout.boardY + 38 + index * 28 - Math.max(0, k - 0.75) * 50;
    ctx.save();
    ctx.globalAlpha = k < 0.14 ? k / 0.14 : Math.min(1, (1 - k) / 0.2);
    drawOutlinedText(m.text, layout.w / 2, y, 20, m.color);
    ctx.restore();
  }
}

function drawEnd() {
  ctx.fillStyle = "rgba(13,11,10,0.62)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  const w = Math.min(300, layout.w - 58);
  const x = (layout.w - w) / 2;
  const y = layout.h * 0.28;
  ctx.fillStyle = "#f5ead8";
  roundRect(x, y, w, 260, 10, true, false);
  ctx.strokeStyle = "#3c2821";
  ctx.lineWidth = 3;
  roundRect(x, y, w, 260, 10, false, true);
  drawInkTitle(state.banner?.title ?? "结束", layout.w / 2, y + 58, 42, state.banner?.won ? "#a32d24" : "#25201d");
  drawCentered(state.banner?.sub ?? "", layout.w / 2, y + 96, 18, "#4b3c33", "800");
  drawCentered(`坚持到第${state.wave}波`, layout.w / 2, y + 132, 20, "#9b342b", "900");
  drawButton({ x: layout.w / 2 - 92, y: y + 176, w: 184, h: 54 }, "再来一局", "#b85845", "#68332b", false);
}

function drawUnitCard(unit, cx, cy, size, time, dragging) {
  const token = unit.token;
  const glyph = displayGlyph(unit);
  const asset = getHanziAsset(unit.type === "shovel" ? "铲" : glyph);
  const k = Math.max(0, Math.min(1, (performance.now() - unit.placedAt) / 260));
  const appear = dragging ? 1 : Math.max(0.2, 0.65 + easeOutBack(k) * 0.35);
  const asleep = unit.type === "char" && isOnBoard(unit) && !isCharPairReady(unit);
  const idleName = asleep ? "sleep" : "idle";
  const idlePose = sampleMotion(asset, idleName, ((time * 0.85 + unit.wobble) % 1 + 1) % 1);
  const actionProgress = unit.action && unit.action !== "idle" ? unit.actionAge / unit.actionLife : 0;
  const actionPose = unit.action && unit.action !== "idle" ? sampleMotion(asset, unit.action, actionProgress) : null;
  const dragPose = dragging ? sampleMotion(asset, "drag", 0.45) : null;
  const pose = combinePoses(idlePose, actionPose, dragPose);
  const s = size * appear * (dragging ? 1.03 : 1);
  const x = cx - s / 2;
  const y = cy - s / 2;
  ctx.save();
  ctx.shadowColor = dragging ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)";
  ctx.shadowBlur = dragging ? 10 : 4 + pose.shadow * 3 + pose.glow * 5;
  ctx.shadowOffsetY = dragging ? 8 : 2;

  ctx.globalAlpha = pose.alpha;
  ctx.fillStyle = asset.paper ?? "#faf5e9";
  roundRect(x, y, s, s, 4, true, false);
  ctx.strokeStyle = asset.border ?? (unit.type === "general" ? "#d7ad35" : "#756b61");
  ctx.lineWidth = unit.type === "general" ? 3 : 2;
  roundRect(x, y, s, s, 4, false, true);
  if (pose.glow > 0.05) {
    ctx.save();
    ctx.globalAlpha = pose.glow * 0.55;
    ctx.strokeStyle = asset.role === "general" ? "#f3c44e" : "#fff1a8";
    ctx.lineWidth = 3;
    roundRect(x - 3, y - 3, s + 6, s + 6, 7, false, true);
    ctx.restore();
  }

  if (unit.type === "shovel") {
    drawAttachment(asset, cx, cy, s, time, pose, "tool");
  } else {
    const glyphCx = cx + pose.x + pose.glyphX;
    const glyphCy = cy + pose.y + s * asset.baseline + pose.glyphY;
    const glyphPose = {
      scaleX: pose.scaleX * pose.glyphScaleX,
      scaleY: pose.scaleY * pose.glyphScaleY,
      skewX: pose.skewX + pose.glyphSkewX,
      rotate: asset.tilt + pose.rotate + pose.glyphRotate,
      jitter: asleep ? 0.18 : asset.jitter,
      stroke: unit.type === "general" ? "rgba(128,79,19,0.26)" : "rgba(255,255,255,0.18)",
      action: unit.action,
      actionProgress
    };
    const usedOriginalGeneral = unit.type === "general" && hasOriginalGeneralAnimation(unit.token) && isOriginalGeneralReady(unit.id);
    const farmerCycle = unit.farmMode === "crazy" ? 1 : FARMER_CYCLE_SECONDS[Math.max(0, Math.min(4, unit.level - 1))];
    const usedOriginalFarmer = unit.type === "farmer" && drawOriginalFarmer(ctx, cx, cy, s, {
      time,
      wobble: unit.wobble,
      progress: unit.farmTimer / farmerCycle,
      mode: unit.farmMode,
      speedScale: farmerCycle / 20,
      active: isOnBoard(unit),
      asleep,
      dragging
    });
    const usedSpriteGlyph = usedOriginalGeneral || usedOriginalFarmer || (unit.type === "weapon" && hasWeaponGlyphSprite(unit.token) && drawWeaponGlyphSprite(ctx, unit.token, cx, cy, s, {
      action: unit.action,
      actionProgress,
      actionAge: unit.actionAge,
      actionDx: unit.actionDx,
      actionDy: unit.actionDy,
      actionStartAngle: unit.actionStartAngle,
      actionAimAngle: unit.actionAimAngle,
      aimAngle: unit.aimAngle,
      aimReturnAge: unit.aimReturnAge,
      engaged: unit.engaged,
      asleep,
      dragging
    }));
    if (!usedSpriteGlyph) {
      drawAttachment(asset, glyphCx, cy + pose.y, s, time, pose, "under");
      drawGlyphLayer(glyph, glyphCx, glyphCy, s * asset.fontScale, asleep ? "#857a70" : asset.ink, glyphPose);
      if (unit.action === "attack") drawCardAttackOverlay(glyph, cx, cy, s, actionProgress, weapons[unit.token]?.kind ?? asset.role);
      drawAttachment(asset, glyphCx, cy + pose.y, s, time, pose, "over");
    }
    if (asleep) drawCentered("休", cx, cy - s * 0.22, s * 0.2, "#a8823d", "900");
    if (unit.confused) {
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.strokeStyle = "#9e326d";
      ctx.lineWidth = Math.max(2, s * 0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.32, time * 2.4, time * 2.4 + Math.PI * 1.55);
      ctx.stroke();
      drawCentered("乱", cx, cy - s * 0.28, s * 0.2, "#b8296b", "900");
      ctx.restore();
    }
    if (unit.charmed) {
      ctx.save();
      ctx.globalAlpha = 0.86;
      ctx.strokeStyle = "#d9207a";
      ctx.lineWidth = Math.max(2, s * 0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.31, -Math.PI * 0.1, Math.PI * 1.1);
      ctx.stroke();
      drawCentered("魅", cx, cy - s * 0.28, s * 0.2, "#d9207a", "900");
      ctx.restore();
    }
    if (unit.rained) drawCentered("雨", cx + s * 0.27, cy - s * 0.28, s * 0.15, "#4d9fd4", "900");
    drawUnitStatusLabels(unit, cx, cy, s);
  }
  if (unit.type !== "shovel") {
    drawText(String(unit.level), x + s - 9, y + 15, Math.max(11, s * 0.22), "#10100f", "900", "center");
  }
  if (unit.type === "farmer") {
    const cycle = FARMER_CYCLE_SECONDS[Math.max(0, Math.min(4, unit.level - 1))];
    ctx.fillStyle = "rgba(53,43,35,0.28)";
    roundRect(x + s * 0.12, y + s * 0.82, s * 0.76, 4, 2, true, false);
    ctx.fillStyle = "#d8a936";
    roundRect(x + s * 0.12, y + s * 0.82, s * 0.76 * Math.min(1, unit.farmTimer / cycle), 4, 2, true, false);
  }
  ctx.restore();
}

function drawCardAttackOverlay(glyph, cx, cy, size, progress, kind) {
  const k = Math.max(0, Math.min(1, progress));
  const flash = Math.sin(Math.PI * k);
  if (flash <= 0.02) return;
  const sweep = easeOutCubic(Math.min(1, k * 1.2));
  const x = cx - size / 2;
  const y = cy - size / 2;
  const band = (start, end) => {
    if (k <= start || k >= end) return 0;
    return Math.sin(((k - start) / (end - start)) * Math.PI);
  };
  const cover = 1 - smoothstep(0.54, 0.78, k);
  const release = band(0.5, 0.86);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.12 + flash * 0.38;
  line(x + size * 0.06, y + size * (0.8 - sweep * 0.06), x + size * 0.9, y + size * (0.78 + sweep * 0.015), "#e5c236", Math.max(2, size * 0.05));
  line(x + size * 0.1, y + size * (0.84 - sweep * 0.05), x + size * 0.72, y + size * 0.81, "rgba(255,247,198,0.78)", Math.max(1, size * 0.016));
  ctx.restore();

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "stab") {
    ctx.globalAlpha = Math.max(0, cover) * 0.86;
    line(x - size * 0.12 + sweep * size * 0.1, y + size * 0.43, x + size * (0.72 + sweep * 0.1), y + size * 0.28, "#15110f", Math.max(3, size * 0.095));
    line(x + size * 0.02 + sweep * size * 0.08, y + size * 0.54, x + size * (0.78 + sweep * 0.08), y + size * 0.39, "#15110f", Math.max(2, size * 0.052));
    ctx.globalAlpha = release * 0.42;
    line(x + size * 0.1, y + size * 0.5, x + size * 0.9, y + size * 0.34, "rgba(255,247,220,0.88)", Math.max(1, size * 0.018));
  } else if (kind === "dash") {
    ctx.globalAlpha = flash * 0.72;
    for (let i = 0; i < 3; i++) {
      const off = i * size * 0.13;
      const y0 = y + size * (0.28 + i * 0.08);
      line(x - size * 0.08 + off + sweep * size * 0.18, y0, x + size * (0.72 + i * 0.06), y0 - size * (0.08 + i * 0.015), "#16110f", Math.max(2, size * (0.072 - i * 0.012)));
    }
  } else if (kind === "arrow" || glyph === "弓") {
    ctx.globalAlpha = flash * 0.46;
    ctx.strokeStyle = "#15110f";
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + size * (0.12 + sweep * 0.08), y + size * 0.64);
    ctx.quadraticCurveTo(x + size * 0.33, y + size * (0.14 + 0.07 * flash), x + size * (0.72 + sweep * 0.09), y + size * 0.28);
    ctx.stroke();
    line(x + size * 0.18, y + size * 0.58, x + size * 0.84, y + size * (0.42 - sweep * 0.06), "#15110f", Math.max(2, size * 0.034));
  } else {
    ctx.globalAlpha = flash * 0.52;
    line(x + size * (0.42 + sweep * 0.06), y + size * 0.72, x + size * (0.86 + sweep * 0.04), y + size * 0.3, "#15110f", Math.max(3, size * 0.07));
    line(x + size * (0.54 + sweep * 0.04), y + size * 0.78, x + size * (0.82 + sweep * 0.04), y + size * 0.48, "#15110f", Math.max(2, size * 0.038));
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = flash * 0.35;
  line(x + size * 0.22, y + size * 0.2, x + size * 0.72, y + size * 0.12, "rgba(255,255,235,0.85)", Math.max(1, size * 0.025));
  ctx.restore();
}

function displayGlyph(unit) {
  if (unit.type === "general") return unit.token;
  if (unit.type === "farmer") return "农";
  return weapons[unit.token]?.glyph ?? unit.token;
}

function isOnBoard(unit) {
  for (const value of state.board.values()) if (value === unit) return true;
  return false;
}

function isCharPairReady(unit) {
  for (const [key, value] of state.board) {
    if (value !== unit) continue;
    const { r, c } = keyToCell(key);
    return charPairs.some((pair) => {
      if (unit.token === pair.first) return state.board.get(`${r},${c + 1}`)?.token === pair.second;
      if (unit.token === pair.second) return state.board.get(`${r},${c - 1}`)?.token === pair.first;
      return false;
    });
  }
  return false;
}

function pointerDown(event) {
  event.preventDefault();
  audioEngine.unlock();
  const p = eventPoint(event);
  if (state.mode === "menu") {
    if (state.menuPanel) {
      const panel = { x: layout.w / 2 - 76, y: layout.h * 0.2 + layout.h * 0.58 - 62, w: 152, h: 44 };
      if (hitRect(p, panel)) state.menuPanel = null;
      return;
    }
    if (hitRect(p, layout.start)) startGame();
    else if (hitRect(p, { x: 18, y: layout.h - 82, w: 48, h: 52 })) state.menuPanel = "ranking";
    else if (hitRect(p, { x: layout.w - 72, y: layout.h - 88, w: 58, h: 70 })) state.menuPanel = "bag";
    return;
  }
  if (state.mode === "end") {
    if (hitRect(p, { x: layout.w / 2 - 92, y: layout.h * 0.28 + 176, w: 184, h: 54 })) startGame();
    return;
  }
  const propSlot = layout.propSlots?.find((slot) => hitRect(p, slot));
  if (propSlot) {
    if (state.propCooldowns[propSlot.key] > 0) toast(`${ACTIVE_PROP_CONFIG[propSlot.key].label}尚未冷却`, "#d84335");
    else {
      state.selectedProp = state.selectedProp === propSlot.key ? null : propSlot.key;
      toast(state.selectedProp ? `选择${ACTIVE_PROP_CONFIG[propSlot.key].label}的目标` : "取消使用道具", "#f3c037");
    }
    return;
  }
  if (hitCircle(p, layout.pause)) {
    state.paused = !state.paused;
    toast(state.paused ? "暂停" : "继续", "#f3c037");
    return;
  }
  if (hitRect(p, layout.recruit)) {
    recruit();
    return;
  }
  if (state.selectedProp) {
    const target = hitBoard(p);
    if (target) {
      useSelectedProp(target.r, target.c);
      return;
    }
  }
  const camp = hitCamp(p);
  if (camp && state.camp[camp.i]) {
    startDrag(state.camp[camp.i], { kind: "camp", i: camp.i }, p);
    state.camp[camp.i] = null;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    return;
  }
  const cell = hitBoard(p);
  if (cell) {
    const key = `${cell.r},${cell.c}`;
    const unit = state.board.get(key);
    if (unit) {
      if (unit.type === "general-reserved") {
        const owner = state.board.get(unit.ownerKey);
        if (owner) {
          startDrag(owner, { kind: "board", key: unit.ownerKey, reserveKey: key }, p);
          state.board.delete(unit.ownerKey);
          state.board.delete(key);
        }
      } else {
        const reserveKey = unit.type === "general" && unit.span === 2 ? `${cell.r},${cell.c + 1}` : null;
        startDrag(unit, { kind: "board", key, reserveKey }, p);
        state.board.delete(key);
        if (reserveKey) state.board.delete(reserveKey);
      }
    }
  }
  if (state.drag && canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
}

function useSelectedProp(r, c) {
  const prop = state.selectedProp;
  const config = ACTIVE_PROP_CONFIG[prop];
  if (!config) return false;
  const key = `${r},${c}`;
  if ((prop === "trap" || prop === "landmine") && !pathKeySet.has(key)) {
    toast("陷阱和地雷只能放在道路上", "#d84335");
    return false;
  }
  if (prop === "trap" && state.traps.some((item) => item.key === key && !item.triggered)) return false;
  if (prop === "landmine" && state.landmines.some((item) => item.key === key)) return false;
  if (prop === "trap") state.traps.push({ key, r, c, triggered: false, age: 0 });
  else if (prop === "landmine") state.landmines.push({ key, r, c });
  else if (prop === "inkstone") {
    const target = cellCenter(r, c);
    state.inkEffects.push({ x: target.x, y: target.y, age: 0, life: 5 });
    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.dying) continue;
      const pos = enemyPosition(enemy);
      if (Math.hypot(pos.x - target.x, pos.y - target.y) <= layout.cell * 1.5) enemy.slowLeft = Math.max(enemy.slowLeft ?? 0, 5);
    }
  }
  state.propCooldowns[prop] = config.cooldown;
  audioEngine.play(prop === "trap" ? "trap_trigger" : prop === "landmine" ? "landmine_explode" : "skill_ink_splash", 0.26, 0.1);
  state.selectedProp = null;
  const center = cellCenter(r, c);
  pulseAt(center.x, center.y, prop === "inkstone" ? "#16110f" : "#d19b42", layout.cell);
  return true;
}

function pointerMove(event) {
  if (!state.drag) return;
  event.preventDefault();
  const p = eventPoint(event);
  state.drag.x = p.x;
  state.drag.y = p.y;
  state.drag.hover = hitBoard(p) ?? hitCamp(p);
}

function pointerUp(event) {
  if (!state.drag) return;
  event.preventDefault();
  const p = eventPoint(event);
  state.drag.x = p.x;
  state.drag.y = p.y;
  state.drag.hover = hitBoard(p) ?? hitCamp(p);
  const ok = dropDrag();
  if (!ok) restoreDrag();
  state.drag = null;
  if (canvas.releasePointerCapture) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  }
}

canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "play") state.paused = true;
});
window.addEventListener("keydown", (event) => {
  audioEngine.unlock();
  if (event.key === "Escape" && state.mode === "play") {
    state.paused = !state.paused;
    audioEngine.play(state.paused ? "btn_down" : "popup_notification", 0.14, 0.1);
    event.preventDefault();
  } else if (event.key === "Enter" && state.mode === "menu" && !state.menuPanel) {
    startGame();
    event.preventDefault();
  }
});

function startDrag(unit, source, p) {
  setUnitAction(unit, "drag", 0.18, 0, -1);
  state.drag = {
    unit,
    source,
    x: p.x,
    y: p.y,
    originX: p.x,
    originY: p.y,
    hover: source.kind === "board" ? keyToHover(source.key) : { kind: "camp", i: source.i }
  };
}

function dropDrag() {
  const d = state.drag;
  const target = d.hover;
  if (!target || !canDropOn(target, d.unit)) return false;
  if (target.kind === "camp") return dropOnCamp(d.unit, target.i);
  return dropOnBoard(d.unit, target.r, target.c);
}

function canDropOn(target, unit) {
  if (target.kind === "camp") return true;
  const key = `${target.r},${target.c}`;
  if (unit.type === "shovel") {
    return playerCellType(target.r, target.c) === "2_0" && !state.cultivated.has(key) && !state.board.has(key);
  }
  if (unit.type === "farmer") {
    const type = playerCellType(target.r, target.c);
    return (state.cultivated.has(key) || type === "2_0") && !pathKeySet.has(key);
  }
  if (unit.type === "general" && unit.span === 2) {
    const rightKey = `${target.r},${target.c + 1}`;
    if (target.c >= BOARD_COLS - 1 || !state.cultivated.has(rightKey) || pathKeySet.has(rightKey) || isBlockedCell(rightKey)) return false;
    const right = state.board.get(rightKey);
    if (right && right.type !== "general-reserved") return false;
  }
  return state.cultivated.has(key) && !pathKeySet.has(key) && !isBlockedCell(key);
}

function isCultivatedCell(key) {
  return staticCultivatedSet.has(key) || state.cultivated.has(key);
}

function isBlockedCell(key) {
  return state.bossBlocked.has(key) || (blockedSet.has(key) && !state.cultivated.has(key));
}

function dropOnCamp(unit, i) {
  const existing = state.camp[i];
  if (existing && canMerge(existing, unit)) {
    absorbFx(existing, unit, campSlotCenter(i), state.drag ? { x: state.drag.x, y: state.drag.y } : campSlotCenter(i));
    state.camp[i] = mergedUnit(existing, unit);
    mergeFx(campSlotCenter(i));
    return true;
  }
  state.camp[i] = unit;
  setUnitAction(unit, "drop", 0.22, 0, 1);
  if (existing) restoreToSource(existing);
  settleFx(campSlotCenter(i));
  scanGeneralPairs();
  return true;
}

function dropOnBoard(unit, r, c) {
  const key = `${r},${c}`;
  if (unit.type === "shovel") {
    state.cultivated.add(key);
    cultivateFx(cellCenter(r, c));
    return true;
  }
  const existing = state.board.get(key);
  if (unit.type === "general" && unit.span === 2) {
    const rightKey = `${r},${c + 1}`;
    state.board.set(key, unit);
    state.board.set(rightKey, { type: "general-reserved", ownerId: unit.id, ownerKey: key });
    unit.placedAt = performance.now();
    setUnitAction(unit, "drop", 0.22, 0, 1);
    if (existing && existing.type !== "general-reserved") restoreToSource(existing);
    settleFx({ x: cellCenter(r, c).x + layout.cell * 0.5, y: cellCenter(r, c).y });
    return true;
  }
  if (existing && canMerge(existing, unit)) {
    absorbFx(existing, unit, cellCenter(r, c), state.drag ? { x: state.drag.x, y: state.drag.y } : cellCenter(r, c));
    const merged = mergedUnit(existing, unit);
    if (merged.type === "farmer") activateFarmerForCell(merged, r, c);
    state.board.set(key, merged);
    mergeFx(cellCenter(r, c));
    scanGeneralPairs();
    return true;
  }
  state.board.set(key, unit);
  if (unit.type === "farmer") activateFarmerForCell(unit, r, c);
  unit.placedAt = performance.now();
  setUnitAction(unit, "drop", 0.22, 0, 1);
  if (existing) restoreToSource(existing);
  settleFx(cellCenter(r, c));
  scanGeneralPairs();
  return true;
}

function restoreDrag() {
  restoreToSource(state.drag.unit);
  toast("不能放在这里", "#d84335");
}

function restoreToSource(unit) {
  const source = state.drag?.source;
  if (!source) return;
  if (source.kind === "camp") state.camp[source.i] = unit;
  else {
    state.board.set(source.key, unit);
    if (source.reserveKey) state.board.set(source.reserveKey, { type: "general-reserved", ownerId: unit.id, ownerKey: source.key });
  }
}

function canMerge(a, b) {
  if ((a.mergeLockedLeft ?? 0) > 0 || (b.mergeLockedLeft ?? 0) > 0) return false;
  if (a.type !== b.type || a.token !== b.token || a.level !== b.level) return false;
  if (a.type === "weapon" || a.type === "farmer") return a.level < 5;
  return false;
}

function activateFarmerForCell(unit, r, c) {
  const key = `${r},${c}`;
  const openFarmland = state.cultivated.has(key) || playerCellType(r, c) === "1_0";
  unit.farmMode = openFarmland ? "crazy" : "framing";
  unit.farmCrazyLeft = openFarmland ? 10 : 0;
  unit.farmTimer = 0;
}

function mergedUnit(a, b) {
  const unit = makeUnit(a.token, Math.max(a.level, b.level) + 1);
  unit.placedAt = performance.now();
  setUnitAction(unit, "merge", 0.48, 0, -1);
  return unit;
}

function scanGeneralPairs() {
  for (let i = 0; i < CAMP_SIZE - 1; i++) {
    const a = state.camp[i];
    const b = state.camp[i + 1];
    if (!a || !b) continue;
    const pair = charPairs.find((item) => a.token === item.first && b.token === item.second);
    if (!pair) continue;
    const general = makeUnit(pair.general, Math.max(a.level, b.level));
    general.span = 2;
    setUnitAction(general, "merge", 0.56, 0, -1);
    absorbFx(a, b, campSlotCenter(i), campSlotCenter(i + 1));
    state.camp[i] = general;
    state.camp[i + 1] = null;
    mergeFx(campSlotCenter(i));
    floatText(pair.general, campSlotCenter(i).x, campSlotCenter(i).y - layout.slot * 0.5, "#d19622", 22);
    toast(`${pair.general}待命`, "#f3c037");
    return;
  }
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS - 1; c++) {
      const aKey = `${r},${c}`;
      const bKey = `${r},${c + 1}`;
      const a = state.board.get(aKey);
      const b = state.board.get(bKey);
      if (!a || !b) continue;
      const pair = charPairs.find((item) => a.token === item.first && b.token === item.second);
      if (!pair) continue;
      const level = Math.max(a.level, b.level);
      const general = makeUnit(pair.general, level);
      general.span = 2;
      setUnitAction(general, "merge", 0.56, 0, -1);
      absorbFx(a, b, cellCenter(r, c), cellCenter(r, c + 1));
      state.board.set(aKey, general);
      state.board.set(bKey, { type: "general-reserved", ownerId: general.id, ownerKey: aKey });
      mergeFx(cellCenter(r, c));
      floatText(pair.general, cellCenter(r, c).x, cellCenter(r, c).y - layout.cell * 0.45, "#d19622", 22);
      toast(`${pair.general}上阵`, "#f3c037");
      return;
    }
  }
}

function recruit() {
  if (state.buns < state.refreshCost) {
    toast("馒头不足", "#d84335");
    shake(0.09, 2);
    return;
  }
  state.buns -= state.refreshCost;
  state.refreshCost += 2;
  for (let i = 0; i < CAMP_SIZE; i++) {
    state.camp[i] = drawOriginalDeckUnit(true);
    state.recruits.push({ i, age: -i * 0.06, life: 0.28 + i * 0.06 });
  }
  toast("征兵完成", "#f3c037");
}

function hitBoard(p) {
  if (p.x < layout.boardX || p.y < layout.boardY || p.x >= layout.boardX + layout.boardW || p.y >= layout.boardY + layout.boardH) return null;
  return {
    kind: "board",
    c: Math.floor((p.x - layout.boardX) / layout.cell),
    r: Math.floor((p.y - layout.boardY) / layout.cell)
  };
}

function hitCamp(p) {
  for (let i = 0; i < CAMP_SIZE; i++) {
    const rect = campSlotRect(i);
    if (hitRect(p, rect)) return { kind: "camp", i };
  }
  return null;
}

function eventPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (layout.w / rect.width),
    y: (event.clientY - rect.top) * (layout.h / rect.height)
  };
}

function keyToCell(key) {
  const [r, c] = key.split(",").map(Number);
  return { r, c };
}

function keyToHover(key) {
  const { r, c } = keyToCell(key);
  return { kind: "board", r, c };
}

function cellRect(r, c) {
  return { x: layout.boardX + c * layout.cell, y: layout.boardY + r * layout.cell, w: layout.cell, h: layout.cell };
}

function cellCenter(r, c) {
  return { x: layout.boardX + c * layout.cell + layout.cell / 2, y: layout.boardY + r * layout.cell + layout.cell / 2 };
}

function campSlotRect(i) {
  return { x: layout.campX + i * (layout.slot + 10), y: layout.campY + 6, w: layout.slot, h: layout.slot };
}

function campSlotCenter(i) {
  const r = campSlotRect(i);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function hitRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function hitCircle(p, c) {
  return Math.hypot(p.x - c.x, p.y - c.y) <= c.r + 8;
}

function settleFx(pos) {
  pulseAt(pos.x, pos.y, "#f7e6a7", layout.cell * 0.36);
}

function mergeFx(pos) {
  pulseAt(pos.x, pos.y, "#f6cd55", layout.cell * 0.72);
  burst(pos.x, pos.y, "#f3c037", 14);
  state.strokes.push({
    x1: pos.x - layout.cell * 0.42,
    y1: pos.y + layout.cell * 0.22,
    x2: pos.x + layout.cell * 0.48,
    y2: pos.y - layout.cell * 0.18,
    color: "#f8d34d",
    width: layout.cell * 0.12,
    alpha: 0.74,
    age: 0,
    life: 0.32
  });
  shake(0.07, 1.2);
}

function absorbFx(a, b, aPos, bPos) {
  const tx = (aPos.x + bPos.x) / 2;
  const ty = (aPos.y + bPos.y) / 2;
  const size = Math.min(layout.cell || 42, layout.slot || layout.cell || 42) * 0.82;
  for (const [unit, pos, sign] of [[a, aPos, -1], [b, bPos, 1]]) {
    state.absorbs.push({
      glyph: displayGlyph(unit),
      sx: pos.x,
      sy: pos.y,
      tx,
      ty,
      size,
      rotate: sign * rand(0.06, 0.12),
      phase: Math.random() * Math.PI * 2,
      age: 0,
      life: 0.18
    });
  }
}

function cultivateFx(pos) {
  pulseAt(pos.x, pos.y, "#fff7c7", layout.cell * 0.6);
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      x: pos.x + rand(-10, 10),
      y: pos.y + rand(-7, 7),
      vx: rand(-48, 48),
      vy: rand(-94, -22),
      size: rand(2, 4),
      color: i % 2 ? "#8c6b4b" : "#d7c09a",
      age: 0,
      life: rand(0.34, 0.62)
    });
  }
  toast("开垦完成", "#f3c037");
}

function strokeTrail(x1, y1, x2, y2, color, alpha = 0.18, kind = "char") {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / len;
  const ny = dy / len;
  const ox = -ny;
  const oy = nx;
  const end = kind === "melee" ? 0.36 : 0.74;
  const start = kind === "melee" ? 0.08 : 0.02;
  state.strokes.push({
    x1: x1 + dx * start,
    y1: y1 + dy * start,
    x2: x1 + dx * end,
    y2: y1 + dy * end,
    color,
    width: layout.cell * (kind === "gold" ? 0.12 : kind === "melee" ? 0.11 : 0.085),
    alpha,
    glint: kind !== "melee",
    tip: kind !== "melee",
    nx,
    ny,
    age: 0,
    life: kind === "melee" ? 0.16 : 0.22
  });
  if (kind === "stab" || kind === "dash") {
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const spread = layout.cell * (kind === "dash" ? 0.2 : 0.13) * side;
      state.strokes.push({
        x1: x1 + dx * 0.04 + ox * spread,
        y1: y1 + dy * 0.04 + oy * spread,
        x2: x1 + dx * 0.68 + ox * spread * 0.35,
        y2: y1 + dy * 0.68 + oy * spread * 0.35,
        color: "#17120f",
        width: layout.cell * (kind === "dash" ? 0.055 : 0.046),
        alpha: alpha * 0.78,
        glint: false,
        tip: false,
        nx,
        ny,
        age: 0,
        life: kind === "dash" ? 0.2 : 0.18
      });
    }
  } else if (kind === "arrow") {
    state.strokes.push({
      x1: x1 + dx * 0.16 - ox * layout.cell * 0.16,
      y1: y1 + dy * 0.16 - oy * layout.cell * 0.16,
      x2: x1 + dx * 0.62 + ox * layout.cell * 0.12,
      y2: y1 + dy * 0.62 + oy * layout.cell * 0.12,
      color: "rgba(24,18,14,0.9)",
      width: layout.cell * 0.04,
      alpha: alpha * 0.82,
      glint: true,
      tip: false,
      nx,
      ny,
      age: 0,
      life: 0.2
    });
  } else if (kind === "melee") {
    state.strokes.push({
      x1: x1 + dx * 0.12 - ox * layout.cell * 0.14,
      y1: y1 + dy * 0.12 - oy * layout.cell * 0.14,
      x2: x1 + dx * 0.34 + ox * layout.cell * 0.18,
      y2: y1 + dy * 0.34 + oy * layout.cell * 0.18,
      color: "rgba(255,246,214,0.95)",
      width: layout.cell * 0.05,
      alpha: alpha * 1.15,
      glint: false,
      tip: false,
      nx,
      ny,
      age: 0,
      life: 0.12
    });
  }
}

function drawStrokeTip(s, k) {
  const size = s.width * (1.25 - k * 0.35);
  const px = s.x2;
  const py = s.y2;
  const nx = s.nx ?? 1;
  const ny = s.ny ?? 0;
  const ox = -ny;
  const oy = nx;
  ctx.save();
  ctx.fillStyle = s.color;
  ctx.beginPath();
  ctx.moveTo(px + nx * size * 1.6, py + ny * size * 1.6);
  ctx.lineTo(px - nx * size * 0.8 + ox * size * 0.62, py - ny * size * 0.8 + oy * size * 0.62);
  ctx.lineTo(px - nx * size * 0.5 - ox * size * 0.62, py - ny * size * 0.5 - oy * size * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function inkSplash(x, y, color, count) {
  burst(x, y, color, count);
  for (let i = 0; i < 3; i++) {
    const a = rand(-Math.PI, Math.PI);
    const len = rand(layout.cell * 0.14, layout.cell * 0.36);
    state.strokes.push({
      x1: x + Math.cos(a) * 3,
      y1: y + Math.sin(a) * 3,
      x2: x + Math.cos(a) * len,
      y2: y + Math.sin(a) * len,
      color,
      width: rand(3, 6),
      alpha: 0.42,
      age: 0,
      life: rand(0.18, 0.34)
    });
  }
}

function enemyDeathFx(x, y, enemy) {
  inkSplash(x, y, "#1c1713", 16);
  inkSplash(x, y, "#f3efe3", 7);
  state.pulses.push({ x, y, color: "#f7e4bb", r: layout.cell * 0.64, age: 0, life: 0.26 });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(34, 118);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 20,
      size: rand(2, 4.5),
      color,
      age: 0,
      life: rand(0.22, 0.46)
    });
  }
}

function pulseAt(x, y, color, r) {
  state.pulses.push({ x, y, color, r, age: 0, life: 0.34 });
}

function floatText(text, x, y, color, size) {
  state.floats.push({ type: "text", text, x, y, color, size, age: 0, life: 0.8 });
}

function toast(text, color = "#f3c037") {
  state.messages.push({ text, color, age: 0, life: 1.55 });
}

function shake(life, strength) {
  state.shakes.push({ age: 0, life, strength });
}

function getShake(time) {
  let x = 0;
  let y = 0;
  for (const s of state.shakes) {
    const k = 1 - s.age / s.life;
    x += Math.sin(time * 170) * s.strength * k;
    y += Math.cos(time * 143) * s.strength * k;
  }
  return { x, y };
}

function drawButton(rect, text, fill, stroke, glow) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = "rgba(245,190,80,0.45)";
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = fill;
  roundRect(rect.x, rect.y, rect.w, rect.h, 6, true, false);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  roundRect(rect.x, rect.y, rect.w, rect.h, 6, false, true);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(rect.x + 6, rect.y + 6, rect.w - 12, Math.max(10, rect.h * 0.3));
  drawCentered(text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 8, 26, "#fff5e5", "900");
  ctx.restore();
}

function drawSmallPanel(x, y, w, h, text) {
  ctx.fillStyle = "#2b221d";
  roundRect(x, y, w, h, 5, true, false);
  ctx.strokeStyle = "#efe0c2";
  ctx.lineWidth = 2;
  roundRect(x + 2, y + 2, w - 4, h - 4, 4, false, true);
  drawCentered(text, x + w / 2, y + 16, 12, "#fff7e8", "800");
}

function drawBun(x, y, r) {
  ctx.save();
  ctx.fillStyle = "#fbf0d5";
  ctx.strokeStyle = "#7a6044";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.2, r * 0.85, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(122,96,68,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - 1, r * 0.46, Math.PI * 1.1, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
}

function drawHeart(x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.bezierCurveTo(x - 10, y - 3, x - 4, y - 11, x, y - 5);
  ctx.bezierCurveTo(x + 4, y - 11, x + 10, y - 3, x, y + 5);
  ctx.fill();
  ctx.restore();
}

function drawStar(x, y, r, color) {
  ctx.save();
  ctx.font = `900 ${r * 3.6}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#5b472b";
  ctx.fillStyle = color;
  ctx.strokeText("★", x, y + 1);
  ctx.fillText("★", x, y + 1);
  ctx.restore();
}

function drawCrossedSwords(x, y, size) {
  drawWeaponIcon(x - 10, y, size, "dao", 0, -0.7);
  drawWeaponIcon(x + 10, y, size, "dao", 0, 0.7);
}

function drawWeaponIcon(x, y, size, type, time = 0, rot = -0.15) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(time * 5) * 0.02);
  ctx.strokeStyle = "#1f1a16";
  ctx.lineWidth = Math.max(2, size * 0.06);
  line(0, size * 0.45, 0, -size * 0.35, ctx.strokeStyle, ctx.lineWidth);
  ctx.fillStyle = type === "dao" ? "#dbe7ef" : "#f4e0bb";
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.lineTo(size * 0.14, -size * 0.26);
  ctx.lineTo(0, -size * 0.18);
  ctx.lineTo(-size * 0.1, -size * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c84132";
  circle(0, size * 0.32, size * 0.08, true, false);
  ctx.restore();
}

function drawShovel(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.65);
  line(0, size * 0.35, 0, -size * 0.25, "#6b4e36", 5);
  ctx.fillStyle = "#aebdc5";
  ctx.strokeStyle = "#26323a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.44);
  ctx.quadraticCurveTo(size * 0.28, -size * 0.28, size * 0.12, -size * 0.05);
  ctx.lineTo(-size * 0.12, -size * 0.05);
  ctx.quadraticCurveTo(-size * 0.28, -size * 0.28, 0, -size * 0.44);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBag(x, y, size) {
  ctx.save();
  ctx.fillStyle = "#c58035";
  ctx.strokeStyle = "#50362b";
  ctx.lineWidth = 3;
  roundRect(x - size / 2, y - size / 2, size, size * 0.85, 8, true, true);
  ctx.fillStyle = "#f0c15a";
  roundRect(x - size * 0.22, y - size * 0.68, size * 0.44, size * 0.26, 4, true, true);
  drawCentered("武器背包", x, y + size * 0.76, 12, "#2b211b", "900");
  ctx.restore();
}

function drawCalligraphy(text, x, y, size, color) {
  if (hasVectorHanzi(text)) {
    ctx.save();
    ctx.translate(x, y);
    drawVectorHanzi(ctx, text, size, color, { jitter: 0.45, breathe: 0.28 });
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px "KaiTi", "STKaiti", "Microsoft YaHei", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawInkTitle(text, x, y, size, color) {
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,247,229,0.78)";
  ctx.font = `900 ${size}px "KaiTi", "STKaiti", "Microsoft YaHei", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawOutlinedText(text, x, y, size, color) {
  ctx.save();
  ctx.font = `900 ${size}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#fff2c6";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawCentered(text, x, y, size, color, weight = "700") {
  drawText(text, x, y, size, color, weight, "center");
}

function drawText(text, x, y, size, color, weight = "700", align = "left") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function roundRect(x, y, w, h, r, fill, stroke) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function circle(x, y, r, fill, stroke, fillStyle) {
  ctx.save();
  if (fillStyle) ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
  ctx.restore();
}

function line(x1, y1, x2, y2, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function syncOriginalGeneralLayer() {
  const generals = [];
  for (const [key, unit] of state.board) {
      if (unit.type === "general-reserved") continue;
      if (unit.type !== "general" || !hasOriginalGeneralAnimation(unit.token)) continue;
      const { r, c } = keyToCell(key);
      const center = cellCenter(r, c);
      generals.push({ ...unit, x: center.x + (unit.span === 2 ? layout.cell * 0.5 : 0), y: center.y });
  }
  syncGeneralAnimations(generals, layout.cell);
}

function syncOriginalEnemyLayer() {
  const enemies = state.enemies.map((enemy) => {
    const pos = enemyPosition(enemy);
    const segment = currentPathSegment(enemy);
    return {
      ...enemy,
      x: pos.x - segment.dir.y * enemy.lane * layout.cell,
      y: pos.y + segment.dir.x * enemy.lane * layout.cell,
      variant: enemy.spineVariant ?? enemy.glyph.charCodeAt(0)
    };
  });
  syncEnemyAnimations(enemies, layout.cell);
}

function syncOriginalADouLayer() {
  const menu = state.mode === "menu";
  if (menu) {
    syncADouAnimations([{ key: "menu", mode: "menu", x: layout.w / 2 - 10, y: layout.h * 0.49, size: 82, hp: 6 }]);
    return;
  }
  const lowerEnd = PLAYER_PATHS.left.at(-1);
  const upperEnd = PLAYER_PATHS.right.at(-1);
  syncADouAnimations([
    {
      key: "player",
      mode: "play",
      x: layout.boardX + (lowerEnd[1] + 0.5) * layout.cell,
      y: layout.boardY + (lowerEnd[0] + 0.62) * layout.cell,
      size: layout.cell * 1.05,
      hp: state.douHp.left,
      mirror: true
    },
    {
      key: "player-upper",
      mode: "play",
      x: layout.boardX + (upperEnd[1] + 0.5) * layout.cell,
      y: layout.boardY + (upperEnd[0] + 0.62) * layout.cell,
      size: layout.cell * 1.05,
      hp: state.douHp.right
    }
  ]);
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}
