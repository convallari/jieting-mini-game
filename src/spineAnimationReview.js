const characters = {
  zhaoYun: { label: "赵云", scale: 165, animations: ["attack1", "attack2", "attack4", "shouye", "zhan1", "zhan2"] },
  zhangFei: { label: "张飞", scale: 165, animations: ["attack1", "attack2", "zhan1", "zhan2"] },
  maChao: { label: "马超", scale: 165, animations: ["attack1", "attack2", "zhan1", "zhan2"] },
  aDou: { label: "阿斗", scale: 135, defaultSkin: true, animations: ["attack", "dakai", "dou", "hejiu", "pao", "tu", "zhan", "zhan2"] },
  thief: { label: "小兵", scale: 120, defaultSkin: true, animations: ["animation", "animation2", "animation3", "die"] },
  boss0: { label: "首领·一", scale: 78, defaultSkin: true, animations: ["attackbao", "attackjiao", "attackliang", "gobao", "gojiao", "goliang"] },
  boss1: { label: "首领·二", scale: 78, defaultSkin: true, animations: ["attackdiao", "attackxiang", "attackzhen", "godiao", "goxiang", "gozhen"] },
  boss2: { label: "首领·三", scale: 78, defaultSkin: true, animations: ["attackcao", "attackdian", "attackdun", "gocao", "godian", "godian2", "goxia"] },
  huaXiong: { label: "华雄", scale: 90, defaultSkin: true, animations: ["gohx", "attackhx"] },
  lvBu: { label: "吕布", scale: 90, defaultSkin: true, animations: ["golvbu", "attacklvbu"] },
  dongZhuo: { label: "董卓", scale: 90, defaultSkin: true, animations: ["godz", "attackdz", "attack2dz"] },
  dancer: { label: "舞姬", scale: 110, defaultSkin: true, animations: ["animation"] }
};

const query = new URLSearchParams(location.search);
if (query.get("embed") === "1") document.body.classList.add("embed");

const characterSelect = document.querySelector("#character");
const animationSelect = document.querySelector("#animation");
const skinSelect = document.querySelector("#skin");
const scaleInput = document.querySelector("#scale");
const status = document.querySelector("#status");
const wrap = document.querySelector("#stage-wrap");
let skeleton;
let requestId = 0;

for (const [value, item] of Object.entries(characters)) characterSelect.add(new Option(item.label, value));

function fillAnimations() {
  animationSelect.replaceChildren(...characters[characterSelect.value].animations.map(name => new Option(name, name)));
}

function usesDefaultResources() {
  const item = characters[characterSelect.value];
  return Boolean(item.defaultSkin || (characterSelect.value === "zhaoYun" && animationSelect.value === "attack4"));
}

function updateSkinControl() {
  const defaultResources = usesDefaultResources();
  skinSelect.disabled = defaultResources;
  skinSelect.title = defaultResources ? "这个动作只使用原始 JSON 的 default 附件组" : "选择原游戏的卡牌等级字形";
}

function placeSkeleton() {
  if (!skeleton) return;
  skeleton.pos(Laya.stage.width * 0.5, Laya.stage.height * 0.5);
  const scale = Number(scaleInput.value) / 100;
  skeleton.scale(scale, scale);
}

function play() {
  if (!skeleton) return;
  const item = characters[characterSelect.value];
  const defaultResources = usesDefaultResources();
  if (defaultResources) skeleton.showSkinByName("default");
  else skeleton.showSkinByName(skinSelect.value);
  skeleton.play(animationSelect.value, true);
  const skinLabel = defaultResources
    ? (item.defaultSkin ? "default 附件组" : "attack4 专用 default 附件组")
    : `${skinSelect.value}级字形组`;
  status.textContent = `${item.label} · ${animationSelect.value} · ${skinLabel}（原版 Spine 时间轴）`;
}

function loadCharacter() {
  const id = ++requestId;
  status.textContent = `正在载入${characters[characterSelect.value].label}…`;
  if (skeleton) skeleton.destroy(true);
  skeleton = new Laya.SpineSkeleton();
  Laya.stage.addChild(skeleton);
  placeSkeleton();
  skeleton.once(Laya.Event.READY, null, () => {
    if (id !== requestId) return;
    placeSkeleton();
    play();
  });
  skeleton.source = `/spine-assets/${characterSelect.value}/skeleton.json?v=3`;
}

async function init() {
  const requestedCharacter = query.get("character");
  if (requestedCharacter && characters[requestedCharacter]) characterSelect.value = requestedCharacter;
  fillAnimations();
  const requestedAnimation = query.get("animation");
  if (requestedAnimation && characters[characterSelect.value].animations.includes(requestedAnimation)) animationSelect.value = requestedAnimation;
  scaleInput.value = characters[characterSelect.value].scale;
  updateSkinControl();
  await Laya.init(wrap.clientWidth, wrap.clientHeight, Laya.WebGL);
  Laya.stage.bgColor = "#eadbbd";
  Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL;
  Laya.stage.screenMode = Laya.Stage.SCREEN_NONE;
  const canvas = document.querySelector("canvas");
  wrap.appendChild(canvas);
  characterSelect.addEventListener("change", () => {
    const item = characters[characterSelect.value];
    scaleInput.value = item.scale;
    fillAnimations();
    updateSkinControl();
    loadCharacter();
  });
  animationSelect.addEventListener("change", () => { updateSkinControl(); play(); });
  skinSelect.addEventListener("change", play);
  scaleInput.addEventListener("input", placeSkeleton);
  document.querySelector("#replay").addEventListener("click", play);
  window.addEventListener("resize", placeSkeleton);
  loadCharacter();
}

init().catch(error => {
  status.textContent = `载入失败：${error.message}`;
  console.error(error);
});
