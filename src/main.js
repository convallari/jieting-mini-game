import { combinePoses, getHanziAsset, sampleMotion } from "./hanziAssets.js";
import { drawVectorHanzi, hasVectorHanzi } from "./vectorHanzi.js";
import { drawHanddrawnGlyph, isJietingHanddrawnText, preloadHanddrawnGlyphs } from "./handdrawnGlyphAssets.js";
import { drawWeaponGlyphSprite, getWeaponAnimationTiming, hasWeaponGlyphSprite, preloadWeaponGlyphSprites } from "./weaponGlyphSprites.js";
import { drawOriginalHitEffect, getOriginalHitEffectTiming, hitEffectForToken, preloadOriginalHitEffects } from "./originalHitEffects.js";
import { drawOriginalFarmer, preloadOriginalUnitSprites } from "./originalUnitSprites.js";
import { ACTIVE_PROP_CONFIG, drawOriginalPropSprite, preloadOriginalPropSprites } from "./originalPropSprites.js";
import { hasOriginalGeneralAnimation, initSpineGameLayer, isOriginalGeneralReady, resizeSpineGameLayer, syncADouAnimations, syncEnemyAnimations, syncGeneralAnimations } from "./spineGameLayer.js";
import { PLAYER_MAP_GRID, playerCellType } from "./originalMapConfig.js";
import { animationPresetForUnit, effectRecipeForProjectile } from "./animationPresets.js";
import {
  ATTACK_SOUND_BY_TOKEN,
  BOSS_ROSTER,
  BOSS_SOUND_BY_SKILL,
  COMMAND_ORDERS,
  FORMATION_RECIPES,
  ELITE_GENERALS,
  ENEMY_ARCHETYPES,
  GENERAL_COMBAT_CONFIG,
  JIETING_DECK_WEIGHTS,
  JIETING_CAMPAIGN,
  JIETING_TERRAIN,
  SCENARIO_TEXT,
  SUPPLY_CONFIG,
  WEAPON_CONFIG
} from "./scenarioJieting.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const MOBILE_RENDER_MODE = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 600;
const MOBILE_FRAME_INTERVAL = 1000 / 30;

const BASE_URL = import.meta.env?.BASE_URL || "/";
const AUDIO_ROOT = `${BASE_URL}original-audio/`;
const audioEngine = {
  unlocked: false,
  muted: false,
  pending: [],
  pools: new Map(),
  lastPlayed: new Map(),
  unlock() {
    this.unlocked = true;
    const pending = this.pending.splice(0);
    for (const event of pending) this._play(event.name, event.ext, event.volume, event.cooldown);
  },
  _play(name, ext, volume, cooldown = 0.06) {
    if (this.muted || !name) return;
    const key = `${name}.${ext}`;
    const now = performance.now();
    const cooldownMs = Math.max(MOBILE_RENDER_MODE ? 80 : 35, cooldown * 1000);
    if (now - (this.lastPlayed.get(key) ?? -Infinity) < cooldownMs) return;
    this.lastPlayed.set(key, now);
    const pool = this.pools.get(key) ?? [];
    let audio = pool.find((item) => item.paused || item.ended);
    const maxChannels = MOBILE_RENDER_MODE ? 2 : 4;
    if (!audio && pool.length < maxChannels) {
      audio = new Audio(`${AUDIO_ROOT}${key}`);
      audio.preload = "auto";
      pool.push(audio);
      this.pools.set(key, pool);
    }
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  },
  play(name, volume = 0.42, cooldown = 0.06) {
    if (!name || this.muted) return;
    if (!this.unlocked) {
      if (this.pending.length < 24) this.pending.push({ name, ext: "mp3", volume, cooldown });
      return;
    }
    this._play(name, "mp3", volume, cooldown);
  },
  voice(name, volume = 0.5, cooldown = 0.12) {
    if (!name || this.muted) return;
    if (!this.unlocked) {
      if (this.pending.length < 24) this.pending.push({ name, ext: "wav", volume, cooldown });
      return;
    }
    this._play(name, "wav", volume, cooldown);
  }
};

const BOARD_COLS = PLAYER_MAP_GRID.length;
const BOARD_ROWS = PLAYER_MAP_GRID[0].length;
const CAMP_SIZE = 5;

const GAME_PATHS = {
  left: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3]],
  right: [[0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [5, 6], [5, 5], [5, 4], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3]]
};

const pathKeySet = new Set(Object.values(GAME_PATHS).flat().map(([r, c]) => `${r},${c}`));
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

const weapons = WEAPON_CONFIG;

const SOLDIER_LEVEL_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.4125];
const GENERAL_SPEED_MULTIPLIERS = [1, 1.3, 1.56, 1.794, 1.9734];
const GENERAL_DAMAGE_MULTIPLIERS = [1, 1.5, 2.1, 2.73, 3.276];
const FARMER_CYCLE_SECONDS = [40, 30, 20, 15, 10];
const RAIN_ATTACK_SPEED_FACTOR = 0.8;
const ELITE_GENERAL_EXP = [0, 10, 35, 75, 130];
const REGULAR_GENERAL_EXP = [0, 8, 23];
const PLAYER_DAMAGE_FACTOR = 0.8;
const ENEMY_HP_BY_LEVEL = [6, 9, 14, 20, 27, 36, 48, 66];
const ENEMY_COUNT_BY_LEVEL = [20, 24, 28, 32, 36, 40, 44, 52];
const BEST_WAVE_STORAGE_KEY = "jieting.bestWave";
const BEST_ENDING_STORAGE_KEY = "jieting.campaign.bestEnding";
const BEST_SUPPLY_STORAGE_KEY = "jieting.campaign.bestSupply";
const TUTORIAL_STORAGE_KEY = "jieting.campaign.tutorialSeen";
const PREPARE_SECONDS = 5;
const SPAWN_INTERVAL_SECONDS = 1.1;
const WAVE_GAP_SECONDS = 1.5;
const MAX_WAVE = JIETING_CAMPAIGN.maxWave;

const formationRecipes = FORMATION_RECIPES;

const BASIC_DECK_TOKENS = new Set(["刀", "弓", "枪", "骑", "铲", "农"]);
const ENABLE_FARMER_ABILITY = true;
const ORIGINAL_DECK_WEIGHTS = JIETING_DECK_WEIGHTS;

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
let mobileBackgroundCache = null;
const debugParams = new URLSearchParams(window.location.search);
const DEBUG_ATTACK = debugParams.has("debugAttack");
const DEBUG_UNITS = debugParams.has("debugUnits");
const DEBUG_ATTACK_PREVIEW = DEBUG_ATTACK && DEBUG_UNITS;
const DEBUG_GENERAL_IDLE = debugParams.has("debugGeneralIdle");
const DEBUG_STATE = debugParams.has("debugState");
const DEBUG_END = debugParams.get("debugEnd");
const DEBUG_ORDER = debugParams.get("debugOrder");
const DEBUG_SUPPLY = debugParams.has("debugSupply") ? Number(debugParams.get("debugSupply")) : Number.NaN;
const DEBUG_ROUTE = debugParams.get("debugRoute");
const DEBUG_WAVE = Number(debugParams.get("debugWave"));
const DEBUG_BRANCH = debugParams.has("debugBranch");
const DEBUG_TUTORIAL = debugParams.has("debugTutorial");
const DEBUG_ORDER_PROMPT = debugParams.has("debugOrderPrompt");
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
    camp: state.camp.map((unit) => unit?.token ?? null),
    playerBoard: [...state.board.entries()].map(([key, unit]) => [key, unit.token ?? unit.type, unit.level ?? 0, unit.experience ?? 0, Boolean(unit.confused), Boolean(unit.rained), Boolean(unit.charmed), Boolean(unit.knockedDown), Boolean(unit.sealed), Math.ceil(unit.mergeLockedLeft ?? 0)]),
    formations: state.formations.map((formation) => [formation.actorId, formation.token, formation.span, [...formation.memberKeys], formation.action, formation.level]),
    enemies: state.enemies.map((enemy) => {
      const pos = enemyPosition(enemy);
      return [enemy.spineType, enemy.t, enemy.hp, enemy.bossSkillTimer ?? null, enemy.bossCastingLeft ?? 0, Boolean(enemy.bossSkillApplied), enemy.bossRecoveryLeft ?? 0, enemy.chaosAffected?.size ?? 0, Math.round(pos.x), Math.round(pos.y), enemy.bossChargePhase ?? null, enemy.maxHp, enemy.inspireLeft ?? 0, enemy.reviveCount ?? 0, Boolean(enemy.revived), enemy.slowLeft ?? 0, enemy.glyph, enemy.archetype, enemy.pathSide];
    }),
    hitAudit: state.hitAudit,
    cultivated: [...state.cultivated],
    hp: state.douHp,
    blindLeft: state.blindLeft,
    inkEffects: state.inkEffects.length,
    pendingRevives: state.pendingRevives.length,
    reviveAudit: state.reviveAudit,
    waterPressure: state.waterPressure,
    waterBreached: state.waterBreached,
    commandOrder: state.commandOrder,
    commandPoints: state.commandPoints,
    orderLockLeft: state.orderLockLeft,
    supplyIntegrity: state.supplyIntegrity,
    supplyDamageThisWave: state.supplyDamageThisWave,
    endingRoute: state.endingRoute,
    branchPrompt: state.branchPrompt,
    retreatProgress: state.retreatProgress,
    campaignAct: state.campaignAct,
    banner: state.banner,
    tutorialStep: state.tutorialStep,
    freeOrderChoice: state.freeOrderChoice,
    bestWave: state.bestWave
  });
}
preloadWeaponGlyphSprites();
preloadOriginalHitEffects();
preloadOriginalUnitSprites();
preloadOriginalPropSprites();
const handdrawnGlyphsReady = preloadHanddrawnGlyphs().then((count) => {
  canvas.dataset.handdrawnGlyphs = String(count);
  return count;
});
if (!MOBILE_RENDER_MODE) initSpineGameLayer(canvas.clientWidth, canvas.clientHeight);

function createState() {
  return {
    mode: "menu",
    buns: 24,
    displayedBuns: 24,
    refreshCost: 8,
    playerDeckPool: createOriginalDeckPool(),
    wave: 0,
    wavePhase: "prepare",
    waveTimer: PREPARE_SECONDS,
    spawnLeft: 0,
    spawnSequence: 0,
    debugEnemySpawnTimer: 0,
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
    waterPressure: false,
    waterBreached: false,
    waterBreachCount: 0,
    commandOrder: "steady",
    commandPoints: 1,
    orderLockLeft: 0,
    orderActiveLeft: 0,
    orderCooldowns: { risky: 0, steady: 0 },
    combo: 0,
    comboLeft: 0,
    recruitChoices: null,
    freeOrderChoice: true,
    supplyIntegrity: SUPPLY_CONFIG.max,
    supplyDamageThisWave: 0,
    campDamageThisWave: 0,
    endingRoute: null,
    retreatProgress: 0,
    campaignAct: "mountain",
    branchPrompt: false,
    tutorialStep: readTutorialSeen() ? -1 : 0,
    tutorialReplay: false,
    firstRecruitGuaranteed: true,
    lastRecruitBasics: [],
    douHp: { left: 3, right: 3 },
    paused: false,
    cultivated: new Set([...initialCultivated, ...JIETING_TERRAIN.mountain, ...JIETING_TERRAIN.openingDeployment]),
    board: new Map(),
    formations: [],
    formationMemory: new Map(),
    camp: new Array(CAMP_SIZE).fill(null),
    enemies: [],
    projectiles: [],
    hitSprites: [],
    shovelEffects: [],
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
    bestEnding: readBestEnding(),
    bestSupply: readBestSupply(),
    banner: null
  };
}

function makeUnit(token, level = 1) {
  const isWeapon = Boolean(weapons[token]);
  return {
    id: idSeq++,
    token,
    level,
    type: isWeapon ? "weapon" : token === "shovel" ? "shovel" : token === "farmer" ? "farmer" : "char",
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
  const dprCap = MOBILE_RENDER_MODE ? 1.25 : 2;
  const dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
  canvas.dataset.renderProfile = MOBILE_RENDER_MODE ? "mobile" : "desktop";
  canvas.dataset.renderDpr = dpr.toFixed(2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  computeLayout(rect.width, rect.height);
  mobileBackgroundCache = null;
  resizeSpineGameLayer(rect.width, rect.height);
}

function computeLayout(w, h) {
  const safeTop = Math.max(8, Math.min(20, h * 0.018));
  const topH = Math.max(88, Math.min(102, h * 0.115));
  const bottomH = Math.max(142, Math.min(174, h * 0.19));
  const availableH = h - topH - bottomH - 20;
  const cellW = w / BOARD_COLS;
  const cellH = Math.min(cellW, availableH / BOARD_ROWS);
  const cell = Math.sqrt(cellW * cellH);
  const boardW = w;
  const boardH = cellH * BOARD_ROWS;
  const boardX = 0;
  const boardY = Math.round(topH + Math.max(4, (availableH - boardH) * 0.2));
  const campY = boardY + boardH + 12;
  const slot = Math.min(55, Math.floor((w - 92) / CAMP_SIZE));
  layout = {
    w, h, safeTop, topH, bottomH, cell, cellW, cellH, boardX, boardY, boardW, boardH,
    campY, slot,
    campX: Math.round((w - slot * CAMP_SIZE - 10 * (CAMP_SIZE - 1)) / 2 + 20),
    recruit: { x: Math.round(w / 2 - 76), y: campY + slot + 14, w: 152, h: 68 },
    start: { x: Math.round(w / 2 - 108), y: Math.round(h * 0.68), w: 216, h: 64 },
    pause: { x: 14, y: safeTop + 4, r: 17 },
    codex: { x: 15, y: campY + 10, w: 42, h: 42 }
  };
  layout.orderButtons = {
    risky: { x: w - 88, y: safeTop + 5, w: 37, h: 30 },
    steady: { x: w - 49, y: safeTop + 5, w: 37, h: 30 }
  };
  layout.supplyBar = { x: Math.round(w / 2 - 72), y: safeTop + 68, w: 144, h: 9 };
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
  state = createState();
  state.mode = "play";
  if (DEBUG_ATTACK_PREVIEW) setupDebugAttack();
  if (DEBUG_ATTACK && !DEBUG_TUTORIAL) state.tutorialStep = -1;
  if (DEBUG_TUTORIAL) {
    state.tutorialStep = 0;
    state.freeOrderChoice = true;
  }
  if (DEBUG_ORDER_PROMPT) {
    state.tutorialStep = -1;
    state.freeOrderChoice = true;
    state.wavePhase = "prepare";
    state.waveTimer = PREPARE_SECONDS;
  }
  if (DEBUG_ORDER && COMMAND_ORDERS[DEBUG_ORDER]) state.commandOrder = DEBUG_ORDER;
  if (Number.isFinite(DEBUG_SUPPLY)) {
    state.supplyIntegrity = Math.max(0, Math.min(SUPPLY_CONFIG.max, DEBUG_SUPPLY));
    state.waterBreached = state.supplyIntegrity <= 0;
    if (state.waterBreached) state.refreshCost += SUPPLY_CONFIG.recruitPenalty;
  }
  if (DEBUG_ROUTE && JIETING_CAMPAIGN.routes[DEBUG_ROUTE]) state.endingRoute = DEBUG_ROUTE;
  if (Number.isFinite(DEBUG_WAVE) && DEBUG_WAVE > 0) {
    state.wave = Math.min(MAX_WAVE, Math.floor(DEBUG_WAVE));
    state.campaignAct = campaignActForWave(state.wave);
    state.waterPressure = JIETING_TERRAIN.waterPressureWaves.has(state.wave);
  }
  if (DEBUG_BRANCH) {
    state.wave = 8;
    state.campaignAct = campaignActForWave(8);
    state.wavePhase = "decision";
    state.branchPrompt = true;
  }
  if (["hold", "retreat", "lose"].includes(DEBUG_END)) {
    state.wave = DEBUG_END === "lose" ? 3 : MAX_WAVE;
    if (DEBUG_END === "lose") {
      state.mode = "end";
      state.banner = { ...JIETING_CAMPAIGN.endings.defeat, won: false, ending: "defeat" };
    } else {
      state.endingRoute = DEBUG_END;
      state.retreatProgress = 4;
      state.supplyIntegrity = 80;
      finishCampaign();
    }
  }
  toast(DEBUG_ATTACK_PREVIEW ? "攻击动画预览" : SCENARIO_TEXT.startHint, "#f3c037");
}

function chooseCommandOrder(orderId) {
  if (!COMMAND_ORDERS[orderId]) return false;
  const arming = state.freeOrderChoice;
  if ((state.orderCooldowns[orderId] ?? 0) > 0 && !arming) {
    toast(`${COMMAND_ORDERS[orderId].shortLabel}令冷却 ${Math.ceil(state.orderCooldowns[orderId])}秒`, "#9d3b31");
    return false;
  }
  state.commandOrder = orderId;
  state.freeOrderChoice = false;
  const color = COMMAND_ORDERS[orderId].color;
  if (arming) {
    state.orderActiveLeft = 0;
    state.orderCooldowns[orderId] = 0;
    toast(`${COMMAND_ORDERS[orderId].label}已备 · 战中点击释放`, color);
    return true;
  }
  state.orderActiveLeft = COMMAND_ORDERS[orderId].duration;
  state.orderCooldowns[orderId] = COMMAND_ORDERS[orderId].cooldown;
  for (const key of orderId === "risky" ? JIETING_TERRAIN.mountain : JIETING_TERRAIN.water) {
    const { r, c } = keyToCell(key);
    const center = cellCenter(r, c);
    pulseAt(center.x, center.y, color, layout.cell * 0.52);
  }
  if (orderId === "risky") unleashMountainVolley();
  else stabilizeSupplyLine();
  toast(COMMAND_ORDERS[orderId].label, color);
  audioEngine.play(orderId === "risky" ? "match_drum" : "popup_notification", 0.2, 0.08);
  return true;
}

function unleashMountainVolley() {
  let hits = 0;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.dying) continue;
    const { r } = enemyGridPosition(enemy);
    if (r > 4) continue;
    enemy.hp -= 6 * PLAYER_DAMAGE_FACTOR;
    enemy.hitFlash = 0.16;
    hits += 1;
    const pos = enemyPosition(enemy);
    pulseAt(pos.x, pos.y, "#d7a62b", layout.cell * 0.46);
    if (enemy.hp <= 0) defeatEnemyByOrder(enemy, pos);
  }
  toast(hits ? `山火齐发 · 命中${hits}` : "山火齐发", "#a83a2d");
}

function defeatEnemyByOrder(enemy, pos) {
  enemy.dying = true;
  enemy.deathAge = 0;
  enemy.deathLife = enemy.spineType === "thief" ? 0.72 : 0.7;
  enemyDeathFx(pos.x, pos.y, enemy);
  dropBun(pos.x, pos.y, bunRewardForEnemy(enemy), enemy.pathSide);
  registerBreakCombo(pos);
}

function registerBreakCombo(pos) {
  state.combo = state.comboLeft > 0 ? state.combo + 1 : 1;
  state.comboLeft = 2.4;
  if (state.combo >= 3) {
    floatText(`破阵 ×${state.combo}`, pos.x, pos.y - 22, "#f2c644", Math.min(28, 17 + state.combo));
    if (state.combo % 5 === 0) shake(0.12, Math.min(7, 2 + state.combo * 0.25));
  }
}

function stabilizeSupplyLine() {
  let stopped = 0;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.dying) continue;
    const pos = enemyGridPosition(enemy);
    if (![...JIETING_TERRAIN.water].some((key) => {
      const water = keyToCell(key);
      return Math.abs(water.r - pos.r) + Math.abs(water.c - pos.c) <= 2;
    })) continue;
    enemy.slowLeft = Math.max(enemy.slowLeft ?? 0, 8);
    enemy.t = Math.max(-0.85, enemy.t - 0.7);
    stopped += 1;
  }
  state.supplyIntegrity = Math.min(SUPPLY_CONFIG.max, state.supplyIntegrity + 12);
  toast(stopped ? `稳住汲道 · 击退${stopped}` : "稳住汲道 · 汲道+12", "#3e7561");
}

function chooseEndingRoute(routeId) {
  if (!state.branchPrompt || !JIETING_CAMPAIGN.routes[routeId]) return false;
  state.endingRoute = routeId;
  state.branchPrompt = false;
  state.wavePhase = "gap";
  state.waveTimer = 1.4;
  state.freeOrderChoice = false;
  state.orderLockLeft = 0;
  toast(JIETING_CAMPAIGN.routes[routeId].label, routeId === "retreat" ? "#3e7561" : "#a83a2d");
  return true;
}

function exitToMenu() {
  audioEngine.play("btn_down", 0.16, 0.08);
  state = createState();
  state.mode = "menu";
  pointer = null;
}

function setupDebugAttack() {
  state.buns = 20;
  state.displayedBuns = 20;
  state.wave = 3;
  state.wavePhase = "combat";
  state.freeOrderChoice = false;
  state.spawnLeft = DEBUG_GENERAL_IDLE ? 999 : 0;
  state.debugEnemySpawnTimer = 0.18;
  state.waveTimer = 999;
  state.camp = new Array(CAMP_SIZE).fill(null);
  state.board.clear();
  const previewUnits = DEBUG_UNITS ? [
    ["2,3", makeUnit("qiang", 3)],
    ["3,4", makeUnit("dao", 3)],
    ["5,2", makeUnit("gong", 3)],
    ["7,3", makeUnit("ji", 3)],
    ["1,3", makeUnit("farmer", 3)],
    ["1,4", makeUnit("马", 3)],
    ["1,5", makeUnit("谡", 3)],
    ["4,1", makeUnit("王", 3)],
    ["4,2", makeUnit("平", 3)],
    ["0,3", makeUnit("诸", 3)],
    ["0,4", makeUnit("葛", 3)],
    ["0,5", makeUnit("亮", 3)]
  ] : [];
  for (const [key, unit] of previewUnits) {
    unit.attackTimer = 0.04 + Math.random() * 0.08;
    state.board.set(key, unit);
    if (unit.type === "farmer") {
      const { r, c } = keyToCell(key);
      activateFarmerForCell(unit, r, c);
    }
  }
  rebuildFormations();
  if (DEBUG_UNITS && debugParams.has("debugBreakFormation")) {
    const moved = state.board.get("0,5");
    state.board.delete("0,5");
    if (moved) state.board.set("1,5", moved);
    rebuildFormations();
  }
  if (DEBUG_UNITS && debugParams.has("debugWrongOrder")) {
    const left = state.board.get("4,1");
    const right = state.board.get("4,2");
    if (left && right) {
      state.board.set("4,1", right);
      state.board.set("4,2", left);
    }
    rebuildFormations();
  }
  if (!DEBUG_UNITS || DEBUG_GENERAL_IDLE) return;
  state.enemies.push({
    id: idSeq++,
    t: 3.1,
    pathSide: "left",
    speed: 0.055,
    hp: 520,
    maxHp: 520,
    glyph: "魏",
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
        hp: 40, maxHp: 40, glyph: "军", spineType: "thief", lane: (i - 1) * 0.12,
        wobble: 3 + i, hitFlash: 0, hitAge: 99, hitDx: 0, hitDy: 0,
        spawnAge: 1, dead: false, reviveTestVictim: true
      });
    }
  }
  if (DEBUG_BOSS_INDEX === 2) {
    for (let i = 0; i < 2; i++) {
      state.enemies.push({
        id: idSeq++, t: 5.05 + i * 0.35, pathSide: "right", speed: 0.01,
        hp: 1000, maxHp: 1000, glyph: "魏", spineType: "thief", lane: (i - 0.5) * 0.14,
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
    glyph: "军",
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
    id: idSeq++, t: 8.1, pathSide: "right", speed: 0.035, hp: 760, maxHp: 760, glyph: "锋", spineType: "boss2", spineVariant: 2,
    lane: -0.08, wobble: 3.6, hitFlash: 0, hitAge: 99, hitDx: 0, hitDy: 0,
    spawnAge: 1, dead: false
  });
}

// Debug review links should open directly on the animation under review.
// Keeping the menu in front made repeated cadence checks unnecessarily ambiguous.
if (DEBUG_ATTACK) startGame();

let lastRenderedAt = 0;
let lastDebugSnapshotAt = 0;
let fpsWindowStartedAt = performance.now();
let renderedFrames = 0;
let frameWorkTotal = 0;

function loop(now) {
  if (MOBILE_RENDER_MODE && now - lastRenderedAt < MOBILE_FRAME_INTERVAL - 2) {
    requestAnimationFrame(loop);
    return;
  }
  lastRenderedAt = now;
  const frameWorkStartedAt = performance.now();
  renderedFrames += 1;
  const dt = Math.min(0.033, (now - lastTime) / 1000) * DEBUG_TIME_SCALE;
  lastTime = now;
  update(dt, now / 1000);
  draw(now / 1000);
  syncOriginalGeneralLayer();
  syncOriginalEnemyLayer();
  syncOriginalADouLayer();
  if ((DEBUG_STATE || DEBUG_ATTACK) && now - lastDebugSnapshotAt >= 250) {
    lastDebugSnapshotAt = now;
    canvas.dataset.debugState = JSON.stringify(window.__jietingDebugState());
  }
  frameWorkTotal += performance.now() - frameWorkStartedAt;
  if (now - fpsWindowStartedAt >= 1000) {
    canvas.dataset.renderFps = String(Math.round(renderedFrames * 1000 / (now - fpsWindowStartedAt)));
    canvas.dataset.frameWorkMs = (frameWorkTotal / Math.max(1, renderedFrames)).toFixed(1);
    fpsWindowStartedAt = now;
    renderedFrames = 0;
    frameWorkTotal = 0;
  }
  requestAnimationFrame(loop);
}
drawStartupLoading();
handdrawnGlyphsReady.finally(() => {
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

function drawStartupLoading() {
  ctx.save();
  ctx.fillStyle = "#eee3cc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4a3529";
  ctx.font = `700 ${Math.max(16, Math.min(24, canvas.width * 0.055))}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("正在整军……", canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

function update(dt, time) {
  updateParticles(dt);
  updateBuns(dt);

  if (state.mode !== "play" || state.paused) return;
  if (state.tutorialStep >= 0) return;
  if (state.branchPrompt) return;
  if (state.recruitChoices) return;

  if (!["prepare", "gap", "decision"].includes(state.wavePhase)) {
    state.orderLockLeft = Math.max(0, state.orderLockLeft - dt);
  }
  state.orderActiveLeft = Math.max(0, state.orderActiveLeft - dt);
  state.orderCooldowns.risky = Math.max(0, state.orderCooldowns.risky - dt);
  state.orderCooldowns.steady = Math.max(0, state.orderCooldowns.steady - dt);
  state.comboLeft = Math.max(0, state.comboLeft - dt);
  if (state.comboLeft <= 0) state.combo = 0;
  updateWaveFlow(dt);
  if (DEBUG_ATTACK_PREVIEW && !DEBUG_GENERAL_IDLE) updateDebugEnemySpawns(dt);
  updateActiveProps(dt);

  updateEnemies(dt);
  updateUnits(dt);
  if (state.drag?.unit) updateUnitAction(state.drag.unit, dt);
  updateProjectiles(dt);
}

function updateDebugEnemySpawns(dt) {
  state.debugEnemySpawnTimer -= dt;
  const activeMarchers = state.enemies.filter((enemy) => !enemy.dying && enemy.bossIndex == null).length;
  if (state.debugEnemySpawnTimer > 0 || activeMarchers >= 10) return;
  for (const pathSide of ["left", "right"]) {
    spawnEnemy(false, pathSide === "left" ? -0.12 : 0.12, 0, pathSide);
    const enemy = state.enemies.at(-1);
    enemy.hp = 520;
    enemy.maxHp = 520;
    enemy.speedPx = 22;
  }
  state.debugEnemySpawnTimer = 1.4;
}

function spawnCampaignBosses() {
  if (state.wave === 2) spawnEnemy(true, 0, 1, "left");
  if (state.wave === 4) spawnEnemy(true, 0, 0, "right");
  if (state.wave === 8 && state.endingRoute === "retreat") spawnEnemy(true, 0, 2, "right");
  if (state.wave === 8 && state.endingRoute === "hold") {
    spawnEnemy(true, 0, 2, "left");
    spawnEnemy(true, 0, 0, "right");
  }
}

function maybeApplySupplyDamage(enemy, path) {
  if (!state.waterPressure || enemy.waterPressureChecked || enemy.dying || enemy.dead) return;
  const index = Math.min(path.length - 1, Math.floor(enemy.t));
  const [r, c] = path[index] ?? [];
  if (!JIETING_TERRAIN.water.has(`${r},${c}`)) return;
  enemy.waterPressureChecked = true;
  const base = enemy.bossIndex != null || enemy.archetype === "feng" ? SUPPLY_CONFIG.eliteDamage : SUPPLY_CONFIG.normalDamage;
  const order = COMMAND_ORDERS[state.commandOrder];
  const damage = Math.max(1, Math.round(base * order.supplyDamage));
  state.supplyIntegrity = Math.max(0, state.supplyIntegrity - damage);
  state.supplyDamageThisWave += damage;
  const center = cellCenter(r, c);
  floatText(`汲道 -${damage}`, center.x, center.y - layout.cell * 0.32, "#416f8f", 15);
  pulseAt(center.x, center.y, "#416f8f", layout.cell * 0.9);
  if (state.supplyIntegrity <= 0 && !state.waterBreached) {
    state.waterBreached = true;
    state.refreshCost += SUPPLY_CONFIG.recruitPenalty;
    shake(0.16, 3);
    toast("汲道断绝，军粮调度受阻", "#416f8f");
  }
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
    dropBun(pos.x, pos.y, bunRewardForEnemy(enemy), enemy.pathSide);
  }
}

function updateWaveFlow(dt) {
  if (DEBUG_ATTACK_PREVIEW) return;
  if (state.branchPrompt) return;
  if (state.freeOrderChoice) return;
  state.waveTimer = Math.max(0, state.waveTimer - dt);

  if (state.wavePhase === "prepare") {
    if (state.waveTimer <= 0) startWave(1);
    return;
  }

  if (state.wavePhase === "spawning") {
    if (state.waveTimer <= 0 && state.spawnLeft > 0) {
      const pathSide = state.wave <= 3
        ? (state.spawnSequence % 3 === 2 ? "right" : "left")
        : (state.spawnSequence % 3 === 0 ? "left" : "right");
      spawnEnemy(false, 0, 0, pathSide);
      state.spawnSequence += 1;
      state.spawnLeft -= 1;
      state.waveTimer = state.spawnLeft > 0 ? SPAWN_INTERVAL_SECONDS : 0;
    }
    if (state.spawnLeft === 0) state.wavePhase = "clearing";
    return;
  }

  if (state.wavePhase === "clearing") {
    if (state.enemies.length > 0) return;
    completeWave();
    if (state.wave >= MAX_WAVE) {
      finishCampaign();
      return;
    }
    if (state.wave === JIETING_CAMPAIGN.branchWave - 1 && !state.endingRoute) {
      state.branchPrompt = true;
      state.wavePhase = "decision";
      return;
    }
    state.wavePhase = "gap";
    state.waveTimer = WAVE_GAP_SECONDS;
    state.freeOrderChoice = false;
    return;
  }

  if (state.wavePhase === "gap" && state.waveTimer <= 0) startWave(state.wave + 1);
}

function completeWave() {
  if (state.commandOrder === "steady" && isWangPingGuardingWater()) {
    const cap = state.waterBreached ? SUPPLY_CONFIG.brokenRecoveryCap : SUPPLY_CONFIG.max;
    const before = state.supplyIntegrity;
    state.supplyIntegrity = Math.min(cap, state.supplyIntegrity + SUPPLY_CONFIG.steadyRecovery);
    if (state.supplyIntegrity > before) toast(`王平稳住汲道 +${state.supplyIntegrity - before}`, "#3e7561");
  }
  if (state.endingRoute === "retreat" && state.wave >= JIETING_CAMPAIGN.branchWave) {
    state.retreatProgress = Math.min(4, state.retreatProgress + 1);
  }
}

function campaignActForWave(wave) {
  return JIETING_CAMPAIGN.acts.find((act) => wave >= act.from && wave <= act.to)?.id ?? "mountain";
}

function isWangPingGuardingWater() {
  const waterCells = [...JIETING_TERRAIN.water].map(keyToCell);
  return state.formations.some((formation) => formation.token === "王平" && formation.memberKeys.some((key) => {
    const member = keyToCell(key);
    return waterCells.some((water) => Math.abs(member.r - water.r) + Math.abs(member.c - water.c) <= 1);
  }));
}

function finishCampaign() {
  const campHp = state.douHp.left;
  let ending = "defeat";
  if (state.endingRoute === "retreat" && state.retreatProgress >= JIETING_CAMPAIGN.routes.retreat.requiredProgress && campHp > 0) ending = "retreat";
  if (state.endingRoute === "hold" && campHp >= JIETING_CAMPAIGN.routes.hold.requiredCampHp && state.supplyIntegrity >= JIETING_CAMPAIGN.routes.hold.requiredSupply) ending = "hold";
  const config = JIETING_CAMPAIGN.endings[ending];
  state.mode = "end";
  state.banner = { title: config.title, sub: config.sub, won: ending !== "defeat", ending };
  recordCampaignResult(ending);
  audioEngine.play(ending === "defeat" ? "gameover_double_gold" : "battle_end_gold_fly", 0.38, 0.25);
}

function startWave(wave) {
  state.wave = wave;
  state.campaignAct = campaignActForWave(wave);
  state.freeOrderChoice = false;
  state.supplyDamageThisWave = 0;
  state.campDamageThisWave = 0;
  recordBestWave(wave);
  state.waterPressure = JIETING_TERRAIN.waterPressureWaves.has(wave);
  if (state.waterPressure) toast("魏军压向汲道，守住水源", "#416f8f");
  state.wavePhase = "spawning";
  const routeConfig = state.endingRoute ? JIETING_CAMPAIGN.routes[state.endingRoute] : null;
  const countMultiplier = wave >= JIETING_CAMPAIGN.branchWave ? routeConfig?.countMultiplier ?? 1 : 1;
  state.spawnLeft = Math.max(1, Math.round(ENEMY_COUNT_BY_LEVEL[Math.min(ENEMY_COUNT_BY_LEVEL.length - 1, wave - 1)] * countMultiplier));
  state.spawnSequence = wave % 2;
  state.waveTimer = 0;
  audioEngine.play(wave === 1 ? "match_drum" : "enemy_hit", wave === 1 ? 0.28 : 0.16, 0.2);
  spawnCampaignBosses();
  pulseAt(layout.w / 2, layout.safeTop + 36, "#f3c037", 36);
  toast(SCENARIO_TEXT.waveIncoming(wave), "#d34331");
}

function readBestWave() {
  try {
    return Math.max(0, Number.parseInt(window.localStorage.getItem(BEST_WAVE_STORAGE_KEY) ?? "0", 10) || 0);
  } catch {
    return 0;
  }
}

function readTutorialSeen() {
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function completeTutorial(orderId) {
  state.tutorialStep = -1;
  if (state.tutorialReplay) {
    state.tutorialReplay = false;
    state.paused = true;
    return;
  }
  chooseCommandOrder(orderId);
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    // Restricted storage only makes the briefing appear again next run.
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

function readBestEnding() {
  try {
    return window.localStorage.getItem(BEST_ENDING_STORAGE_KEY) ?? "未出征";
  } catch {
    return "未出征";
  }
}

function readBestSupply() {
  try {
    return Math.max(0, Number.parseInt(window.localStorage.getItem(BEST_SUPPLY_STORAGE_KEY) ?? "0", 10) || 0);
  } catch {
    return 0;
  }
}

function recordCampaignResult(ending) {
  if (DEBUG_ATTACK_PREVIEW) return;
  const ranks = { defeat: 0, retreat: 1, hold: 2 };
  const labels = { defeat: "街亭失守", retreat: "全军而退", hold: "逆转街亭" };
  const previousKey = Object.entries(labels).find(([, label]) => label === state.bestEnding)?.[0] ?? "defeat";
  const bestKey = ranks[ending] > ranks[previousKey] ? ending : previousKey;
  state.bestEnding = labels[bestKey];
  state.bestSupply = Math.max(state.bestSupply ?? 0, Math.round(state.supplyIntegrity));
  try {
    window.localStorage.setItem(BEST_ENDING_STORAGE_KEY, state.bestEnding);
    window.localStorage.setItem(BEST_SUPPLY_STORAGE_KEY, String(state.bestSupply));
  } catch {
    // Restricted storage must not interrupt campaign settlement.
  }
}

function spawnEnemy(isBoss = false, lane = 0, bossIndex = 0, pathSide = "left") {
  const baseHp = ENEMY_HP_BY_LEVEL[Math.min(ENEMY_HP_BY_LEVEL.length - 1, state.wave - 1)];
  const boss = BOSS_ROSTER[bossIndex] ?? BOSS_ROSTER[0];
  const archetype = isBoss ? null : chooseEnemyArchetype(state.wave);
  const route = state.wave >= JIETING_CAMPAIGN.branchWave && state.endingRoute ? JIETING_CAMPAIGN.routes[state.endingRoute] : null;
  const hp = baseHp * (isBoss ? boss.hp : archetype.hp) * (route?.hpMultiplier ?? 1);
  state.enemies.push({
    id: idSeq++,
    t: -0.25,
    pathSide,
    speedPx: (isBoss ? 12 : 24 * archetype.speed) * (route?.speedMultiplier ?? 1),
    hp,
    maxHp: hp,
    glyph: isBoss ? boss.name : archetype.glyph,
    archetype: isBoss ? "boss" : archetype.id,
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
  if (isBoss) {
    toast(`${boss.name}率军来袭`, boss.color);
    audioEngine.play("boss_entrance", 0.3);
    shake(0.16, 3);
  }
}

function chooseEnemyArchetype(wave) {
  const pool = [];
  for (const [id, config] of Object.entries(ENEMY_ARCHETYPES)) {
    if (wave < config.unlockWave) continue;
    for (let i = 0; i < config.weight; i++) pool.push({ id, ...config });
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? { id: "wei", ...ENEMY_ARCHETYPES.wei };
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
    const controlMultiplier = enemy.endpointAttackStarted || enemy.bossCastingLeft > 0 || enemy.bossRecoveryLeft > 0 || enemy.stunLeft > 0 ? 0 : enemy.slowLeft > 0 ? 0.8 : 1;
    const inspireMultiplier = enemy.inspireLeft > 0 ? 1.3 : 1;
    const segment = currentPathSegment(enemy);
    const segmentPixels = Math.max(1, Math.hypot(segment.dir.x * layout.cellW, segment.dir.y * layout.cellH));
    enemy.t += (enemy.speedPx ? enemy.speedPx / segmentPixels : enemy.speed) * dt * controlMultiplier * inspireMultiplier;
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
    maybeApplySupplyDamage(enemy, path);
    if (!enemy.endpointAttackStarted && enemy.t >= path.length - 1) {
      enemy.t = path.length - 1;
      enemy.endpointAttackStarted = true;
      enemy.endpointAttackAge = 0;
      enemy.hitAge = 0;
    }
    if (enemy.endpointAttackStarted && !enemy.endpointDamageApplied) {
      enemy.endpointAttackAge += dt;
      if (enemy.endpointAttackAge >= (enemy.bossIndex != null ? 0.8 : 0.5)) {
        enemy.endpointDamageApplied = true;
        damageDefense(enemy);
        enemy.dying = true;
        enemy.deathAge = 0;
        enemy.deathLife = enemy.spineType === "thief" ? 0.42 : 0.7;
        const pos = enemyPosition(enemy);
        enemyDeathFx(pos.x, pos.y, enemy);
      }
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
  rebuildFormations();
  updateUnitBoard(state.board, "left", dt);
  updateFormationCombat("left", dt);
  for (const unit of state.camp) {
    if (unit) updateUnitAction(unit, dt);
  }
}

function combatBoardEntities() {
  const entities = [];
  for (const [key, unit] of state.board) {
    if (unit.type === "weapon") entities.push({ key, unit, ...keyToCell(key) });
  }
  for (const formation of state.formations) {
    entities.push({ key: formation.anchorKey, unit: formation, ...keyToCell(formation.anchorKey), offsetX: (formation.span - 1) / 2 });
  }
  return entities;
}

function applyFormationMembers(unit, apply) {
  if (unit?.type !== "general") return;
  for (const key of unit.memberKeys ?? []) {
    const member = state.board.get(key);
    if (member) apply(member);
  }
}

function updateFormationCombat(defendedPath, dt) {
  for (const formation of state.formations) {
    updateUnitAction(formation, dt);
    formation.attackTimer -= dt;
    const members = formation.memberKeys.map((key) => state.board.get(key)).filter(Boolean);
    formation.confused = members.some((unit) => unit.confused);
    formation.charmed = members.some((unit) => unit.charmed);
    formation.knockedDown = members.some((unit) => unit.knockedDown);
    formation.sealed = members.some((unit) => unit.sealed);
    formation.rained = members.some((unit) => unit.rained);
    if (formation.confused || formation.charmed || formation.knockedDown || formation.sealed) {
      formation.engaged = false;
      continue;
    }
    const { r, c } = keyToCell(formation.anchorKey);
    const offsetX = (formation.span - 1) / 2;
    const config = GENERAL_COMBAT_CONFIG[formation.token];
    const target = findTarget(r, c, getUnitRange(formation), offsetX, config?.targetPolicy ?? "nearest", defendedPath);
    formation.engaged = Boolean(target);
    if (formation.attackTimer > 0 || !target) continue;
    formation.attackTimer = getUnitCooldown(formation);
    fireAt(formation, { r, c, offsetX }, target);
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
    const candidates = combatBoardEntities()
      .filter(({ unit }) => !unit.knockedDown)
      .filter(({ r, c, offsetX = 0 }) => {
        const center = cellCenter(r, c);
        center.x += offsetX * layout.cellW;
        return Math.hypot(center.x - origin.x, center.y - origin.y) <= boss.range * layout.cell;
      });
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (!target) {
      enemy.bossSkillTimer = boss.skillCooldown;
      return;
    }
    enemy.bossChargeTargetId = target.unit.id;
    const center = cellCenter(target.r, target.c);
    center.x += (target.offsetX ?? 0) * layout.cellW;
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
  if (boss.skill === "pressure") {
    let affected = 0;
    for (const { unit, r, c, offsetX = 0 } of combatBoardEntities()) {
      const center = cellCenter(r, c);
      center.x += offsetX * layout.cellW;
      if (Math.hypot(center.x - origin.x, center.y - origin.y) > boss.range * layout.cell) continue;
      const duration = state.commandOrder === "steady" && hasSteadyAura(unit) ? 5 * COMMAND_ORDERS.steady.controlDuration : 5;
      unit.mergeLockedLeft = Math.max(unit.mergeLockedLeft ?? 0, duration);
      unit.engaged = false;
      applyFormationMembers(unit, (member) => { member.mergeLockedLeft = Math.max(member.mergeLockedLeft ?? 0, duration); });
      affected += 1;
      floatText("压", center.x, center.y - layout.cell * 0.34, boss.color, 18);
    }
    pulseAt(origin.x, origin.y, boss.color, layout.cell * Math.max(1, boss.range));
    toast(affected ? `${boss.name}压迫街亭阵脚` : `${boss.name}试探蜀营阵脚`, boss.color);
    return;
  }
  if (boss.skill === "waterCut") {
    state.waterPressure = true;
    state.waterBreachCount = Math.max(state.waterBreachCount, 2);
    for (const key of JIETING_TERRAIN.water) {
      const { r, c } = keyToCell(key);
      const center = cellCenter(r, c);
      pulseAt(center.x, center.y, boss.color, layout.cell * 0.68);
      floatText("断汲", center.x, center.y - layout.cell * 0.2, boss.color, 14);
    }
    toast(`${boss.name}直逼汲道`, boss.color);
    return;
  }
  if (boss.skill === "command") {
    let affected = 0;
    for (const ally of state.enemies) {
      if (ally === enemy || ally.dying || ally.pathSide !== enemy.pathSide) continue;
      if (Math.abs(ally.t - enemy.t) > boss.range) continue;
      ally.inspireLeft = 6;
      affected += 1;
      const allyPos = enemyPosition(ally);
      floatText("令", allyPos.x, allyPos.y - layout.cell * 0.35, boss.color, 16);
    }
    state.blindLeft = Math.max(state.blindLeft, 2.4);
    pulseAt(origin.x, origin.y, boss.color, layout.cell * Math.max(1, boss.range));
    toast(affected ? `${boss.name}统令魏军围压` : `${boss.name}静观阵势`, boss.color);
    return;
  }
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
    for (const { unit } of combatBoardEntities()) {
      unit.rained = true;
      applyFormationMembers(unit, (member) => { member.rained = true; });
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
        speedPx: 42, hp, maxHp: hp, glyph: "骑", spineType: "thief", bossIndex: null,
        bossSkillTimer: 0, lane: (i - 1) * 0.14, wobble: Math.random() * 10,
        hitFlash: 0, hitAge: 99, hitDx: 0, hitDy: 0, spawnAge: 0, dead: false, cavalry: true
      });
    }
    pulseAt(origin.x, origin.y, boss.color, layout.cell * 1.5);
    toast(`${boss.name}召来三名西凉骑兵`, boss.color);
    return;
  }
  const nearbyUnits = combatBoardEntities()
    .filter(({ r, c, offsetX = 0 }) => {
      const center = cellCenter(r, c);
      center.x += offsetX * layout.cellW;
      return Math.hypot(center.x - origin.x, center.y - origin.y) <= boss.range * layout.cell;
    });
  if (boss.skill === "halberd") {
    for (const { r, c, unit } of nearbyUnits) {
      unit.level = Math.max(1, unit.level - 2);
      unit.mergeLockedLeft = Math.max(unit.mergeLockedLeft ?? 0, 6);
      unit.engaged = false;
      applyFormationMembers(unit, (member) => {
        member.level = Math.max(1, member.level - 2);
        member.mergeLockedLeft = Math.max(member.mergeLockedLeft ?? 0, 6);
      });
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
      applyFormationMembers(target.unit, (member) => { member.knockedDown = true; });
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
      id: idSeq++, t: fallen.t, pathSide: fallen.pathSide, speedPx: fallen.speedPx ?? 15,
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
  if (unit?.type === "general") {
    for (const memberKey of unit.memberKeys ?? []) state.board.delete(memberKey);
  } else {
    state.board.delete(key);
  }
  rebuildFormations();
}

function updateUnitBoard(board, defendedPath, dt) {
  for (const [key, unit] of board) {
    updateUnitAction(unit, dt);
    unit.mergeLockedLeft = Math.max(0, (unit.mergeLockedLeft ?? 0) - dt);
    unit.attackTimer -= dt;
    if (unit.type === "farmer") {
      unit.farmTimer += dt;
      const cycle = FARMER_CYCLE_SECONDS[Math.max(0, Math.min(4, unit.level - 1))];
      if (unit.farmTimer >= cycle) {
        unit.farmTimer %= cycle;
        const { r, c } = keyToCell(key);
        const center = cellCenter(r, c);
        state.buns += 1;
        floatText("军粮+1", center.x, center.y - layout.cell * 0.35, "#d19622", 16);
        pulseAt(center.x, center.y, "#e1b84b", layout.cell * 0.42);
      }
      continue;
    }
    if (unit.type === "char" || unit.type === "shovel") continue;
    if (hasSteadyAura(unit, key)) {
      unit.confused = false;
      unit.charmed = false;
      unit.knockedDown = false;
    }
    if (unit.confused || unit.charmed || unit.knockedDown || unit.sealed) {
      unit.engaged = false;
      continue;
    }
    const pos = keyToCell(key);
    pos.offsetX = 0;
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
  for (const item of [...state.particles, ...state.hitSprites, ...state.shovelEffects, ...state.strokes, ...state.ghosts, ...state.absorbs, ...state.floats, ...state.pulses, ...state.charmLinks, ...state.shakes, ...state.recruits, ...state.messages]) {
    item.age += dt;
  }
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 90 * dt;
  }
  state.particles = state.particles.filter((p) => p.age < p.life);
  state.hitSprites = state.hitSprites.filter((p) => p.age < p.life);
  state.shovelEffects = state.shovelEffects.filter((p) => p.age < p.life);
  state.strokes = state.strokes.filter((s) => s.age < s.life);
  state.ghosts = state.ghosts.filter((g) => g.age < g.life);
  state.absorbs = state.absorbs.filter((a) => a.age < a.life);
  state.floats = state.floats.filter((f) => f.age < f.life);
  state.pulses = state.pulses.filter((p) => p.age < p.life);
  state.charmLinks = state.charmLinks.filter((p) => p.age < p.life);
  state.shakes = state.shakes.filter((s) => s.age < s.life);
  state.recruits = state.recruits.filter((r) => r.age < r.life);
  state.messages = state.messages.filter((m) => m.age < m.life);
  if (MOBILE_RENDER_MODE) {
    trimOldest(state.particles, 64);
    trimOldest(state.strokes, 32);
    trimOldest(state.ghosts, 16);
    trimOldest(state.pulses, 16);
    trimOldest(state.floats, 16);
  }
}

function trimOldest(items, limit) {
  if (items.length > limit) items.splice(0, items.length - limit);
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
  from.x += (cell.offsetX ?? 0) * layout.cellW;
  const to = enemyPosition(enemy);
  const damage = Math.round(getUnitDamage(unit) * 100) / 100;
  const len = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  const dx = (to.x - from.x) / len;
  const dy = (to.y - from.y) / len;
  const preset = animationPresetForUnit(unit, weapons, GENERAL_COMBAT_CONFIG);
  const kind = unit.type === "general" ? preset.cardKind : weapons[unit.token]?.kind ?? preset.cardKind ?? "char";
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
        : unit.type === "general" && preset.projectileKind
          ? preset.projectileKind
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
      kind: projectileKind, hitEffect: hitEffectForToken(unit.token) ?? preset.hitEffect, done: false
    });
  }
}

function damageDefense(enemy) {
  const gate = "left";
  state.douHp[gate] -= 1;
  state.campDamageThisWave += 1;
  audioEngine.play("enemy_knife_attack", 0.3, 0.12);
  shake(0.13, 3.4);
  const endpoint = pathForEnemy(enemy).at(-1);
  floatText(
    SCENARIO_TEXT.defenseHit,
    layout.boardX + (endpoint[1] + 0.5) * layout.cellW,
    layout.boardY + (endpoint[0] + 0.5) * layout.cellH,
    "#d12d25",
    18
  );
  if (state.douHp[gate] > 0) return;
  audioEngine.play("gameover_double_gold", 0.38, 0.25);
  state.mode = "end";
  state.banner = {
    title: SCENARIO_TEXT.defeatTitle,
    sub: SCENARIO_TEXT.defeatSub,
    won: false,
    ending: "defeat"
  };
  recordCampaignResult("defeat");
}

function rebuildFormations() {
  const previous = new Map(state.formations.map((formation) => [formation.memoryKey, formation]));
  const used = new Set();
  const next = [];
  for (const unit of state.board.values()) {
    if (unit?.type === "char") {
      unit.formationId = null;
      unit.formationToken = null;
    }
  }
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      for (const recipe of formationRecipes) {
        if (c + recipe.span > BOARD_COLS) continue;
        const memberKeys = recipe.members.map((_, index) => `${r},${c + index}`);
        if (memberKeys.some((key) => used.has(key))) continue;
        const members = memberKeys.map((key) => state.board.get(key));
        if (members.some((unit, index) => !unit || unit.type !== "char" || unit.token !== recipe.members[index])) continue;
        const memoryKey = `${recipe.id}:${members.map((unit) => unit.id).join("-")}`;
        const remembered = state.formationMemory.get(memoryKey);
        const wasActive = previous.has(memoryKey);
        const formation = previous.get(memoryKey) ?? remembered ?? {
          id: idSeq++, type: "general", token: recipe.displayName, actorId: recipe.id,
          attackTimer: 0, experience: 0, action: "form", actionAge: 0, actionLife: 0.56,
          actionDx: 0, actionDy: 0, attackSerial: 0, wobble: Math.random() * Math.PI * 2
        };
        formation.memoryKey = memoryKey;
        formation.memberKeys = memberKeys;
        formation.memberIds = members.map((unit) => unit.id);
        formation.span = recipe.span;
        formation.level = Math.max(...members.map((unit) => unit.level ?? 1));
        formation.anchorKey = memberKeys[0];
        formation.placedAt = Math.max(...members.map((unit) => unit.placedAt ?? 0));
        if (remembered && !wasActive) setUnitAction(formation, "form", 0.32, 0, -1);
        members.forEach((unit) => {
          unit.formationId = formation.id;
          unit.formationToken = formation.token;
        });
        memberKeys.forEach((key) => used.add(key));
        state.formationMemory.set(memoryKey, formation);
        next.push(formation);
        break;
      }
    }
  }
  for (const old of state.formations) {
    if (!next.includes(old) && old.action !== "break") setUnitAction(old, "break", 0.2);
  }
  state.formations = next;
  canvas.dataset.formations = next.map((formation) => `${formation.actorId}:${formation.memberKeys.join("+")}`).join("|");
  canvas.dataset.formationTint = next.length ? "#d7aa3a" : "";
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
  const masuBurst = sourceUnit?.token === "马谡" && isMountainUnit(sourceUnit) && (sourceUnit.attackSerial ?? 0) % 3 === 0;
  const finalDamage = projectile.damage * (masuBurst ? 1.25 : 1) * PLAYER_DAMAGE_FACTOR;
  enemy.hp -= finalDamage;
  if (sourceUnit?.token === "王平") {
    enemy.slowLeft = Math.max(enemy.slowLeft ?? 0, state.commandOrder === "steady" && state.orderActiveLeft > 0 ? 4 : 2.5);
    enemy.t = Math.max(-0.25, enemy.t - 0.1);
  }
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
  const recipe = effectRecipeForProjectile(projectile.kind);
  inkSplash(pos.x, pos.y, recipe.splash, recipe.particles);
  floatText(masuBurst ? `险击 -${Math.round(finalDamage)}` : sourceUnit?.token === "王平" ? `稳住 -${Math.round(finalDamage)}` : `-${Math.round(finalDamage * 100) / 100}`, pos.x, pos.y - 10, masuBurst ? "#d49b23" : sourceUnit?.token === "王平" ? "#3e7561" : "#b92825", masuBurst ? 18 : 15);
  if (enemy.hp <= 0) {
    enemy.dying = true;
    enemy.deathAge = 0;
    enemy.deathLife = enemy.spineType === "thief" ? 2.05 : 0.7;
    enemyDeathFx(pos.x, pos.y, enemy);
    awardGeneralExperience(enemy, sourceUnit);
    let reward = bunRewardForEnemy(enemy);
    if (state.commandOrder === "risky" && sourceUnit?.token === "马谡") reward += 1;
    dropBun(pos.x, pos.y, reward, enemy.pathSide);
    registerBreakCombo(pos);
    if (enemy.bossIndex != null) state.commandPoints = Math.min(2, state.commandPoints + 1);
  }
}

function findBoardUnitById(id, pathSide = "left") {
  if (!id) return null;
  for (const formation of state.formations) if (formation.id === id) return formation;
  for (const unit of state.board.values()) if (unit.id === id) return unit;
  return null;
}

function boardKeyForUnit(unit) {
  if (unit?.type === "general") return unit.anchorKey ?? null;
  for (const [key, value] of state.board) {
    if (value === unit) return key;
  }
  return null;
}

function isMountainUnit(unit) {
  if (unit?.type === "general") return unit.memberKeys?.some((key) => JIETING_TERRAIN.mountain.has(key)) ?? false;
  const key = boardKeyForUnit(unit);
  return Boolean(key && JIETING_TERRAIN.mountain.has(key));
}

function hasSteadyAura(unit, key = boardKeyForUnit(unit)) {
  if (!key || unit.token === "王平") return false;
  const pos = keyToCell(key);
  const center = cellCenter(pos.r, pos.c);
  for (const candidate of state.formations) {
    if (candidate.token !== "王平") continue;
    const candidateCell = keyToCell(candidate.anchorKey);
    const auraCenter = cellCenter(candidateCell.r, candidateCell.c);
    auraCenter.x += ((candidate.span - 1) / 2) * layout.cellW;
    if (Math.hypot(center.x - auraCenter.x, center.y - auraCenter.y) <= layout.cell * 2.8) return true;
  }
  return false;
}

function steadyAuraCooldownMultiplier(unit) {
  if (!hasSteadyAura(unit)) return 1;
  return state.commandOrder === "steady" && state.orderActiveLeft > 0 ? 0.65 : 0.82;
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
  if (unit.type === "general") {
    for (const memberKey of unit.memberKeys ?? []) {
      const member = state.board.get(memberKey);
      if (member) member.level = Math.max(member.level ?? 1, level);
    }
  }
  unit.confused = false;
  unit.rained = false;
  unit.charmed = false;
  unit.knockedDown = false;
  unit.sealed = false;
  unit.mergeLockedLeft = 0;
  setUnitAction(unit, "merge", 0.48, 0, -1);
  const key = unit.anchorKey;
  if (key) {
    const { r, c } = keyToCell(key);
    const center = cellCenter(r, c);
    floatText(`Lv.${level}`, center.x + ((unit.span - 1) / 2) * layout.cellW, center.y - layout.cell * 0.42, "#d19622", 18);
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
  if (amount <= 0) {
    floatText("断粮", x, y - 10, "#416f8f", 15);
    return;
  }
  state.buns += amount;
  const tx = 76;
  state.floats.push({ type: "bun", sx: x, sy: y, tx, ty: layout.safeTop + 23, x, y, age: 0, life: 0.52 });
  pulseAt(tx, layout.safeTop + 23, "#f1dfc2", 24);
}

function bunRewardForEnemy(enemy) {
  if (Number.isInteger(enemy?.bossIndex)) return state.waterBreached ? 7 : 10;
  return state.waterBreached ? 0 : 1;
}

function findTarget(r, c, range, offsetX = 0, policy = "nearest", defendedPath = "left") {
  let best = null;
  let bestScore = policy === "closest_end" ? -Infinity : Infinity;
  const unitPos = cellCenter(r, c);
  unitPos.x += offsetX * layout.cellW;
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
  const base = unit.type === "general" ? GENERAL_COMBAT_CONFIG[unit.token]?.range ?? 2.5 : weapons[unit.token]?.range ?? 1.2;
  if (!isMountainUnit(unit)) return base;
  return base + (state.commandOrder === "risky" ? COMMAND_ORDERS.risky.mountainRange : 0.25);
}

function getUnitCooldown(unit) {
  // Original Zhen Fu applies attack-speed -0.2, i.e. retain 80% speed.
  // Cooldown therefore grows by 1 / 0.8 rather than using a flat 50% penalty.
  const weatherMultiplier = unit.rained ? (1 / RAIN_ATTACK_SPEED_FACTOR) : 1;
  if (unit.type === "general") {
    const multiplier = GENERAL_SPEED_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
    const auraMultiplier = steadyAuraCooldownMultiplier(unit);
    const riskyPenalty = state.commandOrder === "risky" && !isMountainUnit(unit) ? COMMAND_ORDERS.risky.offMountainCooldown : 1;
    const brokenPenalty = unit.token === "马谡" && state.waterBreached && !isMountainUnit(unit) ? SUPPLY_CONFIG.masuBrokenCooldown : 1;
    return ((GENERAL_COMBAT_CONFIG[unit.token]?.cooldown ?? 1) / multiplier) * weatherMultiplier * auraMultiplier * riskyPenalty * brokenPenalty;
  }
  const multiplier = SOLDIER_LEVEL_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
  const auraMultiplier = steadyAuraCooldownMultiplier(unit);
  const riskyPenalty = state.commandOrder === "risky" && !isMountainUnit(unit) ? COMMAND_ORDERS.risky.offMountainCooldown : 1;
  return ((weapons[unit.token]?.cooldown ?? 0.8) / multiplier) * weatherMultiplier * auraMultiplier * riskyPenalty;
}

function getUnitDamage(unit) {
  const mountain = isMountainUnit(unit);
  const mountainMultiplier = mountain ? COMMAND_ORDERS[state.commandOrder].mountainDamage : 1;
  const moraleMultiplier = unit.token === "马谡" && state.waterBreached && !mountain ? SUPPLY_CONFIG.masuBrokenDamage : 1;
  if (unit.type === "general") {
    const multiplier = GENERAL_DAMAGE_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
    const masuTerrainMultiplier = unit.token === "马谡" ? (mountain ? 1.3 : 0.82) : 1;
    return (GENERAL_COMBAT_CONFIG[unit.token]?.damage ?? 10) * multiplier * mountainMultiplier * moraleMultiplier * masuTerrainMultiplier;
  }
  const multiplier = SOLDIER_LEVEL_MULTIPLIERS[Math.max(0, Math.min(4, unit.level - 1))];
  return (weapons[unit.token]?.damage ?? 2) * multiplier * mountainMultiplier;
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

function enemyGridPosition(enemy) {
  const pos = enemyPosition(enemy);
  return {
    r: Math.max(0, Math.min(BOARD_ROWS - 1, Math.floor((pos.y - layout.boardY) / layout.cellH))),
    c: Math.max(0, Math.min(BOARD_COLS - 1, Math.floor((pos.x - layout.boardX) / layout.cellW)))
  };
}

function enemyPathPosition(enemy) {
  const path = pathForEnemy(enemy);
  if (enemy.t < 0) {
    const a = path[0];
    const b = path[1];
    const ca = cellCenter(a[0], a[1]);
    const cb = cellCenter(b[0], b[1]);
    return { x: ca.x + (cb.x - ca.x) * enemy.t, y: ca.y + (cb.y - ca.y) * enemy.t };
  }
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
  const index = Math.max(0, Math.min(path.length - 2, Math.floor(enemy.t)));
  const a = path[index];
  const b = path[index + 1];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const len = Math.max(1, Math.hypot(dx, dy));
  return { dir: { x: dx / len, y: dy / len } };
}

function pathForEnemy(enemy) {
  return enemy.pathSide === "right" ? GAME_PATHS.right : GAME_PATHS.left;
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
  drawComboMeter();
  drawBossBlindness();
  if (state.tutorialStep >= 0) drawTutorialBriefing();
  else if (state.branchPrompt) drawBranchPrompt();
  else if (state.freeOrderChoice && state.mode === "play") drawOrderBriefing();
  else if (state.recruitChoices) drawRecruitChoices(time);
  if (state.mode === "play" && state.paused) drawPauseOverlay();
  if (state.mode === "end") drawEnd();
}

function drawComboMeter() {
  if (state.combo < 3 || state.comboLeft <= 0) return;
  const alpha = Math.min(1, state.comboLeft * 1.8);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawOutlinedText(`破阵 ×${state.combo}`, layout.w / 2, layout.boardY + 28, Math.min(34, 21 + state.combo), "#f1c53c");
  ctx.restore();
}

function drawBackground(time) {
  if (MOBILE_RENDER_MODE) {
    drawCachedMobileBackground();
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, layout.h);
  g.addColorStop(0, "#e6dcc5");
  g.addColorStop(0.38, "#bccfba");
  g.addColorStop(0.68, "#d2b88f");
  g.addColorStop(1, "#efe0c8");
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

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#566e55";
  for (let i = 0; i < 5; i++) {
    const baseX = layout.w * (0.12 + i * 0.2);
    const baseY = layout.h * (0.22 + (i % 2) * 0.11);
    ctx.beginPath();
    ctx.moveTo(baseX - 80, baseY + 96);
    ctx.quadraticCurveTo(baseX - 18, baseY - 38, baseX + 58, baseY + 96);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawMenu(time) {
  drawInkTitle(SCENARIO_TEXT.title, layout.w / 2, layout.h * 0.22, 43, "#a62b24");
  drawCentered(SCENARIO_TEXT.subtitle, layout.w / 2, layout.h * 0.285, 19, "#3d342c", "700");
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
  drawGlyphLayer("营", layout.w / 2 - 10 + Math.sin(time * 5) * 3, layout.h * 0.49 + 7, 82, "#111");
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
    drawCentered(SCENARIO_TEXT.subtitle.replace(" ", ""), layout.w / 2, box.y + 105, 20, "#8d3029", "900");
    drawCentered(`当前记录：第 ${state.bestWave ?? 0} 波`, layout.w / 2, box.y + 150, 17, "#514239", "700");
    drawCentered(`最佳结局：${state.bestEnding ?? "未出征"}`, layout.w / 2, box.y + 190, 16, "#8d3029", "800");
    drawCentered(`最佳汲道：${state.bestSupply ?? 0}`, layout.w / 2, box.y + 226, 15, "#416f8f", "700");
  } else {
    const counts = new Map();
    for (const token of state.playerDeckPool) counts.set(token, (counts.get(token) ?? 0) + 1);
    const entries = [["刀", "刀"], ["弓", "弓"], ["枪", "枪"], ["骑", "骑"], ["马谡", "马"], ["王平", "王"]];
    entries.forEach(([label, token], index) => {
      const y = box.y + 102 + index * 38;
      drawCentered(`${label}　${counts.get(token) ?? 0}`, layout.w / 2, y, 17, "#514239", "700");
    });
    if (ENABLE_FARMER_ABILITY) drawCentered("屯田军粮　已启用", layout.w / 2, box.y + 292, 15, "#8d3029", "700");
    drawCentered("当前牌池统计", layout.w / 2, box.y + 310, 14, "#75665a", "500");
  }
  const back = { x: layout.w / 2 - 76, y: box.y + box.h - 62, w: 152, h: 44 };
  drawButton(back, "返回", "#bf6d52", "#4a2c26", true);
  ctx.restore();
}

function drawTopBar() {
  drawPauseButton();
  drawTopCurrency();
  drawCentered(SCENARIO_TEXT.stageName, layout.w / 2, layout.safeTop + 19, 26, "#3b241d", "900");
  const waveLabel = state.wavePhase === "prepare"
    ? `备战 ${Math.ceil(state.waveTimer)}秒`
    : state.wavePhase === "gap"
      ? `整备 ${Math.ceil(state.waveTimer)}秒`
      : `第${state.wave}波`;
  drawCentered(`${waveLabel} · 营♥${state.douHp.left}`, layout.w / 2, layout.safeTop + 45, 18, "#14110f", "900");
  drawCampaignHud();
}

function drawCampaignHud() {
  for (const [id, rect] of Object.entries(layout.orderButtons)) {
    const order = COMMAND_ORDERS[id];
    const selected = state.commandOrder === id && state.orderActiveLeft > 0;
    const cooldown = state.orderCooldowns[id] ?? 0;
    ctx.fillStyle = selected ? order.color : "rgba(56,48,42,0.28)";
    roundRect(rect.x, rect.y, rect.w, rect.h, 5, true, false);
    ctx.strokeStyle = selected ? "#fff1cf" : "rgba(57,43,34,0.55)";
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(rect.x, rect.y, rect.w, rect.h, 5, false, true);
    drawCentered(cooldown > 0 && !selected ? String(Math.ceil(cooldown)) : order.shortLabel, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 16, selected ? "#fff8e9" : "#44372f", "900");
  }
  drawCentered(state.orderActiveLeft > 0 ? `${COMMAND_ORDERS[state.commandOrder].shortLabel}令 ${Math.ceil(state.orderActiveLeft)}秒` : "军令待发", layout.w - 49, layout.safeTop + 45, 11, "#4a3830", "800");

  const bar = layout.supplyBar;
  const ratio = Math.max(0, Math.min(1, state.supplyIntegrity / SUPPLY_CONFIG.max));
  ctx.fillStyle = "rgba(48,43,38,0.3)";
  roundRect(bar.x, bar.y, bar.w, bar.h, 4, true, false);
  ctx.fillStyle = ratio > 0.3 ? "#4d8a82" : "#a83a2d";
  roundRect(bar.x, bar.y, bar.w * ratio, bar.h, 4, true, false);
  drawCentered(`汲道 ${Math.round(state.supplyIntegrity)} · ${campaignActLabel()}`, layout.w / 2, bar.y - 7, 10, "#3d342c", "800");
}

function campaignActLabel() {
  return JIETING_CAMPAIGN.acts.find((act) => act.id === state.campaignAct)?.label ?? "抢占山道";
}

function orderBriefingRects() {
  const width = Math.min(340, layout.w - 30);
  const box = { x: layout.w / 2 - width / 2, y: layout.h / 2 - 126, w: width, h: 252 };
  const gap = 12;
  const cardWidth = (box.w - 42 - gap) / 2;
  return {
    box,
    risky: { x: box.x + 21, y: box.y + 76, w: cardWidth, h: 132 },
    steady: { x: box.x + 21 + cardWidth + gap, y: box.y + 76, w: cardWidth, h: 132 }
  };
}

function drawOrderBriefing() {
  const { box, risky, steady } = orderBriefingRects();
  ctx.save();
  ctx.fillStyle = "rgba(20,16,13,0.58)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  ctx.fillStyle = "#f4ead5";
  roundRect(box.x, box.y, box.w, box.h, 8, true, false);
  ctx.strokeStyle = "#6e5140";
  ctx.lineWidth = 3;
  roundRect(box.x, box.y, box.w, box.h, 8, false, true);
  drawCentered("本波军令", layout.w / 2, box.y + 34, 26, "#382820", "900");
  drawCentered(campaignActLabel(), layout.w / 2, box.y + 59, 13, "#765848", "700");
  drawOrderChoiceCard(risky, "险策", "立即箭雨清山道", "十秒强攻", COMMAND_ORDERS.risky.color);
  drawOrderChoiceCard(steady, "稳阵", "击退汲道敌军", "补水并减速", COMMAND_ORDERS.steady.color);
  ctx.restore();
}

function drawOrderChoiceCard(rect, title, benefit, risk, color) {
  ctx.fillStyle = color;
  roundRect(rect.x, rect.y, rect.w, rect.h, 7, true, false);
  ctx.strokeStyle = "#fff0d3";
  ctx.lineWidth = 2;
  roundRect(rect.x, rect.y, rect.w, rect.h, 7, false, true);
  drawCentered(title, rect.x + rect.w / 2, rect.y + 27, 23, "#fff9eb", "900");
  drawCentered(benefit, rect.x + rect.w / 2, rect.y + 69, 13, "#fff4df", "800");
  drawCentered(risk, rect.x + rect.w / 2, rect.y + 96, 13, "#fff4df", "800");
  drawCentered("选择", rect.x + rect.w / 2, rect.y + 120, 11, "#f4dfbd", "700");
}

function recruitChoiceRects() {
  const width = Math.min(350, layout.w - 24);
  const box = { x: (layout.w - width) / 2, y: layout.h / 2 - 126, w: width, h: 252 };
  const gap = 9;
  const cardW = (width - 42 - gap * 2) / 3;
  return {
    box,
    cards: [0, 1, 2].map((index) => ({ x: box.x + 21 + index * (cardW + gap), y: box.y + 70, w: cardW, h: 142 }))
  };
}

function drawRecruitChoices(time) {
  const { box, cards } = recruitChoiceRects();
  ctx.save();
  ctx.fillStyle = "rgba(20,16,13,0.62)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  ctx.fillStyle = "#f4ead5";
  roundRect(box.x, box.y, box.w, box.h, 8, true, false);
  ctx.strokeStyle = "#6e5140";
  ctx.lineWidth = 3;
  roundRect(box.x, box.y, box.w, box.h, 8, false, true);
  drawCentered("择一征入营中", layout.w / 2, box.y + 33, 25, "#382820", "900");
  drawCentered(`消耗军粮 ${state.refreshCost}`, layout.w / 2, box.y + 57, 12, "#765848", "700");
  cards.forEach((rect, index) => {
    const choice = state.recruitChoices[index];
    ctx.fillStyle = index === 0 ? "#e8dfc8" : index === 1 ? "#dbe5d3" : "#d7e2e3";
    roundRect(rect.x, rect.y, rect.w, rect.h, 6, true, false);
    ctx.strokeStyle = "#8b6b45";
    ctx.lineWidth = 2;
    roundRect(rect.x, rect.y, rect.w, rect.h, 6, false, true);
    drawUnitCard(choice.unit, rect.x + rect.w / 2, rect.y + 61, Math.min(64, rect.w * 0.72), time, false);
    drawCentered(choice.label, rect.x + rect.w / 2, rect.y + 118, 14, "#3d3029", "900");
    drawCentered("选择", rect.x + rect.w / 2, rect.y + 136, 10, "#785b43", "700");
  });
  ctx.restore();
}

function drawCachedMobileBackground() {
  if (!mobileBackgroundCache) {
    const cached = document.createElement("canvas");
    cached.width = Math.ceil(layout.w);
    cached.height = Math.ceil(layout.h);
    const background = cached.getContext("2d", { alpha: false });
    const gradient = background.createLinearGradient(0, 0, 0, layout.h);
    gradient.addColorStop(0, "#e6dcc5");
    gradient.addColorStop(0.38, "#bccfba");
    gradient.addColorStop(0.68, "#d2b88f");
    gradient.addColorStop(1, "#efe0c8");
    background.fillStyle = gradient;
    background.fillRect(0, 0, layout.w, layout.h);
    background.globalAlpha = 0.16;
    background.strokeStyle = "#5a4a3d";
    background.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = 38 + i * 74;
      background.beginPath();
      background.moveTo(-30, y);
      background.bezierCurveTo(layout.w * 0.24, y - 34, layout.w * 0.42, y + 32, layout.w + 30, y - 8);
      background.stroke();
    }
    background.globalAlpha = 0.18;
    background.fillStyle = "#566e55";
    for (let i = 0; i < 5; i++) {
      const baseX = layout.w * (0.12 + i * 0.2);
      const baseY = layout.h * (0.22 + (i % 2) * 0.11);
      background.beginPath();
      background.moveTo(baseX - 80, baseY + 96);
      background.quadraticCurveTo(baseX - 18, baseY - 38, baseX + 58, baseY + 96);
      background.closePath();
      background.fill();
    }
    mobileBackgroundCache = cached;
  }
  ctx.drawImage(mobileBackgroundCache, 0, 0, layout.w, layout.h);
}

function tutorialBriefingRects() {
  const width = Math.min(340, layout.w - 30);
  const box = { x: layout.w / 2 - width / 2, y: layout.h / 2 - 186, w: width, h: 372 };
  return {
    box,
    next: { x: box.x + 66, y: box.y + 304, w: box.w - 132, h: 48 },
    risky: { x: box.x + 22, y: box.y + 142, w: (box.w - 56) / 2, h: 142 },
    steady: { x: box.x + 34 + (box.w - 56) / 2, y: box.y + 142, w: (box.w - 56) / 2, h: 142 }
  };
}

function drawTutorialBriefing() {
  const rects = tutorialBriefingRects();
  const { box } = rects;
  ctx.save();
  ctx.fillStyle = "rgba(18,14,12,0.7)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  ctx.fillStyle = "#f5ead4";
  roundRect(box.x, box.y, box.w, box.h, 8, true, false);
  ctx.strokeStyle = "#6f4c39";
  ctx.lineWidth = 3;
  roundRect(box.x, box.y, box.w, box.h, 8, false, true);
  if (state.tutorialStep === 0) drawTutorialGoal(rects);
  else if (state.tutorialStep === 1) drawTutorialDeploy(rects);
  else drawTutorialOrders(rects);
  ctx.restore();
}

function drawTutorialGoal({ box, next }) {
  drawCentered("守住街亭", layout.w / 2, box.y + 42, 29, "#382820", "900");
  drawCentered("战役目标", layout.w / 2, box.y + 72, 14, "#765848", "700");
  const y = box.y + 164;
  const xs = [box.x + 64, layout.w / 2, box.x + box.w - 64];
  [["魏", "#a83a2d"], ["水", "#417d88"], ["蜀营", "#a06b2c"]].forEach(([label, color], index) => {
    ctx.fillStyle = color;
    circle(xs[index], y, index === 2 ? 34 : 29, true, false);
    drawCentered(label, xs[index], y + 1, index === 2 ? 17 : 22, "#fff8e9", "900");
    if (index < 2) {
      line(xs[index] + 36, y, xs[index + 1] - 36, y, "#6a5145", 3);
      ctx.fillStyle = "#6a5145";
      ctx.beginPath();
      ctx.moveTo(xs[index + 1] - 34, y);
      ctx.lineTo(xs[index + 1] - 44, y - 6);
      ctx.lineTo(xs[index + 1] - 44, y + 6);
      ctx.closePath();
      ctx.fill();
    }
  });
  drawCentered("魏军过汲道，最终进攻蜀营", layout.w / 2, box.y + 228, 16, "#48372e", "800");
  drawCentered("营寨生命归零则街亭失守", layout.w / 2, box.y + 258, 14, "#9a372d", "700");
  drawButton(next, "下一步", "#b85a46", "#6a3028", true);
}

function drawTutorialDeploy({ box, next }) {
  drawCentered("布阵成将", layout.w / 2, box.y + 42, 29, "#382820", "900");
  drawCentered("征兵 → 拖动 → 相邻", layout.w / 2, box.y + 80, 17, "#765848", "800");
  const y = box.y + 160;
  const labels = ["征兵", "白格", "马 谡"];
  labels.forEach((label, index) => {
    const x = box.x + 67 + index * ((box.w - 134) / 2);
    ctx.fillStyle = index === 2 ? "#d6b55e" : "#fffaf0";
    roundRect(x - 40, y - 31, 80, 62, 5, true, false);
    ctx.strokeStyle = "#6a5145";
    ctx.lineWidth = 2;
    roundRect(x - 40, y - 31, 80, 62, 5, false, true);
    drawCentered(label, x, y, 18, "#342a24", "900");
  });
  drawCentered("马谡放山地 · 王平守青色水防", layout.w / 2, box.y + 226, 15, "#48372e", "800");
  drawCentered("拖动时黄光格就是可放位置", layout.w / 2, box.y + 256, 15, "#8d3029", "800");
  drawButton(next, "选择军令", "#b85a46", "#6a3028", true);
}

function drawTutorialOrders({ box, risky, steady }) {
  drawCentered("选择首道军令", layout.w / 2, box.y + 40, 27, "#382820", "900");
  drawCentered("战中点击释放，冷却后可再用", layout.w / 2, box.y + 70, 14, "#765848", "700");
  drawOrderChoiceCard(risky, "险策", "箭雨清山道", "上山杀得快", COMMAND_ORDERS.risky.color);
  drawOrderChoiceCard(steady, "稳阵", "击退并补水", "守水才能活", COMMAND_ORDERS.steady.color);
  drawCentered("险攻山 · 稳守水", layout.w / 2, box.y + 326, 14, "#62483b", "700");
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(20, 16, 13, 0.42)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  const { box, resume, help, exit } = pauseOverlayRects();
  ctx.fillStyle = "rgba(247, 241, 228, 0.96)";
  roundRect(box.x, box.y, box.w, box.h, 10, true, false);
  ctx.strokeStyle = "#6a5145";
  ctx.lineWidth = 3;
  roundRect(box.x, box.y, box.w, box.h, 10, false, true);
  drawCentered("战斗暂停", layout.w / 2, box.y + 42, 28, "#3a2b24", "900");
  drawButton(resume, "继续战斗", "#b85845", "#69312b", true);
  drawButton(help, "战役说明", "#88704d", "#51422f", false);
  drawButton(exit, "退出战斗", "#665b52", "#3d342e", false);
  ctx.restore();
}

function branchPromptRects() {
  const box = { x: layout.w / 2 - 154, y: layout.h / 2 - 178, w: 308, h: 356 };
  return {
    box,
    retreat: { x: box.x + 24, y: box.y + 98, w: box.w - 48, h: 82 },
    hold: { x: box.x + 24, y: box.y + 206, w: box.w - 48, h: 82 }
  };
}

function drawBranchPrompt() {
  const { box, retreat, hold } = branchPromptRects();
  ctx.save();
  ctx.fillStyle = "rgba(18,14,12,0.68)";
  ctx.fillRect(0, 0, layout.w, layout.h);
  ctx.fillStyle = "#f4ead5";
  roundRect(box.x, box.y, box.w, box.h, 8, true, false);
  ctx.strokeStyle = "#6e4632";
  ctx.lineWidth = 3;
  roundRect(box.x, box.y, box.w, box.h, 8, false, true);
  drawCentered("街亭抉择", layout.w / 2, box.y + 42, 29, "#3a2720", "900");
  drawCentered("诸葛军令已至", layout.w / 2, box.y + 70, 14, "#765848", "700");
  drawBranchChoice(retreat, "王平断后", "目标：守住最后一波，全军撤出", "#4f7e68", "#294b3c");
  drawBranchChoice(hold, "坚守街亭", "目标：营≥2 · 汲道≥30", "#a64435", "#6e261f");
  ctx.restore();
}

function drawBranchChoice(rect, title, description, fill, border) {
  ctx.fillStyle = fill;
  roundRect(rect.x, rect.y, rect.w, rect.h, 7, true, false);
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  roundRect(rect.x, rect.y, rect.w, rect.h, 7, false, true);
  drawCentered(title, rect.x + rect.w / 2, rect.y + 29, 22, "#fff8e9", "900");
  drawCentered(description, rect.x + rect.w / 2, rect.y + 59, 12, "#f5ead8", "700");
}

function pauseOverlayRects() {
  const box = { x: layout.w / 2 - 126, y: layout.h / 2 - 144, w: 252, h: 288 };
  return {
    box,
    resume: { x: box.x + 34, y: box.y + 70, w: box.w - 68, h: 48 },
    help: { x: box.x + 34, y: box.y + 134, w: box.w - 68, h: 44 },
    exit: { x: box.x + 34, y: box.y + 198, w: box.w - 68, h: 44 }
  };
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
  drawBun(50, layout.safeTop + 24, 15);
  ctx.fillStyle = "#2a211d";
  roundRect(62, layout.safeTop + 9, 68, 30, 15, true, false);
  drawText(`${Math.round(state.displayedBuns)}`, 96, layout.safeTop + 31, 20, "#f6eee3", "900", "center");
  drawText(SCENARIO_TEXT.resourceName, 96, layout.safeTop + 6, 11, "#3b241d", "900", "center");
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
      const x = c * layout.cellW;
      const y = r * layout.cellH;
      if (state.bossBlocked.has(key)) ctx.fillStyle = "#3f3835";
      else if (JIETING_TERRAIN.camp.has(key)) ctx.fillStyle = "#dfc289";
      else if (pathKeySet.has(key) && JIETING_TERRAIN.water.has(key)) ctx.fillStyle = state.waterPressure ? "#6f9eaa" : "#91b9bc";
      else if (pathKeySet.has(key)) ctx.fillStyle = "#b99b7f";
      else if (JIETING_TERRAIN.mountain.has(key)) ctx.fillStyle = "#d7dfc4";
      else if (JIETING_TERRAIN.waterDefense.has(key)) ctx.fillStyle = "#c8ded8";
      else if (isCultivatedCell(key)) ctx.fillStyle = "#f3eddf";
      else ctx.fillStyle = "#505a54";
      ctx.fillRect(x, y, layout.cellW, layout.cellH);
      ctx.strokeStyle = "#34312e";
      ctx.lineWidth = 1.15;
      ctx.strokeRect(x + 0.5, y + 0.5, layout.cellW - 1, layout.cellH - 1);
      if (state.bossBlocked.has(key)) {
        ctx.strokeStyle = "rgba(238,157,183,0.72)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + layout.cellW - 5, y + layout.cellH - 5);
        ctx.moveTo(x + layout.cellW - 5, y + 5);
        ctx.lineTo(x + 5, y + layout.cellH - 5);
        ctx.stroke();
      }
      if (!pathKeySet.has(key) && isCultivatedCell(key) && !state.board.has(key)) {
        ctx.strokeStyle = "rgba(82,111,75,0.55)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + 4, y + 4, layout.cellW - 8, layout.cellH - 8);
        ctx.setLineDash([]);
      }
      if (JIETING_TERRAIN.mountain.has(key)) {
        line(x + layout.cellW * 0.18, y + layout.cellH * 0.72, x + layout.cellW * 0.5, y + layout.cellH * 0.22, "rgba(49,69,43,0.42)", 2);
        line(x + layout.cellW * 0.5, y + layout.cellH * 0.22, x + layout.cellW * 0.82, y + layout.cellH * 0.72, "rgba(49,69,43,0.42)", 2);
      } else if (JIETING_TERRAIN.water.has(key)) {
        line(x + layout.cellW * 0.18, y + layout.cellH * 0.52, x + layout.cellW * 0.82, y + layout.cellH * 0.5, "rgba(31,82,102,0.38)", 2);
      } else if (JIETING_TERRAIN.waterDefense.has(key)) {
        ctx.strokeStyle = "rgba(50,112,94,0.58)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + layout.cellW * 0.5, y + layout.cellH * 0.22);
        ctx.lineTo(x + layout.cellW * 0.72, y + layout.cellH * 0.34);
        ctx.lineTo(x + layout.cellW * 0.64, y + layout.cellH * 0.7);
        ctx.lineTo(x + layout.cellW * 0.5, y + layout.cellH * 0.79);
        ctx.lineTo(x + layout.cellW * 0.36, y + layout.cellH * 0.7);
        ctx.lineTo(x + layout.cellW * 0.28, y + layout.cellH * 0.34);
        ctx.closePath();
        ctx.stroke();
      } else if (key === "9,2") {
        drawGlyphLayer("蜀", x + layout.cellW / 2, y + layout.cellH * 0.68, layout.cell * 0.68, "rgba(113,41,31,0.78)");
      }
    }
  }
  drawRouteStones(time);
  drawRouteEntrances(time);
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
  for (const path of Object.values(GAME_PATHS)) {
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      const x = c * layout.cellW + layout.cellW / 2;
      const y = r * layout.cellH + layout.cellH / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const a = 0.42 + Math.sin(time * 4) * 0.08;
  ctx.fillStyle = `rgba(115,70,51,${a})`;
  for (const path of Object.values(GAME_PATHS)) {
    for (let i = 0; i < path.length; i += 2) {
      const [r, c] = path[i];
      circle(c * layout.cellW + layout.cellW / 2, r * layout.cellH + layout.cellH / 2, 2.2, true, false);
    }
  }
}

function drawRouteEntrances(time) {
  const pulse = 0.78 + Math.sin(time * 5) * 0.16;
  for (const path of Object.values(GAME_PATHS)) {
    const [r, c] = path[0];
    const x = (c + 0.5) * layout.cellW;
    const y = (r + 0.16) * layout.cellH;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#a83a2d";
    ctx.beginPath();
    ctx.moveTo(x, y + layout.cellH * 0.26);
    ctx.lineTo(x - layout.cell * 0.13, y);
    ctx.lineTo(x + layout.cell * 0.13, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawMapSideLabels() {
  for (const [gate, path] of Object.entries(GAME_PATHS)) {
    const [r, c] = path.at(-1);
    const x = layout.boardX + (c + 0.5) * layout.cellW;
    const y = layout.boardY + (r + 0.5) * layout.cellH;
    if (gate === "left") {
      ctx.save();
      ctx.globalAlpha = 0.82;
      drawGlyphLayer("营", x, y + layout.cell * 0.18, layout.cell * 0.84, "#18110e");
      ctx.restore();
    }
    if (gate !== "left") continue;
    const heartsY = y - layout.cell * 0.48;
    for (let i = 0; i < 3; i++) {
      drawHeart(x - 13 + i * 13, heartsY, i < state.douHp[gate] ? "#d83435" : "#6b5d57");
    }
  }
}

function drawDropHighlight(time) {
  if (!state.drag?.unit) return;
  const pulse = 0.62 + Math.sin(time * 6) * 0.18;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = "#f4cf45";
  ctx.shadowColor = "#ffd94d";
  ctx.shadowBlur = MOBILE_RENDER_MODE ? 0 : Math.max(6, layout.cell * 0.2);
  ctx.lineWidth = 2.2;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (!canDropOn({ kind: "board", r, c }, state.drag.unit)) continue;
      const cell = cellRect(r, c);
      roundRect(cell.x + 3, cell.y + 3, cell.w - 6, cell.h - 6, 4, false, true);
    }
  }
  ctx.restore();
  if (!state.drag.hover) return;
  const hover = state.drag.hover;
  const p = hover.kind === "board" ? cellRect(hover.r, hover.c) : campSlotRect(hover.i);
  ctx.save();
  ctx.globalAlpha = 0.72 + Math.sin(time * 12) * 0.18;
  ctx.strokeStyle = canDropOn(hover, state.drag.unit) ? "#f2d04f" : "#d94738";
  ctx.shadowColor = canDropOn(hover, state.drag.unit) ? "#ffe46a" : "transparent";
  ctx.shadowBlur = !MOBILE_RENDER_MODE && canDropOn(hover, state.drag.unit) ? 10 : 0;
  ctx.lineWidth = 3.5;
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
    const bossEnemy = enemy.bossIndex != null;
    ctx.save();
    ctx.translate(pos.x + laneX + pose.x - enemy.hitDx * (enemy.hitAge < 0.2 ? 5 : 0), pos.y + laneY + pose.y - enemy.hitDy * (enemy.hitAge < 0.2 ? 5 : 0));
    if (bossEnemy) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(time * 5 + enemy.wobble) * 0.12;
      ctx.strokeStyle = BOSS_ROSTER[enemy.bossIndex]?.color ?? "#d5a735";
      ctx.lineWidth = 3;
      circle(0, 7, layout.cell * 0.58, false, true);
      ctx.restore();
    }
    ctx.rotate(pose.rotate + segment.dir.x * 0.025);
    ctx.transform(1, 0, pose.skewX, 1, 0, 0);
    const enemyBuffScale = enemy.inspireLeft > 0 ? 1.2 : 1;
    const bossScale = bossEnemy ? 1.32 : 1;
    ctx.scale(pose.scaleX * (enemy.devourScale ?? 1) * enemyBuffScale * bossScale, pose.scaleY * (enemy.devourScale ?? 1) * enemyBuffScale * bossScale);
    ctx.globalAlpha = pose.alpha;
    const ink = enemy.hitFlash > 0 ? "#fff" : asset.ink;
    {
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
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      const hpWidth = layout.cell * (bossEnemy ? 0.92 : 0.68);
      ctx.fillStyle = bossEnemy ? "rgba(54,32,24,0.75)" : "rgba(54,32,24,0.38)";
      roundRect(-hpWidth / 2, -layout.cell * 0.5, hpWidth, bossEnemy ? 7 : 4, 2, true, false);
      ctx.fillStyle = bossEnemy ? "#e0a72e" : "#d93632";
      roundRect(-hpWidth / 2, -layout.cell * 0.5, hpWidth * hpRatio, bossEnemy ? 7 : 4, 2, true, false);
    }
    ctx.restore();
  }
}

function drawUnits(time) {
  drawUnitBoard(state.board, time, true);
}

function drawUnitBoard(board, time, draggable) {
  for (const [key, unit] of board) {
    if (draggable && state.drag?.source?.kind === "board" && state.drag.source.key === key) continue;
    const { r, c } = keyToCell(key);
    const rect = cellRect(r, c);
    drawUnitCard(unit, rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.9, time, false);
  }
  if (board === state.board) drawFormationOverlays(time);
}

function drawFormationOverlays(time) {
  for (const formation of state.formations) {
    const first = keyToCell(formation.memberKeys[0]);
    const last = keyToCell(formation.memberKeys.at(-1));
    const a = cellCenter(first.r, first.c);
    const b = cellCenter(last.r, last.c);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    ctx.save();
    ctx.globalAlpha = 0.58 + Math.sin(time * 4 + formation.wobble) * 0.08;
    ctx.strokeStyle = formation.token === "王平" ? "#5b8b6f" : "#d29b22";
    ctx.lineWidth = Math.max(2, layout.cell * 0.045);
    ctx.beginPath();
    ctx.moveTo(a.x, cy + layout.cell * 0.32);
    ctx.lineTo(b.x, cy + layout.cell * 0.32);
    ctx.stroke();
    ctx.restore();
    if (formation.token === "王平") {
      ctx.save();
      const steadyActive = state.commandOrder === "steady" && state.orderActiveLeft > 0;
      ctx.globalAlpha = steadyActive ? 0.52 : 0.28;
      ctx.strokeStyle = "#5a8c78";
      ctx.lineWidth = steadyActive ? 3 : 2;
      circle(cx, cy, layout.cell * 2.8, false, true);
      ctx.restore();
    } else if (formation.token === "马谡" && isMountainUnit(formation)) {
      ctx.save();
      ctx.globalAlpha = 0.34 + Math.sin(time * 7) * 0.08;
      ctx.strokeStyle = "#d6a62d";
      ctx.lineWidth = 2.5;
      circle(cx, cy, layout.cell * 0.72, false, true);
      ctx.restore();
    }
  }
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
  drawRecruitButton();
}

function drawRecruitButton() {
  const rect = layout.recruit;
  ctx.save();
  ctx.fillStyle = state.buns >= state.refreshCost ? "#bf6d52" : "#6e625d";
  roundRect(rect.x, rect.y, rect.w, rect.h, 6, true, false);
  ctx.strokeStyle = "#4a2c26";
  ctx.lineWidth = 4;
  roundRect(rect.x, rect.y, rect.w, rect.h, 6, false, true);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(rect.x + 6, rect.y + 6, rect.w - 12, 15);
  drawCentered("征兵", rect.x + rect.w / 2, rect.y + 20, 24, "#fff5e5", "900");
  drawBun(rect.x + rect.w / 2 - 15, rect.y + 50, 9);
  drawText(String(state.refreshCost), rect.x + rect.w / 2 + 8, rect.y + 50, 14, "#fff7ea", "900", "left");
  ctx.restore();
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
  for (const effect of state.shovelEffects) {
    const k = Math.min(1, effect.age / effect.life);
    const strike = k < 0.62 ? easeOutBack(k / 0.62) : 1 - (k - 0.62) / 0.38 * 0.18;
    ctx.save();
    ctx.globalAlpha = k > 0.88 ? (1 - k) / 0.12 : 1;
    ctx.translate(effect.x, effect.y - layout.cell * (0.22 - strike * 0.16));
    ctx.rotate(lerp(-1.25, 0.48, strike));
    drawOriginalPropSprite(ctx, "shovelShadow.png", layout.cell * 0.08, layout.cell * 0.3, layout.cell * 0.8, layout.cell * 0.32, { alpha: 0.48 });
    drawOriginalPropSprite(ctx, "shovel_1.png", 0, 0, layout.cell * 1.12, layout.cell * 1.12);
    ctx.restore();
  }
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
  const renderColor = pose.tint === "formationGold" ? formationGoldGradient(size) : color;
  let drawn = drawHanddrawnGlyph(ctx, text, size, { tint: pose.tint ?? null });
  if (!drawn && isJietingHanddrawnText(text)) {
    drawReadableGlyphFallback(text, size, renderColor);
    drawn = true;
  } else if (!drawn) {
    drawn = drawVectorHanzi(ctx, text, size, renderColor, {
      jitter: pose.jitter ?? 0,
      stroke: pose.stroke,
      breathe: Math.abs((pose.glyphScaleX ?? 1) - (pose.glyphScaleY ?? 1)) + Math.abs(pose.rotate ?? 0),
      attack: pose.glow ?? 0,
      merge: Math.max(0, ((pose.glyphScaleX ?? 1) - 1) * 0.8),
      phase: performance.now() * 0.001,
      action: pose.action,
      actionProgress: pose.actionProgress
    });
  }
  if (!drawn) drawInkSigil(size, renderColor);
  ctx.restore();
}

function formationGoldGradient(size) {
  const gold = ctx.createLinearGradient(0, -size * 0.52, 0, size * 0.52);
  gold.addColorStop(0, "#d7aa3a");
  gold.addColorStop(0.48, "#9f711f");
  gold.addColorStop(1, "#684111");
  return gold;
}

function drawReadableGlyphFallback(text, size, color) {
  const chars = [...String(text)];
  const fontSize = chars.length > 1 ? size * Math.min(0.82, 1.55 / chars.length) : size;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `900 ${fontSize}px "KaiTi", "STKaiti", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
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
  roundRect(x, y, w, 300, 10, true, false);
  ctx.strokeStyle = "#3c2821";
  ctx.lineWidth = 3;
  roundRect(x, y, w, 300, 10, false, true);
  drawInkTitle(state.banner?.title ?? "结束", layout.w / 2, y + 58, 42, state.banner?.won ? "#a32d24" : "#25201d");
  drawCentered(state.banner?.sub ?? "", layout.w / 2, y + 96, 18, "#4b3c33", "800");
  drawCentered(`坚持到第${state.wave}波`, layout.w / 2, y + 132, 20, "#9b342b", "900");
  drawButton({ x: layout.w / 2 - 92, y: y + 176, w: 184, h: 54 }, "再来一局", "#b85845", "#68332b", false);
  drawButton({ x: layout.w / 2 - 92, y: y + 240, w: 184, h: 44 }, "返回主菜单", "#665b52", "#3d342e", false);
}

function drawUnitCard(unit, cx, cy, size, time, dragging) {
  const token = unit.token;
  const glyph = displayGlyph(unit);
  const asset = getHanziAsset(unit.type === "shovel" ? "铲" : glyph);
  const formation = formationForUnit(unit);
  const animationUnit = formation ?? unit;
  const k = Math.max(0, Math.min(1, (performance.now() - unit.placedAt) / 260));
  const appear = dragging ? 1 : Math.max(0.2, 0.65 + easeOutBack(k) * 0.35);
  const asleep = unit.type === "char" && isOnBoard(unit) && !formation;
  const idleName = asleep ? "sleep" : "idle";
  const idlePose = sampleMotion(asset, idleName, ((time * 0.85 + unit.wobble) % 1 + 1) % 1);
  const actionProgress = animationUnit.action && animationUnit.action !== "idle" ? animationUnit.actionAge / animationUnit.actionLife : 0;
  const actionPose = animationUnit.action && animationUnit.action !== "idle" ? sampleMotion(asset, animationUnit.action, actionProgress) : null;
  const dragPose = dragging ? sampleMotion(asset, "drag", 0.45) : null;
  const pose = combinePoses(idlePose, actionPose, dragPose);
  const s = size * appear * (dragging ? 1.03 : 1);
  const x = cx - s / 2;
  const y = cy - s / 2;
  ctx.save();
  ctx.shadowColor = dragging ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)";
  ctx.shadowBlur = MOBILE_RENDER_MODE ? 0 : dragging ? 10 : 4 + pose.shadow * 3 + pose.glow * 5;
  ctx.shadowOffsetY = MOBILE_RENDER_MODE ? 0 : dragging ? 8 : 2;

  ctx.globalAlpha = pose.alpha;
  const showCard = !dragging && !isOnBoard(unit);
  if (showCard) {
    ctx.fillStyle = asset.paper ?? "#faf5e9";
    roundRect(x, y, s, s, 4, true, false);
    ctx.strokeStyle = asset.border ?? (unit.type === "general" ? "#d7ad35" : "#756b61");
    ctx.lineWidth = unit.type === "general" ? 3 : 2;
    roundRect(x, y, s, s, 4, false, true);
  }
  if (!dragging && pose.glow > 0.05) {
    ctx.save();
    ctx.globalAlpha = pose.glow * 0.55;
    ctx.strokeStyle = asset.role === "general" ? "#f3c44e" : "#fff1a8";
    ctx.lineWidth = 3;
    roundRect(x - 3, y - 3, s + 6, s + 6, 7, false, true);
    ctx.restore();
  }

  if (unit.type === "shovel") {
    ctx.save();
    ctx.translate(cx + pose.x, cy + pose.y);
    ctx.rotate(pose.rotate * 0.45);
    drawOriginalPropSprite(ctx, "shovel_1.png", 0, 0, s * 0.82, s * 0.82);
    ctx.restore();
  } else {
    const glyphCx = cx + pose.x + pose.glyphX;
    const glyphCy = cy + pose.y + s * (asset.baseline + (unit.type === "general" ? 0.09 : 0.04)) + pose.glyphY;
    const glyphPose = {
      scaleX: pose.scaleX * pose.glyphScaleX,
      scaleY: pose.scaleY * pose.glyphScaleY,
      skewX: pose.skewX + pose.glyphSkewX,
      rotate: asset.tilt + pose.rotate + pose.glyphRotate,
      jitter: asleep ? 0.18 : asset.jitter,
      stroke: formation ? "rgba(105,63,13,0.5)" : unit.type === "general" ? "rgba(128,79,19,0.26)" : "rgba(255,255,255,0.18)",
      tint: formation ? "formationGold" : null,
      action: animationUnit.action,
      actionProgress
    };
    const usedOriginalGeneral = Boolean(formation && hasOriginalGeneralAnimation(formation.token) && isOriginalGeneralReady(formation.id));
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
      action: animationUnit.action,
      actionProgress,
      actionAge: animationUnit.actionAge,
      actionDx: animationUnit.actionDx,
      actionDy: animationUnit.actionDy,
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
      drawGlyphLayer(glyph, glyphCx, glyphCy, s * asset.fontScale, formation ? "#9f711f" : asleep ? "#857a70" : asset.ink, glyphPose);
      if (animationUnit.action === "attack") drawCardAttackOverlay(glyph, cx, cy, s, actionProgress, formation ? animationPresetForUnit(formation, weapons, GENERAL_COMBAT_CONFIG).cardKind : weapons[unit.token]?.kind ?? asset.role);
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
    drawCentered(isOnBoard(unit) ? "屯田" : "产粮", cx, y + s * 0.75, Math.max(10, s * 0.16), "#8d6423", "900");
    ctx.fillStyle = "rgba(53,43,35,0.28)";
    roundRect(x + s * 0.12, y + s * 0.82, s * 0.76, 4, 2, true, false);
    ctx.fillStyle = "#d8a936";
    roundRect(x + s * 0.12, y + s * 0.82, s * 0.76 * Math.max(0, Math.min(1, unit.farmTimer / cycle)), 4, 2, true, false);
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
  return Boolean(unit.formationId && state.formations.some((formation) => formation.id === unit.formationId));
}

function formationForUnit(unit) {
  return unit?.formationId ? state.formations.find((formation) => formation.id === unit.formationId) ?? null : null;
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
    else if (hitRect(p, { x: layout.w / 2 - 92, y: layout.h * 0.28 + 240, w: 184, h: 44 })) exitToMenu();
    return;
  }
  if (state.tutorialStep >= 0) {
    const tutorial = tutorialBriefingRects();
    if (state.tutorialStep < 2 && hitRect(p, tutorial.next)) state.tutorialStep += 1;
    else if (state.tutorialStep === 2 && hitRect(p, tutorial.risky)) completeTutorial("risky");
    else if (state.tutorialStep === 2 && hitRect(p, tutorial.steady)) completeTutorial("steady");
    return;
  }
  if (state.branchPrompt) {
    const branch = branchPromptRects();
    if (hitRect(p, branch.retreat)) chooseEndingRoute("retreat");
    else if (hitRect(p, branch.hold)) chooseEndingRoute("hold");
    return;
  }
  if (state.recruitChoices) {
    const choice = recruitChoiceRects().cards.findIndex((rect) => hitRect(p, rect));
    if (choice >= 0) selectRecruitChoice(choice);
    return;
  }
  if (state.paused) {
    const pauseMenu = pauseOverlayRects();
    if (hitRect(p, pauseMenu.resume) || hitCircle(p, layout.pause)) {
      state.paused = false;
      audioEngine.play("popup_notification", 0.14, 0.1);
    } else if (hitRect(p, pauseMenu.help)) {
      state.paused = false;
      state.tutorialStep = 0;
      state.tutorialReplay = true;
    } else if (hitRect(p, pauseMenu.exit)) {
      exitToMenu();
    }
    return;
  }
  if (state.freeOrderChoice) {
    const orderBriefing = orderBriefingRects();
    if (hitRect(p, orderBriefing.risky)) chooseCommandOrder("risky");
    else if (hitRect(p, orderBriefing.steady)) chooseCommandOrder("steady");
    return;
  }
  for (const [orderId, rect] of Object.entries(layout.orderButtons ?? {})) {
    if (!hitRect(p, rect)) continue;
    chooseCommandOrder(orderId);
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
      startDrag(unit, { kind: "board", key }, p);
      state.board.delete(key);
      rebuildFormations();
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
    toast("拒马和伏火只能布在道路上", "#d84335");
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
  if (unit.deploymentZone === "mountain") toast("马谡字：放到山形黄光格", "#d29b22");
  if (unit.deploymentZone === "waterDefense") toast("王平字：放到盾形黄光格", "#3e7561");
  if (unit.type === "farmer") toast("农：稀有后勤，屯田每40秒军粮+1", "#9a6b24");
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
    return !pathKeySet.has(key)
      && !JIETING_TERRAIN.camp.has(key)
      && !state.cultivated.has(key)
      && !state.board.has(key)
      && !state.bossBlocked.has(key);
  }
  if (unit.type === "farmer") {
    const type = playerCellType(target.r, target.c);
    return (state.cultivated.has(key) || type === "2_0") && !pathKeySet.has(key);
  }
  if (unit.deploymentZone === "mountain" && !JIETING_TERRAIN.mountain.has(key)) return false;
  if (unit.deploymentZone === "waterDefense" && !JIETING_TERRAIN.waterDefense.has(key)) return false;
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
  rebuildFormations();
  return true;
}

function dropOnBoard(unit, r, c) {
  const key = `${r},${c}`;
  if (unit.type === "shovel") {
    state.cultivated.add(key);
    const center = cellCenter(r, c);
    state.shovelEffects.push({ x: center.x, y: center.y, age: 0, life: 0.78 });
    audioEngine.play("shovel_use", 0.3);
    cultivateFx(center);
    return true;
  }
  const existing = state.board.get(key);
  if (existing && canMerge(existing, unit)) {
    absorbFx(existing, unit, cellCenter(r, c), state.drag ? { x: state.drag.x, y: state.drag.y } : cellCenter(r, c));
    const merged = mergedUnit(existing, unit);
    if (merged.type === "farmer") activateFarmerForCell(merged, r, c);
    state.board.set(key, merged);
    mergeFx(cellCenter(r, c));
    rebuildFormations();
    return true;
  }
  state.board.set(key, unit);
  if (unit.type === "farmer") activateFarmerForCell(unit, r, c);
  unit.placedAt = performance.now();
  setUnitAction(unit, "drop", 0.22, 0, 1);
  if (existing) restoreToSource(existing);
  settleFx(cellCenter(r, c));
  rebuildFormations();
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
    rebuildFormations();
  }
}

function canMerge(a, b) {
  if ((a.mergeLockedLeft ?? 0) > 0 || (b.mergeLockedLeft ?? 0) > 0) return false;
  if (a.type !== b.type || a.token !== b.token || a.level !== b.level) return false;
  if (a.type === "weapon" || a.type === "farmer") return a.level < 5;
  return false;
}

function activateFarmerForCell(unit, r, c) {
  unit.farmMode = "farming";
  unit.farmCrazyLeft = 0;
  unit.farmTimer = 0;
  const center = cellCenter(r, c);
  floatText("屯田 · 每40秒军粮+1", center.x, center.y - layout.cell * 0.38, "#9a6b24", 14);
}

function mergedUnit(a, b) {
  const unit = makeUnit(a.token, Math.max(a.level, b.level) + 1);
  unit.placedAt = performance.now();
  setUnitAction(unit, "merge", 0.48, 0, -1);
  return unit;
}

function recruit() {
  if (state.buns < state.refreshCost) {
    toast(SCENARIO_TEXT.recruitInsufficient, "#d84335");
    shake(0.09, 2);
    return;
  }
  const guaranteed = state.firstRecruitGuaranteed ? ["马", "谡", "王", "平", "铲"] : null;
  if (!guaranteed) {
    const openSlots = state.camp.map((unit, i) => unit ? -1 : i).filter((i) => i >= 0).slice(0, 3);
    if (!openSlots.length) {
      toast("营中已满，先部署单位", "#d84335");
      return;
    }
    state.buns -= state.refreshCost;
    state.refreshCost += 2;
    const recruits = createRecruitChoices().slice(0, openSlots.length);
    recruits.forEach((choice, index) => {
      const slot = openSlots[index];
      state.camp[slot] = choice.unit;
      if (!BASIC_DECK_TOKENS.has(choice.original)) {
        const poolIndex = state.playerDeckPool.indexOf(choice.original);
        if (poolIndex >= 0) state.playerDeckPool.splice(poolIndex, 1);
      }
      state.recruits.push({ i: slot, age: -index * 0.06, life: 0.3 + index * 0.06 });
    });
    toast(`三军入营 · ${recruits.map((choice) => choice.original === "农" ? "农(屯田产粮)" : choice.original).join("、")}`, "#f3c037");
    audioEngine.play("popup_notification", 0.16, 0.08);
    return;
  }
  state.buns -= state.refreshCost;
  state.refreshCost += 2;
  for (let i = 0; i < CAMP_SIZE; i++) {
    state.camp[i] = guaranteed?.[i] ? makeUnit(internalToken(guaranteed[i])) : drawOriginalDeckUnit(true);
    if (i < 2) state.camp[i].deploymentZone = "mountain";
    else if (i < 4) state.camp[i].deploymentZone = "waterDefense";
    state.recruits.push({ i, age: -i * 0.06, life: 0.28 + i * 0.06 });
  }
  state.firstRecruitGuaranteed = false;
  toast(guaranteed ? "首军到营 · 铲可开垦荒地" : "征兵完成", "#f3c037");
}

function createRecruitChoices() {
  const firstBasic = drawRecruitCombatToken();
  const secondBasic = drawRecruitCombatToken(new Set([firstBasic]));
  const supportRoll = Math.random();
  const third = ENABLE_FARMER_ABILITY && supportRoll < 0.06
    ? { category: "辅", original: "农" }
    : supportRoll < 0.56
      ? { category: "辅", original: "铲" }
      : { category: "兵", original: drawRecruitCombatToken(new Set([firstBasic, secondBasic])) };
  state.lastRecruitBasics = [firstBasic, secondBasic, third.category === "兵" ? third.original : null].filter(Boolean);
  return [
    { category: "兵", original: firstBasic },
    { category: "兵", original: secondBasic },
    third
  ].map((choice) => ({ ...choice, label: `${choice.category} · ${choice.original}`, unit: makeUnit(internalToken(choice.original), 1) }));
}

function drawRecruitCombatToken(excluded = new Set()) {
  const candidates = ["刀", "枪", "弓", "骑"]
    .filter((token) => !excluded.has(token))
    .map((token) => ({
      token,
      weight: (JIETING_DECK_WEIGHTS[token] ?? 1) * (state.lastRecruitBasics.includes(token) ? 0.45 : 1)
    }));
  const total = candidates.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll <= 0) return candidate.token;
  }
  return candidates.at(-1)?.token ?? "刀";
}

function selectRecruitChoice(index) {
  const choice = state.recruitChoices?.[index];
  const slot = state.camp.findIndex((unit) => !unit);
  if (!choice || slot < 0 || state.buns < state.refreshCost) return;
  state.buns -= state.refreshCost;
  state.refreshCost += 2;
  state.camp[slot] = choice.unit;
  if (!BASIC_DECK_TOKENS.has(choice.original)) {
    const poolIndex = state.playerDeckPool.indexOf(choice.original);
    if (poolIndex >= 0) state.playerDeckPool.splice(poolIndex, 1);
  }
  state.recruits.push({ i: slot, age: 0, life: 0.34 });
  state.recruitChoices = null;
  toast(`${choice.original}入营`, "#f3c037");
}

function hitBoard(p) {
  if (p.x < layout.boardX || p.y < layout.boardY || p.x >= layout.boardX + layout.boardW || p.y >= layout.boardY + layout.boardH) return null;
  return {
    kind: "board",
    c: Math.floor((p.x - layout.boardX) / layout.cellW),
    r: Math.floor((p.y - layout.boardY) / layout.cellH)
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
  return { x: layout.boardX + c * layout.cellW, y: layout.boardY + r * layout.cellH, w: layout.cellW, h: layout.cellH };
}

function cellCenter(r, c) {
  return { x: layout.boardX + c * layout.cellW + layout.cellW / 2, y: layout.boardY + r * layout.cellH + layout.cellH / 2 };
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
  if (glow && !MOBILE_RENDER_MODE) {
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
  if (w <= 0 || h <= 0) return;
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
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
  const generals = state.formations
    .filter((formation) => hasOriginalGeneralAnimation(formation.token))
    .map((formation) => {
      const { r, c } = keyToCell(formation.anchorKey);
      const center = cellCenter(r, c);
      return {
        ...formation,
        x: center.x + ((formation.span - 1) / 2) * layout.cellW,
        y: center.y + layout.cell * 0.16
      };
    });
  syncGeneralAnimations(generals, layout.cell);
}

function syncOriginalEnemyLayer() {
  syncEnemyAnimations([], layout.cell);
}

function syncOriginalADouLayer() {
  syncADouAnimations([]);
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
