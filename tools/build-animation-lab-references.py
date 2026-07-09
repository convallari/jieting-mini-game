from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("output/reference/animation-frames")
OUT = Path("public/reference-glyphs")
FPS = 30


GLYPHS = {
    "qiang": {
        "label": "枪",
        "source": "v2-board-qiang-dao-gong",
        "crop": [0, 0, 76, 74],
        "note": "前半段主要是粗黑斜向遮挡层，后半段露出清晰竖枪。",
    },
    "dao": {
        "label": "刀",
        "source": "v1-board-weapon-cluster",
        "crop": [164, 0, 62, 62],
        "note": "右上刀格在清晰刀形和被黑色斩击/遮挡线覆盖之间切换，适合作为刀攻击参考。",
    },
    "gong": {
        "label": "弓",
        "source": "v2-top-dao-gong-qi",
        "crop": [0, 78, 74, 74],
        "note": "本体有离散姿势切换，是最适合做逐帧字形帧的兵种。",
    },
    "qi": {
        "label": "骑",
        "source": "v2-top-dao-gong-qi",
        "crop": [148, 78, 74, 74],
        "note": "字本体相对稳定，主要变化是右上/上半格横向冲刺残影。",
    },
}


def load_font(size: int = 14) -> ImageFont.ImageFont:
    for name in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


FONT = load_font()


def crop_frames(source: str, crop: list[int]) -> list[Image.Image]:
    source_dir = ROOT / source
    frames = sorted(source_dir.glob("frame-*.png"))
    if not frames:
        raise FileNotFoundError(f"No frames found in {source_dir}")
    x, y, w, h = crop
    return [Image.open(frame).convert("RGBA").crop((x, y, x + w, y + h)) for frame in frames]


def build_sheet(frames: list[Image.Image]) -> Image.Image:
    frame_w, frame_h = frames[0].size
    sheet = Image.new("RGBA", (frame_w * len(frames), frame_h), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.paste(frame, (index * frame_w, 0))
    return sheet


def build_contact(frames: list[Image.Image], label: str) -> Image.Image:
    picks = [round(i * (len(frames) - 1) / 11) for i in range(12)]
    scale = 1.25
    thumb_w = round(frames[0].width * scale)
    thumb_h = round(frames[0].height * scale)
    cell_w = thumb_w + 14
    cell_h = thumb_h + 26
    cols = 4
    rows = 3
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#f4ead8")
    draw = ImageDraw.Draw(sheet)
    for n, frame_index in enumerate(picks):
        thumb = frames[frame_index].convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.BICUBIC)
        x = (n % cols) * cell_w + 7
        y = (n // cols) * cell_h + 20
        sheet.paste(thumb, (x, y))
        draw.text((x, y - 16), f"{label} f{frame_index + 1:03d}", fill="#2a211b", font=FONT)
    return sheet


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "fps": FPS,
        "description": "Single-glyph reference sheets cropped from original recordings for animation-lab comparison.",
        "glyphs": {},
    }

    for key, config in GLYPHS.items():
        frames = crop_frames(config["source"], config["crop"])
        sheet = build_sheet(frames)
        contact = build_contact(frames, config["label"])
        sheet_path = OUT / f"{key}-sheet.png"
        contact_path = OUT / f"{key}-contact.png"
        sheet.save(sheet_path)
        contact.save(contact_path)
        frame_w, frame_h = frames[0].size
        manifest["glyphs"][key] = {
            "label": config["label"],
            "source": config["source"],
            "crop": config["crop"],
            "sheet": f"/reference-glyphs/{key}-sheet.png",
            "contact": f"/reference-glyphs/{key}-contact.png",
            "frameWidth": frame_w,
            "frameHeight": frame_h,
            "frames": len(frames),
            "note": config["note"],
        }

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(GLYPHS)} glyph reference sheets to {OUT}")


if __name__ == "__main__":
    main()
