import { REFERENCE_GLYPHS } from "./referenceGlyphManifest.js";

const state = {
  glyph: "qiang",
  frame: 0,
  playing: true,
  lastTick: 0,
  manifest: null,
  images: new Map()
};
const BASE_URL = import.meta.env.BASE_URL || "/";

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
  frameLabel.textContent = `f${String(state.frame + 1).padStart(3, "0")}`;
  drawReference(item);
  drawCandidate(item);
}

function drawReference(item) {
  clear(refCtx);
  drawSpriteFrame(refCtx, item, 0.76);
  drawFrameMark(refCtx, item.label, state.frame + 1);
}

function drawCandidate(item) {
  clear(candidateCtx);
  drawSpriteFrame(candidateCtx, item, 0.76);
  drawFrameMark(candidateCtx, item.label, state.frame + 1);
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

function drawSpriteFrame(ctx, item, canvasFill) {
  const image = state.images.get(state.glyph);
  const sx = state.frame * item.frameWidth;
  const scale = Math.min(ctx.canvas.width * canvasFill / item.frameWidth, ctx.canvas.height * canvasFill / item.frameHeight);
  const w = item.frameWidth * scale;
  const h = item.frameHeight * scale;
  const x = (ctx.canvas.width - w) / 2;
  const y = (ctx.canvas.height - h) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, 0, item.frameWidth, item.frameHeight, x, y, w, h);
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadReferenceImage(fileName) {
  const candidates = assetCandidates(fileName);
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
  const candidates = assetCandidates(fileName);
  let index = 0;
  image.onerror = () => {
    index += 1;
    if (index < candidates.length) image.src = candidates[index];
  };
  image.src = candidates[index];
}

function assetCandidates(fileName) {
  return [
    `${BASE_URL}reference-glyphs/${fileName}`,
    `${BASE_URL}public/reference-glyphs/${fileName}`,
    `/reference-glyphs/${fileName}`,
    `/public/reference-glyphs/${fileName}`
  ];
}
