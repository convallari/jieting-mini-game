const GLYPHS = {
  dao: {
    label: "刀", frames: 19, width: 120, height: 129, sheet: "./original-glyphs/dao-attack-sheet.png", contact: "./review-contacts/dao-attack-contact.png",
    phases: [
      [0, 2, "准备", "保持清晰的‘刀’字，只有轻微预备变化。"],
      [3, 10, "挥刀", "字形向右折转再竖起，主要笔势承担挥砍动作。"],
      [11, 13, "刀光", "黄色刀光出现并穿过字形，这是攻击命中的视觉峰值。"],
      [14, 18, "收刀", "刀光消失，字形快速回到初始姿势。"]
    ]
  },
  gong: {
    label: "弓", frames: 30, width: 74, height: 95, sheet: "./original-glyphs/gong-attack-sheet.png", contact: "./review-contacts/gong-attack-contact.png",
    phases: [
      [0, 4, "准备", "弓字保持竖直，逐渐向右下倾斜。"],
      [5, 9, "压弓", "字形压低并横向展开，蓄力感开始形成。"],
      [10, 17, "满弓", "中心竖笔升起、弓弦下拉，形成最明显的张弓姿态。"],
      [18, 23, "释放", "竖笔收回，弓弦反弹并变成扁平弧形。"],
      [24, 29, "回弹", "字形从横向姿势重新竖起，回到待机帧。"]
    ]
  },
  qiang: {
    label: "枪", frames: 24, width: 224, height: 224, sheet: "./original-glyphs/qiang-full-review-sheet.png", contact: "./review-contacts/qiang-full-review-contact.png",
    phases: [
      [0, 7, "起势", "木与仓共同移动，完整字形向攻击方向蓄力。"],
      [8, 13, "突刺", "左右部件同步拉伸和转向，形成快速刺击。"],
      [14, 18, "横扫", "完整枪字压低并回摆，攻击遮挡线达到峰值。"],
      [19, 23, "回正", "木与仓一起恢复到竖直待机姿势。"]
    ]
  },
  qi: {
    label: "骑", frames: 19, width: 263, height: 294, sheet: "./original-glyphs/qi-attack-sheet.png", contact: "./review-contacts/qi-attack-contact.png",
    phases: [
      [0, 6, "冲刺准备", "骑字保持稳定，右侧细长速度线逐步变化。"],
      [7, 9, "起步", "攻击线转向，字形开始沿圆弧冲出。"],
      [10, 12, "回旋", "大面积灰色圆弧包围字形，是整段动作的视觉峰值。"],
      [13, 17, "收势", "圆弧移到下方并淡出，骑字重新回正。"],
      [18, 18, "待机", "回到清晰的初始骑字。"]
    ]
  }
};

const state = { key: "dao", frame: 0, playing: true, fps: 18, last: 0 };
const images = new Map();
const canvas = document.querySelector("#preview");
const ctx = canvas.getContext("2d");
const tabs = document.querySelector("#glyphTabs");
const slider = document.querySelector("#frame");
const play = document.querySelector("#play");
const fps = document.querySelector("#fps");

for (const [key, glyph] of Object.entries(GLYPHS)) {
  const button = document.createElement("button");
  button.textContent = glyph.label;
  button.dataset.key = key;
  button.addEventListener("click", () => selectGlyph(key));
  tabs.append(button);
}

play.addEventListener("click", () => {
  state.playing = !state.playing;
  play.textContent = state.playing ? "暂停" : "播放";
});
slider.addEventListener("input", () => {
  state.frame = Number(slider.value);
  state.playing = false;
  play.textContent = "播放";
  render();
});
fps.addEventListener("change", () => state.fps = Number(fps.value));

function selectGlyph(key) {
  state.key = key;
  state.frame = 0;
  slider.max = String(GLYPHS[key].frames - 1);
  slider.value = "0";
  for (const button of tabs.querySelectorAll("button")) button.classList.toggle("active", button.dataset.key === key);
  document.querySelector("#contact").src = GLYPHS[key].contact;
  renderPhaseList();
  loadImage(key).then(render);
}

function loadImage(key) {
  if (images.has(key)) return images.get(key);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = GLYPHS[key].sheet;
  });
  images.set(key, promise);
  return promise;
}

function phaseAt(glyph, frame) {
  return glyph.phases.find(([start, end]) => frame >= start && frame <= end) ?? glyph.phases[0];
}

function renderPhaseList() {
  const glyph = GLYPHS[state.key];
  document.querySelector("#phaseList").innerHTML = glyph.phases.map(([start, end, name, note]) =>
    `<article data-start="${start}" data-end="${end}"><b>f${String(start).padStart(2, "0")}–f${String(end).padStart(2, "0")} · ${name}</b><p>${note}</p></article>`
  ).join("");
}

async function render() {
  const glyph = GLYPHS[state.key];
  const image = await loadImage(state.key);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f6efdf";
  roundRect(ctx, 48, 48, 324, 324, 20);
  ctx.fill();
  ctx.strokeStyle = "#776658";
  ctx.lineWidth = 4;
  ctx.stroke();
  const max = 270;
  const scale = Math.min(max / glyph.width, max / glyph.height);
  const w = glyph.width * scale;
  const h = glyph.height * scale;
  ctx.drawImage(image, state.frame * glyph.width, 0, glyph.width, glyph.height, 210 - w / 2, 210 - h / 2, w, h);
  const phase = phaseAt(glyph, state.frame);
  document.querySelector("#frameLabel").textContent = `f${String(state.frame).padStart(2, "0")}`;
  document.querySelector("#phaseLabel").textContent = `${glyph.label} · ${phase[2]}`;
  document.querySelector("#phaseNote").textContent = phase[3];
  slider.value = String(state.frame);
  for (const item of document.querySelectorAll("#phaseList article")) {
    item.classList.toggle("active", state.frame >= Number(item.dataset.start) && state.frame <= Number(item.dataset.end));
  }
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

function tick(now) {
  if (state.playing && now - state.last >= 1000 / state.fps) {
    state.frame = (state.frame + 1) % GLYPHS[state.key].frames;
    state.last = now;
    render();
  }
  requestAnimationFrame(tick);
}

selectGlyph("dao");
requestAnimationFrame(tick);
