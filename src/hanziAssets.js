const POSE_KEYS = [
  "x", "y", "scaleX", "scaleY", "skewX", "rotate",
  "glyphX", "glyphY", "glyphScaleX", "glyphScaleY", "glyphSkewX", "glyphRotate",
  "glow", "alpha", "shadow"
];

const baseMotions = {
  neutral: [
    { t: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, alpha: 1 },
    { t: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, alpha: 1 }
  ],
  idle: [
    { t: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, glyphScaleX: 1, glyphScaleY: 1 },
    { t: 0.5, y: -1.2, scaleX: 1.012, scaleY: 0.99, rotate: 0.018, glyphScaleX: 1.018, glyphScaleY: 0.992 },
    { t: 1, y: 0, scaleX: 1, scaleY: 1, rotate: 0, glyphScaleX: 1, glyphScaleY: 1 }
  ],
  drag: [
    { t: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, glow: 0 },
    { t: 0.45, y: -5, scaleX: 1.11, scaleY: 1.05, rotate: -0.045, glyphScaleX: 1.08, glyphScaleY: 0.96, glow: 0.72, shadow: 1 },
    { t: 1, y: -4, scaleX: 1.08, scaleY: 1.04, rotate: -0.035, glyphScaleX: 1.04, glyphScaleY: 0.98, glow: 0.45, shadow: 1 }
  ],
  drop: [
    { t: 0, y: -5, scaleX: 1.08, scaleY: 1.04, glyphScaleX: 1.04, glyphScaleY: 0.98, glow: 0.45 },
    { t: 0.48, y: 3, scaleX: 1.09, scaleY: 0.91, glyphScaleX: 1.1, glyphScaleY: 0.88, glow: 0.5 },
    { t: 0.72, y: -1, scaleX: 0.98, scaleY: 1.04, glyphScaleX: 0.98, glyphScaleY: 1.04, glow: 0.2 },
    { t: 1, y: 0, scaleX: 1, scaleY: 1, glyphScaleX: 1, glyphScaleY: 1, glow: 0 }
  ],
  merge: [
    { t: 0, scaleX: 0.72, scaleY: 0.72, glyphScaleX: 0.78, glyphScaleY: 0.78, glow: 0.9, y: 4 },
    { t: 0.36, scaleX: 1.2, scaleY: 1.12, glyphScaleX: 1.24, glyphScaleY: 1.12, glow: 1, y: -4 },
    { t: 0.68, scaleX: 0.96, scaleY: 1.04, glyphScaleX: 0.98, glyphScaleY: 1.04, glow: 0.45, y: 1 },
    { t: 1, scaleX: 1, scaleY: 1, glyphScaleX: 1, glyphScaleY: 1, glow: 0, y: 0 }
  ],
  sleep: [
    { t: 0, y: 1.4, scaleX: 0.98, scaleY: 0.96, rotate: -0.012, alpha: 0.7 },
    { t: 0.5, y: 2.4, scaleX: 0.965, scaleY: 0.95, rotate: 0.012, alpha: 0.62 },
    { t: 1, y: 1.4, scaleX: 0.98, scaleY: 0.96, rotate: -0.012, alpha: 0.7 }
  ],
  hit: [
    { t: 0, x: 0, scaleX: 1, scaleY: 1, rotate: 0, alpha: 1 },
    { t: 0.22, x: -7, scaleX: 1.18, scaleY: 0.86, skewX: -0.08, rotate: -0.08, alpha: 1 },
    { t: 0.52, x: -3, scaleX: 0.94, scaleY: 1.08, skewX: 0.04, rotate: 0.035, alpha: 0.92 },
    { t: 1, x: 0, scaleX: 1, scaleY: 1, rotate: 0, alpha: 1 }
  ],
  enemyWalk: [
    { t: 0, x: -1, y: 1, scaleX: 0.96, scaleY: 1.04, rotate: -0.055, skewX: -0.035 },
    { t: 0.25, x: 1, y: -2.5, scaleX: 1.07, scaleY: 0.93, rotate: 0.065, skewX: 0.05 },
    { t: 0.5, x: 2, y: 0.8, scaleX: 0.98, scaleY: 1.03, rotate: 0.045, skewX: 0.025 },
    { t: 0.75, x: -1, y: -2, scaleX: 1.05, scaleY: 0.94, rotate: -0.07, skewX: -0.05 },
    { t: 1, x: -1, y: 1, scaleX: 0.96, scaleY: 1.04, rotate: -0.055, skewX: -0.035 }
  ],
  death: [
    { t: 0, scaleX: 1.12, scaleY: 0.86, rotate: -0.08, alpha: 1, glow: 0.8 },
    { t: 0.32, scaleX: 1.28, scaleY: 0.68, rotate: 0.12, alpha: 0.75, y: -6 },
    { t: 1, scaleX: 0.46, scaleY: 0.36, rotate: -0.2, alpha: 0, y: -18 }
  ]
};

const attackMotions = {
  blade: [
    { t: 0, x: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.24, x: -1.2, scaleX: 1, scaleY: 1, rotate: -0.012, glyphScaleX: 1, glyphScaleY: 1 },
    { t: 0.46, x: 2.2, y: -0.4, scaleX: 1.025, scaleY: 0.985, rotate: 0.028, glyphScaleX: 1.02, glyphScaleY: 0.99, glow: 0.64 },
    { t: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, glyphScaleX: 1, glyphScaleY: 1, glow: 0 }
  ],
  spear: [
    { t: 0, x: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.2, x: -1.4, scaleX: 1, scaleY: 1, rotate: -0.01 },
    { t: 0.56, x: 1.6, y: -0.3, scaleX: 1.018, scaleY: 0.992, rotate: 0.012, glow: 0.58 },
    { t: 0.74, x: 0.6, scaleX: 1, scaleY: 1, rotate: 0, glow: 0.24 },
    { t: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, glow: 0 }
  ],
  bow: [
    { t: 0, x: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.3, x: -2.2, scaleX: 0.965, scaleY: 1.035, glyphScaleX: 0.96, glyphScaleY: 1.04, rotate: -0.018 },
    { t: 0.56, x: -3.2, scaleX: 0.94, scaleY: 1.055, glyphScaleX: 0.92, glyphScaleY: 1.08, rotate: -0.025, glow: 0.46 },
    { t: 0.72, x: 2.6, scaleX: 1.055, scaleY: 0.965, glyphScaleX: 1.06, glyphScaleY: 0.96, rotate: 0.028, glow: 0.74 },
    { t: 1, x: 0, scaleX: 1, scaleY: 1, glyphScaleX: 1, glyphScaleY: 1, rotate: 0, glow: 0 }
  ],
  cavalry: [
    { t: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.18, x: -1.5, y: 0.4, scaleX: 1, scaleY: 1, rotate: -0.018 },
    { t: 0.45, x: 3.5, y: -0.8, scaleX: 1.035, scaleY: 0.985, rotate: 0.028, glyphSkewX: 0.018, glow: 0.66 },
    { t: 0.7, x: 1, y: -0.2, scaleX: 1, scaleY: 1, rotate: 0.006, glyphSkewX: 0.006, glow: 0.22 },
    { t: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, glyphSkewX: 0, glow: 0 }
  ],
  general: [
    { t: 0, scaleX: 1, scaleY: 1, rotate: 0, glow: 0.2 },
    { t: 0.28, x: -2, y: -2, scaleX: 0.96, scaleY: 1.06, glyphScaleY: 1.08, glow: 0.55 },
    { t: 0.52, x: 7, y: -4, scaleX: 1.16, scaleY: 0.9, glyphScaleX: 1.18, glyphScaleY: 0.9, rotate: 0.06, glow: 1 },
    { t: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0, glow: 0 }
  ]
};

const glyphOverrides = {
  "刀": { role: "blade", fontScale: 0.62, baseline: 0.16, tilt: -0.03, paper: "#faf5e9", ink: "#11100f", attachment: "blade" },
  "枪": { role: "spear", fontScale: 0.58, baseline: 0.16, tilt: 0.02, paper: "#faf5e9", ink: "#11100f", attachment: "spear" },
  "弓": { role: "bow", fontScale: 0.62, baseline: 0.17, tilt: 0.015, paper: "#faf5e9", ink: "#11100f", attachment: "bow" },
  "骑": { role: "cavalry", fontScale: 0.56, baseline: 0.18, tilt: -0.02, paper: "#faf5e9", ink: "#11100f", attachment: "speed" },
  "赵": { role: "char", fontScale: 0.6, baseline: 0.18, tilt: -0.02, paper: "#f9f5d8", ink: "#17120f" },
  "云": { role: "char", fontScale: 0.62, baseline: 0.17, tilt: 0.018, paper: "#f9f5d8", ink: "#17120f" },
  "张": { role: "char", fontScale: 0.58, baseline: 0.18, tilt: -0.015, paper: "#f9f5d8", ink: "#17120f" },
  "飞": { role: "char", fontScale: 0.62, baseline: 0.18, tilt: 0.03, paper: "#f9f5d8", ink: "#17120f" },
  "马": { role: "char", fontScale: 0.6, baseline: 0.18, tilt: 0.015, paper: "#f9f5d8", ink: "#8a641c" },
  "超": { role: "char", fontScale: 0.58, baseline: 0.18, tilt: -0.015, paper: "#f9f5d8", ink: "#17120f" },
  "谡": { role: "char", fontScale: 0.54, baseline: 0.18, tilt: -0.018, paper: "#f5edcf", ink: "#17120f" },
  "王": { role: "char", fontScale: 0.68, baseline: 0.17, tilt: 0.01, paper: "#edf4df", ink: "#173127" },
  "平": { role: "char", fontScale: 0.65, baseline: 0.17, tilt: -0.008, paper: "#edf4df", ink: "#173127" },
  "诸": { role: "char", fontScale: 0.52, baseline: 0.18, tilt: -0.012, paper: "#f8f2d8", ink: "#1b1a18" },
  "葛": { role: "char", fontScale: 0.55, baseline: 0.18, tilt: 0.012, paper: "#f8f2d8", ink: "#1b1a18" },
  "亮": { role: "char", fontScale: 0.58, baseline: 0.18, tilt: -0.01, paper: "#f8f2d8", ink: "#1b1a18" },
  "赵云": { role: "general", fontScale: 0.42, baseline: 0.16, tilt: -0.015, paper: "#fff0b8", border: "#d7ad35", ink: "#11100f", attachment: "general-ring" },
  "张飞": { role: "general", fontScale: 0.42, baseline: 0.16, tilt: 0.025, paper: "#f3e7ff", border: "#9c6bd8", ink: "#6b42a1", attachment: "general-ring" },
  "马超": { role: "general", fontScale: 0.42, baseline: 0.16, tilt: -0.02, paper: "#fff0b8", border: "#d7ad35", ink: "#8a641c", attachment: "general-ring" },
  "马谡": { role: "general", fontScale: 0.42, baseline: 0.16, tilt: -0.012, paper: "#f6e8bd", border: "#bd8f35", ink: "#5d311c", attachment: "general-ring" },
  "王平": { role: "general", fontScale: 0.42, baseline: 0.16, tilt: 0.01, paper: "#e6f0da", border: "#5b8b6f", ink: "#173127", attachment: "general-ring" },
  "诸葛亮": { role: "general", fontScale: 0.35, baseline: 0.16, tilt: -0.008, paper: "#fff4c8", border: "#d7ad35", ink: "#17120f", attachment: "general-ring" },
  "兵": { role: "enemy", fontScale: 0.8, baseline: 0.16, tilt: -0.02, ink: "#17120f" },
  "卒": { role: "enemy", fontScale: 0.78, baseline: 0.16, tilt: 0.025, ink: "#201713" },
  "贼": { role: "enemy", fontScale: 0.63, baseline: 0.15, tilt: -0.035, ink: "#24150f" },
  "寇": { role: "enemy", fontScale: 0.68, baseline: 0.15, tilt: 0.02, ink: "#24150f" },
  "张郃": { role: "enemy", fontScale: 0.45, baseline: 0.15, tilt: -0.02, ink: "#391914" },
  "司马懿": { role: "enemy", fontScale: 0.34, baseline: 0.15, tilt: 0.012, ink: "#15213c" },
  "魏军先锋": { role: "enemy", fontScale: 0.32, baseline: 0.15, tilt: -0.01, ink: "#253348" },
  "魏": { role: "enemy", fontScale: 0.68, baseline: 0.15, tilt: -0.018, ink: "#2b211d" },
  "蜀": { role: "goal", fontScale: 0.72, baseline: 0.15, tilt: 0.01, ink: "#70291f" },
  "营": { role: "goal", fontScale: 0.76, baseline: 0.15, tilt: 0, ink: "#18110e" },
  "水": { role: "goal", fontScale: 0.76, baseline: 0.15, tilt: 0.018, ink: "#1f5b72" },
  "山": { role: "goal", fontScale: 0.76, baseline: 0.15, tilt: -0.01, ink: "#486b3e" },
  "斗": { role: "goal", fontScale: 0.9, baseline: 0.15, tilt: 0, ink: "#18110e" },
  "铲": { role: "tool", fontScale: 0.55, baseline: 0.14, tilt: -0.04, paper: "#e8f0ef", ink: "#26323a", attachment: "shovel" }
};

function withMotions(asset) {
  const role = asset.role;
  const attack = role === "general" ? attackMotions.general : attackMotions[role] ?? attackMotions.blade;
  return {
    paper: "#faf5e9",
    border: "#756b61",
    ink: "#11100f",
    fontScale: 0.58,
    baseline: 0.17,
    tilt: 0,
    jitter: 0.7,
    ...asset,
    motions: {
      ...baseMotions,
      attack
    }
  };
}

export const HANZI_ASSETS = Object.fromEntries(
  Object.entries(glyphOverrides).map(([glyph, asset]) => [glyph, withMotions(asset)])
);

export const ENEMY_GLYPHS = ["魏", "卒"];

export function getHanziAsset(glyph) {
  return HANZI_ASSETS[glyph] ?? withMotions({ role: "char" });
}

export function sampleMotion(asset, motionName, progress) {
  const frames = asset.motions?.[motionName] ?? baseMotions.neutral;
  const t = clamp01(progress);
  let a = frames[0];
  let b = frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i++) {
    if (t >= frames[i].t && t <= frames[i + 1].t) {
      a = frames[i];
      b = frames[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, b.t - a.t);
  const local = easeInOut((t - a.t) / span);
  const pose = {};
  for (const key of POSE_KEYS) {
    const av = a[key] ?? defaultPoseValue(key);
    const bv = b[key] ?? defaultPoseValue(key);
    pose[key] = av + (bv - av) * local;
  }
  return pose;
}

export function combinePoses(...poses) {
  const out = {};
  for (const key of POSE_KEYS) out[key] = defaultPoseValue(key);
  for (const pose of poses) {
    if (!pose) continue;
    for (const key of POSE_KEYS) {
      if (pose[key] == null) continue;
      if (key === "scaleX" || key === "scaleY" || key === "glyphScaleX" || key === "glyphScaleY" || key === "alpha") out[key] *= pose[key];
      else if (key === "glow" || key === "shadow") out[key] = Math.max(out[key], pose[key]);
      else out[key] += pose[key];
    }
  }
  return out;
}

function defaultPoseValue(key) {
  if (key === "scaleX" || key === "scaleY" || key === "glyphScaleX" || key === "glyphScaleY" || key === "alpha") return 1;
  return 0;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
