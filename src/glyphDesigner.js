import { FORMATION_RECIPES, GLYPH_ACTORS, LEGACY_ACTOR_ALIASES, SOURCE_DISPLAY_POLICY, SOURCE_STRUCTURES, STATE_PROFILES, stateMatrixForActor } from "./actorAssetSchema.js";

const BASE_URL = import.meta.env?.BASE_URL || "/";

const LEGACY_KEYS = { 马: "ma", 谡: "su", 王: "wang", 平: "ping", 诸: "zhu", 葛: "ge", 亮: "liang", 赵: "zhao", 云: "yun", 张: "zhang", 飞: "fei", 超: "chao", 黄: "huang", 忠: "zhong" };
const EXTRA_ACTORS = [
  ["郃", "glyph.he"], ["司", "glyph.si"], ["懿", "glyph.yi"], ["魏", "glyph.wei"], ["军", "glyph.jun"],
  ["先", "glyph.xian"], ["锋", "glyph.feng"], ["蜀", "glyph.shu"], ["营", "glyph.ying"],
  ["山", "glyph.shan"], ["水", "glyph.shui"], ["刀", "unit.dao"], ["枪", "unit.qiang"],
  ["弓", "unit.gong"], ["骑", "unit.qi"], ["铲", "prop.chan"], ["农", "unit.nong"]
].map(([glyph, id]) => [glyph, id, id.startsWith("unit.") ? "unit" : id.startsWith("prop.") ? "prop" : "generalGlyph", [glyph]]);
const GLYPHS = [
  ...Object.entries(GLYPH_ACTORS).map(([glyph, actor]) => [glyph, actor.id, "generalGlyph", [glyph]]),
  ...EXTRA_ACTORS.filter(([, , type]) => type === "generalGlyph"),
  ...FORMATION_RECIPES.map((recipe) => [recipe.displayName, recipe.id, "generalFormation", recipe.members]),
  ...EXTRA_ACTORS.filter(([, , type]) => type !== "generalGlyph")
];

const LAYERS = [
  { id: "ink", label: "主墨", role: "body", color: "#17120f", animation: "breath, squash, attack-offset" },
  { id: "accent", label: "装饰", role: "ornament", color: "#a83227", animation: "light lag, subtle parallax" },
  { id: "shadow", label: "飞白/影", role: "shadow", color: "#6b5a4b", animation: "low alpha smear" },
  { id: "fx", label: "光效", role: "effect", color: "#d7aa3a", animation: "pulse, additive glow" }
];

const COLOR_SWATCHES = [
  ["玄墨", "#17120f"], ["蜀红", "#a83227"], ["魏蓝", "#294b70"], ["山青", "#486b3e"],
  ["水青", "#3c8192"], ["军金", "#d7aa3a"], ["烟灰", "#756b61"], ["亮白", "#fff4d8"]
];

const COLOR_PALETTE_GROUPS = [
  ["墨与纸", ["#0d0b0a", "#17120f", "#2d2621", "#554b43", "#756b61", "#b9aa96", "#e8dcc5", "#fff4d8"]],
  ["蜀军红", ["#541b18", "#7b2420", "#a83227", "#c94736", "#e66b4f", "#f09978", "#f6b9a0"]],
  ["魏军蓝", ["#182b40", "#294b70", "#35658a", "#477fa0", "#6fa0b5", "#a6c4cc"]],
  ["山林青", ["#20351f", "#365331", "#486b3e", "#668a54", "#88a66c", "#b0c38c"]],
  ["水与玉", ["#194653", "#276775", "#3c8192", "#58a2aa", "#81bec0", "#b6d9d2"]],
  ["军金火焰", ["#6f4219", "#9b6825", "#d7aa3a", "#f0cf57", "#fff08a", "#8f2519", "#d64327", "#f27a32"]],
  ["奇术紫", ["#3c274b", "#65406f", "#86598d", "#ae7cac", "#d0a6ca"]]
];

const STAMP_DEFINITIONS = [
  { id: "flag", icon: "⚑", label: "军旗", layer: "accent", color: "#a83227" },
  { id: "shield", icon: "盾", label: "盾纹", layer: "accent", color: "#486b3e" },
  { id: "slash", icon: "╱", label: "刀光", layer: "fx", color: "#d7aa3a" },
  { id: "spear", icon: "↗", label: "枪芒", layer: "fx", color: "#fff4d8" },
  { id: "arrow", icon: "➤", label: "箭矢", layer: "fx", color: "#17120f" },
  { id: "ring", icon: "◎", label: "阵环", layer: "fx", color: "#d7aa3a" },
  { id: "inkBurst", icon: "✹", label: "墨爆", layer: "fx", color: "#17120f" },
  { id: "smoke", icon: "☁", label: "烟尘", layer: "shadow", color: "#756b61" },
  { id: "water", icon: "≋", label: "水纹", layer: "fx", color: "#3c8192" },
  { id: "spark", icon: "✦", label: "火星", layer: "fx", color: "#d7aa3a" }
];

const PREMIUM_ASSETS = [
  { id: "knifeHit", label: "刀击", src: `${BASE_URL}original-effects/knife-hit-sheet.png`, layer: "fx", frame: [0, 0, 96, 96] },
  { id: "pikeHit", label: "枪击", src: `${BASE_URL}original-effects/pike-hit-sheet.png`, layer: "fx", frame: [0, 0, 96, 96] },
  { id: "bowHit", label: "箭爆", src: `${BASE_URL}original-effects/bow-hit-sheet.png`, layer: "fx", frame: [96, 0, 96, 96] },
  { id: "cavalryHit", label: "骑尘", src: `${BASE_URL}original-effects/cavalry-hit-sheet.png`, layer: "fx", frame: [96, 0, 96, 96] },
  { id: "fire", label: "火焰", src: `${BASE_URL}original-props/fire2.png`, layer: "fx" },
  { id: "meteor", label: "流星", src: `${BASE_URL}original-props/meteor_1.png`, layer: "fx" },
  { id: "ink", label: "墨爆", src: `${BASE_URL}original-props/ink.png`, layer: "fx" },
  { id: "star", label: "星芒", src: `${BASE_URL}original-props/star.png`, layer: "fx" },
  { id: "guide", label: "引导光", src: `${BASE_URL}original-props/leadLight1.png`, layer: "fx" },
  { id: "footprint", label: "脚印", src: `${BASE_URL}original-props/footprint.png`, layer: "shadow" }
];

const ANIMATION_REQUIREMENTS = {
  generalGlyph: { required: ["neutral"], optional: ["idle", "drag", "drop", "link", "unlink"] },
  generalFormation: { required: ["neutral", "form", "idle", "attack", "hit", "death", "skill", "break"], optional: [] },
  unit: { required: ["neutral", "idle", "attack", "hit", "death"], optional: ["drag", "drop", "merge", "sleep"] },
  enemy: { required: ["neutral", "move", "attack", "hit", "death"], optional: ["cast"] },
  terrain: { required: ["neutral"], optional: ["idle", "activate", "damaged", "destroy"] },
  prop: { required: ["neutral", "place", "trigger", "expire"], optional: ["armed"] },
  effect: { required: ["play"], optional: [] }
};

const STORAGE_PREFIX = "jieting.glyphDesigner.v2.";
const canvasZone = document.getElementById("canvasZone");
const referenceCanvas = document.getElementById("referenceCanvas");
const referenceCtx = referenceCanvas.getContext("2d");
const glyphList = document.getElementById("glyphList");
const layerList = document.getElementById("layerList");
const currentGlyph = document.getElementById("currentGlyph");
const currentName = document.getElementById("currentName");
const selectTool = document.getElementById("selectTool");
const marqueeTool = document.getElementById("marqueeTool");
const brushTool = document.getElementById("brushTool");
const lineTool = document.getElementById("lineTool");
const eraserTool = document.getElementById("eraserTool");
const deleteObject = document.getElementById("deleteObject");
const undoButton = document.getElementById("undoButton");
const clearButton = document.getElementById("clearButton");
const brushSize = document.getElementById("brushSize");
const inkColor = document.getElementById("inkColor");
const colorSwatches = document.getElementById("colorSwatches");
const colorPalette = document.getElementById("colorPalette");
const paletteGroups = document.getElementById("paletteGroups");
const paletteCustomColor = document.getElementById("paletteCustomColor");
const paletteHex = document.getElementById("paletteHex");
const applyPaletteHex = document.getElementById("applyPaletteHex");
const recentColors = document.getElementById("recentColors");
const stampPalette = document.getElementById("stampPalette");
const premiumAssetPalette = document.getElementById("premiumAssetPalette");
const stampSize = document.getElementById("stampSize");
const stampRotation = document.getElementById("stampRotation");
const selectedObjectLabel = document.getElementById("selectedObjectLabel");
const objectScale = document.getElementById("objectScale");
const objectRotation = document.getElementById("objectRotation");
const objectOpacity = document.getElementById("objectOpacity");
const referenceInput = document.getElementById("referenceInput");
const toggleReference = document.getElementById("toggleReference");
const saveGlyph = document.getElementById("saveGlyph");
const exportPng = document.getElementById("exportPng");
const exportPack = document.getElementById("exportPack");
const saveProjectPack = document.getElementById("saveProjectPack");
const manifestPreview = document.getElementById("manifestPreview");
const previewLarge = document.getElementById("previewLarge");
const previewSmall = document.getElementById("previewSmall");
const animationMode = document.getElementById("animationMode");
const formationPreview = document.getElementById("formationPreview");
const stateMatrix = document.getElementById("stateMatrix");
const productionGuide = document.getElementById("productionGuide");
const assetGrid = document.getElementById("assetGrid");
const assetFilters = document.getElementById("assetFilters");
const assetSearch = document.getElementById("assetSearch");
const assetCount = document.getElementById("assetCount");
const comparePlay = document.getElementById("comparePlay");
const animationPlay = document.getElementById("animationPlay");
const clipSelect = document.getElementById("clipSelect");
const timelineFps = document.getElementById("timelineFps");
const timelineDuration = document.getElementById("timelineDuration");
const frameReadout = document.getElementById("frameReadout");
const addKeyframe = document.getElementById("addKeyframe");
const deleteKeyframe = document.getElementById("deleteKeyframe");
const timelineScrubber = document.getElementById("timelineScrubber");
const trackList = document.getElementById("trackList");
const transformX = document.getElementById("transformX");
const transformY = document.getElementById("transformY");
const transformScale = document.getElementById("transformScale");
const transformRotation = document.getElementById("transformRotation");
const transformOpacity = document.getElementById("transformOpacity");
const timelineEase = document.getElementById("timelineEase");
const sourceSpinePreview = document.getElementById("sourceSpinePreview");
const sourceSpinePreviewB = document.getElementById("sourceSpinePreviewB");

const ASSET_GROUPS = {
  all: "全部", glyph: "字形动画", effect: "命中特效", spine: "角色 Spine", prop: "道具/单位", drawn: "我的分层稿"
};

const ASSETS = [
  ...[
    ["刀·攻击", "dao", 19, 120, 129], ["枪·攻击", "qiang", 21, 80, 80],
    ["弓·攻击", "gong", 30, 74, 95], ["骑·攻击", "qi", 19, 263, 294]
  ].map(([name, key, frames, frameWidth, frameHeight]) => ({ id: `glyph-${key}`, actorId: `unit.${key}`, name, type: "glyph", path: `${BASE_URL}original-glyphs/${key}-attack-sheet.png`, frames, frameWidth, frameHeight, sourceStructure: SOURCE_STRUCTURES[`unit.${key}`] ?? { kind: "bakedComposite", editableParts: false }, tags: `${name} 兵种 序列帧 原版` })),
  ...[
    ["刀·命中", "knife", 1], ["枪·命中", "pike", 1], ["弓·命中", "bow", 3], ["骑·命中", "cavalry", 2]
  ].map(([name, key, frames]) => ({ id: `effect-${key}`, name, type: "effect", path: `${BASE_URL}original-effects/${key}-hit-sheet.png`, frames, frameWidth: 96, frameHeight: 96, tags: `${name} 特效 命中 序列帧` })),
  ...[
    ["赵云", "zhaoYun", ["attack1", "attack2", "attack4", "shouye", "zhan1", "zhan2"]],
    ["阿斗", "aDou", ["attack", "dakai", "dou", "hejiu", "pao", "tu", "zhan", "zhan2"]],
    ["马超", "maChao", ["attack1", "attack2", "zhan1", "zhan2"]],
    ["张飞", "zhangFei", ["attack1", "attack2", "zhan1", "zhan2"]],
    ["吕布", "lvBu", ["golvbu", "attacklvbu"]], ["董卓", "dongZhuo", ["godz", "attackdz", "attack2dz"]],
    ["华雄", "huaXiong", ["gohx", "attackhx"]], ["舞姬", "dancer", ["animation"]],
    ["盗贼", "thief", ["animation", "animation2", "animation3", "die"]],
    ["旧 Boss 0", "boss0", ["attackbao", "attackjiao", "attackliang", "gobao", "gojiao", "goliang"]],
    ["旧 Boss 1", "boss1", ["attackdiao", "attackxiang", "attackzhen", "godiao", "goxiang", "gozhen"]],
    ["旧 Boss 2", "boss2", ["attackcao", "attackdian", "attackdun", "gocao", "godian", "goxia"]]
  ].map(([name, key, animations]) => {
    const actorId = LEGACY_ACTOR_ALIASES[key];
    return { id: `spine-${key}`, actorId, name, type: "spine", path: `${BASE_URL}spine-assets/${key}/skeleton.png`, frames: 1, animations, sourceStructure: SOURCE_STRUCTURES[actorId] ?? { kind: "spine", editableParts: true }, tags: `${name} 角色 骨骼 Spine 原版` };
  }),
  ...[
    ["拒马", "trap_1.png"], ["伏火", "landmine_1.png"], ["疑兵墨阵", "inkstone_1.png"],
    ["火焰 1", "fire0.png"], ["火焰 2", "fire1.png"], ["陨石", "meteor_1.png"],
    ["农兵", "farmer_1.png"], ["铲", "shovel_1.png"], ["墨点", "ink.png"], ["脚印", "footprint.png"]
  ].map(([name, file]) => ({ id: `prop-${file}`, name, type: "prop", path: `${BASE_URL}original-props/${file}`, frames: 1, tags: `${name} 道具 单位 原版` }))
];

const libraryState = { filter: "all", search: "", playing: true, frame: 0, last: 0, compare: [null, null] };
const timelineState = { frame: 0, playing: false, last: 0, clips: {} };
let sourceAsset = null;
const assetImages = new Map();

let selected = GLYPHS[0];
let activeLayerId = "ink";
let tool = "select";
let selectedStamp = STAMP_DEFINITIONS[0].id;
let selectedPremiumAsset = PREMIUM_ASSETS[0].id;
let drawing = false;
let last = null;
let undoStack = [];
const layerCanvases = new Map();
const objectImages = new Map();
let formationBaseCanvas;
let formationBaseCtx;
let objectCanvas;
let objectCtx;
let editableObjects = [];
let selectedObjectId = null;
let selectedObjectIds = new Set();
let objectInteraction = null;
let draftObject = null;
let marqueeSelection = null;

function init() {
  migrateLegacyLocalStorage();
  createLayerCanvases();
  initCreativeTray();
  renderGlyphList();
  renderLayerList();
  bindEvents();
  initAssetLibrary();
  selectGlyph(selected[1]);
  requestAnimationFrame(tickTimeline);
}

function initCreativeTray() {
  for (const [label, color] of COLOR_SWATCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-swatch";
    button.dataset.color = color;
    button.style.setProperty("--swatch", color);
    button.title = `${label} ${color}`;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", () => {
      applyPaintColor(color);
    });
    colorSwatches.appendChild(button);
  }
  initFullColorPalette();

  for (const stamp of STAMP_DEFINITIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stamp-button";
    button.dataset.stamp = stamp.id;
    button.textContent = stamp.icon;
    button.title = `${stamp.label} · 自动放入${LAYERS.find((layer) => layer.id === stamp.layer)?.label ?? stamp.layer}图层`;
    button.setAttribute("aria-label", stamp.label);
    button.addEventListener("click", () => {
      selectedStamp = stamp.id;
      selectLayer(stamp.layer);
      inkColor.value = stamp.color;
      setTool("stamp");
      updateCreativeSelection();
    });
    stampPalette.appendChild(button);
  }
  for (const asset of PREMIUM_ASSETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "premium-asset-button";
    button.dataset.asset = asset.id;
    button.innerHTML = `<img src="${asset.src}" alt="" />`;
    button.title = `${asset.label} · 点击后在画布放置，可选择变形`;
    button.setAttribute("aria-label", asset.label);
    button.addEventListener("click", () => {
      selectedPremiumAsset = asset.id;
      selectLayer(asset.layer);
      setTool("asset");
      updateCreativeSelection();
    });
    premiumAssetPalette.appendChild(button);
    preloadObjectImage(asset);
  }
  updateCreativeSelection();
}

function initFullColorPalette() {
  paletteGroups.innerHTML = "";
  for (const [label, colors] of COLOR_PALETTE_GROUPS) {
    const group = document.createElement("div");
    group.className = "palette-group";
    group.innerHTML = `<span>${label}</span><div class="palette-colors"></div>`;
    for (const color of colors) group.querySelector(".palette-colors").appendChild(createPaletteColorButton(color));
    paletteGroups.appendChild(group);
  }
  paletteCustomColor.addEventListener("input", () => {
    paletteHex.value = paletteCustomColor.value.toUpperCase();
    applyPaintColor(paletteCustomColor.value);
  });
  applyPaletteHex.addEventListener("click", applyHexColor);
  paletteHex.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyHexColor();
  });
  renderRecentColors();
}

function createPaletteColorButton(color) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "palette-color";
  button.style.setProperty("--palette-color", color);
  button.dataset.color = color;
  button.title = color.toUpperCase();
  button.setAttribute("aria-label", color.toUpperCase());
  button.addEventListener("click", () => applyPaintColor(color));
  return button;
}

function applyHexColor() {
  const value = paletteHex.value.trim();
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    paletteHex.setCustomValidity("请输入六位 HEX 颜色，例如 #A83227");
    paletteHex.reportValidity();
    return;
  }
  paletteHex.setCustomValidity("");
  applyPaintColor(value);
}

function applyPaintColor(color) {
  const normalized = color.toLowerCase();
  inkColor.value = normalized;
  paletteCustomColor.value = normalized;
  paletteHex.value = normalized.toUpperCase();
  const recolorable = editableObjects.filter((item) => selectedObjectIds.has(item.id) && (item.kind === "path" || item.kind === "stamp"));
  if (recolorable.length) {
    pushUndo();
    for (const object of recolorable) object.color = normalized;
    renderEditableObjects();
    updatePreview();
  } else if (tool === "select") {
    setTool("brush");
  }
  rememberRecentColor(normalized);
  updateCreativeSelection();
}

function rememberRecentColor(color) {
  const key = `${STORAGE_PREFIX}recentColors`;
  const recent = safeJson(localStorage.getItem(key)) ?? [];
  localStorage.setItem(key, JSON.stringify([color, ...recent.filter((item) => item !== color)].slice(0, 10)));
  renderRecentColors();
}

function renderRecentColors() {
  const colors = safeJson(localStorage.getItem(`${STORAGE_PREFIX}recentColors`)) ?? [];
  recentColors.replaceChildren(...colors.map(createPaletteColorButton));
}

function updateCreativeSelection() {
  for (const button of colorSwatches.children) {
    button.classList.toggle("active", button.dataset.color.toLowerCase() === inkColor.value.toLowerCase() && tool === "brush");
  }
  for (const button of stampPalette.children) {
    button.classList.toggle("active", button.dataset.stamp === selectedStamp && tool === "stamp");
  }
  for (const button of premiumAssetPalette.children) {
    button.classList.toggle("active", button.dataset.asset === selectedPremiumAsset && tool === "asset");
  }
  for (const button of [...paletteGroups.querySelectorAll(".palette-color"), ...recentColors.querySelectorAll(".palette-color")]) {
    button.classList.toggle("active", button.dataset.color.toLowerCase() === inkColor.value.toLowerCase());
  }
}

function initAssetLibrary() {
  for (const [key, label] of Object.entries(ASSET_GROUPS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.classList.toggle("active", key === libraryState.filter);
    button.addEventListener("click", () => {
      libraryState.filter = key;
      for (const item of assetFilters.children) item.classList.toggle("active", item === button);
      renderAssetLibrary();
    });
    assetFilters.appendChild(button);
  }
  assetSearch.addEventListener("input", () => {
    libraryState.search = assetSearch.value.trim().toLowerCase();
    renderAssetLibrary();
  });
  comparePlay.addEventListener("click", () => {
    libraryState.playing = !libraryState.playing;
    comparePlay.textContent = libraryState.playing ? "暂停" : "播放";
  });
  renderAssetLibrary();
  requestAnimationFrame(tickAssetComparison);
}

function allLibraryAssets() {
  const drawn = GLYPHS.filter(([, key]) => hasSavedGlyph(key)).map(([glyph, key]) => ({
    id: `drawn-${key}`, name: `${glyph}·我的稿`, type: "drawn", frames: 1,
    dataUrl: compositeSavedGlyph(key), tags: `${glyph} ${key} 手绘 分层 我的稿`
  }));
  return [...drawn, ...ASSETS];
}

function renderAssetLibrary() {
  const assets = allLibraryAssets().filter((asset) => {
    const typeMatch = libraryState.filter === "all" || asset.type === libraryState.filter;
    return typeMatch && (!libraryState.search || `${asset.name} ${asset.tags}`.toLowerCase().includes(libraryState.search));
  });
  assetCount.textContent = `${assets.length} 项 · 可拖入画布 · E 编辑，R 参考，A/B 对比`;
  assetGrid.innerHTML = "";
  for (const asset of assets) {
    const card = document.createElement("article");
    card.className = "asset-card";
    card.draggable = true;
    card.dataset.assetId = asset.id;
    card.title = "拖到上方画布即可加入为可编辑元素";
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-jieting-asset", asset.id);
      event.dataTransfer.setData("text/plain", asset.id);
    });
    const source = asset.dataUrl ?? asset.path;
    card.innerHTML = `
      <img class="asset-thumb" src="${source}" alt="${asset.name}" />
      <div class="asset-info">
        <div class="asset-name">${asset.name}</div>
        <div class="asset-meta">${ASSET_GROUPS[asset.type]} · ${asset.frames > 1 ? `${asset.frames} 帧` : "静态"} · 拖入画布</div>
        <div class="asset-actions">
          <button type="button" title="载入统一动画编辑器">E</button>
          <button type="button" title="设为画布参考">R</button>
          <button type="button" title="放入对比 A">A</button>
          <button type="button" title="放入对比 B">B</button>
        </div>
      </div>`;
    const [editButton, referenceButton, aButton, bButton] = card.querySelectorAll("button");
    editButton.addEventListener("click", () => editExistingAsset(asset));
    referenceButton.addEventListener("click", () => setAssetAsReference(asset));
    aButton.addEventListener("click", () => setCompareAsset(0, asset));
    bButton.addEventListener("click", () => setCompareAsset(1, asset));
    assetGrid.appendChild(card);
  }
}

function editExistingAsset(asset) {
  sourceAsset = asset;
  timelineState.playing = false;
  animationPlay.textContent = "▶";
  currentGlyph.textContent = asset.type === "glyph" ? asset.name[0] : "源";
  currentName.textContent = `${asset.name} · ${asset.sourceStructure?.kind ?? "source"} · source-first`;
  animationMode.value = asset.type === "spine" ? "general" : asset.type === "prop" ? "weapon" : "card";
  referenceCanvas.classList.add("source-edit");
  const stored = safeJson(localStorage.getItem(`${STORAGE_PREFIX}source.${asset.id}`));
  timelineState.clips = stored?.clips ?? {};
  const clip = activeClip();
  clip.fps = stored?.fps ?? 12;
  clip.duration = asset.frames > 1 ? asset.frames : clip.duration;
  clip.source = asset.type === "spine"
    ? { type: "spine", asset: asset.id.replace("spine-", ""), animation: sourceAnimationForClip(asset, clipSelect.value) }
    : { type: asset.frames > 1 ? "spritesheet" : "bitmap", path: asset.path, frames: asset.frames, frameWidth: asset.frameWidth, frameHeight: asset.frameHeight };
  loadSelectedClip();
  renderExternalSourceFrame();
}

function leaveSourceAssetMode() {
  sourceAsset = null;
  sourceSpinePreview.hidden = true;
  sourceSpinePreview.removeAttribute("src");
  sourceSpinePreview.classList.remove("paired-a");
  sourceSpinePreviewB.hidden = true;
  sourceSpinePreviewB.removeAttribute("src");
  sourceSpinePreviewB.classList.remove("paired-b");
  referenceCtx.clearRect(0, 0, 512, 512);
  referenceCanvas.classList.remove("source-edit");
}

function sourceAnimationForClip(asset, standardClip) {
  const names = asset.animations ?? [];
  const matchers = {
    idle: ["zhan", "go", "animation"], attack: ["attack"], hit: ["hit", "animation3", "tu"], death: ["die"], skill: ["attack2", "attack4", "dakai"]
  };
  return names.find((name) => (matchers[standardClip] ?? []).some((part) => name.toLowerCase().includes(part))) ?? names[0] ?? "animation";
}

function renderExternalSourceFrame() {
  if (!sourceAsset) return;
  if (sourceAsset.type === "spine") {
    const assetKey = sourceAsset.id.replace("spine-", "");
    const structure = sourceAsset.sourceStructure;
    const paired = structure?.kind === "spineParts" && structure.parts?.length > 1;
    const animation = paired ? structure.parts[0][clipSelect.value] ?? sourceAnimationForClip(sourceAsset, clipSelect.value) : sourceAnimationForClip(sourceAsset, clipSelect.value);
    const nextSrc = `${BASE_URL}spine-animation-review.html?embed=1&character=${encodeURIComponent(assetKey)}&animation=${encodeURIComponent(animation)}`;
    if (!sourceSpinePreview.src.endsWith(nextSrc)) sourceSpinePreview.src = nextSrc;
    sourceSpinePreview.hidden = false;
    sourceSpinePreview.classList.toggle("paired-a", paired);
    if (paired) {
      sourceSpinePreview.style.transform = "";
      sourceSpinePreview.style.transformOrigin = "";
      const secondAnimation = structure.parts[1][clipSelect.value] ?? animation;
      const secondSrc = `${BASE_URL}spine-animation-review.html?embed=1&character=${encodeURIComponent(assetKey)}&animation=${encodeURIComponent(secondAnimation)}`;
      if (!sourceSpinePreviewB.src.endsWith(secondSrc)) sourceSpinePreviewB.src = secondSrc;
      sourceSpinePreviewB.hidden = false;
      sourceSpinePreviewB.classList.add("paired-b");
      sourceSpinePreviewB.style.transform = "";
      sourceSpinePreviewB.style.transformOrigin = "";
    } else {
      sourceSpinePreviewB.hidden = true;
      sourceSpinePreviewB.removeAttribute("src");
    }
    referenceCanvas.classList.add("hidden");
    return;
  }
  sourceSpinePreview.hidden = true;
  sourceSpinePreviewB.hidden = true;
  referenceCanvas.classList.remove("hidden");
  loadAssetImage(sourceAsset).then((image) => {
    const sw = sourceAsset.frameWidth ?? image.width;
    const sh = sourceAsset.frameHeight ?? image.height;
    const frame = timelineState.frame % Math.max(1, sourceAsset.frames ?? 1);
    const scale = Math.min(430 / sw, 430 / sh);
    referenceCtx.clearRect(0, 0, 512, 512);
    referenceCtx.drawImage(image, frame * sw, 0, sw, sh, (512 - sw * scale) / 2, (512 - sh * scale) / 2, sw * scale, sh * scale);
  });
}

function setAssetAsReference(asset) {
  loadAssetImage(asset).then((image) => {
    referenceCtx.clearRect(0, 0, 512, 512);
    const sourceWidth = asset.frameWidth ?? image.width;
    const sourceHeight = asset.frameHeight ?? image.height;
    const scale = Math.min(430 / sourceWidth, 430 / sourceHeight);
    referenceCtx.drawImage(image, 0, 0, sourceWidth, sourceHeight, (512 - sourceWidth * scale) / 2, (512 - sourceHeight * scale) / 2, sourceWidth * scale, sourceHeight * scale);
    referenceCanvas.classList.remove("hidden");
  });
}

function setCompareAsset(slot, asset) {
  libraryState.compare[slot] = asset;
  libraryState.frame = 0;
  document.getElementById(slot ? "compareBLabel" : "compareALabel").textContent = asset.name;
  drawComparison();
}

function tickAssetComparison(now) {
  if (libraryState.playing && now - libraryState.last > 1000 / 12) {
    libraryState.frame += 1;
    libraryState.last = now;
    drawComparison();
  }
  requestAnimationFrame(tickAssetComparison);
}

function drawComparison() {
  libraryState.compare.forEach((asset, slot) => {
    const canvas = document.getElementById(slot ? "compareB" : "compareA");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f3ead9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!asset) return;
    loadAssetImage(asset).then((image) => {
      const sw = asset.frameWidth ?? image.width;
      const sh = asset.frameHeight ?? image.height;
      const frame = libraryState.frame % (asset.frames ?? 1);
      const scale = Math.min(150 / sw, 124 / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#f3ead9";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, frame * sw, 0, sw, sh, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    });
  });
}

function loadAssetImage(asset) {
  if (assetImages.has(asset.id)) return assetImages.get(asset.id);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = asset.dataUrl ?? asset.path;
  });
  assetImages.set(asset.id, promise);
  return promise;
}

function compositeSavedGlyph(key) {
  if (key === selected[1]) return compositeCanvas().toDataURL("image/png");
  return localStorage.getItem(renderedStorageKey(key, "ink"))
    ?? localStorage.getItem(storageKey(key, "ink"))
    ?? LAYERS.map((layer) => localStorage.getItem(renderedStorageKey(key, layer.id)) ?? localStorage.getItem(storageKey(key, layer.id))).find(Boolean);
}

function createLayerCanvases() {
  formationBaseCanvas = document.createElement("canvas");
  formationBaseCanvas.width = 512;
  formationBaseCanvas.height = 512;
  formationBaseCanvas.className = "formation-base-canvas";
  formationBaseCanvas.setAttribute("aria-hidden", "true");
  canvasZone.appendChild(formationBaseCanvas);
  formationBaseCtx = formationBaseCanvas.getContext("2d");
  for (const layer of LAYERS) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    canvas.className = "layer-canvas";
    canvas.dataset.layer = layer.id;
    canvas.style.zIndex = String(10 + LAYERS.indexOf(layer));
    canvasZone.appendChild(canvas);
    layerCanvases.set(layer.id, canvas);
  }
  objectCanvas = document.createElement("canvas");
  objectCanvas.width = 512;
  objectCanvas.height = 512;
  objectCanvas.id = "objectCanvas";
  objectCanvas.setAttribute("aria-label", "可编辑对象画布");
  canvasZone.appendChild(objectCanvas);
  objectCtx = objectCanvas.getContext("2d");
}

function selectedSpan() {
  return selected?.[2] === "generalFormation" ? Math.max(1, selected[3]?.length ?? 1) : 1;
}

function resizeWorkspaceCanvas(span = selectedSpan()) {
  const width = 512 * span;
  canvasZone.style.setProperty("--canvas-span", String(span));
  canvasZone.dataset.span = String(span);
  for (const canvas of [formationBaseCanvas, ...layerCanvases.values(), objectCanvas, referenceCanvas]) {
    if (!canvas) continue;
    canvas.width = width;
    canvas.height = 512;
  }
  objectCtx = objectCanvas.getContext("2d");
  formationBaseCtx = formationBaseCanvas.getContext("2d");
  canvasZone.querySelector(".canvas-cell-labels")?.remove();
  if (span > 1) {
    const labels = document.createElement("div");
    labels.className = "canvas-cell-labels";
    labels.style.gridTemplateColumns = `repeat(${span}, 1fr)`;
    for (const member of selected[3] ?? []) {
      const label = document.createElement("span");
      label.textContent = `${member} · 1格`;
      labels.appendChild(label);
    }
    canvasZone.appendChild(labels);
  }
}

function bindEvents() {
  selectTool.addEventListener("click", () => setTool("select"));
  marqueeTool.addEventListener("click", () => setTool("marquee"));
  brushTool.addEventListener("click", () => setTool("brush"));
  lineTool.addEventListener("click", () => setTool("line"));
  eraserTool.addEventListener("click", () => setTool("eraser"));
  deleteObject.addEventListener("click", removeSelectedObject);
  undoButton.addEventListener("click", undo);
  clearButton.addEventListener("click", clearActiveLayer);
  saveGlyph.addEventListener("click", saveCurrent);
  exportPng.addEventListener("click", exportCompositePng);
  exportPack.addEventListener("click", exportGlyphPack);
  saveProjectPack.addEventListener("click", writeActorPackToProject);
  toggleReference.addEventListener("click", () => referenceCanvas.classList.toggle("hidden"));
  referenceInput.addEventListener("change", loadReference);
  inkColor.addEventListener("input", () => applyPaintColor(inkColor.value));
  document.addEventListener("pointerdown", (event) => {
    if (colorPalette.open && !colorPalette.contains(event.target)) colorPalette.open = false;
  });
  animationMode.addEventListener("change", updateManifestPreview);
  animationPlay.addEventListener("click", toggleTimelinePlayback);
  clipSelect.addEventListener("change", loadSelectedClip);
  timelineFps.addEventListener("change", updateClipSettings);
  timelineDuration.addEventListener("change", updateClipSettings);
  timelineScrubber.addEventListener("input", () => setTimelineFrame(Number(timelineScrubber.value)));
  addKeyframe.addEventListener("click", createKeyframe);
  deleteKeyframe.addEventListener("click", removeKeyframe);
  for (const input of [transformX, transformY, transformScale, transformRotation, transformOpacity, timelineEase]) {
    input.addEventListener("input", previewTransformControls);
  }
  for (const input of [objectScale, objectRotation, objectOpacity]) {
    input.addEventListener("input", updateSelectedObjectFromInspector);
  }
  objectCanvas.addEventListener("pointerdown", startStroke);
  objectCanvas.addEventListener("pointermove", moveStroke);
  objectCanvas.addEventListener("pointerup", endStroke);
  objectCanvas.addEventListener("pointercancel", endStroke);
  objectCanvas.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    objectCanvas.classList.add("drop-target");
  });
  objectCanvas.addEventListener("dragleave", () => objectCanvas.classList.remove("drop-target"));
  objectCanvas.addEventListener("drop", dropLibraryAsset);
  window.addEventListener("keydown", (event) => {
    if ((event.key === "Delete" || event.key === "Backspace") && selectedObjectIds.size && !event.target.matches("input, textarea")) {
      event.preventDefault();
      removeSelectedObject();
    }
  });
}

function renderGlyphList() {
  glyphList.innerHTML = "";
  let lastGroup = "";
  for (const [glyph, key, actorType] of GLYPHS) {
    const group = actorType === "generalFormation" ? "组合将领" : actorType === "generalGlyph" ? "单字资产" : "兵种与道具";
    if (group !== lastGroup) {
      const title = document.createElement("div");
      title.className = "glyph-group-title";
      title.textContent = group;
      glyphList.appendChild(title);
      lastGroup = group;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = `glyph-button${actorType === "generalFormation" ? " formation" : ""}${hasSavedGlyph(key) ? " saved" : ""}${selected[1] === key ? " active" : ""}`;
    button.dataset.key = key;
    button.textContent = glyph;
    button.title = `${glyph} / ${key}`;
    button.addEventListener("click", () => {
      saveCurrent({ refresh: false });
      selectGlyph(key);
      requestAnimationFrame(() => {
        renderGlyphList();
        renderAssetLibrary();
        renderStateMatrix();
      });
    });
    glyphList.appendChild(button);
  }
}

function migrateLegacyLocalStorage() {
  for (const [glyph, legacyKey] of Object.entries(LEGACY_KEYS)) {
    const nextKey = GLYPH_ACTORS[glyph]?.id;
    if (!nextKey) continue;
    for (const layer of LAYERS) {
      const oldValue = localStorage.getItem(storageKey(legacyKey, layer.id));
      if (oldValue && !localStorage.getItem(storageKey(nextKey, layer.id))) localStorage.setItem(storageKey(nextKey, layer.id), oldValue);
    }
    const oldMeta = localStorage.getItem(metaKey(legacyKey));
    if (oldMeta && !localStorage.getItem(metaKey(nextKey))) localStorage.setItem(metaKey(nextKey), oldMeta);
  }
}

function renderLayerList() {
  layerList.innerHTML = "";
  for (const layer of LAYERS) {
    const item = document.createElement("div");
    item.className = "layer-item";
    item.dataset.layer = layer.id;
    item.innerHTML = `
      <button class="layer-select" type="button">
        <strong>${layer.label}</strong>
        <span>${layer.role}</span>
      </button>
      <button class="layer-visible" type="button" title="显示/隐藏">👁</button>
    `;
    item.querySelector(".layer-select").addEventListener("click", () => selectLayer(layer.id));
    item.querySelector(".layer-visible").addEventListener("click", () => toggleLayer(layer.id));
    layerList.appendChild(item);
  }
  selectLayer(activeLayerId);
}

function selectGlyph(key) {
  leaveSourceAssetMode();
  selected = GLYPHS.find((item) => item[1] === key) ?? GLYPHS[0];
  resizeWorkspaceCanvas(selectedSpan());
  currentGlyph.textContent = selected[0];
  currentName.textContent = `${selected[1]} actor pack`;
  animationMode.value = selected[2] === "generalFormation" ? "general" : selected[2] === "prop" ? "weapon" : "card";
  configureStateOptions();
  renderFormationPreview();
  for (const button of glyphList.querySelectorAll(".glyph-button")) {
    button.classList.toggle("active", button.dataset.key === selected[1]);
  }
  clearAllLayerCanvases();
  loadSavedLayers(selected[1]);
  loadSavedObjects(selected[1]);
  loadAnimationData(selected[1]);
  renderFormationBase();
  undoStack = [];
  updatePreview();
  updateManifestPreview();
}

async function renderFormationBase() {
  formationBaseCtx.clearRect(0, 0, formationBaseCanvas.width, formationBaseCanvas.height);
  formationBaseCanvas.dataset.membersLoaded = "0";
  formationBaseCanvas.dataset.tint = "#d7aa3a";
  if (selected[2] !== "generalFormation") return;
  const actorKey = selected[1];
  const members = selected[3] ?? [];
  const sources = members.map((member) => compositeSavedGlyph(GLYPH_ACTORS[member]?.id ?? member));
  await Promise.all(sources.map((source) => source ? loadImageSource(source) : Promise.resolve(null))).then((images) => {
    if (selected[1] !== actorKey) return;
    images.forEach((image, index) => {
      if (!image) return;
      const cell = document.createElement("canvas");
      cell.width = 512;
      cell.height = 512;
      const context = cell.getContext("2d");
      context.drawImage(image, 0, 0, 512, 512);
      context.globalCompositeOperation = "source-in";
      context.fillStyle = "#d7aa3a";
      context.fillRect(0, 0, 512, 512);
      formationBaseCtx.drawImage(cell, index * 512, 0);
    });
    formationBaseCanvas.dataset.membersLoaded = String(images.filter(Boolean).length);
    updatePreview();
  });
}

function loadImageSource(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function configureStateOptions() {
  const states = STATE_PROFILES[selected[2]] ?? STATE_PROFILES.unit;
  const previous = clipSelect.value;
  clipSelect.replaceChildren(...states.map((state) => new Option(state, state)));
  clipSelect.value = states.includes(previous) ? previous : states.includes("idle") ? "idle" : states[0];
}

function renderFormationPreview() {
  formationPreview.innerHTML = "";
  const members = selected[3] ?? [selected[0]];
  for (const glyph of members) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "formation-cell";
    cell.textContent = glyph;
    cell.draggable = true;
    cell.title = "点击模拟拆阵；拖动可调整顺序";
    cell.addEventListener("click", () => {
      cell.classList.toggle("detached");
      updateFormationSimulationStatus();
    });
    cell.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", glyph));
    cell.addEventListener("dragover", (event) => event.preventDefault());
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      const dragged = event.dataTransfer.getData("text/plain");
      const source = [...formationPreview.children].find((item) => item.textContent === dragged);
      if (source && source !== cell) formationPreview.insertBefore(source, cell);
      updateFormationSimulationStatus();
    });
    formationPreview.appendChild(cell);
  }
  updateFormationSimulationStatus();
  renderStateMatrix();
}

function updateFormationSimulationStatus() {
  const order = [...formationPreview.children].filter((cell) => !cell.classList.contains("detached")).map((cell) => cell.textContent).join("");
  const expected = (selected[3] ?? [selected[0]]).join("");
  formationPreview.dataset.status = selected[2] === "generalFormation" && order === expected ? selected[0] : "未成阵";
  formationPreview.title = `阵型：${formationPreview.dataset.status}`;
}

function renderStateMatrix() {
  const meta = safeJson(localStorage.getItem(metaKey(selected[1]))) ?? {};
  const available = Object.keys(meta.clips ?? {});
  const matrix = stateMatrixForActor(selected[2], available);
  stateMatrix.innerHTML = "";
  for (const state of STATE_PROFILES[selected[2]] ?? []) {
    const chip = document.createElement("span");
    chip.className = `state-chip ${matrix[state].status}`;
    chip.textContent = `${state}:${matrix[state].status}`;
    stateMatrix.appendChild(chip);
  }
  renderProductionGuide(meta);
}

function renderProductionGuide(meta = {}) {
  const actorType = selected[2] ?? "unit";
  const requirements = ANIMATION_REQUIREMENTS[actorType] ?? ANIMATION_REQUIREMENTS.unit;
  const authored = new Set(Object.keys(meta.clips ?? timelineState.clips ?? {}));
  const rows = [
    ...requirements.required.map((state) => ({ state, priority: "required" })),
    ...requirements.optional.map((state) => ({ state, priority: "optional" }))
  ];
  productionGuide.innerHTML = `
    <div class="guide-heading"><strong>制作清单</strong><span>${actorType}</span></div>
    <div class="guide-locations">
      <span><b>主画布</b> neutral 与四图层</span>
      <span><b>拼装条</b> accent / shadow / fx</span>
      <span><b>时间轴</b> 动作关键帧</span>
    </div>
    <div class="guide-states"></div>
  `;
  const list = productionGuide.querySelector(".guide-states");
  for (const item of rows) {
    const button = document.createElement("button");
    button.type = "button";
    const complete = item.state === "neutral" ? hasSavedGlyph(selected[1]) : authored.has(item.state);
    button.className = `guide-state ${item.priority}${complete ? " complete" : ""}${clipSelect.value === item.state ? " current" : ""}`;
    button.innerHTML = `<strong>${item.state}</strong><span>${item.priority === "required" ? "必做" : "建议"} · ${item.state === "neutral" ? "主画布" : "时间轴"}</span>`;
    button.addEventListener("click", () => {
      if ([...clipSelect.options].some((option) => option.value === item.state)) {
        clipSelect.value = item.state;
        loadSelectedClip();
      }
      document.querySelector(".animation-panel")?.scrollIntoView({ block: "nearest" });
    });
    list.appendChild(button);
  }
}

function selectLayer(layerId) {
  activeLayerId = layerId;
  const layer = LAYERS.find((item) => item.id === layerId) ?? LAYERS[0];
  inkColor.value = layer.color;
  updateCreativeSelection();
  for (const item of layerList.querySelectorAll(".layer-item")) {
    item.classList.toggle("active", item.dataset.layer === layerId);
  }
  for (const [id, canvas] of layerCanvases) {
    canvas.classList.toggle("active", id === layerId);
  }
  renderEditableObjects();
  updateManifestPreview();
  syncTransformControls();
  renderTimelineTracks();
}

function defaultClip(name = clipSelect.value) {
  const defaults = { idle: 24, attack: 18, hit: 8, death: 24, skill: 30 };
  return { name, fps: 12, duration: defaults[name] ?? 24, loop: name === "idle", events: [], tracks: {} };
}

function activeClip() {
  const name = clipSelect.value;
  timelineState.clips[name] ??= defaultClip(name);
  return timelineState.clips[name];
}

function loadAnimationData(key) {
  const meta = safeJson(localStorage.getItem(metaKey(key))) ?? {};
  timelineState.clips = meta.clips ?? {};
  timelineState.frame = 0;
  loadSelectedClip();
}

function loadSelectedClip() {
  const clip = activeClip();
  timelineFps.value = String(clip.fps);
  timelineDuration.value = String(clip.duration);
  timelineScrubber.max = String(Math.max(0, clip.duration - 1));
  setTimelineFrame(0);
  renderTimelineTracks();
  renderExternalSourceFrame();
  renderProductionGuide(safeJson(localStorage.getItem(metaKey(selected[1]))) ?? { clips: timelineState.clips });
}

function updateClipSettings() {
  const clip = activeClip();
  clip.fps = Math.max(6, Math.min(30, Number(timelineFps.value) || 12));
  clip.duration = Math.max(4, Math.min(120, Number(timelineDuration.value) || 24));
  timelineFps.value = String(clip.fps);
  timelineDuration.value = String(clip.duration);
  timelineScrubber.max = String(clip.duration - 1);
  setTimelineFrame(Math.min(timelineState.frame, clip.duration - 1));
  renderTimelineTracks();
}

function transformFromControls() {
  return {
    x: Number(transformX.value) || 0,
    y: Number(transformY.value) || 0,
    scale: Number(transformScale.value) || 1,
    rotation: Number(transformRotation.value) || 0,
    opacity: Number(transformOpacity.value),
    ease: timelineEase.value
  };
}

function createKeyframe() {
  const clip = activeClip();
  clip.tracks[activeLayerId] ??= [];
  const track = clip.tracks[activeLayerId];
  const key = { frame: timelineState.frame, ...transformFromControls() };
  const index = track.findIndex((item) => item.frame === key.frame);
  if (index >= 0) track[index] = key;
  else track.push(key);
  track.sort((a, b) => a.frame - b.frame);
  renderTimelineTracks();
  applyTimelineFrame();
}

function removeKeyframe() {
  const track = activeClip().tracks[activeLayerId] ?? [];
  activeClip().tracks[activeLayerId] = track.filter((key) => key.frame !== timelineState.frame);
  renderTimelineTracks();
  syncTransformControls();
  applyTimelineFrame();
}

function setTimelineFrame(frame) {
  timelineState.frame = Math.max(0, Math.min(activeClip().duration - 1, frame));
  timelineScrubber.value = String(timelineState.frame);
  frameReadout.textContent = `f${String(timelineState.frame).padStart(2, "0")} / ${activeClip().duration}`;
  syncTransformControls();
  applyTimelineFrame();
  renderTimelineTracks();
  renderExternalSourceFrame();
}

function previewTransformControls() {
  const canvas = layerCanvases.get(activeLayerId);
  applyCanvasTransform(canvas, transformFromControls());
}

function syncTransformControls() {
  const value = interpolatedTransform(activeClip().tracks[activeLayerId] ?? [], timelineState.frame);
  transformX.value = String(Math.round(value.x * 100) / 100);
  transformY.value = String(Math.round(value.y * 100) / 100);
  transformScale.value = String(Math.round(value.scale * 100) / 100);
  transformRotation.value = String(Math.round(value.rotation * 100) / 100);
  transformOpacity.value = String(Math.round(value.opacity * 100) / 100);
  timelineEase.value = value.ease ?? "easeInOut";
}

function interpolatedTransform(track, frame) {
  const base = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, ease: "easeInOut" };
  if (!track.length) return base;
  const before = [...track].reverse().find((key) => key.frame <= frame) ?? track[0];
  const after = track.find((key) => key.frame >= frame) ?? track[track.length - 1];
  if (before.frame === after.frame || before.ease === "step") return { ...base, ...before };
  let t = (frame - before.frame) / (after.frame - before.frame);
  if (before.ease === "easeInOut") t = t * t * (3 - 2 * t);
  return {
    x: before.x + (after.x - before.x) * t,
    y: before.y + (after.y - before.y) * t,
    scale: before.scale + (after.scale - before.scale) * t,
    rotation: before.rotation + (after.rotation - before.rotation) * t,
    opacity: before.opacity + (after.opacity - before.opacity) * t,
    ease: before.ease
  };
}

function applyTimelineFrame() {
  for (const layer of LAYERS) {
    const value = interpolatedTransform(activeClip().tracks[layer.id] ?? [], timelineState.frame);
    applyCanvasTransform(layerCanvases.get(layer.id), value);
  }
  renderEditableObjects();
  if (sourceAsset) {
    const sourceValue = interpolatedTransform(activeClip().tracks.ink ?? [], timelineState.frame);
    const preservesNativeParts = sourceAsset.sourceStructure?.kind === "spineParts";
    if (!preservesNativeParts) applyCanvasTransform(sourceAsset.type === "spine" ? sourceSpinePreview : referenceCanvas, sourceValue);
  }
}

function applyCanvasTransform(canvas, value) {
  if (!canvas) return;
  canvas.style.transformOrigin = "50% 58.6%";
  canvas.style.transform = `translate(${value.x}px, ${value.y}px) rotate(${value.rotation}deg) scale(${value.scale})`;
  canvas.style.opacity = String(value.opacity);
}

function renderTimelineTracks() {
  const clip = activeClip();
  trackList.innerHTML = "";
  for (const layer of LAYERS) {
    const row = document.createElement("div");
    row.className = "track-row";
    row.innerHTML = `<span class="track-label">${layer.label}</span><div class="track-rail"></div>`;
    const rail = row.querySelector(".track-rail");
    for (const key of clip.tracks[layer.id] ?? []) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `key-dot${key.frame === timelineState.frame ? " current" : ""}`;
      dot.style.left = `${clip.duration <= 1 ? 0 : key.frame / (clip.duration - 1) * 100}%`;
      dot.title = `${layer.label} f${key.frame}`;
      dot.addEventListener("click", () => { selectLayer(layer.id); setTimelineFrame(key.frame); });
      rail.appendChild(dot);
    }
    trackList.appendChild(row);
  }
}

function toggleTimelinePlayback() {
  timelineState.playing = !timelineState.playing;
  animationPlay.textContent = timelineState.playing ? "❚❚" : "▶";
}

function tickTimeline(now) {
  const clip = activeClip();
  if (timelineState.playing && now - timelineState.last >= 1000 / clip.fps) {
    const next = timelineState.frame + 1;
    if (next >= clip.duration && !clip.loop) timelineState.playing = false;
    setTimelineFrame(next >= clip.duration ? 0 : next);
    timelineState.last = now;
    animationPlay.textContent = timelineState.playing ? "❚❚" : "▶";
  }
  requestAnimationFrame(tickTimeline);
}

function toggleLayer(layerId) {
  const canvas = layerCanvases.get(layerId);
  if (!canvas) return;
  canvas.classList.toggle("hidden");
  renderEditableObjects();
  updatePreview();
  updateManifestPreview();
}

function setTool(nextTool) {
  tool = nextTool;
  selectTool.classList.toggle("active", tool === "select");
  marqueeTool.classList.toggle("active", tool === "marquee");
  brushTool.classList.toggle("active", tool === "brush");
  lineTool.classList.toggle("active", tool === "line");
  eraserTool.classList.toggle("active", tool === "eraser");
  objectCanvas.style.cursor = tool === "select" ? "default" : "crosshair";
  updateCreativeSelection();
}

function startStroke(event) {
  event.preventDefault();
  const point = pointFromEvent(event);
  if (tool === "marquee") {
    marqueeSelection = { start: point, current: point };
    drawing = true;
    objectCanvas.setPointerCapture?.(event.pointerId);
    renderEditableObjects();
    return;
  }
  if (tool === "select") {
    beginObjectInteraction(point);
    objectCanvas.setPointerCapture?.(event.pointerId);
    return;
  }
  pushUndo();
  if (tool === "stamp") {
    addStampObject(point);
    setTool("select");
    updatePreview();
    return;
  }
  if (tool === "asset") {
    addPremiumAssetObject(point);
    setTool("select");
    updatePreview();
    return;
  }
  if (tool === "line" || tool === "brush") {
    drawing = true;
    draftObject = createPathObject(point, tool === "line" ? "直线" : "自由曲线");
    editableObjects.push(draftObject);
    selectOnlyObject(draftObject.id);
    renderEditableObjects();
    objectCanvas.setPointerCapture?.(event.pointerId);
    return;
  }
  drawing = true;
  last = point;
  drawDot(last);
  objectCanvas.setPointerCapture?.(event.pointerId);
}

function moveStroke(event) {
  if (tool === "marquee" && marqueeSelection) {
    event.preventDefault();
    marqueeSelection.current = pointFromEvent(event);
    renderEditableObjects();
    return;
  }
  if (tool === "select" && objectInteraction) {
    event.preventDefault();
    updateObjectInteraction(pointFromEvent(event));
    return;
  }
  if (!drawing) return;
  event.preventDefault();
  const point = pointFromEvent(event);
  if (draftObject) {
    const relative = { x: point.x - draftObject.x, y: point.y - draftObject.y };
    if (tool === "line") draftObject.points[1] = relative;
    else if (distance(draftObject.points.at(-1), relative) > 2) draftObject.points.push(relative);
    renderEditableObjects();
    updatePreview();
    return;
  }
  drawLine(last, point);
  last = point;
  updatePreview();
}

function endStroke(event) {
  if (tool === "marquee" && marqueeSelection) {
    finishMarqueeSelection();
    drawing = false;
    objectCanvas.releasePointerCapture?.(event.pointerId);
    renderEditableObjects();
    updateObjectInspector();
    setTool("select");
    return;
  }
  if (objectInteraction) {
    objectInteraction = null;
    objectCanvas.releasePointerCapture?.(event.pointerId);
    updateObjectInspector();
    updatePreview();
    return;
  }
  if (!drawing) return;
  drawing = false;
  last = null;
  draftObject = null;
  objectCanvas.releasePointerCapture?.(event.pointerId);
  renderEditableObjects();
  updatePreview();
}

function drawDot(point) {
  const context = activeCtx();
  context.save();
  context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  context.fillStyle = inkColor.value;
  context.beginPath();
  context.arc(point.x, point.y, Number(brushSize.value) / 2, 0, Math.PI * 2);
  context.fill();
  context.restore();
  updatePreview();
}

function drawLine(from, to) {
  const context = activeCtx();
  context.save();
  context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  context.strokeStyle = inkColor.value;
  context.lineWidth = Number(brushSize.value);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.restore();
}

function drawStampObject(context, object) {
  const size = object.size;
  const rotation = object.rotation * Math.PI / 180;
  context.save();
  context.translate(object.x, object.y);
  context.rotate(rotation);
  context.scale(object.scale, object.scale);
  context.globalAlpha = object.opacity;
  context.strokeStyle = object.color;
  context.fillStyle = object.color;
  context.lineWidth = Math.max(3, size * 0.065);
  context.lineCap = "round";
  context.lineJoin = "round";

  if (object.stamp === "flag") drawFlagStamp(context, size);
  else if (object.stamp === "shield") drawShieldStamp(context, size);
  else if (object.stamp === "slash") drawSlashStamp(context, size);
  else if (object.stamp === "spear") drawSpearStamp(context, size);
  else if (object.stamp === "arrow") drawArrowStamp(context, size);
  else if (object.stamp === "ring") drawRingStamp(context, size);
  else if (object.stamp === "inkBurst") drawInkBurstStamp(context, size);
  else if (object.stamp === "smoke") drawSmokeStamp(context, size);
  else if (object.stamp === "water") drawWaterStamp(context, size);
  else drawSparkStamp(context, size);
  context.restore();
}

function addStampObject(point) {
  const definition = STAMP_DEFINITIONS.find((item) => item.id === selectedStamp);
  const object = {
    id: crypto.randomUUID(), kind: "stamp", label: definition?.label ?? "拼装元素", layer: activeLayerId,
    stamp: selectedStamp, x: point.x, y: point.y, size: Number(stampSize.value) || 96,
    scale: 1, rotation: Number(stampRotation.value) || 0, opacity: 1, color: inkColor.value
  };
  editableObjects.push(object);
  selectOnlyObject(object.id);
  renderEditableObjects();
  updateObjectInspector();
}

function addPremiumAssetObject(point) {
  const asset = PREMIUM_ASSETS.find((item) => item.id === selectedPremiumAsset);
  if (!asset) return;
  const object = {
    id: crypto.randomUUID(), kind: "image", label: asset.label, assetId: asset.id, layer: asset.layer,
    x: point.x, y: point.y, size: Number(stampSize.value) || 96, scale: 1,
    rotation: Number(stampRotation.value) || 0, opacity: 1
  };
  editableObjects.push(object);
  selectOnlyObject(object.id);
  renderEditableObjects();
  updateObjectInspector();
}

function createPathObject(point, label) {
  return {
    id: crypto.randomUUID(), kind: "path", label, layer: activeLayerId, x: point.x, y: point.y,
    points: [{ x: 0, y: 0 }, { x: 0, y: 0 }], size: 1, scale: 1, rotation: 0,
    opacity: 1, color: inkColor.value, width: Number(brushSize.value) || 24
  };
}

function selectOnlyObject(id) {
  selectedObjectId = id ?? null;
  selectedObjectIds = id ? new Set([id]) : new Set();
}

function preloadObjectImage(asset) {
  return preloadObjectSource(asset.id, asset.src);
}

function preloadObjectSource(id, src) {
  let variants = objectImages.get(id);
  if (!variants) {
    variants = new Map();
    objectImages.set(id, variants);
  }
  if (variants.has(src)) return variants.get(src);
  const image = new Image();
  image.onload = () => { image.dataset.loaded = "1"; renderEditableObjects(); updatePreview(); };
  image.src = src;
  variants.set(src, image);
  return image;
}

function currentSourceForObject(object, fallback) {
  if (!object.assetId?.startsWith("drawn-")) return fallback;
  const key = object.assetId.slice("drawn-".length);
  if (!key || key === selected[1]) return fallback;
  return compositeSavedGlyph(key) ?? fallback;
}

function renderEditableObjects(target = objectCtx, includeSelection = true) {
  if (!target) return;
  target.clearRect(0, 0, objectCanvas.width, objectCanvas.height);
  for (const object of editableObjects) {
    const layerCanvas = layerCanvases.get(object.layer);
    if (layerCanvas?.classList.contains("hidden")) continue;
    drawObjectWithLayerTransform(target, object, () => drawEditableObject(target, object));
  }
  const selectedObjects = editableObjects.filter((item) => selectedObjectIds.has(item.id));
  if (includeSelection) {
    for (const object of selectedObjects) drawObjectWithLayerTransform(target, object, () => drawSelection(target, object));
    if (marqueeSelection) drawMarquee(target, marqueeSelection);
  }
  if (objectCanvas) {
    objectCanvas.dataset.objectCount = String(editableObjects.length);
    objectCanvas.dataset.selectedKind = selectedObjects.length > 1 ? "multiple" : selectedObjects[0]?.kind ?? "";
    objectCanvas.dataset.selectedCount = String(selectedObjects.length);
    const primary = selectedObjects.find((object) => object.id === selectedObjectId);
    const topLeft = primary ? objectTopLeftWorld(primary) : null;
    objectCanvas.dataset.selectedTopLeft = topLeft ? `${topLeft.x.toFixed(2)},${topLeft.y.toFixed(2)}` : "";
  }
}

function drawMarquee(context, marquee) {
  const rect = normalizedRect(marquee.start, marquee.current);
  context.save();
  context.fillStyle = "rgba(243, 184, 63, 0.14)";
  context.strokeStyle = "#f3b83f";
  context.lineWidth = 2;
  context.setLineDash([8, 5]);
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function normalizedRect(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function worldBounds(object) {
  const bounds = objectBounds(object);
  const angle = object.rotation * Math.PI / 180;
  const corners = [
    [bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y],
    [bounds.x + bounds.width, bounds.y + bounds.height], [bounds.x, bounds.y + bounds.height]
  ].map(([x, y]) => ({
    x: object.x + (x * Math.cos(angle) - y * Math.sin(angle)) * object.scale,
    y: object.y + (x * Math.sin(angle) + y * Math.cos(angle)) * object.scale
  }));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function rectanglesIntersect(a, b) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

function finishMarqueeSelection() {
  const rect = normalizedRect(marqueeSelection.start, marqueeSelection.current);
  const ids = editableObjects
    .filter((object) => !layerCanvases.get(object.layer)?.classList.contains("hidden") && rectanglesIntersect(rect, worldBounds(object)))
    .map((object) => object.id);
  selectedObjectIds = new Set(ids);
  selectedObjectId = ids.at(-1) ?? null;
  marqueeSelection = null;
}

function drawObjectWithLayerTransform(context, object, draw) {
  const value = interpolatedTransform(activeClip().tracks[object.layer] ?? [], timelineState.frame);
  context.save();
  const pivotX = activeCanvas().width / 2;
  context.translate(pivotX + value.x, 300 + value.y);
  context.rotate(value.rotation * Math.PI / 180);
  context.scale(value.scale, value.scale);
  context.translate(-pivotX, -300);
  context.globalAlpha *= value.opacity;
  draw();
  context.restore();
}

function drawEditableObject(context, object) {
  if (object.kind === "stamp") return drawStampObject(context, object);
  context.save();
  context.translate(object.x, object.y);
  context.rotate(object.rotation * Math.PI / 180);
  context.scale(object.scale, object.scale);
  context.globalAlpha = object.opacity;
  if (object.kind === "path") {
    context.strokeStyle = object.color;
    context.lineWidth = object.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    object.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.stroke();
  } else if (object.kind === "image") {
    const asset = PREMIUM_ASSETS.find((item) => item.id === object.assetId);
    const source = currentSourceForObject(object, object.src ?? asset?.src);
    const image = source ? preloadObjectSource(object.assetId, source) : null;
    if (image?.dataset.loaded === "1") {
      const frame = object.frame ?? asset?.frame ?? [0, 0, image.naturalWidth, image.naturalHeight];
      const ratio = frame[2] / frame[3];
      const width = object.size * Math.min(1.6, Math.max(0.65, ratio));
      const height = width / ratio;
      context.drawImage(image, ...frame, -width / 2, -height / 2, width, height);
    }
  }
  context.restore();
}

function objectBounds(object) {
  if (object.kind === "path") {
    const xs = object.points.map((point) => point.x);
    const ys = object.points.map((point) => point.y);
    const pad = Math.max(12, object.width / 2);
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, width: Math.max(1, Math.max(...xs) - Math.min(...xs)) + pad * 2, height: Math.max(1, Math.max(...ys) - Math.min(...ys)) + pad * 2 };
  }
  const size = object.size || 96;
  return { x: -size / 2, y: -size / 2, width: size, height: size };
}

function drawSelection(context, object) {
  const bounds = objectBounds(object);
  context.save();
  context.translate(object.x, object.y);
  context.rotate(object.rotation * Math.PI / 180);
  context.scale(object.scale, object.scale);
  context.strokeStyle = "#f3b83f";
  context.fillStyle = "#fff6dc";
  context.lineWidth = 2 / object.scale;
  context.setLineDash([7 / object.scale, 5 / object.scale]);
  context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  context.setLineDash([]);
  const handle = 10 / object.scale;
  context.fillRect(bounds.x + bounds.width - handle / 2, bounds.y + bounds.height - handle / 2, handle, handle);
  context.beginPath();
  context.arc(bounds.x + bounds.width / 2, bounds.y - 26 / object.scale, 6 / object.scale, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(bounds.x + bounds.width / 2, bounds.y);
  context.lineTo(bounds.x + bounds.width / 2, bounds.y - 20 / object.scale);
  context.stroke();
  context.restore();
}

function localPointForObject(point, object) {
  const angle = -object.rotation * Math.PI / 180;
  const dx = point.x - object.x;
  const dy = point.y - object.y;
  return { x: (dx * Math.cos(angle) - dy * Math.sin(angle)) / object.scale, y: (dx * Math.sin(angle) + dy * Math.cos(angle)) / object.scale };
}

function objectTopLeftWorld(object) {
  const bounds = objectBounds(object);
  const angle = object.rotation * Math.PI / 180;
  const x = bounds.x * object.scale;
  const y = bounds.y * object.scale;
  return {
    x: object.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: object.y + x * Math.sin(angle) + y * Math.cos(angle)
  };
}

function setObjectScaleFromTopLeft(object, nextScale, anchor = objectTopLeftWorld(object)) {
  const bounds = objectBounds(object);
  const angle = object.rotation * Math.PI / 180;
  const x = bounds.x * nextScale;
  const y = bounds.y * nextScale;
  object.scale = nextScale;
  object.x = anchor.x - (x * Math.cos(angle) - y * Math.sin(angle));
  object.y = anchor.y - (x * Math.sin(angle) + y * Math.cos(angle));
}

function hitObject(point) {
  for (const object of [...editableObjects].reverse()) {
    if (layerCanvases.get(object.layer)?.classList.contains("hidden")) continue;
    const local = localPointForObject(point, object);
    const bounds = objectBounds(object);
    if (local.x >= bounds.x && local.x <= bounds.x + bounds.width && local.y >= bounds.y && local.y <= bounds.y + bounds.height) return object;
  }
  return null;
}

function beginObjectInteraction(point) {
  let object = editableObjects.find((item) => item.id === selectedObjectId);
  if (object) {
    const local = localPointForObject(point, object);
    const bounds = objectBounds(object);
    const scaleHandle = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    const rotateHandle = { x: bounds.x + bounds.width / 2, y: bounds.y - 26 / object.scale };
    if (distance(local, scaleHandle) < 18 / object.scale) return startObjectInteraction("scale", object, point);
    if (distance(local, rotateHandle) < 18 / object.scale) return startObjectInteraction("rotate", object, point);
  }
  object = hitObject(point);
  if (!object) selectOnlyObject(null);
  else if (!selectedObjectIds.has(object.id)) selectOnlyObject(object.id);
  else selectedObjectId = object.id;
  if (object) startObjectInteraction("move", object, point);
  renderEditableObjects();
  updateObjectInspector();
}

function startObjectInteraction(mode, object, point) {
  pushUndo();
  const scaleAnchor = objectTopLeftWorld(object);
  const group = editableObjects
    .filter((item) => selectedObjectIds.has(item.id))
    .map((item) => ({ id: item.id, x: item.x, y: item.y }));
  objectInteraction = {
    mode, id: object.id, start: point, x: object.x, y: object.y, scale: object.scale, rotation: object.rotation,
    group,
    scaleAnchor,
    scaleDistance: Math.max(1, distance(point, scaleAnchor)),
    angle: Math.atan2(point.y - object.y, point.x - object.x)
  };
}

function updateObjectInteraction(point) {
  const object = editableObjects.find((item) => item.id === objectInteraction.id);
  if (!object) return;
  if (objectInteraction.mode === "move") {
    const dx = point.x - objectInteraction.start.x;
    const dy = point.y - objectInteraction.start.y;
    for (const initial of objectInteraction.group) {
      const member = editableObjects.find((item) => item.id === initial.id);
      if (!member) continue;
      member.x = initial.x + dx;
      member.y = initial.y + dy;
    }
  } else if (objectInteraction.mode === "scale") {
    const nextScale = Math.max(0.1, Math.min(8, objectInteraction.scale * distance(point, objectInteraction.scaleAnchor) / objectInteraction.scaleDistance));
    setObjectScaleFromTopLeft(object, nextScale, objectInteraction.scaleAnchor);
  } else {
    const angle = Math.atan2(point.y - object.y, point.x - object.x);
    object.rotation = objectInteraction.rotation + (angle - objectInteraction.angle) * 180 / Math.PI;
  }
  renderEditableObjects();
  updateObjectInspector();
}

function updateObjectInspector() {
  const object = editableObjects.find((item) => item.id === selectedObjectId);
  selectedObjectLabel.textContent = selectedObjectIds.size > 1 ? `${selectedObjectIds.size} 个对象` : object?.label ?? "未选对象";
  for (const input of [objectScale, objectRotation, objectOpacity]) input.disabled = !object;
  if (!object) return;
  objectScale.value = String(Math.round(object.scale * 100) / 100);
  objectRotation.value = String(Math.round(object.rotation));
  objectOpacity.value = String(Math.round(object.opacity * 100) / 100);
}

function updateSelectedObjectFromInspector() {
  const object = editableObjects.find((item) => item.id === selectedObjectId);
  if (!object) return;
  const anchor = objectTopLeftWorld(object);
  setObjectScaleFromTopLeft(object, Math.max(0.1, Math.min(8, Number(objectScale.value) || 1)), anchor);
  object.rotation = Number(objectRotation.value) || 0;
  object.opacity = Math.max(0, Math.min(1, Number(objectOpacity.value)));
  renderEditableObjects();
  updatePreview();
}

function removeSelectedObject() {
  if (!selectedObjectIds.size) return;
  pushUndo();
  editableObjects = editableObjects.filter((item) => !selectedObjectIds.has(item.id));
  selectOnlyObject(null);
  renderEditableObjects();
  updateObjectInspector();
  updatePreview();
}

function distance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}

function drawFlagStamp(context, size) {
  context.beginPath();
  context.moveTo(-size * 0.34, size * 0.44);
  context.lineTo(-size * 0.34, -size * 0.45);
  context.stroke();
  context.beginPath();
  context.moveTo(-size * 0.29, -size * 0.39);
  context.quadraticCurveTo(size * 0.05, -size * 0.5, size * 0.34, -size * 0.28);
  context.lineTo(size * 0.13, -size * 0.02);
  context.quadraticCurveTo(-size * 0.05, -size * 0.2, -size * 0.29, -size * 0.1);
  context.closePath();
  context.fill();
}

function drawShieldStamp(context, size) {
  context.beginPath();
  context.moveTo(0, -size * 0.43);
  context.lineTo(size * 0.34, -size * 0.27);
  context.lineTo(size * 0.27, size * 0.15);
  context.quadraticCurveTo(0, size * 0.47, -size * 0.27, size * 0.15);
  context.lineTo(-size * 0.34, -size * 0.27);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.moveTo(0, -size * 0.3);
  context.lineTo(0, size * 0.28);
  context.moveTo(-size * 0.2, -size * 0.08);
  context.lineTo(size * 0.2, -size * 0.08);
  context.stroke();
}

function drawSlashStamp(context, size) {
  for (let index = -1; index <= 1; index += 1) {
    context.globalAlpha = index === 0 ? 1 : 0.48;
    context.lineWidth = Math.max(2, size * (index === 0 ? 0.09 : 0.045));
    context.beginPath();
    context.moveTo(-size * 0.43, size * (0.28 + index * 0.12));
    context.quadraticCurveTo(0, -size * (0.08 - index * 0.05), size * 0.43, -size * (0.34 - index * 0.1));
    context.stroke();
  }
}

function drawSpearStamp(context, size) {
  context.beginPath();
  context.moveTo(-size * 0.42, size * 0.37);
  context.lineTo(size * 0.29, -size * 0.3);
  context.stroke();
  context.beginPath();
  context.moveTo(size * 0.18, -size * 0.34);
  context.lineTo(size * 0.46, -size * 0.47);
  context.lineTo(size * 0.34, -size * 0.18);
  context.closePath();
  context.fill();
}

function drawArrowStamp(context, size) {
  context.beginPath();
  context.moveTo(-size * 0.44, size * 0.18);
  context.lineTo(size * 0.32, -size * 0.2);
  context.stroke();
  context.beginPath();
  context.moveTo(size * 0.18, -size * 0.32);
  context.lineTo(size * 0.46, -size * 0.27);
  context.lineTo(size * 0.31, -size * 0.03);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(-size * 0.33, size * 0.13);
  context.lineTo(-size * 0.42, -size * 0.02);
  context.moveTo(-size * 0.3, size * 0.1);
  context.lineTo(-size * 0.25, size * 0.28);
  context.stroke();
}

function drawRingStamp(context, size) {
  context.lineWidth = Math.max(2, size * 0.055);
  context.beginPath();
  context.ellipse(0, 0, size * 0.43, size * 0.25, -0.12, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 0.5;
  context.beginPath();
  context.ellipse(0, 0, size * 0.29, size * 0.16, -0.12, 0, Math.PI * 2);
  context.stroke();
}

function drawInkBurstStamp(context, size) {
  const rays = [0, 0.52, 1.18, 1.9, 2.54, 3.14, 3.8, 4.45, 5.12, 5.72];
  for (const angle of rays) {
    const inner = size * 0.12;
    const outer = size * (0.3 + (Math.sin(angle * 7) + 1) * 0.08);
    context.lineWidth = Math.max(2, size * 0.045);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }
  context.beginPath();
  context.arc(0, 0, size * 0.14, 0, Math.PI * 2);
  context.fill();
}

function drawSmokeStamp(context, size) {
  context.globalAlpha = 0.42;
  for (const [x, y, radius] of [[-0.25, 0.12, 0.22], [0, -0.06, 0.3], [0.25, 0.1, 0.2], [0.08, 0.24, 0.22]]) {
    context.beginPath();
    context.arc(x * size, y * size, radius * size, 0, Math.PI * 2);
    context.fill();
  }
}

function drawWaterStamp(context, size) {
  for (let row = -1; row <= 1; row += 1) {
    context.globalAlpha = 1 - Math.abs(row) * 0.25;
    context.beginPath();
    context.moveTo(-size * 0.45, row * size * 0.18);
    context.bezierCurveTo(-size * 0.23, -size * 0.12 + row * size * 0.18, -size * 0.05, size * 0.12 + row * size * 0.18, size * 0.14, row * size * 0.18);
    context.bezierCurveTo(size * 0.28, -size * 0.1 + row * size * 0.18, size * 0.38, -size * 0.06 + row * size * 0.18, size * 0.45, row * size * 0.18);
    context.stroke();
  }
}

function drawSparkStamp(context, size) {
  const rays = 8;
  for (let index = 0; index < rays; index += 1) {
    const angle = index / rays * Math.PI * 2;
    context.lineWidth = index % 2 ? Math.max(2, size * 0.03) : Math.max(2, size * 0.055);
    context.beginPath();
    context.moveTo(Math.cos(angle) * size * 0.09, Math.sin(angle) * size * 0.09);
    context.lineTo(Math.cos(angle) * size * (index % 2 ? 0.28 : 0.44), Math.sin(angle) * size * (index % 2 ? 0.28 : 0.44));
    context.stroke();
  }
}

function pointFromEvent(event) {
  const rect = objectCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (objectCanvas.width / rect.width),
    y: (event.clientY - rect.top) * (objectCanvas.height / rect.height)
  };
}

function dropLibraryAsset(event) {
  event.preventDefault();
  objectCanvas.classList.remove("drop-target");
  const assetId = event.dataTransfer.getData("application/x-jieting-asset") || event.dataTransfer.getData("text/plain");
  const asset = allLibraryAssets().find((item) => item.id === assetId);
  if (!asset) return;
  const source = asset.dataUrl ?? asset.path;
  if (!source) return;
  pushUndo();
  const object = {
    id: crypto.randomUUID(), kind: "image", label: asset.name, assetId: asset.id,
    layer: asset.type === "effect" ? "fx" : asset.type === "drawn" ? "ink" : "accent",
    src: source,
    frame: asset.frameWidth && asset.frameHeight ? [0, 0, asset.frameWidth, asset.frameHeight] : null,
    x: pointFromEvent(event).x, y: pointFromEvent(event).y,
    size: Number(stampSize.value) || 128, scale: 1, rotation: 0, opacity: 1
  };
  editableObjects.push(object);
  selectOnlyObject(object.id);
  selectLayer(object.layer);
  setTool("select");
  preloadObjectSource(object.assetId, source);
  renderEditableObjects();
  updateObjectInspector();
  updatePreview();
}

function pushUndo() {
  undoStack.push({
    layerId: activeLayerId,
    imageData: activeCtx().getImageData(0, 0, activeCanvas().width, activeCanvas().height),
    objects: structuredClone(editableObjects),
    selectedObjectId,
    selectedObjectIds: [...selectedObjectIds]
  });
  if (undoStack.length > 32) undoStack.shift();
}

function undo() {
  const previous = undoStack.pop();
  if (!previous) return;
  const canvas = layerCanvases.get(previous.layerId);
  canvas.getContext("2d").putImageData(previous.imageData, 0, 0);
  editableObjects = previous.objects ?? editableObjects;
  selectedObjectId = previous.selectedObjectId ?? null;
  selectedObjectIds = new Set(previous.selectedObjectIds ?? (selectedObjectId ? [selectedObjectId] : []));
  renderEditableObjects();
  updateObjectInspector();
  updatePreview();
}

function clearActiveLayer() {
  pushUndo();
  activeCtx().clearRect(0, 0, activeCanvas().width, activeCanvas().height);
  editableObjects = editableObjects.filter((object) => object.layer !== activeLayerId);
  selectedObjectIds = new Set([...selectedObjectIds].filter((id) => editableObjects.some((object) => object.id === id)));
  if (!selectedObjectIds.has(selectedObjectId)) selectedObjectId = [...selectedObjectIds].at(-1) ?? null;
  localStorage.removeItem(storageKey(selected[1], activeLayerId));
  localStorage.removeItem(renderedStorageKey(selected[1], activeLayerId));
  renderEditableObjects();
  updateObjectInspector();
  renderGlyphList();
  updatePreview();
  updateManifestPreview();
}

function clearAllLayerCanvases() {
  formationBaseCtx.clearRect(0, 0, formationBaseCanvas.width, formationBaseCanvas.height);
  for (const canvas of layerCanvases.values()) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.remove("hidden");
  }
  editableObjects = [];
  selectOnlyObject(null);
  renderEditableObjects();
  updateObjectInspector();
}

function saveCurrent({ refresh = true } = {}) {
  if (sourceAsset) {
    localStorage.setItem(`${STORAGE_PREFIX}source.${sourceAsset.id}`, JSON.stringify({
      assetId: sourceAsset.id,
      actorType: actorTypeFromMode(animationMode.value),
      clips: timelineState.clips
    }));
    updateManifestPreview();
    return;
  }
  for (const layer of LAYERS) {
    const canvas = layerCanvases.get(layer.id);
    const layerObjects = editableObjects.filter((object) => object.layer === layer.id);
    const hasDerivedBase = layer.id === "ink" && selected[2] === "generalFormation" && !isCanvasEmpty(formationBaseCanvas);
    const empty = isCanvasEmpty(canvas) && layerObjects.length === 0 && !hasDerivedBase;
    if (isCanvasEmpty(canvas)) localStorage.removeItem(storageKey(selected[1], layer.id));
    else localStorage.setItem(storageKey(selected[1], layer.id), canvas.toDataURL("image/png"));
    if (empty) localStorage.removeItem(renderedStorageKey(selected[1], layer.id));
    else localStorage.setItem(renderedStorageKey(selected[1], layer.id), compositeLayerCanvas(layer.id).toDataURL("image/png"));
  }
  localStorage.setItem(metaKey(selected[1]), JSON.stringify({
    animationMode: animationMode.value,
    clips: timelineState.clips,
    objects: editableObjects
  }));
  if (refresh) renderGlyphList();
  for (const button of glyphList.querySelectorAll(".glyph-button")) button.classList.toggle("active", button.dataset.key === selected[1]);
  updateManifestPreview();
  if (refresh) {
    renderAssetLibrary();
    renderStateMatrix();
  }
}

function loadSavedLayers(key) {
  const meta = safeJson(localStorage.getItem(metaKey(key)));
  if (meta?.animationMode) animationMode.value = meta.animationMode;
  for (const layer of LAYERS) {
    const dataUrl = localStorage.getItem(storageKey(key, layer.id));
    if (!dataUrl) continue;
    const image = new Image();
    image.onload = () => {
      const canvas = layerCanvases.get(layer.id);
      canvas.getContext("2d").drawImage(image, 0, 0);
      updatePreview();
    };
    image.src = dataUrl;
  }
}

function loadSavedObjects(key) {
  const meta = safeJson(localStorage.getItem(metaKey(key))) ?? {};
  editableObjects = Array.isArray(meta.objects) ? meta.objects : [];
  selectOnlyObject(null);
  renderEditableObjects();
  updateObjectInspector();
}

function updatePreview() {
  drawPreview(previewLarge);
  drawPreview(previewSmall);
}

function drawPreview(target) {
  const previewCtx = target.getContext("2d");
  previewCtx.clearRect(0, 0, target.width, target.height);
  previewCtx.fillStyle = "#fff8e8";
  previewCtx.fillRect(0, 0, target.width, target.height);
  previewCtx.strokeStyle = "rgba(86, 58, 38, 0.28)";
  previewCtx.lineWidth = 2;
  previewCtx.strokeRect(1, 1, target.width - 2, target.height - 2);
  const composite = compositeCanvas();
  const pad = target.width * 0.12;
  const availableWidth = target.width - pad * 2;
  const availableHeight = target.height - pad * 2;
  const scale = Math.min(availableWidth / composite.width, availableHeight / composite.height);
  const width = composite.width * scale;
  const height = composite.height * scale;
  previewCtx.drawImage(composite, (target.width - width) / 2, (target.height - height) / 2, width, height);
}

function loadReference() {
  const file = referenceInput.files?.[0];
  if (!file) return;
  const image = new Image();
  image.onload = () => {
    referenceCtx.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height);
    const scale = Math.min(referenceCanvas.width / image.width, referenceCanvas.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    referenceCtx.drawImage(image, (referenceCanvas.width - w) / 2, (referenceCanvas.height - h) / 2, w, h);
  };
  image.src = URL.createObjectURL(file);
}

function exportCompositePng() {
  saveCurrent();
  downloadDataUrl(compositeCanvas().toDataURL("image/png"), `${selected[1]}_composite.png`);
}

function buildActorPack() {
  const glyphs = {};
  const sourceOverrides = {};
  for (const asset of ASSETS) {
    const override = safeJson(localStorage.getItem(`${STORAGE_PREFIX}source.${asset.id}`));
    if (override) sourceOverrides[asset.id] = override;
  }
  for (const [glyph, key, catalogType, members] of GLYPHS) {
    const actorSpan = catalogType === "generalFormation" ? members.length : 1;
    const layers = {};
    for (const layer of LAYERS) {
      const dataUrl = localStorage.getItem(renderedStorageKey(key, layer.id)) ?? localStorage.getItem(storageKey(key, layer.id));
      if (!dataUrl) continue;
      layers[layer.id] = {
        label: layer.label,
        role: layer.role,
        animation: layer.animation,
        file: `${key}_${layer.id}.png`,
        width: 512 * actorSpan,
        height: 512,
        dataUrl
      };
    }
    const meta = safeJson(localStorage.getItem(metaKey(key))) ?? {};
    const states = stateMatrixForActor(catalogType, Object.keys(meta.clips ?? {}));
    glyphs[key] = {
      glyph,
      token: key,
      actorType: catalogType,
      stateProfile: catalogType,
      members: members.map((member) => GLYPH_ACTORS[member]?.id ?? member),
      span: members.length,
      neutralSource: catalogType === "generalFormation" ? "composeMembers" : "layer.ink",
      states,
      compositeFile: `${key}_composite.png`,
      animationMode: meta.animationMode ?? "card",
      pivot: { x: 256 * actorSpan, y: 300 },
      bounds: { x: 48, y: 48, width: 512 * actorSpan - 96, height: 416 },
      clips: meta.clips ?? {},
      objects: meta.objects ?? [],
      layers
    };
  }
  return {
    version: 4,
    format: "jieting-actor-animation-pack",
    assetRevision: Date.now(),
    canvas: { width: 512, height: 512, safePadding: 48 },
    layerOrder: LAYERS.map((layer) => layer.id),
    animationContract: {
      ink: "body: scale, squash, hit flash, attack offset",
      accent: "ornament: follows ink with 1-2 frame lag",
      shadow: "smear: low alpha drag and impact echo",
      fx: "effect: additive pulse and glow",
      clips: "shared actor clips: idle, attack, hit, death, skill",
      keyframes: "layer transform keys with linear, easeInOut or step interpolation"
    },
    actors: glyphs,
    recipes: FORMATION_RECIPES,
    legacyAliases: LEGACY_ACTOR_ALIASES,
    sourceStructures: SOURCE_STRUCTURES,
    sourceDisplayPolicy: SOURCE_DISPLAY_POLICY,
    sourceOverrides
  };
}

async function exportGlyphPack() {
  const originalLabel = exportPack.textContent;
  exportPack.disabled = true;
  exportPack.textContent = "正在打包…";
  try {
    saveCurrent();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const pack = buildActorPack();
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    downloadObjectUrl(URL.createObjectURL(blob), "jieting-actor-animation-pack.json");
    exportPack.textContent = `已开始下载 · ${Math.max(1, Math.round(blob.size / 1024))}KB`;
    updateManifestPreview();
  } catch (error) {
    console.error("Actor pack export failed", error);
    exportPack.textContent = "导出失败，请重试";
  } finally {
    setTimeout(() => {
      exportPack.disabled = false;
      exportPack.textContent = originalLabel;
    }, 3200);
  }
}

async function writeActorPackToProject() {
  const originalLabel = saveProjectPack.textContent;
  saveProjectPack.disabled = true;
  saveProjectPack.textContent = "正在写入…";
  try {
    saveCurrent();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const response = await fetch(`${BASE_URL}__jieting/save-actor-pack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildActorPack())
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
    saveProjectPack.textContent = `已写入 · ${result.actorsSaved}项/${result.layersSaved}图层`;
    updateManifestPreview();
  } catch (error) {
    console.error("Writing actor pack to project failed", error);
    saveProjectPack.textContent = error.message.includes("404") ? "服务未更新，请刷新" : "写入失败，请重试";
  } finally {
    setTimeout(() => {
      saveProjectPack.disabled = false;
      saveProjectPack.textContent = originalLabel;
    }, 4200);
  }
}

function updateManifestPreview() {
  const saved = GLYPHS
    .filter(([, key]) => hasSavedGlyph(key))
    .map(([glyph, key]) => ({
      glyph,
      key,
      animationMode: safeJson(localStorage.getItem(metaKey(key)))?.animationMode ?? "card",
      clips: Object.keys(safeJson(localStorage.getItem(metaKey(key)))?.clips ?? {}),
      layers: LAYERS.filter((layer) => localStorage.getItem(storageKey(key, layer.id))).map((layer) => layer.id)
    }));
  const active = LAYERS.find((layer) => layer.id === activeLayerId);
  const editedSources = ASSETS
    .map((asset) => safeJson(localStorage.getItem(`${STORAGE_PREFIX}source.${asset.id}`)))
    .filter(Boolean)
    .map((item) => ({ assetId: item.assetId, actorType: item.actorType, clips: Object.keys(item.clips ?? {}) }));
  manifestPreview.value = JSON.stringify({
    targetDir: "public/handdrawn-glyphs",
    width: 512,
    height: 512,
    safePadding: 48,
    activeLayer: active,
    saved,
    editedSources
  }, null, 2);
}

function compositeCanvas() {
  const output = document.createElement("canvas");
  output.width = activeCanvas().width;
  output.height = activeCanvas().height;
  const outputCtx = output.getContext("2d");
  if (selected[2] === "generalFormation") outputCtx.drawImage(formationBaseCanvas, 0, 0);
  for (const layer of LAYERS) {
    const canvas = layerCanvases.get(layer.id);
    if (!canvas || canvas.classList.contains("hidden")) continue;
    outputCtx.drawImage(canvas, 0, 0);
    for (const object of editableObjects.filter((item) => item.layer === layer.id)) drawEditableObject(outputCtx, object);
  }
  return output;
}

function compositeLayerCanvas(layerId) {
  const output = document.createElement("canvas");
  output.width = activeCanvas().width;
  output.height = activeCanvas().height;
  const context = output.getContext("2d");
  if (layerId === "ink" && selected[2] === "generalFormation") context.drawImage(formationBaseCanvas, 0, 0);
  const canvas = layerCanvases.get(layerId);
  if (canvas) context.drawImage(canvas, 0, 0);
  for (const object of editableObjects.filter((item) => item.layer === layerId)) drawEditableObject(context, object);
  return output;
}

function activeCanvas() {
  return layerCanvases.get(activeLayerId);
}

function activeCtx() {
  return activeCanvas().getContext("2d");
}

function isCanvasEmpty(canvas) {
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadObjectUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function hasSavedGlyph(key) {
  const meta = safeJson(localStorage.getItem(metaKey(key)));
  return LAYERS.some((layer) => Boolean(localStorage.getItem(storageKey(key, layer.id)) || localStorage.getItem(renderedStorageKey(key, layer.id)))) || Boolean(meta?.objects?.length);
}

function storageKey(key, layerId) {
  return `${STORAGE_PREFIX}${key}.${layerId}`;
}

function renderedStorageKey(key, layerId) {
  return `${STORAGE_PREFIX}${key}.${layerId}.rendered`;
}

function metaKey(key) {
  return `${STORAGE_PREFIX}${key}.meta`;
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function actorTypeFromMode(mode) {
  return ({ card: "glyph", general: "general", enemy: "enemy", terrain: "terrain", weapon: "prop" })[mode] ?? "glyph";
}

init();
