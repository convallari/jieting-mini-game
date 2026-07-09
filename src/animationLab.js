import { combinePoses, getHanziAsset, sampleMotion } from "./hanziAssets.js";
import { REFERENCE_GLYPHS } from "./referenceGlyphManifest.js";
import { drawVectorHanzi } from "./vectorHanzi.js";

const GLYPH_KIND = {
  qiang: "stab",
  dao: "melee",
  gong: "arrow",
  qi: "dash"
};

const state = {
  glyph: "qiang",
  frame: 0,
  playing: true,
  lastTick: 0,
  manifest: null,
  images: new Map()
};

const refCanvas = document.getElementById("reference");
const refCtx = refCanvas.getContext("2d");
const candidateCanvas = document.getElementById("candidate");
const candidateCtx = candidateCanvas.getContext("2d");
const frameInput = document.getElementById("frame");
const frameLabel = document.getElementById("frameLabel");
const playButton = document.getElementById("play");
const sourceText = document.getElementById("source");
const noteText = document.getElementById("note");
const contactImage = document.getElementById("contact");
const glyphButtons = [...document.querySelectorAll("[data-glyph]")];

init();

async function init() {
  state.manifest = REFERENCE_GLYPHS;
  for (const [key, item] of Object.entries(state.manifest.glyphs)) {
    state.images.set(key, await loadReferenceImage(item.sheet));
  }
  bindEvents();
  selectGlyph(state.glyph);
  requestAnimationFrame(tick);
}

function bindEvents() {
  for (const button of glyphButtons) {
    button.addEventListener("click", () => selectGlyph(button.dataset.glyph));
  }
  frameInput.addEventListener("input", () => {
    state.frame = Number(frameInput.value);
    state.playing = false;
    playButton.textContent = "播放";
    render();
  });
  playButton.addEventListener("click", () => {
    state.playing = !state.playing;
    playButton.textContent = state.playing ? "暂停" : "播放";
  });
}

function selectGlyph(key) {
  state.glyph = key;
  state.frame = 0;
  frameInput.value = "0";
  for (const button of glyphButtons) button.classList.toggle("active", button.dataset.glyph === key);
  const item = currentItem();
  frameInput.max = String(item.frames - 1);
  sourceText.textContent = `来源：${item.source}，裁剪 ${item.crop.join(", ")}，${item.frames} 帧 @ ${state.manifest.fps}fps`;
  noteText.textContent = item.note;
  setReferenceImage(contactImage, item.contact);
  render();
}

function currentItem() {
  return state.manifest.glyphs[state.glyph];
}

function tick(now) {
  const item = currentItem();
  if (state.playing && now - state.lastTick > 1000 / state.manifest.fps) {
    state.frame = (state.frame + 1) % item.frames;
    frameInput.value = String(state.frame);
    state.lastTick = now;
    render();
  }
  requestAnimationFrame(tick);
}

function render() {
  const item = currentItem();
  const progress = item.frames <= 1 ? 0 : state.frame / (item.frames - 1);
  frameLabel.textContent = `f${String(state.frame + 1).padStart(3, "0")}`;
  drawReference(item);
  drawCandidate(item, progress);
}

function drawReference(item) {
  clear(refCtx);
  const image = state.images.get(state.glyph);
  const sx = state.frame * item.frameWidth;
  const scale = Math.min(refCanvas.width * 0.76 / item.frameWidth, refCanvas.height * 0.76 / item.frameHeight);
  const w = item.frameWidth * scale;
  const h = item.frameHeight * scale;
  const x = (refCanvas.width - w) / 2;
  const y = (refCanvas.height - h) / 2;
  refCtx.imageSmoothingEnabled = false;
  refCtx.drawImage(image, sx, 0, item.frameWidth, item.frameHeight, x, y, w, h);
  drawFrameMark(refCtx, item.label, state.frame + 1);
}

function drawCandidate(item, progress) {
  clear(candidateCtx);
  const label = item.label;
  const asset = getHanziAsset(label);
  const idlePose = sampleMotion(asset, "idle", 0.18);
  const actionPose = sampleMotion(asset, "attack", progress);
  const pose = combinePoses(idlePose, actionPose);
  const size = 196;
  const cx = candidateCanvas.width / 2;
  const cy = candidateCanvas.height / 2;
  const x = cx - size / 2;
  const y = cy - size / 2;

  candidateCtx.save();
  candidateCtx.shadowColor = "rgba(0,0,0,0.14)";
  candidateCtx.shadowBlur = 7;
  candidateCtx.shadowOffsetY = 3;
  candidateCtx.fillStyle = asset.paper ?? "#faf5e9";
  roundRect(candidateCtx, x, y, size, size, 8, true, false);
  candidateCtx.strokeStyle = asset.border ?? "#756b61";
  candidateCtx.lineWidth = 4;
  roundRect(candidateCtx, x, y, size, size, 8, false, true);
  candidateCtx.restore();

  const glyphCx = cx + pose.x + pose.glyphX;
  const glyphCy = cy + pose.y + size * asset.baseline + pose.glyphY;
  const attack = Math.sin(progress * Math.PI);
  const glyphPose = {
    scaleX: pose.scaleX * pose.glyphScaleX,
    scaleY: pose.scaleY * pose.glyphScaleY,
    skewX: pose.skewX + pose.glyphSkewX,
    rotate: asset.tilt + pose.rotate + pose.glyphRotate,
    jitter: 0,
    stroke: "rgba(255,255,255,0.18)",
    action: "attack",
    actionProgress: progress,
    attack
  };

  candidateCtx.save();
  candidateCtx.translate(glyphCx, glyphCy);
  candidateCtx.transform(glyphPose.scaleX, 0, glyphPose.skewX, glyphPose.scaleY, 0, 0);
  candidateCtx.rotate(glyphPose.rotate);
  drawVectorHanzi(candidateCtx, label, size * asset.fontScale, asset.ink, glyphPose);
  candidateCtx.restore();

  drawAttackOverlay(candidateCtx, label, cx, cy, size, progress, GLYPH_KIND[state.glyph]);
  drawLevel(candidateCtx, x + size - 28, y + 28);
  drawFrameMark(candidateCtx, label, state.frame + 1);
}

function drawAttackOverlay(ctx, glyph, cx, cy, size, progress, kind) {
  const k = clamp01(progress);
  const flash = Math.sin(Math.PI * k);
  if (flash <= 0.02) return;
  const sweep = easeOutCubic(Math.min(1, k * 1.2));
  const x = cx - size / 2;
  const y = cy - size / 2;
  const cover = 1 - smoothstep(0.54, 0.78, k);
  const release = band(k, 0.5, 0.86);

  ctx.save();
  ctx.globalAlpha = 0.12 + flash * 0.38;
  line(ctx, x + size * 0.06, y + size * (0.8 - sweep * 0.06), x + size * 0.9, y + size * (0.78 + sweep * 0.015), "#e5c236", Math.max(2, size * 0.05));
  line(ctx, x + size * 0.1, y + size * (0.84 - sweep * 0.05), x + size * 0.72, y + size * 0.81, "rgba(255,247,198,0.78)", Math.max(1, size * 0.016));
  ctx.restore();

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "stab") {
    ctx.globalAlpha = Math.max(0, cover) * 0.86;
    line(ctx, x - size * 0.12 + sweep * size * 0.1, y + size * 0.43, x + size * (0.72 + sweep * 0.1), y + size * 0.28, "#15110f", Math.max(3, size * 0.095));
    line(ctx, x + size * 0.02 + sweep * size * 0.08, y + size * 0.54, x + size * (0.78 + sweep * 0.08), y + size * 0.39, "#15110f", Math.max(2, size * 0.052));
    ctx.globalAlpha = release * 0.42;
    line(ctx, x + size * 0.1, y + size * 0.5, x + size * 0.9, y + size * 0.34, "rgba(255,247,220,0.88)", Math.max(1, size * 0.018));
  } else if (kind === "dash") {
    ctx.globalAlpha = flash * 0.72;
    for (let i = 0; i < 3; i++) {
      const off = i * size * 0.13;
      const y0 = y + size * (0.28 + i * 0.08);
      line(ctx, x - size * 0.08 + off + sweep * size * 0.18, y0, x + size * (0.72 + i * 0.06), y0 - size * (0.08 + i * 0.015), "#16110f", Math.max(2, size * (0.072 - i * 0.012)));
    }
  } else if (kind === "arrow" || glyph === "弓") {
    ctx.globalAlpha = flash * 0.46;
    ctx.strokeStyle = "#15110f";
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + size * (0.12 + sweep * 0.08), y + size * 0.64);
    ctx.quadraticCurveTo(x + size * 0.33, y + size * (0.14 + 0.07 * flash), x + size * (0.72 + sweep * 0.09), y + size * 0.28);
    ctx.stroke();
    line(ctx, x + size * 0.18, y + size * 0.58, x + size * 0.84, y + size * (0.42 - sweep * 0.06), "#15110f", Math.max(2, size * 0.034));
  } else {
    ctx.globalAlpha = flash * 0.52;
    line(ctx, x + size * (0.42 + sweep * 0.06), y + size * 0.72, x + size * (0.86 + sweep * 0.04), y + size * 0.3, "#15110f", Math.max(3, size * 0.07));
    line(ctx, x + size * (0.54 + sweep * 0.04), y + size * 0.78, x + size * (0.82 + sweep * 0.04), y + size * 0.48, "#15110f", Math.max(2, size * 0.038));
  }
  ctx.restore();
}

function clear(ctx) {
  const { canvas } = ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#f8f2e7");
  gradient.addColorStop(1, "#ded4c0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFrameMark(ctx, label, frame) {
  ctx.save();
  ctx.fillStyle = "rgba(39,30,25,0.86)";
  ctx.font = "900 22px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${label} f${String(frame).padStart(3, "0")}`, 16, 14);
  ctx.restore();
}

function drawLevel(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = "#14100e";
  ctx.font = "900 27px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("2", x, y);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function line(ctx, x1, y1, x2, y2, color, width) {
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadReferenceImage(fileName) {
  const candidates = [`/reference-glyphs/${fileName}`, `/public/reference-glyphs/${fileName}`];
  let lastError = null;
  for (const src of candidates) {
    try {
      return await loadImage(src);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function setReferenceImage(image, fileName) {
  const candidates = [`/reference-glyphs/${fileName}`, `/public/reference-glyphs/${fileName}`];
  let index = 0;
  image.onerror = () => {
    index += 1;
    if (index < candidates.length) image.src = candidates[index];
  };
  image.src = candidates[index];
}

function band(value, start, end) {
  if (value <= start || value >= end) return 0;
  return Math.sin(((value - start) / (end - start)) * Math.PI);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
