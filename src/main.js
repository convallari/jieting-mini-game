import { ENEMY_GLYPHS, combinePoses, getHanziAsset, sampleMotion } from "./hanziAssets.js";
import { drawVectorHanzi, hasVectorHanzi } from "./vectorHanzi.js";
import { drawWeaponGlyphSprite, hasWeaponGlyphSprite, preloadWeaponGlyphSprites } from "./weaponGlyphSprites.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BOARD_COLS = 9;
const BOARD_ROWS = 12;
const CAMP_SIZE = 5;
const RECRUIT_COST = 12;

const pathCells = [
  [3, 0], [3, 1], [3, 2], [3, 3], [4, 3], [5, 3], [6, 3],
  [6, 4], [6, 5], [6, 6], [5, 6], [4, 6], [4, 7], [4, 8],
  [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8]
];

const pathKeySet = new Set(pathCells.map(([r, c]) => `${r},${c}`));
const blockedSet = new Set([
  "0,0", "0,1", "0,7", "0,8", "1,0", "1,8",
  "2,0", "2,4", "2,8", "8,0", "8,1", "9,0",
  "10,0", "10,1", "10,2", "11,0", "11,1", "11,2",
  "9,5", "10,5", "11,5"
]);

const initialCultivated = new Set([
  "1,3", "1,4", "1,5", "2,3", "2,5", "3,4", "3,5",
  "5,1", "5,2", "6,1", "7,1", "7,2", "7,3",
  "8,3", "8,4", "8,5", "8,6", "9,3", "9,4",
  "10,3", "10,4", "10,6", "10,7", "11,6", "11,7"
]);

const weapons = {
  dao: { glyph: "刀", name: "刀", range: 1.5, cooldown: 0.62, damage: 16, color: "#f3e7c6", kind: "melee" },
  qiang: { glyph: "枪", name: "枪", range: 2.5, cooldown: 0.74, damage: 14, color: "#e8f0d4", kind: "stab" },
  gong: { glyph: "弓", name: "弓", range: 3.5, cooldown: 0.92, damage: 13, color: "#eef0ff", kind: "arrow" },
  ji: { glyph: "骑", name: "骑", range: 1.5, cooldown: 0.82, damage: 18, color: "#f4dfd5", kind: "dash" }
};

const charPairs = [
  { first: "赵", second: "云", general: "赵云" },
  { first: "张", second: "飞", general: "张飞" },
  { first: "黄", second: "忠", general: "黄忠" }
];

const recruitPool = [
  "dao", "dao", "qiang", "qiang", "gong", "gong", "ji",
  "shovel", "赵", "云", "张", "飞", "黄", "忠"
];

let idSeq = 1;
let state = createState();
let layout = {};
let lastTime = performance.now();
let pointer = null;
const debugParams = new URLSearchParams(window.location.search);
const DEBUG_ATTACK = debugParams.has("debugAttack");
preloadWeaponGlyphSprites();

function createState() {
  return {
    mode: "menu",
    buns: 36,
    displayedBuns: 36,
    wave: 1,
    waveTimer: 0,
    spawnLeft: 8,
    douHp: 6,
    paused: false,
    cultivated: new Set(initialCultivated),
    board: new Map(),
    camp: new Array(CAMP_SIZE).fill(null),
    enemies: [],
    projectiles: [],
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
    type: isWeapon ? "weapon" : isGeneral ? "general" : token === "shovel" ? "shovel" : "char",
    attackTimer: 0,
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
}

new ResizeObserver(resize).observe(canvas);
resize();

function startGame() {
  state = createState();
  state.mode = "play";
  state.camp[0] = makeUnit("赵");
  state.camp[1] = makeUnit("云");
  state.camp[2] = makeUnit("dao");
  state.camp[3] = makeUnit("gong");
  state.camp[4] = makeUnit("shovel");
  if (DEBUG_ATTACK) setupDebugAttack();
  toast(DEBUG_ATTACK ? "攻击动画预览" : "拖动文字到相邻格，可合成将领", "#f3c037");
}

function setupDebugAttack() {
  state.buns = 120;
  state.displayedBuns = 120;
  state.wave = 3;
  state.spawnLeft = 0;
  state.waveTimer = 999;
  state.camp = new Array(CAMP_SIZE).fill(null);
  state.board.clear();
  const previewUnits = [
    ["2,3", makeUnit("qiang", 3)],
    ["3,4", makeUnit("dao", 3)],
    ["5,2", makeUnit("gong", 3)],
    ["7,3", makeUnit("ji", 3)]
  ];
  for (const [key, unit] of previewUnits) {
    unit.attackTimer = 0.04 + Math.random() * 0.08;
    state.board.set(key, unit);
  }
  state.enemies.push({
    id: idSeq++,
    t: 3.1,
    speed: 0.055,
    hp: 520,
    maxHp: 520,
    glyph: "贼",
    lane: 0,
    wobble: 0.2,
    hitFlash: 0,
    hitAge: 99,
    hitDx: 0,
    hitDy: 0,
    spawnAge: 1,
    dead: false
  });
  state.enemies.push({
    id: idSeq++,
    t: 5.35,
    speed: 0.045,
    hp: 420,
    maxHp: 420,
    glyph: "兵",
    lane: -0.12,
    wobble: 1.7,
    hitFlash: 0,
    hitAge: 99,
    hitDx: 0,
    hitDy: 0,
    spawnAge: 1,
    dead: false
  });
  state.enemies.push({
    id: idSeq++,
    t: 6.25,
    speed: 0.04,
    hp: 680,
    maxHp: 680,
    glyph: "寇",
    lane: 0.08,
    wobble: 2.8,
    hitFlash: 0,
    hitAge: 99,
    hitDx: 0,
    hitDy: 0,
    spawnAge: 1,
    dead: false
  });
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt, now / 1000);
  draw(now / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt, time) {
  updateParticles(dt);
  updateBuns(dt);

  if (state.mode !== "play" || state.paused) return;

  state.waveTimer -= dt;
  if (state.waveTimer <= 0 && state.spawnLeft > 0) {
    spawnEnemy();
    state.spawnLeft -= 1;
    state.waveTimer = Math.max(0.58, 1.08 - state.wave * 0.05);
  }

  if (state.spawnLeft === 0 && state.enemies.length === 0) {
    state.wave += 1;
    state.spawnLeft = 7 + state.wave * 2;
    state.waveTimer = 1.25;
    state.buns += 8 + state.wave;
    pulseAt(layout.w / 2, layout.safeTop + 36, "#f3c037", 36);
    toast(`第${state.wave}波敌军来袭`, "#d34331");
  }

  updateEnemies(dt);
  updateUnits(dt);
  if (state.drag?.unit) updateUnitAction(state.drag.unit, dt);
  updateProjectiles(dt);
}

function spawnEnemy() {
  const hp = 34 + state.wave * 10;
  state.enemies.push({
    id: idSeq++,
    t: 0,
    speed: 0.42 + state.wave * 0.018 + Math.random() * 0.08,
    hp,
    maxHp: hp,
    glyph: ENEMY_GLYPHS[Math.floor(Math.random() * ENEMY_GLYPHS.length)],
    lane: rand(-0.16, 0.16),
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
  for (const enemy of state.enemies) {
    if (enemy.dying) continue;
    enemy.spawnAge += dt;
    enemy.t += enemy.speed * dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.hitAge += dt;
    if (enemy.t >= pathCells.length - 1) {
      enemy.dying = true;
      enemy.deathAge = 0;
      const pos = enemyPosition(enemy);
      enemyDeathFx(pos.x, pos.y, enemy);
      state.douHp -= 1;
      shake(0.13, 3.4);
      floatText("斗 -1", layout.boardX + layout.boardW - 22, layout.boardY + layout.boardH - layout.cell * 1.3, "#d12d25", 18);
      if (state.douHp <= 0) {
        state.mode = "end";
        state.banner = { title: "失败", sub: "斗被敌军攻破", won: false };
      }
    }
  }
  for (const enemy of state.enemies) {
    if (enemy.dying) enemy.deathAge += dt;
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.dead && (!enemy.dying || enemy.deathAge < 0.34));
}

function updateUnits(dt) {
  for (const [key, unit] of state.board) {
    updateUnitAction(unit, dt);
    unit.attackTimer -= dt;
    if (unit.type === "char" || unit.type === "shovel") continue;
    if (unit.attackTimer > 0) continue;
    const pos = keyToCell(key);
    const target = findTarget(pos.r, pos.c, getUnitRange(unit));
    if (!target) continue;
    unit.attackTimer = getUnitCooldown(unit);
    fireAt(unit, pos, target);
  }
  for (const unit of state.camp) {
    if (unit) updateUnitAction(unit, dt);
  }
}

function updateProjectiles(dt) {
  for (const p of state.projectiles) {
    p.age += dt;
    const k = Math.min(1, p.age / p.life);
    p.x = lerp(p.sx, p.tx, easeOutCubic(k));
    p.y = lerp(p.sy, p.ty, easeOutCubic(k)) - Math.sin(k * Math.PI) * p.arc;
    if (k >= 1) hitEnemy(p);
  }
  state.projectiles = state.projectiles.filter((p) => p.age < p.life && !p.done);
}

function updateParticles(dt) {
  for (const item of [...state.particles, ...state.strokes, ...state.ghosts, ...state.absorbs, ...state.floats, ...state.pulses, ...state.shakes, ...state.recruits, ...state.messages]) {
    item.age += dt;
  }
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 90 * dt;
  }
  state.particles = state.particles.filter((p) => p.age < p.life);
  state.strokes = state.strokes.filter((s) => s.age < s.life);
  state.ghosts = state.ghosts.filter((g) => g.age < g.life);
  state.absorbs = state.absorbs.filter((a) => a.age < a.life);
  state.floats = state.floats.filter((f) => f.age < f.life);
  state.pulses = state.pulses.filter((p) => p.age < p.life);
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
  const from = cellCenter(cell.r, cell.c);
  const to = enemyPosition(enemy);
  const damage = Math.round(getUnitDamage(unit));
  const len = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  const dx = (to.x - from.x) / len;
  const dy = (to.y - from.y) / len;
  const kind = unit.type === "general" ? "gold" : weapons[unit.token]?.kind ?? "char";
  setUnitAction(unit, "attack", getAttackLife(unit, kind), dx, dy);
  strokeTrail(from.x, from.y, to.x, to.y, unit.type === "general" ? "#f4c84c" : "#17120f", unit.type === "general" ? 0.26 : 0.18, kind);
  if (weapons[unit.token]?.kind === "melee") {
    state.projectiles.push({ sx: from.x, sy: from.y, tx: to.x, ty: to.y, x: from.x, y: from.y, age: 0, life: 0.12, arc: 0, damage, target: enemy.id, kind: "slash", done: false });
  } else {
    state.projectiles.push({ sx: from.x, sy: from.y, tx: to.x, ty: to.y, x: from.x, y: from.y, age: 0, life: unit.type === "general" ? 0.18 : 0.24, arc: unit.type === "general" ? 16 : 10, damage, target: enemy.id, kind: unit.type === "general" ? "gold" : "arrow", done: false });
  }
}

function getAttackLife(unit, kind) {
  if (unit.type === "general") return 0.44;
  if (kind === "stab") return 0.8;
  if (kind === "arrow") return 0.8;
  if (kind === "dash") return 0.8;
  if (kind === "melee") return 0.8;
  return 0.4;
}

function hitEnemy(projectile) {
  const enemy = state.enemies.find((item) => item.id === projectile.target);
  projectile.done = true;
  if (!enemy || enemy.dying) return;
  enemy.hp -= projectile.damage;
  enemy.hitFlash = 0.1;
  enemy.hitAge = 0;
  const hitLen = Math.max(1, Math.hypot(projectile.tx - projectile.sx, projectile.ty - projectile.sy));
  enemy.hitDx = (projectile.tx - projectile.sx) / hitLen;
  enemy.hitDy = (projectile.ty - projectile.sy) / hitLen;
  const pos = enemyPosition(enemy);
  inkSplash(pos.x, pos.y, projectile.kind === "gold" ? "#f6cd55" : "#2d2019", projectile.kind === "gold" ? 14 : 10);
  floatText(`-${projectile.damage}`, pos.x, pos.y - 10, "#b92825", 15);
  if (enemy.hp <= 0) {
    enemy.dying = true;
    enemy.deathAge = 0;
    enemyDeathFx(pos.x, pos.y, enemy);
    dropBun(pos.x, pos.y);
  }
}

function dropBun(x, y) {
  state.buns += 3 + Math.floor(Math.random() * 3);
  state.floats.push({ type: "bun", sx: x, sy: y, tx: 76, ty: layout.safeTop + 23, x, y, age: 0, life: 0.52 });
  pulseAt(76, layout.safeTop + 23, "#f1dfc2", 24);
}

function findTarget(r, c, range) {
  let best = null;
  let bestDist = Infinity;
  const unitPos = cellCenter(r, c);
  for (const enemy of state.enemies) {
    const pos = enemyPosition(enemy);
    const dist = Math.hypot(pos.x - unitPos.x, pos.y - unitPos.y) / layout.cell;
    if (dist <= range && dist < bestDist) {
      best = enemy;
      bestDist = dist;
    }
  }
  return best;
}

function getUnitRange(unit) {
  if (unit.type === "general") return 3.25 + unit.level * 0.12;
  return weapons[unit.token]?.range ?? 1.2;
}

function getUnitCooldown(unit) {
  if (unit.type === "general") return Math.max(0.38, 0.7 - unit.level * 0.04);
  return Math.max(0.34, (weapons[unit.token]?.cooldown ?? 0.8) - unit.level * 0.035);
}

function getUnitDamage(unit) {
  if (unit.type === "general") return 28 + unit.level * 14;
  return (weapons[unit.token]?.damage ?? 10) * (1 + (unit.level - 1) * 0.55);
}

function enemyPosition(enemy) {
  const index = Math.min(pathCells.length - 2, Math.floor(enemy.t));
  const local = Math.min(1, enemy.t - index);
  const a = pathCells[index];
  const b = pathCells[index + 1];
  const ca = cellCenter(a[0], a[1]);
  const cb = cellCenter(b[0], b[1]);
  return {
    x: lerp(ca.x, cb.x, local),
    y: lerp(ca.y, cb.y, local)
  };
}

function currentPathSegment(enemy) {
  const index = Math.min(pathCells.length - 2, Math.floor(enemy.t));
  const a = pathCells[index];
  const b = pathCells[index + 1];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const len = Math.max(1, Math.hypot(dx, dy));
  return { dir: { x: dx / len, y: dy / len } };
}

function draw(time) {
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
  drawEnemies(time);
  drawUnits(time);
  drawAbsorbEvents(time);
  drawProjectiles();
  drawEffects();
  drawCamp(time);
  drawDrag(time);
  ctx.restore();
  drawMessages();
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
  drawCalligraphy("斗", layout.w / 2 - 10 + Math.sin(time * 5) * 3, layout.h * 0.49, 82, "#111");
  drawWeaponIcon(layout.w / 2 - 3, layout.h * 0.53, 48, "qiang", time);

  drawButton(layout.start, "开始游戏", "#b85845", "#69312b", true);
  drawCrossedSwords(layout.w / 2, layout.start.y - 14, 42);
  drawSmallPanel(18, layout.h - 82, 48, 52, "排行榜");
  drawBag(layout.w - 58, layout.h - 68, 42);
  drawTopCurrency();
}

function drawTopBar() {
  drawPauseButton();
  drawTopCurrency();
  drawCentered("巨鹿", layout.w / 2, layout.safeTop + 19, 26, "#3b241d", "900");
  drawCentered(`第${state.wave}波`, layout.w / 2, layout.safeTop + 45, 22, "#14110f", "900");
  drawDouLife(layout.w - 78, layout.safeTop + 24);
}

function drawTopCurrency() {
  drawBun(78, layout.safeTop + 24, 17);
  ctx.fillStyle = "#2a211d";
  roundRect(92, layout.safeTop + 9, 78, 30, 15, true, false);
  drawText(`${Math.round(state.displayedBuns)}`, 126, layout.safeTop + 31, 20, "#f6eee3", "900", "center");
}

function drawDouLife(x, y) {
  drawCalligraphy("斗", x, y + 16, 38, "#18110e");
  for (let i = 0; i < 6; i++) {
    drawHeart(x + 34 + (i % 3) * 13, y + Math.floor(i / 3) * 15, i < state.douHp ? "#d83435" : "#6b5d57");
  }
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
      if (pathKeySet.has(key)) ctx.fillStyle = "#c6b2a4";
      else if (blockedSet.has(key)) ctx.fillStyle = "#5e6761";
      else if (state.cultivated.has(key)) ctx.fillStyle = "#f5f1e9";
      else ctx.fillStyle = "#9bc5b4";
      ctx.fillRect(x, y, layout.cell, layout.cell);
      ctx.strokeStyle = "#34312e";
      ctx.lineWidth = 1.15;
      ctx.strokeRect(x + 0.5, y + 0.5, layout.cell - 1, layout.cell - 1);
      if (!pathKeySet.has(key) && !blockedSet.has(key) && !state.cultivated.has(key)) {
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

function drawRouteStones(time) {
  ctx.strokeStyle = "rgba(79,63,55,0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < pathCells.length; i++) {
    const [r, c] = pathCells[i];
    const x = c * layout.cell + layout.cell / 2;
    const y = r * layout.cell + layout.cell / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const a = 0.42 + Math.sin(time * 4) * 0.08;
  ctx.fillStyle = `rgba(115,70,51,${a})`;
  for (let i = 0; i < pathCells.length; i += 2) {
    const [r, c] = pathCells[i];
    circle(c * layout.cell + layout.cell / 2, r * layout.cell + layout.cell / 2, 2.2, true, false);
  }
}

function drawMapSideLabels() {
  const y = layout.boardY + layout.cell * 6.2;
  drawCalligraphy("斗", layout.boardX - 14, y, 38, "#18110e");
  drawCalligraphy("斗", layout.boardX + layout.boardW + 16, y, 38, "#18110e");
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
    ctx.scale(pose.scaleX, pose.scaleY);
    ctx.globalAlpha = pose.alpha;
    const ink = enemy.hitFlash > 0 ? "#fff" : asset.ink;
    drawGlyphLayer(enemy.glyph, 0, 9, layout.cell * asset.fontScale, ink, {
      scaleX: pose.glyphScaleX,
      scaleY: pose.glyphScaleY,
      skewX: pose.glyphSkewX,
      rotate: pose.glyphRotate,
      jitter: enemy.hitFlash > 0 ? 0.65 : 0.22,
      stroke: "rgba(255,242,218,0.4)"
    });
    drawEnemyFeet((enemy.t * Math.PI * 2.2) + enemy.wobble, layout.cell * 0.35);
    if (!enemy.dying) {
      ctx.fillStyle = "#d93632";
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      roundRect(-layout.cell * 0.34, -layout.cell * 0.44, layout.cell * 0.68 * hpRatio, 4, 2, true, false);
    }
    ctx.restore();
  }
}

function drawUnits(time) {
  for (const [key, unit] of state.board) {
    if (state.drag?.source?.kind === "board" && state.drag.source.key === key) continue;
    const { r, c } = keyToCell(key);
    const rect = cellRect(r, c);
    drawUnitCard(unit, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.9, time, false);
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.save();
    if (p.kind === "slash") {
      ctx.strokeStyle = "#fff9e6";
      ctx.lineWidth = 4;
      line(p.x - 9, p.y + 9, p.x + 10, p.y - 10, "#fff9e6", 4);
      line(p.x - 8, p.y + 8, p.x + 8, p.y - 8, "#222", 1.4);
    } else {
      ctx.strokeStyle = p.kind === "gold" ? "#f8c73a" : "#1c1815";
      ctx.lineWidth = p.kind === "gold" ? 5 : 3;
      line(p.x - 12, p.y + 2, p.x + 12, p.y - 2, ctx.strokeStyle, ctx.lineWidth);
      circle(p.x + 12, p.y - 2, p.kind === "gold" ? 4 : 2, true, false);
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
  drawButton(layout.recruit, "征兵", state.buns >= RECRUIT_COST ? "#bf6d52" : "#6e625d", "#4a2c26", false);
  drawBun(layout.recruit.x + layout.recruit.w / 2 - 15, layout.recruit.y + layout.recruit.h - 13, 9);
  drawText(String(RECRUIT_COST), layout.recruit.x + layout.recruit.w / 2 + 8, layout.recruit.y + layout.recruit.h - 8, 14, "#fff7ea", "900", "left");
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
    circle(p.x, p.y, p.r * (0.55 + k * 1.25), false, true);
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
  const k = Math.min(1, (performance.now() - unit.placedAt) / 260);
  const appear = dragging ? 1 : 0.65 + easeOutBack(k) * 0.35;
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
    drawAttachment(asset, glyphCx, cy + pose.y, s, time, pose, "under");
    const usedSpriteGlyph = unit.type === "weapon" && hasWeaponGlyphSprite(unit.token) && drawWeaponGlyphSprite(ctx, unit.token, cx, cy, s, {
      action: unit.action,
      actionProgress,
      actionAge: unit.actionAge,
      asleep,
      dragging
    });
    if (!usedSpriteGlyph) {
      drawGlyphLayer(glyph, glyphCx, glyphCy, s * asset.fontScale, asleep ? "#857a70" : asset.ink, glyphPose);
      if (unit.action === "attack") drawCardAttackOverlay(glyph, cx, cy, s, actionProgress, weapons[unit.token]?.kind ?? asset.role);
    }
    drawAttachment(asset, glyphCx, cy + pose.y, s, time, pose, "over");
    if (asleep) drawCentered("休", cx, cy - s * 0.22, s * 0.2, "#a8823d", "900");
  }
  if (unit.type !== "shovel") {
    drawText(String(unit.level), x + s - 9, y + 15, Math.max(11, s * 0.22), "#10100f", "900", "center");
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
  const p = eventPoint(event);
  if (state.mode === "menu") {
    if (hitRect(p, layout.start)) startGame();
    return;
  }
  if (state.mode === "end") {
    if (hitRect(p, { x: layout.w / 2 - 92, y: layout.h * 0.28 + 176, w: 184, h: 54 })) startGame();
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
    }
  }
  if (state.drag && canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
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
  if (unit.type === "shovel") return !pathKeySet.has(key) && !blockedSet.has(key) && !state.cultivated.has(key);
  return state.cultivated.has(key) && !pathKeySet.has(key) && !blockedSet.has(key);
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
  if (existing && canMerge(existing, unit)) {
    absorbFx(existing, unit, cellCenter(r, c), state.drag ? { x: state.drag.x, y: state.drag.y } : cellCenter(r, c));
    state.board.set(key, mergedUnit(existing, unit));
    mergeFx(cellCenter(r, c));
    scanGeneralPairs();
    return true;
  }
  state.board.set(key, unit);
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
  else state.board.set(source.key, unit);
}

function canMerge(a, b) {
  return a.type === "weapon" && b.type === "weapon" && a.token === b.token && a.level === b.level && a.level < 9;
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
      setUnitAction(general, "merge", 0.56, 0, -1);
      absorbFx(a, b, cellCenter(r, c), cellCenter(r, c + 1));
      state.board.set(aKey, general);
      state.board.delete(bKey);
      mergeFx(cellCenter(r, c));
      floatText(pair.general, cellCenter(r, c).x, cellCenter(r, c).y - layout.cell * 0.45, "#d19622", 22);
      toast(`${pair.general}上阵`, "#f3c037");
      return;
    }
  }
}

function recruit() {
  if (state.buns < RECRUIT_COST) {
    toast("馒头不足", "#d84335");
    shake(0.09, 2);
    return;
  }
  state.buns -= RECRUIT_COST;
  for (let i = 0; i < CAMP_SIZE; i++) {
    const token = recruitPool[Math.floor(Math.random() * recruitPool.length)];
    state.camp[i] = makeUnit(token, Math.random() < 0.12 && token !== "shovel" ? 2 : 1);
    state.recruits.push({ i, age: -i * 0.06, life: 0.28 + i * 0.06 });
  }
  scanGeneralPairs();
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
  state.buns += 1;
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
  state.ghosts.push({
    glyph: enemy.glyph,
    x,
    y,
    vx: -enemy.hitDx * 16 + rand(-8, 8),
    vy: -enemy.hitDy * 16 - 12,
    rotate: rand(-0.12, 0.12),
    size: layout.cell * getHanziAsset(enemy.glyph).fontScale,
    age: 0,
    life: 0.34
  });
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
