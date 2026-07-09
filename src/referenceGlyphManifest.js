export const REFERENCE_GLYPHS = {
  fps: 30,
  description: "Single-glyph reference sheets cropped from original recordings for animation-lab comparison.",
  glyphs: {
    qiang: {
      label: "枪",
      source: "v2-board-qiang-dao-gong",
      crop: [0, 0, 76, 74],
      sheet: "qiang-sheet.png",
      contact: "qiang-contact.png",
      frameWidth: 76,
      frameHeight: 74,
      frames: 48,
      note: "前半段主要是粗黑斜向遮挡层，后半段露出清晰竖枪。"
    },
    dao: {
      label: "刀",
      source: "v1-board-weapon-cluster",
      crop: [164, 0, 62, 62],
      sheet: "dao-sheet.png",
      contact: "dao-contact.png",
      frameWidth: 62,
      frameHeight: 62,
      frames: 48,
      note: "右上刀格在清晰刀形和被黑色斩击/遮挡线覆盖之间切换，适合作为刀攻击参考。"
    },
    gong: {
      label: "弓",
      source: "v2-top-dao-gong-qi",
      crop: [0, 78, 74, 74],
      sheet: "gong-sheet.png",
      contact: "gong-contact.png",
      frameWidth: 74,
      frameHeight: 74,
      frames: 48,
      note: "本体有离散姿势切换，是最适合做逐帧字形帧的兵种。"
    },
    qi: {
      label: "骑",
      source: "v2-top-dao-gong-qi",
      crop: [148, 78, 74, 74],
      sheet: "qi-sheet.png",
      contact: "qi-contact.png",
      frameWidth: 74,
      frameHeight: 74,
      frames: 48,
      note: "字本体相对稳定，主要变化是右上/上半格横向冲刺残影。"
    }
  }
};
