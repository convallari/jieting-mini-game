import { GLYPH_MASKS } from "./glyphMasks.js";

const MASK_GLYPHS = new Set(["刀", "枪", "弓", "骑", "斗"]);

const MASK_RIGS = {
  "刀": { wave: 0.42, attackShift: 0.12, attackBend: 0.1, squash: 0.1, trail: 0.18 },
  "枪": { wave: 0.2, attackShift: 0.18, attackBend: -0.04, squash: 0.08, trail: 0.24 },
  "弓": { wave: 0.5, attackShift: 0.08, attackBend: 0.16, squash: 0.06, trail: 0.16 },
  "骑": { wave: 0.36, attackShift: 0.14, attackBend: 0.08, squash: 0.11, trail: 0.22 },
  "斗": { wave: 0.24, attackShift: 0.05, attackBend: 0.13, squash: 0.05, trail: 0.08 }
};

const MASK_PARTS = {
  "刀": [
    part("横撇", (p) => p.ny < 0.42, { phase: 0, speed: 6.9, idleX: -0.012, idleY: -0.01, attackX: 0.03, attackY: -0.055, scaleX: 0.1, scaleY: -0.06, rotate: -0.1, wave: 0.9, shift: 0.7, bend: 0.7 }),
    part("竖钩", (p) => p.nx > 0.48, { phase: 0.34, speed: 7.3, idleX: 0.008, idleY: 0.006, attackX: 0.14, attackY: -0.018, scaleX: 0.22, scaleY: -0.16, rotate: 0.08, wave: 1.15, shift: 1.35, bend: 1.25, trail: 1.2 }),
    part("内点", null, { phase: 0.62, speed: 8.1, idleX: -0.006, idleY: 0.012, attackX: 0.06, attackY: 0.025, scaleX: 0.08, scaleY: 0.02, rotate: 0.04, wave: 0.7, shift: 0.8, bend: 0.65 })
  ],
  "枪": [
    part("木旁竖", (p) => p.nx < 0.34, { phase: 0.18, speed: 6.4, idleX: -0.006, idleY: 0.008, attackX: -0.025, attackY: 0.018, scaleX: -0.04, scaleY: 0.08, rotate: -0.06, wave: 0.55, shift: 0.3, bend: 0.7 }),
    part("枪尖", (p) => p.nx >= 0.38 && p.ny < 0.38, { phase: 0, speed: 7.8, idleX: 0.014, idleY: -0.012, attackX: 0.22, attackY: -0.07, scaleX: 0.3, scaleY: -0.18, rotate: -0.12, wave: 0.7, shift: 1.65, bend: 0.6, trail: 1.35 }),
    part("仓身", (p) => p.nx >= 0.34 && p.ny < 0.68, { phase: 0.28, speed: 6.8, idleX: 0.006, idleY: 0.006, attackX: 0.15, attackY: -0.025, scaleX: 0.18, scaleY: -0.1, rotate: 0.04, wave: 0.75, shift: 1.15, bend: 0.9 }),
    part("底钩", null, { phase: 0.58, speed: 7.1, idleX: -0.004, idleY: 0.014, attackX: 0.08, attackY: 0.04, scaleX: 0.1, scaleY: 0.02, rotate: 0.09, wave: 1, shift: 0.85, bend: 1.2 })
  ],
  "弓": [
    part("上弧", (p) => p.ny < 0.36, { phase: 0.05, speed: 7.2, idleX: 0.012, idleY: -0.012, attackX: 0.06, attackY: -0.05, scaleX: 0.18, scaleY: -0.08, rotate: -0.14, wave: 1.15, shift: 0.75, bend: 1.2 }),
    part("腰折", (p) => p.ny < 0.66, { phase: 0.35, speed: 7.7, idleX: -0.01, idleY: 0.004, attackX: 0.12, attackY: -0.005, scaleX: 0.24, scaleY: -0.14, rotate: 0.03, wave: 1.35, shift: 1.2, bend: 1.55, trail: 1 }),
    part("下钩", null, { phase: 0.68, speed: 6.9, idleX: 0.008, idleY: 0.014, attackX: 0.04, attackY: 0.055, scaleX: 0.1, scaleY: 0.04, rotate: 0.16, wave: 1.05, shift: 0.65, bend: 1.1 })
  ],
  "骑": [
    part("马旁", (p) => p.nx < 0.48, { phase: 0.22, speed: 7.5, idleX: -0.012, idleY: 0.012, attackX: -0.02, attackY: 0.025, scaleX: 0.04, scaleY: -0.02, rotate: -0.07, wave: 0.9, shift: 0.45, bend: 0.85 }),
    part("奇首", (p) => p.nx >= 0.48 && p.ny < 0.4, { phase: 0, speed: 8.2, idleX: 0.014, idleY: -0.012, attackX: 0.12, attackY: -0.055, scaleX: 0.16, scaleY: -0.12, rotate: -0.08, wave: 0.95, shift: 1.05, bend: 0.9 }),
    part("右身", (p) => p.nx >= 0.48 && p.ny < 0.72, { phase: 0.32, speed: 7.4, idleX: 0.006, idleY: 0.006, attackX: 0.16, attackY: -0.015, scaleX: 0.2, scaleY: -0.14, rotate: 0.06, wave: 1.1, shift: 1.35, bend: 1.25, trail: 1.25 }),
    part("足钩", null, { phase: 0.62, speed: 8.6, idleX: -0.006, idleY: 0.016, attackX: 0.1, attackY: 0.06, scaleX: 0.18, scaleY: 0.02, rotate: 0.14, wave: 1.2, shift: 0.95, bend: 1.4 })
  ],
  "斗": [
    part("左点", (p) => p.nx < 0.42 && p.ny < 0.76, { phase: 0.45, speed: 6.6, idleX: -0.01, idleY: 0.01, attackX: -0.012, attackY: 0.018, scaleX: 0.04, scaleY: 0.03, rotate: -0.08, wave: 0.65, shift: 0.35, bend: 0.5 }),
    part("中竖", (p) => p.nx > 0.4 && p.nx < 0.62, { phase: 0, speed: 7.1, idleX: 0.004, idleY: -0.006, attackX: 0.045, attackY: -0.03, scaleX: 0.06, scaleY: -0.05, rotate: 0.05, wave: 0.85, shift: 0.85, bend: 1.35 }),
    part("底挑", null, { phase: 0.26, speed: 7.8, idleX: 0.01, idleY: 0.01, attackX: 0.055, attackY: 0.015, scaleX: 0.08, scaleY: 0.02, rotate: 0.1, wave: 0.95, shift: 0.75, bend: 1.1 })
  ]
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

const decodedMaskCache = new Map();
const maskCanvasCache = new Map();
const maskPartCache = new Map();

function drawMaskGlyph(ctx, char, mask, size, color, options, glyphIndex) {
  const decoded = decodeMask(mask);
  const jitter = options.jitter ?? 0;
  const breathe = options.breathe ?? 0;
  const idleWave = 0.14 + breathe * 1.8;
  const attack = options.attack ?? 0;
  const merge = options.merge ?? 0;
  const phase = (options.phase ?? 0) + glyphIndex * 0.37;
  const seed = glyphIndex * 11.23;
  const rig = MASK_RIGS[char] ?? MASK_RIGS["刀"];
  const boxW = Math.max(1, decoded.maxX - decoded.minX + 1);
  const boxH = Math.max(1, decoded.maxY - decoded.minY + 1);
  const target = size * (options.maskScale ?? 0.84);
  const cell = target / Math.max(boxW, boxH);
  const fullSprite = getMaskCanvas(decoded, color);
  const drawW = fullSprite.canvas.width * cell;
  const drawH = fullSprite.canvas.height * cell;
  const stretchX = 1 + attack * 0.018 + merge * 0.025;
  const stretchY = 1 - attack * (rig.squash ?? 0.06) * 0.45 + merge * 0.015;
  const parts = getMaskParts(char, decoded);

  ctx.save();
  ctx.scale(stretchX, stretchY);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (jitter > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(0.16, 0.07 + jitter * 0.045);
    ctx.drawImage(fullSprite.canvas, -drawW / 2 + Math.sin(seed) * size * 0.018 * jitter, -drawH / 2 + Math.cos(seed) * size * 0.012 * jitter, drawW, drawH);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha *= 0.16 + idleWave * 0.06 + attack * 0.14;
  drawWarpedMask(ctx, fullSprite.canvas, drawW * 1.08, drawH * 1.08, {
    breathe: idleWave * 0.55,
    attack: attack * 0.55,
    phase,
    rig,
    dx: 0,
    dy: cell * 0.55
  });
  ctx.restore();
  if (attack > 0.08 && rig.trail) {
    ctx.save();
    ctx.globalAlpha *= Math.min(0.24, attack * 0.22);
    for (const partLayer of parts) {
      const spec = partLayer.spec;
      if ((spec.trail ?? 0) <= 0) continue;
      const sprite = getMaskPartCanvas(decoded, partLayer, color);
      const partRig = partMaskRig(rig, spec);
      drawWarpedMask(ctx, sprite.canvas, drawW, drawH, {
        breathe,
        attack,
        phase: phase + (spec.phase ?? 0),
        rig: partRig,
        dx: size * rig.trail * (spec.trail ?? 1) * attack,
        dy: -size * 0.025 * attack,
        smear: true
      });
    }
    ctx.restore();
  }
  for (const partLayer of parts) {
    drawMaskPart(ctx, decoded, partLayer, color, drawW, drawH, cell, {
      idleWave,
      attack,
      merge,
      phase,
      rig,
      size,
      seed
    });
  }
  ctx.restore();
}

function drawMaskPart(ctx, decoded, partLayer, color, drawW, drawH, cell, params) {
  const spec = partLayer.spec;
  const sprite = getMaskPartCanvas(decoded, partLayer, color);
  const partRig = partMaskRig(params.rig, spec);
  const phase = params.phase + (spec.phase ?? 0);
  const idleBeat = Math.sin(phase * (spec.speed ?? 7) + partLayer.index * 0.73);
  const attack = params.attack * (spec.attack ?? 1);
  const breathe = params.idleWave * (spec.breathe ?? 1);
  const anchorX = (partLayer.cx - (decoded.minX + decoded.maxX) / 2) * cell;
  const anchorY = (partLayer.cy - (decoded.minY + decoded.maxY) / 2) * cell;
  const idleX = params.size * (spec.idleX ?? 0) * breathe * idleBeat;
  const idleY = params.size * (spec.idleY ?? 0) * breathe * Math.cos(phase * ((spec.speed ?? 7) * 0.88));
  const attackEase = attack > 0 ? easeOutCubic(Math.min(1, attack)) : 0;
  const dx = idleX + params.size * (spec.attackX ?? 0) * attackEase;
  const dy = idleY + params.size * (spec.attackY ?? 0) * attackEase;
  const scaleX = 1 + params.merge * 0.02 + (spec.scaleX ?? 0) * attackEase;
  const scaleY = 1 + params.merge * 0.015 + (spec.scaleY ?? 0) * attackEase;
  const rotate = (spec.rotate ?? 0) * attackEase + idleBeat * breathe * 0.015;

  ctx.save();
  ctx.translate(dx, dy);
  ctx.translate(anchorX, anchorY);
  ctx.rotate(rotate);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-anchorX, -anchorY);
  drawWarpedMask(ctx, sprite.canvas, drawW, drawH, {
    breathe,
    attack,
    phase,
    rig: partRig,
    dx: 0,
    dy: 0
  });
  ctx.restore();
}

function partMaskRig(rig, spec) {
  return {
    wave: (rig.wave ?? 0.25) * (spec.wave ?? 1),
    attackShift: (rig.attackShift ?? 0.08) * (spec.shift ?? 1),
    attackBend: (rig.attackBend ?? 0.08) * (spec.bend ?? 1),
    squash: (rig.squash ?? 0.06) * (spec.squash ?? 1),
    trail: (rig.trail ?? 0.1) * (spec.trail ?? 1)
  };
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

function getMaskPartCanvas(decoded, partLayer, color) {
  const key = `${decoded.cacheKey}:${partLayer.name}:${color}`;
  if (maskCanvasCache.has(key)) return maskCanvasCache.get(key);
  const pad = 3;
  const canvas = document.createElement("canvas");
  canvas.width = decoded.maxX - decoded.minX + 1 + pad * 2;
  canvas.height = decoded.maxY - decoded.minY + 1 + pad * 2;
  const buffer = canvas.getContext("2d");
  buffer.fillStyle = color;
  for (const [x, y] of partLayer.cells) {
    buffer.fillRect(x - decoded.minX + pad, y - decoded.minY + pad, 1.35, 1.35);
  }
  const sprite = { canvas };
  maskCanvasCache.set(key, sprite);
  return sprite;
}

function getMaskParts(char, decoded) {
  const key = `${char}:${decoded.cacheKey}`;
  if (maskPartCache.has(key)) return maskPartCache.get(key);
  const specs = MASK_PARTS[char];
  if (!specs) {
    const fallback = [makeMaskPartLayer("whole", 0, decoded.cells, { phase: 0 })];
    maskPartCache.set(key, fallback);
    return fallback;
  }
  const cellsByPart = specs.map(() => []);
  const boxW = Math.max(1, decoded.maxX - decoded.minX);
  const boxH = Math.max(1, decoded.maxY - decoded.minY);
  for (const [x, y] of decoded.cells) {
    const p = {
      x,
      y,
      nx: (x - decoded.minX) / boxW,
      ny: (y - decoded.minY) / boxH
    };
    let partIndex = specs.length - 1;
    for (let i = 0; i < specs.length; i++) {
      if (!specs[i].test || specs[i].test(p)) {
        partIndex = i;
        break;
      }
    }
    cellsByPart[partIndex].push([x, y]);
  }
  const parts = specs
    .map((spec, index) => makeMaskPartLayer(spec.name, index, cellsByPart[index], spec))
    .filter((item) => item.cells.length > 0);
  maskPartCache.set(key, parts);
  return parts;
}

function makeMaskPartLayer(name, index, cells, spec) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    sumX += x;
    sumY += y;
  }
  const count = Math.max(1, cells.length);
  return {
    name,
    index,
    cells,
    spec,
    minX,
    minY,
    maxX,
    maxY,
    cx: sumX / count,
    cy: sumY / count
  };
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

function part(name, test, motion) {
  return { name, test, ...motion };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
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
