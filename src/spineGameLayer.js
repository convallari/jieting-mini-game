export const GENERAL_CONFIG = {
  "赵云": { asset: "zhaoYun", idle: ["zhan1", "zhan2"], attack: ["attack1", "attack2"], attackDuration: 1.3333, scale: 0.58 },
  "张飞": { asset: "zhangFei", idle: ["zhan1", "zhan2"], attack: ["attack1", "attack2"], attackDuration: 0.6667, scale: 0.58 },
  "马超": { asset: "maChao", idle: ["zhan1", "zhan2"], attack: ["attack1", "attack2"], attackDuration: 0.6667, scale: 0.58 }
};

export const ENEMY_CONFIG = {
  thief: { asset: "thief", scale: 0.56, walk: ["animation", "animation2"], hit: ["animation3"], death: "die" },
  boss0: { asset: "boss0", scale: 0.64, walk: ["gobao", "gojiao", "goliang"], hit: ["attackbao", "attackjiao", "attackliang"] },
  boss1: { asset: "boss1", scale: 0.64, walk: ["godiao", "goxiang", "gozhen"], hit: ["attackdiao", "attackxiang", "attackzhen"] },
  boss2: { asset: "boss2", scale: 0.64, walk: ["gocao", "godian", "goxia"], hit: ["attackcao", "attackdian", "attackdun"] },
  zhangLiang: { asset: "boss0", scale: 0.64, walk: ["goliang"], hit: ["attackliang"] },
  zhangBao: { asset: "boss0", scale: 0.64, walk: ["gobao"], hit: ["attackbao"] },
  zhangJiao: { asset: "boss0", scale: 0.64, walk: ["gojiao"], hit: ["attackjiao"] },
  sunShangXiang: { asset: "boss1", scale: 0.64, walk: ["goxiang"], hit: ["attackxiang"] },
  zhenFu: { asset: "boss1", scale: 0.64, walk: ["gozhen"], hit: ["attackzhen"] },
  diaoChan: { asset: "boss1", scale: 0.64, walk: ["godiao"], hit: ["attackdiao"] },
  huaXiong: { asset: "huaXiong", scale: 0.64, walk: ["gohx"], hit: ["attackhx"] },
  lvBu: { asset: "lvBu", scale: 0.64, walk: ["golvbu"], hit: ["attacklvbu"] },
  dongZhuo: { asset: "dongZhuo", scale: 0.64, walk: ["godz"], hit: ["attackdz"], recovery: "attack2dz" },
  dianWei: { asset: "boss2", scale: 0.64, walk: ["godian2"], hit: ["attackdian"], chargeWalk: "godian2" },
  xiaHouDun: { asset: "boss2", scale: 0.64, walk: ["goxia"], hit: ["attackdun"] },
  caoCao: { asset: "boss2", scale: 0.64, walk: ["gocao"], hit: ["attackcao"] }
};

const instances = new Map();
const enemyInstances = new Map();
let initialized = false;
let initPromise;
let stageWidth = 0;
let stageHeight = 0;
const aDouInstances = new Map();

export function hasOriginalGeneralAnimation(token) {
  return Boolean(GENERAL_CONFIG[token]);
}

export function isSpineGameLayerReady() {
  return initialized;
}

export function isOriginalGeneralReady(id) {
  const instance = instances.get(id);
  return Boolean(instance?.leftReady && instance?.rightReady);
}

export function removeGeneralAnimation(id) {
  const instance = instances.get(id);
  if (!instance) return;
  instance.left.visible = false;
  instance.right.visible = false;
  instance.left.destroy(true);
  instance.right.destroy(true);
  instances.delete(id);
}

export function isOriginalEnemyReady(id) {
  return Boolean(enemyInstances.get(id)?.ready);
}

export function isADouAnimationReady() {
  return [...aDouInstances.values()].some((instance) => instance.ready);
}

export function initSpineGameLayer(width, height) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      if (!window.Laya?.SpineSkeleton) return false;
      Laya.Config.isAlpha = true;
      Laya.Config.premultipliedAlpha = true;
      await Laya.init(width, height, Laya.WebGL);
      Laya.stage.bgColor = null;
      Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL;
      Laya.stage.screenMode = Laya.Stage.SCREEN_NONE;
      const source = Laya.Browser?.mainCanvas?.source;
      if (!source) return false;
      source.id = "spine-game-layer";
      document.querySelector(".app-shell").appendChild(source);
      resizeSpineGameLayer(width, height);
      initialized = true;
      return true;
    } catch (error) {
      console.warn("Original Spine layer unavailable; using canvas fallback.", error);
      return false;
    }
  })();
  return initPromise;
}

export function resizeSpineGameLayer(width, height) {
  stageWidth = width;
  stageHeight = height;
  if (!initialized) return;
  Laya.stage.size(width, height);
  const canvas = document.querySelector("#spine-game-layer");
  const game = document.querySelector("#game");
  if (canvas && game) {
    canvas.style.width = `${game.clientWidth}px`;
    canvas.style.height = `${game.clientHeight}px`;
    canvas.style.left = `${game.offsetLeft}px`;
    canvas.style.top = `${game.offsetTop}px`;
  }
}

export function syncGeneralAnimations(generals, cellSize) {
  if (!initialized) return;
  const present = new Set();
  for (const item of generals) {
    const config = GENERAL_CONFIG[item.token];
    if (!config) continue;
    present.add(item.id);
    let instance = instances.get(item.id);
    if (!instance) instance = createGeneralInstance(item, config);
    instance.lastSeen = performance.now();
    const ready = instance.leftReady && instance.rightReady;
    instance.left.visible = ready;
    instance.right.visible = ready;
    instance.left.pos(item.x - cellSize * 0.48, item.y);
    instance.right.pos(item.x + cellSize * 0.48, item.y);
    const scale = (cellSize / 48) * config.scale;
    instance.left.scale(scale, scale);
    instance.right.scale(scale, scale);
    const skin = item.level === 4 ? "2" : item.level >= 5 ? "3" : "1";
    if (ready && instance.skin !== skin) {
      instance.skin = skin;
      instance.left.showSkinByName(skin);
      instance.right.showSkinByName(skin);
      instance.stateKey = "";
    }
    const attacking = item.action === "attack";
    const stateKey = attacking ? `attack:${item.attackSerial ?? 0}` : "idle";
    if (ready && stateKey && instance.stateKey !== stateKey) {
      instance.stateKey = stateKey;
      const rate = attacking ? config.attackDuration / Math.max(0.1, item.actionLife) : 1;
      instance.left.playbackRate(rate);
      instance.right.playbackRate(rate);
      instance.left.play(attacking ? config.attack[0] : config.idle[0], !attacking);
      instance.right.play(attacking ? config.attack[1] : config.idle[1], !attacking);
    }
  }
  for (const [id, instance] of instances) {
    if (!present.has(id)) {
      instance.left.visible = false;
      instance.right.visible = false;
    }
    if (!present.has(id) && performance.now() - instance.lastSeen > 1600) {
      instance.left.destroy(true);
      instance.right.destroy(true);
      instances.delete(id);
    }
  }
}

export function syncEnemyAnimations(enemies, cellSize) {
  if (!initialized) return;
  const present = new Set();
  for (const item of enemies) {
    const config = ENEMY_CONFIG[item.spineType] ?? ENEMY_CONFIG.thief;
    present.add(item.id);
    let instance = enemyInstances.get(item.id);
    if (!instance) instance = createEnemyInstance(item, config);
    instance.lastSeen = performance.now();
    instance.active = true;
    instance.skeleton.visible = instance.ready;
    instance.skeleton.pos(item.x, item.y);
    const deathProgress = item.dying ? Math.min(1, item.deathAge / (item.deathLife ?? 0.7)) : 0;
    const scale = (cellSize / 48) * config.scale * (item.devourScale ?? 1) * (item.inspireLeft > 0 ? 1.2 : 1) * (1 - deathProgress * 0.16);
    instance.skeleton.scale(scale, scale);
    instance.skeleton.alpha = item.dying && !config.death ? 1 - deathProgress : 1;
    const variant = Math.abs(item.variant) % config.walk.length;
    const animation = item.dying
      ? (config.death ?? config.hit[variant % config.hit.length])
      : item.bossRecoveryLeft > 0 && config.recovery
        ? config.recovery
      : item.bossChargePhase === "approach" && config.chargeWalk
        ? config.chargeWalk
      : item.bossCastingLeft > 0 || item.hitAge < 0.18
        ? config.hit[variant % config.hit.length]
        : config.walk[variant];
    const stateKey = item.bossCastingLeft > 0
      ? `${animation}:cast:${item.bossCastSerial ?? 0}`
      : item.bossRecoveryLeft > 0
        ? `${animation}:recovery:${item.bossCastSerial ?? 0}`
        : animation;
    if (instance.ready && instance.stateKey !== stateKey) {
      instance.stateKey = stateKey;
      const looping = item.bossChargePhase === "approach" || (!item.dying && !(item.bossCastingLeft > 0) && !(item.bossRecoveryLeft > 0) && item.hitAge >= 0.18);
      instance.skeleton.play(animation, looping);
    }
  }
  for (const [id, instance] of enemyInstances) {
    if (!present.has(id)) instance.skeleton.visible = false;
    if (!present.has(id) && performance.now() - instance.lastSeen > 800) {
      instance.skeleton.destroy(true);
      enemyInstances.delete(id);
    }
  }
}

export function syncADouAnimation(item) {
  syncADouAnimations([item]);
}

export function syncADouAnimations(items) {
  if (!initialized) return;
  const present = new Set();
  for (const item of items) {
    const key = item.key ?? "main";
    present.add(key);
    let instance = aDouInstances.get(key);
    if (!instance) instance = createADouInstance(key, item.hp);
    if (item.hp < instance.previousHp) instance.hitUntil = performance.now() + 620;
    instance.previousHp = item.hp;
    const animation = performance.now() < instance.hitUntil ? "tu" : item.mode === "menu" ? "dou" : "zhan";
    const stateKey = `${item.mode}:${animation}`;
    const skeleton = instance.skeleton;
    skeleton.pos(item.x, item.y);
    const scale = (item.size / 48) * 0.48;
    skeleton.scale(item.mirror ? -scale : scale, scale);
    skeleton.visible = instance.ready;
    if (instance.ready && instance.stateKey !== stateKey) {
      instance.stateKey = stateKey;
      skeleton.play(animation, animation !== "tu");
    }
  }
  for (const [key, instance] of aDouInstances) {
    if (!present.has(key)) instance.skeleton.visible = false;
  }
}

function createGeneralInstance(item, config) {
  const left = new Laya.SpineSkeleton();
  const right = new Laya.SpineSkeleton();
  left.visible = false;
  right.visible = false;
  Laya.stage.addChild(left);
  Laya.stage.addChild(right);
  const instance = { left, right, leftReady: false, rightReady: false, skin: "", stateKey: "", lastSeen: performance.now() };
  instances.set(item.id, instance);
  left.once(Laya.Event.READY, null, () => {
    instance.leftReady = true;
  });
  right.once(Laya.Event.READY, null, () => {
    instance.rightReady = true;
  });
  const source = `/spine-assets/${config.asset}/skeleton.json?v=4`;
  left.source = source;
  right.source = source;
  return instance;
}

function createEnemyInstance(item, config) {
  const skeleton = new Laya.SpineSkeleton();
  skeleton.visible = false;
  Laya.stage.addChild(skeleton);
  const instance = { skeleton, ready: false, active: true, stateKey: "", lastSeen: performance.now() };
  enemyInstances.set(item.id, instance);
  skeleton.once(Laya.Event.READY, null, () => {
    instance.ready = true;
    skeleton.visible = instance.active;
  });
  skeleton.source = `/spine-assets/${config.asset}/skeleton.json?v=3`;
  return instance;
}

function createADouInstance(key, hp) {
  const skeleton = new Laya.SpineSkeleton();
  skeleton.visible = false;
  Laya.stage.addChild(skeleton);
  const instance = { skeleton, ready: false, stateKey: "", previousHp: hp, hitUntil: 0 };
  aDouInstances.set(key, instance);
  skeleton.once(Laya.Event.READY, null, () => {
    instance.ready = true;
    skeleton.visible = true;
  });
  skeleton.source = "/spine-assets/aDou/skeleton.json?v=3";
  return instance;
}
