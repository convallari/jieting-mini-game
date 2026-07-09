import { GLYPH_MASKS } from "./glyphMasks.js";

const MASK_GLYPHS = new Set(["刀", "枪", "弓", "骑", "斗"]);

const MASK_RIGS = {
  "刀": { wave: 0.42, attackShift: 0.12, attackBend: 0.1, squash: 0.1, trail: 0.18 },
  "枪": { wave: 0.2, attackShift: 0.18, attackBend: -0.04, squash: 0.08, trail: 0.24 },
  "弓": { wave: 0.5, attackShift: 0.08, attackBend: 0.16, squash: 0.06, trail: 0.16 },
  "骑": { wave: 0.36, attackShift: 0.14, attackBend: 0.08, squash: 0.11, trail: 0.22 },
  "斗": { wave: 0.24, attackShift: 0.05, attackBend: 0.13, squash: 0.05, trail: 0.08 }
};

const GLYPH_STROKES = {
  "刀": [
    s(31, 34, q(52, 25, 76, 30), 11),
    s(73, 30, q(67, 53, 52, 77), 13),
    s(48, 46, q(61, 48, 70, 56), 7)
  ],
  "枪": [
    s(31, 13, q(31, 47, 28, 86), 9),
    s(20, 39, q(31, 36, 43, 39), 7),
    s(28, 44, q(18, 58, 12, 72), 7),
    s(31, 45, q(40, 59, 46, 73), 7),
    s(60, 20, q(53, 35, 45, 47), 8),
    s(60, 20, q(73, 34, 86, 48), 8),
    s(50, 56, q(66, 51, 83, 55), 8),
    s(62, 45, q(60, 65, 57, 83), 8),
    s(57, 83, q(70, 76, 82, 82), 7)
  ],
  "弓": [
    s(37, 18, q(59, 12, 73, 28), 9),
    s(72, 28, q(50, 39, 44, 52), 9),
    s(44, 52, q(66, 52, 71, 68), 8),
    s(70, 68, q(55, 83, 36, 80), 10)
  ],
  "骑": [
    s(17, 27, q(34, 18, 48, 29), 8),
    s(21, 39, q(34, 35, 49, 39), 7),
    s(18, 52, q(34, 48, 50, 53), 7),
    s(18, 27, q(13, 52, 18, 78), 9),
    s(44, 35, q(40, 58, 35, 84), 8),
    s(18, 79, q(26, 73, 34, 71), 6),
    s(56, 24, q(72, 19, 87, 25), 8),
    s(72, 25, q(65, 38, 58, 48), 7),
    s(56, 48, q(73, 44, 89, 48), 8),
    s(62, 57, l(84, 57), 7),
    s(62, 57, l(62, 80), 8),
    s(84, 57, q(84, 72, 80, 83), 8),
    s(61, 80, q(72, 75, 84, 80), 7)
  ],
  "赵": [
    s(19, 24, q(34, 20, 45, 24), 7),
    s(32, 24, q(29, 47, 30, 67), 8),
    s(18, 46, q(31, 42, 44, 46), 6),
    s(16, 78, q(35, 70, 47, 58), 9),
    s(59, 21, q(73, 18, 86, 23), 8),
    s(72, 23, q(64, 44, 53, 63), 9),
    s(54, 39, q(71, 52, 88, 68), 8),
    s(54, 82, q(73, 75, 89, 82), 8)
  ],
  "云": [
    s(28, 24, q(53, 19, 78, 24), 8),
    s(22, 44, q(54, 38, 84, 45), 8),
    s(50, 45, q(41, 62, 29, 76), 8),
    s(30, 76, q(56, 67, 81, 76), 8),
    s(69, 64, q(79, 71, 84, 83), 7)
  ],
  "张": [
    s(16, 24, q(31, 18, 44, 24), 8),
    s(43, 24, q(31, 36, 20, 41), 8),
    s(21, 42, q(35, 39, 46, 43), 7),
    s(45, 43, q(34, 63, 17, 76), 9),
    s(62, 17, q(75, 15, 87, 20), 7),
    s(66, 18, q(60, 47, 64, 82), 9),
    s(53, 40, q(69, 35, 88, 39), 7),
    s(65, 49, q(78, 62, 91, 78), 9),
    s(63, 63, q(55, 73, 47, 81), 7)
  ],
  "飞": [
    s(28, 20, q(50, 14, 73, 23), 7),
    s(30, 31, q(49, 44, 76, 42), 7),
    s(30, 76, q(54, 55, 83, 60), 9),
    s(49, 39, q(44, 48, 38, 57), 6),
    s(63, 42, q(69, 56, 79, 71), 7),
    d(25, 55, 5),
    d(48, 73, 4)
  ],
  "黄": [
    s(27, 19, q(51, 15, 76, 19), 8),
    s(38, 10, l(38, 32), 7),
    s(63, 10, l(63, 32), 7),
    s(23, 35, q(51, 30, 81, 35), 9),
    s(34, 45, q(52, 41, 70, 45), 7),
    s(34, 45, l(34, 63), 7),
    s(70, 45, l(70, 63), 7),
    s(34, 63, q(52, 59, 70, 63), 7),
    s(52, 35, q(50, 54, 52, 74), 8),
    s(33, 82, q(43, 75, 49, 68), 8),
    s(70, 82, q(61, 75, 55, 68), 8)
  ],
  "忠": [
    s(50, 16, q(48, 38, 50, 60), 8),
    s(29, 31, q(52, 27, 76, 31), 8),
    s(29, 31, l(29, 55), 7),
    s(76, 31, l(76, 55), 7),
    s(30, 55, q(52, 50, 75, 55), 8),
    s(26, 79, q(34, 70, 43, 72), 7),
    s(51, 69, q(49, 83, 55, 88), 7),
    s(66, 70, q(79, 77, 83, 87), 7),
    s(24, 87, q(36, 91, 47, 86), 6)
  ],
  "兵": [
    s(35, 20, q(51, 13, 69, 18), 7),
    s(31, 35, q(52, 30, 75, 34), 8),
    s(28, 52, q(52, 47, 78, 52), 9),
    s(51, 18, q(48, 44, 49, 67), 8),
    s(29, 81, q(41, 70, 48, 62), 9),
    s(74, 81, q(62, 70, 55, 62), 9)
  ],
  "贼": [
    s(18, 24, q(31, 20, 45, 24), 7),
    s(18, 24, q(17, 45, 18, 64), 7),
    s(45, 24, q(44, 45, 45, 64), 7),
    s(18, 64, q(31, 60, 45, 64), 7),
    s(31, 34, q(30, 49, 31, 59), 6),
    s(21, 80, q(31, 71, 36, 64), 8),
    s(46, 80, q(39, 71, 35, 64), 8),
    s(58, 21, q(73, 44, 88, 79), 8),
    s(51, 43, q(68, 38, 85, 42), 7),
    s(69, 15, q(69, 49, 72, 86), 8),
    s(54, 69, q(64, 58, 74, 48), 7),
    d(86, 27, 4)
  ],
  "卒": [
    s(48, 13, q(55, 17, 61, 24), 6),
    s(22, 31, q(52, 26, 82, 31), 7),
    s(36, 40, q(46, 49, 50, 62), 6),
    s(67, 40, q(58, 50, 53, 62), 6),
    s(22, 67, q(51, 62, 82, 67), 8),
    s(51, 45, l(51, 86), 7)
  ],
  "寇": [
    s(25, 20, q(51, 12, 78, 20), 7),
    s(24, 20, q(20, 31, 19, 40), 6),
    s(78, 20, q(82, 31, 83, 40), 6),
    s(30, 40, q(52, 36, 73, 40), 6),
    s(36, 52, l(66, 52), 6),
    s(49, 41, l(47, 72), 6),
    s(29, 82, q(45, 72, 50, 57), 7),
    s(65, 61, q(74, 71, 83, 83), 7)
  ],
  "斗": [
    s(50, 15, q(49, 48, 51, 86), 10),
    s(25, 37, q(38, 41, 49, 48), 8),
    s(26, 58, q(39, 62, 50, 68), 8),
    s(26, 73, q(49, 67, 77, 69), 9),
    s(52, 47, q(65, 40, 78, 36), 7)
  ]
};

const GLYPH_MOTION = {
  "刀": { feature: [1, 2], attackX: 0.055, attackY: -0.012, stretchX: 0.08, stretchY: -0.12 },
  "枪": { feature: [0, 7, 8], attackX: 0.075, attackY: -0.018, stretchX: 0.12, stretchY: -0.08 },
  "弓": { feature: [0, 1, 2, 3], attackX: 0.045, attackY: 0, stretchX: 0.14, stretchY: -0.06 },
  "骑": { feature: [7, 8, 9, 10, 11, 12], attackX: 0.08, attackY: -0.01, stretchX: 0.1, stretchY: -0.08 },
  "赵": { feature: [3, 6, 7], attackX: 0.05, attackY: -0.01, stretchX: 0.08, stretchY: -0.05 },
  "云": { feature: [2, 3, 4], attackX: 0.055, attackY: 0.008, stretchX: 0.12, stretchY: -0.04 },
  "张": { feature: [3, 7], attackX: 0.07, attackY: -0.008, stretchX: 0.11, stretchY: -0.06 },
  "飞": { feature: [2, 4], attackX: 0.08, attackY: -0.02, stretchX: 0.13, stretchY: -0.06 },
  "黄": { feature: [8, 9, 10], attackX: 0.035, attackY: 0.012, stretchX: 0.06, stretchY: -0.04 },
  "忠": { feature: [0, 5, 6, 7, 8], attackX: 0.035, attackY: 0.02, stretchX: 0.05, stretchY: -0.04 },
  "兵": { feature: [3, 4, 5], attackX: 0.05, attackY: 0.015, stretchX: 0.08, stretchY: -0.08 },
  "贼": { feature: [7, 9, 10], attackX: 0.07, attackY: -0.008, stretchX: 0.12, stretchY: -0.06 },
  "斗": { feature: [0, 3], attackX: 0.025, attackY: -0.012, stretchX: 0.04, stretchY: 0.05 }
};

const BOW_ATTACK_FRAMES = [
  GLYPH_STROKES["弓"],
  [
    s(40, 18, q(61, 13, 75, 28), 9),
    s(74, 28, q(51, 35, 39, 49), 9),
    s(39, 49, q(59, 51, 69, 63), 8),
    s(68, 63, q(50, 79, 31, 75), 10)
  ],
  [
    s(56, 16, q(35, 20, 31, 42), 10),
    s(31, 42, q(47, 48, 62, 58), 8),
    s(62, 58, q(45, 80, 25, 73), 10),
    s(43, 33, q(50, 45, 42, 59), 5)
  ],
  [
    s(67, 18, q(49, 18, 43, 35), 10),
    s(43, 35, q(62, 43, 66, 55), 8),
    s(66, 55, q(49, 83, 28, 75), 10),
    s(49, 37, q(58, 47, 49, 60), 5)
  ],
  [
    s(34, 20, q(55, 15, 71, 29), 9),
    s(70, 29, q(47, 39, 38, 54), 9),
    s(38, 54, q(58, 55, 69, 68), 8),
    s(68, 68, q(51, 82, 33, 78), 10)
  ]
];

export function hasVectorHanzi(text) {
  return [...text].every((char) => Boolean(GLYPH_STROKES[char]));
}

export function drawVectorHanzi(ctx, text, size, color, options = {}) {
  const chars = [...text];
  if (chars.length === 0 || !chars.every((char) => GLYPH_STROKES[char])) return false;

  ctx.save();
  const gap = size * (chars.length > 1 ? 0.18 : 0);
  const charSize = chars.length > 1 ? size * 0.9 : size;
  const advance = charSize * 0.74 + gap;
  const start = -((chars.length - 1) * advance) / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.save();
    ctx.translate(start + i * advance, 0);
    drawSingleGlyph(ctx, chars[i], GLYPH_STROKES[chars[i]], charSize, color, options, i);
    ctx.restore();
  }
  ctx.restore();
  return true;
}

function drawSingleGlyph(ctx, char, strokes, size, color, options, glyphIndex) {
  if (char === "弓" && options.action === "attack") {
    drawBowSpriteFrame(ctx, size, color, options, glyphIndex);
    return;
  }

  if (MASK_GLYPHS.has(char) && GLYPH_MASKS[char]) {
    drawMaskGlyph(ctx, char, GLYPH_MASKS[char], size, color, options, glyphIndex);
    return;
  }

  const scale = size / 100;
  const jitter = options.jitter ?? 0;
  const breathe = options.breathe ?? 0;
  const attack = options.attack ?? 0;
  const merge = options.merge ?? 0;
  const seed = glyphIndex * 13.37;
  const motion = GLYPH_MOTION[char] ?? { feature: [] };

  if (options.stroke) {
    for (let i = 0; i < strokes.length; i++) {
      drawStroke(ctx, strokes[i], scale, options.stroke, {
        lineBoost: 3.6,
        alpha: 0.65,
        offsetX: 0,
        offsetY: 0,
        seed: seed + i
      });
    }
  }

  if (jitter > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(0.2, 0.09 + jitter * 0.08);
    for (let i = 0; i < strokes.length; i++) {
      const wobble = Math.sin(seed + i * 1.7) * jitter;
      drawStroke(ctx, strokes[i], scale, color, {
        lineBoost: 0.8,
        offsetX: wobble * size * 0.018,
        offsetY: Math.cos(seed + i * 1.3) * jitter * size * 0.012,
        seed: seed + i
      });
    }
    ctx.restore();
  }

  for (let i = 0; i < strokes.length; i++) {
    const phase = Math.sin(seed + i * 0.9);
    const isFeature = motion.feature.includes(i);
    const featurePower = isFeature ? 1 : 0.34;
    const strokeWarp = {
      lineBoost: 1.1 + breathe * 0.35 + attack * (isFeature ? 1.55 : 0.55) + merge * 0.55,
      offsetX: phase * breathe * size * 0.014 + attack * size * (motion.attackX ?? 0.02) * featurePower,
      offsetY: Math.cos(seed + i) * breathe * size * 0.01 + attack * size * (motion.attackY ?? 0) * featurePower - merge * size * 0.006,
      stretchX: 1 + attack * (motion.stretchX ?? 0.06) * featurePower,
      stretchY: 1 + attack * (motion.stretchY ?? -0.04) * featurePower + merge * 0.025,
      seed: seed + i
    };
    drawStroke(ctx, strokes[i], scale, color, strokeWarp);
  }
}

function drawBowSpriteFrame(ctx, size, color, options, glyphIndex) {
  const progress = clamp01(options.actionProgress ?? 0);
  const frameIndex = Math.min(BOW_ATTACK_FRAMES.length - 1, Math.floor(progress * BOW_ATTACK_FRAMES.length));
  const prevIndex = Math.max(0, frameIndex - 1);
  const scale = size / 100;
  const attack = options.attack ?? 0;
  const seed = glyphIndex * 13.37;

  ctx.save();
  ctx.globalAlpha *= 0.18 + attack * 0.12;
  for (let i = 0; i < BOW_ATTACK_FRAMES[prevIndex].length; i++) {
    drawStroke(ctx, BOW_ATTACK_FRAMES[prevIndex][i], scale, color, {
      lineBoost: 2,
      alpha: 0.45,
      offsetX: -size * 0.05,
      offsetY: size * 0.015,
      seed: seed + i
    });
  }
  ctx.restore();

  for (let i = 0; i < BOW_ATTACK_FRAMES[frameIndex].length; i++) {
    const pulse = Math.sin(progress * Math.PI * 2 + i * 0.8);
    drawStroke(ctx, BOW_ATTACK_FRAMES[frameIndex][i], scale, color, {
      lineBoost: 1.4 + attack * 1.2,
      offsetX: pulse * size * 0.006,
      offsetY: Math.cos(progress * Math.PI * 2 + i) * size * 0.005,
      seed: seed + i
    });
  }
}

const decodedMaskCache = new Map();
const maskCanvasCache = new Map();

function drawMaskGlyph(ctx, char, mask, size, color, options, glyphIndex) {
  const decoded = decodeMask(mask);
  const jitter = options.jitter ?? 0;
  const breathe = options.breathe ?? 0;
  const idleWave = 0.14 + breathe * 1.8;
  const attack = options.attack ?? 0;
  const stableWeaponAttack = char === "刀" || char === "枪" || char === "骑";
  const bodyAttack = stableWeaponAttack ? 0 : attack;
  const merge = options.merge ?? 0;
  const phase = (options.phase ?? 0) + glyphIndex * 0.37;
  const seed = glyphIndex * 11.23;
  const rig = MASK_RIGS[char] ?? MASK_RIGS["刀"];
  const boxW = Math.max(1, decoded.maxX - decoded.minX + 1);
  const boxH = Math.max(1, decoded.maxY - decoded.minY + 1);
  const target = size * (options.maskScale ?? 0.84);
  const cell = target / Math.max(boxW, boxH);
  const sprite = getMaskCanvas(decoded, color);
  const drawW = sprite.canvas.width * cell;
  const drawH = sprite.canvas.height * cell;
  const stretchX = 1 + bodyAttack * 0.018 + merge * 0.025;
  const stretchY = 1 - bodyAttack * (rig.squash ?? 0.06) * 0.45 + merge * 0.015;

  ctx.save();
  ctx.scale(stretchX, stretchY);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (jitter > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(0.16, 0.07 + jitter * 0.045);
    ctx.drawImage(sprite.canvas, -drawW / 2 + Math.sin(seed) * size * 0.018 * jitter, -drawH / 2 + Math.cos(seed) * size * 0.012 * jitter, drawW, drawH);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha *= 0.16 + idleWave * 0.06 + bodyAttack * 0.14;
  drawWarpedMask(ctx, sprite.canvas, drawW * 1.08, drawH * 1.08, {
    breathe: idleWave * 0.55,
    attack: bodyAttack * 0.55,
    phase,
    rig,
    dx: 0,
    dy: cell * 0.55
  });
  ctx.restore();
  if (!stableWeaponAttack && attack > 0.08 && rig.trail) {
    ctx.save();
    ctx.globalAlpha *= Math.min(0.24, attack * 0.22);
    drawWarpedMask(ctx, sprite.canvas, drawW, drawH, {
      breathe,
      attack: bodyAttack,
      phase,
      rig,
      dx: size * rig.trail * attack,
      dy: -size * 0.02 * attack,
      smear: true
    });
    ctx.restore();
  }
  drawWarpedMask(ctx, sprite.canvas, drawW, drawH, { breathe: idleWave, attack: bodyAttack, phase, rig, dx: 0, dy: 0 });
  ctx.restore();
}

function drawWarpedMask(ctx, canvas, drawW, drawH, params) {
  const rows = canvas.height;
  const rowH = drawH / rows;
  const attack = params.attack ?? 0;
  const breathe = params.breathe ?? 0;
  const phase = params.phase ?? 0;
  const rig = params.rig ?? MASK_RIGS["刀"];
  const dx = params.dx ?? 0;
  const dy = params.dy ?? 0;
  for (let row = 0; row < rows; row++) {
    const n = rows <= 1 ? 0.5 : row / (rows - 1);
    const centered = n - 0.5;
    const wave = Math.sin(phase * 6.2 + n * Math.PI * 2.2) * breathe * drawW * (rig.wave ?? 0.25) * 0.08;
    const bend = centered * centered * Math.sign(centered || 1) * attack * drawW * (rig.attackBend ?? 0.08);
    const throwX = attack * drawW * (rig.attackShift ?? 0.08) * (0.18 + n * 0.82);
    const squashY = attack * drawH * (rig.squash ?? 0.06) * (0.5 - Math.abs(centered));
    const rowScale = 1 + attack * 0.08 * Math.sin(n * Math.PI);
    const smearScale = params.smear ? 1 + attack * 0.22 * n : rowScale;
    const destW = drawW * smearScale;
    const destX = -destW / 2 + dx + wave + bend + throwX;
    const destY = -drawH / 2 + dy + row * rowH + squashY;
    ctx.drawImage(canvas, 0, row, canvas.width, 1, destX, destY, destW, rowH + 0.7);
  }
}

function getMaskCanvas(decoded, color) {
  const key = `${decoded.cacheKey}:${color}`;
  if (maskCanvasCache.has(key)) return maskCanvasCache.get(key);
  const pad = 3;
  const canvas = document.createElement("canvas");
  canvas.width = decoded.maxX - decoded.minX + 1 + pad * 2;
  canvas.height = decoded.maxY - decoded.minY + 1 + pad * 2;
  const buffer = canvas.getContext("2d");
  buffer.fillStyle = color;
  for (const [x, y] of decoded.cells) {
    buffer.fillRect(x - decoded.minX + pad, y - decoded.minY + pad, 1.35, 1.35);
  }
  const sprite = { canvas };
  maskCanvasCache.set(key, sprite);
  return sprite;
}

function decodeMask(mask) {
  if (decodedMaskCache.has(mask)) return decodedMaskCache.get(mask);
  const cells = [];
  let minX = mask.size;
  let minY = mask.size;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < mask.rows.length; y++) {
    const bits = BigInt(`0x${mask.rows[y]}`);
    for (let x = 0; x < mask.size; x++) {
      const shift = BigInt(mask.size - x - 1);
      if (((bits >> shift) & 1n) === 0n) continue;
      cells.push([x, y]);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const decoded = cells.length ? { cells, minX, minY, maxX, maxY, cacheKey: mask.rows.join("") } : { cells, minX: 0, minY: 0, maxX: mask.size - 1, maxY: mask.size - 1, cacheKey: mask.rows.join("") };
  decodedMaskCache.set(mask, decoded);
  return decoded;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function drawStroke(ctx, stroke, scale, color, warp = {}) {
  if (stroke.type === "dot") {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= warp.alpha ?? 1;
    const p = point(stroke.x, stroke.y, scale, warp);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, (stroke.r + (warp.lineBoost ?? 0)) * scale, stroke.r * 0.78 * scale, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= (stroke.alpha ?? 1) * (warp.alpha ?? 1);
  ctx.lineWidth = Math.max(1, (stroke.w + (warp.lineBoost ?? 0)) * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const start = point(stroke.x, stroke.y, scale, warp);
  ctx.moveTo(start.x, start.y);
  for (const cmd of stroke.cmds) {
    if (cmd.type === "L") {
      const p = point(cmd.x, cmd.y, scale, warp);
      ctx.lineTo(p.x, p.y);
    } else if (cmd.type === "Q") {
      const c = point(cmd.cx, cmd.cy, scale, warp);
      const p = point(cmd.x, cmd.y, scale, warp);
      ctx.quadraticCurveTo(c.x, c.y, p.x, p.y);
    }
  }
  ctx.stroke();

  const end = endPoint(stroke);
  const p0 = point(stroke.x, stroke.y, scale, warp);
  const p1 = point(end.x, end.y, scale, warp);
  ctx.globalAlpha *= 0.32;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(p0.x, p0.y, ctx.lineWidth * 0.35, ctx.lineWidth * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(p1.x, p1.y, ctx.lineWidth * 0.42, ctx.lineWidth * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function point(x, y, scale, warp) {
  const sx = warp.stretchX ?? 1;
  const sy = warp.stretchY ?? 1;
  return {
    x: (x - 50) * scale * sx + (warp.offsetX ?? 0),
    y: (y - 50) * scale * sy + (warp.offsetY ?? 0)
  };
}

function endPoint(stroke) {
  const last = stroke.cmds[stroke.cmds.length - 1];
  return { x: last.x, y: last.y };
}

function s(x, y, ...parts) {
  const w = typeof parts[parts.length - 1] === "number" ? parts.pop() : 6;
  return { type: "stroke", x, y, cmds: parts.flat(), w };
}

function l(x, y) {
  return { type: "L", x, y };
}

function q(cx, cy, x, y) {
  return { type: "Q", cx, cy, x, y };
}

function d(x, y, r) {
  return { type: "dot", x, y, r };
}
