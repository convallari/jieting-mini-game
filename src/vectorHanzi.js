const GLYPH_STROKES = {
  "刀": [
    s(30, 24, q(51, 18, 72, 22), 8),
    s(66, 21, q(62, 53, 43, 84), 10),
    s(41, 36, q(55, 47, 72, 63), 6)
  ],
  "枪": [
    s(24, 18, l(22, 84), 7),
    s(9, 43, q(23, 39, 40, 43), 6),
    s(23, 43, q(15, 60, 8, 73), 5),
    s(24, 45, q(33, 60, 40, 72), 5),
    s(61, 15, q(51, 31, 42, 42), 6),
    s(61, 15, q(74, 32, 87, 42), 6),
    s(50, 47, q(63, 43, 79, 46), 6),
    s(51, 59, l(77, 59), 5),
    s(51, 59, l(51, 81), 6),
    s(78, 59, l(78, 81), 6),
    s(50, 81, q(65, 76, 82, 81), 6)
  ],
  "弓": [
    s(28, 18, q(52, 12, 75, 19), 8),
    s(75, 19, q(67, 29, 68, 40), 8),
    s(33, 40, q(51, 35, 70, 40), 7),
    s(70, 40, q(66, 51, 69, 63), 8),
    s(29, 64, q(50, 58, 73, 64), 8),
    s(73, 64, q(67, 82, 48, 84), 9)
  ],
  "骑": [
    s(17, 21, q(32, 14, 46, 23), 7),
    s(21, 31, l(41, 30), 6),
    s(19, 43, q(31, 39, 44, 42), 6),
    s(18, 56, q(32, 51, 47, 57), 6),
    s(19, 21, q(13, 53, 16, 79), 8),
    s(40, 30, q(37, 60, 35, 83), 7),
    s(17, 79, q(22, 75, 29, 72), 5),
    s(35, 83, q(40, 78, 46, 73), 5),
    s(63, 16, l(84, 16), 7),
    s(72, 16, q(68, 25, 65, 32), 6),
    s(53, 34, q(70, 31, 90, 34), 7),
    s(57, 47, l(84, 47), 6),
    s(60, 47, l(60, 76), 6),
    s(84, 47, l(84, 76), 6),
    s(60, 76, q(72, 72, 84, 76), 6),
    s(70, 47, q(65, 56, 63, 63), 5),
    s(70, 47, q(78, 56, 82, 63), 5)
  ],
  "赵": [
    s(20, 20, l(38, 20), 7),
    s(29, 20, q(27, 47, 28, 72), 7),
    s(17, 42, q(28, 39, 39, 42), 6),
    s(15, 82, q(30, 76, 43, 63), 8),
    s(56, 20, l(83, 20), 7),
    s(70, 20, q(66, 42, 56, 62), 8),
    s(52, 36, q(68, 50, 83, 67), 7),
    s(55, 82, q(73, 77, 89, 83), 8)
  ],
  "云": [
    s(28, 24, q(53, 19, 78, 24), 8),
    s(22, 44, q(54, 38, 84, 45), 8),
    s(50, 45, q(41, 62, 29, 76), 8),
    s(30, 76, q(56, 67, 81, 76), 8),
    s(69, 64, q(79, 71, 84, 83), 7)
  ],
  "张": [
    s(15, 20, q(31, 14, 44, 20), 7),
    s(42, 20, q(35, 34, 20, 38), 7),
    s(20, 38, l(40, 38), 6),
    s(40, 38, q(32, 59, 14, 72), 8),
    s(63, 16, l(82, 16), 7),
    s(63, 16, q(60, 45, 62, 79), 8),
    s(52, 39, q(68, 34, 87, 35), 6),
    s(64, 42, q(74, 59, 88, 77), 7),
    s(63, 62, q(55, 73, 48, 80), 7)
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
    s(22, 19, q(51, 15, 82, 19), 7),
    s(36, 9, l(36, 31), 6),
    s(66, 9, l(66, 31), 6),
    s(27, 34, l(78, 34), 7),
    s(33, 43, l(73, 43), 6),
    s(33, 43, l(33, 66), 6),
    s(73, 43, l(73, 66), 6),
    s(33, 66, q(53, 61, 73, 66), 6),
    s(53, 34, l(53, 75), 7),
    s(35, 84, q(44, 75, 49, 68), 7),
    s(70, 83, q(61, 74, 56, 68), 7)
  ],
  "忠": [
    s(50, 13, l(50, 58), 7),
    s(27, 28, l(75, 28), 7),
    s(27, 28, l(27, 55), 6),
    s(75, 28, l(75, 55), 6),
    s(27, 55, q(51, 50, 75, 55), 7),
    s(27, 78, q(35, 67, 44, 71), 6),
    s(50, 68, q(49, 82, 54, 88), 6),
    s(67, 70, q(79, 78, 82, 87), 6),
    s(24, 86, q(35, 91, 45, 86), 6)
  ],
  "兵": [
    s(37, 20, q(50, 12, 70, 17), 7),
    s(34, 34, q(54, 29, 75, 31), 7),
    s(31, 49, q(54, 45, 79, 49), 8),
    s(52, 18, q(49, 44, 47, 68), 7),
    s(28, 80, q(40, 70, 48, 62), 8),
    s(73, 80, q(62, 70, 54, 62), 8)
  ],
  "贼": [
    s(18, 22, l(43, 22), 6),
    s(18, 22, l(18, 62), 6),
    s(43, 22, l(43, 62), 6),
    s(18, 62, q(30, 58, 43, 62), 6),
    s(30, 31, l(30, 55), 5),
    s(20, 79, q(30, 70, 35, 62), 7),
    s(43, 79, q(36, 70, 33, 62), 7),
    s(55, 22, q(72, 43, 87, 77), 7),
    s(51, 42, q(67, 38, 83, 39), 6),
    s(68, 16, q(69, 51, 70, 85), 7),
    s(54, 68, q(64, 57, 73, 47), 6),
    s(82, 23, q(88, 26, 90, 32), 5)
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
    s(50, 16, q(47, 50, 50, 84), 9),
    s(30, 34, q(40, 38, 48, 44), 7),
    s(31, 56, q(41, 61, 49, 68), 7),
    s(52, 48, q(66, 40, 79, 36), 7),
    s(52, 65, q(67, 60, 83, 59), 7)
  ]
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
    drawSingleGlyph(ctx, GLYPH_STROKES[chars[i]], charSize, color, options, i);
    ctx.restore();
  }
  ctx.restore();
  return true;
}

function drawSingleGlyph(ctx, strokes, size, color, options, glyphIndex) {
  const scale = size / 100;
  const jitter = options.jitter ?? 0;
  const breathe = options.breathe ?? 0;
  const attack = options.attack ?? 0;
  const merge = options.merge ?? 0;
  const seed = glyphIndex * 13.37;

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
    const strokeWarp = {
      lineBoost: 1.1 + breathe * 0.35 + attack * 0.85 + merge * 0.55,
      offsetX: phase * breathe * size * 0.014 + attack * size * 0.012 * Math.sign(phase || 1),
      offsetY: Math.cos(seed + i) * breathe * size * 0.01 - merge * size * 0.006,
      stretchX: 1 + attack * 0.055 * Math.sign(phase || 1),
      stretchY: 1 - attack * 0.04 + merge * 0.025,
      seed: seed + i
    };
    drawStroke(ctx, strokes[i], scale, color, strokeWarp);
  }
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
